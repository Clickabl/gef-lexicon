import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {registryDigest} from './authoring/registryOperationJournal.mjs';
import {GitContentWorkspace} from './authoring/gitContentWorkspace.mjs';
import {EntityRegistryService} from './authoring/entityRegistryService.mjs';
import {entityKinds,entityNameInput,entityBiographyInput,entityMutationInput,entityRecordedMutationInput,entityPatchInput} from './authoring/entityRegistryContracts.mjs';
import {createEntityWriter,inspectEntityWriterHistory} from './authoring/entityWriterProfile.mjs';
import {z} from 'zod';
import {ENTITY_TYPES,validateEntityRegistry,entityWritingRepresentationCompatible} from './entityRegistry.mjs';

const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gef-entity-authoring-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const remote=path.join(root,'remote.git'),repo=path.join(root,'source');git(root,'init','--quiet','--bare','-b','main',remote);git(root,'clone','--quiet',remote,repo);
 for(const folder of ['entities','scripts','packages/entity-registry-v1','sources'])fs.mkdirSync(path.join(repo,folder),{recursive:true});
 fs.writeFileSync(path.join(repo,'entities/index.json'),JSON.stringify({schema_version:2,contract:'gef-entity-registry-v1',revision:1,entities:[],redirects:[]},null,2)+'\n');
 fs.writeFileSync(path.join(repo,'sources/bibliography.json'),JSON.stringify({sources:[{source_id:'src-actual-source',source_type:'book',title:'Actual documented fixture source'}]}));
 fs.copyFileSync(new URL('./entityRegistry.mjs',import.meta.url),path.join(repo,'packages/entity-registry-v1/entityRegistry.mjs'));
 fs.copyFileSync(new URL('./bibliographicContract.mjs',import.meta.url),path.join(repo,'packages/entity-registry-v1/bibliographicContract.mjs'));
 fs.copyFileSync(new URL('./compileEntityRegistry.mjs',import.meta.url),path.join(repo,'packages/entity-registry-v1/compileEntityRegistry.mjs'));
 const checker="import fs from 'node:fs';import {validateEntityRegistry,publicEntityRegistry} from '../packages/entity-registry-v1/entityRegistry.mjs';const source=validateEntityRegistry(JSON.parse(fs.readFileSync('entities/index.json')),{bibliography:JSON.parse(fs.readFileSync('sources/bibliography.json'))});if(JSON.stringify(publicEntityRegistry(source)).includes('private research fixture'))throw Error('public exclusion failed');";
 fs.writeFileSync(path.join(repo,'scripts/validate-entity-registry.mjs'),checker);
 fs.writeFileSync(path.join(repo,'scripts/compile-entity-registry.mjs'),"import fs from 'node:fs';import {createHash} from 'node:crypto';import {compileEntityRegistry} from '../packages/entity-registry-v1/compileEntityRegistry.mjs';import {validateEntityRegistry} from '../packages/entity-registry-v1/entityRegistry.mjs';const bytes=fs.readFileSync('entities/index.json'),input=JSON.parse(bytes),bibliography=JSON.parse(fs.readFileSync('sources/bibliography.json'));validateEntityRegistry(input,{bibliography});if(process.argv.includes('--output'))await compileEntityRegistry({input,bibliography,outputDirectory:process.argv[process.argv.indexOf('--output')+1],sourceSha256:createHash('sha256').update(bytes).digest('hex')});");
 fs.writeFileSync(path.join(repo,'package.json'),JSON.stringify({type:'module',scripts:{validate:'node scripts/validate-entity-registry.mjs'}}));
 git(repo,'add','-A');git(repo,'-c','user.name=fixture','-c','user.email=fixture@example.com','commit','--quiet','-m','source authority');git(repo,'push','--quiet','origin','main');
 const languageFile=path.join(root,'canonical-languages.json'),languageBytes=JSON.stringify({canonicalSource:'Clickabl/gef-expo/registry/language-support.json',uiLocalization:{productionRuntimeTags:['en','fr']}});
 fs.writeFileSync(languageFile,languageBytes);
 const languageRegistry={file:languageFile,sha256:registryDigest(languageBytes),sourceCommit:'a'.repeat(40)};
 const make=(options={})=>new EntityRegistryService({workspace:new GitContentWorkspace({repo}),languageRegistry,now:()=> '2026-10-13T01:00:00.000Z',...options}),service=make();
 return {root,repo,remote,service,make,languageRegistry};
}
const actor='user:tim-fixture';
const sourceName={text:'Jules Verne',language_tag:'en',name_type:'canonical',translation_state:'source',source_refs:['src-actual-source']};
const entity=(overrides={})=>({entity_type:'person',canonical_name:'Jules Verne',canonical_name_language_tag:'en',names:[sourceName],biographies:[{language_tag:'en',short_text:'A supplied biography.',translation_state:'source',source_refs:['src-actual-source']}],source_refs:['src-actual-source'],...overrides});
async function createIntent(service,overrides={}) {const source=await service.list();return {request_id:randomUUID(),expected_source_revision:source.source_revision,expected_registry_revision:source.registry_revision,action:'create',entity:entity(overrides)};}
async function editIntent(service,action,data) {const source=await service.list();return {request_id:randomUUID(),expected_source_revision:source.source_revision,expected_registry_revision:source.registry_revision,action,...data};}

function operatorEnv(f) {
 return {...process.env,GEF_LEXICON_AUTHORING_REPO:f.repo,GEF_LEXICON_AUTHORING_REMOTE:'origin',GEF_LEXICON_AUTHORING_PUSH:'true',GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_FILE:f.languageRegistry.file,GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SHA256:f.languageRegistry.sha256,GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SOURCE_COMMIT:f.languageRegistry.sourceCommit};
}

