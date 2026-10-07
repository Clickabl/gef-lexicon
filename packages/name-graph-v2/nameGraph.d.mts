export const NAME_GRAPH_CONTRACT: 'gef-name-graph-v2';
export const NAME_GRAPH_LIMITS: Readonly<{ names: number; spellings: number; renderings: number }>;
export type LiveNameReviewState = 'candidate' | 'machine_reviewed' | 'approved';
export type NameReviewState = LiveNameReviewState | 'rejected' | 'superseded';
export type NameMode = 'beta' | 'reviewed';
export type NameEvidence = Readonly<{ reviewState: NameReviewState; certainty: number | null; sourceRefs: readonly string[] }>;
export type NameFact = NameEvidence & Readonly<{ languageTag: string; text: string }>;
export type NameSense = NameEvidence & Readonly<{ id: string; formKind: 'full' | 'short' | 'diminutive' | 'other'; familyId: string | null; facts: readonly NameFact[] }>;
export type NameSpelling = NameEvidence & Readonly<{
  id: string; nameId: string; text: string; languageTag: string; representationTag: string;
  primary: boolean; fallbackToPrimary: boolean;
}>;
export type NameRendering = NameEvidence & Readonly<{ id: string; fromSpellingId: string; toSpellingId: string; relation: 'equivalent' | 'transliteration' | 'spelling_variant' }>;
export type NameRelation = NameEvidence & Readonly<{ fromNameId: string; toNameId: string; relation: 'short_form_of' | 'diminutive_of' | 'related' }>;
export type NameGraph = Readonly<{
  contract: 'gef-name-graph-v2'; publication: 'public-reference'; names: readonly NameSense[];
  spellings: readonly NameSpelling[]; renderings: readonly NameRendering[]; relations: readonly NameRelation[];
}>;
export type NameSearchOptions = Readonly<{ preferredLanguage?: string | null; bestLanguage?: string | null; mode?: NameMode; limit?: number }>;
export type NameMatch = Readonly<{
  id: string; nameId: string; spellingId: string; text: string; languageTag: string; representationTag: string;
  formKind: NameSense['formKind']; reviewState: LiveNameReviewState; certainty: number | null; sourceRefs: readonly string[];
}>;
export type NameResolution = Readonly<{ kind: 'resolved'; literal: string; match: NameMatch }>
  | Readonly<{ kind: 'ambiguous'; literal: string; choices: readonly NameMatch[] }>
  | Readonly<{ kind: 'unknown'; literal: string; sourceUnavailable?: boolean }>;
export type NameSelection = Readonly<{ literal: string; nameId: string; spellingId: string }>;
export type NameRevealForm = Readonly<{
  text: string; spellingIds: readonly string[]; languageTags: readonly string[]; representationTags: readonly string[];
  relation: NameRendering['relation'] | 'sense_primary' | 'mixed'; reviewState: LiveNameReviewState;
  certainty: number | null; sourceRefs: readonly string[];
}>;
export type NameReveal = Readonly<{ literal: string; forms: readonly NameRevealForm[] }>;
export type NameRevealOptions = Readonly<{ mode?: NameMode; representations?: readonly string[] | null }>;
export function canonicalNameTag(value: unknown): string;
export function normalizeNameLookup(value: string): string;
export function personalNameLiteral(value: string): string;
export function validateNameGraph(input: unknown): NameGraph;
export function nameRepresentationsCompatible(requested: string, available: string): boolean;
export class NameGraphIndex {
  constructor(input: unknown);
  readonly snapshot: NameGraph;
  search(query: string, options?: NameSearchOptions): NameMatch[];
  resolveLiteral(value: string, options?: NameSearchOptions): NameResolution;
  reveal(selection: NameSelection, options?: NameRevealOptions): NameReveal;
  facts(nameId: string, requestedLanguage: string, options?: Readonly<{ bestLanguage?: string | null; mode?: NameMode }>): readonly NameFact[];
}
