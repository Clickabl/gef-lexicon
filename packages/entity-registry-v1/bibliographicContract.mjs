/** Generated from gef-content canonical bibliography; do not edit. */
export const TEMPORAL_SOURCE_HASHES = {"schema":"e76c0799c6390ccc67596bf55e4aa7f900ca0d29c9b8e814412e06aa03c37833","validator":"e55f431c91b3b3ef17e0c8541b97f31615477cdbb031827af710f69a1fb8f07a"};
export const bibliographySchema = {"$schema":"http://json-schema.org/draft-07/schema#","$id":"gef-content/bibliographic-metadata.schema.json","title":"Bibliographic metadata","description":"Evidence-bearing literary facts only. Composition, original first publication and exact-edition/reprint events stay separate; no rights, review or release permission. Signed astronomical years; unknown dates have no value. Known/approximate facts carry evidence; disputed dates retain alternatives.","definitions":{"evidence":{"type":"object","additionalProperties":false,"properties":{"citation":{"type":"string","minLength":1,"maxLength":2000},"url":{"type":"string","pattern":"^https://[^\\s]+$","maxLength":4000},"source_id":{"type":"string","minLength":1,"maxLength":200},"locator":{"type":"string","minLength":1,"maxLength":1000}},"required":["citation"]},"dateValue":{"type":"object","additionalProperties":false,"properties":{"year":{"type":"integer","minimum":-9999,"maximum":9999},"date":{"type":"string","pattern":"^-?[0-9]{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12][0-9]|3[01]))?)?$"},"earliest_year":{"type":"integer","minimum":-9999,"maximum":9999},"latest_year":{"type":"integer","minimum":-9999,"maximum":9999}},"required":[]},"dateFact":{"type":"object","additionalProperties":false,"properties":{"certainty":{"type":"string","enum":["known","approximate","unknown","disputed"]},"value":{"$ref":"#/definitions/dateValue"},"alternatives":{"type":"array","maxItems":30,"items":{"type":"object","additionalProperties":false,"properties":{"value":{"$ref":"#/definitions/dateValue"},"evidence":{"type":"array","maxItems":30,"items":{"$ref":"#/definitions/evidence"}},"source_calendar_entity_id":{"type":"string","pattern":"^ent_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$"},"source_notation":{"type":"string","minLength":1,"maxLength":4000,"description":"Exact original source date notation, not a UI formatting string."},"source_precision":{"enum":["year","month","day","range"],"type":"string"},"normalized_gregorian_value":{"$ref":"#/definitions/dateValue","description":"Optional separately evidenced Gregorian comparison value; preserve source precision and notation."},"conversion_evidence":{"type":"array","minItems":1,"maxItems":30,"items":{"$ref":"#/definitions/evidence"}}},"required":["evidence"]}},"evidence":{"type":"array","maxItems":30,"items":{"$ref":"#/definitions/evidence"}},"notes":{"type":"string","minLength":1,"maxLength":4000},"source_calendar_entity_id":{"type":"string","pattern":"^ent_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$"},"source_notation":{"type":"string","minLength":1,"maxLength":4000,"description":"Exact original source date notation, not a UI formatting string."},"source_precision":{"enum":["year","month","day","range"],"type":"string"},"normalized_gregorian_value":{"$ref":"#/definitions/dateValue","description":"Optional separately evidenced Gregorian comparison value; preserve source precision and notation."},"conversion_evidence":{"type":"array","minItems":1,"maxItems":30,"items":{"$ref":"#/definitions/evidence"}}},"required":["certainty","evidence"]},"nameForm":{"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","minLength":1,"maxLength":1000},"language":{"type":"string","minLength":1,"maxLength":64},"script":{"type":"string","pattern":"^[A-Z][a-z]{3}$"},"kind":{"type":"string","enum":["original-script","published","pseudonym","alias"]},"certainty":{"type":"string","enum":["known","approximate","unknown","disputed"]},"evidence":{"type":"array","maxItems":30,"items":{"$ref":"#/definitions/evidence"}}},"required":["name","kind","certainty","evidence"]},"personFact":{"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","minLength":1,"maxLength":1000},"person_id":{"type":"string","minLength":1,"maxLength":200},"role":{"type":"string","enum":["author","compiler","collector","translator","editor","illustrator","adapter","contributor","narrator","performer","arranger","composer","lyricist","publisher"]},"certainty":{"type":"string","enum":["known","approximate","unknown","disputed"]},"names":{"type":"array","maxItems":100,"items":{"$ref":"#/definitions/nameForm"}},"birth":{"$ref":"#/definitions/dateFact"},"death":{"$ref":"#/definitions/dateFact"},"evidence":{"type":"array","maxItems":30,"items":{"$ref":"#/definitions/evidence"}},"notes":{"type":"string","minLength":1,"maxLength":4000},"entity_id":{"type":"string","pattern":"^ent_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$","description":"Canonical reusable entity reference allocated by the single Server authoring authority; role belongs to this source relationship. Legacy name/person_id remain compatibility/source facts."}},"required":["name","role","certainty","evidence"]},"titleFact":{"type":"object","additionalProperties":false,"properties":{"title":{"type":"string","minLength":1,"maxLength":1000},"language":{"type":"string","minLength":1,"maxLength":64},"script":{"type":"string","pattern":"^[A-Z][a-z]{3}$"},"kind":{"type":"string","enum":["original","published","localized","alternate"]},"certainty":{"type":"string","enum":["known","approximate","unknown","disputed"]},"evidence":{"type":"array","maxItems":30,"items":{"$ref":"#/definitions/evidence"}},"notes":{"type":"string","minLength":1,"maxLength":4000}},"required":["title","language","kind","certainty","evidence"]},"publicationFact":{"type":"object","additionalProperties":false,"properties":{"date":{"$ref":"#/definitions/dateFact"},"publisher":{"type":"string","minLength":1,"maxLength":1000},"place":{"type":"string","minLength":1,"maxLength":1000},"country_codes":{"type":"array","maxItems":100,"items":{"type":"string","pattern":"^[A-Z]{2}$"}},"language":{"type":"string","minLength":1,"maxLength":64},"edition_label":{"type":"string","minLength":1,"maxLength":1000},"event_kind":{"type":"string","enum":["first-publication","edition-publication","translation-publication","reprint","serialization-start","serialization-end","first-volume-publication","standalone-publication","oral-circulation","manuscript-circulation"]},"certainty":{"type":"string","enum":["known","approximate","unknown","disputed"]},"evidence":{"type":"array","maxItems":30,"items":{"$ref":"#/definitions/evidence"}},"notes":{"type":"string","minLength":1,"maxLength":4000},"publisher_entity_id":{"type":"string","pattern":"^ent_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$"},"place_entity_id":{"type":"string","pattern":"^ent_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$"},"language_entity_id":{"type":"string","pattern":"^ent_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$"},"country_entity_ids":{"type":"array","uniqueItems":true,"maxItems":100,"items":{"type":"string","pattern":"^ent_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$"}}},"required":["date","event_kind","certainty","evidence"]},"workBibliography":{"type":"object","additionalProperties":false,"properties":{"composition":{"$ref":"#/definitions/dateFact"},"first_publication":{"$ref":"#/definitions/publicationFact"},"titles":{"type":"array","maxItems":200,"items":{"$ref":"#/definitions/titleFact"}},"contributors":{"type":"array","maxItems":200,"items":{"$ref":"#/definitions/personFact"}},"publication_events":{"type":"array","maxItems":200,"items":{"$ref":"#/definitions/publicationFact"},"description":"Other evidenced work-publication history. Canonical earliest public event remains first_publication; no duplicate first-publication authority."}},"required":[]},"editionBibliography":{"type":"object","additionalProperties":false,"properties":{"edition_publication":{"$ref":"#/definitions/publicationFact"},"titles":{"type":"array","maxItems":200,"items":{"$ref":"#/definitions/titleFact"}},"contributors":{"type":"array","maxItems":200,"items":{"$ref":"#/definitions/personFact"}}},"required":[]},"metadataProvenance":{"type":"object","additionalProperties":false,"required":["review_state","evidence","authoring_ref"],"properties":{"review_state":{"type":"string","enum":["machine-draft","machine-reviewed","human-reviewed","school-approved"]},"evidence":{"type":"array","minItems":1,"maxItems":30,"items":{"$ref":"#/definitions/evidence"}},"authoring_ref":{"type":"string","minLength":1,"maxLength":200},"reviewer_ref":{"type":"string","minLength":1,"maxLength":200},"reviewed_at":{"type":"string","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{3})?Z$","maxLength":100}}},"editionBibliographySource":{"type":"object","additionalProperties":false,"required":["kind","source_edition_sha256","metadata_provenance","artifact"],"properties":{"kind":{"const":"sidecar"},"source_edition_sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"metadata_provenance":{"$ref":"#/definitions/metadataProvenance"},"artifact":{"type":"object","additionalProperties":false,"required":["path","media_type","sha256","byte_size"],"properties":{"path":{"type":"string","pattern":"^metadata/edition-bibliography/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\\.json$"},"media_type":{"const":"application/json"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byte_size":{"type":"integer","minimum":1}}}}}}};
export function expandedBibliography(scope) {
 const expand=s=>s.$ref?expand(bibliographySchema.definitions[s.$ref.split('/').at(-1)]):Object.fromEntries(Object.entries(s).map(([k,v])=>[k,Array.isArray(v)?v.map(x=>x&&typeof x==='object'?expand(x):x):v&&typeof v==='object'?expand(v):v]));
 return expand(bibliographySchema.definitions[scope==='work'?'workBibliography':'editionBibliography']);
}
export function validateBibliographicShape(value,schema) {
 const errors=[];
 function check(v,s,path) {
  if(Object.hasOwn(s,'const')&&v!==s.const){errors.push(path+': invalid constant');return;}
  if(s.enum&&!s.enum.includes(v)){errors.push(path+': invalid enum');return;}
  if(s.$ref){check(v,bibliographySchema.definitions[s.$ref.split('/').at(-1)],path);return;}
  if(s.type==='object'){
   if(!v||typeof v!=='object'||Array.isArray(v)){errors.push(path+': expected object');return;}
   for(const key of s.required??[])if(!Object.hasOwn(v,key))errors.push(path+'.'+key+': required');
   for(const key of Object.keys(v)){if(!Object.hasOwn(s.properties,key)){errors.push(path+'.'+key+': unknown field');continue;}check(v[key],s.properties[key],path+'.'+key);}
  }else if(s.type==='array'){
   if(!Array.isArray(v)){errors.push(path+': expected array');return;}if(v.length>(s.maxItems??Infinity))errors.push(path+': too many values');if(v.length<(s.minItems??0))errors.push(path+': too few values');
   v.forEach((x,i)=>check(x,s.items,path+'['+i+']'));
  }else if(s.type==='string'){
   if(typeof v!=='string'||s.minLength&&!v.trim()||v.length<(s.minLength??0)||v.length>(s.maxLength??Infinity)||s.pattern&&!new RegExp(s.pattern).test(v)||s.enum&&!s.enum.includes(v))errors.push(path+': invalid string');
  }else if(s.type==='integer'&&(!Number.isInteger(v)||v<s.minimum||v>s.maximum))errors.push(path+': invalid year');
 }
 check(value,schema,'bibliography');
 return errors;
}
 function dateValue(v,p,errors){
  if(!Object.keys(v).length)errors.push(p+': date value is empty');
  if(v.earliest_year!==undefined&&v.latest_year!==undefined&&v.earliest_year>v.latest_year)errors.push(p+': reversed date range');
  let dateYear;
  if(v.date){const parts=/^(-?\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(v.date);const y=Number(parts[1]),m=Number(parts[2]),d=Number(parts[3]);dateYear=y;
   if(v.year!==undefined&&v.year!==y)errors.push(p+': conflicting date/year');
   if(d){const calendar=new Date(0);calendar.setUTCFullYear(y,m-1,d);if(calendar.getUTCFullYear()!==y||calendar.getUTCMonth()!==m-1||calendar.getUTCDate()!==d)errors.push(p+': invalid calendar date');}}
  const asserted=v.year??dateYear;
  if(asserted!==undefined&&(v.earliest_year!==undefined&&asserted<v.earliest_year||v.latest_year!==undefined&&asserted>v.latest_year))errors.push(p+': date outside stated range');
 }
 // Compare only declared date periods; overlapping/unknown/disputed lifespans stay unresolved.
 function dateBounds(v){
  if(!v)return {};
  const parts=v.date?/^(-?\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(v.date):null,year=v.year??(parts?Number(parts[1]):undefined);
  const instant=(y,m,d)=>{const date=new Date(0);date.setUTCFullYear(y,m,d);return date.getTime();};
  if(v.earliest_year!==undefined||v.latest_year!==undefined)return {...(v.earliest_year===undefined?{}:{first:instant(v.earliest_year,0,1)}),...(v.latest_year===undefined?{}:{last:instant(v.latest_year,11,31)})};
  if(year!==undefined)return {first:instant(year,parts?.[2]?Number(parts[2])-1:0,parts?.[3]?Number(parts[3]):1),last:parts?.[3]?instant(year,Number(parts[2])-1,Number(parts[3])):parts?.[2]?instant(year,Number(parts[2]),0):instant(year,11,31)};
  return {};
 }
 function fact(v,p,errors){
  if(['known','approximate'].includes(v.certainty)&&!v.evidence.length)errors.push(p+': evidence required for asserted fact');
  if(v.value)dateValue(v.value,p+'.value',errors);
  if(v.normalized_gregorian_value)dateValue(v.normalized_gregorian_value,p+'.normalized_gregorian_value',errors);
  if(v.alternatives)v.alternatives.forEach((a,i)=>{fact({...a,certainty:'known'},p+'.alternatives['+i+'].date',errors);});
  if(v.certainty==='unknown'&&(v.value||v.normalized_gregorian_value||v.alternatives?.length||v.source_precision))errors.push(p+': unknown cannot assert a date');
  const sourceFields=['source_calendar_entity_id','source_notation','source_precision'];
  const hasSource=sourceFields.every(key=>Object.hasOwn(v,key));
  if(sourceFields.some(key=>Object.hasOwn(v,key))&&!hasSource)errors.push(p+': source date requires calendar, exact notation and precision');
  if(['known','approximate'].includes(v.certainty)&&!v.value&&!v.normalized_gregorian_value&&!hasSource&&p.endsWith('.date'))errors.push(p+': asserted date requires Gregorian value or evidenced source date');
  if(v.normalized_gregorian_value){
   if(!hasSource||!v.conversion_evidence?.length)errors.push(p+': normalized Gregorian value requires original source date and conversion evidence');
   const normalized=v.normalized_gregorian_value,parts=normalized.date?.split('-').filter(Boolean);
   const depth=parts?.length??(normalized.year!==undefined?1:0);
   if(v.source_precision==='year'&&depth>1||v.source_precision==='month'&&depth>2||v.source_precision==='range'&&depth>0)errors.push(p+': normalization invents source precision');
   if(v.value){const ordered=x=>JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))));if(ordered(v.value)!==ordered(normalized))errors.push(p+': Gregorian values conflict');}
  }else {if(v.conversion_evidence?.length)errors.push(p+': conversion evidence requires a normalized Gregorian value');if(hasSource&&v.value)errors.push(p+': source-calendar date with Gregorian value requires explicit normalization and conversion evidence');}
 }
 function date(v,p,errors){fact(v,p+'.date',errors);if(v.certainty==='disputed'){
  if(v.value||v.normalized_gregorian_value||v.source_precision)errors.push(p+': disputed date cannot assert one resolved value');
  const alternatives=new Set((v.alternatives??[]).map(a=>JSON.stringify(Object.fromEntries(Object.entries(a).filter(([key])=>key!=='evidence'&&key!=='conversion_evidence').sort(([a],[b])=>a.localeCompare(b))))));
  if(alternatives.size<2)errors.push(p+': disputed date needs distinct alternatives');}}

