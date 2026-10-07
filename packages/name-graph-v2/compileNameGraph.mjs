/** Immutable public JSON + normalized read-only SQLite artifacts. Manifest switches only after both exist. */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { validateNameGraph, normalizeNameLookup } from './nameGraph.mjs';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const sorted = values => [...values].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function normalizedGraph(graph) {
  const normalizeEvidence = value => ({ ...value, sourceRefs: [...value.sourceRefs].sort() });
  return { ...graph,
    names: sorted(graph.names).map(row => ({ ...normalizeEvidence(row), facts: row.facts.map(normalizeEvidence) })),
    spellings: sorted(graph.spellings).map(normalizeEvidence),
    renderings: sorted(graph.renderings).map(normalizeEvidence),
    relations: graph.relations.map(normalizeEvidence).sort((a, b) => stableJson(a) < stableJson(b) ? -1 : stableJson(a) > stableJson(b) ? 1 : 0),
  };
}
function buildDatabase(file, graph, graphHash) {
  const db = new DatabaseSync(file);
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
      CREATE TABLE name_senses (name_id TEXT PRIMARY KEY, form_kind TEXT NOT NULL, family_id TEXT, review_state TEXT NOT NULL, certainty REAL, source_refs_json TEXT NOT NULL, facts_json TEXT NOT NULL) STRICT;
      CREATE TABLE name_spellings (spelling_id TEXT PRIMARY KEY, name_id TEXT NOT NULL REFERENCES name_senses(name_id), text_value TEXT NOT NULL, normalized_lookup TEXT NOT NULL, language_tag TEXT NOT NULL, representation_tag TEXT NOT NULL, is_primary INTEGER NOT NULL CHECK(is_primary IN (0,1)), fallback_to_primary INTEGER NOT NULL CHECK(fallback_to_primary IN (0,1)), review_state TEXT NOT NULL, certainty REAL, source_refs_json TEXT NOT NULL) STRICT;
      CREATE UNIQUE INDEX one_primary_per_representation ON name_spellings(name_id,representation_tag) WHERE is_primary=1 AND review_state IN ('approved','machine_reviewed','candidate');
      CREATE INDEX spelling_lookup ON name_spellings(normalized_lookup,representation_tag,name_id);
      CREATE TABLE name_renderings (rendering_id TEXT PRIMARY KEY, from_spelling_id TEXT NOT NULL REFERENCES name_spellings(spelling_id), to_spelling_id TEXT NOT NULL REFERENCES name_spellings(spelling_id), relation_kind TEXT NOT NULL, review_state TEXT NOT NULL, certainty REAL, source_refs_json TEXT NOT NULL, UNIQUE(from_spelling_id,to_spelling_id)) STRICT;
      CREATE INDEX rendering_source ON name_renderings(from_spelling_id);
      CREATE TABLE name_relations (from_name_id TEXT NOT NULL REFERENCES name_senses(name_id), to_name_id TEXT NOT NULL REFERENCES name_senses(name_id), relation_kind TEXT NOT NULL, review_state TEXT NOT NULL, certainty REAL, source_refs_json TEXT NOT NULL, PRIMARY KEY(from_name_id,to_name_id,relation_kind)) STRICT;
      BEGIN IMMEDIATE;`);
    const metadata = db.prepare('INSERT INTO metadata VALUES (?,?)');
    metadata.run('contract', graph.contract); metadata.run('graph_sha256', graphHash); metadata.run('publication', graph.publication);
    const name = db.prepare('INSERT INTO name_senses VALUES (?,?,?,?,?,?,?)');
    const spelling = db.prepare('INSERT INTO name_spellings VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    const rendering = db.prepare('INSERT INTO name_renderings VALUES (?,?,?,?,?,?,?)');
    const relation = db.prepare('INSERT INTO name_relations VALUES (?,?,?,?,?,?)');
    for (const row of graph.names) name.run(row.id, row.formKind, row.familyId, row.reviewState, row.certainty, JSON.stringify(row.sourceRefs), JSON.stringify(row.facts));
    for (const row of graph.spellings) spelling.run(row.id, row.nameId, row.text, normalizeNameLookup(row.text), row.languageTag, row.representationTag, Number(row.primary), Number(row.fallbackToPrimary), row.reviewState, row.certainty, JSON.stringify(row.sourceRefs));
    for (const row of graph.renderings) rendering.run(row.id, row.fromSpellingId, row.toSpellingId, row.relation, row.reviewState, row.certainty, JSON.stringify(row.sourceRefs));
    for (const row of graph.relations) relation.run(row.fromNameId, row.toNameId, row.relation, row.reviewState, row.certainty, JSON.stringify(row.sourceRefs));
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('name_database_foreign_key_failure');
    db.exec('COMMIT; VACUUM;');
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('name_database_integrity_failure');
  } finally { db.close(); }
}

export async function compileNameGraph({ input, outputDirectory, bibliography, allowFixtureSources = false }) {
  const graph = normalizedGraph(validateNameGraph(input));
  if (!bibliography || !Array.isArray(bibliography.sources)) throw new Error('name_bibliography_required');
  const sources = new Map(bibliography.sources.map(row => [row.source_id, row]));
  if (sources.size !== bibliography.sources.length) throw new Error('name_bibliography_duplicate');
  for (const row of [...graph.names, ...graph.names.flatMap(row => row.facts), ...graph.spellings, ...graph.renderings, ...graph.relations]) {
    for (const source of row.sourceRefs) {
      if (!sources.has(source)) throw new Error('name_source_not_in_bibliography');
      if (!allowFixtureSources && source.startsWith('fixture:')) throw new Error('name_test_fixture_not_publishable');
    }
  }
  const bytes = Buffer.from(stableJson(graph) + '\n');
  const graphHash = sha256(bytes);
  const output = path.resolve(outputDirectory), target = path.join(output, graphHash);
  await mkdir(output, { recursive: true });
  // A shared lock prevents competing publishers from racing the same output pointer.
  const lock = path.join(output, '.publish-lock');
  await mkdir(lock).catch(error => { if (error.code === 'EEXIST') throw new Error('name_publisher_busy'); throw error; });
  const temp = path.join(output, `.build-${randomUUID()}`), manifestTemp = path.join(output, `.manifest-${randomUUID()}`);
  try {
    await mkdir(temp);
    await writeFile(path.join(temp, 'graph.json'), bytes, { flag: 'wx' });
    buildDatabase(path.join(temp, 'names.sqlite'), graph, graphHash);
    const dbBytes = await readFile(path.join(temp, 'names.sqlite'));
    const manifest = { contract: 'gef-name-graph-manifest-v2', graph: { path: `${graphHash}/graph.json`, sha256: graphHash, bytes: bytes.length },
      sqlite: { path: `${graphHash}/names.sqlite`, sha256: sha256(dbBytes), bytes: dbBytes.length },
      counts: { names: graph.names.length, spellings: graph.spellings.length, renderings: graph.renderings.length } };
    const exists = await stat(target).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
    if (exists) {
      const priorJson = await readFile(path.join(target, 'graph.json'));
      if (sha256(priorJson) !== graphHash) throw new Error('name_immutable_artifact_mismatch');
      // SQLite binary representation can change with SQLite versions. Existing immutable bytes always win.
      const priorDb = await readFile(path.join(target, 'names.sqlite'));
      const receipt = JSON.parse(await readFile(path.join(target, 'artifact.json'), 'utf8'));
      if (receipt.contract !== manifest.contract || receipt.graph?.sha256 !== graphHash
        || receipt.sqlite?.sha256 !== sha256(priorDb) || receipt.sqlite?.bytes !== priorDb.length) throw new Error('name_immutable_database_mismatch');
      const db = new DatabaseSync(path.join(target, 'names.sqlite'), { readOnly: true });
      try {
        if (db.prepare("SELECT value FROM metadata WHERE key='graph_sha256'").get()?.value !== graphHash
          || db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok'
          || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('name_immutable_database_mismatch');
      } finally { db.close(); }
      manifest.sqlite = { ...manifest.sqlite, sha256: sha256(priorDb), bytes: priorDb.length };
    } else {
      await writeFile(path.join(temp, 'artifact.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
      await rename(temp, target);
    }
    await writeFile(manifestTemp, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    await rename(manifestTemp, path.join(output, 'manifest.json'));
    return manifest;
  } finally {
    await rm(temp, { recursive: true, force: true });
    await rm(manifestTemp, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
