// Deep links and options: #scene[/more] and ?key=value in a browser, or globalThis.__GTM_OPTIONS__ = { hash, query } in a
// headless test (set before the bundle runs). Nothing here touches the DOM when there is no location.
export function readLinks() {
  const o = globalThis.__GTM_OPTIONS__;
  if (o) return { hash: String(o.hash || '').replace(/^#/, ''), query: new Map(Object.entries(o.query || {}).map(([k, v]) => [k, String(v)])) };
  if (typeof location === 'undefined') return { hash: '', query: new Map() };
  return { hash: decodeURIComponent(location.hash.slice(1)), query: new URLSearchParams(location.search) };
}

/** split a hash into its route parts: 'mission/holy_rollers/deliver' -> ['mission', 'holy_rollers', 'deliver'] */
export const route = hash => hash ? hash.split('/').filter(Boolean) : [];
