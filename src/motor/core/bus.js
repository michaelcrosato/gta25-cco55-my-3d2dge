// The BUS (PLAN.md 7.4): systems talk through named events instead of calling each other. on(event, fn, scope)
// subscribes, emit(event, data) calls the listeners in subscription order and returns data, clear(scope) drops a scope's
// listeners ('world' when a map loads, 'mission' when a mission ends, 'scene' on a scene change). A listener that throws
// is logged in BUS.errors (tests assert it stays empty) and the others still run.
const L = new Map();
export const BUS = {
  errors: [],
  /** subscribe; returns a function that unsubscribes */
  on(ev, fn, scope = 'global') { let a = L.get(ev); if (!a) L.set(ev, a = []); const e = { fn, scope }; a.push(e); return () => { const i = a.indexOf(e); if (i >= 0) a.splice(i, 1); }; },
  /** call every listener of ev with data; returns data (listeners may fill it in) */
  emit(ev, data = {}) {
    const a = L.get(ev); if (!a || !a.length) return data;
    for (const e of a.slice()) { try { e.fn(data); } catch (err) { BUS.errors.push({ ev, err }); console.error(`MOTOR: BUS "${ev}" listener failed:`, err); } }
    return data;
  },
  /** drop every listener of a scope */
  clear(scope) { for (const a of L.values()) for (let i = a.length - 1; i >= 0; i--) if (a[i].scope === scope) a.splice(i, 1); },
  /** how many listeners an event has */
  count(ev) { return (L.get(ev) || []).length; },
  /** forget everything (tests, a new game) */
  reset() { L.clear(); BUS.errors.length = 0; },
};
