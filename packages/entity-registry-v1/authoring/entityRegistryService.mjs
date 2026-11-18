import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {contentValidationEnvironment} from './contentValidationEnvironment.mjs';
import { entityMutationInput, entityRecordedMutationInput, entityQuery, entityId } from './entityRegistryContracts.mjs';
import { validateEntityRegistry, validatePublicEntitySources, normalizeEntitySearch } from '../entityRegistry.mjs';
import { RegistryOperationJournal, registryDigest, canonicalIntent } from './registryOperationJournal.mjs';

const SOURCE_PATH='entities/index.json';
const serialize=value=>JSON.stringify(value,null,2)+'\n';
const TERMINAL=new Set(['published','rejected']);
export class EntityRegistryError extends Error {
 constructor(code,status=422) { super(code);this.code=code;this.status=status; }
}
function publicEntity(entity) { const {research_notes,...visible}=entity;return {...structuredClone(visible),biographies:visible.biographies.filter(row=>row.work_id===undefined).map(row=>structuredClone(row))}; }
export function registryOperationReceipt(record) {
 return {contract:'gef-entity-registry-operation-v1',request_id:record.request_id,action:record.input.action,status:record.status,allocated_ids:record.allocated_ids,entity_id:record.entity_id??null,...(record.entity_ids_by_key?{entity_ids_by_key:record.entity_ids_by_key}:{}),base_source_revision:record.base_source_revision??record.input.expected_source_revision,registry_revision:record.registry_revision??record.input.expected_registry_revision,registry_sha256:record.registry_sha256??null,published_projection_sha256:record.published_projection_sha256??null,published_package_sha256:record.published_package_sha256??null,published_sources_sha256:record.published_sources_sha256??null,source_revision:record.commit??null,pushed:record.status==='published',...(record.reason?{reason:record.reason}:{})};
}
/** Single configured canonical source writer and UUID allocator shared by REST/MCP/operator imports. */
export class EntityRegistryService {
 constructor({workspace,journalDirectory,push=true,uuid=randomUUID,now=()=>new Date().toISOString(),validate=null,languageRegistry=null}) {
  if(workspace.branch!=='main')throw Error('Entity authoring requires main');
  this.languageRegistry=languageRegistry===null?null:Object.freeze({...languageRegistry});
  if(this.languageRegistry&&!/^[a-f0-9]{40}$/u.test(this.languageRegistry.sourceCommit??''))throw Error('Entity validator registry source commit is required');
  this.validationEnvironment();
  this.workspace=workspace;this.configuredWorkspace=Object.freeze(this.workspaceIdentity());
  this.journal=new RegistryOperationJournal(journalDirectory??path.join(workspace.repo,'.git','gef-entity-operations'));this.push=push;this.uuid=uuid;this.now=now;this.validator=validate;
 }
 workspaceIdentity() {
  try {
   const repo=fs.realpathSync(this.workspace.repo),gitDirectory=fs.realpathSync(path.join(repo,'.git'));
   if(!fs.statSync(gitDirectory).isDirectory()||this.workspace.branch!=='main'
    ||fs.realpathSync(this.workspace.git(['rev-parse','--show-toplevel']))!==repo
    ||fs.realpathSync(this.workspace.git(['rev-parse','--absolute-git-dir']))!==gitDirectory)
    throw Error('wrong configured checkout');
   return {configuredRepo:path.resolve(this.workspace.repo),repo,gitDirectory,remote:this.workspace.remote,
    fetchUrls:this.workspace.git(['remote','get-url','--all',this.workspace.remote]),
    pushUrls:this.workspace.git(['remote','get-url','--push','--all',this.workspace.remote])};
  } catch {throw new EntityRegistryError('entity_registry_workspace_unavailable',503);}
 }
 assertNoPending() {
  if(this.journal.all().some(record=>!TERMINAL.has(record.status)))
   throw new EntityRegistryError('entity_registry_intent_pending',409);
 }
 assertWorkspace() {
  this.workspace.assertLockOwned();
  if(JSON.stringify(this.workspaceIdentity())!==JSON.stringify(this.configuredWorkspace))
   throw new EntityRegistryError('entity_registry_workspace_changed',409);
  let branch;try {branch=this.workspace.git(['symbolic-ref','--quiet','--short','HEAD']);}
  catch {throw new EntityRegistryError('entity_registry_workspace_unavailable',503);}
  if(branch!=='main')throw new EntityRegistryError('entity_registry_main_required',409);
 }
 observedSource() {
  this.assertWorkspace();
  if(this.workspace.changedPaths().length)throw new EntityRegistryError('entity_registry_dirty',409);
  this.assertNoPending();
  if(!this.languageRegistry)throw new EntityRegistryError('entity_registry_language_authority_unavailable',503);
  this.validationEnvironment();
  const head=this.workspace.head();
  if(!/^[a-f0-9]{40}$/u.test(head)||(this.push&&this.remoteHead()!==head))
   throw new EntityRegistryError('entity_registry_stale',409);
  const source=this.source();
  this.workspace.assertLockOwned();
  if(this.workspace.head()!==head||this.workspace.changedPaths().length)
   throw new EntityRegistryError('entity_registry_stale',409);
  return {...source,head};
 }
 validationEnvironment() {
  let environment;try {environment=contentValidationEnvironment(this.languageRegistry);}catch {throw new EntityRegistryError('entity_registry_language_authority_unavailable',503);}
  // Hosted requests need the same installed interpreter for npm and every owning
  // script it starts. Passenger/SSH PATH need not contain that interpreter.
  const interpreterDirectory=path.dirname(process.execPath);
  try {fs.accessSync(path.join(interpreterDirectory,process.platform==='win32'?'npm.cmd':'npm'),fs.constants.X_OK);}catch {throw new EntityRegistryError('entity_registry_package_runner_unavailable',503);}
  return {...environment,PATH:[interpreterDirectory,environment.PATH??''].filter(Boolean).join(path.delimiter)};
 }
 validateSource() {
  const environment=this.validationEnvironment();
  if(this.validator)return this.validator(this.workspace);
  // Both read-only checks are owned by the exact synchronized Lexicon source, never caller scripts.
  for(const script of ['scripts/validate-entity-registry.mjs','scripts/compile-entity-registry.mjs']) {
   const result=spawnSync(process.execPath,[script,...(script.includes('compile')?['--check']:[])],{cwd:this.workspace.repo,encoding:'utf8',timeout:150000,env:environment});
   if(result.error||result.status!==0)throw new EntityRegistryError('entity_registry_validation_failed');
  }
 }
 generatedPath(relative) {return /^lexi\/entities-v1\/(?:manifest\.json|[a-f0-9]{64}\/(?:registry\.json|sources\.json|entities\.sqlite|artifact\.json))$/u.test(relative);}
 buildSource(record) {
  const owning=spawnSync('npm',['run','validate'],{cwd:this.workspace.repo,encoding:'utf8',timeout:300000,env:this.validationEnvironment()});
  if(owning.error||owning.status!==0)throw new EntityRegistryError('entity_registry_source_checks_failed');
  const output='lexi/entities-v1',result=spawnSync(process.execPath,['scripts/compile-entity-registry.mjs','--output',output],{cwd:this.workspace.repo,encoding:'utf8',timeout:150000,env:this.validationEnvironment()});
  if(result.error||result.status!==0)throw new EntityRegistryError('entity_registry_build_failed');
  let manifest;try {manifest=JSON.parse(this.workspace.readFile(output+'/manifest.json'));}catch{throw new EntityRegistryError('entity_registry_build_failed');}
  if(manifest.contract!=='gef-entity-registry-manifest-v1'||manifest.registry_revision!==record.registry_revision||manifest.source_sha256!==record.registry_sha256||!/^[a-f0-9]{64}$/u.test(manifest.package_sha256))throw new EntityRegistryError('entity_registry_build_binding_invalid');
  for(const [kind,file]of Object.entries({registry:'registry.json',sources:'sources.json',sqlite:'entities.sqlite'})) {
   const entry=manifest[kind],relative=entry&&`${output}/${entry.path}`;
   if(!entry||entry.path!==`${manifest.package_sha256}/${file}`||!this.generatedPath(relative)||!/^[a-f0-9]{64}$/u.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<1||entry.bytes>(kind==='sqlite'?16777216:8388608))throw new EntityRegistryError('entity_registry_build_binding_invalid');
   const bytes=fs.readFileSync(this.workspace.resolveInside(relative));if(bytes.length!==entry.bytes||registryDigest(bytes)!==entry.sha256)throw new EntityRegistryError('entity_registry_build_binding_invalid');
  }
  const publicRegistry=JSON.parse(this.workspace.readFile(`${output}/${manifest.registry.path}`));validateEntityRegistry(publicRegistry);
  validatePublicEntitySources(JSON.parse(this.workspace.readFile(`${output}/${manifest.sources.path}`)),{registry:publicRegistry});
  if(publicRegistry.entities.some(row=>Object.hasOwn(row,'research_notes')))throw new EntityRegistryError('entity_public_projection_private_fields');
  return this.journal.put({...record,published_projection_sha256:manifest.registry.sha256,published_package_sha256:manifest.package_sha256,published_sources_sha256:manifest.sources.sha256});
 }
 source() {
  const text=this.workspace.readFile(SOURCE_PATH);if(text===null)throw new EntityRegistryError('entity_registry_unavailable',503);
  let registry;try {registry=JSON.parse(text);}catch {throw new EntityRegistryError('entity_registry_invalid',503);}
  try {registry=validateEntityRegistry(registry);}catch {throw new EntityRegistryError('entity_registry_invalid',503);}
  return {registry,text};
 }
 fetch() { this.workspace.git(['fetch','--quiet','--no-tags',this.workspace.remote,'main'],{capture:false}); }
 remoteHead() {return this.workspace.git(['rev-parse',`${this.workspace.remote}/main`]);}
 ancestor(commit,tip) {try {this.workspace.git(['merge-base','--is-ancestor',commit,tip]);return true;}catch{return false;}}
 findCommit(record) {
  const commits=this.workspace.git(['log','--all','--format=%H','--fixed-strings',`--grep=Registry-Operation: ${record.key}`]).split('\n').filter(Boolean);
  for(const commit of commits) {const text=this.workspace.git(['show',`${commit}:${SOURCE_PATH}`]);if(registryDigest(text+'\n')===record.registry_sha256)return commit;}
  return null;
 }
 async recover(record) {
  if(TERMINAL.has(record.status)||record.status==='committed'&&!this.push)return record;
  if(!entityMutationInput.safeParse(record.input).success)throw new EntityRegistryError('entity_historical_intent_requires_content_reconciliation',409);
  this.fetch();const commit=record.commit??(record.registry_sha256?this.findCommit(record):null);
  if(!commit) {
   if(record.status==='reserved')return record;
   const head=this.workspace.syncToRemote();
   if(head!==record.base_source_revision||this.source().registry.revision!==record.input.expected_registry_revision) {
    this.journal.put({...record,status:'rejected',reason:'entity_registry_stale',finished_at:this.now()});throw new EntityRegistryError('entity_registry_stale',409);
   }
   if(registryDigest(record.source_content)!==record.registry_sha256)throw new EntityRegistryError('entity_operation_journal_invalid',503);
   this.workspace.applyFiles([{path:SOURCE_PATH,content:record.source_content}]);
   try {this.validateSource();record=this.buildSource(record);if(this.workspace.changedPaths().some(p=>p!==SOURCE_PATH&&!this.generatedPath(p)))throw new EntityRegistryError('entity_registry_unexpected_side_effects');}
   catch(error) {this.workspace.restore();this.journal.put({...record,status:'rejected',reason:'entity_registry_validation_failed',finished_at:this.now()});throw error;}
   const resumedCommit=this.workspace.commit({message:`Canonical entity ${record.input.action}`,trailers:{'Registry-Operation':record.key,'Registry-Request':record.request_id,'Registry-Actor':registryDigest(record.principal),'Registry-IDs':record.allocated_ids.join(', '),'Registry-Package':record.published_package_sha256??'none'}});
   record=this.journal.put({...record,status:'committed',commit:resumedCommit});
   return this.recover(record);
  }
  if(this.ancestor(commit,this.remoteHead()))return this.journal.put({...record,status:'published',commit,finished_at:this.now()});
  // A local committed intent must be settled before any reset-to-remote or different allocation.
  this.workspace.git(['reset','--quiet','--hard',commit],{capture:false});
  if(!this.ancestor(this.remoteHead(),commit)) {
   if(!this.workspace.rebaseOntoRemote())throw new EntityRegistryError('entity_registry_push_conflict',409);
   this.validateSource();
   if(registryDigest(this.workspace.readFile(SOURCE_PATH))!==record.registry_sha256)throw new EntityRegistryError('entity_registry_push_conflict',409);
  }
  const finalCommit=this.workspace.head();record=this.journal.put({...record,status:'committed',commit:finalCommit});
  if(this.push) {if(!this.workspace.push())throw new EntityRegistryError('entity_registry_push_conflict',409);record=this.journal.put({...record,status:'published',finished_at:this.now()});}
  return record;
 }
 async settlePending() {
  for(const record of this.journal.all()) {
   if(TERMINAL.has(record.status))continue;
   if(record.status==='reserved'){this.journal.put({...record,status:'rejected',reason:'interrupted_before_allocation',finished_at:this.now()});continue;}
   const recovered=await this.recover(record);
   if(!TERMINAL.has(recovered.status)&&!(recovered.status==='committed'&&!this.push))throw new EntityRegistryError('entity_registry_intent_pending',409);
  }
 }
 // Reads inspect only the locked local snapshot; they never run checkout scripts or recovery.
 async current(work) {return this.workspace.withLock(()=>{const source=this.observedSource();return work(source,source.head);});}
 async list(raw={}) {const query=entityQuery.parse(raw);return this.current(({registry,text},head)=>{
  if(query.expected_source_revision&&query.expected_source_revision!==head||query.expected_registry_revision&&query.expected_registry_revision!==registry.revision)throw new EntityRegistryError('entity_registry_stale',409);
  const retired=new Set(registry.redirects.map(r=>r.from_entity_id)),q=normalizeEntitySearch(query.q);
  const rows=registry.entities.filter(e=>!retired.has(e.entity_id)&&(!query.entity_type||e.entity_type===query.entity_type)&&(!q||[e.canonical_name,...e.names.map(n=>n.text),...e.legacy_ids].some(v=>normalizeEntitySearch(v).includes(q))));
  if(query.cursor>rows.length)throw new EntityRegistryError('entity_cursor_invalid',400);
  return {contract:'gef-studio-entity-registry-v1',source_revision:head,registry_revision:registry.revision,registry_sha256:registryDigest(text),total:rows.length,entities:rows.slice(query.cursor,query.cursor+query.limit).map(publicEntity),next_cursor:query.cursor+query.limit<rows.length?query.cursor+query.limit:null};
 });}
 async get(id) {entityId.parse(id);return this.current(({registry,text},head)=>{
  let resolved=id;const seen=new Set();while(registry.redirects.some(r=>r.from_entity_id===resolved)){if(seen.has(resolved))throw new EntityRegistryError('entity_redirect_cycle',503);seen.add(resolved);resolved=registry.redirects.find(r=>r.from_entity_id===resolved).to_entity_id;}
  const entity=registry.entities.find(e=>e.entity_id===resolved);if(!entity)throw new EntityRegistryError('entity_not_found',404);
  return {contract:'gef-studio-entity-registry-v1',requested_entity_id:id,entity:publicEntity(entity),source_revision:head,registry_revision:registry.revision,registry_sha256:registryDigest(text)};
 });}
 operation(principal,requestId) {const record=this.journal.get(principal,requestId);if(!record)throw new EntityRegistryError('entity_operation_not_found',404);return registryOperationReceipt(record);}
 allocate(prefix,used) {for(let n=0;n<100;n++){const suffix=this.uuid();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(suffix))throw Error('allocator_uuid_invalid');const id=`${prefix}_${suffix}`;if(!used.has(id)){used.add(id);return id;}}throw Error('allocator_uuid_collision');}
 async mutate(principal,raw,{requiredKind=null}={}) {
  if(!/^(user|agent):[A-Za-z0-9._:@-]{1,128}$/u.test(principal))throw new EntityRegistryError('invalid_principal',401);
  const input=entityRecordedMutationInput.parse(raw),inputSHA=registryDigest(JSON.stringify(canonicalIntent({input,requiredKind})));
  return this.workspace.withLock(async()=>{
   let record=this.journal.get(principal,input.request_id);
   if(record&&record.input_sha256!==inputSHA)throw new EntityRegistryError('idempotency_conflict',409);
   if(record&&TERMINAL.has(record.status))return registryOperationReceipt(record);
   if(record)throw new EntityRegistryError('entity_registry_intent_pending',409);
   entityMutationInput.parse(raw);
   const before=this.observedSource();
   if(before.head!==input.expected_source_revision||before.registry.revision!==input.expected_registry_revision)
    throw new EntityRegistryError('entity_registry_stale',409);
   await this.validateSource();
   const {head,registry,text}=this.observedSource();
   if(head!==before.head||text!==before.text||head!==input.expected_source_revision
    ||registry.revision!==input.expected_registry_revision)
    throw new EntityRegistryError('entity_registry_stale',409);
   // Admission completes before the first retained write or entity/child allocation.
   record=this.journal.put({contract:'gef-entity-operation-journal-v1',key:this.journal.key(principal,input.request_id),principal,request_id:input.request_id,input,input_sha256:inputSHA,required_kind:requiredKind,status:'reserved',allocated_ids:[],submitted_at:this.now()});
   if(record.status==='reserved') {
    const used=new Set([...registry.entities.flatMap(e=>[e.entity_id,...e.names.map(n=>n.label_id),...e.biographies.map(b=>b.biography_id),...(e.relationships??[]).map(r=>r.relationship_id)]),...this.journal.all().flatMap(r=>r.allocated_ids)]),ids=[];
    const allocate=prefix=>{const id=this.allocate(prefix,used);ids.push(id);return id;},next=structuredClone(registry),stamp=record.submitted_at;
    const active=id=>{if(next.redirects.some(r=>r.from_entity_id===id))throw new EntityRegistryError('entity_retired',409);const row=next.entities.find(e=>e.entity_id===id);if(!row)throw new EntityRegistryError('entity_not_found',404);if(requiredKind&&row.entity_type!==requiredKind)throw new EntityRegistryError('entity_kind_mismatch',409);return row;};
    try {
     if(input.action==='create'||input.action==='create-many') {
      const inputs=input.action==='create'?[{key:null,entity:input.entity}]:input.records;
      if(input.action==='create-many')record.entity_ids_by_key={};
      for(const item of inputs){
       if(requiredKind&&item.entity.entity_type!==requiredKind)throw new EntityRegistryError('entity_kind_mismatch',409);
       const data=structuredClone(item.entity),id=allocate('ent');data.names=data.names.map(n=>({...n,label_id:allocate('lbl'),review_state:'candidate'}));data.biographies=data.biographies.map(b=>({...b,biography_id:allocate('bio'),review_state:'candidate'}));if(data.relationships)data.relationships=data.relationships.map(r=>({...r,relationship_id:allocate('rel'),review_state:'candidate'}));
       next.entities.push({...data,entity_id:id,review_state:'candidate',created_at:stamp,updated_at:stamp});if(item.key===null)record.entity_id=id;else record.entity_ids_by_key[item.key]=id;
      }
     } else if(input.action==='merge') {
      if(input.from_entity_id===input.to_entity_id)throw new EntityRegistryError('entity_merge_self',409);const from=active(input.from_entity_id),to=active(input.to_entity_id);
      if(from.entity_type!==to.entity_type)throw new EntityRegistryError('entity_merge_kind_mismatch',409);
      from.review_state='superseded';from.updated_at=stamp;next.redirects.push({from_entity_id:from.entity_id,to_entity_id:to.entity_id,created_at:stamp,source_refs:input.source_refs,...(input.reason?{reason:input.reason}:{})});record.entity_id=to.entity_id;
     } else {
      const row=active(input.entity_id);record.entity_id=row.entity_id;
      if(input.action==='update'){if(input.patch.legacy_ids&&row.legacy_ids.some(id=>!input.patch.legacy_ids.includes(id)))throw new EntityRegistryError('entity_legacy_identity_retirement_forbidden',409);Object.assign(row,structuredClone(input.patch));}
      else {
       const isName=input.action==='upsert-name',isRelation=input.action==='upsert-relationship',field=isName?'names':isRelation?'relationships':'biographies',idField=isName?'label_id':isRelation?'relationship_id':'biography_id',entry=structuredClone(isName?input.name:isRelation?input.relationship:input.biography),existingId=entry[idField];if(!row[field])row[field]=[];const index=existingId?row[field].findIndex(e=>e[idField]===existingId):-1;
       if(existingId&&index<0)throw new EntityRegistryError('entity_child_not_found',404);
       if(!isName&&!isRelation&&index>=0&&row[field][index].work_id!==undefined)throw new EntityRegistryError('entity_work_biography_content_owned',409);
       entry[idField]=existingId??allocate(isName?'lbl':isRelation?'rel':'bio');entry.review_state='candidate';if(index<0)row[field].push(entry);else row[field][index]=entry;
      }
      row.review_state='candidate';row.updated_at=stamp;
     }
     if(registry.revision===Number.MAX_SAFE_INTEGER)throw new EntityRegistryError('entity_registry_revision_exhausted',409);next.revision=registry.revision+1;
     const content=serialize(next);record=this.journal.put({...record,status:'prepared',allocated_ids:ids,base_source_revision:head,registry_revision:next.revision,registry_sha256:registryDigest(content),source_content:content});
    } catch(error) {record=this.journal.put({...record,status:'rejected',allocated_ids:ids,reason:error.code??'entity_registry_mutation_invalid',finished_at:this.now()});throw error;}
   }
   this.assertWorkspace();
   this.workspace.applyFiles([{path:SOURCE_PATH,content:record.source_content}]);
   try {await this.validateSource();record=this.buildSource(record);this.assertWorkspace();if(this.workspace.changedPaths().some(p=>p!==SOURCE_PATH&&!this.generatedPath(p)))throw new EntityRegistryError('entity_registry_unexpected_side_effects');}
   catch(error) {this.assertWorkspace();this.workspace.restore();this.journal.put({...record,status:'rejected',reason:error.code??'entity_registry_validation_failed',finished_at:this.now()});throw error;}
   this.assertWorkspace();
   const commit=this.workspace.commit({message:`Canonical entity ${input.action}`,trailers:{'Registry-Operation':record.key,'Registry-Request':input.request_id,'Registry-Actor':registryDigest(principal),'Registry-IDs':record.allocated_ids.join(', '),'Registry-Package':record.published_package_sha256??'none'}});
   record=this.journal.put({...record,status:'committed',commit});
   // An uncertain/non-fast-forward push retains its committed intent for separately reviewed
   // reconciliation. Ordinary requests must not reset/rebase or recover historical operations.
   this.assertWorkspace();
   if(this.push&&this.workspace.push())record=this.journal.put({...record,status:'published',finished_at:this.now()});
   return registryOperationReceipt(record);
  });
 }
}
