import type { NameGraphIndex, NameMatch, NameResolution, NameSearchOptions, NameSelection, NameReveal, NameRevealOptions } from './nameGraph.mjs';
export type NameGraphSnapshot = Readonly<{ index: NameGraphIndex; revision: string }>;
export type NameGraphSource = {
  load(): Promise<NameGraphSnapshot>;
  search(query: string, options?: NameSearchOptions): Promise<NameMatch[]>;
  resolveLiteral(literal: string, options?: NameSearchOptions): Promise<NameResolution>;
  reveal(selection: NameSelection, options?: NameRevealOptions): Promise<NameReveal>;
  clear(): void;
};
export function readNameResponse(response: Response, maxBytes: number): Promise<string>;
export function createNameGraphSource(options: Readonly<{
  baseUrl: string; digest: (text: string) => Promise<string>; fetcher?: typeof fetch;
  now?: () => number; ttlMs?: number; timeoutMs?: number;
}>): NameGraphSource;
