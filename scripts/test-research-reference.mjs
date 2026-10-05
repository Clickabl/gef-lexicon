/** Synthetic boundary cases; live corpus validation is run separately. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileResearchReference } from './compile-research-reference.mjs';

const schemas = Object.fromEntries([['names','name'],['families','name-family'],['sources','source']]
  .map(([key,file]) => [key,JSON.parse(readFileSync(new URL(`../schemas/${file}.schema.json`,import.meta.url)))]));
const bytes = value => Buffer.from(JSON.stringify(value));
const artifact = (path,value) => ({ path,bytes: bytes(value) });
const name = (id,text) => ({ name_id:id,canonical_form:text,name_type:'given',spellings:[{text,status:'canonical'}],
  review_state:'approved',source_refs:['src_test'] });
const form = (id,text,language,nameId) => ({form_id:id,text,language_tag:language,name_id:nameId,
  relation_type:'local_equivalent',review_state:'approved',source_refs:['src_test']});
function fixture() {
  return { lexiconRevision:'a'.repeat(40),registryRevision:'b'.repeat(40),schemas,
    registryBytes:bytes({lessonTiers:{tier1_full:['en'],tier2_selective:['es'],tier3_read_games:['el']}}),
    bibliographyArtifact:artifact('sources/bibliography.json',{schema_version:1,sources:[{source_id:'src_test',source_type:'other',title:'Test evidence'}]}),
    nameArtifacts:[artifact('names/en/names.json',{schema_version:1,language_code:'en',names:[name('name_en_alex','Alex')]}),
      artifact('names/es/names.json',{schema_version:1,language_code:'es',names:[name('name_es_ale','Ale')]}),
      artifact('names/el/names.json',{schema_version:1,language_code:'el',names:[name('name_el_full','Αλέξανδρος')]})],
    familyArtifacts:[artifact('name-families/alexander.json',{schema_version:1,family_id:'NF.alexander',family_key:'alexander',
      equivalence_sets:[{equivalence_set_id:'NFEQ.short',role:'short_unisex',forms:[form('NFF.en.alex','Alex','en','name_en_alex'),form('NFF.es.ale','Ale','es','name_es_ale')]},
        {equivalence_set_id:'NFEQ.full',role:'full_masculine',forms:[form('NFF.el.full','Αλέξανδρος','el','name_el_full')]}],
      review_state:'approved',source_refs:['src_test'],localization_policy:{fallback_order:['preserve_entered_form'],never_cross_equivalence_sets_automatically:true}})] };
}
function edit(input,key,index,mutate) {
  const item=input[key][index]; const value=JSON.parse(item.bytes);mutate(value);item.bytes=bytes(value);
}
const alex = result => result.references.find(row=>row.stable_id==='name_en_alex');
test('derives exact registry identities and preserves approved same-set coverage without crossing full-name roles',()=>{
  const input=fixture(),result=compileResearchReference(input);
  assert.deepEqual(result.languages,['en','es','el']);assert.deepEqual(alex(result).coverage.map(row=>[row.language_tag,row.status]),[['en','attested'],['es','attested']]);
  assert.equal(result.cohorts.length,0);assert.equal(result.references.length,3);
  const evidence=alex(result).coverage.find(row=>row.language_tag==='es').evidence_refs[0];
  assert.equal(evidence.content_hash,createHash('sha256').update(input.familyArtifacts[0].bytes).digest('hex'));
  assert.equal(evidence.commit_sha,input.lexiconRevision);
});
for (const reason of ['source-name','family','source-form','target-form','target-name']) test(`candidate ${reason} cannot create attested translated coverage`,()=>{
  const input=fixture();
  if(reason==='source-name')edit(input,'nameArtifacts',0,row=>row.names[0].review_state='candidate');
  if(reason==='target-name')edit(input,'nameArtifacts',1,row=>row.names[0].review_state='candidate');
  if(reason==='family')edit(input,'familyArtifacts',0,row=>row.review_state='candidate');
  if(reason==='source-form')edit(input,'familyArtifacts',0,row=>row.equivalence_sets[0].forms[0].review_state='candidate');
  if(reason==='target-form')edit(input,'familyArtifacts',0,row=>row.equivalence_sets[0].forms[1].review_state='candidate');
  assert.equal(alex(compileResearchReference(input)).coverage.find(row=>row.language_tag==='es').status,'candidate');
});
test('rejected source membership cannot give reusable cross-language coverage',()=>{
  const input=fixture();edit(input,'familyArtifacts',0,row=>row.equivalence_sets[0].forms[0].review_state='rejected');
  assert.deepEqual(alex(compileResearchReference(input)).coverage.map(row=>row.language_tag),['en']);
});
test('unknown evidence IDs, dangling identities and dangling explicit family references fail closed',()=>{
  for (const mutation of [
    input=>edit(input,'nameArtifacts',0,row=>row.names[0].source_refs=['missing']),
    input=>edit(input,'familyArtifacts',0,row=>row.equivalence_sets[0].forms[0].name_id='name_unknown'),
    input=>edit(input,'nameArtifacts',0,row=>row.names[0].family_refs=[{family_id:'NF.missing',equivalence_set_id:'NFEQ.missing'}]),
    input=>edit(input,'nameArtifacts',0,row=>row.names[0].family_refs=[{family_id:'NF.alexander',equivalence_set_id:'NFEQ.short',form_id:'NFF.es.ale'}]),
  ]) {const input=fixture();mutation(input);assert.throws(()=>compileResearchReference(input));}
});
test('duplicate inactive identities and unsafe/oversized artifacts are rejected',()=>{
  const duplicate=fixture();edit(duplicate,'nameArtifacts',0,row=>{row.names[0].review_state='rejected';row.names.push({...row.names[0]});});
  assert.throws(()=>compileResearchReference(duplicate),/Duplicate canonical name/);
  const unsafe=fixture();unsafe.nameArtifacts[0].path='names/en/../names.json';assert.throws(()=>compileResearchReference(unsafe));
  const oversized=fixture();oversized.nameArtifacts[0].bytes=Buffer.alloc(2_000_001);assert.throws(()=>compileResearchReference(oversized),/Oversized/);
});
test('unregistered language or duplicate representations cannot become product support',()=>{
  const input=fixture();edit(input,'familyArtifacts',0,row=>row.equivalence_sets[0].forms[1].language_tag='fr');assert.throws(()=>compileResearchReference(input),/Unregistered/);
  const duplicate=fixture();duplicate.registryBytes=bytes({lessonTiers:{tier1_full:['en'],tier2_selective:['en-US'],tier3_read_games:['el']}});
  assert.throws(()=>compileResearchReference(duplicate),/representation/);
});
test('artifact and registry evidence changes alter the projection while source revision remains explicit',()=>{
  const input=fixture(),first=compileResearchReference(input);
  edit(input,'familyArtifacts',0,row=>row.meaning_note='Changed evidence note');
  const second=compileResearchReference(input);assert.notDeepEqual(alex(first).coverage,alex(second).coverage);
  assert.equal(second.lexicon_revision,input.lexiconRevision);
  assert.equal(second.registry_sha256,createHash('sha256').update(input.registryBytes).digest('hex'));
});
