/**
 * Pure wikitext readers for the name pipeline. Nothing here touches the network or the repository.
 * They read exactly what a pinned English Wiktionary revision says and nothing else.
 */

/**
 * An inline modifier opens with `<`, a lowercase key and a colon: `<tr:..>`, `<qq:..>`. Any other `<` is ordinary text,
 * such as the origin chain in `from=Latin < Ancient Greek < Hebrew`, and must not hide the parameters that follow it.
 */
const INLINE_MODIFIER_OPEN = /^<[a-z]+:/;

/** Split on a separator, ignoring separators inside {{ }}, [[ ]] and <key:...> (inline modifiers). */
export function splitTopLevel(text, separator = '|') {
  const parts = [];
  let braces = 0, brackets = 0, angles = 0, start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const pair = text.slice(i, i + 2);
    if (pair === '{{') { braces += 1; i += 1; continue; }
    if (pair === '}}') { braces = Math.max(0, braces - 1); i += 1; continue; }
    if (pair === '[[') { brackets += 1; i += 1; continue; }
    if (pair === ']]') { brackets = Math.max(0, brackets - 1); i += 1; continue; }
    const char = text[i];
    if (char === '<') { if (INLINE_MODIFIER_OPEN.test(text.slice(i, i + 16))) angles += 1; }
    else if (char === '>') angles = Math.max(0, angles - 1);
    else if (char === separator && !braces && !brackets && !angles) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Every top-level and nested template whose lowercased name is in `names`, in document order. */
export function findTemplates(text, names) {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  const found = [];
  const stack = [];
  for (let i = 0; i < text.length; i += 1) {
    const pair = text.slice(i, i + 2);
    if (pair === '{{') { stack.push(i); i += 1; }
    else if (pair === '}}' && stack.length) {
      const open = stack.pop();
      const body = text.slice(open + 2, i);
      const args = splitTopLevel(body);
      const name = args[0].trim().toLowerCase();
      if (wanted.has(name)) found.push({ name, args: args.slice(1), start: open, end: i + 2, raw: text.slice(open, i + 2) });
      i += 1;
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** Split template arguments into positional and named. A named key is a plain word before the first '='. */
export function parseArgs(args) {
  const positional = [];
  const named = {};
  for (const arg of args) {
    const match = /^\s*([A-Za-z][A-Za-z0-9_-]*)\s*=([\s\S]*)$/.exec(arg);
    if (match && !arg.trimStart().startsWith('http')) named[match[1]] = match[2].trim();
    else positional.push(arg.trim());
  }
  return { positional, named };
}

/** Parse "Name<tr:..><qq:..>" style list items used by {{given name}} (eq=, dimof=, varof=, xlit=). */
export function parseNameList(value) {
  if (!value) return [];
  return splitTopLevel(value, ',').map(item => item.trim()).filter(Boolean).map(item => {
    const modifiers = {};
    const text = item.replace(/<([a-z]+):([^>]*)>/g, (_, key, val) => { modifiers[key] = val; return ''; }).trim();
    const prefixed = /^([a-z]{2,3}(?:-[A-Za-z]+)?):(.+)$/.exec(text);
    const entry = prefixed ? { text: prefixed[2].trim(), language: prefixed[1] } : { text, language: null };
    return Object.keys(modifiers).length ? { ...entry, modifiers } : entry;
  }).filter(entry => entry.text);
}

/** Level-2 language sections of a page: [{ heading, body }]. Text before the first heading is dropped. */
export function languageSections(text) {
  const sections = [];
  const headings = [...text.matchAll(/^==([^=\n][^\n]*?)==[ \t]*$/gm)];
  headings.forEach((match, index) => {
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : text.length;
    sections.push({ heading: match[1].trim(), body: text.slice(bodyStart, bodyEnd) });
  });
  return sections;
}

const GIVEN_NAME_PARAMS = ['eq', 'dimof', 'dim', 'varof', 'var', 'xlit', 'from', 'usage', 'popular', 'origin', 'm', 'f', 'dimform', 'varform'];

/** Every {{given name|...}} template in a section body. */
export function givenNameTemplates(body) {
  return findTemplates(body, ['given name']).map(template => {
    const { positional, named } = parseArgs(template.args);
    const params = {};
    for (const key of GIVEN_NAME_PARAMS) if (named[key] !== undefined) params[key] = named[key];
    const genders = splitTopLevel(positional[1] ?? named.gender ?? '', ',')
      .map(value => value.replace(/<[^>]*>/g, '').trim()).filter(Boolean);
    return {
      code: positional[0] ?? '',
      genders,
      eq: parseNameList(named.eq),
      dimof: parseNameList(named.dimof ?? named.dim),
      varof: parseNameList(named.varof ?? named.var),
      xlit: parseNameList(named.xlit),
      from: named.from ?? null,
      usage: named.usage ?? null,
      popular: named.popular ?? null,
      raw: template.raw.length > 400 ? `${template.raw.slice(0, 400)}…` : template.raw,
    };
  });
}

/** Translation-table rows whose gloss names a given name: [{ gloss, genders, language, code, text, tr, gender_tags }]. */
export function givenNameTranslations(body) {
  const rows = [];
  const blocks = [...body.matchAll(/\{\{trans-top\|([^}|]*)[^}]*\}\}([\s\S]*?)\{\{trans-bottom\}\}/g)];
  for (const block of blocks) {
    const gloss = block[1].trim();
    if (!/given name/i.test(gloss)) continue;
    const genders = /^female/i.test(gloss) ? ['female'] : /^male/i.test(gloss) ? ['male'] : /^unisex/i.test(gloss) ? ['unisex'] : [];
    let language = '';
    for (const line of block[2].split('\n')) {
      const header = /^\*(:*)\s*([^:{]+):\s*(.*)$/.exec(line);
      if (!header) continue;
      const label = header[2].trim();
      if (!header[1]) language = label;
      for (const template of findTemplates(header[3], ['t', 't+', 'tt', 'tt+'])) {
        const { positional, named } = parseArgs(template.args);
        const code = positional[0];
        const text = (positional[1] ?? '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim();
        if (!code || !text) continue;
        rows.push({
          gloss, genders, language: header[1] ? `${language}: ${label}` : label, code, text,
          tr: named.tr ?? null,
          gender_tags: positional.slice(2).filter(value => /^[mfnc](-[sp])?$/.test(value)),
        });
      }
    }
  }
  return rows;
}

/**
 * The page title for a name as printed in a translation table. Wiktionary titles leave out the combining stress mark
 * printed in Cyrillic text (Тимофе́й is the page Тимофей); precomposed letters of every other script keep their accents.
 */
export function titleOf(text) {
  const composed = text.normalize('NFC');
  return /\p{Script=Cyrillic}/u.test(composed) ? composed.replace(/\u0301/g, '') : composed;
}