test('patched collection parsing preserves admitted defaults, PATCH absence and historical mutation grammar',()=>{
 const request={request_id:'00000000-0000-0000-0000-000000000000',expected_source_revision:'a'.repeat(40),expected_registry_revision:1};
 const minimal={entity_type:'person',canonical_name:'Exact source',source_refs:['src-actual-source']};
 assert.deepEqual(entityMutationInput.parse({...request,action:'create',entity:minimal}),{...request,action:'create',entity:{...minimal,names:[],biographies:[],external_ids:{},legacy_ids:[]}});
 const patch={canonical_name:'Exact revised name'};
 assert.deepEqual(entityMutationInput.parse({...request,action:'update',entity_id:'ent_existing-source',patch}).patch,patch);
 assert.deepEqual(entityPatchInput.parse({external_ids:{provider:['actual-source']}}),{external_ids:{provider:['actual-source']}});
 assert.equal(entityPatchInput.safeParse({}).success,false);
 assert.equal(entityMutationInput.safeParse({...request,action:'create',entity:{...minimal,review_state:'approved'}}).success,false);
 const historical={...request,action:'upsert-biography',entity_id:'ent_existing-source',biography:{language_tag:'en',work_id:'retained-work',short_text:'Exact old portrait.',translation_state:'source',source_refs:['src-actual-source']}};
 assert.equal(entityMutationInput.safeParse(historical).success,false);
 assert.deepEqual(entityRecordedMutationInput.parse(historical),historical);
 const oversized=Array.from({length:201},()=>({}));let visited=0;
 Object.defineProperty(oversized,0,{get(){visited++;throw Error('oversized elements must not be parsed');}});
 assert.equal(entityMutationInput.safeParse({...request,action:'create-many',records:oversized}).success,false);
 assert.equal(visited,0);
 let parsed=0;assert.equal(z.array(z.string().refine(()=>{parsed++;return true;})).max(1).safeParse(['a','b']).success,false);assert.equal(parsed,0);
});

