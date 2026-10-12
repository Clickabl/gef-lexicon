/**
 * Name pipeline, step 2a: decide which forms belong to one family. Pure: snapshot in, family model out.
 *
 * Every form is justified by something a pinned English Wiktionary revision says:
 *   - the root entry's own given-name translation table lists it;
 *   - its own entry's {{given name}} says it is equivalent (eq=) to the root, or to a form already in the family;
 *   - its own entry says it is a diminutive (dimof=) or variant (varof=) of a form already in the family, in the same language.
 * A spelling that merely looks similar is never a reason (the "grace rule"). Nothing is promoted: the caller marks everything candidate.
 */
import { compareText, scriptOf, spellingFitsScript } from './common.mjs';
import { titleOf } from './wikitext.mjs';

const nfc = text => text.normalize('NFC');
const keyOf = (code, text) => `${code}|${nfc(text)}`;
const rootGenderRole = genders => {
  const male = genders.includes('male'), female = genders.includes('female');
  if (genders.includes('unisex') || (male && female)) return 'unisex';
  return male ? 'masculine' : female ? 'feminine' : null;
};
const genderCompatible = (role, genders) => !genders.length || genders.includes('unisex') || role === 'unisex'
  || (role === 'masculine' && genders.includes('male')) || (role === 'feminine' && genders.includes('female'));
const shortRole = genders => {
  const male = genders.includes('male'), female = genders.includes('female');
  if (genders.includes('unisex') || (male && female) || !genders.length) return 'unisex';
  return male ? 'masculine' : 'feminine';
};

/** True when the text is only the first letters of the root title: a candidate short form that nothing states outright. */
const isLeadingPortion = (text, rootTitle) => {
  const a = nfc(text).toLowerCase(), b = nfc(rootTitle).toLowerCase();
  return a.length < b.length && b.startsWith(a);
};

/**
 * @returns {{ ok: boolean, reason?: string, root: object, members: object[], excluded: object[] }}
 */
