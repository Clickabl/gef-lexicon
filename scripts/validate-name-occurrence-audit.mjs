#!/usr/bin/env node
/** Validate an audit against an explicit Content checkout; never fetch or write. */
import { readFileSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { resolve, join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNameOccurrenceAudit } from './lib/name-occurrence-audit.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node scripts/validate-name-occurrence-audit.mjs <audit-json> <content-checkout>');
  process.exitCode = 1;
} else {
  try {
    const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
    const audit = readJson(resolve(args[0]));
    if (typeof audit.work_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(audit.work_id)) throw new Error('Unsafe work identity');
    const contentRoot = realpathSync(resolve(args[1]));
    const namesDir = join(root, 'names');
    const nameDocuments = readdirSync(namesDir).filter((n) => statSync(join(namesDir, n)).isDirectory())
      .flatMap((n) => readdirSync(join(namesDir, n)).filter((f) => f.endsWith('.json'))
        .map((f) => readJson(join(namesDir, n, f))));
    const familiesDir = join(root, 'name-families');
    const families = readdirSync(familiesDir).filter((f) => f.endsWith('.json')).map((f) => readJson(join(familiesDir, f)));
    const entitiesDir = join(root, 'works', audit.work_id, 'entities');
    const entityDocuments = readdirSync(entitiesDir).filter((f) => f.endsWith('.json')).map((f) => readJson(join(entitiesDir, f)));
    const result = validateNameOccurrenceAudit(audit, {
      nameDocuments, families, entityDocuments, sources: readJson(join(root, 'sources', 'bibliography.json')).sources,
      readEdition: (path) => {
        const full = realpathSync(resolve(contentRoot, path));
        if (!full.startsWith(`${contentRoot}${sep}`)) throw new Error('Edition path escapes Content checkout');
        return readFileSync(full);
      },
    });
    console.log(JSON.stringify({ audit_id: audit.audit_id, checks: 'passed', ...result }, null, 2));
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}