test('history inspection preserves journal bytes and omits private actors, intents and source content',async t=>{
 const f=fixture(t),input=await createIntent(f.service,{research_notes:'private research fixture'}),saved=await f.service.mutate(actor,input);
 const before=journalBytes(f.service),head=f.service.workspace.head();
 for(const method of ['recover','settlePending','fetch','validateSource'])f.service[method]=()=>{throw Error(`history invoked ${method}`);};
 const report=await inspectEntityWriterHistory(f.service);
 assert.equal(report.operationCount,1);assert.deepEqual(report.statusCounts,{published:1});assert.deepEqual(report.receipts,[saved]);assert.equal(report.freshMutationAdmission,false);
 assert.equal(JSON.stringify(report).includes(actor),false);assert.equal(JSON.stringify(report).includes('private research fixture'),false);assert.equal(JSON.stringify(report).includes('source_content'),false);
 assert.deepEqual(journalBytes(f.service),before);assert.equal(f.service.workspace.head(),head);
 const cli=JSON.parse(execFileSync(process.execPath,[new URL('../../scripts/author-entity-registry.mjs',import.meta.url).pathname,'--inspect-history'],{env:operatorEnv(f),encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 assert.deepEqual(cli,report);assert.deepEqual(journalBytes(f.service),before);
 fs.rmSync(f.service.journal.directory,{recursive:true});
 assert.throws(()=>createEntityWriter(operatorEnv(f)));assert.equal(fs.existsSync(f.service.journal.directory),false);
});

test('all maintained CLI paths refuse a missing retained journal on a populated source without creating anything',async t=>{
 const f=fixture(t);await f.service.mutate(actor,await createIntent(f.service));
 const next=await createIntent(f.service,{canonical_name:'Fresh intent must not replace lost history'}),file=path.join(f.root,'fresh-intent.json');fs.writeFileSync(file,JSON.stringify(next));
 const head=f.service.workspace.head(),source=fs.readFileSync(path.join(f.repo,'entities/index.json'));
 fs.rmSync(f.service.journal.directory,{recursive:true});
 for(const args of [['--inspect'],['--inspect-history'],['--input',file,'--actor',actor]]){
  assert.throws(()=>execFileSync(process.execPath,[new URL('../../scripts/author-entity-registry.mjs',import.meta.url).pathname,...args],{env:operatorEnv(f),encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  assert.equal(fs.existsSync(f.service.journal.directory),false);
  assert.equal(fs.existsSync(f.service.workspace.lockPath),false);
  assert.equal(f.service.workspace.head(),head);assert.deepEqual(fs.readFileSync(path.join(f.repo,'entities/index.json')),source);
  assert.equal(git(f.repo,'status','--porcelain'),'');
 }
});

test('historical journal UTC timestamps keep minute/second precision and strict calendar validation',async t=>{
 const f=fixture(t),input=await createIntent(f.service);await f.service.mutate(actor,input);const row=f.service.journal.get(actor,input.request_id),file=path.join(f.service.journal.directory,row.key+'.json'),original=fs.readFileSync(file);
 try {
  for(const submitted_at of ['2026-11-18T10:00Z','2026-11-18T10:00:00Z','2024-02-29T23:59:59.12345Z','0000-02-29T00:00Z']){
   fs.writeFileSync(file,JSON.stringify({...row,submitted_at}));assert.equal(f.make().journal.get(actor,input.request_id).submitted_at,submitted_at);
  }
  for(const submitted_at of ['2026-02-29T00:00:00Z','2026-11-18T24:00:00Z','2026-11-18T10:00:00+00:00','2026-11-18T10:00:00']){
   fs.writeFileSync(file,JSON.stringify({...row,submitted_at}));assert.throws(()=>f.make(),/entity_operation_journal_invalid/);
  }
 } finally {fs.writeFileSync(file,original);}
});

test('two actual operator processes cannot allocate competing IDs and the original request replays after the lock clears',async t=>{
 const f=fixture(t),checker=path.join(f.repo,'scripts/validate-entity-registry.mjs'),marker=path.join(f.root,'validator-entered');
 fs.appendFileSync(checker,"\nfs.writeFileSync(process.env.FIXTURE_WRITER_MARKER,'entered');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);\n");
 git(f.repo,'add','scripts/validate-entity-registry.mjs');git(f.repo,'-c','user.name=fixture','-c','user.email=fixture@example.com','commit','--quiet','-m','fixture validation barrier');git(f.repo,'push','--quiet','origin','main');
 const input=await createIntent(f.service),filename=path.join(f.root,'same-intent.json');fs.writeFileSync(filename,JSON.stringify(input));
 const env={...operatorEnv(f),FIXTURE_WRITER_MARKER:marker};const args=[new URL('../../scripts/author-entity-registry.mjs',import.meta.url).pathname,'--input',filename,'--actor',actor];
 const children=new Set();t.after(()=>{for(const child of children)child.kill('SIGTERM');});
 const launch=()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});children.add(child);let stdout='',stderr='';child.stdout.on('data',b=>{stdout+=b;});child.stderr.on('data',b=>{stderr+=b;});child.on('error',reject);child.on('close',code=>{children.delete(child);resolve({code,stdout,stderr});});});
 const first=launch();const deadline=Date.now()+10000;while(!fs.existsSync(marker)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));
 assert.equal(fs.existsSync(marker),true,'first process holds the source lock inside the owning validator');
 const other=await launch();assert.notEqual(other.code,0);assert.match(other.stderr,/authoring_busy|Authoring lock is unavailable/);
 const finished=await first;assert.equal(finished.code,0,finished.stderr);const saved=JSON.parse(finished.stdout);assert.equal(saved.status,'published');
 const replay=await launch();assert.equal(replay.code,0,replay.stderr);assert.deepEqual(JSON.parse(replay.stdout),saved);assert.equal(f.make().journal.all().length,1);assert.equal((await f.make().list()).total,1);
});

test('operator entrypoint uses the runtime protected language profile, publishes once and replays the retained receipt',async t=>{
 const f=fixture(t),input=await createIntent(f.service),filename=path.join(f.root,'operator-intent.json');fs.writeFileSync(filename,JSON.stringify(input));
 const env={...process.env,GEF_LEXICON_AUTHORING_REPO:f.repo,GEF_LEXICON_AUTHORING_REMOTE:'origin',GEF_LEXICON_AUTHORING_PUSH:'true',GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_FILE:f.languageRegistry.file,GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SHA256:f.languageRegistry.sha256,GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SOURCE_COMMIT:f.languageRegistry.sourceCommit};
 const invoke=profile=>execFileSync(process.execPath,[new URL('../../scripts/author-entity-registry.mjs',import.meta.url).pathname,'--input',filename,'--actor',actor],{env:profile,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const before=f.service.workspace.head();
 const inspected=JSON.parse(execFileSync(process.execPath,[new URL('../../scripts/author-entity-registry.mjs',import.meta.url).pathname,'--inspect'],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 assert.equal(inspected.source_revision,before);assert.equal(inspected.registry_revision,1);assert.equal(inspected.total,0);assert.equal(f.service.journal.all().length,0);
 for(const profile of [
  {...env,GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_FILE:'',GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SHA256:'',GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SOURCE_COMMIT:''},
  {...env,GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SOURCE_COMMIT:''},
  {...env,GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SHA256:'0'.repeat(64)},
  {...env,GEF_LEXICON_AUTHORING_REMOTE:'unconfigured-fixture-remote'},
 ]){
  assert.throws(()=>invoke(profile));assert.equal(f.service.workspace.head(),before);assert.equal(f.service.journal.get(actor,input.request_id),null);assert.equal(git(f.repo,'status','--porcelain'),'');
 }
 const saved=JSON.parse(invoke(env));assert.equal(saved.status,'published');assert.equal(saved.pushed,true);assert.equal(saved.source_revision,git(f.remote,'rev-parse','main'));assert.equal(saved.allocated_ids.length,3);
 assert.deepEqual(JSON.parse(invoke(env)),saved);assert.equal((await f.make().list()).total,1);assert.equal(git(f.repo,'status','--porcelain'),'');
});

test('canonical source kinds match; one actual source writer allocates once, validates, pushes and replays exact actor intent',async t=>{
 assert.deepEqual([...entityKinds].sort(),[...ENTITY_TYPES].sort());const f=fixture(t),input=await createIntent(f.service,{research_notes:'private research fixture'}),result=await f.service.mutate(actor,input);
 assert.equal(result.status,'published');assert.equal(result.pushed,true);assert.equal(result.allocated_ids.length,3);assert.match(result.published_package_sha256,/^[a-f0-9]{64}$/u);const manifest=JSON.parse(fs.readFileSync(path.join(f.repo,'lexi/entities-v1/manifest.json')));assert.equal(manifest.package_sha256,result.published_package_sha256);assert.equal(manifest.registry.sha256,result.published_projection_sha256);assert.equal(manifest.sources.sha256,result.published_sources_sha256);assert.equal(manifest.source_sha256,result.registry_sha256);assert.match(result.entity_id,/^ent_[0-9a-f-]{36}$/u);
 assert.equal(result.source_revision,git(f.remote,'rev-parse','main'));const row=(await f.service.get(result.entity_id)).entity;
 assert.equal(row.canonical_name,'Jules Verne');assert.equal(row.review_state,'candidate');assert.equal(row.names[0].review_state,'candidate');assert.equal(row.names[0].translation_state,'source');assert.equal(row.research_notes,undefined);
 assert.equal(JSON.parse(fs.readFileSync(path.join(f.repo,'entities/index.json'))).entities[0].research_notes,'private research fixture');
 assert.deepEqual(await f.make().mutate(actor,JSON.parse(JSON.stringify(input))),result);assert.equal(git(f.repo,'status','--porcelain'),'');
 assert.throws(()=>f.service.operation('user:other-fixture',input.request_id),e=>e.code==='entity_operation_not_found');
 await assert.rejects(f.service.mutate(actor,{...input,entity:{...input.entity,canonical_name:'Changed intent'}}),e=>e.code==='idempotency_conflict');
 assert.equal(git(f.remote,'rev-parse','main'),result.source_revision);
});
test('source and registry revision conflicts refuse new IDs; invalid/provisional data never establishes review or source evidence',async t=>{
 const f=fixture(t),input=await createIntent(f.service),saved=await f.service.mutate(actor,input);
 await assert.rejects(f.service.mutate(actor,{...input,request_id:randomUUID()}),e=>e.code==='entity_registry_stale');
 const stale=await editIntent(f.service,'create',{entity:entity()});stale.expected_registry_revision--;
 await assert.rejects(f.service.mutate(actor,stale),e=>e.code==='entity_registry_stale');assert.equal(f.service.journal.get(actor,stale.request_id),null);
 const unknown=await createIntent(f.service,{source_refs:['missing-source']});await assert.rejects(f.service.mutate(actor,unknown),e=>e.code==='entity_registry_validation_failed');
 assert.equal(f.service.operation(actor,unknown.request_id).status,'rejected');assert.equal(git(f.remote,'rev-parse','main'),saved.source_revision);assert.equal(git(f.repo,'status','--porcelain'),'');
 const reviewed=await createIntent(f.service);reviewed.entity.review_state='approved';await assert.rejects(f.service.mutate(actor,reviewed));
 const noLanguage=await createIntent(f.service,{names:[{...sourceName,language_tag:undefined,translation_state:'human_translation'}]});await assert.rejects(f.service.mutate(actor,noLanguage),e=>e.code==='entity_registry_validation_failed');
});
test('upserts retain stable child IDs and untouched aliases; actual source search preserves ambiguity and Unicode',async t=>{
 const f=fixture(t),first=await f.service.mutate(actor,await createIntent(f.service));const row=(await f.service.get(first.entity_id)).entity;
 const alias={text:'Жюль Верн',language_tag:'ru',name_type:'localized',translation_state:'source',source_refs:['src-actual-source']};
 const added=await f.service.mutate(actor,await editIntent(f.service,'upsert-name',{entity_id:first.entity_id,name:alias}));assert.equal(added.allocated_ids.length,1);
 const withAlias=(await f.service.get(first.entity_id)).entity;const aliasId=withAlias.names[1].label_id;
 const updated=await f.service.mutate(actor,await editIntent(f.service,'upsert-name',{entity_id:first.entity_id,name:{...alias,label_id:aliasId,text:'Жюль Верн (источник)'}}));assert.equal(updated.allocated_ids.length,0);
 const changed=(await f.service.get(first.entity_id)).entity;assert.deepEqual(changed.names[0],row.names[0]);assert.equal(changed.names[1].label_id,aliasId);assert.equal(changed.biographies[0].biography_id,row.biographies[0].biography_id);
 assert.equal((await f.service.list({q:'ЖЮЛЬ ВЕРН'})).total,1);
 const second=await f.service.mutate(actor,await createIntent(f.service));assert.notEqual(second.entity_id,first.entity_id);assert.equal((await f.service.list({q:'jules verne'})).total,2);
 await assert.rejects(f.service.mutate(actor,await editIntent(f.service,'upsert-name',{entity_id:second.entity_id,name:{...alias,label_id:aliasId}})),e=>e.code==='entity_child_not_found');
 const bio=await f.service.mutate(actor,await editIntent(f.service,'upsert-biography',{entity_id:first.entity_id,biography:{biography_id:row.biographies[0].biography_id,language_tag:'en',short_text:'Updated supplied biography.',translation_state:'source',source_refs:['src-actual-source']}}));assert.equal(bio.allocated_ids.length,0);
});
test('merge keeps retired records and immutable redirects; source IDs are never reused or inferred from captions',async t=>{
 const f=fixture(t),a=await f.service.mutate(actor,await createIntent(f.service)),b=await f.service.mutate(actor,await createIntent(f.service,{canonical_name:'Separate supplied identity'}));
 const input=await editIntent(f.service,'merge',{from_entity_id:a.entity_id,to_entity_id:b.entity_id,source_refs:['src-actual-source'],reason:'Source-evidenced identity merge'}),merged=await f.service.mutate(actor,input);
 assert.deepEqual(merged.allocated_ids,[]);assert.equal((await f.service.get(a.entity_id)).entity.entity_id,b.entity_id);
 const source=JSON.parse(fs.readFileSync(path.join(f.repo,'entities/index.json')));assert.equal(source.entities.length,2);assert.equal(source.entities[0].review_state,'superseded');assert.equal(source.redirects.length,1);validateEntityRegistry(source);
 await assert.rejects(f.service.mutate(actor,await editIntent(f.service,'update',{entity_id:a.entity_id,patch:{canonical_name:'Reused retired identity'}})),e=>e.code==='entity_retired');
 const c=await f.service.mutate(actor,await createIntent(f.service));assert.notEqual(c.entity_id,a.entity_id);assert.notEqual(c.entity_id,b.entity_id);
});
test('crash after commit preserves its exact pending journal and source for explicit reconciliation',async t=>{
 const f=fixture(t),input=await createIntent(f.service),original=f.service.workspace.commit.bind(f.service.workspace);
 f.service.workspace.commit=args=>{original(args);throw Error('fixture stopped after durable Git commit');};
 await assert.rejects(f.service.mutate(actor,input),/stopped after durable/);const before=git(f.repo,'rev-parse','HEAD'),reserved=f.service.journal.get(actor,input.request_id);
 assert.equal(reserved.status,'prepared');const journal=fs.readFileSync(path.join(f.service.journal.directory,reserved.key+'.json'));
 await assert.rejects(f.make().mutate(actor,input),e=>e.code==='entity_registry_intent_pending');
 await assert.rejects(f.make().list(),e=>e.code==='entity_registry_intent_pending');
 assert.deepEqual(fs.readFileSync(path.join(f.service.journal.directory,reserved.key+'.json')),journal);
 assert.equal(git(f.repo,'rev-parse','HEAD'),before);assert.notEqual(git(f.remote,'rev-parse','main'),before);
});
test('prepared crash remains pending while a durable published receipt replays exactly across instances',async t=>{
 for(const stage of ['prepared','published']) {
  const f=fixture(t),input=await createIntent(f.service),put=f.service.journal.put.bind(f.service.journal);let stopped=false;
  f.service.journal.put=record=>{if(stopped)throw Error('fixture process stopped');const result=put(record);if(record.status===stage){stopped=true;throw Error('fixture process stopped');}return result;};
  await assert.rejects(f.service.mutate(actor,input),/process stopped/);const persisted=f.make().journal.get(actor,input.request_id);
  if(stage==='prepared') {
   const file=path.join(f.service.journal.directory,persisted.key+'.json'),bytes=fs.readFileSync(file);
   await assert.rejects(f.make().mutate(actor,input),e=>e.code==='entity_registry_intent_pending');
   await assert.rejects(f.make().list(),e=>e.code==='entity_registry_intent_pending');
   assert.deepEqual(fs.readFileSync(file),bytes);
  } else {
   const recovered=await f.make().mutate(actor,input);
   assert.deepEqual(recovered.allocated_ids,persisted.allocated_ids);assert.equal(recovered.status,'published');assert.equal((await f.make().list()).total,1);
  }
 }
});
test('malformed durable journal fails closed; independently configured workers cannot allocate concurrently',async t=>{
 const f=fixture(t),input=await createIntent(f.service),other=f.make();const outcomes=await Promise.allSettled([f.service.mutate(actor,input),other.mutate(actor,{...input,request_id:randomUUID()})]);
 assert.equal(outcomes.filter(v=>v.status==='fulfilled'&&v.value.status==='published').length,1);assert.equal((await f.service.list()).total,1);
 fs.writeFileSync(path.join(f.service.journal.directory,'broken.json'),'{');assert.throws(()=>f.make());
});
test('entity inventory pages remain bound to exact source and registry revisions rather than mixing changed source',async t=>{
 const f=fixture(t);await f.service.mutate(actor,await createIntent(f.service));await f.service.mutate(actor,await createIntent(f.service,{canonical_name:'Second supplied identity'}));
 const page=await f.service.list({limit:1});assert.equal(page.next_cursor,1);const query={cursor:page.next_cursor,limit:1,expected_source_revision:page.source_revision,expected_registry_revision:page.registry_revision};
 const second=await f.service.list(query);assert.equal(second.source_revision,page.source_revision);assert.notEqual(second.entities[0].entity_id,page.entities[0].entity_id);assert.equal(second.next_cursor,null);
 await assert.rejects(f.service.list({cursor:1,limit:1}));await f.service.mutate(actor,await createIntent(f.service,{canonical_name:'Third supplied identity'}));
 await assert.rejects(f.service.list(query),e=>e.code==='entity_registry_stale');
});

test('bounded create-many is one all-or-nothing source/package/Git intent with per-record permanent IDs and exact replay',async t=>{
 const f=fixture(t),current=await f.service.list(),input={request_id:randomUUID(),expected_source_revision:current.source_revision,expected_registry_revision:current.registry_revision,action:'create-many',records:[{key:'person-source',entity:entity()},{key:'genre-source',entity:entity({entity_type:'genre',canonical_name:'Adventure',biographies:[]})}]};
 const saved=await f.service.mutate(actor,input);assert.equal(saved.status,'published');assert.equal(Object.keys(saved.entity_ids_by_key).length,2);assert.notEqual(saved.entity_ids_by_key['person-source'],saved.entity_ids_by_key['genre-source']);assert.equal(saved.registry_revision,2);assert.equal((await f.service.list()).total,2);assert.deepEqual(await f.make().mutate(actor,input),saved);
 const before=f.service.workspace.head(),source=await f.service.list(),invalid={...input,request_id:randomUUID(),expected_source_revision:source.source_revision,expected_registry_revision:source.registry_revision,records:[{key:'first-valid',entity:entity()},{key:'second-invalid',entity:entity({source_refs:['missing-source']})}]};
 await assert.rejects(f.service.mutate(actor,invalid),error=>error.code==='entity_registry_validation_failed');assert.equal(f.service.workspace.head(),before);assert.equal((await f.service.list()).total,2);assert.equal(f.service.operation(actor,invalid.request_id).status,'rejected');assert.equal(git(f.repo,'status','--porcelain'),'');
 const duplicate={...input,request_id:randomUUID(),records:[input.records[0],input.records[0]]};await assert.rejects(f.service.mutate(actor,duplicate));
});
test('sourced relationship facts receive stable rel IDs, exact independent review/period and strict typed target FKs',async t=>{
 const f=fixture(t),person=await f.service.mutate(actor,await createIntent(f.service)),country=await f.service.mutate(actor,await createIntent(f.service,{entity_type:'country',canonical_name:'France',biographies:[]}));
 const relationship={kind:'associated_country',target_entity_id:country.entity_id,certainty:'known',source_refs:['src-actual-source'],historical_context:{text:'Source-supplied historical context.',language_tag:'en'}};
 const added=await f.service.mutate(actor,await editIntent(f.service,'upsert-relationship',{entity_id:person.entity_id,relationship}));assert.equal(added.allocated_ids.length,1);assert.match(added.allocated_ids[0],/^rel_[a-f0-9-]{36}$/u);
 const row=(await f.service.get(person.entity_id)).entity,rel=row.relationships[0];assert.equal(rel.review_state,'candidate');assert.equal(rel.target_entity_id,country.entity_id);assert.equal(row.names[0].label_id,person.allocated_ids[1]);
 const edited=await f.service.mutate(actor,await editIntent(f.service,'upsert-relationship',{entity_id:person.entity_id,relationship:{...relationship,relationship_id:rel.relationship_id,certainty:'approximate'}}));assert.deepEqual(edited.allocated_ids,[]);assert.equal((await f.service.get(person.entity_id)).entity.relationships[0].relationship_id,rel.relationship_id);
 const before=f.service.workspace.head();await assert.rejects(f.service.mutate(actor,await editIntent(f.service,'upsert-relationship',{entity_id:person.entity_id,relationship:{...relationship,target_entity_id:person.entity_id}})),error=>error.code==='entity_registry_validation_failed');assert.equal(f.service.workspace.head(),before);
 await assert.rejects(f.service.mutate(actor,await editIntent(f.service,'upsert-relationship',{entity_id:person.entity_id,relationship:{...relationship,source_refs:[]}})),error=>error.code==='entity_registry_validation_failed');
});
test('public compiler failure restores source/artifacts and immutable package generation never admits arbitrary side effects',async t=>{
 for(const mode of ['failure','side-effect']) {
  const f=fixture(t),script=path.join(f.repo,'scripts/compile-entity-registry.mjs'),original=fs.readFileSync(script,'utf8');fs.writeFileSync(script,original+(mode==='failure'?"\nif(process.argv.includes('--output'))throw Error('fixture failed build');":"\nif(process.argv.includes('--output'))fs.writeFileSync('unrelated-source.json','{}');"));
  git(f.repo,'add','scripts/compile-entity-registry.mjs');git(f.repo,'-c','user.name=fixture','-c','user.email=fixture@example.com','commit','--quiet','-m','compiler negative control');git(f.repo,'push','--quiet','origin','main');
  const input=await createIntent(f.service),before=f.service.workspace.head();await assert.rejects(f.service.mutate(actor,input),error=>error.code===(mode==='failure'?'entity_registry_build_failed':'entity_registry_unexpected_side_effects'));assert.equal(f.service.workspace.head(),before);assert.equal((await f.service.list()).total,0);assert.equal(git(f.repo,'status','--porcelain'),'');
 }
});


test('persisted intent boundaries reject malformed allocations, changed replay fingerprints and incomplete publication facts without losing IDs',async t=>{const f=fixture(t),input=await createIntent(f.service),receipt=await f.service.mutate(actor,input),record=f.service.journal.get(actor,input.request_id),filename=path.join(f.service.journal.directory,record.key+'.json'),original=fs.readFileSync(filename);for(const mutate of [r=>r.allocated_ids=[{}],r=>r.input.entity.canonical_name='Different stored intent',r=>r.published_sources_sha256=undefined,r=>r.source_content='Wrong stored source bytes',r=>r.status='made-up',r=>r.allocated_ids.push(r.allocated_ids[0])]){const broken=structuredClone(record);mutate(broken);fs.writeFileSync(filename,JSON.stringify(broken));assert.throws(()=>f.make(),/entity_operation_journal_invalid/u);fs.writeFileSync(filename,original);}assert.deepEqual(await f.make().mutate(actor,input),receipt);assert.equal((await f.service.list()).total,1);});


test('valid factual source tags remain exact and locale canonicalization cannot merge Fanti or Twi with Akan',()=>{
 for(const language_tag of ['fat','tw','ak']){const name=entityNameInput.parse({...sourceName,language_tag}),biography=entityBiographyInput.parse({language_tag,short_text:'Exact source text.',translation_state:'source',source_refs:['src-actual-source']});assert.equal(name.language_tag,language_tag);assert.equal(biography.language_tag,language_tag);assert.equal(entityWritingRepresentationCompatible(language_tag,language_tag),true);}
 for(const [requested,actual]of [['fat','ak'],['tw','ak'],['ak','fat'],['ak','tw'],['fat','tw']])assert.equal(entityWritingRepresentationCompatible(requested,actual),false);
 assert.equal(entityNameInput.safeParse({...sourceName,language_tag:'not a tag'}).success,false);
 assert.equal(entityWritingRepresentationCompatible('en-GB','en'),true);assert.equal(entityWritingRepresentationCompatible('zh-Hant','zh-Hans'),false);
});


test('actual writer forwards its verified canonical registry and rechecks changed bytes before allocating or publishing',async t=>{
 const f=fixture(t),file=path.join(f.root,'canonical-languages.json'),bytes=JSON.stringify({canonicalSource:'Clickabl/gef-expo/registry/language-support.json',uiLocalization:{productionRuntimeTags:['en','fr']}});fs.writeFileSync(file,bytes);const languageRegistry={file,sha256:registryDigest(bytes),sourceCommit:'a'.repeat(40)};const service=f.make({languageRegistry});
 assert.equal(service.validationEnvironment().GEF_LANGUAGE_SUPPORT_REGISTRY,file);
 assert.throws(()=>f.make({languageRegistry:{...languageRegistry,sha256:'0'.repeat(64)}}),error=>error.code==='entity_registry_language_authority_unavailable');assert.throws(()=>f.make({languageRegistry:{...languageRegistry,sourceCommit:undefined}}),/source commit/);
 const input=await createIntent(service);fs.appendFileSync(file,' ');await assert.rejects(service.mutate(actor,input),error=>error.code==='entity_registry_language_authority_unavailable');assert.equal(service.journal.get(actor,input.request_id),null);assert.equal(git(f.repo,'status','--porcelain'),'');fs.writeFileSync(file,bytes);const saved=await service.mutate(actor,input);assert.equal(saved.status,'published');assert.deepEqual(await f.make({languageRegistry}).mutate(actor,input),saved);
});


test('current generic biography authoring refuses new work portraits and edits to historical scoped IDs without losing source history',async t=>{
 const f=fixture(t),input=await createIntent(f.service),saved=await f.service.mutate(actor,input),row=(await f.service.get(saved.entity_id)).entity;const historic=JSON.parse(fs.readFileSync(path.join(f.repo,'entities/index.json'),'utf8'));historic.entities[0].biographies[0].work_id='alpha';fs.writeFileSync(path.join(f.repo,'entities/index.json'),JSON.stringify(historic,null,2)+'\n');git(f.repo,'add','entities/index.json');git(f.repo,'-c','user.name=fixture','-c','user.email=fixture@example.com','commit','--quiet','-m','historical source portrait');git(f.repo,'push','--quiet','origin','main');
 const before=fs.readFileSync(path.join(f.repo,'entities/index.json')),newPortrait=await createIntent(f.service);newPortrait.entity.biographies[0].work_id='alpha';await assert.rejects(f.service.mutate(actor,newPortrait));assert.equal(f.service.journal.get(actor,newPortrait.request_id),null);
 const edit=await editIntent(f.service,'upsert-biography',{entity_id:saved.entity_id,biography:{biography_id:row.biographies[0].biography_id,language_tag:'en',short_text:'A new proposed portrait',translation_state:'source',source_refs:['src-actual-source']}});await assert.rejects(f.service.mutate(actor,edit),error=>error.code==='entity_work_biography_content_owned');assert.deepEqual(f.service.journal.get(actor,edit.request_id).allocated_ids,[]);assert.deepEqual(fs.readFileSync(path.join(f.repo,'entities/index.json')),before);assert.deepEqual((await f.service.get(saved.entity_id)).entity.biographies,[]);assert.equal(JSON.parse(fs.readFileSync(path.join(f.repo,'entities/index.json'),'utf8')).entities[0].biographies[0].work_id,'alpha');
});


test('source legacy identities cannot be removed and reassigned through ordinary metadata updates',async t=>{const f=fixture(t),saved=await f.service.mutate(actor,await createIntent(f.service,{legacy_ids:['actual-legacy-person']})),before=f.service.workspace.head(),input=await editIntent(f.service,'update',{entity_id:saved.entity_id,patch:{legacy_ids:[]}});await assert.rejects(f.service.mutate(actor,input),error=>error.code==='entity_legacy_identity_retirement_forbidden');assert.equal(f.service.workspace.head(),before);assert.deepEqual((await f.service.get(saved.entity_id)).entity.legacy_ids,['actual-legacy-person']);assert.deepEqual(f.service.journal.get(actor,input.request_id).allocated_ids,[]);const reuse=await createIntent(f.service,{legacy_ids:['actual-legacy-person']});await assert.rejects(f.service.mutate(actor,reuse),error=>error.code==='entity_registry_validation_failed');assert.deepEqual((await f.service.get(saved.entity_id)).entity.legacy_ids,['actual-legacy-person']);});


test('actual owning npm publication follows the current interpreter when the caller PATH omits its package tools',async t=>{
 const f=fixture(t),originalProcessPath=process.env.PATH;
 try {process.env.PATH=process.platform==='win32'?process.env.SystemRoot:'/usr/bin:/bin';const environment=f.service.validationEnvironment();assert.equal(environment.PATH.split(path.delimiter)[0],path.dirname(process.execPath));const input=await createIntent(f.service,{canonical_name:'Exact minimal-PATH source'}),result=await f.service.mutate(actor,input);assert.equal(result.status,'published');assert.equal(result.pushed,true);const manifest=JSON.parse(fs.readFileSync(path.join(f.repo,'lexi/entities-v1/manifest.json')));assert.equal(manifest.registry.sha256,result.published_projection_sha256);assert.equal(git(f.remote,'rev-parse','main'),result.source_revision);assert.deepEqual(await f.make().mutate(actor,input),result);}finally {if(originalProcessPath===undefined)delete process.env.PATH;else process.env.PATH=originalProcessPath;}
});

function journalBytes(service) {
 return Object.fromEntries(fs.readdirSync(service.journal.directory).sort().map(name=>[name,fs.readFileSync(path.join(service.journal.directory,name)).toString('hex')]));
}

test('list/get observe the exact locked local snapshot without recovery, checkout scripts or Git mutation',async t=>{
 const f=fixture(t),saved=await f.service.mutate(actor,await createIntent(f.service));
 const beforeJournal=journalBytes(f.service),beforeHead=f.service.workspace.head(),beforeSource=fs.readFileSync(path.join(f.repo,'entities/index.json'));
 for(const name of ['recover','settlePending','fetch','validateSource'])f.service[name]=()=>{throw Error(`read invoked ${name}`);};
 f.service.workspace.syncToRemote=()=>{throw Error('read invoked destructive sync');};
 const original=f.service.workspace.git.bind(f.service.workspace);
 f.service.workspace.git=(args,options)=>{
  assert.ok(['rev-parse','symbolic-ref','remote'].includes(args[0]));
  if(args[0]==='remote')assert.equal(args[1],'get-url');
  return original(args,options);
 };
 const list=await f.service.list(),one=await f.service.get(saved.entity_id);
 assert.equal(list.source_revision,beforeHead);assert.equal(one.entity.entity_id,saved.entity_id);
 assert.deepEqual(journalBytes(f.service),beforeJournal);
 assert.deepEqual(fs.readFileSync(path.join(f.repo,'entities/index.json')),beforeSource);
 assert.equal(f.service.workspace.head(),beforeHead);
});

test('tracked and untracked dirty work is preserved by refused reads and fresh mutation admission',async t=>{
 for(const kind of ['tracked','untracked']) {
  const f=fixture(t),input=await createIntent(f.service),beforeJournal=journalBytes(f.service);
  const file=path.join(f.repo,kind==='tracked'?'entities/index.json':'unrelated-note.txt');
  if(kind==='tracked')fs.appendFileSync(file,' ');else fs.writeFileSync(file,'unrelated local work');
  const bytes=fs.readFileSync(file);let allocations=0;f.service.uuid=()=>{allocations++;return randomUUID();};
  await assert.rejects(f.service.list(),e=>e.code==='entity_registry_dirty');
  await assert.rejects(f.service.mutate(actor,input),e=>e.code==='entity_registry_dirty');
  assert.deepEqual(fs.readFileSync(file),bytes);assert.deepEqual(journalBytes(f.service),beforeJournal);
  assert.equal(allocations,0);
 }
});

test('reserved historical intent blocks reads and new mutations without rewriting its journal or allocating IDs',async t=>{
 const f=fixture(t),input=await createIntent(f.service),put=f.service.journal.put.bind(f.service.journal);
 f.service.journal.put=record=>{const saved=put(record);if(record.status==='reserved')throw Error('fixture stopped after reservation');return saved;};
 await assert.rejects(f.service.mutate(actor,input),/after reservation/);
 const service=f.make(),before=journalBytes(service),source=fs.readFileSync(path.join(f.repo,'entities/index.json'));
 service.uuid=()=>{throw Error('pending intent allocated another ID');};
 service.recover=service.settlePending=()=>{throw Error('pending intent entered automatic recovery');};
 await assert.rejects(service.list(),e=>e.code==='entity_registry_intent_pending');
 await assert.rejects(service.get('ent_00000000-0000-4000-8000-000000000001'),e=>e.code==='entity_registry_intent_pending');
 await assert.rejects(service.mutate(actor,input),e=>e.code==='entity_registry_intent_pending');
 await assert.rejects(service.mutate(actor,{...input,request_id:randomUUID()}),e=>e.code==='entity_registry_intent_pending');
 assert.deepEqual(journalBytes(service),before);assert.deepEqual(fs.readFileSync(path.join(f.repo,'entities/index.json')),source);
});

test('stale source, wrong branch/origin/repository and missing authority fail before the first retained write',async t=>{
 for(const kind of ['source','registry','branch','origin','repository','authority']) {
  const f=fixture(t),input=await createIntent(f.service);let service=f.service,allocations=0;
  if(kind==='source')input.expected_source_revision='0'.repeat(40);
  if(kind==='registry')input.expected_registry_revision=2;
  if(kind==='branch')git(f.repo,'symbolic-ref','HEAD','refs/heads/unadmitted-fixture');
  if(kind==='origin')git(f.repo,'remote','set-url','origin',path.join(f.root,'not-the-admitted-origin'));
  if(kind==='repository')service.workspace.repo=fixture(t).repo;
  if(kind==='authority')service=f.make({languageRegistry:null});
  const before=journalBytes(service);service.uuid=()=>{allocations++;return randomUUID();};
  await assert.rejects(service.mutate(actor,input),e=>/^(entity_registry_)/u.test(e.code??''));
  assert.equal(service.journal.get(actor,input.request_id),null);assert.deepEqual(journalBytes(service),before);
  assert.equal(allocations,0,kind);
 }
});

test('known local/remote tracking divergence is refused without resetting the unpublished source',async t=>{
 const f=fixture(t),input=await createIntent(f.service);
 fs.writeFileSync(path.join(f.repo,'retained-local-work.txt'),'retained committed work');
 git(f.repo,'add','retained-local-work.txt');git(f.repo,'-c','user.name=fixture','-c','user.email=fixture@example.com','commit','--quiet','-m','retained local work');
 const head=f.service.workspace.head(),before=journalBytes(f.service);
 await assert.rejects(f.service.list(),e=>e.code==='entity_registry_stale');
 await assert.rejects(f.service.mutate(actor,input),e=>e.code==='entity_registry_stale');
 assert.equal(f.service.workspace.head(),head);assert.equal(fs.readFileSync(path.join(f.repo,'retained-local-work.txt'),'utf8'),'retained committed work');
 assert.deepEqual(journalBytes(f.service),before);
});

test('origin or language authority changed during validation invalidates admission before journal reservation',async t=>{
 for(const kind of ['origin','authority']) {
  const f=fixture(t),input=await createIntent(f.service),before=journalBytes(f.service);let allocations=0;
  f.service.uuid=()=>{allocations++;return randomUUID();};
  f.service.validator=()=>{
   if(kind==='origin')git(f.repo,'remote','set-url','origin',path.join(f.root,'changed-during-validation'));
   else fs.appendFileSync(f.service.languageRegistry.file,' ');
  };
  await assert.rejects(f.service.mutate(actor,input),e=>['entity_registry_workspace_changed','entity_registry_language_authority_unavailable'].includes(e.code));
  assert.deepEqual(journalBytes(f.service),before);assert.equal(allocations,0);
 }
});

test('an uncertain push stays committed and replay never enters reset/rebase recovery',async t=>{
 const f=fixture(t),input=await createIntent(f.service),beforeRemote=git(f.remote,'rev-parse','main');
 f.service.workspace.push=()=>false;f.service.recover=()=>{throw Error('ordinary request entered recovery');};
 const receipt=await f.service.mutate(actor,input);assert.equal(receipt.status,'committed');assert.equal(receipt.pushed,false);
 const before=journalBytes(f.service),head=f.service.workspace.head();
 await assert.rejects(f.service.mutate(actor,input),e=>e.code==='entity_registry_intent_pending');
 assert.deepEqual(f.service.operation(actor,input.request_id),receipt);assert.deepEqual(journalBytes(f.service),before);
 assert.equal(f.service.workspace.head(),head);assert.equal(git(f.remote,'rev-parse','main'),beforeRemote);
});

test('terminal same-intent replay remains exact even when a later dirty checkout cannot admit fresh writes',async t=>{
 const f=fixture(t),input=await createIntent(f.service),receipt=await f.service.mutate(actor,input),before=journalBytes(f.service);
 fs.writeFileSync(path.join(f.repo,'unrelated-retained.txt'),'retained');
 f.service.recover=f.service.settlePending=()=>{throw Error('terminal replay invoked recovery');};
 assert.deepEqual(await f.service.mutate(actor,input),receipt);
 await assert.rejects(f.service.mutate(actor,{...input,entity:{...input.entity,canonical_name:'different intent'}}),e=>e.code==='idempotency_conflict');
 assert.deepEqual(journalBytes(f.service),before);assert.equal(fs.readFileSync(path.join(f.repo,'unrelated-retained.txt'),'utf8'),'retained');
});

test('a changed push origin after commit cannot redirect publication or trigger cleanup of the retained intent',async t=>{
 const f=fixture(t),input=await createIntent(f.service),beforeRemote=git(f.remote,'rev-parse','main');
 const commit=f.service.workspace.commit.bind(f.service.workspace);
 f.service.workspace.commit=args=>{
  const result=commit(args);
  git(f.repo,'remote','set-url','--push','origin',path.join(f.root,'unadmitted-push-target'));
  return result;
 };
 await assert.rejects(f.service.mutate(actor,input),e=>e.code==='entity_registry_workspace_changed');
 const record=f.service.journal.get(actor,input.request_id);
 assert.equal(record.status,'committed');assert.ok(record.allocated_ids.length>0);
 assert.equal(f.service.workspace.head(),record.commit);assert.equal(git(f.remote,'rev-parse','main'),beforeRemote);
 assert.equal(f.service.operation(actor,input.request_id).pushed,false);
});
