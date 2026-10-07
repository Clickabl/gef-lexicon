/** Mechanical migration of explicit equivalence sets, not an inference about spelling or gender. */
import { createHash } from 'node:crypto';
import { canonicalNameTag, validateNameGraph } from './nameGraph.mjs';
const stable = (prefix, value) => `${prefix}.${createHash('sha256').update(value).digest('hex').slice(0, 32)}`;
const stateRank = ['candidate', 'machine_reviewed', 'approved'];
const state = (...values) => {
  if (values.includes('rejected')) return 'rejected';
  if (values.includes('superseded')) return 'superseded';
  if (values.some(value => !stateRank.includes(value))) throw new Error('name_legacy_review_state_invalid');
  return stateRank[Math.min(...values.map(value => stateRank.indexOf(value)))];
};
const sourceRefs = (...arrays) => [...new Set(arrays.flatMap(value => value ?? []))].sort();
const evidence = (reviewState, sources) => ({ reviewState, certainty: null, sourceRefs: sources });

/**
 * Keys in primaryBySetAndRepresentation are JSON.stringify([equivalence_set_id, representationTag]).
 * Values are existing form_id strings. Ambiguous primaries require this explicit editorial mapping.
 * Rejected/superseded sets are not migrated, and no state is promoted.
 */
export function migrateLegacyNameFamilies(families, primaryBySetAndRepresentation = {}) {
  const graph = { contract: 'gef-name-graph-v2', publication: 'public-reference', names: [], spellings: [], renderings: [], relations: [] };
  const seenSets = new Set(), consumedOverrides = new Set();
  const seenForms = new Set();
  for (const family of families) {
    if (['rejected', 'superseded'].includes(family.review_state)) continue;
    if (!Array.isArray(family.equivalence_sets) || typeof family.family_id !== 'string') throw new Error('name_legacy_family_invalid');
    for (const set of family.equivalence_sets) {
      if (typeof set.equivalence_set_id !== 'string' || seenSets.has(set.equivalence_set_id)) throw new Error('name_legacy_set_duplicate');
      seenSets.add(set.equivalence_set_id);
      const formKind = set.role?.startsWith('short_') ? 'short' : set.role?.startsWith('full_') ? 'full' : 'other';
      if (formKind === 'full' && set.forms.some(form => ['short_form', 'diminutive'].includes(form.relation_type))) {
        throw new Error(`name_legacy_mixed_full_short_set:${set.equivalence_set_id}`);
      }
      const forms = set.forms.filter(form => !['rejected', 'superseded'].includes(form.review_state));
      if (!forms.length) continue;
      const nameId = stable('NS', set.equivalence_set_id);
      graph.names.push({ id: nameId, formKind, familyId: family.family_id,
        ...evidence(family.review_state, sourceRefs(family.source_refs, ...forms.map(form => form.source_refs))), facts: [] });
      const groups = new Map();
      for (const form of forms) {
        if (typeof form.form_id !== 'string' || seenForms.has(form.form_id)) throw new Error('name_legacy_form_duplicate');
        seenForms.add(form.form_id);
        const languageTag = canonicalNameTag(form.language_tag);
        const locale = new Intl.Locale(languageTag);
        const script = form.script ?? locale.maximize().script;
        if (!script || (locale.script && locale.script !== script)) throw new Error('name_legacy_script_conflict');
        const representationTag = new Intl.Locale(languageTag, { script }).toString();
        const row = { id: stable('SP', form.form_id), nameId, text: form.text.normalize('NFC').trim(), languageTag, representationTag,
          primary: false, fallbackToPrimary: false, ...evidence(state(family.review_state, form.review_state), sourceRefs(family.source_refs, form.source_refs)) };
        graph.spellings.push(row);
        const group = groups.get(representationTag) ?? [];
        group.push({ row, form }); groups.set(representationTag, group);
      }
      for (const [representationTag, rows] of groups) {
        const key = JSON.stringify([set.equivalence_set_id, representationTag]);
        const selectedId = Object.prototype.hasOwnProperty.call(primaryBySetAndRepresentation, key) ? primaryBySetAndRepresentation[key] : null;
        const preferred = rows.filter(({ form }) => form.usage === 'preferred');
        const source = rows.filter(({ form }) => form.relation_type === 'source_form');
        const chosen = selectedId !== null ? rows.find(({ form }) => form.form_id === selectedId)
          : rows.length === 1 ? rows[0] : preferred.length === 1 ? preferred[0] : source.length === 1 ? source[0] : null;
        if (!chosen) throw new Error(`name_primary_decision_required:${key}`);
        if (selectedId !== null) consumedOverrides.add(key);
        chosen.row.primary = true;
        // Existing set membership authorizes sense-level primary defaults for the primary only.
        // Secondary/creative spellings require deliberately authored rendering links; no Cartesian links are invented.
        chosen.row.fallbackToPrimary = true;
      }
    }
  }
  if (Object.keys(primaryBySetAndRepresentation).some(key => !consumedOverrides.has(key))) throw new Error('name_primary_override_unused');
  return validateNameGraph(graph);
}
