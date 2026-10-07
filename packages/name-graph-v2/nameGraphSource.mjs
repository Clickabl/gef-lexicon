/** First-party immutable artifact download. Search text is never sent in a URL or request body. */
import { NameGraphIndex } from './nameGraph.mjs';
const MAX_GRAPH_BYTES = 16 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/u;
function manifestGraph(value) {
  if (!value || value.contract !== 'gef-name-graph-manifest-v2' || !value.graph
    || !HASH.test(value.graph.sha256) || value.graph.path !== `${value.graph.sha256}/graph.json`
    || !Number.isSafeInteger(value.graph.bytes) || value.graph.bytes < 1 || value.graph.bytes > MAX_GRAPH_BYTES) {
    throw new Error('name_graph_manifest_invalid');
  }
  return value.graph;
}

export async function readNameResponse(response, maxBytes) {
  if (!response?.ok) throw new Error('name_graph_unavailable');
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/u.test(declared) || Number(declared) > maxBytes)) throw new Error('name_graph_body_limit');
  const reader = response.body?.getReader?.();
  if (!reader) {
    // React Native transports may not expose a stream. Only accept a bounded, declared public artifact then.
    if (declared === null) throw new Error('name_graph_bounded_transport_required');
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) throw new Error('name_graph_body_limit');
    return text;
  }
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let count = 0, text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > maxBytes) throw new Error('name_graph_body_limit');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    try { await reader.cancel(); } catch { /* Preserve the parsing/size result if cancellation fails. */ } finally { reader.releaseLock(); }
  }
}

export function createNameGraphSource({ baseUrl, digest, fetcher = globalThis.fetch, now = Date.now, ttlMs = 300000, timeoutMs = 8000 }) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) throw new Error('name_graph_origin_invalid');
  if (typeof digest !== 'function' || typeof fetcher !== 'function' || !Number.isFinite(ttlMs) || ttlMs < 0 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('name_graph_source_invalid');
  let snapshot = null, loadedAt = 0, pending = null, generation = 0, currentAbort = null;
  async function resource(relative, limit, abort) {
    const url = new URL(relative, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('name_graph_path_invalid');
    const response = await fetcher(url.href, { method: 'GET', credentials: 'omit', redirect: 'error', signal: abort.signal });
    if (response.url && new URL(response.url).origin !== base.origin) throw new Error('name_graph_redirect_rejected');
    return readNameResponse(response, limit);
  }
  async function load() {
    if (snapshot && now() - loadedAt < ttlMs) return snapshot;
    if (pending) return pending;
    const version = generation, abort = new AbortController(); currentAbort = abort;
    let timer;
    const task = (async () => {
      const manifest = manifestGraph(JSON.parse(await resource('manifest.json', 4096, abort)));
      const text = await resource(manifest.path, manifest.bytes, abort);
      if (new TextEncoder().encode(text).length !== manifest.bytes || await digest(text) !== manifest.sha256) throw new Error('name_graph_digest_mismatch');
      const index = new NameGraphIndex(JSON.parse(text));
      if (version !== generation || abort.signal.aborted) throw new Error('name_graph_load_retired');
      const next = Object.freeze({ index, revision: manifest.sha256 }); snapshot = next; loadedAt = now(); return next;
    })();
    const flight = Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new Error('name_graph_timeout')); }, timeoutMs); })]);
    pending = flight;
    try { return await flight; }
    finally { clearTimeout(timer); if (pending === flight) pending = null; if (currentAbort === abort) currentAbort = null; }
  }
  return {
    load,
    async search(query, options) { return (await load()).index.search(query, options); },
    async resolveLiteral(literal, options) { return (await load()).index.resolveLiteral(literal, options); },
    async reveal(selection, options) { return (await load()).index.reveal(selection, options); },
    clear() { generation += 1; snapshot = null; loadedAt = 0; pending = null; currentAbort?.abort(); currentAbort = null; },
  };
}
