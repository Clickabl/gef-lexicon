import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, PIPELINE_DIR, readJson } from './name-pipeline/common.mjs';
import { givenNameTemplates, givenNameTranslations, parseNameList, splitTopLevel, titleOf } from './name-pipeline/wikitext.mjs';
import { buildFamilyModel } from './name-pipeline/family.mjs';
import { changedByPlan, planBuild } from './name-pipeline/build.mjs';

const filter = { include_codes: ['en', 'es', 'de', 'ru', 'fi', 'da', 'el', 'fr'], code_map: {} };
const template = (code, genders, extra = {}) => ({ code, genders, eq: [], dimof: [], varof: [], xlit: [], from: null, usage: null, popular: null, raw: '{{given name}}', ...extra });
const page = (heading, ...given_names) => ({ revid: 1, timestamp: '2026-01-01T00:00:00Z', sha256: 'x', sections: [{ heading, given_names }] });

test('wikitext readers keep inline modifiers and equivalents apart', () => {
  assert.deepEqual(splitTopLevel('a|b<c|d>|{{e|f}}|[[g|h]]'), ['a', 'b<c|d>', '{{e|f}}', '[[g|h]]']);
  assert.deepEqual(parseNameList('Timothy,ru:Ка́тя<tr:Katya>,Timon<qq:rare>').map(item => [item.text, item.language]), [['Timothy', null], ['Ка́тя', 'ru'], ['Timon', null]]);
  const [one] = givenNameTemplates('# {{given name|ru|male|xlit=Timofey|eq=Timothy}}');
  assert.equal(one.code, 'ru');
  assert.deepEqual(one.genders, ['male']);
  assert.equal(one.xlit[0].text, 'Timofey');
  assert.equal(one.eq[0].text, 'Timothy');
  const [dim] = givenNameTemplates('# {{given name|en|male|dimof=Timothy,Timon<qq:rare>}}.');
  assert.deepEqual(dim.dimof.map(item => item.text), ['Timothy', 'Timon']);
  const rows = givenNameTranslations('{{trans-top|books in the New Testament}}\n* German: {{t|de|Timotheusbrief}}\n{{trans-bottom}}\n{{trans-top|male given name}}\n* German: {{t+|de|Tim|m}}, {{t+|de|Timo|m}}\n* Russian: {{t+|ru|Тимофе́й|m}}\n{{trans-bottom}}');
  assert.deepEqual(rows.map(row => [row.code, row.text, row.genders[0]]), [['de', 'Tim', 'male'], ['de', 'Timo', 'male'], ['ru', 'Тимофе́й', 'male']]);
  assert.equal(titleOf('Тимофе́й'), 'Тимофей');
  assert.equal(titleOf('Τιμόθεος'), 'Τιμόθεος', 'Greek accents are part of the title');
  assert.equal(titleOf('Timothée'), 'Timothée');
});

