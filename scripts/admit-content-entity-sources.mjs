#!/usr/bin/env node
/** Admit exact existing source evidence; never allocate source IDs or manufacture citation facts. */
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { resolve,dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Ajv from 'ajv';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const rawKeys=['source_id','title','creator','publication','date','url','source_kind','notes','institution','identifier','inspection','image_rights','rights_note','pages','transcript_url','transcript_urls','entry_ref','same_historical_source_as','relationship_note','locator'];
export function admitContentEntitySources(bibliography,artifacts) {
 const output=structuredClone(bibliography),byId=new Map(output.sources.map(row=>[row.source_id,row]));if(byId.size!==output.sources.length)throw new Error('entity_source_duplicate');
 for(const artifact of artifacts){const doc=JSON.parse(artifact.bytes.toString('utf8'));if(!Array.isArray(doc.sources))throw new Error('entity_content_sources_invalid');
 for(const [index,row]of doc.sources.entries()){
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!rawKeys.includes(k))||typeof row.source_id!=='string'||!/^src[-_][A-Za-z0-9._:-]+$/u.test(row.source_id)||typeof row.title!=='string'||!row.title.trim()||typeof row.source_kind!=='string'||!row.source_kind.trim())throw new Error('entity_content_source_invalid');
  const mapped={source_id:row.source_id,source_type:'other',title:row.title,source_kind:row.source_kind,content_source_provenance:{source_repo:'Clickabl/gef-content',source_path:artifact.path,source_sha256:sha(artifact.bytes),source_pointer:`/sources/${index}`,source_record:structuredClone(row)}};
  for(const key of ['creator','url','institution','identifier','pages','locator','transcript_url','transcript_urls'])if(Object.hasOwn(row,key))mapped[key]=structuredClone(row[key]);
  if(typeof row.publication==='string')mapped.source_publication=row.publication;if(typeof row.date==='string')mapped.source_date=row.date;
  const old=byId.get(row.source_id);if(old){if(old.content_source_provenance?.source_path!==artifact.path||JSON.stringify(old.content_source_provenance?.source_record)!==JSON.stringify(row))throw new Error('entity_source_identity_conflict');if(JSON.stringify(old)!==JSON.stringify(mapped)){const pos=output.sources.findIndex(s=>s.source_id===row.source_id);output.sources[pos]=mapped;byId.set(row.source_id,mapped);}}
  else{output.sources.push(mapped);byId.set(row.source_id,mapped);}
 }}return output;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),i=args.indexOf('--source'),check=args.includes('--check');if(i<0||!args[i+1]||args.some((a,n)=>n!==i+1&&!['--source','--check'].includes(a)))throw new Error('Use --source exact-content-checkout [--check]');
 const content=resolve(args[i+1]),artifacts=[];for(const work of readdirSync(join(content,'works')).sort()){const path=`works/${work}/sources.json`;try{artifacts.push({path,bytes:readFileSync(join(content,path))});}catch(error){if(error.code!=='ENOENT')throw error;}}
 const target=join(root,'sources/bibliography.json'),before=JSON.parse(readFileSync(target,'utf8')),next=admitContentEntitySources(before,artifacts);
 const schema=JSON.parse(readFileSync(join(root,'schemas/source.schema.json'),'utf8')),validate=new Ajv({allErrors:true,strict:false}).compile(schema);if(!validate(next))throw new Error(JSON.stringify(validate.errors));
 if(check){if(JSON.stringify(before)!==JSON.stringify(next))throw new Error('entity_content_source_admission_drift');}
 else writeFileSync(target,JSON.stringify(next,null,2)+'\n');console.log(JSON.stringify({status:check?'exact-source-admission':'admitted-existing-evidence',sourceArtifacts:artifacts.length,added:next.sources.length-before.sources.length,total:next.sources.length}));
}
