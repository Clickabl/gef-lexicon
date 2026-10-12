#!/usr/bin/env node
/**
 * Name pipeline, step 1: capture. The only step that touches the network.
 *
 * For each root name in research/name-pipeline/roots.json it reads the English Wiktionary entry, finds the entries
 * that say they are equivalent to it (`eq=`) or a diminutive/variant of it or of one of its members, and stores a compact
 * snapshot of exactly what those pinned revisions say in research/name-pipeline/snapshots/. The build step reads
 * only snapshots, so re-running it is deterministic and never calls a model or the network.
 *
 *   node scripts/name-pipeline/fetch.mjs [--only Timothy,Henry] [--delay 120] [--refresh-language-filter ../gef-expo/registry/language-support.json]
 *
 * A page that already has a pinned revision in sources/bibliography.json is fetched at that revision, so existing
 * source ids stay valid. Any other page is captured at its current revision and pinned by the build step.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIPELINE_DIR, REPO_ROOT, SNAPSHOT_DIR, asciiSlug, maybeJson, readJson, sha256, sleep, writeJson, compareText } from './common.mjs';
import { givenNameTranslations, givenNameTemplates, languageSections, titleOf } from './wikitext.mjs';

const API = 'https://en.wiktionary.org/w/api.php';
const USER_AGENT = 'gef-lexicon-name-pipeline/1.0 (https://github.com/Clickabl/gef-lexicon; tech@clickabl.co)';

const argv = process.argv.slice(2);
const option = name => { const at = argv.indexOf(name); return at < 0 ? null : argv[at + 1]; };
const DELAY = Number(option('--delay') ?? 120);
const ONLY = option('--only')?.split(',').map(value => value.trim()).filter(Boolean) ?? null;

let lastCall = 0;
async function api(params, attempt = 0) {
  const wait = lastCall + DELAY - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.status === 429 || response.status >= 500) throw new Error(`http_${response.status}`);
    const body = await response.json();
    if (body.error?.code === 'maxlag') throw new Error('maxlag');
    if (body.error) throw new Error(`${body.error.code}: ${body.error.info}`);
    return body;
  } catch (error) {
    if (attempt >= 5) throw error;
    await sleep(1500 * 2 ** attempt);
    return api(params, attempt + 1);
  }
}

const chunk = (values, size) => Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, i * size + size));

async function search(query) {
  const titles = [];
  let offset = 0;
  for (let round = 0; round < 10; round += 1) {
    const body = await api({ action: 'query', list: 'search', srsearch: query, srnamespace: '0', srlimit: '100', srprop: '', sroffset: String(offset) });
    titles.push(...body.query.search.map(hit => hit.title));
    if (body.continue?.sroffset === undefined) break;
    offset = body.continue.sroffset;
  }
  return titles;
}

const searchTerm = (field, title) => `insource:"${field}=${title.replaceAll('"', '')}"`;

function readPins() {
  const pins = new Map();
  const bibliography = readJson(join(REPO_ROOT, 'sources', 'bibliography.json'));
  for (const source of bibliography.sources) {
    const page = source.external_ids?.wiktionary_page, revision = source.external_ids?.wiktionary_revision;
    if (!page || !revision || source.source_type !== 'website' || !source.url?.startsWith('https://en.wiktionary.org/')) continue;
    pins.set(page, Math.max(pins.get(page) ?? 0, Number(revision)));
  }
  return pins;
}

/** Compact record of one page: only what the build step reads, plus the revision and a hash of the full wikitext. */
function summarize(title, revision, content) {
  const sections = [];
  for (const section of languageSections(content)) {
    const templates = givenNameTemplates(section.body);
    if (templates.length) sections.push({ heading: section.heading, given_names: templates });
  }
  return { revid: revision.revid, timestamp: revision.timestamp, sha256: sha256(content), sections };
}