export function buildFamilyModel({ root, snapshot, filter }) {
  const allowed = new Set(filter.include_codes);
  const mapCode = code => filter.code_map?.[code] ?? code;
  const excluded = [];
  const rootPage = snapshot.pages[root.title];
  const rootEnglish = rootPage?.sections.find(section => section.heading === 'English')?.given_names.find(template => template.code === 'en');
  if (!rootEnglish) return { ok: false, reason: 'root_has_no_english_given_name_sense', root, members: [], excluded };
  const rootRole = rootGenderRole(rootEnglish.genders);
  if (!rootRole) return { ok: false, reason: 'root_gender_unstated', root, members: [], excluded };

  // Every given-name template in the snapshot, addressed by language code and page title.
  const templates = new Map();
  for (const [title, page] of Object.entries(snapshot.pages)) {
    for (const section of page.sections) for (const template of section.given_names) {
      if (!allowed.has(template.code)) continue;
      const key = keyOf(template.code, title);
      if (!templates.has(key)) templates.set(key, { title, page, section: section.heading, template });
    }
  }

  const members = new Map();
  const rootKey = keyOf('en', root.title);
  members.set(rootKey, { code: 'en', text: nfc(root.title), set: 'full', relation: 'source_form', evidence: new Set([root.title]), via: ['root'], tableIndex: -1 });
  const claim = (code, text, patch) => {
    const key = keyOf(code, text);
    const existing = members.get(key) ?? { code, text: nfc(text), set: null, relation: null, evidence: new Set(), via: [], tableIndex: Infinity };
    for (const title of patch.evidence ?? []) existing.evidence.add(title);
    for (const via of patch.via ?? []) if (!existing.via.includes(via)) existing.via.push(via);
    if (patch.tableIndex !== undefined) existing.tableIndex = Math.min(existing.tableIndex, patch.tableIndex);
    members.set(key, existing);
    return existing;
  };

  // Routes into the family that need no other member: the root's own translation table, and an entry that says eq=<root>.
  snapshot.root_table_rows.forEach((row, index) => {
    if (!allowed.has(row.code)) return;
    const text = titleOf(row.text);
    if (row.genders.length && !genderCompatible(rootRole, row.genders)) { excluded.push({ code: row.code, text, reason: 'table_gloss_gender_mismatch' }); return; }
    claim(row.code, text, { evidence: [root.title], via: ['table'], tableIndex: index });
  });
  for (const { title, template } of templates.values()) {
    if (template.eq.some(target => !target.language && nfc(target.text) === nfc(root.title)) || template.eq.some(target => target.language === 'en' && nfc(target.text) === nfc(root.title))) {
      claim(template.code, title, { evidence: [title, root.title], via: ['eq-root'] });
    }
  }

  // Routes that depend on a form already in the family: eq/dimof/varof pointing at a member. Repeats until nothing is added.
  for (let round = 0; round < 6; round += 1) {
    const before = members.size + [...members.values()].reduce((sum, member) => sum + member.via.length, 0);
    for (const entry of templates.values()) {
      const { title, template } = entry;
      for (const target of template.dimof) {
        if (members.has(keyOf(template.code, target.text))) claim(template.code, title, { evidence: [title], via: [`dimof:${keyOf(template.code, target.text)}`] });
      }
      for (const target of template.varof) {
        if (members.has(keyOf(template.code, target.text))) claim(template.code, title, { evidence: [title], via: [`varof:${keyOf(template.code, target.text)}`] });
      }
      for (const target of template.eq) {
        const targetCode = target.language ?? 'en';
        if (members.has(keyOf(targetCode, target.text)) && keyOf(targetCode, target.text) !== rootKey) {
          claim(template.code, title, { evidence: [title], via: [`eq:${keyOf(targetCode, target.text)}`] });
        }
      }
    }
    const after = members.size + [...members.values()].reduce((sum, member) => sum + member.via.length, 0);
    if (after === before) break;
  }

  // Classify every member into a set and a relation, or exclude it with a reason. Memoized because a member can depend on another.
  const classified = new Map();
  const classify = (key, trail = new Set()) => {
    if (classified.has(key)) return classified.get(key);
    const member = members.get(key);
    const own = templates.get(key) ?? null;
    const template = own?.template ?? null;
    if (key === rootKey) { const done = { ...member, own, set: 'full', setRole: rootRole, relation: 'source_form' }; classified.set(key, done); return done; }
    if (trail.has(key)) return null;
    trail.add(key);
    const genders = template?.genders ?? [];
    const viaKinds = new Set(member.via.map(value => value.split(':')[0]));
    const sameLanguageMember = target => { const k = keyOf(template.code, target.text); return k !== key && members.has(k) ? k : null; };
    const dimKey = template?.dimof.map(sameLanguageMember).find(Boolean) ?? null;
    const varKey = template?.varof.map(sameLanguageMember).find(Boolean) ?? null;
    const eqKey = template?.eq.map(target => { const k = keyOf(target.language ?? 'en', target.text); return k !== rootKey && k !== key && members.has(k) ? k : null; }).find(Boolean) ?? null;
    const fromEnglish = typeof template?.from === 'string' && /^English\b/.test(template.from);
    const script = scriptOf(member.text), rootScript = scriptOf(root.title);

    let done = null;
    if (!template && member.code === 'en') {
      excluded.push({ code: member.code, text: member.text, reason: 'no_given_name_entry' });
    } else if (template && !genderCompatible(rootRole, genders) && !dimKey && !eqKey) {
      excluded.push({ code: member.code, text: member.text, reason: 'gender_mismatch' });
    } else if (dimKey) {
      done = { ...member, own, set: 'short', setRole: shortRole(genders), relation: 'diminutive', base: dimKey };
    } else if (eqKey) {
      const target = classify(eqKey, trail);
      const short = target?.set === 'short';
      done = { ...member, own, set: short ? 'short' : 'full', setRole: short ? shortRole(genders) : rootRole, relation: short ? 'short_form' : 'local_equivalent', base: eqKey };
      if (!short && target?.set !== 'full') done = null;
    } else if (varKey) {
      const base = classify(varKey, trail);
      if (base) done = { ...member, own, set: base.set, setRole: base.setRole, relation: 'spelling_variant', base: varKey };
    } else if (viaKinds.has('eq-root') || (viaKinds.has('table') && template)) {
      const listedOnly = !viaKinds.has('eq-root') && isLeadingPortion(member.text, root.title);
      done = { ...member, own, set: listedOnly ? 'listed' : 'full', setRole: listedOnly ? 'other' : rootRole, relation: 'local_equivalent', flag: listedOnly ? 'leading_portion_listed_only' : null };
    } else if (viaKinds.has('table')) {
      done = { ...member, own, set: 'full', setRole: rootRole, relation: 'local_equivalent', flag: 'table_only_no_own_entry' };
    } else {
      excluded.push({ code: member.code, text: member.text, reason: 'no_route' });
    }
    if (done && done.set === 'full' && done.relation === 'local_equivalent' && fromEnglish) done.relation = script !== rootScript ? 'transliteration' : 'borrowed_adaptation';
    classified.set(key, done);
    return done;
  };
  const result = [];
  for (const key of [...members.keys()].sort(compareText)) {
    const done = classify(key);
    if (done && !spellingFitsScript(done.text, scriptOf(done.text))) {
      excluded.push({ code: done.code, text: done.text, reason: 'source_spelling_script_mismatch' });
    } else if (done) result.push(done);
  }
  unifySpellings(result);
  // The family contract owns one form per normalized surface in a language.
  // Preserve sourced case spellings on that name and merge their citations;
  // they do not become competing names or duplicated equivalence-set members.
  const surfaces = new Map();
  for (const member of result) {
    const surface = `${member.code}|${member.text.toLocaleLowerCase('und')}`;
    const existing = surfaces.get(surface);
    if (!existing) { surfaces.set(surface, { ...member, aliases: [] }); continue; }
    existing.aliases.push(member.text);
    for (const title of member.evidence) existing.evidence.add(title);
  }
  return { ok: true, root, rootRole, members: [...surfaces.values()], excluded };
}

