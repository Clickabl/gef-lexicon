import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { GitContentWorkspace } from './authoring/gitContentWorkspace.mjs';

function workspace(t) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'gef-workspace-lock-'));
  fs.mkdirSync(path.join(repo, '.git'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  return new GitContentWorkspace({ repo });
}

test('existing fresh and aged locks are never stolen or rewritten', t => {
  const w = workspace(t);
  for (const age of [0, 24 * 60 * 60_000]) {
    fs.writeFileSync(w.lockPath, 'existing-owner');
    fs.utimesSync(w.lockPath, new Date(Date.now() - age), new Date(Date.now() - age));
    const before = fs.statSync(w.lockPath);
    assert.throws(() => w.acquire(), e => e.code === 'authoring_busy');
    assert.equal(fs.readFileSync(w.lockPath, 'utf8'), 'existing-owner');
    assert.equal(fs.statSync(w.lockPath).mtimeMs, before.mtimeMs);
    fs.unlinkSync(w.lockPath);
  }
});

test('a holder cannot release a replacement lock, including another instance in the same process', t => {
  const w = workspace(t), replacement = new GitContentWorkspace({ repo: w.repo });
  w.acquire();
  fs.unlinkSync(w.lockPath);
  replacement.acquire();
  const bytes = fs.readFileSync(replacement.lockPath);
  assert.throws(() => w.assertLockOwned(), e => e.code === 'authoring_busy');
  w.release();
  assert.deepEqual(fs.readFileSync(replacement.lockPath), bytes);
  replacement.assertLockOwned();
  replacement.release();
  assert.equal(fs.existsSync(w.lockPath), false);
});

test('separate workspace instances cannot enter concurrently and one instance remains queued', async t => {
  const w = workspace(t), other = new GitContentWorkspace({ repo: w.repo }), events = [];
  let entered, finish;
  const started = new Promise(resolve => { entered = resolve; });
  const pending = new Promise(resolve => { finish = resolve; });
  const first = w.withLock(async () => { events.push('first'); entered(); await pending; });
  await started;
  await assert.rejects(other.withLock(() => events.push('competitor')), e => e.code === 'authoring_busy');
  const second = w.withLock(() => events.push('second'));
  assert.deepEqual(events, ['first']);
  finish();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['first', 'second']);
  assert.equal(fs.existsSync(w.lockPath), false);
});

test('ownership lost while work is awaiting cannot be reported as a successful guarded operation', async t => {
  const w = workspace(t);
  await assert.rejects(w.withLock(async () => {
    fs.unlinkSync(w.lockPath);
    fs.writeFileSync(w.lockPath, 'replacement');
  }), e => e.code === 'authoring_busy');
  assert.equal(fs.readFileSync(w.lockPath, 'utf8'), 'replacement');
});
