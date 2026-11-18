import fs from 'node:fs';
import {z} from 'zod';
import {entityRecordedMutationInput,entityKinds,entityId,entityRequestId} from './entityRegistryContracts.mjs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const registryDigest = value => createHash('sha256').update(value).digest('hex');
export function canonicalIntent(value) {
 if (Array.isArray(value)) return value.map(canonicalIntent);
 if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalIntent(value[key])]));
 return value;
}
const hash=z.string().regex(/^[a-f0-9]{64}$/u),revision=z.string().regex(/^[a-f0-9]{40}$/u),allocatedId=z.string().regex(/^(ent|lbl|bio|rel)_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
// Exact admitted v1 UTC grammar: optional seconds and Gregorian leap years, including year 0000.
// Keep these scalar semantics while using the patched v4 collection parser.
const date = String.raw`((\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\d|3[01])|(0[469]|11)-(0[1-9]|[12]\d|30)|(02)-(0[1-9]|1\d|2[0-8])))`;
const time = String.raw`([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?`;
const timestamp = z.string().regex(new RegExp(`^${date}T${time}Z$`));
const journalRecord=z.object({contract:z.literal('gef-entity-operation-journal-v1'),key:hash,principal:z.string().regex(/^(user|agent):[A-Za-z0-9._:@-]{1,128}$/u),request_id:entityRequestId,input:entityRecordedMutationInput,input_sha256:hash,required_kind:z.enum(entityKinds).nullable(),status:z.enum(['reserved','prepared','committed','published','rejected']),allocated_ids:z.array(allocatedId).max(230200).refine(ids=>new Set(ids).size===ids.length),submitted_at:timestamp,entity_id:entityId.optional(),entity_ids_by_key:z.record(z.string(),entityId).optional(),base_source_revision:revision.optional(),registry_revision:z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),registry_sha256:hash.optional(),source_content:z.string().optional(),published_projection_sha256:hash.optional(),published_package_sha256:hash.optional(),published_sources_sha256:hash.optional(),commit:revision.optional(),finished_at:timestamp.optional(),reason:z.string().regex(/^[a-z0-9_]+$/u).optional()}).strict();
/** Private durable intent/ID ledger, not a second entity database. Source remains in Lexicon. */
export class RegistryOperationJournal {
 constructor(directory) { this.directory=path.resolve(directory); fs.mkdirSync(this.directory,{recursive:true,mode:0o700}); this.all(); }
 key(principal,requestId) { return registryDigest(JSON.stringify([principal,requestId])); }
 get(principal,requestId) { const file=path.join(this.directory,`${this.key(principal,requestId)}.json`);return fs.existsSync(file)?this.read(file):null; }
 read(file) {
  let record;try{record=journalRecord.parse(JSON.parse(fs.readFileSync(file,'utf8')));}catch{throw Error('entity_operation_journal_invalid');}
  if(record.request_id!==record.input.request_id||record.key!==this.key(record.principal,record.request_id)||record.input_sha256!==registryDigest(JSON.stringify(canonicalIntent({input:record.input,requiredKind:record.required_kind}))))throw Error('entity_operation_journal_invalid');
  if(['prepared','committed','published'].includes(record.status)&&(!record.source_content||!record.registry_sha256||registryDigest(record.source_content)!==record.registry_sha256||record.registry_revision!==record.input.expected_registry_revision+1||record.base_source_revision!==record.input.expected_source_revision))throw Error('entity_operation_journal_invalid');
  if(['committed','published'].includes(record.status)&&(!record.commit||!record.published_projection_sha256||!record.published_package_sha256||!record.published_sources_sha256))throw Error('entity_operation_journal_invalid');
  if(record.entity_ids_by_key&&(record.input.action!=='create-many'||Object.keys(record.entity_ids_by_key).length!==record.input.records.length||record.input.records.some(row=>!Object.hasOwn(record.entity_ids_by_key,row.key)||!record.allocated_ids.includes(record.entity_ids_by_key[row.key]))||new Set(Object.values(record.entity_ids_by_key)).size!==record.input.records.length))throw Error('entity_operation_journal_invalid');
  if(path.basename(file)!==`${record.key}.json`)throw Error('entity_operation_journal_identity_mismatch');
  return record;
 }
 all() { return fs.readdirSync(this.directory).filter(n=>n.endsWith('.json')).sort().map(n=>this.read(path.join(this.directory,n))); }
 put(record) {
  const file=path.join(this.directory,`${record.key}.json`),temporary=path.join(this.directory,`.${record.key}.${randomUUID()}.tmp`);
  const descriptor=fs.openSync(temporary,'wx',0o600);
  try { fs.writeFileSync(descriptor,JSON.stringify(record)+'\n');fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
  fs.renameSync(temporary,file);
  const directory=fs.openSync(this.directory,'r');try {fs.fsyncSync(directory);}finally {fs.closeSync(directory);}
  return structuredClone(record);
 }
}