test('a form joins a family only through a sourced route, and sets stay apart', () => {
  const snapshot = {
    root_table_rows: [
      { code: 'es', text: 'Timoteo', genders: ['male'], gloss: 'male given name', tr: null },
      { code: 'de', text: 'Tim', genders: ['male'], gloss: 'male given name', tr: null },
      { code: 'de', text: 'Timo', genders: ['male'], gloss: 'male given name', tr: null },
      { code: 'el', text: 'Τιμόθεος', genders: ['male'], gloss: 'male given name', tr: null },
      { code: 'fr', text: 'Timothea', genders: ['female'], gloss: 'female given name', tr: null },
    ],
    romanizations: {},
    pages: {
      Timothy: page('English', template('en', ['male'])),
      Timoteo: page('Spanish', template('es', ['male'], { eq: [{ text: 'Timothy', language: null }] })),
      Tim: page('English', template('en', ['male'], { dimof: [{ text: 'Timothy', language: null }] })),
      Timo: page('Finnish', template('fi', ['male'], { eq: [{ text: 'Tim', language: null }] })),
      Timmy: page('English', template('en', ['male'], { dimof: [{ text: 'Tim', language: null }] })),
      Timothea: page('French', template('fr', ['female'])),
      Unrelated: page('English', template('en', ['male'])),
    },
  };
  const model = buildFamilyModel({ root: { title: 'Timothy' }, snapshot, filter });
  assert.equal(model.ok, true);
  const by = Object.fromEntries(model.members.map(member => [`${member.code}:${member.text}`, member]));
  assert.equal(by['en:Timothy'].relation, 'source_form');
  assert.equal(by['es:Timoteo'].set, 'full');
  assert.equal(by['en:Tim'].set, 'short');
  assert.equal(by['en:Tim'].relation, 'diminutive');
  assert.equal(by['en:Timmy'].set, 'short', 'a diminutive of a member joins on its own entry');
  assert.equal(by['fi:Timo'].set, 'short', 'equivalent to a short form is a short form');
  assert.equal(by['de:Tim'].set, 'short', 'the identical spelling lives in one set');
  assert.equal(by['el:Τιμόθεος'].flag, 'table_only_no_own_entry');
  assert.equal(by['en:Unrelated'], undefined, 'nothing is added for being in the snapshot');
  assert.equal(by['fr:Timothea'], undefined, 'a female form is not a form of a male name');
  assert.ok(model.excluded.some(item => item.text === 'Timothea' && item.reason === 'table_gloss_gender_mismatch'));
  const spellingSets = new Map();
  for (const member of model.members) {
    const sets = spellingSets.get(member.text.toLowerCase()) ?? new Set();
    sets.add(`${member.set}-${member.setRole}`);
    spellingSets.set(member.text.toLowerCase(), sets);
  }
  for (const [spelling, sets] of spellingSets) assert.equal(sets.size, 1, `${spelling} must resolve to one equivalence set`);
});

test('a root with no English given-name sense builds no family', () => {
  const model = buildFamilyModel({ root: { title: 'Nope' }, snapshot: { root_table_rows: [], romanizations: {}, pages: { Nope: page('English') } }, filter });
  assert.equal(model.ok, false);
});

test('every pipeline form is a candidate and cites a pinned Wiktionary revision', () => {
  const bibliography = new Map(readJson(join(REPO_ROOT, 'sources', 'bibliography.json')).sources.map(source => [source.source_id, source]));
  const { files } = planBuild();
  let forms = 0;
  for (const [path, document] of files) {
    if (!path.includes('/name-families/')) continue;
    assert.equal(document.review_state, 'candidate');
    for (const set of document.equivalence_sets) for (const form of set.forms) {
      forms += 1;
      assert.equal(form.review_state, 'candidate', form.form_id);
      assert.ok(form.source_refs.length > 0, `${form.form_id} has no source`);
      for (const id of form.source_refs) {
        const source = bibliography.get(id) ?? files.get(join(REPO_ROOT, 'sources', 'bibliography.json')).sources.find(item => item.source_id === id);
        assert.ok(source?.external_ids?.wiktionary_revision, `${id} is not a pinned revision`);
        assert.match(source.url, /oldid=\d+$/);
      }
    }
  }
  assert.ok(forms > 0);
});

test('building twice gives identical files, and the committed files are exactly what the snapshots build', () => {
  const first = planBuild(), second = planBuild();
  assert.equal(JSON.stringify([...first.files]), JSON.stringify([...second.files]));
  assert.deepEqual(changedByPlan(first).map(path => path.replace(`${REPO_ROOT}/`, '')), [], 'run node scripts/name-pipeline/build.mjs');
  assert.ok(existsSync(join(PIPELINE_DIR, 'snapshots')));
  assert.ok(readFileSync(join(PIPELINE_DIR, 'roots.json'), 'utf8').includes('Timothy'));
});
