/**
 * Read-only verification of an exact-edition name inventory. This is not NER,
 * etymology review, translation approval, or proof of complete work coverage.
 */
import { createHash } from 'node:crypto';
const check = (ok, message) => { if (!ok) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nonempty = (value) => typeof value === 'string' && value.length > 0;
const identity = (ref) => [ref.family_id, ref.equivalence_set_id, ref.form_id ?? null];
const memberKeys = (refs) => refs.map(identity).map(JSON.stringify).sort();
const word = (char) => char !== undefined && /[\p{L}\p{M}\p{N}_]/u.test(char);
export function exactNameSpans(text, surface) {
  const cp = Array.from(text), needle = Array.from(surface), result = [];
  check(needle.length > 0, 'Empty name surface');
  for (let i = 0; i + needle.length <= cp.length; i += 1) {
    if (word(cp[i - 1]) || word(cp[i + needle.length])) continue;
    if (needle.every((c, j) => cp[i + j] === c)) result.push([i, i + needle.length]);
  }
  return result;
}
function uniqueMap(rows, id, description) {
  const map = new Map();
  for (const row of rows) {
    check(nonempty(row[id]) && !map.has(row[id]), `Missing/duplicate ${description}: ${row[id]}`);
    map.set(row[id], row);
  }
  return map;
}

/** Pure seam; the caller supplies exact source bytes and canonical records. */
export function validateNameOccurrenceAudit(audit, { readEdition, nameDocuments, entityDocuments, families, sources }) {
  check(audit.schema_version === 1 && typeof audit.work_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(audit.work_id), 'Invalid name audit identity');
  check(audit.source_repository === 'Clickabl/gef-content', 'Unexpected source repository');
  check(audit.offset_unit === 'unicode_codepoint_nfc', 'Unexpected offset unit');
  check(audit.scope_complete === false && audit.scope_limitations?.length > 0,
    'A literal-name audit cannot certify whole-work inventory completion');
  check(Array.isArray(audit.editions) && audit.editions.length > 0, 'No audited editions');
  const names = uniqueMap(nameDocuments.flatMap((d) => d.names.map((n) => ({ ...n, language: d.language_code }))), 'name_id', 'name ID');
  const entities = uniqueMap(entityDocuments.flatMap((d) => d.entities), 'entity_id', 'entity ID');
  const sourceMap = uniqueMap(sources, 'source_id', 'source ID');
  const familyMap = uniqueMap(families, 'family_id', 'family ID');
  const setMap = uniqueMap(families.flatMap((f) => f.equivalence_sets.map((s) => ({ ...s, family_id: f.family_id }))), 'equivalence_set_id', 'equivalence-set ID');
  const formMap = uniqueMap(families.flatMap((f) => f.equivalence_sets.flatMap((s) => s.forms.map((x) => ({ ...x, family_id: f.family_id, equivalence_set_id: s.equivalence_set_id })))), 'form_id', 'family-form ID');
  const editionIds = new Set(), paths = new Set(), usedNames = new Set(), usedEntities = new Set();
  let mentions = 0, segments = 0;
  for (const entry of audit.editions) {
    check(nonempty(entry.edition_id) && !editionIds.has(entry.edition_id), 'Missing/duplicate edition ID');
    editionIds.add(entry.edition_id);
    check(typeof entry.path === 'string' && entry.path.startsWith(`works/${audit.work_id}/editions/`)
      && /^[A-Za-z0-9._-]+\.json$/u.test(entry.path.slice(`works/${audit.work_id}/editions/`.length))
      && !paths.has(entry.path), 'Unsafe/duplicate edition path');
    paths.add(entry.path);
    const bytes = readEdition(entry.path);
    check(Buffer.isBuffer(bytes) && bytes.length === entry.byte_size, `${entry.edition_id}: edition byte size mismatch`);
    check(createHash('sha256').update(bytes).digest('hex') === entry.sha256, `${entry.edition_id}: stale edition SHA-256`);
    check(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') === entry.git_blob_sha,
      `${entry.edition_id}: edition Git blob mismatch`);
    const edition = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    check(edition.edition_id === entry.edition_id && edition.language === entry.language && edition.work_id === audit.work_id,
      `${entry.edition_id}: edition identity mismatch`);
    check(edition.review_state === entry.source_review_state, `${entry.edition_id}: stale source review-state snapshot`);
    check(edition.segments.length === entry.inspected_segments, `${entry.edition_id}: inspected segment count mismatch`);
    segments += edition.segments.length;
    const segmentMap = uniqueMap(edition.segments, 'segment_id', 'segment ID');
    for (const segment of segmentMap.values()) {
      check(typeof segment.text === 'string' && segment.text === segment.text.normalize('NFC'), 'Source segment is not NFC');
    }
    const source = sourceMap.get(entry.source_id);
    check(source?.external_ids?.git_blob_sha === entry.git_blob_sha && source.external_ids.edition_id === entry.edition_id
      && source.external_ids.path === entry.path && source.language === entry.language, 'Missing/mismatched exact-edition source');
    const surfaces = new Set();
    check(Array.isArray(entry.name_entries) && entry.name_entries.length > 0, 'No audited names');
    for (const item of entry.name_entries) {
      check(nonempty(item.surface) && item.surface === item.surface.normalize('NFC') && !surfaces.has(item.surface),
        'Duplicate/ambiguous surface binding requires manual occurrence disambiguation');
      surfaces.add(item.surface);
      const name = names.get(item.name_id), entity = entities.get(item.entity_id);
      check(name && name.language === entry.language, 'Missing/wrong-language reusable name');
      check(entity && entity.entity_id !== name.name_id && entity.work_id === audit.work_id, 'Missing/wrong-work character entity');
      check(name.spellings.some((s) => s.text === item.surface && s.script === item.script), 'Name spelling/script mismatch');
      check(name.source_refs?.includes(entry.source_id), 'Name lacks exact edition provenance');
      for (const sourceId of name.source_refs ?? []) check(sourceMap.has(sourceId), 'Dangling name source reference');
      check(name.review_state === item.name_review_state, 'Stale name review-state snapshot');
      check(same(memberKeys(name.family_refs ?? []), memberKeys(item.family_refs ?? [])), 'Stale family membership snapshot');
      for (const ref of item.family_refs ?? []) {
        const form = formMap.get(ref.form_id), set = setMap.get(ref.equivalence_set_id);
        check(familyMap.has(ref.family_id) && set?.family_id === ref.family_id && form?.family_id === ref.family_id
          && form.equivalence_set_id === ref.equivalence_set_id && form.name_id === item.name_id,
          'Family reference crosses family, equivalence set, or name identity');
      }
      check(entity.name_refs?.some((r) => r.name_id === item.name_id && r.surface === item.surface), 'Entity lacks the name reference');
      check(entity.labels?.some((label) => label.language_code === entry.language && label.surface === item.surface
        && label.components?.some((c) => c.target_type === 'name' && c.target_id === item.name_id)), 'Entity lacks localized name label');
      check(entity.source_refs?.includes(entry.source_id), 'Entity lacks exact edition provenance');
      const expected = [], actual = [], seen = new Set();
      for (const segment of edition.segments) {
        for (const [start, end] of exactNameSpans(segment.text, item.surface)) expected.push(JSON.stringify([segment.segment_id, start, end]));
      }
      check(Array.isArray(item.occurrences), 'Missing occurrence list');
      for (const occurrence of item.occurrences) {
        const segment = segmentMap.get(occurrence.segment_id);
        check(segment && same(segment.anchor_ids, occurrence.anchor_ids), 'Occurrence anchor/segment identity mismatch');
        const { start_char: start, end_char: end } = occurrence;
        check(Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end > start
          && Array.from(segment.text).slice(start, end).join('') === item.surface, 'Invalid or stale code-point occurrence span');
        const key = JSON.stringify([occurrence.segment_id, start, end]);
        check(!seen.has(key), 'Duplicate occurrence'); seen.add(key); actual.push(key);
      }
      check(same(expected.sort(), actual.sort()), `${entry.edition_id}/${item.surface}: missing or extra literal-name occurrence`);
      usedNames.add(item.name_id); usedEntities.add(item.entity_id); mentions += actual.length;
    }
  }
  const expectedSummary = { inspected_editions: editionIds.size, inspected_segments: segments,
    name_mentions: mentions, new_language_name_records: usedNames.size, book_entities: usedEntities.size };
  for (const [field, value] of Object.entries(expectedSummary)) check(audit.summary?.[field] === value, `Audit summary mismatch: ${field}`);
  return { ...expectedSummary, whole_work_inventory_complete: false, review_promotion: false };
}
