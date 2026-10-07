/** Synthetic contract tests, not publishable lexical evidence. */
const evidence = { reviewState: 'candidate', certainty: null, sourceRefs: ['fixture:synthetic'] };
export function fixtureGraph() {
  const name = (id, formKind = 'full') => ({ id, formKind, familyId: null, ...evidence, facts: [] });
  const spelling = (id, nameId, text, languageTag, representationTag, primary = true, fallbackToPrimary = true) => ({
    id, nameId, text, languageTag, representationTag, primary, fallbackToPrimary, ...evidence,
  });
  const rendering = (id, fromSpellingId, toSpellingId) => ({ id, fromSpellingId, toSpellingId, relation: 'transliteration', ...evidence });
  return {
    contract: 'gef-name-graph-v2', publication: 'public-reference',
    names: [name('NS.tim', 'short'), name('NS.timothy'), name('NS.alex.one'), name('NS.alex.two')],
    spellings: [
      spelling('SP.tim.en', 'NS.tim', 'Tim', 'en', 'en-Latn'),
      spelling('SP.tim.es', 'NS.tim', 'Timo', 'es', 'es-Latn'),
      spelling('SP.timothy.en', 'NS.timothy', 'Timothy', 'en', 'en-Latn'),
      spelling('SP.timothy.el', 'NS.timothy', 'Τιμόθεος', 'el', 'el-Grek'),
      spelling('SP.timothy.en.custom', 'NS.timothy', 'Timothi', 'en', 'en-Latn', false, false),
      spelling('SP.timothy.el.custom', 'NS.timothy', 'Τίμοθι', 'el', 'el-Grek', false, false),
      spelling('SP.alex.one.en', 'NS.alex.one', 'Alex', 'en', 'en-Latn'),
      spelling('SP.alex.one.es', 'NS.alex.one', 'Álex', 'es', 'es-Latn'),
      spelling('SP.alex.two.en', 'NS.alex.two', 'Alex', 'en', 'en-Latn'),
    ],
    renderings: [rendering('NR.custom', 'SP.timothy.en.custom', 'SP.timothy.el.custom')],
    relations: [{ fromNameId: 'NS.tim', toNameId: 'NS.timothy', relation: 'short_form_of', ...evidence }],
  };
}
export function approveGraph(graph) {
  const visit = value => { if (value && typeof value === 'object') { if ('reviewState' in value) value.reviewState = 'approved'; for (const child of Object.values(value)) visit(child); } };
  visit(graph); return graph;
}
