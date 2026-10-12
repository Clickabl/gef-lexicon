#!/usr/bin/env node
/**
 * Portuguese: first names counted by the 2010 Census of Brazil (IBGE "Nomes no Brasil" API).
 * The API returns only the top 20 of any one ranking, so candidates are the union of the top 20 nationally, in every state, every decade of birth and every decade within every state, per sex; each candidate's census total is then read from the API itself and the top 100 are ranked.
 * A name that is in the national top 100 but in no top 20 anywhere would be missed; the artifact says so.
 */
import { getJson, titleCase, top, today, writeArtifact } from './lib.mjs';

const BASE = 'https://servicodados.ibge.gov.br/api/v2/censos/nomes';
const STATES = [11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 35, 41, 42, 43, 50, 51, 52, 53];
const DECADES = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000];
const result = {};
for (const sex of ['M', 'F']) {
  const names = new Set();
  const take = async query => { for (const entry of await getJson(`${BASE}/ranking?${query}&sexo=${sex}&qtd=20`)) for (const row of entry.res) names.add(row.nome); };
  await take('');
  for (const state of STATES) await take(`localidade=${state}`);
  for (const decade of DECADES) {
    await take(`decada=${decade}`);
    for (const state of STATES) await take(`decada=${decade}&localidade=${state}`);
  }
  const counts = new Map();
  const list = [...names].sort();
  for (let at = 0; at < list.length; at += 10) {
    for (const entry of await getJson(`${BASE}/${list.slice(at, at + 10).map(encodeURIComponent).join('|')}?sexo=${sex}`)) {
      counts.set(titleCase(entry.nome), entry.res.reduce((sum, row) => sum + row.frequencia, 0));
    }
  }
  result[sex] = { top: top(counts, 100), candidates: list.length };
}
writeArtifact('pt-BR-ibge.json', {
  language: 'pt', country: 'BR', publisher: 'IBGE (Instituto Brasileiro de Geografia e Estatística)',
  title: 'Censo Demográfico 2010: Nomes no Brasil', url: `${BASE}/ranking and ${BASE}/{name} (API of https://censo2010.ibge.gov.br/nomes/)`,
  license: 'IBGE open data (public statistics); no separate licence stated by the API', retrieved: today(),
  period: 'people alive at the 2010 Census, all birth decades',
  measure: 'Residents of Brazil with that first name as first name at the 2010 Census, by sex, summed over all birth decades the API reports.',
  chosen_because: 'The only national Brazilian first-name counts IBGE publishes; Portugal is not covered by this file.',
  male: result.M.top, female: result.F.top,
  notes: `Names are printed by IBGE in capitals without accents (JOAO, not João); they are shown in Title Case and need an accent-restoring match before use. Candidates came from the union of top-20 rankings (national, 27 states, 8 decades, and each decade within each state): ${result.M.candidates} male and ${result.F.candidates} female names; a name that sits in the national top 100 but in no top 20 anywhere would be missing. Counts are people, not births; a name used by both sexes is counted per sex.`,
});
console.log('ok');
