#!/usr/bin/env node
/** Mirror the owning Content temporal validator verbatim, with schema embedded for pure consumers. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);const check=args.includes('--check');const index=args.indexOf('--source');
const source=index<0?resolve(root,'../gef-content'):resolve(args[index+1]);
const schemaBytes=readFileSync(resolve(source,'schemas/bibliographic-metadata.schema.json'));
const moduleBytes=readFileSync(resolve(source,'scripts/lib/bibliographic-metadata.mjs'));
const schema=JSON.parse(schemaBytes.toString('utf8'));
const prefix="import fs from 'node:fs';\n// Exact bundled mirror of Clickabl/gef-content/schemas/bibliographic-metadata.schema.json.\nexport const bibliographySchema = JSON.parse(fs.readFileSync(new URL('../../schemas/bibliographic-metadata.schema.json', import.meta.url), 'utf8'));\n";
const moduleText=moduleBytes.toString('utf8');if(!moduleText.startsWith(prefix)||!moduleText.includes('export function validateBibliographicDateFact(')||!moduleText.includes('export function validateBibliographicLifespan('))throw new Error('entity_temporal_owner_contract_missing');
const sha=value=>createHash('sha256').update(value).digest('hex');
const generated=`/** Generated from gef-content canonical bibliography; do not edit. */\nexport const TEMPORAL_SOURCE_HASHES = ${JSON.stringify({schema:sha(schemaBytes),validator:sha(moduleBytes)})};\nexport const bibliographySchema = ${JSON.stringify(schema)};\n${moduleText.slice(prefix.length)}`;
const output=resolve(root,'packages/entity-registry-v1/bibliographicContract.mjs');
const registryPath=resolve(root,'schemas/entity-registry.schema.json');const registry=JSON.parse(readFileSync(registryPath,'utf8'));registry.definitions=schema.definitions;
const nextSchema=JSON.stringify(registry,null,2)+'\n';
if(check){if(readFileSync(output,'utf8')!==generated||readFileSync(registryPath,'utf8')!==nextSchema)throw new Error('entity_temporal_mirror_drift');}
else{mkdirSync(dirname(output),{recursive:true});writeFileSync(output,generated);writeFileSync(registryPath,nextSchema);}
console.log(JSON.stringify({status:check?'exact-owner-contract':'synchronized-owner-contract',source,hashes:{schema:sha(schemaBytes),validator:sha(moduleBytes)}}));