export function validateBibliography(value,scope) {
 const errors=validateBibliographicShape(value,bibliographySchema.definitions[scope==='work'?'workBibliography':'editionBibliography']);
 if(errors.length)return errors;
 if(value.composition)date(value.composition,'composition',errors);
 for(const key of ['first_publication','edition_publication'])if(value[key]){const v=value[key];fact(v,key,errors);date(v.date,key,errors);
  if(key==='first_publication'&&v.event_kind!=='first-publication')errors.push(key+': first publication cannot be a reprint');
  if(key==='edition_publication'&&!['edition-publication','translation-publication','reprint'].includes(v.event_kind))errors.push(key+': use work first-publication for the original work event');}
 for(const [i,v]of(value.publication_events??[]).entries()){fact(v,'publication_events['+i+']',errors);date(v.date,'publication_events['+i+']',errors);if(!['serialization-start','serialization-end','first-volume-publication','standalone-publication','oral-circulation','manuscript-circulation'].includes(v.event_kind))errors.push('publication_events['+i+']: event must stay separate from canonical first publication and exact-edition publication');}
 for(const [i,v] of (value.titles??[]).entries())fact(v,'titles['+i+']',errors);
 for(const [i,v] of (value.contributors??[]).entries()){fact(v,'contributors['+i+']',errors);for(const [j,n]of(v.names??[]).entries())fact(n,'names['+j+']',errors);if(v.birth)date(v.birth,'birth',errors);if(v.death)date(v.death,'death',errors);
  const birth=dateBounds(v.birth?.value??v.birth?.normalized_gregorian_value),death=dateBounds(v.death?.value??v.death?.normalized_gregorian_value);
  if(birth.first!==undefined&&death.last!==undefined&&birth.first>death.last)errors.push('contributors['+i+']: reversed lifespan');}
 return errors;
}


