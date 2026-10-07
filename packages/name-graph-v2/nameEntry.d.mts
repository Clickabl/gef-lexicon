import type { NameMatch, NameResolution, NameSearchOptions } from './nameGraph.mjs';
export type NameEntrySource = {
  search(query: string, options?: NameSearchOptions): readonly NameMatch[] | Promise<readonly NameMatch[]>;
  resolveLiteral(literal: string, options?: NameSearchOptions): NameResolution | Promise<NameResolution>;
};
export type NameEntrySnapshot = Readonly<{
  text: string; status: 'idle' | 'searching' | 'ready' | 'chosen' | 'unavailable' | 'retired';
  matches: readonly NameMatch[]; selected: NameMatch | null;
}>;
export class NameEntrySession {
  constructor(source: NameEntrySource, options?: NameSearchOptions);
  getSnapshot(): NameEntrySnapshot;
  subscribe(listener: () => void): () => void;
  change(text: string): Promise<void>;
  choose(id: string): boolean;
  prepare(): Promise<NameResolution | Readonly<{ kind: 'retired' | 'invalid' }>>;
  setLanguages(options: NameSearchOptions): Promise<void>;
  dispose(): void;
}
