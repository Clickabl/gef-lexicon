#!/usr/bin/env node
/** Gives every captured frequency artifact a bibliography entry (type dataset) and records its source_id in the artifact. Idempotent. */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, asciiSlug, compareText, readJson, writeJson } from '../name-pipeline/common.mjs';
import { FREQUENCY_DIR } from './lib.mjs';

const bibliographyPath = join(REPO_ROOT, 'sources', 'bibliography.json');
const bibliography = readJson(bibliographyPath);
for (const file of readdirSync(FREQUENCY_DIR).filter(name => name.endsWith('.json')).sort(compareText)) {
  const artifact = readJson(join(FREQUENCY_DIR, file));
  const sourceId = `src_name_frequency_${asciiSlug(file.replace(/\.json$/, ''))}`;
  const entry = {
    source_id: sourceId, source_type: 'dataset', title: `${artifact.title} (${artifact.publisher})`,
    publisher: artifact.publisher, year: Number(String(artifact.period).match(/\d{4}/g)?.at(-1)) || null, language: artifact.language,
    region: artifact.country, url: artifact.url.split(' ')[0], license: artifact.license,
    external_ids: { name_frequency_artifact: `research/name-frequency/${file}`, retrieved: artifact.retrieved },
    note: `Given-name frequency list captured ${artifact.retrieved} for the name pipeline. Period: ${artifact.period}. Measure: ${artifact.measure} ${artifact.notes}`,
  };
  const at = bibliography.sources.findIndex(source => source.source_id === sourceId);
  if (at >= 0) bibliography.sources[at] = entry; else bibliography.sources.push(entry);
  if (artifact.source_id !== sourceId) writeJson(join(FREQUENCY_DIR, file), { ...artifact, source_id: sourceId });
}
writeJson(bibliographyPath, bibliography);
console.log('registered');
