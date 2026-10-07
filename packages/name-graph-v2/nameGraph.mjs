/**
 * Versioned public lexical-name graph. No personal identities or provider transport.
 * This source is owned by gef-lexicon; consumer copies are hash-verified build artifacts.
 */
export const NAME_GRAPH_CONTRACT = 'gef-name-graph-v2';
export const NAME_GRAPH_LIMITS = Object.freeze({ names: 50000, spellings: 200000, renderings: 500000 });
const STATES = ['candidate', 'machine_reviewed', 'approved'];
const BLOCKED_STATES = ['rejected', 'superseded'];
const encoder = new TextEncoder();
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const fail = code => { throw new TypeError(code); };
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function object(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !keys.includes(key))
    || keys.some(key => !own(value, key))) fail(code);
  return value;
}
function boundedArray(value, max, code) {
  if (!Array.isArray(value) || value.length > max) fail(code);
  return value;
}
function string(value, max, code) {
  if (typeof value !== 'string' || !value.trim() || value !== value.normalize('NFC')
    || encoder.encode(value).length > max || /[\p{Cc}\p{Cs}]/u.test(value)) fail(code);
  return value;
}
function id(value, prefix) {
  if (typeof value !== 'string' || !new RegExp(`^${prefix}\\.[A-Za-z0-9][A-Za-z0-9._-]{0,119}$`, 'u').test(value)) fail('name_graph_id_invalid');
  return value;
}
export function canonicalNameTag(value) {
  if (typeof value !== 'string' || value.length > 64) fail('name_language_invalid');
  try { return Intl.getCanonicalLocales(value)[0]; } catch { fail('name_language_invalid'); }
}
function tag(value) {
  if (canonicalNameTag(value) !== value) fail('name_language_not_canonical');
  return value;
}
function validateSpellingScript(text, representationTag) {
  const script = new Intl.Locale(representationTag).script;
  const systems = { Hans: ['Hani'], Hant: ['Hani'], Jpan: ['Hani', 'Hira', 'Kana'], Kore: ['Hang', 'Hani'], Hrkt: ['Hira', 'Kana'] };
  let allowed;
  try { allowed = new RegExp(`^(?:${(systems[script] ?? [script]).map(value => `\\p{Script_Extensions=${value}}`).join('|')}|\\p{Script=Common}|\\p{Script=Inherited})$`, 'u'); }
  catch { fail('name_script_unsupported'); }
  for (const character of text) {
    if (/[\p{L}\p{M}]/u.test(character) && !allowed.test(character)) fail('name_spelling_script_mismatch');
  }
  // Han script validation cannot distinguish Simplified from Traditional spelling.
  // That distinction still requires lexical evidence; representation tags must not be collapsed.
}
function representation(value) {
  const locale = new Intl.Locale(tag(value));
  if (!locale.script) fail('name_representation_requires_script');
  return value;
}
export function normalizeNameLookup(value) {
  if (typeof value !== 'string') fail('name_text_invalid');
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('und');
}
export function personalNameLiteral(value) {
  if (typeof value !== 'string') fail('name_text_invalid');
  const text = value.normalize('NFC').trim();
  string(text, 512, 'name_text_invalid');
  const count = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(text)].length
    : Array.from(text).length;
  // Explicit directional formatting can disguise user input; ordinary RTL letters and joining marks are valid.
  if (count > 80 || /[\u202a-\u202e\u2066-\u2069]/u.test(text)) fail('name_text_invalid');
  return text;
}
function certainty(value) {
  if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) fail('name_certainty_invalid');
  return value;
}
function evidence(row) {
  if (![...STATES, ...BLOCKED_STATES].includes(row.reviewState)) fail('name_review_state_invalid');
  certainty(row.certainty);
  boundedArray(row.sourceRefs, 100, 'name_sources_invalid');
  for (const ref of row.sourceRefs) string(ref, 512, 'name_source_invalid');
  if (new Set(row.sourceRefs).size !== row.sourceRefs.length) fail('name_sources_duplicate');
  if (STATES.includes(row.reviewState) && row.sourceRefs.length === 0) fail('name_evidence_required');
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); }
  return value;
}
function unique(rows, code) {
  const map = new Map();
  for (const row of rows) { if (map.has(row.id)) fail(code); map.set(row.id, row); }
  return map;
}
const visible = (row, mode) => mode === 'reviewed' ? row.reviewState === 'approved' : STATES.includes(row.reviewState);
const weakestState = (...rows) => STATES[Math.min(...rows.map(row => STATES.indexOf(row.reviewState)))];
const combinedCertainty = (...rows) => rows.some(row => row.certainty === null) ? null : Math.min(...rows.map(row => row.certainty));
const refs = (...rows) => [...new Set(rows.flatMap(row => row.sourceRefs))].sort(compare);
function modeOrThrow(mode) { if (!['beta', 'reviewed'].includes(mode)) fail('name_mode_invalid'); return mode; }

