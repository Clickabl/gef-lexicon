#!/usr/bin/env node
/**
 * Name pipeline, step 0: turn the captured frequency lists into roots. Uses the network (English Wiktionary API).
 *
 * Every name in research/name-frequency/*.json is looked up as a given-name entry in its own language. When that entry's
 * {{given name}} says it is equivalent (eq=) to an English name, that English name is the root of its family; an English
 * name that is itself a diminutive or variant (dimof=/varof=) climbs to the name it comes from. A name whose entry says nothing
 * about an English equivalent, or that has no entry, is recorded as unresolved with the reason; nothing is guessed from spelling.
 * Frequency sources that print names without accents (Spain, Brazil, Italy) are matched to the accented entry through the
 * wiki's accent-folding search, and only when exactly one given-name entry in that language folds to the same letters.
 *
 *   node scripts/name-pipeline/resolve-seeds.mjs        writes research/name-pipeline/seeds.json and roots.json
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PIPELINE_DIR, REPO_ROOT, asciiSlug, compareText, readJson, sleep, writeJson } from './common.mjs';
import { givenNameTemplates, givenNameTranslations, languageSections, titleOf } from './wikitext.mjs';

const API = 'https://en.wiktionary.org/w/api.php';
const USER_AGENT = 'gef-lexicon-name-pipeline/1.0 (https://github.com/Clickabl/gef-lexicon; tech@clickabl.co)';
const LANGUAGE_NAME = { en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', el: 'Greek' };
const SECTION = LANGUAGE_NAME;
const FREQUENCY_DIR = join(REPO_ROOT, 'research', 'name-frequency');

let lastCall = 0;
async function api(params, attempt = 0) {
  const wait = lastCall + 110 - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  try {
    const response = await fetch(`${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`, { headers: { 'User-Agent': USER_AGENT } });
    if (response.status === 429 || response.status >= 500) throw new Error(`http_${response.status}`);
    const body = await response.json();
    if (body.error) throw new Error(body.error.code);
    return body;
  } catch (error) {
    if (attempt >= 5) throw error;
    await sleep(1500 * 2 ** attempt);
    return api(params, attempt + 1);
  }
}

const pageCache = new Map();
async function pages(titles) {
  const need = [...new Set(titles)].filter(title => !pageCache.has(title));
  for (let at = 0; at < need.length; at += 50) {
    const batch = need.slice(at, at + 50);
    const body = await api({ action: 'query', prop: 'revisions', rvprop: 'ids|content', rvslots: 'main', titles: batch.join('|') });
    const found = new Map(body.query.pages.map(page => [page.title, page]));
    const normalized = new Map((body.query.normalized ?? []).map(item => [item.from, item.to]));
    for (const title of batch) {
      const page = found.get(normalized.get(title) ?? title);
      const content = page && !page.missing ? page.revisions?.[0]?.slots.main.content : null;
      const sections = new Map();
      if (content) for (const section of languageSections(content)) {
        const templates = givenNameTemplates(section.body);
        if (templates.length) sections.set(section.heading, templates);
      }
      const english = content ? languageSections(content).find(section => section.heading === 'English') : null;
      pageCache.set(title, { exists: Boolean(content), sections, table: english ? givenNameTranslations(english.body) : [] });
    }
  }
}
const templateFor = (title, code) => {
  const entry = pageCache.get(title);
  if (!entry?.exists) return null;
  return entry.sections.get(SECTION[code])?.find(template => template.code === code) ?? null;
};

const fold = text => text.normalize('NFD').replace(/\p{M}+/gu, '').replace(/['’]/g, '').toLowerCase();

async function foldedMatches(name, code) {
  const stem = name.replace(/['’]/g, '');
  const body = await api({ action: 'query', list: 'search', srnamespace: '0', srlimit: '20', srprop: '', srsearch: `intitle:${stem} incategory:"${LANGUAGE_NAME[code]} given names"` });
  return body.query.search.map(hit => hit.title).filter(title => fold(title) === fold(name));
}

const titleCaseFromSource = text => text.replace(/(^|[\s-])(\p{L})/gu, (_, sep, letter) => `${sep}${letter.toLocaleUpperCase('und')}`);

/** The English root for an English name: climb through dimof/varof when the entry says the name comes from another. */
async function climb(title, hops = 0) {
  await pages([title]);
  const template = templateFor(title, 'en');
  if (!template) return { root: null, reason: 'no_english_given_name_entry', via: [] };
  const parent = [...template.dimof, ...template.varof].find(target => !target.language || target.language === 'en');
  if (parent && hops < 2) {
    await pages([parent.text]);
    if (templateFor(parent.text, 'en')) { const up = await climb(parent.text, hops + 1); return { ...up, via: [title, ...up.via] }; }
  }
  return { root: title, reason: null, via: [] };
}

/**
 * Second route to a root: English given-name entries whose own translation table lists this exact entry. Used when the entry
 * itself states no English equivalent. Several different roots after climbing means the table evidence is ambiguous: no root.
 */