/**
 * The app resolves a typed spelling to one equivalence set, and refuses to guess when a spelling sits in two. So a spelling
 * lives in exactly one set per family: the one the strongest evidence for that spelling puts it in. The other forms with the
 * same spelling (in other languages) keep their language and join that set; each is marked so a reviewer can see it moved.
 */
function unifySpellings(members) {
  const strength = member => (member.relation === 'source_form' ? 9 : member.relation === 'diminutive' ? 6 : member.relation === 'short_form' ? 5
    : member.via.includes('eq-root') ? 4 : member.relation === 'spelling_variant' ? 3 : member.flag === 'table_only_no_own_entry' ? 1 : member.flag ? 0 : 2);
  const bySpelling = new Map();
  for (const member of members) {
    const key = member.text.toLowerCase();
    if (!bySpelling.has(key)) bySpelling.set(key, []);
    bySpelling.get(key).push(member);
  }
  for (const group of bySpelling.values()) {
    if (group.length < 2 || new Set(group.map(member => `${member.set}-${member.setRole}`)).size < 2) continue;
    const best = [...group].sort((a, b) => strength(b) - strength(a) || compareText(a.code, b.code))[0];
    for (const member of group) {
      if (member.set === best.set && member.setRole === best.setRole) continue;
      member.movedFrom = `${member.set}-${member.setRole}`;
      member.set = best.set; member.setRole = best.setRole;
      if (member.set === 'short' && member.relation === 'local_equivalent') member.relation = 'short_form';
      member.movedTo = { code: best.code, text: best.text };
      member.flag = member.flag === 'leading_portion_listed_only' ? null : member.flag;
    }
  }
}

export { keyOf, nfc };
