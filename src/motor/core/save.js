// Saving and loading (PLAN.md 7.8, 8.19): one JSON document per slot, stored the way E.store stores (localStorage under
// the engine's 'my3d2dge:' prefix) as <game>:save:<slot>, apart from settings and tuning. A game gives the schema: its
// version, a blank save, normalize (check every field, fill defaults) and MIGRATIONS[n] (version n -> n + 1). Reading
// migrates up and normalizes; a save that won't parse is kept as <key>:bak and reported, never thrown. While locked
// (the attract mode, the Proving Ground) nothing is written.
//   const saves = new SaveStore({ game: 'GrandTheftMoto-5S', schema: 1, blank, normalize, migrations });
//   saves.write('1', data) -> { ok } · saves.read('1') -> { data, error, migrated } · saves.list() · saves.locked = true
const PREFIX = 'my3d2dge:';
/** the browser's storage, as E.store keeps it (headless: nothing is stored) */
function localBackend() {
  const ls = (() => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch (e) { return null; } })();
  return { get: k => (ls ? ls.getItem(PREFIX + k) : null), set: (k, v) => { if (!ls) return false; try { ls.setItem(PREFIX + k, v); return true; } catch (e) { return false; } }, remove: k => { if (ls) try { ls.removeItem(PREFIX + k); } catch (e) { /* blocked */ } } };
}
/** a Map standing in for storage (tests, headless runs) */
export function memoryBackend(map = new Map()) { return { map, get: k => (map.has(k) ? map.get(k) : null), set: (k, v) => { map.set(k, v); return true; }, remove: k => map.delete(k) }; }

export class SaveStore {
  /** o: { game, schema (the current version), blank() (a new save), normalize(data) (fills and checks every field),
   *  migrations ({ n: data -> data at n + 1 }), slots (default ['1', '2', '3', 'auto']), backend (default: the
   *  browser's storage), summary(data) (what list() adds for the load screen) } */
  constructor(o) {
    Object.assign(this, { slots: ['1', '2', '3', 'auto'], migrations: {}, normalize: d => d, locked: false }, o);
    this.backend = o.backend || localBackend(); this.writes = 0;
  }
  key(slot) { return `${this.game}:save:${slot}`; }
  /** write a save; refused while locked or for an unknown slot. Returns { ok, reason } */
  write(slot, data) {
    if (this.locked) return { ok: false, reason: 'locked' };
    if (!this.slots.includes(String(slot))) return { ok: false, reason: 'slot' };
    // eslint-disable-next-line no-restricted-globals -- a save's wall-clock stamp is for the load menu, never the simulation
    const doc = { ...data, schema: this.schema, game: this.game, slot: String(slot), savedAt: data.savedAt ?? Date.now() };
    const ok = this.backend.set(this.key(slot), JSON.stringify(doc)); if (ok) this.writes++;
    return ok ? { ok } : { ok, reason: 'storage' };
  }
  /** read a save: { data (normalized, migrated) or null, error ('corrupt' | 'game' | 'future' | null), migrated (the
   *  version it came from, when it was older) }. A corrupt one is moved to <key>:bak */
  read(slot) {
    const k = this.key(slot), raw = this.backend.get(k); if (raw === null || raw === undefined) return { data: null, error: null };
    let d; try { d = JSON.parse(raw); } catch (e) { d = undefined; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) { this.backend.set(k + ':bak', raw); this.backend.remove(k); return { data: null, error: 'corrupt' }; }
    if (d.game && d.game !== this.game) return { data: null, error: 'game' };
    let v = Number.isInteger(d.schema) ? d.schema : 0, from = v;
    if (v > this.schema) return { data: null, error: 'future' };
    while (v < this.schema) { const m = this.migrations[v]; if (!m) { this.backend.set(k + ':bak', raw); return { data: null, error: 'corrupt' }; } d = m(d); v++; }
    return { data: this.normalize({ ...d, schema: this.schema, game: this.game }), error: null, migrated: from < this.schema ? from : undefined };
  }
  /** the slots that hold a save: [{ slot, label, savedAt, playtime, ...summary(data) }] (o.summary: what the load
   *  screen's cards show besides, the game's own) */
  list() {
    const out = [];
    for (const s of this.slots) { const r = this.backend.get(this.key(s)); if (r === null || r === undefined) continue; try { const d = JSON.parse(r); out.push({ slot: s, label: d.label || '', savedAt: d.savedAt || 0, playtime: d.playtime || 0, ...(this.summary ? this.summary(d) : {}) }); } catch (e) { out.push({ slot: s, label: '(damaged)', savedAt: 0, playtime: 0 }); } }
    return out;
  }
  clear(slot) { if (!this.locked) this.backend.remove(this.key(slot)); }
}
