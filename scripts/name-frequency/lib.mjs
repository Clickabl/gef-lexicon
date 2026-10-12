import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT, writeJson } from '../name-pipeline/common.mjs';

export const FREQUENCY_DIR = join(REPO_ROOT, 'research', 'name-frequency');
export const USER_AGENT = 'gef-lexicon-name-pipeline (tech@clickabl.co)';
export const today = () => new Date().toISOString().slice(0, 10);

export async function getBytes(url, attempt = 0) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw new Error(`http_${response.status} ${url}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
    return getBytes(url, attempt + 1);
  }
}
export const getJson = async url => JSON.parse((await getBytes(url)).toString('utf8'));

/** Extract a zip with the system unzip into a fresh temporary directory; the caller reads files, then calls cleanup. */
export function unzipTo(buffer) {
  const dir = mkdtempSync(join(tmpdir(), 'gef-freq-'));
  const archive = join(dir, 'archive.zip');
  writeFileSync(archive, buffer);
  execFileSync('unzip', ['-q', '-o', archive, '-d', join(dir, 'x')]);
  return { dir: join(dir, 'x'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Title-case a name printed in capitals, keeping hyphen and apostrophe parts and French/Portuguese particles intact. */
export function titleCase(text) {
  return text.toLocaleLowerCase('und').replace(/(^|[\s'’-])(\p{L})/gu, (_, sep, letter) => `${sep}${letter.toLocaleUpperCase('und')}`);
}

export function top(counts, size) {
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, size)
    .map(([name, count], index) => ({ rank: index + 1, name, count }));
}

export function writeArtifact(file, artifact) {
  writeJson(join(FREQUENCY_DIR, file), { schema: 'gef-name-frequency-v1', ...artifact });
}