/** Strict shape, referential integrity and non-invented identity boundaries. Returns a detached frozen snapshot. */
export function validateNameGraph(input) {
  object(input, ['contract', 'publication', 'names', 'spellings', 'renderings', 'relations'], 'name_graph_invalid');
  if (input.contract !== NAME_GRAPH_CONTRACT || input.publication !== 'public-reference') fail('name_graph_contract_invalid');
  for (const key of ['names', 'spellings', 'renderings']) boundedArray(input[key], NAME_GRAPH_LIMITS[key], 'name_graph_limit');
  boundedArray(input.relations, NAME_GRAPH_LIMITS.names, 'name_graph_limit');
  for (const row of input.names) {
    object(row, ['id', 'formKind', 'familyId', 'reviewState', 'certainty', 'sourceRefs', 'facts'], 'name_sense_invalid');
    id(row.id, 'NS');
    if (!['full', 'short', 'diminutive', 'other'].includes(row.formKind)) fail('name_kind_invalid');
    if (row.familyId !== null) string(row.familyId, 160, 'name_family_invalid');
    evidence(row);
    boundedArray(row.facts, 100, 'name_facts_invalid');
    const factLanguages = new Map();
    for (const fact of row.facts) {
      object(fact, ['languageTag', 'text', 'reviewState', 'certainty', 'sourceRefs'], 'name_fact_invalid');
      tag(fact.languageTag); string(fact.text, 1200, 'name_fact_invalid'); evidence(fact);
      factLanguages.set(fact.languageTag, (factLanguages.get(fact.languageTag) ?? 0) + 1);
      if (factLanguages.get(fact.languageTag) > 3) fail('name_facts_limit');
    }
  }
  const names = unique(input.names, 'name_sense_duplicate');
  const primaries = new Map(); const spellingKeys = new Set();
  for (const row of input.spellings) {
    object(row, ['id', 'nameId', 'text', 'languageTag', 'representationTag', 'primary', 'fallbackToPrimary', 'reviewState', 'certainty', 'sourceRefs'], 'name_spelling_invalid');
    id(row.id, 'SP'); id(row.nameId, 'NS'); personalNameLiteral(row.text);
    if (row.text !== row.text.trim() || row.text !== row.text.normalize('NFC')) fail('name_spelling_not_normalized');
    tag(row.languageTag); representation(row.representationTag); validateSpellingScript(row.text, row.representationTag); evidence(row);
    if (!names.has(row.nameId)) fail('name_spelling_orphan');
    if (new Intl.Locale(row.languageTag).language !== new Intl.Locale(row.representationTag).language) fail('name_spelling_language_mismatch');
    const declaredScript = new Intl.Locale(row.languageTag).script;
    if (declaredScript && declaredScript !== new Intl.Locale(row.representationTag).script) fail('name_spelling_script_mismatch');
    if (typeof row.primary !== 'boolean' || typeof row.fallbackToPrimary !== 'boolean') fail('name_primary_invalid');
    const identity = JSON.stringify([row.nameId, row.representationTag, row.text]);
    if (spellingKeys.has(identity)) fail('name_spelling_duplicate');
    spellingKeys.add(identity);
    if (row.primary && STATES.includes(row.reviewState)) {
      const key = JSON.stringify([row.nameId, row.representationTag]);
      if (primaries.has(key)) fail('name_primary_duplicate');
      primaries.set(key, row.id);
    }
  }
  const spellings = unique(input.spellings, 'name_spelling_id_duplicate');
  for (const row of spellings.values()) {
    if (STATES.includes(row.reviewState) && !primaries.has(JSON.stringify([row.nameId, row.representationTag]))) fail('name_primary_missing');
  }
  const edgeKeys = new Set();
  for (const row of input.renderings) {
    object(row, ['id', 'fromSpellingId', 'toSpellingId', 'relation', 'reviewState', 'certainty', 'sourceRefs'], 'name_rendering_invalid');
    id(row.id, 'NR'); id(row.fromSpellingId, 'SP'); id(row.toSpellingId, 'SP'); evidence(row);
    if (!['equivalent', 'transliteration', 'spelling_variant'].includes(row.relation)) fail('name_rendering_relation_invalid');
    const from = spellings.get(row.fromSpellingId), to = spellings.get(row.toSpellingId);
    if (!from || !to) fail('name_rendering_orphan');
    if (from.id === to.id || from.nameId !== to.nameId) fail('name_rendering_crosses_sense');
    const key = JSON.stringify([from.id, to.id]);
    if (edgeKeys.has(key)) fail('name_rendering_duplicate');
    edgeKeys.add(key);
  }
  unique(input.renderings, 'name_rendering_id_duplicate');
  const relationKeys = new Set();
  for (const row of input.relations) {
    object(row, ['fromNameId', 'toNameId', 'relation', 'reviewState', 'certainty', 'sourceRefs'], 'name_relation_invalid');
    id(row.fromNameId, 'NS'); id(row.toNameId, 'NS'); evidence(row);
    if (!names.has(row.fromNameId) || !names.has(row.toNameId) || row.fromNameId === row.toNameId) fail('name_relation_orphan');
    if (!['short_form_of', 'diminutive_of', 'related'].includes(row.relation)) fail('name_relation_kind_invalid');
    if (row.relation === 'short_form_of' && names.get(row.fromNameId).formKind !== 'short') fail('name_short_relation_invalid');
    if (row.relation === 'diminutive_of' && names.get(row.fromNameId).formKind !== 'diminutive') fail('name_diminutive_relation_invalid');
    const key = JSON.stringify([row.fromNameId, row.toNameId, row.relation]);
    if (relationKeys.has(key)) fail('name_relation_duplicate');
    relationKeys.add(key);
  }
  // Input cannot carry account IDs, chosen-name data, jobs, tokens, or an implicit publication grant.
  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export function nameRepresentationsCompatible(requested, available) {
  try {
    const left = new Intl.Locale(canonicalNameTag(requested)), right = new Intl.Locale(canonicalNameTag(available));
    return left.language === right.language && left.maximize().script === right.maximize().script;
  } catch { return false; }
}
function languageRank(row, preferred, best) {
  for (const [index, value] of [preferred, best].entries()) {
    if (!value) continue;
    let wanted; try { wanted = canonicalNameTag(value); } catch { continue; }
    if (wanted === row.representationTag || (wanted === row.languageTag && nameRepresentationsCompatible(wanted, row.representationTag))) return index * 2;
    if (nameRepresentationsCompatible(wanted, row.representationTag)) return index * 2 + 1;
  }
  return 4;
}

/** Public lookup only. Related short/full senses are never traversed when rendering a person's chosen name. */
export class NameGraphIndex {
  #graph; #names; #spellings; #rows; #outgoing;
  constructor(input) {
    this.#graph = validateNameGraph(input);
    this.#names = new Map(this.#graph.names.map(row => [row.id, row]));
    this.#spellings = new Map(this.#graph.spellings.map(row => [row.id, row]));
    this.#rows = this.#graph.spellings.map(row => ({ row, normalized: normalizeNameLookup(row.text) }));
    this.#outgoing = new Map();
    for (const edge of this.#graph.renderings) {
      const edges = this.#outgoing.get(edge.fromSpellingId) ?? [];
      edges.push(edge); this.#outgoing.set(edge.fromSpellingId, edges);
    }
  }
  get snapshot() { return this.#graph; }
  #match(row) {
    const name = this.#names.get(row.nameId);
    return Object.freeze({ id: `${row.nameId}/${row.id}`, nameId: row.nameId, spellingId: row.id,
      text: row.text, languageTag: row.languageTag, representationTag: row.representationTag,
      formKind: name.formKind, reviewState: weakestState(name, row), certainty: combinedCertainty(name, row), sourceRefs: refs(name, row) });
  }
  search(query, { preferredLanguage = null, bestLanguage = null, mode = 'beta', limit = 6 } = {}) {
    modeOrThrow(mode);
    if (!Number.isInteger(limit) || limit < 0 || limit > 50) fail('name_search_limit_invalid');
    const normalized = normalizeNameLookup(query);
    if (!normalized || normalized.length > 512 || limit === 0) return [];
    const rows = this.#rows.filter(({ row, normalized: text }) => visible(row, mode) && visible(this.#names.get(row.nameId), mode) && text.includes(normalized));
    const lexicalRank = value => value === normalized ? 0 : value.startsWith(normalized) ? 1 : 2;
    rows.sort((a, b) => lexicalRank(a.normalized) - lexicalRank(b.normalized)
      || languageRank(a.row, preferredLanguage, bestLanguage) - languageRank(b.row, preferredLanguage, bestLanguage)
      || a.normalized.length - b.normalized.length
      || STATES.indexOf(this.#match(b.row).reviewState) - STATES.indexOf(this.#match(a.row).reviewState)
      || (this.#match(b.row).certainty ?? -1) - (this.#match(a.row).certainty ?? -1)
      || compare(a.row.text, b.row.text) || compare(a.row.id, b.row.id));
    return rows.slice(0, limit).map(({ row }) => this.#match(row));
  }
  resolveLiteral(value, { mode = 'beta', preferredLanguage = null, bestLanguage = null } = {}) {
    modeOrThrow(mode); const literal = personalNameLiteral(value), normalized = normalizeNameLookup(literal);
    // This uses the complete exact-match set, never the truncated suggestion list.
    const rows = this.#rows.filter(({ row, normalized: text }) => text === normalized && visible(row, mode) && visible(this.#names.get(row.nameId), mode));
    if (!rows.length) return { kind: 'unknown', literal };
    const ids = new Set(rows.map(({ row }) => row.nameId));
    if (ids.size > 1) return { kind: 'ambiguous', literal, choices: rows.map(({ row }) => this.#match(row)) };
    rows.sort((a, b) => languageRank(a.row, preferredLanguage, bestLanguage) - languageRank(b.row, preferredLanguage, bestLanguage) || compare(a.row.id, b.row.id));
    return { kind: 'resolved', literal, match: this.#match(rows[0].row) };
  }
  reveal({ literal: value, nameId, spellingId }, { mode = 'beta', representations = null } = {}) {
    modeOrThrow(mode); const literal = personalNameLiteral(value), source = this.#spellings.get(spellingId), name = this.#names.get(nameId);
    if (!source || !name || source.nameId !== nameId || normalizeNameLookup(source.text) !== normalizeNameLookup(literal)
      || !visible(source, mode) || !visible(name, mode)) return { literal, forms: [] };
    if (representations !== null && (!Array.isArray(representations) || representations.length > 256)) fail('name_representations_invalid');
    const targets = representations === null
      ? [...new Set(this.#graph.spellings.filter(row => row.nameId === nameId).map(row => row.representationTag))]
      : [...new Set(representations.map(canonicalNameTag))];
    const outgoing = this.#outgoing.get(spellingId) ?? [];
    const forms = new Map();
    const add = (target, evidenceRows, relation) => {
      if (target.text.normalize('NFC') === literal || !evidenceRows.every(row => visible(row, mode))) return;
      const key = target.text.normalize('NFC');
      const prior = forms.get(key);
      const next = { text: key, spellingIds: [target.id], languageTags: [target.languageTag], representationTags: [target.representationTag],
        relation, reviewState: weakestState(...evidenceRows), certainty: combinedCertainty(...evidenceRows), sourceRefs: refs(...evidenceRows) };
      if (prior) {
        prior.spellingIds = [...new Set([...prior.spellingIds, target.id])];
        prior.languageTags = [...new Set([...prior.languageTags, target.languageTag])];
        prior.representationTags = [...new Set([...prior.representationTags, target.representationTag])];
        prior.sourceRefs = [...new Set([...prior.sourceRefs, ...next.sourceRefs])];
        prior.reviewState = STATES[Math.min(STATES.indexOf(prior.reviewState), STATES.indexOf(next.reviewState))];
        prior.certainty = prior.certainty === null || next.certainty === null ? null : Math.min(prior.certainty, next.certainty);
        if (prior.relation !== relation) prior.relation = 'mixed';
      } else forms.set(key, next);
    };
    for (const requested of targets) {
      // Never silently replace the user's original spelling in its own representation.
      if (nameRepresentationsCompatible(requested, source.representationTag)) continue;
      const edges = outgoing.filter(edge => nameRepresentationsCompatible(requested, this.#spellings.get(edge.toSpellingId).representationTag));
      // An explicit mapping exists, even if rejected: do not hide that decision with a sense-level fallback.
      if (edges.length) {
        for (const edge of edges) {
          const target = this.#spellings.get(edge.toSpellingId);
          add(target, [name, source, target, edge], edge.relation);
        }
      } else if (source.fallbackToPrimary) {
        const primaries = this.#graph.spellings.filter(row => row.nameId === nameId && row.primary
          && nameRepresentationsCompatible(requested, row.representationTag) && visible(row, mode));
        const exact = primaries.filter(row => row.representationTag === requested || row.languageTag === requested);
        const candidates = exact.length ? exact : primaries;
        // Several regional primaries are not permission to guess a person's name.
        if (candidates.length === 1) add(candidates[0], [name, source, candidates[0]], 'sense_primary');
      }
    }
    return { literal, forms: [...forms.values()].sort((a, b) => compare(a.text, b.text)) };
  }
  facts(nameId, requestedLanguage, { bestLanguage = null, mode = 'beta' } = {}) {
    modeOrThrow(mode); const name = this.#names.get(nameId);
    if (!name || !visible(name, mode)) return [];
    for (const requested of [requestedLanguage, bestLanguage]) {
      if (!requested) continue;
      const facts = name.facts.filter(fact => visible(fact, mode) && nameRepresentationsCompatible(requested, fact.languageTag));
      const exact = facts.filter(fact => fact.languageTag === canonicalNameTag(requested));
      if (exact.length) return exact.slice(0, 3);
      if (new Set(facts.map(fact => fact.languageTag)).size === 1) return facts.slice(0, 3);
    }
    return [];
  }
}
