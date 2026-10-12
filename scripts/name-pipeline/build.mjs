#!/usr/bin/env node
/**
 * Name pipeline, step 2: build. Offline and deterministic: the same snapshots and repository state give identical files.
 *
 * Reads research/name-pipeline/{roots,language-filter}.json and snapshots/*.json (captured by fetch.mjs) and writes:
 *   name-families/<root>.json            one family per root, everything review_state "candidate"
 *   names/<language>/names.json          one language-local record per form (records that are not the pipeline's are only given a family ref)
 *   sources/bibliography.json            one pinned-revision entry per Wiktionary page a form cites
 *   lexi/name-family-index.json          the discovery catalogue
 *   research/name-pipeline/              primary-map.json, generated-names.json, build-report.json
 *
 *   node scripts/name-pipeline/build.mjs [--check]     --check writes nothing and exits 1 if any output would change
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PIPELINE_DIR, REPO_ROOT, SNAPSHOT_DIR, asciiSlug, compareText, maybeJson, readJson, scriptOf, sha256 } from './common.mjs';
import { buildFamilyModel, keyOf, nfc } from './family.mjs';

export const MARKER = 'name-pipeline-v1';
const LICENSE = 'CC BY-SA; see Wikimedia/Wiktionary terms for the pinned revision';
const POLICY = {
  fallback_order: ['reviewed_local_equivalent', 'reviewed_traditional_adaptation', 'reviewed_transliteration', 'preserve_entered_form'],
  never_cross_equivalence_sets_automatically: true, book_override_allowed: true, user_override_allowed: true,
};
const SET_ORDER = ['full-masculine', 'full-feminine', 'full-unisex', 'short-masculine', 'short-feminine', 'short-unisex', 'listed-other'];
const SET_META = {
  'full-masculine': ['full_masculine', 'Full-name forms and equivalents only. Short and pet forms are intentionally kept in separate equivalence sets.'],
  'full-feminine': ['full_feminine', 'Full-name forms and equivalents only. Short and pet forms are intentionally kept in separate equivalence sets.'],
  'full-unisex': ['other', 'Full-name forms and equivalents the sources give for both genders. Short and pet forms are intentionally kept in separate equivalence sets.'],
  'short-masculine': ['short_masculine', 'Short, pet and diminutive forms. They are not substitutes for the full-name forms.'],
  'short-feminine': ['short_feminine', 'Short, pet and diminutive forms. They are not substitutes for the full-name forms.'],
  'short-unisex': ['short_unisex', 'Short, pet and diminutive forms. They are not substitutes for the full-name forms.'],
  'listed-other': ['other', "Forms the root entry's translation table lists whose relation to the full name no source states; kept out of the full-name set."],
};
const GENDER_WORD = { male: 'male', female: 'female', unisex: 'unisex' };

const listJson = dir => (existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.json')).sort(compareText) : []);
const hash4 = text => sha256(text).slice(0, 4);
const codepointSlug = text => `u${[...text].slice(0, 6).map(char => char.codePointAt(0).toString(16)).join('_')}`;

function identifierSlug(member, snapshot) {
  if (scriptOf(member.text) === 'Latn') { const direct = asciiSlug(member.text); if (direct) return direct; }
  const own = member.own?.template.xlit?.[0]?.text;
  const row = snapshot.root_table_rows.find(item => item.code === member.code && nfc(item.text) === member.text && item.tr);
  const roman = asciiSlug(own ?? snapshot.romanizations?.[`${member.code}|${member.text}`] ?? row?.tr ?? '');
  return roman || codepointSlug(member.text);
}

/** Plan every output file. Pure with respect to the repository: nothing is written here. */
export function planBuild({ repoRoot = REPO_ROOT, pipelineDir = PIPELINE_DIR, snapshotDir = SNAPSHOT_DIR } = {}) {
  const filter = readJson(join(pipelineDir, 'language-filter.json'));
  const rootsFile = readJson(join(pipelineDir, 'roots.json'));
  const mapCode = code => filter.code_map?.[code] ?? code;

  // ---- existing repository state ----
  const familyDir = join(repoRoot, 'name-families');
  const familyFiles = new Map(listJson(familyDir).map(name => [name, readJson(join(familyDir, name))]));
  const ownedFamilyIds = new Set(rootsFile.roots.map(root => `NF.${asciiSlug(root.title)}`));
  const manifestPath = join(pipelineDir, 'generated-names.json');
  const manifest = new Set(maybeJson(manifestPath, { name_ids: [] }).name_ids);
  const namesRoot = join(repoRoot, 'names');
  const nameFiles = new Map();
  for (const lang of existsSync(namesRoot) ? readdirSync(namesRoot).sort(compareText) : []) {
    const file = join(namesRoot, lang, 'names.json');
    if (existsSync(file)) nameFiles.set(lang, { file, data: readJson(file), changed: true });
  }
  for (const root of rootsFile.roots.filter(entry => entry.adopt_existing)) {
    const familyId = `NF.${asciiSlug(root.title)}`;
    for (const { data } of nameFiles.values()) for (const name of data.names) {
      const refs = name.family_refs ?? [];
      if (refs.length && refs.every(ref => ref.family_id === familyId)) manifest.add(name.name_id);
    }
  }
  const previousName = new Map();
  for (const [lang, { data }] of nameFiles) for (const name of data.names) if (manifest.has(name.name_id)) previousName.set(`${lang}|${nfc(name.canonical_form)}`, name.name_id);
  const previousForm = new Map();
  for (const family of familyFiles.values()) {
    if (!ownedFamilyIds.has(family.family_id)) continue;
    for (const set of family.equivalence_sets) for (const form of set.forms) previousForm.set(`${family.family_id}|${form.language_tag}|${nfc(form.text)}`, form.form_id);
  }
  for (const { data } of nameFiles.values()) {
    data.names = data.names.filter(name => !manifest.has(name.name_id));
    for (const name of data.names) {
      if (!name.family_refs?.some(ref => ownedFamilyIds.has(ref.family_id))) continue;
      name.family_refs = name.family_refs.filter(ref => !ownedFamilyIds.has(ref.family_id));
      if (!name.family_refs.length) name.family_refs = [];
    }
  }
  const takenNameIds = new Set([...nameFiles.values()].flatMap(({ data }) => data.names.map(name => name.name_id)));
  const keptNameByForm = new Map();
  for (const [lang, { data }] of nameFiles) for (const name of data.names) if (name.name_type === 'given') keptNameByForm.set(`${lang}|${nfc(name.canonical_form)}`, name);
  const claimedBy = new Map();
  for (const family of familyFiles.values()) {
    if (ownedFamilyIds.has(family.family_id)) continue;
    for (const set of family.equivalence_sets) for (const form of set.forms) claimedBy.set(`${form.language_tag}|${nfc(form.text)}`, family.family_id);
  }

  // ---- bibliography ----
  const bibliographyPath = join(repoRoot, 'sources', 'bibliography.json');
  const bibliography = readJson(bibliographyPath);
  const sourceByPin = new Map();
  for (const source of bibliography.sources) {
    const page = source.external_ids?.wiktionary_page, revision = source.external_ids?.wiktionary_revision;
    if (page && revision) sourceByPin.set(`${page}|${revision}`, source.source_id);
  }
  const newSources = new Map();
  const pageSource = (title, page, snapshot) => {
    const pin = `${title}|${page.revid}`;
    if (sourceByPin.has(pin)) return sourceByPin.get(pin);
    const slug = asciiSlug(title) || codepointSlug(title);
    const id = `src_wiktionary_en_${slug}_oldid_${page.revid}`;
    const languages = [...new Set(page.sections.map(section => section.heading))].join(', ');
    newSources.set(id, {
      source_id: id, source_type: 'website', title: `English Wiktionary: ${title} (revision ${page.revid})`,
      url: `https://en.wiktionary.org/w/index.php?title=${encodeURIComponent(title.replaceAll(' ', '_'))}&oldid=${page.revid}`,
      license: LICENSE,
      external_ids: { wiktionary_page: title, wiktionary_revision: String(page.revid), wiktionary_revision_timestamp: page.timestamp, pipeline: MARKER },
      note: `Retrieved ${snapshot.retrieved_at} from the English Wiktionary MediaWiki API (revision timestamp ${page.timestamp}) by scripts/name-pipeline and treated as candidate onomastic evidence. Supports the given-name sense(s) it lists in: ${languages || 'no language section with a given-name sense'}. Translation-table membership and eq=/dimof= parameters are not treated as approval or as automatic user-name localization.`,
    });
    sourceByPin.set(pin, id);
    return id;
  };

  // ---- families ----
  const report = { generated_by: MARKER, families: [], skipped: [] };
  const primaryMap = {};
  const newFamilies = new Map();
  const nameContribution = new Map();   // name_id -> { tag, text, member, refs, sources, relations, family }
  const familyIdsInOrder = [];

  for (const root of rootsFile.roots) {
    const slug = asciiSlug(root.title), familyId = `NF.${slug}`;
    const snapshotPath = join(snapshotDir, `${slug}.json`);
    if (!existsSync(snapshotPath)) { report.skipped.push({ root: root.title, reason: 'no_snapshot' }); continue; }
    const snapshot = readJson(snapshotPath);
    const model = buildFamilyModel({ root, snapshot, filter });
    if (!model.ok) { report.skipped.push({ root: root.title, reason: model.reason }); continue; }
    const rootOwner = claimedBy.get(`en|${nfc(root.title)}`);
    if (rootOwner && rootOwner !== familyId) { report.skipped.push({ root: root.title, reason: `root_claimed_by:${rootOwner}` }); continue; }

    const excluded = [...model.excluded];
    const kept = [];
    for (const member of model.members) {
      const tag = mapCode(member.code);
      const owner = claimedBy.get(`${tag}|${member.text}`);
      if (owner && owner !== familyId) { excluded.push({ code: member.code, text: member.text, reason: `claimed_by:${owner}` }); continue; }
      kept.push({ ...member, tag, script: scriptOf(member.text), setKey: `${member.set}-${member.setRole}` });
    }
    kept.sort((a, b) => compareText(`${a.tag}|${a.text}`, `${b.tag}|${b.text}`));
    for (const member of kept) claimedBy.set(`${member.tag}|${member.text}`, familyId);
    const byKey = new Map(kept.flatMap(member => [member.text, ...(member.aliases ?? [])].map(text => [keyOf(member.code, text), member])));

    // Identifiers: reuse what a previous run or an adopted record already holds.
    const usedFormIds = new Set();
    for (const member of kept) {
      let formId = previousForm.get(`${familyId}|${member.tag}|${member.text}`) ?? `NFF.${slug}.${member.tag}.${identifierSlug(member, snapshot)}`;
      if (usedFormIds.has(formId)) formId = `${formId}_${hash4(member.text)}`;
      usedFormIds.add(formId);
      member.formId = formId;
      let nameId = previousName.get(`${member.tag}|${member.text}`) ?? keptNameByForm.get(`${member.tag}|${member.text}`)?.name_id ?? null;
      if (!nameId) {
        const base = `name_${member.tag}_${identifierSlug(member, snapshot)}`;
        nameId = takenNameIds.has(base) ? `${base}_${hash4(member.text)}` : base;
      }
      takenNameIds.add(nameId);
      member.nameId = nameId;
    }

    // Forms and sets.
    const groups = new Map();
    for (const member of kept) {
      const sources = [...member.evidence].map(title => (snapshot.pages[title] ? pageSource(title, snapshot.pages[title], snapshot) : null)).filter(Boolean);
      member.sourceRefs = [...new Set(sources)].sort(compareText);
      const template = member.own?.template;
      const usage = /rare/i.test(template?.usage ?? '') ? 'rare' : /(historical|archaic|obsolete|dated)/i.test(template?.usage ?? '') ? 'historical' : 'unknown';
      const notes = [];
      if (member.flag === 'table_only_no_own_entry') notes.push(`Listed in the pinned ${root.title} translation table; the form's own entry has no given-name sense in this language, so only the root entry supports it.`);
      if (member.flag === 'leading_portion_listed_only') notes.push(`Listed in the pinned ${root.title} translation table, but the spelling is only the first letters of ${root.title} and no pinned entry says whether it is a full or a short form.`);
      const baseMember = member.base ? byKey.get(member.base) : null;
      if (member.movedTo) notes.push(`Placed with the identical spelling ${member.movedTo.text} (${member.movedTo.code}) so that this spelling resolves to one equivalence set; evidence for this language: the ${root.title} translation table or its own entry.`);
      if (member.relation === 'diminutive' && baseMember) notes.push(`Own pinned entry: diminutive of ${baseMember.text}.`);
      if (member.relation === 'short_form' && baseMember) notes.push(`Own pinned entry: equivalent to the short form ${baseMember.text}.`);
      if (member.relation === 'spelling_variant' && baseMember) notes.push(`Own pinned entry: variant of ${baseMember.text}.`);
      if (member.relation === 'borrowed_adaptation' || member.relation === 'transliteration') notes.push(`Own pinned entry: from ${template.from}.`);
      member.form = {
        form_id: member.formId, text: member.text, language_tag: member.tag, script: member.script ?? undefined,
        relation_type: member.relation, usage, name_id: member.nameId, source_refs: member.sourceRefs,
        ...(notes.length ? { note: notes.join(' ') } : {}), review_state: 'candidate',
      };
      if (!groups.has(member.setKey)) groups.set(member.setKey, []);
      groups.get(member.setKey).push(member);
    }
    const equivalenceSets = [];
    for (const key of SET_ORDER) {
      const members = groups.get(key);
      if (!members) continue;
      const setId = `NFEQ.${slug}.${key === 'listed-other' ? 'table-listed' : key}`;
      members.sort((a, b) => (b.relation === 'source_form') - (a.relation === 'source_form') || compareText(`${a.tag}|${a.text}`, `${b.tag}|${b.text}`));
      equivalenceSets.push({ equivalence_set_id: setId, role: SET_META[key][0], note: SET_META[key][1], forms: members.map(member => member.form) });
      members.forEach(member => { member.setId = setId; });
      // A mechanical default for the V2 graph, which needs one primary per (set, language, script) whenever there are several.
      const byRepresentation = new Map();
      for (const member of members) {
        const representation = new Intl.Locale(member.tag, member.script ? { script: member.script } : {}).toString();
        if (!byRepresentation.has(representation)) byRepresentation.set(representation, []);
        byRepresentation.get(representation).push(member);
      }
      for (const [representation, group] of byRepresentation) {
        if (group.length < 2) continue;
        const dependents = member => group.filter(other => other.base === keyOf(member.code, member.text)).length;
        const ranked = [...group].sort((a, b) => (b.relation === 'source_form') - (a.relation === 'source_form')
          || (b.via.includes('eq-root')) - (a.via.includes('eq-root')) || dependents(b) - dependents(a)
          || (a.tableIndex ?? Infinity) - (b.tableIndex ?? Infinity) || a.text.length - b.text.length || compareText(a.text, b.text));
        primaryMap[JSON.stringify([setId, representation])] = ranked[0].formId;
      }
    }

    const usedTitles = new Set(kept.flatMap(member => [...member.evidence]));
    newFamilies.set(`${slug}.json`, {
      schema_version: 1, family_id: familyId, family_key: `${slug}-family`,
      origin_note: `Candidate family generated by scripts/name-pipeline from the pinned English Wiktionary entry ${root.title} and the entries that point to it. Every form is justified by that entry's translation table or by a {{given name}} parameter (eq=, dimof=, varof=) on the form's own pinned entry; a similar spelling alone never adds a form.`,
      meaning_note: 'Do not collapse local full-name equivalents, borrowed spellings, transliterations, or short/pet forms. Character localization and user-name localization require their own policy/consent layer. This family says what the pinned sources list; it is not a promise that every bearer shares one name meaning.',
      equivalence_sets: equivalenceSets,
      localization_policy: POLICY,
      source_refs: [...new Set([...usedTitles].map(title => (snapshot.pages[title] ? pageSource(title, snapshot.pages[title], snapshot) : null)).filter(Boolean))].sort(compareText),
      review_state: 'candidate',
    });
    familyIdsInOrder.push(familyId);

    for (const member of kept) {
      const record = nameContribution.get(member.nameId) ?? { member, refs: [], sources: new Set(), relations: [], etymology: [], snapshot, rootTitle: root.title };
      record.refs.push({ family_id: familyId, equivalence_set_id: member.setId, form_id: member.formId });
      member.sourceRefs.forEach(id => record.sources.add(id));
      const baseMember = member.base ? byKey.get(member.base) : null;
      if (baseMember && baseMember.tag === member.tag && (member.relation === 'diminutive' || member.relation === 'spelling_variant')) {
        record.relations.push({
          target_name_id: baseMember.nameId, relation_type: member.relation === 'diminutive' ? 'diminutive' : 'variant_family',
          note: `Per the pinned entry; the reverse relationship is not implied.`,
        });
      }
      const template = member.own?.template;
      if (template) {
        const genders = template.genders.map(gender => GENDER_WORD[gender] ?? gender).join(' and ') || 'given';
        record.etymology.push(`Candidate: the pinned English Wiktionary entry defines ${member.own.section} ${member.text} as a ${genders} given name${member.relation === 'diminutive' && baseMember ? ` that is a diminutive of ${baseMember.text}` : member.via.includes('eq-root') ? ` equivalent to ${root.title}` : ''}.`);
      } else {
        record.etymology.push(`Candidate: the pinned ${root.title} translation table lists ${member.text} as the ${member.tag}-language form; the form has no entry with a given-name sense in that language.`);
      }
      nameContribution.set(member.nameId, record);
    }

    report.families.push({
      family_id: familyId, root: root.title, forms: kept.length,
      languages: [...new Set(kept.map(member => member.tag))].sort(compareText),
      full_forms: kept.filter(member => member.set === 'full').length,
      short_forms: kept.filter(member => member.set === 'short').length,
      listed_only: kept.filter(member => member.set === 'listed').length,
      table_only_no_own_entry: kept.filter(member => member.flag === 'table_only_no_own_entry').length,
      excluded: excluded.sort((a, b) => compareText(`${a.code}|${a.text}`, `${b.code}|${b.text}`)),
    });
  }

  // ---- names ----
  const generatedIds = [];
  for (const [nameId, record] of [...nameContribution].sort((a, b) => compareText(a[0], b[0]))) {
    const member = record.member;
    const file = nameFiles.get(member.tag) ?? { file: join(namesRoot, member.tag, 'names.json'), data: { schema_version: 1, language_code: member.tag, names: [] }, changed: true };
    nameFiles.set(member.tag, file);
    file.changed = true;
    const existing = file.data.names.find(name => name.name_id === nameId);
    const refs = [...record.refs].sort((a, b) => compareText(a.form_id, b.form_id));
    if (existing) {
      existing.family_refs = [...(existing.family_refs ?? []), ...refs];
      existing.source_refs = [...new Set([...(existing.source_refs ?? []), ...record.sources])].sort(compareText);
      continue;
    }
    generatedIds.push(nameId);
    const relations = record.relations.filter((relation, index, all) => all.findIndex(other => other.target_name_id === relation.target_name_id && other.relation_type === relation.relation_type) === index);
    file.data.names.push({
      name_id: nameId, canonical_form: member.text, name_type: 'given',
      spellings: [member.text, ...(member.aliases ?? [])].map((text, index) => ({ text, status: index === 0 ? 'canonical' : 'variant',
        ...(member.script ? { script: member.script } : {}), locale: member.tag })),
      family_refs: refs, related_names: relations, gender_usage: [],
      etymology_note: [...new Set(record.etymology)].join(' '),
      source_refs: [...record.sources].sort(compareText), review_state: 'candidate',
    });
  }
  // Records the pipeline owns sort after hand-authored ones, by id.
  for (const file of nameFiles.values()) {
    if (!file.changed) continue;
    const owned = new Set(generatedIds);
    const plain = file.data.names.filter(name => !owned.has(name.name_id));
    const made = file.data.names.filter(name => owned.has(name.name_id)).sort((a, b) => compareText(a.name_id, b.name_id));
    file.data.names = [...plain, ...made];
  }

  // ---- compose outputs ----
  const files = new Map();
  for (const [name, document] of newFamilies) files.set(join(familyDir, name), document);
  for (const { file, data, changed } of nameFiles.values()) if (changed) files.set(file, data);

  const referenced = new Set();
  for (const document of [...familyFiles.values(), ...newFamilies.values()]) for (const id of document.source_refs ?? []) referenced.add(id);
  for (const family of [...familyFiles.values(), ...newFamilies.values()]) for (const set of family.equivalence_sets) for (const form of set.forms) for (const id of form.source_refs ?? []) referenced.add(id);
  for (const { data } of nameFiles.values()) for (const name of data.names) { for (const id of name.source_refs ?? []) referenced.add(id); for (const usage of name.gender_usage ?? []) referenced.add(usage.source_id); }
  const keptSources = bibliography.sources.filter(source => source.external_ids?.pipeline !== MARKER || referenced.has(source.source_id));
  const added = [...newSources.values()].filter(source => referenced.has(source.source_id)).sort((a, b) => compareText(a.source_id, b.source_id));
  files.set(bibliographyPath, { ...bibliography, sources: [...keptSources.filter(source => !newSources.has(source.source_id)), ...added] });

  const indexPath = join(repoRoot, 'lexi', 'name-family-index.json');
  const index = readJson(indexPath);
  const finalFamilies = new Map([...familyFiles]);
  for (const [name, document] of newFamilies) finalFamilies.set(name, document);
  files.set(indexPath, { ...index, families: [...finalFamilies].sort((a, b) => compareText(a[0], b[0])).map(([path, document]) => ({ family_id: document.family_id, path, review_state: document.review_state })) });

  // Families the pipeline does not own still need a primary wherever a set holds several forms of one language and script.
  for (const [, document] of familyFiles) {
    if (ownedFamilyIds.has(document.family_id)) continue;
    for (const set of document.equivalence_sets) {
      const byRepresentation = new Map();
      for (const form of set.forms.filter(item => !['rejected', 'superseded'].includes(item.review_state))) {
        const script = form.script ?? new Intl.Locale(form.language_tag).maximize().script;
        const representation = new Intl.Locale(form.language_tag, { script }).toString();
        if (!byRepresentation.has(representation)) byRepresentation.set(representation, []);
        byRepresentation.get(representation).push(form);
      }
      for (const [representation, group] of byRepresentation) {
        if (group.length < 2 || group.filter(form => form.usage === 'preferred').length === 1 || group.filter(form => form.relation_type === 'source_form').length === 1) continue;
        const ranked = [...group].sort((a, b) => a.text.length - b.text.length || compareText(a.text, b.text));
        primaryMap[JSON.stringify([set.equivalence_set_id, representation])] = ranked[0].form_id;
      }
    }
  }
  const sortedPrimary = Object.fromEntries(Object.entries(primaryMap).sort((a, b) => compareText(a[0], b[0])));
  files.set(join(pipelineDir, 'primary-map.json'), sortedPrimary);
  files.set(manifestPath, { purpose: 'Name records the pipeline created. build.mjs regenerates exactly these and never edits any other record except to add a family ref.', name_ids: [...new Set([...manifest].filter(id => nameContribution.has(id)).concat(generatedIds))].sort(compareText) });
  report.families.sort((a, b) => compareText(a.family_id, b.family_id));
  files.set(join(pipelineDir, 'build-report.json'), report);
  return { files, report };
}

const stringify = value => `${JSON.stringify(value, null, 2)}\n`;

export function applyPlan(plan) {
  const changed = [];
  for (const [path, value] of plan.files) {
    const next = stringify(value);
    if (existsSync(path) && readFileSync(path, 'utf8') === next) continue;
    changed.push(path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, next);
  }
  return changed;
}

export function changedByPlan(plan) {
  return [...plan.files].filter(([path, value]) => !existsSync(path) || readFileSync(path, 'utf8') !== stringify(value)).map(([path]) => path);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const plan = planBuild();
  if (check) {
    const changed = changedByPlan(plan);
    if (changed.length) { console.error(`name pipeline output differs from the repository (${changed.length} files):\n${changed.join('\n')}`); process.exit(1); }
    console.log('name pipeline output matches the repository');
  } else {
    const changed = applyPlan(plan);
    const families = plan.report.families;
    console.log(`${families.length} families (${families.reduce((sum, family) => sum + family.forms, 0)} forms), ${plan.report.skipped.length} skipped, ${changed.length} files written`);
    for (const skipped of plan.report.skipped) console.log(`skipped ${skipped.root}: ${skipped.reason}`);
  }
}