async function reverseRoot(code, title) {
  const body = await api({ action: 'query', list: 'search', srnamespace: '0', srlimit: '20', srprop: '', srsearch: `insource:"${code}|${title.replaceAll('"', '')}" incategory:"English given names"` });
  const candidates = body.query.search.map(hit => hit.title);
  await pages(candidates);
  const listed = candidates.filter(candidate => pageCache.get(candidate)?.table.some(row => row.code === code && titleOf(row.text) === title));
  const roots = new Map();
  for (const candidate of listed) { const up = await climb(candidate); if (up.root) roots.set(up.root, [candidate, ...up.via]); }
  if (roots.size === 1) { const [[root, via]] = [...roots]; return { root, via: via.filter(value => value !== root), reason: null }; }
  return { root: null, reason: roots.size ? `table_lists_several_roots:${[...roots.keys()].sort(compareText).join('/')}` : 'no_english_table_lists_it' };
}

const artifacts = readdirSync(FREQUENCY_DIR).filter(name => name.endsWith('.json')).sort(compareText).map(name => ({ file: name, ...readJson(join(FREQUENCY_DIR, name)) }));
const seeds = [];
for (const artifact of artifacts) {
  const code = artifact.language;
  for (const sex of ['male', 'female']) {
    const entries = artifact[sex];
    // First pass: exact titles in one batch.
    const exact = entries.map(entry => titleCaseFromSource(entry.name));
    await pages(exact);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const seed = { language: code, sex, rank: entry.rank, source: artifact.file, name: entry.name, title: null, root: null, status: 'unresolved', reason: null };
      let title = exact[index];
      let template = templateFor(title, code);
      if (!template || /['’]$/.test(entry.name)) {
        const candidates = await foldedMatches(entry.name, code);
        await pages(candidates);
        const withEntry = candidates.filter(candidate => templateFor(candidate, code));
        const asciiExact = withEntry.find(candidate => candidate === title);
        if (asciiExact) { title = asciiExact; template = templateFor(title, code); }
        else if (withEntry.length === 1) { title = withEntry[0]; template = templateFor(title, code); }
        else {
          seed.reason = withEntry.length ? 'several_accented_entries' : 'no_given_name_entry_in_language';
          if (!withEntry.length && code !== 'en' && !/['’]$/.test(entry.name)) {
            const reverse = await reverseRoot(code, exact[index]);
            if (reverse.root) { seed.title = exact[index]; seed.root = reverse.root; seed.status = 'resolved'; seed.route = 'english_translation_table'; seed.via = reverse.via.length ? reverse.via : undefined; seed.reason = null; }
          }
          seeds.push(seed); continue;
        }
      }
      seed.title = title;
      let rootName = null;
      if (code === 'en') {
        const up = await climb(title);
        if (up.root) { rootName = up.root; seed.via = up.via.length ? up.via : undefined; } else seed.reason = up.reason;
      } else {
        const target = template.eq.find(item => !item.language || item.language === 'en');
        if (!target) {
          const reverse = await reverseRoot(code, title);
          if (reverse.root) { rootName = reverse.root; seed.via = reverse.via.length ? reverse.via : undefined; seed.route = 'english_translation_table'; }
          else seed.reason = `entry_states_no_english_equivalent;${reverse.reason}`;
        }
        else {
          const up = await climb(target.text);
          if (up.root) { rootName = up.root; seed.via = [target.text, ...up.via].filter((value, at, all) => all.indexOf(value) === at && value !== up.root); if (!seed.via.length) seed.via = undefined; } else seed.reason = `equivalent_${target.text}:${up.reason}`;
        }
      }
      if (rootName) { seed.root = rootName; seed.status = 'resolved'; }
      seeds.push(seed);
    }
  }
  console.log(`${artifact.file}: ${seeds.filter(seed => seed.source === artifact.file && seed.status === 'resolved').length} of ${artifact.male.length + artifact.female.length} resolved`);
}
writeJson(join(PIPELINE_DIR, 'seeds.json'), { purpose: 'Frequency-list names and the English root each resolves to, with the reason when it does not. Written by resolve-seeds.mjs.', seeds });

// roots.json: the manually named roots stay; resolved roots are added alphabetically.
const rootsPath = join(PIPELINE_DIR, 'roots.json');
const current = readJson(rootsPath);
const manual = current.roots.filter(root => !root.from_seeds);
// Families that exist and are not the pipeline's (hand-authored) stay as they are: no root is fetched for them.
const ownedIds = new Set(current.roots.map(root => `NF.${asciiSlug(root.title)}`));
const handFamilies = new Set(readdirSync(join(REPO_ROOT, 'name-families')).filter(name => name.endsWith('.json'))
  .map(name => readJson(join(REPO_ROOT, 'name-families', name)).family_id).filter(id => !ownedIds.has(id)));
const manualTitles = new Set(manual.map(root => root.title));
const seedRoots = [...new Set(seeds.filter(seed => seed.status === 'resolved').map(seed => seed.root))].sort(compareText)
  .filter(title => !manualTitles.has(title) && !handFamilies.has(`NF.${asciiSlug(title)}`));
writeJson(rootsPath, { purpose: current.purpose, roots: [...manual, ...seedRoots.map(title => ({ title, from_seeds: true }))] });
console.log(`${seeds.filter(seed => seed.status === 'resolved').length} of ${seeds.length} names resolved to ${seedRoots.length + manual.length} roots`);
