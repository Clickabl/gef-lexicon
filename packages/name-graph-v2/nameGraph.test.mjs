import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NameGraphIndex, validateNameGraph, personalNameLiteral, normalizeNameLookup, nameRepresentationsCompatible } from './nameGraph.mjs';
import { NameEntrySession } from './nameEntry.mjs';
import { fixtureGraph, approveGraph } from './fixtures.mjs';
const index = () => new NameGraphIndex(fixtureGraph());
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('candidate data is usable in beta without becoming approved', () => {
  const graph = index(); assert.equal(graph.search('Tim')[0].reviewState, 'candidate'); assert.deepEqual(graph.search('Tim', { mode: 'reviewed' }), []);
});
test('uncertainty remains unknown rather than a fabricated probability', () => assert.equal(index().search('Tim')[0].certainty, null));
test('different name senses remain distinct even with the same spelling', () => {
  const result = index().resolveLiteral('Alex'); assert.equal(result.kind, 'ambiguous'); assert.equal(new Set(result.choices.map(row => row.nameId)).size, 2);
});
test('a one-row suggestion limit cannot remove ambiguity', () => { const graph = index(); assert.equal(graph.search('Alex', { limit: 1 }).length, 1); assert.equal(graph.resolveLiteral('Alex').kind, 'ambiguous'); });
test('Tim is not Timothy and related full names do not enter the reveal', () => {
  const graph = index(), choice = graph.resolveLiteral('Tim'); assert.equal(choice.match.nameId, 'NS.tim');
  const result = graph.reveal({ literal: choice.literal, ...choice.match }); assert.ok(result.forms.every(row => !row.text.includes('Τιμόθεος'))); assert.equal(result.forms[0].text, 'Timo');
});
test('an unknown creative spelling is preserved exactly', () => assert.deepEqual(index().resolveLiteral('  Tymothie  '), { kind: 'unknown', literal: 'Tymothie' }));
test('finding a case-insensitive match does not silently correct the entered spelling', () => assert.equal(index().resolveLiteral('tIM').literal, 'tIM'));
test('spelling-specific rendering overrides a language primary', () => {
  const result = index().reveal({ literal: 'Timothi', nameId: 'NS.timothy', spellingId: 'SP.timothy.en.custom' }); assert.deepEqual(result.forms.map(row => row.text), ['Τίμοθι']);
});
test('creative spelling with no authorized fallback remains literal', () => {
  const graph = fixtureGraph(); graph.renderings = []; const result = new NameGraphIndex(graph).reveal({ literal: 'Timothi', nameId: 'NS.timothy', spellingId: 'SP.timothy.en.custom' }); assert.deepEqual(result.forms, []);
});
test('rejected spelling-specific mapping cannot be bypassed with a primary', () => {
  const graph = fixtureGraph(); graph.spellings.find(row => row.id === 'SP.timothy.en.custom').fallbackToPrimary = true; graph.renderings[0].reviewState = 'rejected';
  assert.deepEqual(new NameGraphIndex(graph).reveal({ literal: 'Timothi', nameId: 'NS.timothy', spellingId: 'SP.timothy.en.custom' }).forms, []);
});
test('approved spelling under a candidate sense does not become a reviewed match', () => {
  const graph = approveGraph(fixtureGraph()); graph.names.find(row => row.id === 'NS.tim').reviewState = 'candidate'; assert.deepEqual(new NameGraphIndex(graph).search('Tim', { limit: 1, mode: 'reviewed' }).map(row => row.nameId), ['NS.timothy']);
});
test('source spelling and chosen sense must agree', () => assert.deepEqual(index().reveal({ literal: 'Tim', nameId: 'NS.timothy', spellingId: 'SP.tim.en' }).forms, []));
test('names never use a selected spelling for a changed literal', () => assert.deepEqual(index().reveal({ literal: 'Alice', nameId: 'NS.tim', spellingId: 'SP.tim.en' }).forms, []));
test('primary spellings are unique for each name and representation', () => {
  const graph = fixtureGraph(); graph.spellings.find(row => row.id === 'SP.timothy.en.custom').primary = true; assert.throws(() => validateNameGraph(graph), /name_primary_duplicate/);
});
test('an available representation requires a primary', () => { const graph = fixtureGraph(); graph.spellings[0].primary = false; assert.throws(() => validateNameGraph(graph), /name_primary_missing/); });
test('cross-sense renderings are rejected instead of merging short/full names', () => { const graph = fixtureGraph(); graph.renderings[0].toSpellingId = 'SP.tim.en'; assert.throws(() => validateNameGraph(graph), /name_rendering_crosses_sense/); });
test('dangling spelling references are rejected', () => { const graph = fixtureGraph(); graph.spellings[0].nameId = 'NS.missing'; assert.throws(() => validateNameGraph(graph), /name_spelling_orphan/); });
test('unknown fields cannot smuggle private identity into a shared graph', () => { const graph = fixtureGraph(); graph.names[0].accountId = 'private'; assert.throws(() => validateNameGraph(graph), /name_sense_invalid/); });
test('private candidate jobs cannot be relabelled as public input', () => { const graph = fixtureGraph(); graph.publication = 'private'; assert.throws(() => validateNameGraph(graph), /name_graph_contract_invalid/); });
test('candidate status is not an exemption from evidence', () => { const graph = fixtureGraph(); graph.names[0].sourceRefs = []; assert.throws(() => validateNameGraph(graph), /name_evidence_required/); });
test('invalid certainty is rejected', () => { for (const value of [NaN, Infinity, -1, 1.1, 'high']) { const graph = fixtureGraph(); graph.names[0].certainty = value; assert.throws(() => validateNameGraph(graph), /name_certainty_invalid/); } });
test('unqualified script representation cannot collapse requested output', () => { const graph = fixtureGraph(); graph.spellings[0].representationTag = 'en'; assert.throws(() => validateNameGraph(graph), /name_representation_requires_script/); });
test('Traditional Chinese never falls back to Simplified Chinese', () => { assert.equal(nameRepresentationsCompatible('zh-TW', 'zh-Hans'), false); assert.equal(nameRepresentationsCompatible('zh-TW', 'zh-Hant'), true); });
test('Latin Hindi never falls back to Devanagari', () => { assert.equal(nameRepresentationsCompatible('hi-Latn', 'hi-Deva'), false); assert.equal(nameRepresentationsCompatible('hi-Latn', 'hi-Latn'), true); });
test('normalization preserves accents', () => { assert.notEqual(normalizeNameLookup('Álex'), normalizeNameLookup('Alex')); assert.equal(personalNameLiteral('A\u0301lex'), 'Álex'); });
test('RTL and joining marks remain valid user text', () => assert.equal(personalNameLiteral('علي'), 'علي'));
test('control codes, isolated surrogates and misleading bidi formatting are invalid', () => { for (const value of ['', ' ', '\u0000', '\ud800', 'Tim\u202e']) assert.throws(() => personalNameLiteral(value)); });
test('name limits count graphemes and enforce bytes', () => { assert.equal(personalNameLiteral('é'.repeat(80)).length, 80); assert.throws(() => personalNameLiteral('a'.repeat(81))); assert.throws(() => personalNameLiteral(('a' + '\u0301'.repeat(20)).repeat(20))); });
test('graph snapshot cannot be changed by mutating the caller input', () => { const graph = fixtureGraph(), lookup = new NameGraphIndex(graph); graph.spellings[0].text = 'Other'; assert.equal(lookup.search('Tim')[0].text, 'Tim'); assert.throws(() => { lookup.snapshot.spellings[0].text = 'Other'; }); });
test('selected language ranks otherwise equal suggestions above best language', () => {
  const graph = fixtureGraph(); graph.spellings[1].text = 'Tim'; const lookup = new NameGraphIndex(graph);
  assert.equal(lookup.search('Tim', { preferredLanguage: 'es', bestLanguage: 'en' })[0].languageTag, 'es');
});
test('best-language ranking does not hide exact matches behind longer prefixes', () => assert.equal(index().search('Tim', { preferredLanguage: 'el', bestLanguage: 'es' })[0].text, 'Tim'));
test('malformed search limits fail explicitly', () => { for (const limit of [-1, NaN, Infinity, 51, 2.5]) assert.throws(() => index().search('Tim', { limit })); });
test('stale autocomplete responses cannot overwrite a newer query', async () => {
  const old = deferred(), current = deferred(); const session = new NameEntrySession({ search: text => text === 'Ti' ? old.promise : current.promise, resolveLiteral: () => ({}) });
  const first = session.change('Ti'), next = session.change('Al'); current.resolve([{ id: 'alex', text: 'Alex' }]); await next; old.resolve([{ id: 'tim', text: 'Tim' }]); await first;
  assert.equal(session.getSnapshot().text, 'Al'); assert.equal(session.getSnapshot().matches[0].id, 'alex');
});
test('typing clears stale choices before asynchronous work', async () => {
  const pending = deferred(); const session = new NameEntrySession({ search: text => text === 'Tim' ? [{ id: 'tim', text: 'Tim' }] : pending.promise, resolveLiteral: () => ({}) });
  await session.change('Tim'); const work = session.change('Alex'); assert.equal(session.choose('tim'), false); pending.resolve([]); await work;
});
test('a retired account cannot receive a late name response', async () => {
  const pending = deferred(), session = new NameEntrySession({ search: () => pending.promise, resolveLiteral: () => ({}) });
  const work = session.change('Tim'); session.dispose(); pending.resolve([{ id: 'tim', text: 'Tim' }]); await work; assert.equal(session.getSnapshot().status, 'retired'); assert.deepEqual(session.getSnapshot().matches, []);
});
test('new typing retires an in-flight exact resolution', async () => {
  const pending = deferred(), session = new NameEntrySession({ search: () => [], resolveLiteral: () => pending.promise }); await session.change('Tim'); const work = session.prepare(); await session.change('Alex'); pending.resolve({ kind: 'resolved', literal: 'Tim' }); assert.deepEqual(await work, { kind: 'retired' });
});
test('source failure does not prevent a literal name from being saved', async () => {
  const session = new NameEntrySession({ search: () => { throw Error(); }, resolveLiteral: () => { throw Error(); } }); await session.change('Tymothie'); assert.deepEqual(await session.prepare(), { kind: 'unknown', literal: 'Tymothie', sourceUnavailable: true });
});
test('explicit spelling choice is preserved and never creates a provider request', async () => {
  let resolves = 0; const session = new NameEntrySession({ search: () => index().search('Tim'), resolveLiteral: () => { resolves++; return null; } });
  await session.change('Tim'); const option = session.getSnapshot().matches[0]; assert.equal(session.choose(option.id), true); assert.equal((await session.prepare()).match.spellingId, 'SP.tim.en'); assert.equal(resolves, 0);
});
test('facts use actual requested representation and remain at most three facts', () => {
  const graph = fixtureGraph(); graph.names[0].facts = [{ languageTag: 'zh-Hans', text: '名字', reviewState: 'candidate', certainty: null, sourceRefs: ['fixture:synthetic'] }]; const lookup = new NameGraphIndex(graph);
  assert.deepEqual(lookup.facts('NS.tim', 'zh-Hant'), []); assert.equal(lookup.facts('NS.tim', 'zh-Hans').length, 1);
});
test('actual script mismatches fail instead of relying only on a tag', () => {
  const graph = fixtureGraph(); graph.spellings[0].text = 'Тим'; assert.throws(() => validateNameGraph(graph), /name_spelling_script_mismatch/);
});
test('Chinese base-language ranking respects the requested writing system', () => {
  const graph = fixtureGraph(), sample = graph.spellings[0];
  graph.spellings.push({ ...sample, id: 'SP.tim.zh.a', text: '名字', languageTag: 'zh', representationTag: 'zh-Hant' });
  graph.spellings.push({ ...sample, id: 'SP.tim.zh.b', text: '名字', languageTag: 'zh', representationTag: 'zh-Hans' });
  const lookup = new NameGraphIndex(graph);
  assert.equal(lookup.search('名字', { preferredLanguage: 'zh' })[0].representationTag, 'zh-Hans');
  assert.equal(lookup.search('名字', { preferredLanguage: 'zh-TW' })[0].representationTag, 'zh-Hant');
});
test('all available distinct reveal forms survive; there is no eight-form cap', () => {
  const graph = fixtureGraph(), base = graph.spellings.find(row => row.id === 'SP.timothy.en');
  for (const [i, languageTag] of ['fr', 'de', 'it', 'pt', 'nl', 'ro', 'sv', 'no', 'da', 'fi', 'pl', 'hu', 'tr'].entries()) {
    graph.spellings.push({ ...base, id: `SP.demo.${i}`, text: `FixtureName${i}`, languageTag, representationTag: `${languageTag}-Latn` });
  }
  const reveal = new NameGraphIndex(graph).reveal({ literal: 'Timothy', nameId: 'NS.timothy', spellingId: 'SP.timothy.en' });
  assert.equal(reveal.forms.length, 14);
});
test('language reranking does not throw away an explicitly chosen sense', async () => {
  const session = new NameEntrySession(index()); await session.change('Alex'); const selected = session.getSnapshot().matches[0]; session.choose(selected.id);
  await session.setLanguages({ preferredLanguage: 'es' }); assert.equal((await session.prepare()).match.nameId, selected.nameId);
});
