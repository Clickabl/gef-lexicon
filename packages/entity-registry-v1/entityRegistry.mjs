/** Canonical reusable identity lookup. IDs arrive from the Server journal, never from labels. */
import { validateBibliographicDateFact, validateBibliographicLifespan } from './bibliographicContract.mjs';
export const ENTITY_REGISTRY_CONTRACT = 'gef-entity-registry-v1';
export const ENTITY_REGISTRY_LIMITS = Object.freeze({ entities: 100000, labels: 1000, biographies: 100, relationships: 1000, textBytes: 262144, sourceBytes: 67108864, publicBytes: 8388608 });
export const ENTITY_TYPES = Object.freeze(['person','real_person','historical_person','fictional_character','mythological_figure','organization','collective_creator','cultural_attribution','traditional_attribution','anonymous_attribution','unknown_attribution','publisher_attribution','publisher','place','country','geographic_region','literary_period','genre','literary_category','content_type','tradition','calendar','language','script','literary_movement','occupation','other']);
export const ENTITY_RELATIONSHIP_TARGET_TYPES = Object.freeze({birthplace:Object.freeze(['place','country','geographic_region']),death_place:Object.freeze(['place','country','geographic_region']),associated_country:Object.freeze(['country']),citizenship:Object.freeze(['country']),cultural_origin:Object.freeze(['country','geographic_region','tradition']),language_of_work:Object.freeze(['language']),literary_movement:Object.freeze(['literary_movement']),occupation:Object.freeze(['occupation']),member_of:Object.freeze(['organization','collective_creator']),attributed_tradition:Object.freeze(['tradition'])});
export const ENTITY_RELATIONSHIP_KINDS = Object.freeze(Object.keys(ENTITY_RELATIONSHIP_TARGET_TYPES));
const STATES = ['candidate','approved','superseded','rejected'];
const TRANSLATIONS = ['source','machine_translation','human_translation'];
const NAME_TYPES = ['canonical','original_script','localized','transliteration','romanization','pseudonym','historical','alias'];
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const encoder = new TextEncoder();
const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k);
const fail = code => { throw new TypeError(code); };
function object(v, allowed, required, code) {
 if (!v || typeof v !== 'object' || Array.isArray(v) || (Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null) || Object.keys(v).some(k=>!allowed.includes(k)) || required.some(k=>!own(v,k))) fail(code);
 return v;
}
function text(v, max=ENTITY_REGISTRY_LIMITS.textBytes) {
 if (typeof v !== 'string' || !v.trim() || encoder.encode(v).length>max || /[\u0000\ud800-\udfff]/u.test(v)) fail('entity_text_invalid');
 return v;
}
function identifier(v,prefix) { if(typeof v!=='string'||!new RegExp(`^${prefix}_${UUID}$`,'u').test(v)) fail('entity_id_invalid'); return v; }
function strings(v,max=1000) { if(!Array.isArray(v)||v.length>max) fail('entity_array_invalid'); for(const s of v)text(s,4000); if(new Set(v).size!==v.length)fail('entity_array_duplicate'); return v; }
function tag(v) { try { if(typeof v!=='string'||Intl.getCanonicalLocales(v)[0]!==v)fail('entity_language_invalid'); } catch {fail('entity_language_invalid');} }
function timestamp(v) { if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v.replace(/Z$/u,'.000Z').replace(/\.([0-9]{3})\.000Z$/u,'.$1Z'))fail('entity_timestamp_invalid'); }
function evidence(row) { strings(row.source_refs); if(!STATES.includes(row.review_state))fail('entity_review_invalid'); if(row.review_state==='approved'&&!row.source_refs.length)fail('entity_approved_evidence_missing'); }
function provenance(v) {
 object(v,['repository','path','revision_sha','field','source_review_state'],['repository','path','revision_sha'],'entity_provenance_invalid');
 if(!['gef-lexicon','gef-content','gef-expo'].includes(v.repository))fail('entity_provenance_invalid');
 text(v.path,2000);if(!/^[a-f0-9]{40}$/u.test(v.revision_sha))fail('entity_provenance_invalid');
 if(own(v,'field'))text(v.field,2000);if(own(v,'source_review_state'))text(v.source_review_state,100);
}
function localized(row,kind) {
 const label=kind==='label';
 object(row,label?['label_id','text','language_tag','script','name_type','translation_state','review_state','source_refs','source_provenance']:['biography_id','language_tag','short_text','long_text','translation_state','review_state','source_refs','work_id','source_provenance'],label?['label_id','text','name_type','translation_state','review_state','source_refs']:['biography_id','language_tag','translation_state','review_state','source_refs'],'entity_localized_row_invalid');
 identifier(row[label?'label_id':'biography_id'],label?'lbl':'bio');evidence(row);
 if(!TRANSLATIONS.includes(row.translation_state))fail('entity_translation_invalid');
 if(own(row,'language_tag'))tag(row.language_tag); else if(row.translation_state!=='source')fail('entity_translation_language_missing');
 if(label) {text(row.text,4000);if(!NAME_TYPES.includes(row.name_type))fail('entity_name_type_invalid');if(own(row,'script')&&!/^[A-Z][a-z]{3}$/u.test(row.script))fail('entity_script_invalid');}
 else {if(!own(row,'short_text')&&!own(row,'long_text'))fail('entity_biography_empty');if(own(row,'short_text'))text(row.short_text);if(own(row,'long_text'))text(row.long_text);if(own(row,'work_id'))text(row.work_id,500);}
 if(own(row,'source_provenance'))provenance(row.source_provenance);
}
/** Validate exact source records without adding a language, review, biography, or identifier. */
export function validateEntityRegistry(input,{bibliography}={}) {
 object(input,['schema_version','contract','revision','entities','redirects'],['schema_version','contract','revision','entities','redirects'],'entity_registry_invalid');
 if(input.schema_version!==2||input.contract!==ENTITY_REGISTRY_CONTRACT||!Number.isSafeInteger(input.revision)||input.revision<1)fail('entity_registry_version_invalid');
 if(!Array.isArray(input.entities)||input.entities.length>ENTITY_REGISTRY_LIMITS.entities||!Array.isArray(input.redirects)||input.redirects.length>ENTITY_REGISTRY_LIMITS.entities)fail('entity_registry_count_invalid');
 if(encoder.encode(JSON.stringify(input)).length>ENTITY_REGISTRY_LIMITS.sourceBytes)fail('entity_registry_bytes_exceeded');
 const ids=new Map(), labels=new Set(), bios=new Set(), relationships=new Set(), aliases=new Map(), refs=[];
 const temporalRefs=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(temporalRefs);return;}for(const [key,child]of Object.entries(value)){if(key==='source_id')refs.push(child);else temporalRefs(child);}};
 for(const row of input.entities) {
  object(row,['entity_id','entity_type','canonical_name','canonical_name_language_tag','names','biographies','external_ids','legacy_ids','source_refs','created_at','updated_at','review_state','research_notes','source_provenance','birth_date','death_date','birth','death','relationships'],['entity_id','entity_type','canonical_name','names','biographies','external_ids','legacy_ids','source_refs','created_at','updated_at','review_state'],'entity_record_invalid');
  identifier(row.entity_id,'ent');if(ids.has(row.entity_id))fail('entity_duplicate');ids.set(row.entity_id,row);
  if(!ENTITY_TYPES.includes(row.entity_type))fail('entity_type_invalid');text(row.canonical_name,4000);if(own(row,'canonical_name_language_tag'))tag(row.canonical_name_language_tag);
  evidence(row);refs.push(...row.source_refs);timestamp(row.created_at);timestamp(row.updated_at);if(Date.parse(row.updated_at)<Date.parse(row.created_at))fail('entity_timestamp_order_invalid');
  if(!Array.isArray(row.names)||row.names.length>ENTITY_REGISTRY_LIMITS.labels||!Array.isArray(row.biographies)||row.biographies.length>ENTITY_REGISTRY_LIMITS.biographies)fail('entity_localization_count_invalid');
  for(const name of row.names){localized(name,'label');if(labels.has(name.label_id))fail('entity_label_duplicate');labels.add(name.label_id);refs.push(...name.source_refs);}
  for(const bio of row.biographies){localized(bio,'biography');if(bios.has(bio.biography_id))fail('entity_biography_duplicate');bios.add(bio.biography_id);refs.push(...bio.source_refs);}
  object(row.external_ids,Object.keys(row.external_ids??{}),[],'entity_external_ids_invalid');for(const [kind,values] of Object.entries(row.external_ids)){if(!/^[a-z][a-z0-9_]{0,63}$/u.test(kind))fail('entity_external_kind_invalid');strings(values,100);}
  strings(row.legacy_ids);for(const alias of row.legacy_ids){if(aliases.has(alias))fail('entity_legacy_id_duplicate');aliases.set(alias,row.entity_id);}
  if(own(row,'research_notes'))text(row.research_notes);if(own(row,'source_provenance'))provenance(row.source_provenance);
  for(const key of ['birth_date','death_date'])if(own(row,key)&&row[key]!==null)text(row[key],200);
  for(const key of ['birth','death'])if(own(row,key)&&validateBibliographicDateFact(row[key]).length)fail('entity_temporal_fact_invalid');
  if(validateBibliographicLifespan(row.birth,row.death).length)fail('entity_lifespan_invalid');temporalRefs(row.birth);temporalRefs(row.death);
  if(own(row,'relationships')){if(!Array.isArray(row.relationships)||row.relationships.length>ENTITY_REGISTRY_LIMITS.relationships)fail('entity_relationship_count_invalid');for(const rel of row.relationships){
   object(rel,['relationship_id','kind','target_entity_id','certainty','review_state','source_refs','period','historical_context','source_provenance'],['relationship_id','kind','target_entity_id','certainty','review_state','source_refs'],'entity_relationship_invalid');identifier(rel.relationship_id,'rel');if(relationships.has(rel.relationship_id))fail('entity_relationship_duplicate');relationships.add(rel.relationship_id);identifier(rel.target_entity_id,'ent');
   if(!ENTITY_RELATIONSHIP_KINDS.includes(rel.kind)||!['known','approximate','unknown','disputed'].includes(rel.certainty))fail('entity_relationship_kind_invalid');evidence(rel);if(['known','approximate'].includes(rel.certainty)&&!rel.source_refs.length)fail('entity_relationship_evidence_missing');refs.push(...rel.source_refs);
   if(own(rel,'period')){object(rel.period,['start','end'],[],'entity_relationship_period_invalid');if(!Object.keys(rel.period).length||validateBibliographicLifespan(rel.period.start,rel.period.end).length)fail('entity_relationship_period_invalid');temporalRefs(rel.period);}
   if(own(rel,'historical_context')){object(rel.historical_context,['text','language_tag'],['text'],'entity_relationship_context_invalid');text(rel.historical_context.text);if(own(rel.historical_context,'language_tag'))tag(rel.historical_context.language_tag);}
   if(own(rel,'source_provenance'))provenance(rel.source_provenance);
  }}
 }
 for(const [alias] of aliases)if(ids.has(alias))fail('entity_legacy_id_collision');
 const redirects=new Map();
 for(const redirect of input.redirects){object(redirect,['from_entity_id','to_entity_id','created_at','source_refs','reason'],['from_entity_id','to_entity_id','created_at','source_refs'],'entity_redirect_invalid');identifier(redirect.from_entity_id,'ent');identifier(redirect.to_entity_id,'ent');timestamp(redirect.created_at);strings(redirect.source_refs);refs.push(...redirect.source_refs);if(own(redirect,'reason'))text(redirect.reason,4000);if(redirects.has(redirect.from_entity_id))fail('entity_redirect_duplicate');if(!ids.has(redirect.from_entity_id)||!ids.has(redirect.to_entity_id))fail('entity_redirect_orphan');redirects.set(redirect.from_entity_id,redirect.to_entity_id);}
 for(const id of redirects.keys()){const seen=new Set();let cursor=id;while(redirects.has(cursor)){if(seen.has(cursor))fail('entity_redirect_cycle');seen.add(cursor);cursor=redirects.get(cursor);}}
 const effective=id=>{while(redirects.has(id))id=redirects.get(id);return id;};
 const checkCalendars=value=>{if(!value||typeof value!=='object')return;if(value.source_calendar_entity_id&&ids.get(effective(value.source_calendar_entity_id))?.entity_type!=='calendar')fail('entity_calendar_orphan');for(const child of Object.values(value))if(Array.isArray(child))child.forEach(checkCalendars);else checkCalendars(child);};
 for(const row of input.entities){checkCalendars(row.birth);checkCalendars(row.death);for(const rel of row.relationships??[]){const target=ids.get(effective(rel.target_entity_id));if(!target)fail('entity_relationship_target_orphan');if(!ENTITY_RELATIONSHIP_TARGET_TYPES[rel.kind].includes(target.entity_type))fail('entity_relationship_target_kind_invalid');checkCalendars(rel.period);}}
 const external=new Map();for(const row of input.entities)for(const [kind,values] of Object.entries(row.external_ids))for(const value of values){const key=JSON.stringify([kind,value]),id=effective(row.entity_id);if(external.has(key)&&external.get(key)!==id)fail('entity_external_identity_conflict');external.set(key,id);}
 if(bibliography){if(!Array.isArray(bibliography.sources))fail('entity_bibliography_invalid');const sources=new Set(bibliography.sources.map(s=>s.source_id));if(sources.size!==bibliography.sources.length)fail('entity_bibliography_duplicate');for(const ref of refs)if(!sources.has(ref))fail('entity_source_orphan');}
 return structuredClone(input);
}
export function resolveEntityId(registry,value) {
 let id=registry.entities.some(e=>e.entity_id===value)?value:registry.entities.find(e=>e.legacy_ids.includes(value))?.entity_id;
 if(!id)return undefined;const seen=new Set();for(;;){if(seen.has(id))fail('entity_redirect_cycle');seen.add(id);const next=registry.redirects.find(r=>r.from_entity_id===id)?.to_entity_id;if(!next)return registry.entities.some(e=>e.entity_id===id)?id:undefined;id=next;}
}
const admitted=(state,mode)=>state==='approved'||(mode==='beta'&&state==='candidate');
/** Same writing-representation policy as App localeRendering: no extension/variant/script inheritance. */
export function entityWritingRepresentationCompatible(requestedTag,actualTag,actualScript,defaultRepresentations={}) {
 try {
  const requested=Intl.getCanonicalLocales(requestedTag)[0],actual=Intl.getCanonicalLocales(actualTag)[0];
  if(!requested||!actual)return false;
  if(requested===actual&&!actualScript)return true;
  const left=new Intl.Locale(requested),declared=new Intl.Locale(actual);
  if(actualScript&&declared.script&&actualScript!==declared.script)return false;
  const right=actualScript?new Intl.Locale(actual,{script:actualScript}):declared;
  if(requested===actual&&(!actualScript||!left.script||left.script===actualScript)) {
   if(!actualScript)return true;
   // An explicitly supplied row script still constrains a bare/regional request.
  }
  if(left.language!==right.language)return false;
  if(left.toString()!==left.baseName||right.toString()!==right.baseName)return requested===right.toString();
  const variants=locale=>locale.baseName.split('-').slice(1).filter(part=>!/^([A-Z][a-z]{3}|[A-Z]{2}|[0-9]{3})$/u.test(part)).join('-');
  if(variants(left)!==variants(right))return false;
  const script=locale=>locale.script??(locale.region?locale.maximize().script:new Intl.Locale(defaultRepresentations[locale.language]??locale.language).maximize().script);
  const a=script(left),b=script(right);return Boolean(a&&b&&a===b);
 }catch{return false;}
}
const languageMatch=(row,requested,defaults)=>Boolean(row.language_tag&&entityWritingRepresentationCompatible(requested,row.language_tag,row.script,defaults));
/** Preserve exact source text and its real language; never claim the requested language for fallback. */
export function resolveEntityName(entity,languageTag,{mode='reviewed',defaultRepresentations={}}={}) {
 const rows=entity.names.filter(row=>admitted(row.review_state,mode)&&row.name_type!=='alias');
 const select=requested=>rows.find(row=>row.language_tag===requested&&languageMatch(row,requested,defaultRepresentations)&&row.name_type==='localized')??rows.find(row=>languageMatch(row,requested,defaultRepresentations)&&row.name_type==='localized')??rows.find(row=>languageMatch(row,requested,defaultRepresentations));
 const row=(languageTag?select(languageTag):undefined)??select('en');
 return row?{text:row.text,language_tag:row.language_tag,label_id:row.label_id,review_state:row.review_state,translation_state:row.translation_state,source_refs:[...row.source_refs]}:{text:entity.canonical_name,...(entity.canonical_name_language_tag?{language_tag:entity.canonical_name_language_tag}:{}),review_state:entity.review_state,translation_state:'source',source_refs:[...entity.source_refs]};
}
export function resolveEntityBiography(entity,languageTag,{mode='reviewed',workId,kind='short',defaultRepresentations={}}={}) {
 const eligible=entity.biographies.filter(row=>admitted(row.review_state,mode)&&(!row.work_id||(workId&&row.work_id===workId))&&(kind==='short'?row.short_text:row.long_text));
 const row=eligible.find(row=>languageTag&&row.language_tag===languageTag&&languageMatch(row,languageTag,defaultRepresentations))??eligible.find(row=>languageTag&&languageMatch(row,languageTag,defaultRepresentations))??eligible.find(row=>languageMatch(row,'en',defaultRepresentations));
 return row?{text:kind==='short'?row.short_text:row.long_text,language_tag:row.language_tag,biography_id:row.biography_id,review_state:row.review_state,translation_state:row.translation_state,source_refs:[...row.source_refs],...(row.work_id?{work_id:row.work_id}:{})}:undefined;
}
const latinFold=value=>/^[\p{Script_Extensions=Latin}\p{M}\p{N}\p{P}\p{Z}]*$/u.test(value)?value.normalize('NFD').replace(/\p{M}/gu,''):undefined;
export const normalizeEntitySearch=text=>text.normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('und');
/** Distinct identities stay distinct even when names/aliases share a caption. */
export function searchEntities(registry,query,{mode='reviewed',limit=50,entityType}={}) {
 const q=normalizeEntitySearch(query);if(!q)return [];if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail('entity_search_limit_invalid');
 const matches=new Map();for(const row of registry.entities){const target=resolveEntityId(registry,row.entity_id);const active=registry.entities.find(e=>e.entity_id===target);const historical=row.review_state==='superseded'&&target!==row.entity_id&&active?.entity_type===row.entity_type;if(!admitted(row.review_state,mode)&&!historical)continue;if(!active||!admitted(active.review_state,mode)||(entityType&&active.entity_type!==entityType))continue;const captions=[{text:row.canonical_name,source_refs:row.source_refs,review_state:row.review_state},...row.names.filter(n=>admitted(n.review_state,mode))];for(const name of captions){const normalized=normalizeEntitySearch(name.text),fold=latinFold(normalized),foldedQuery=latinFold(q),rank=normalized===q?0:normalized.startsWith(q)?1:normalized.includes(q)?2:fold&&foldedQuery&&fold===foldedQuery?3:fold&&foldedQuery&&fold.startsWith(foldedQuery)?4:undefined;if(rank===undefined)continue;const previous=matches.get(target);if(!previous||rank<previous.rank)matches.set(target,{entity_id:target,entity_type:active.entity_type,matched_name:name.text,matched_source_entity_id:row.entity_id,matched_review_state:name.review_state,...(name.language_tag?{language_tag:name.language_tag}:{}),rank});}}
 return [...matches.values()].sort((a,b)=>a.rank-b.rank||(a.entity_id<b.entity_id?-1:a.entity_id>b.entity_id?1:0)).slice(0,limit);
}
export function publicEntityRegistry(registry) {const copy=structuredClone(registry);return {...copy,entities:copy.entities.map(({research_notes,...row})=>row)};}
