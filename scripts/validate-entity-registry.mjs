#!/usr/bin/env node
/** Read-only canonical entity boundary used by the synchronized Server writer. */
import { readFileSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEntityRegistry } from '../packages/entity-registry-v1/entityRegistry.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),options=new Map();
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i],value=process.argv[i+1];if(!['--registry','--bibliography'].includes(key)||!value||options.has(key))throw new Error('Use --registry path --bibliography path');options.set(key,value);}
const registry=JSON.parse(readFileSync(options.get('--registry')??resolve(root,'entities/index.json'),'utf8')),bibliography=JSON.parse(readFileSync(options.get('--bibliography')??resolve(root,'sources/bibliography.json'),'utf8'));
const value=validateEntityRegistry(registry,{bibliography});console.log(JSON.stringify({status:'valid',contract:value.contract,revision:value.revision,entities:value.entities.length,redirects:value.redirects.length}));