/** Work-scoped facts shared by the v2/v3 catalog; never inferred from compatibility fields. */
export function validateCatalogBibliographicMetadata(row) {
 const errors=[];
 if(Object.hasOwn(row,'bibliography')) {
  errors.push(...validateBibliography(row.bibliography,'work'));
 }
 if(Object.hasOwn(row,'originalLanguageTags')) {
  const tags=row.originalLanguageTags;
  if(!Array.isArray(tags)||tags.length>512||tags.some(tag=>typeof tag!=='string'||tag.length>64||!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(tag))) {
   errors.push('originalLanguageTags: expected bounded original-work language tags');
  } else if(new Set(tags).size!==tags.length) {
   errors.push('originalLanguageTags: duplicate tag');
  }
 }
 return errors;
}

/** Preserve the complete canonical claim/evidence object without asserting source language or dates. */
export function projectCatalogBibliographicMetadata(work) {
 const row={
  ...(Object.hasOwn(work,'bibliography')?{bibliography:work.bibliography}:{}),
  ...(Object.hasOwn(work,'original_language_tags')?{originalLanguageTags:work.original_language_tags}:{}),
 };
 const errors=validateCatalogBibliographicMetadata(row);
 if(errors.length)throw new Error('[library-catalog] '+work.work_id+': '+errors.join('; '));
 return structuredClone(row);
}

