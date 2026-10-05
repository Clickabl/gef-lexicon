#!/usr/bin/env node
/** Immutable authoring projection for research admission, never lexical approval. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMIT = /^[a-f0-9]{40}$/u;
const NAME_ID = /^name_[A-Za-z0-9._:-]+$/u;
const MAX_ARTIFACT_BYTES = 2_000_000;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalTag = value => {
  assert.equal(typeof value, 'string', 'Language tag must be a string');
  assert.equal(Intl.getCanonicalLocales(value)[0], value, 'Language tag must be canonical');
  return value;
};
const baseTag = value => new Intl.Locale(canonicalTag(value)).language;

function parseArtifact(artifact, pathPattern) {
  assert.match(artifact.path, pathPattern, 'Unexpected canonical source path');
  assert.ok(!artifact.path.includes('..') && !artifact.path.includes('\\'), 'Unsafe source path');
  assert.ok(Buffer.isBuffer(artifact.bytes) && artifact.bytes.length <= MAX_ARTIFACT_BYTES, 'Oversized source artifact');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(artifact.bytes));
}

/** Inputs are exact Git bytes; only explicit same-set name relationships resolve coverage. */
export function compileResearchReference({ lexiconRevision, registryRevision, registryBytes,
  nameArtifacts, familyArtifacts, bibliographyArtifact, schemas }) {
  assert.match(lexiconRevision, COMMIT);
  assert.match(registryRevision, COMMIT);
  assert.ok(Buffer.isBuffer(registryBytes) && registryBytes.length <= MAX_ARTIFACT_BYTES);
  const registry = JSON.parse(registryBytes.toString('utf8'));
  const tierKeys = ['tier1_full', 'tier2_selective', 'tier3_read_games'];
  const languages = [];
  for (const key of tierKeys) {
    const tags = registry.lessonTiers?.[key];
    assert.ok(Array.isArray(tags) && tags.length > 0, `Missing registry tier ${key}`);
    for (const tag of tags) {
      canonicalTag(tag);
      assert.equal(baseTag(tag), tag, 'Registry identities must not count a representation twice');
      assert.ok(!languages.includes(tag), 'Duplicate registry identity');
      languages.push(tag);
    }
  }
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validators = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)]));
  const validate = (key, value) => assert.ok(validators[key](value), `${key}: ${JSON.stringify(validators[key].errors)}`);
  const bibliography = parseArtifact(bibliographyArtifact, /^sources\/bibliography\.json$/u);
  validate('sources', bibliography);
  const sourceIds = new Set(bibliography.sources.map(source => source.source_id));
  assert.equal(sourceIds.size, bibliography.sources.length, 'Duplicate bibliography identity');
  const checkRefs = refs => { for (const ref of refs ?? []) assert.ok(sourceIds.has(ref), 'Unknown source reference'); };
  const sourced = refs => Array.isArray(refs) && refs.length > 0 && refs.every(ref => sourceIds.has(ref));
  const evidence = artifact => ({ repository: 'gef-lexicon', path: artifact.path,
    commit_sha: lexiconRevision, content_hash: sha(artifact.bytes) });
  const names = new Map();
  const allNames = new Map();
  for (const artifact of nameArtifacts) {
    const data = parseArtifact(artifact, /^names\/[^/]+\/[^/]+\.json$/u);
    validate('names', data);
    const tag = canonicalTag(data.language_code);
    assert.ok(languages.includes(baseTag(tag)), 'Unregistered name language');
    for (const name of data.names) {
      assert.match(name.name_id, NAME_ID);
      assert.ok(!allNames.has(name.name_id), 'Duplicate canonical name identity');
      checkRefs(name.source_refs);
      for (const usage of name.gender_usage ?? []) checkRefs([usage.source_id]);
      allNames.set(name.name_id, { name, tag, artifact });
      if (!['candidate', 'approved'].includes(name.review_state)) continue;
      assert.ok(name.canonical_form.length > 0 && name.canonical_form.length <= 200, 'Invalid name label');
      names.set(name.name_id, { name, tag, artifact });
    }
  }
  const families = new Map();
  const formIds = new Set();
  const setIds = new Set();
  for (const artifact of familyArtifacts) {
    const data = parseArtifact(artifact, /^name-families\/[^/]+\.json$/u);
    validate('families', data);
    assert.ok(!families.has(data.family_id), 'Duplicate name family identity');
    checkRefs(data.source_refs);
    for (const set of data.equivalence_sets) {
      assert.ok(!setIds.has(set.equivalence_set_id), 'Duplicate equivalence set identity');
      setIds.add(set.equivalence_set_id);
      for (const form of set.forms) {
        assert.ok(!formIds.has(form.form_id), 'Duplicate name form identity');
        formIds.add(form.form_id);
        assert.ok(languages.includes(baseTag(form.language_tag)), 'Unregistered name form language');
        checkRefs(form.source_refs);
        if (form.name_id !== undefined) {
          assert.ok(allNames.has(form.name_id), 'Unknown name identity in family form');
          assert.equal(baseTag(allNames.get(form.name_id).tag), baseTag(form.language_tag), 'Name form language does not match name identity');
        }
      }
    }
    families.set(data.family_id, { family: data, artifact });
  }
  for (const { name } of allNames.values()) {
    for (const ref of name.family_refs ?? []) {
      const family = families.get(ref.family_id)?.family;
      const set = family?.equivalence_sets.find(item => item.equivalence_set_id === ref.equivalence_set_id);
      assert.ok(set, 'Unknown explicit name equivalence set');
      if (ref.form_id !== undefined) {
        const form = set.forms.find(item => item.form_id === ref.form_id);
        assert.ok(form, 'Unknown explicit name family form');
        assert.ok(form.name_id === undefined || form.name_id === name.name_id, 'Family reference points at another name');
        assert.equal(baseTag(form.language_tag), baseTag(allNames.get(name.name_id).tag), 'Family membership form has a different language');
      }
    }
  }
  const references = [];
  for (const { name, tag, artifact } of names.values()) {
    const coverage = new Map();
    const add = (languageTag, approved, ref) => {
      const language = baseTag(languageTag);
      const prior = coverage.get(language);
      const status = approved ? 'attested' : 'candidate';
      if (!prior || (prior.status === 'candidate' && approved)) {
        coverage.set(language, { language_tag: language, status, evidence_refs: [ref] });
      } else if (prior.status === status && !prior.evidence_refs.some(item => item.path === ref.path)) {
        assert.ok(prior.evidence_refs.length < 20, 'Too many coverage evidence artifacts');
        prior.evidence_refs.push(ref);
      }
    };
    add(tag, name.review_state === 'approved' && sourced(name.source_refs), evidence(artifact));
    for (const { family, artifact: familyArtifact } of families.values()) {
      if (!['candidate', 'approved'].includes(family.review_state)) continue;
      for (const set of family.equivalence_sets) {
        const sourceForms = set.forms.filter(form => form.name_id === name.name_id
          || (name.family_refs ?? []).some(ref => ref.family_id === family.family_id
            && ref.equivalence_set_id === set.equivalence_set_id
            && ref.form_id === form.form_id));
        const explicitMember = sourceForms.some(form => ['candidate', 'approved'].includes(form.review_state));
        if (!explicitMember) continue;
        const sourceApproved = name.review_state === 'approved' && sourced(name.source_refs)
          && family.review_state === 'approved' && sourced(family.source_refs)
          && sourceForms.some(form => form.review_state === 'approved' && sourced(form.source_refs));
        for (const form of set.forms) {
          if (!['candidate', 'approved'].includes(form.review_state)) continue;
          const targetName = form.name_id === undefined ? null : allNames.get(form.name_id).name;
          if (targetName !== null && !['candidate', 'approved'].includes(targetName.review_state)) continue;
          const approved = sourceApproved && form.review_state === 'approved' && sourced(form.source_refs)
            && (targetName === null || (targetName.review_state === 'approved' && sourced(targetName.source_refs)));
          add(form.language_tag, approved, evidence(familyArtifact));
        }
      }
    }
    references.push({ kind: 'name', stable_id: name.name_id, source_language_tag: tag,
      display_label: name.canonical_form,
      coverage: [...coverage.values()].sort((a, b) => a.language_tag < b.language_tag ? -1 : a.language_tag > b.language_tag ? 1 : 0) });
  }
  references.sort((a, b) => a.stable_id < b.stable_id ? -1 : a.stable_id > b.stable_id ? 1 : 0);
  assert.ok(references.length <= 50_000, 'Too many reference identities');
  const projection = { contract: 'gef-research-reference-v1', lexicon_revision: lexiconRevision,
    registry_revision: registryRevision, registry_sha256: sha(registryBytes), languages, references, cohorts: [] };
  assert.ok(Buffer.byteLength(JSON.stringify(projection)) <= 20_000_000, 'Projection exceeds server bound');
  return projection;
}

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { maxBuffer: 8_000_000 });
}
function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length % 2 === 0, 'Use --registry-repo PATH and --out PATH');
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    assert.ok(['--registry-repo', '--out'].includes(key) && options[key] === undefined, 'Unknown or duplicate option');
    options[key] = args[index + 1];
  }
  const registryRepo = resolve(options['--registry-repo'] ?? resolve(ROOT, '..', 'gef-expo'));
  const lexiconRevision = git(ROOT, ['rev-parse', 'HEAD']).toString().trim();
  const registryRevision = git(registryRepo, ['rev-parse', 'HEAD']).toString().trim();
  const read = path => ({ path, bytes: git(ROOT, ['show', `${lexiconRevision}:${path}`]) });
  const files = git(ROOT, ['ls-tree', '-r', '--name-only', lexiconRevision, '--', 'names', 'name-families'])
    .toString().trim().split('\n').filter(Boolean);
  const schema = path => JSON.parse(read(path).bytes.toString());
  const projection = compileResearchReference({ lexiconRevision, registryRevision,
    registryBytes: git(registryRepo, ['show', `${registryRevision}:registry/language-support.json`]),
    nameArtifacts: files.filter(path => /^names\/[^/]+\/[^/]+\.json$/u.test(path)).map(read),
    familyArtifacts: files.filter(path => /^name-families\/[^/]+\.json$/u.test(path)).map(read),
    bibliographyArtifact: read('sources/bibliography.json'), schemas: {
      names: schema('schemas/name.schema.json'), families: schema('schemas/name-family.schema.json'),
      sources: schema('schemas/source.schema.json'),
    } });
  const output = resolve(options['--out'] ?? resolve(ROOT, 'dist/research/reference-v1.json'));
  const bytes = Buffer.from(`${JSON.stringify(projection, null, 2)}\n`);
  assert.ok(bytes.length <= 20_000_000, 'Formatted projection exceeds server bound');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, bytes);
  console.log(JSON.stringify({ output, sha256: sha(bytes), lexicon_revision: lexiconRevision,
    registry_revision: registryRevision, language_count: projection.languages.length,
    reference_count: projection.references.length, cohort_count: 0 }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
