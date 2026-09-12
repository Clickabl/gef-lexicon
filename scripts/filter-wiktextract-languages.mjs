#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { StringDecoder } from 'node:string_decoder';
import { createGunzip, createGzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// TODO-WIKTIONARY-SUPPORTED-LANGUAGE-FILTER: raw source selection only. This
// boundary deliberately never maps languages, copies glosses into Lexi fields,
// or changes review state. Preserve the entire retained source record.
export function languageFilter(allowed, report, onProgress = () => {}, onRedirect = () => {}) {
  const decoder = new StringDecoder('utf8');
  let pending = '';
  const consume = (line, output) => {
    if (!line.trim()) return;
    const row = JSON.parse(line);
    if (row && typeof row === 'object' && !Array.isArray(row)
      && row.lang_code === undefined && typeof row.title === 'string' && typeof row.redirect === 'string') {
      report.inputRecords += 1;
      report.redirectRecords += 1;
      onRedirect(line);
      return;
    }
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || typeof row.lang_code !== 'string' || !row.lang_code) {
      throw new Error(`Invalid language identity at record ${report.inputRecords + 1}`);
    }
    report.inputRecords += 1;
    report.sourceCounts[row.lang_code] = (report.sourceCounts[row.lang_code] ?? 0) + 1;
    if (allowed.has(row.lang_code)) {
      report.keptRecords += 1;
      report.keptUncompressedBytes += Buffer.byteLength(line) + 1;
      report.keptCounts[row.lang_code] = (report.keptCounts[row.lang_code] ?? 0) + 1;
      output.push(`${line}\n`);
    }
    if (report.inputRecords % 100000 === 0) onProgress(report);
  };
  return new Transform({
    transform(chunk, encoding, callback) {
      try {
        report.inputUncompressedBytes += chunk.length;
        pending += decoder.write(chunk);
        let start = 0;
        let end;
        while ((end = pending.indexOf('\n', start)) !== -1) {
          consume(pending.slice(start, end), this);
          start = end + 1;
        }
        pending = pending.slice(start);
        if (Buffer.byteLength(pending) > 64 * 1024 * 1024) throw new Error('JSONL record exceeds 64 MiB');
        callback();
      } catch (error) { callback(error); }
    },
    flush(callback) {
      try {
        pending += decoder.end();
        if (pending) consume(pending, this);
        callback();
      } catch (error) { callback(error); }
    },
  });
}

export function newReport() {
  return {
    inputRecords: 0, keptRecords: 0, redirectRecords: 0, inputUncompressedBytes: 0,
    keptUncompressedBytes: 0, sourceCounts: Object.create(null), keptCounts: Object.create(null),
  };
}

function hashStream(hash) {
  return new Transform({ transform(chunk, encoding, callback) { hash.update(chunk); callback(null, chunk); } });
}

