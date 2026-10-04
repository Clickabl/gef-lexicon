import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateNameOccurrenceAudit, exactNameSpans } from './lib/name-occurrence-audit.mjs';

// Synthetic fixtures test the contract, not onomastic claims about real names.
function fixture() {
  const source = { work_id: 'fixture', edition_id: 'fixture-en-1', language: 'en', review_state: 'machine-draft',
    segments: [{ segment_id: 's1', anchor_ids: ['a1'], text: '😀 Alex sees Alexa. Alex listens.' }] };
  const bytes = Buffer.from(JSON.stringify(source));
  const path = 'works/fixture/editions/en.json';
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const item = { surface: 'Alex', script: 'Latn', name_id: 'name_en_alex', entity_id: 'ent_fixture_alex',
    name_review_state: 'candidate', family_refs: [], occurrences: exactNameSpans(source.segments[0].text, 'Alex')
      .map(([start_char, end_char]) => ({ segment_id: 's1', anchor_ids: ['a1'], start_char, end_char })) };
  const audit = { schema_version: 1, work_id: 'fixture', source_repository: 'Clickabl/gef-content',
    offset_unit: 'unicode_codepoint_nfc', scope_complete: false, scope_limitations: ['Synthetic literal-name fixture only'],
    summary: { inspected_editions: 1, inspected_segments: 1, name_mentions: 2, new_language_name_records: 1, book_entities: 1 },
    editions: [{ edition_id: source.edition_id, language: 'en', path, git_blob_sha: blob,
      sha256: createHash('sha256').update(bytes).digest('hex'), byte_size: bytes.length, source_id: 'src_fixture',
      source_review_state: source.review_state, inspected_segments: 1, name_entries: [item] }] };
  const data = { readEdition: (p) => { assert.equal(p, path); return bytes; },
    nameDocuments: [{ language_code: 'en', names: [{ name_id: item.name_id, canonical_form: 'Alex',
      spellings: [{ text: 'Alex', script: 'Latn' }], source_refs: ['src_fixture'], review_state: 'candidate', family_refs: [] }] }],
    entityDocuments: [{ entities: [{ entity_id: item.entity_id, work_id: 'fixture', name_refs: [{ name_id: item.name_id, surface: 'Alex' }],
      labels: [{ language_code: 'en', surface: 'Alex', components: [{ target_type: 'name', target_id: item.name_id }] }], source_refs: ['src_fixture'] }] }],
    sources: [{ source_id: 'src_fixture', language: 'en', external_ids: { git_blob_sha: blob, edition_id: source.edition_id, path } }], families: [] };
  return { audit, data, item, source, bytes };
}
const run = (f) => validateNameOccurrenceAudit(f.audit, f.data);
test('exact code-point audit passes without approval or whole-work completion', () => {
  const result = run(fixture()); assert.equal(result.name_mentions, 2);
  assert.equal(result.review_promotion, false); assert.equal(result.whole_work_inventory_complete, false);
});
test('whole-word matching distinguishes Alex from Alexa', () => {
  assert.deepEqual(exactNameSpans('😀 Alex Alexa', 'Alex'), [[2, 6]]);
});
test('rejects stale same-size source bytes', () => {
  const f = fixture(); f.data.readEdition = () => Buffer.from(f.bytes.toString().replace('sees', 'says'));
  assert.throws(() => run(f), /SHA-256/);
});
test('rejects false Git blob identity independently of SHA-256', () => {
  const f = fixture(); f.audit.editions[0].git_blob_sha = '0'.repeat(40);
  assert.throws(() => run(f), /Git blob/);
});
test('rejects omitted occurrence instead of trusting the summary', () => {
  const f = fixture(); f.item.occurrences.pop(); f.audit.summary.name_mentions = 1;
  assert.throws(() => run(f), /missing or extra/);
});
test('rejects duplicate occurrence', () => {
  const f = fixture(); f.item.occurrences.push(f.item.occurrences[0]);
  assert.throws(() => run(f), /Duplicate occurrence/);
});
test('rejects UTF-16 offsets after an emoji', () => {
  const f = fixture(); f.item.occurrences[0].start_char++; f.item.occurrences[0].end_char++;
  assert.throws(() => run(f), /code-point/);
});
test('rejects a name wired to a different-language record', () => {
  const f = fixture(); f.data.nameDocuments[0].language_code = 'es';
  assert.throws(() => run(f), /wrong-language/);
});
test('rejects an entity from another book', () => {
  const f = fixture(); f.data.entityDocuments[0].entities[0].work_id = 'another';
  assert.throws(() => run(f), /wrong-work/);
});
test('does not merge two people merely because both reference one reusable name', () => {
  const f = fixture(); const second = structuredClone(f.data.entityDocuments[0].entities[0]);
  second.entity_id = 'ent_fixture_other_alex'; f.data.entityDocuments[0].entities.push(second);
  assert.equal(run(f).book_entities, 1); // Only the explicitly targeted entity is counted.
});
test('ambiguous surface-to-entity binding must not duplicate all matches', () => {
  const f = fixture(); f.audit.editions[0].name_entries.push({ ...f.item, entity_id: 'ent_fixture_other_alex' });
  assert.throws(() => run(f), /ambiguous surface binding/);
});
test('rejects dangling exact-edition provenance', () => {
  const f = fixture(); f.data.sources = [];
  assert.throws(() => run(f), /exact-edition source/);
});
test('rejects another source attached to the correct spelling without a record', () => {
  const f = fixture(); f.data.nameDocuments[0].names[0].source_refs.push('src_missing');
  assert.throws(() => run(f), /Dangling name source/);
});
test('rejects an entity missing its localized label', () => {
  const f = fixture(); f.data.entityDocuments[0].entities[0].labels = [];
  assert.throws(() => run(f), /localized name label/);
});
test('rejects stale review-state snapshots rather than promoting them', () => {
  const f = fixture(); f.item.name_review_state = 'approved';
  assert.throws(() => run(f), /review-state/);
});
test('rejects equivalence-set crossing even when both sets exist', () => {
  const f = fixture();
  const ref = { family_id: 'NF.fixture', equivalence_set_id: 'NFEQ.fixture.full', form_id: 'NFF.fixture.short' };
  f.item.family_refs = [ref]; f.data.nameDocuments[0].names[0].family_refs = [ref];
  f.data.families = [{ family_id: 'NF.fixture', equivalence_sets: [
    { equivalence_set_id: 'NFEQ.fixture.full', forms: [] },
    { equivalence_set_id: 'NFEQ.fixture.short', forms: [{ form_id: 'NFF.fixture.short', name_id: 'name_en_alex' }] },
  ] }];
  assert.throws(() => run(f), /crosses family, equivalence set/);
});
test('rejects two distinct reusable records with the same stable ID', () => {
  const f = fixture(); f.data.nameDocuments.push(structuredClone(f.data.nameDocuments[0]));
  assert.throws(() => run(f), /duplicate name ID/);
});
test('rejects an inflated coverage counter', () => {
  const f = fixture(); f.audit.summary.inspected_editions = 104;
  assert.throws(() => run(f), /summary mismatch/);
});
test('literal matching cannot turn the research artifact into complete inventory', () => {
  const f = fixture(); f.audit.scope_complete = true;
  assert.throws(() => run(f), /whole-work/);
});
test('path validation occurs before file reads', () => {
  const f = fixture(); f.audit.editions[0].path = '../outside.json';
  f.data.readEdition = () => { throw new Error('must not execute'); };
  assert.throws(() => run(f), /Unsafe/);
});
test('validation never edits source records or review state', () => {
  const f = fixture(); const before = JSON.stringify({ audit: f.audit, data: f.data });
  run(f); assert.equal(JSON.stringify({ audit: f.audit, data: f.data }), before);
});
