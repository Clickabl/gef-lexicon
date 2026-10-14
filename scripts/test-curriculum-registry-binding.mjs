import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const canonical=process.env.GEF_LANGUAGE_SUPPORT_REGISTRY?path.resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY):path.resolve(root,'../gef-expo/registry/language-support.json');
function invoke(file){return spawnSync(process.execPath,['scripts/validate-curriculum-v2.mjs'],{cwd:root,env:{...process.env,GEF_LANGUAGE_SUPPORT_REGISTRY:file},encoding:'utf8'});}
test('actual curriculum CLI uses the explicit canonical tier input and never skips or falls back for invalid configured data',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gef-curriculum-registry-'));
 try{
  const file=path.join(dir,'primary.json'),source=JSON.parse(fs.readFileSync(canonical,'utf8'));fs.copyFileSync(canonical,file);const accepted=invoke(file);assert.equal(accepted.status,0,accepted.stderr);assert.equal(accepted.stderr.includes('Tier 1 coverage is not checked'),false);
  assert.equal(invoke(path.join(dir,'missing.json')).status,1);
  for(const mutate of [row=>row.canonicalSource='another-product',row=>row.lessonTiers.tier1_full=[],row=>row.lessonTiers.tier1_full.push(row.lessonTiers.tier1_full[0]),row=>row.lessonTiers.tier1_full.push('unassigned-source-language')]){const bad=structuredClone(source);mutate(bad);fs.writeFileSync(file,JSON.stringify(bad));const refused=invoke(file);assert.equal(refused.status,1);assert.equal(refused.stderr.includes('Tier 1 coverage is not checked'),false);}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