function repositoryRoot() {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    if (fs.existsSync(path.join(directory, '.git'))) return fs.realpathSync(directory);
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

export async function filterFile({ input, registry, output, reportPath, sourceMappings = [], progress = true }) {
  const registryBytes = fs.readFileSync(registry);
  const registryData = JSON.parse(registryBytes);
  const tags = registryData?.programs?.learnFromLanguages;
  if (!Array.isArray(tags) || tags.length === 0 || tags.some(tag => typeof tag !== 'string' || !tag)
    || new Set(tags).size !== tags.length) throw new Error('Invalid canonical learn-from registry');
  const allowed = new Set(tags);
  for (const mapping of sourceMappings) {
    if (!mapping || typeof mapping.sourceCode !== 'string' || !mapping.sourceCode
      || !Array.isArray(mapping.targetLanguages) || !mapping.targetLanguages.length
      || mapping.targetLanguages.some(tag => !tags.includes(tag))) throw new Error('Invalid source-language mapping');
    allowed.add(mapping.sourceCode);
  }
  const hasSource = (tag, counts) => counts[tag] > 0 || sourceMappings.some(mapping => mapping.targetLanguages.includes(tag) && counts[mapping.sourceCode] > 0);
  const redirects = `${output}.redirects.jsonl`;
  const targets = [output, reportPath, redirects];
  for (const target of targets) {
    if ([input, registry].some(source => path.resolve(source) === path.resolve(target))) throw new Error('Refusing to overwrite an input');
    if (fs.existsSync(target) || fs.existsSync(`${target}.part`)) throw new Error(`Output already exists: ${target}`);
    const repo = repositoryRoot();
    const parent = fs.realpathSync(path.dirname(path.resolve(target)));
    if (repo && (parent === repo || parent.startsWith(`${repo}${path.sep}`))) throw new Error('Raw dumps/reports must stay outside the Git checkout');
  }
  if (path.resolve(output) === path.resolve(reportPath)) throw new Error('Output and report must differ');
  const report = newReport();
  const inputHash = createHash('sha256');
  const outputHash = createHash('sha256');
  const redirectHash = createHash('sha256');
  const redirectFd = fs.openSync(`${redirects}.part`, 'wx', 0o600);
  let lastProgress = Date.now();
  const notify = value => {
    if (progress && Date.now() - lastProgress >= 15000) {
      console.log(`Scanned ${value.inputRecords.toLocaleString()} records; kept ${value.keptRecords.toLocaleString()}.`);
      lastProgress = Date.now();
    }
  };
  try {
    await pipeline(
      fs.createReadStream(input), hashStream(inputHash), createGunzip(),
      languageFilter(allowed, report, notify, line => {
        const bytes = `${line}\n`;
        fs.writeFileSync(redirectFd, bytes);
        redirectHash.update(bytes);
      }), createGzip({ level: 6 }),
      hashStream(outputHash), fs.createWriteStream(`${output}.part`, { flags: 'wx', mode: 0o600 }),
    );
    if (report.inputRecords === 0 || report.keptRecords === 0) throw new Error('Empty input or selection');
    const complete = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      policy: 'Canonical language membership plus explicit source-group retention; source records are not rewritten or approved.',
      sourceMappings,
      source: { file: path.basename(input), sha256: inputHash.digest('hex'), bytes: fs.statSync(input).size },
      registry: {
        canonicalSource: registryData.canonicalSource,
        sha256: createHash('sha256').update(registryBytes).digest('hex'),
        allowedLanguages: tags,
      },
      output: { file: path.basename(output), sha256: outputHash.digest('hex'), bytes: fs.statSync(`${output}.part`).size },
      redirects: { file: path.basename(redirects), sha256: redirectHash.digest('hex'), bytes: fs.statSync(`${redirects}.part`).size,
        policy: 'Language-neutral source redirects retained separately; not lexical language coverage.' },
      ...report,
      removedRecords: report.inputRecords - report.keptRecords - report.redirectRecords,
      matchedLanguages: tags.filter(tag => hasSource(tag, report.keptCounts)),
      missingLanguages: tags.filter(tag => !hasSource(tag, report.keptCounts)),
      matchedSourceCodes: Object.keys(report.keptCounts).sort(),
      excludedLanguages: Object.keys(report.sourceCounts).filter(tag => !allowed.has(tag)).sort(),
    };
    fs.writeFileSync(`${reportPath}.part`, `${JSON.stringify(complete, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    fs.renameSync(`${output}.part`, output);
    fs.renameSync(`${redirects}.part`, redirects);
    fs.renameSync(`${reportPath}.part`, reportPath);
    return complete;
  } catch (error) {
    // Only remove this invocation's reproducible outputs, never its inputs.
    for (const target of targets) fs.rmSync(`${target}.part`, { force: true });
    throw error;
  } finally {
    fs.closeSync(redirectFd);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = new Map();
  for (let index = 2; index < process.argv.length; index += 2) options.set(process.argv[index], process.argv[index + 1]);
  const [input, registry, output, reportPath] = ['--input', '--registry', '--output', '--report'].map(key => options.get(key));
  if (![input, registry, output, reportPath].every(value => typeof value === 'string' && value.length)) {
    console.error('Required: --input source.jsonl.gz --registry language-support.json --output subset.jsonl.gz --report report.json');
    process.exitCode = 2;
  } else {
    try {
      const mappingPath = options.get('--source-map');
      const sourceMappings = mappingPath ? JSON.parse(fs.readFileSync(mappingPath, 'utf8')).mappings : [];
      if (!Array.isArray(sourceMappings)) throw new Error('Invalid source-language mapping file');
      const report = await filterFile({ input, registry, output, reportPath, sourceMappings });
      console.log(JSON.stringify({
        inputRecords: report.inputRecords, keptRecords: report.keptRecords,
        sourceBytes: report.source.bytes, outputBytes: report.output.bytes,
        matchedLanguageCount: report.matchedLanguages.length, missingLanguages: report.missingLanguages,
      }));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
