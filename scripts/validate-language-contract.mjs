#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(readFileSync(join(root, 'contracts', 'gef-language-support.json'), 'utf8'));
const fail = (message) => {
  console.error(`language-contract: ${message}`);
  process.exitCode = 1;
};
const listDirs = (path) => existsSync(path)
  ? readdirSync(path).filter((name) => statSync(join(path, name)).isDirectory())
  : [];

if (contract.schemaVersion !== 1) fail(`expected contract schemaVersion 1, got ${contract.schemaVersion}`);
if (contract.canonicalSource !== 'Clickabl/gef-expo/registry/language-support.json') fail('canonicalSource must point to Gef Expo language support');
if (contract.canonicalSourceSchemaVersion !== 3) fail(`expected Expo language schema v3, got ${contract.canonicalSourceSchemaVersion}`);

const learnFrom = contract.learnFromLanguages ?? [];
const allowed = new Set(learnFrom);
if (learnFrom.length !== 104 || allowed.size !== 104) fail(`expected 104 unique learn-from identities, got ${allowed.size}`);
for (const id of allowed) {
  if (typeof id !== 'string' || !id || id.includes('-')) fail(`invalid language identity ${id}`);
}

const uiOnly = new Set(contract.activeUiOnlyProductLanguages ?? []);
for (const id of uiOnly) {
  if (allowed.has(id)) fail(`active UI-only identity ${id} must not be in learn-from contract`);
}
if (!uiOnly.has('chr') || !uiOnly.has('pirate')) fail('current active UI-only identities must include Cherokee and Pirate');

for (const rootName of ['languages', 'names']) {
  for (const language of listDirs(join(root, rootName))) {
    if (!allowed.has(language)) {
      fail(`${rootName}/${language} is not a canonical learn-from language identity`);
    }
    if (uiOnly.has(language)) fail(`${rootName}/${language} must not be authored for a UI-only product language`);
  }
}

if (!process.exitCode) {
  console.log(`language-contract: OK (104 allowed identities; ${listDirs(join(root, 'languages')).length} authored lexicon language trees)`);
}
