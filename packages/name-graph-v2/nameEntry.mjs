/** Live entry state, complete-set sense resolution and stale-request retirement. No provider calls. */
import { normalizeNameLookup, personalNameLiteral } from './nameGraph.mjs';

export class NameEntrySession {
  #source; #options; #listeners = new Set(); #version = 0; #disposed = false;
  #state = Object.freeze({ text: '', status: 'idle', matches: [], selected: null });
  constructor(source, options = {}) {
    if (typeof source?.search !== 'function' || typeof source?.resolveLiteral !== 'function') throw new TypeError('name_source_required');
    this.#source = source; this.#options = { ...options };
  }
  getSnapshot = () => this.#state;
  subscribe = listener => { this.#listeners.add(listener); return () => this.#listeners.delete(listener); };
  #publish(next) { if (!this.#disposed) { this.#state = Object.freeze(next); for (const listener of [...this.#listeners]) listener(); } }
  #current(version) { return !this.#disposed && this.#version === version; }
  async change(text) {
    if (this.#disposed) return;
    if (typeof text !== 'string') throw new TypeError('name_text_invalid');
    const version = ++this.#version;
    // Clear old options synchronously, before a previous render can select one for the new query.
    this.#publish({ text, status: text.trim() ? 'searching' : 'idle', matches: [], selected: null });
    if (!text.trim()) return;
    try {
      personalNameLiteral(text);
      const matches = await this.#source.search(text, { ...this.#options, limit: 6 });
      if (this.#current(version)) this.#publish({ text, status: 'ready', matches: [...matches], selected: null });
    } catch {
      if (this.#current(version)) this.#publish({ text, status: 'unavailable', matches: [], selected: null });
    }
  }
  choose(id) {
    if (this.#disposed || this.#state.status !== 'ready') return false;
    const match = this.#state.matches.find(row => row.id === id);
    if (!match) return false;
    this.#version += 1;
    // An explicit tap may fill a spelling. Merely finding a match never corrects typed input.
    this.#publish({ text: match.text, status: 'chosen', matches: [], selected: match });
    return true;
  }
  async prepare() {
    if (this.#disposed) return { kind: 'retired' };
    const state = this.#state, version = this.#version;
    let literal; try { literal = personalNameLiteral(state.text); } catch { return { kind: 'invalid' }; }
    if (state.selected && normalizeNameLookup(state.selected.text) === normalizeNameLookup(literal)) {
      return { kind: 'resolved', literal, match: state.selected };
    }
    try {
      const result = await this.#source.resolveLiteral(literal, this.#options);
      return this.#current(version) ? result : { kind: 'retired' };
    } catch {
      return this.#current(version) ? { kind: 'unknown', literal, sourceUnavailable: true } : { kind: 'retired' };
    }
  }
  async setLanguages(options) {
    if (this.#disposed) return;
    this.#options = { ...this.#options, ...options };
    // Ranking language is not permission to discard an explicitly selected sense.
    if (this.#state.selected) { this.#version += 1; return; }
    await this.change(this.#state.text);
  }
  dispose() { this.#version += 1; this.#disposed = true; this.#listeners.clear(); this.#state = Object.freeze({ text: '', status: 'retired', matches: [], selected: null }); }
}
