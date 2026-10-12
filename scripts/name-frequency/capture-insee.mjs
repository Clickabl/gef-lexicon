#!/usr/bin/env node
/** French: births in France since 1900 by first name, from the INSEE "Fichier des prénoms" national file. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getBytes, titleCase, top, today, unzipTo, writeArtifact } from './lib.mjs';

const PAGE = 'https://www.insee.fr/fr/statistiques/8595130';
const URL = 'https://www.insee.fr/fr/statistiques/fichier/8595130/prenoms-2025-nat_csv.zip';
const archive = unzipTo(await getBytes(URL));
try {
  const file = readdirSync(archive.dir).find(name => /\.csv$/i.test(name));
  const lines = readFileSync(join(archive.dir, file), 'utf8').split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(';');
  const [sex, name, year, count] = ['sexe', 'prenom', 'periode', 'valeur'].map(key => header.indexOf(key));
  const byName = { 1: new Map(), 2: new Map() };
  let first = 9999, last = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(';');
    if (cells[name] === '_PRENOMS_RARES' || !/^[12]$/.test(cells[sex]) || !/^\d{4}$/.test(cells[year])) continue;
    first = Math.min(first, Number(cells[year])); last = Math.max(last, Number(cells[year]));
    byName[cells[sex]].set(cells[name], (byName[cells[sex]].get(cells[name]) ?? 0) + Number(cells[count]));
  }
  const present = counts => top([...counts].map(([key, value]) => [titleCase(key), value]), 100);
  writeArtifact('fr-FR-insee.json', {
    language: 'fr', country: 'FR', publisher: 'INSEE (Institut national de la statistique et des études économiques)',
    title: 'Fichier des prénoms (national file, births in France)', url: `${PAGE} (file: ${URL})`,
    license: 'Licence Ouverte / Open Licence (Etalab) per INSEE open data terms', retrieved: today(),
    period: `${first}-${last}`,
    measure: 'Births in France (metropolitan and overseas departments, excluding Mayotte before 2014) with that first name, summed over all years the file covers; INSEE groups very rare names as _PRENOMS_RARES, which are not ranked.',
    chosen_because: 'The complete national file, so no year range was picked to favour any name.',
    male: present(byName[1]), female: present(byName[2]),
    notes: 'INSEE prints names in capitals; they are shown here in Title Case (hyphen and apostrophe parts capitalised). Compound first names are separate entries as INSEE lists them. Counts are births since the first year, not living people.',
  });
  console.log('ok');
} finally { archive.cleanup(); }