async function fetchPages(titles, pins, into) {
  const need = [...new Set(titles)].filter(title => !into[title]).sort(compareText);
  const pinned = need.filter(title => pins.has(title)), current = need.filter(title => !pins.has(title));
  const handle = (page) => {
    const revision = page.revisions?.[0];
    if (page.missing || !revision) return;
    into[page.title] = { ...summarize(page.title, revision, revision.slots.main.content), content: revision.slots.main.content };
  };
  for (const batch of chunk(current, 50)) {
    const body = await api({ action: 'query', prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main', titles: batch.join('|') });
    body.query.pages.forEach(handle);
  }
  for (const batch of chunk(pinned, 50)) {
    const body = await api({ action: 'query', prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main', revids: batch.map(title => pins.get(title)).join('|') });
    body.query.pages.forEach(handle);
    // A pinned revision that moved pages (a rename) falls back to the title's current revision.
    for (const title of batch) if (!into[title]) await fetchPages([title], new Map(), into);
  }
}

async function romanize(items) {
  const out = {};
  for (const batch of chunk(items, 20)) {
    const text = batch.map(({ code, text: value }) => `{{xlit|${code}|${value}}}`).join('¦');
    const body = await api({ action: 'expandtemplates', prop: 'wikitext', text });
    const parts = body.expandtemplates.wikitext.split('¦');
    batch.forEach(({ code, text: value }, index) => {
      const romanized = (parts[index] ?? '').trim();
      if (romanized && !romanized.includes('<') && !romanized.includes('{{') && romanized !== value) out[`${code}|${value}`] = romanized;
    });
  }
  return out;
}

function refreshLanguageFilter(registryPath) {
  const registry = readJson(registryPath);
  const include = [...new Set(Object.values(registry.lessonTiers).flat())].sort(compareText);
  writeJson(join(PIPELINE_DIR, 'language-filter.json'), {
    purpose: 'Which Wiktionary language codes the name pipeline keeps. A filter, not a statement of product support: the product registry stays the only authority for support.',
    derived_from: 'Clickabl/gef-expo registry/language-support.json lessonTiers',
    registry_last_reviewed: registry.lastReviewed,
    include_codes: [...new Set([...include, 'cmn'])].sort(compareText),
    code_map: { cmn: 'zh' },
    note_unmapped: 'Wiktionary uses cmn for Mandarin, which the registry names zh. Other Wiktionary codes with no registry counterpart (no, tl, la, grc, and the like) are not kept.',
  });
}

async function captureRoot(root, filter, pins) {
  const allowed = new Set(filter.include_codes);
  const pages = {};
  await fetchPages([root.title], pins, pages);
  const rootPage = pages[root.title];
  if (!rootPage) throw new Error(`root page missing: ${root.title}`);
  const english = languageSections(rootPage.content).find(section => section.heading === 'English');
  const tableRows = english ? givenNameTranslations(english.body).filter(row => allowed.has(row.code)) : [];

  const hits = { eq: await search(searchTerm('eq', root.title)), dimof: await search(searchTerm('dimof', root.title)) };
  const level1 = [...new Set([...tableRows.map(row => titleOf(row.text)), ...hits.eq, ...hits.dimof])];
  await fetchPages(level1, pins, pages);

  // Second hop: diminutives and variants of the members found so far (Tim -> Timmy).
  const members = Object.keys(pages).filter(title => title !== root.title
    && pages[title].sections.some(section => section.given_names.some(name => allowed.has(name.code))));
  const level2 = { dimof: [], varof: [] };
  for (const field of ['dimof', 'varof']) {
    for (const batch of chunk(members.sort(compareText), 10)) level2[field].push(...await search(batch.map(title => searchTerm(field, title)).join(' OR ')));
    level2[field] = [...new Set(level2[field])].sort(compareText);
  }
  await fetchPages([...level2.dimof, ...level2.varof], pins, pages);

  // Romanizations are used only to build ASCII identifiers; a form's own xlit= parameter takes precedence at build time.
  const wanted = new Map();
  for (const row of tableRows) if (/[^\p{Script=Latin}\p{N}\p{P}\p{Z}]/u.test(row.text)) wanted.set(`${row.code}|${row.text}`, { code: row.code, text: row.text });
  for (const title of Object.keys(pages)) for (const section of pages[title].sections) for (const name of section.given_names) {
    if (allowed.has(name.code) && /[^\p{Script=Latin}\p{N}\p{P}\p{Z}]/u.test(title)) wanted.set(`${name.code}|${title}`, { code: name.code, text: title });
  }
  const romanizations = await romanize([...wanted.values()].sort((a, b) => compareText(`${a.code}|${a.text}`, `${b.code}|${b.text}`)));

  const snapshot = {
    snapshot_version: 1,
    root: root.title,
    retrieved_at: new Date().toISOString().slice(0, 10),
    api: API,
    language_filter_reviewed: filter.registry_last_reviewed,
    root_table_rows: tableRows,
    search_hits: { eq: [...new Set(hits.eq)].sort(compareText), dimof: [...new Set(hits.dimof)].sort(compareText), second_hop_dimof: level2.dimof, second_hop_varof: level2.varof },
    romanizations,
    pages: Object.fromEntries(Object.keys(pages).sort(compareText).map(title => {
      const { content, ...summary } = pages[title];
      return [title, summary];
    })),
  };
  writeJson(join(SNAPSHOT_DIR, `${asciiSlug(root.title)}.json`), snapshot);
  return { pages: Object.keys(pages).length, tableRows: tableRows.length, eq: hits.eq.length };
}

const registryArg = option('--refresh-language-filter');
if (registryArg) refreshLanguageFilter(registryArg);
const filter = readJson(join(PIPELINE_DIR, 'language-filter.json'));
const roots = readJson(join(PIPELINE_DIR, 'roots.json')).roots.filter(root => !ONLY || ONLY.includes(root.title));
const pins = readPins();
for (const root of roots) {
  const started = Date.now();
  const summary = await captureRoot(root, filter, pins);
  console.log(`${root.title}: ${summary.pages} pages, ${summary.tableRows} table rows, ${summary.eq} eq hits (${Math.round((Date.now() - started) / 1000)}s)`);
}
