import { z } from 'zod';

// Preserve the admitted UUID grammar (including historical non-v4 request IDs) on the patched parser.
export const entityRequestId = z.string().regex(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i);

// Closed source kinds; controlled workflow/role values are not allocated entities.
export const entityKinds = Object.freeze(['person','fictional_character','historical_person','real_person','mythological_figure','organization','place','other','collective_creator','cultural_attribution','traditional_attribution','anonymous_attribution','unknown_attribution','publisher_attribution','publisher','genre','literary_category','content_type','tradition','calendar','language','script','country','geographic_region','literary_period','literary_movement','occupation']);
export const entityId = z.string().regex(/^ent_[A-Za-z0-9._:-]+$/u).max(200);
const labelId = z.string().regex(/^lbl_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
const biographyId = z.string().regex(/^bio_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
const text = z.string().min(1).max(4000).refine(v => v.trim().length > 0);
const language = z.string().min(2).max(100).refine(v => { try { return Intl.getCanonicalLocales(v).length === 1; } catch { return false; } });
const refs = z.array(z.string().min(1).max(1000)).max(100).refine(v => new Set(v).size === v.length);
const provenance = z.object({repository:z.enum(['gef-lexicon','gef-content','gef-expo']),path:z.string().min(1).max(1000),revision_sha:z.string().regex(/^[a-f0-9]{40}$/u),field:z.string().max(1000).optional(),source_review_state:z.string().min(1).max(100).optional()}).strict();
const translation = z.enum(['source','machine_translation','human_translation']);
export const entityNameInput = z.object({label_id:labelId.optional(),text,language_tag:language.optional(),script:z.string().regex(/^[A-Z][a-z]{3}$/u).optional(),name_type:z.enum(['canonical','original_script','localized','transliteration','romanization','pseudonym','historical','alias']),translation_state:translation,source_refs:refs,source_provenance:provenance.optional()}).strict();
const recordedBiographyFields = z.object({biography_id:biographyId.optional(),language_tag:language,work_id:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u).optional(),short_text:text.optional(),long_text:z.string().min(1).max(20000).refine(v=>v.trim().length>0).optional(),translation_state:translation,source_refs:refs,source_provenance:provenance.optional()}).strict();
export const entityRecordedBiographyInput = recordedBiographyFields.refine(v=>v.short_text!==undefined||v.long_text!==undefined);
// Historical scoped records stay readable; new portrait authoring belongs to Content.
export const entityBiographyInput=recordedBiographyFields.omit({work_id:true}).strict().refine(v=>v.short_text!==undefined||v.long_text!==undefined);
export const relationshipKinds=Object.freeze(['birthplace','death_place','associated_country','citizenship','cultural_origin','language_of_work','literary_movement','occupation','member_of','attributed_tradition']);
const relationshipId=z.string().regex(/^rel_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
export const entityRelationshipInput=z.object({relationship_id:relationshipId.optional(),kind:z.enum(relationshipKinds),target_entity_id:entityId,certainty:z.enum(['known','approximate','unknown','disputed']),source_refs:refs,period:z.object({start:z.unknown().optional(),end:z.unknown().optional()}).strict().refine(v=>Object.keys(v).length>0).optional(),historical_context:z.object({text,language_tag:language.optional()}).strict().optional(),source_provenance:provenance.optional()}).strict();
export const entityCreateInput = z.object({entity_type:z.enum(entityKinds),canonical_name:text,canonical_name_language_tag:language.optional(),names:z.array(entityNameInput.omit({label_id:true})).max(100).default([]),biographies:z.array(recordedBiographyFields.omit({work_id:true,biography_id:true}).refine(v=>v.short_text!==undefined||v.long_text!==undefined)).max(50).default([]),external_ids:z.record(z.string(), z.array(z.string().min(1).max(1000)).max(100)).default({}),legacy_ids:refs.default([]),source_refs:refs,relationships:z.array(entityRelationshipInput.omit({relationship_id:true})).max(1000).optional(),source_provenance:provenance.optional(),birth_date:z.string().min(1).max(200).nullable().optional(),death_date:z.string().min(1).max(200).nullable().optional(),birth:z.unknown().optional(),death:z.unknown().optional(),research_notes:z.string().max(20000).optional()}).strict();
// Zod 4 applies defaults inside optional fields; an omitted PATCH field must remain absent.
export const entityPatchInput = entityCreateInput.omit({entity_type:true,names:true,biographies:true,relationships:true}).partial().extend({external_ids:entityCreateInput.shape.external_ids.removeDefault().optional(),legacy_ids:entityCreateInput.shape.legacy_ids.removeDefault().optional()}).strict().refine(v=>Object.keys(v).length>0);
const intent = {request_id:entityRequestId,expected_source_revision:z.string().regex(/^[a-f0-9]{40}$/u),expected_registry_revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)};
export const entityMutationInput = z.discriminatedUnion('action',[
 z.object({...intent,action:z.literal('create'),entity:entityCreateInput}).strict(),
 z.object({...intent,action:z.literal('create-many'),records:z.array(z.object({key:z.string().min(1).max(200).refine(value=>value.trim().length>0&&!['__proto__','constructor','prototype'].includes(value)),entity:entityCreateInput}).strict()).min(1).max(200).refine(rows=>new Set(rows.map(row=>row.key)).size===rows.length)}).strict(),
 z.object({...intent,action:z.literal('update'),entity_id:entityId,patch:entityPatchInput}).strict(),
 z.object({...intent,action:z.literal('upsert-name'),entity_id:entityId,name:entityNameInput}).strict(),
 z.object({...intent,action:z.literal('upsert-biography'),entity_id:entityId,biography:entityBiographyInput}).strict(),
 z.object({...intent,action:z.literal('upsert-relationship'),entity_id:entityId,relationship:entityRelationshipInput}).strict(),
 z.object({...intent,action:z.literal('merge'),from_entity_id:entityId,to_entity_id:entityId,source_refs:refs.refine(v=>v.length>0),reason:text.optional()}).strict(),
]);
const recordedCreateInput=entityCreateInput.extend({biographies:z.array(recordedBiographyFields.omit({biography_id:true}).refine(v=>v.short_text!==undefined||v.long_text!==undefined)).max(50).default([])});
/** Only the private durable journal uses the original admitted input contract. */
export const entityRecordedMutationInput=z.discriminatedUnion('action',entityMutationInput.options.map(schema=>{
 const action=schema.shape.action.value;
 if(action==='create')return schema.extend({entity:recordedCreateInput});
 if(action==='create-many')return schema.extend({records:z.array(z.object({key:z.string().min(1).max(200).refine(value=>value.trim().length>0&&!['__proto__','constructor','prototype'].includes(value)),entity:recordedCreateInput}).strict()).min(1).max(200).refine(rows=>new Set(rows.map(row=>row.key)).size===rows.length)});
 if(action==='upsert-biography')return schema.extend({biography:entityRecordedBiographyInput});
 return schema;
}));
export const entityQuery = z.object({q:z.string().trim().max(200).default(''),entity_type:z.enum(entityKinds).optional(),expected_source_revision:z.string().regex(/^[a-f0-9]{40}$/u).optional(),expected_registry_revision:z.coerce.number().int().positive().optional(),cursor:z.coerce.number().int().min(0).max(10000000).default(0),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict().refine(v=>v.cursor===0||v.expected_source_revision!==undefined&&v.expected_registry_revision!==undefined);
export const normalizeEntitySearch = v => v.normalize('NFKC').toLocaleLowerCase('und').trim();
