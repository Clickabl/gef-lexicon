import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The server-owned, writable gef-content checkout used for authoring. It is separate from the
 * read-only deployment checkouts. Every mutation runs under one cross-process lock.
 */
export class GitContentWorkspace {
  constructor({ repo, remote = 'origin', branch = 'main', author = { name: 'Gef Content Bot', email: 'content-bot@clickabl.co' } }) {
    if (!repo) throw new Error('GitContentWorkspace requires a repository path');
    this.repo = path.resolve(repo);
    this.remote = remote;
    this.branch = branch;
    this.author = author;
    this.lockPath = path.join(this.repo, '.git', 'gef-authoring.lock');
    this.lockInstance = null;
    this.queue = Promise.resolve();
  }

  git(args, { capture = true, timeout = 120_000, trim = true } = {}) {
    const output = execFileSync('git', args, {
      cwd: this.repo,
      encoding: 'utf8',
      timeout,
      stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return typeof output === 'string' ? (trim ? output.trim() : output) : '';
  }

  /** Serializes work in-process and across processes (Passenger may run several workers). */
  withLock(work) {
    const run = async () => {
      this.acquire();
      try {
        const result = await work();
        this.assertLockOwned();
        return result;
      } finally {
        this.release();
      }
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => {});
    return next;
  }

  acquire() {
    if (this.lockInstance) throw this.lockError();
    let descriptor;
    try {
      descriptor = fs.openSync(this.lockPath, 'wx', 0o600);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // Age is not evidence that the holder stopped. Recovery is an operator action.
      throw this.lockError();
    }
    const token = `${process.pid}:${randomUUID()}`;
    const stat = fs.fstatSync(descriptor);
    this.lockInstance = { descriptor, dev: stat.dev, ino: stat.ino, token };
    try { fs.writeFileSync(descriptor, token); this.assertLockOwned(); }
    catch (error) { this.release(); throw error; }
  }

  lockError() {
    const error = new Error('Authoring lock is unavailable; reconcile its owner before retrying');
    error.code = 'authoring_busy';
    error.status = 409;
    return error;
  }

  ownsLock() {
    if (!this.lockInstance) return false;
    try {
      const stat = fs.lstatSync(this.lockPath), held = this.lockInstance;
      return stat.isFile() && stat.dev === held.dev && stat.ino === held.ino
        && fs.readFileSync(this.lockPath, 'utf8') === held.token;
    } catch { return false; }
  }

  assertLockOwned() {
    if (!this.ownsLock()) throw this.lockError();
  }

  release() {
    const held = this.lockInstance;
    if (!held) return;
    try {
      // Keeping the descriptor open prevents reuse of this inode before this check.
      if (this.ownsLock()) fs.unlinkSync(this.lockPath);
    } finally {
      this.lockInstance = null;
      fs.closeSync(held.descriptor);
    }
  }

  head() {
    return this.git(['rev-parse', 'HEAD']);
  }

  /** Discards anything local and moves to the remote branch tip. The server owns this checkout. */
  syncToRemote({ fetch = true } = {}) {
    // The canonical writer reconciles durable commits before this destructive reset.
    const retainedHead = this.beforeReset?.();
    if (typeof retainedHead === 'string') {
      // Local-only writer fixtures/operations retain their validated main commits.
      this.restore();
      return retainedHead;
    }
    if (fetch) this.git(['fetch', '--quiet', '--no-tags', this.remote, this.branch], { capture: false });
    this.git(['reset', '--quiet', '--hard', `${this.remote}/${this.branch}`], { capture: false });
    this.git(['clean', '-fdq'], { capture: false });
    return this.head();
  }

  restore() {
    this.git(['reset', '--quiet', '--hard', 'HEAD'], { capture: false });
    this.git(['clean', '-fdq'], { capture: false });
  }

  readFile(relativePath) {
    const absolute = this.resolveInside(relativePath);
    return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null;
  }

  /** Names of the files directly inside a directory of the checkout (empty when it does not exist). */
  listDirectory(relativeDir) {
    const absolute = this.resolveInside(relativeDir);
    return fs.existsSync(absolute) ? fs.readdirSync(absolute).filter((name) => !name.startsWith('.')).sort() : [];
  }

  resolveInside(relativePath) {
    const absolute = path.resolve(this.repo, relativePath);
    if (!absolute.startsWith(`${this.repo}${path.sep}`)) throw new Error(`Path escapes repository: ${relativePath}`);
    return absolute;
  }

  applyFiles(files) {
    for (const file of files) {
      const absolute = this.resolveInside(file.path);
      if (file.delete === true) {
        fs.rmSync(absolute, { force: true });
      } else {
        fs.mkdirSync(path.dirname(absolute), { recursive: true });
        fs.writeFileSync(absolute, file.content);
      }
    }
  }

  /** Paths that changed in the working tree (tracked and untracked). NUL-separated: no trimming or quoting ambiguity. */
  changedPaths() {
    const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
      cwd: this.repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const entries = output.split('\0').filter(Boolean);
    const paths = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const status = entry.slice(0, 2);
      paths.push(entry.slice(3));
      if (status.includes('R') || status.includes('C')) index += 1; // skip the rename source
    }
    return paths;
  }

  /** Paths touched on the remote branch since `base`, limited to `paths`. */
  changedSince(base, paths) {
    if (!base || paths.length === 0) return [];
    const output = this.git(['diff', '--name-only', `${base}..HEAD`, '--', ...paths]);
    return output ? output.split('\n') : [];
  }

  isAncestor(commit) {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: this.repo, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  commit({ message, trailers }) {
    this.git(['add', '-A'], { capture: false });
    const body = [message.trim(), '', ...Object.entries(trailers).map(([key, value]) => `${key}: ${value}`)].join('\n');
    this.git([
      '-c', `user.name=${this.author.name}`, '-c', `user.email=${this.author.email}`,
      'commit', '--quiet', '-m', body,
    ], { capture: false });
    return this.head();
  }

  /** Replace only the still-unpublished main commit after its generated outputs revalidate. */
  amendValidatedOutputs() {
    this.git(['add', '-A'], { capture: false });
    this.git(['-c', `user.name=${this.author.name}`, '-c', `user.email=${this.author.email}`,
      'commit', '--quiet', '--amend', '--no-edit'], { capture: false });
    return this.head();
  }

  /** Pushes HEAD; returns false when the remote moved (non-fast-forward). */
  push() {
    try {
      this.git(['push', '--quiet', this.remote, `HEAD:${this.branch}`], { capture: false, timeout: 180_000 });
      return true;
    } catch (error) {
      const text = `${error.stderr ?? ''}${error.message ?? ''}`;
      if (/non-fast-forward|fetch first|rejected/i.test(text)) return false;
      throw error;
    }
  }

  /** Rebases the local commit onto the latest remote branch. Returns false on conflict. */
  rebaseOntoRemote() {
    this.git(['fetch', '--quiet', '--no-tags', this.remote, this.branch], { capture: false });
    try {
      this.git(['-c', `user.name=${this.author.name}`, '-c', `user.email=${this.author.email}`, 'rebase', '--quiet', `${this.remote}/${this.branch}`], { capture: false });
      return true;
    } catch {
      try { this.git(['rebase', '--abort'], { capture: false }); } catch { /* nothing to abort */ }
      return false;
    }
  }
}
