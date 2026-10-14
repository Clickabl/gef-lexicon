import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const canonical=process.env.GEF_LANGUAGE_SUPPORT_REGISTRY ? path.resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY) : path.resolve(root,'../gef-expo/registry/language-support.json');
function invoke(registry) { return spawnSync(process.execPath,['scripts/validate-phrase-uses.mjs'],{cwd:root,env:{...process.env,GEF_LANGUAGE_SUPPORT_REGISTRY:registry},encoding:'utf8'}); }
test('actual phrase CLI honors the explicit primary registry and refuses bad authority instead of sibling fallback',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gef-phrase-registry-'));
 try {
  const file=path.join(dir,'primary.json');fs.writeFileSync(file,fs.readFileSync(canonical),{mode:0o600});
  const accepted=invoke(file);assert.equal(accepted.status,0,accepted.stderr);
  assert.equal(invoke(path.join(dir,'missing.json')).status,1);
  const bad=JSON.parse(fs.readFileSync(canonical,'utf8'));bad.canonicalSource='another-product';fs.writeFileSync(file,JSON.stringify(bad));assert.equal(invoke(file).status,1);
  bad.canonicalSource='Clickabl/gef-expo/registry/language-support.json';bad.programs.learnFromLanguages=[];fs.writeFileSync(file,JSON.stringify(bad));assert.equal(invoke(file).status,1);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
