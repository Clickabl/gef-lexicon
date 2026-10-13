#!/usr/bin/env node
/** Explicit immutable public build or read-only check; source IDs and review are never changed. */
import { readFileSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateEntityRegistry } from '../packages/entity-registry-v1/entityRegistry.mjs';
import { compileEntityRegistry } from '../packages/entity-registry-v1/compileEntityRegistry.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),options=new Map();let check=false;
for(let i=2;i<process.argv.length;i++){const key=process.argv[i];if(key==='--check'){if(check)throw new Error('Duplicate --check');check=true;continue;}const value=process.argv[++i];if(!['--registry','--bibliography','--output'].includes(key)||!value||options.has(key))throw new Error('Use --check or --output explicit-directory [--registry path] [--bibliography path]');options.set(key,value);}
if(!check&&!options.has('--output'))throw new Error('Entity publisher requires explicit --output');
const bytes=readFileSync(options.get('--registry')??resolve(root,'entities/index.json')),input=JSON.parse(bytes.toString('utf8')),bibliography=JSON.parse(readFileSync(options.get('--bibliography')??resolve(root,'sources/bibliography.json'),'utf8'));
validateEntityRegistry(input,{bibliography});if(check)console.log(JSON.stringify({status:'valid-not-written',revision:input.revision,entities:input.entities.length}));else console.log(JSON.stringify({status:'built-not-deployed',manifest:await compileEntityRegistry({input,bibliography,outputDirectory:options.get('--output'),sourceSha256:createHash('sha256').update(bytes).digest('hex')})},null,2));
