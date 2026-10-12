#!/usr/bin/env node
/** English: births registered in England and Wales, 1996-2025, from the ONS "Baby names in England and Wales" workbook. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getBytes, top, today, unzipTo, writeArtifact } from './lib.mjs';

const URL = 'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/babynamesinenglandandwalesfrom1996/1996to2025/babynames1996to2025.xlsx';
const decode = text => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

function rowsOf(dir, sheet, strings) {
  const xml = readFileSync(join(dir, 'xl', 'worksheets', `${sheet}.xml`), 'utf8');
  return [...xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)].map(row => {
    const cells = {};
    for (const cell of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const value = /<v>([^<]*)<\/v>/.exec(cell[3] ?? '')?.[1] ?? '';
      cells[cell[1]] = /t="s"/.test(cell[2]) && value !== '' ? strings[Number(value)] : value;
    }
    return cells;
  });
}

const archive = unzipTo(await getBytes(URL));
try {
  const shared = readFileSync(join(archive.dir, 'xl', 'sharedStrings.xml'), 'utf8');
  const strings = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(item => decode([...item[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(part => part[1]).join('')));
  const totals = sheet => {
    const rows = rowsOf(archive.dir, sheet, strings);
    const header = rows.find(row => row.A === 'Name');
    const countColumns = Object.entries(header).filter(([, label]) => /Count$/.test(label)).map(([column]) => column);
    const years = Object.entries(header).filter(([, label]) => /Count$/.test(label)).map(([, label]) => Number(label.slice(0, 4)));
    const counts = new Map();
    for (const row of rows.slice(rows.indexOf(header) + 1)) {
      if (!row.A) continue;
      const total = countColumns.reduce((sum, column) => sum + (/^\d+$/.test(row[column] ?? '') ? Number(row[column]) : 0), 0);
      if (total) counts.set(row.A, total);
    }
    return { counts, first: Math.min(...years), last: Math.max(...years) };
  };
  const girls = totals('sheet4'), boys = totals('sheet5');
  writeArtifact('en-GB-ons.json', {
    language: 'en', country: 'GB-ENG+WLS', publisher: 'Office for National Statistics (England and Wales)',
    title: 'Baby names in England and Wales: 1996 to 2025', url: URL,
    license: 'Open Government Licence v3.0 (ONS dataset terms)', retrieved: today(),
    period: `${boys.first}-${boys.last}`,
    measure: 'Live births registered in England and Wales with that exact given name as first name, summed over the years; the ONS publishes a count only where it is at least 3 in a year.',
    chosen_because: 'The ONS sums are the national statistics office source reachable without a licence; the US Social Security data is blocked to scripted downloads.',
    male: top(boys.counts, 100), female: top(girls.counts, 100),
    notes: 'Names are spelled exactly as the ONS prints them. Counts are births, not living people. England and Wales only; no US, Scottish or Irish data.',
  });
  console.log('ok');
} finally { archive.cleanup(); }