/** The canonical date contract is reused by entity profiles without a calendar fork. */
export function validateBibliographicDateFact(value) {
 const errors=validateBibliographicShape(value,bibliographySchema.definitions.dateFact);
 if(!errors.length)date(value,'date',errors);
 return errors;
}
export function validateBibliographicLifespan(birth,death) {
 const errors=[...(birth===undefined?[]:validateBibliographicDateFact(birth)),...(death===undefined?[]:validateBibliographicDateFact(death))];
 if(errors.length)return errors;
 const first=dateBounds(birth?.value??birth?.normalized_gregorian_value),last=dateBounds(death?.value??death?.normalized_gregorian_value);
 if(first.first!==undefined&&last.last!==undefined&&first.first>last.last)errors.push('lifespan: reversed lifespan');
 return errors;
}
export const validateBibliographicEvidence=value=>validateBibliographicShape(value,bibliographySchema.definitions.evidence);


/** Metadata certification is separate from the exact edition's own review tier. */
export function validateEditionMetadataProvenance(value) {
 const errors=validateBibliographicShape(value,bibliographySchema.definitions.metadataProvenance);
 if(errors.length)return errors;
 if(['machine-reviewed','human-reviewed','school-approved'].includes(value.review_state)) {
  if(!value.reviewer_ref||!value.reviewed_at)errors.push('reviewed metadata requires reviewer_ref and reviewed_at');
  if(value.reviewer_ref===value.authoring_ref)errors.push('metadata review must be independent from metadata authoring');
  const instant=Date.parse(value.reviewed_at);
  const canonical=value.reviewed_at?.replace(/Z$/,value.reviewed_at.includes('.')?'Z':'.000Z');
  if(!Number.isFinite(instant)||new Date(instant).toISOString()!==canonical)errors.push('invalid metadata review instant');
 }else if(value.reviewer_ref||value.reviewed_at)errors.push('draft metadata cannot carry a completed review');
 return errors;
}


/** Exact independently reviewed metadata artifact; provenance never changes edition review. */
export function validateEditionBibliographySource(value,{editionId,editionSHA256,reviewedOnly=false}={}) {
 const errors=validateBibliographicShape(value,bibliographySchema.definitions.editionBibliographySource);
 if(errors.length)return errors;
 errors.push(...validateEditionMetadataProvenance(value.metadata_provenance));
 if(editionSHA256!==undefined&&value.source_edition_sha256!==editionSHA256)errors.push('metadata source binding does not match exact edition');
 if(editionId!==undefined&&value.artifact.path!==`metadata/edition-bibliography/${editionId}.json`)errors.push('metadata artifact path does not match exact edition');
 if(reviewedOnly&&!['machine-reviewed','human-reviewed','school-approved'].includes(value.metadata_provenance.review_state))errors.push('draft metadata cannot enter reviewed bibliography projection');
 return errors;
}
