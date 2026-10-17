// Small schemas for registry specs (PLAN.md 7.4). shape({ field: rule }) makes a check(spec, id) for declare(kind,
// check): it fills defaults in place and returns the problems as strings (the registry warns once per problem and keeps
// going, so one bad spec never stops a game). A rule is a type name ('number' 'string' 'boolean' 'function' 'object'
// 'array' 'any') or { type, req, def, min, max, oneOf }. A def that is plain data is copied, so specs never share it.
const is = (v, t) => t === 'any' || (t === 'array' ? Array.isArray(v) : t === 'object' ? v !== null && typeof v === 'object' && !Array.isArray(v) : typeof v === t);
const copy = v => (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;

/** a check function for declare(kind, check), built from field rules */
export function shape(rules) {
  const norm = Object.entries(rules).map(([k, r]) => [k, typeof r === 'string' ? { type: r } : r]);
  const check = spec => {
    const out = [];
    for (const [k, r] of norm) {
      const v = spec[k];
      if (v === undefined) {
        if ('def' in r) spec[k] = typeof r.def === 'function' && r.type !== 'function' ? r.def(spec) : copy(r.def);
        else if (r.req) out.push(`is missing "${k}"`);
        continue;
      }
      if (r.type && !is(v, r.type)) out.push(`"${k}" should be ${r.type === 'array' || r.type === 'object' ? 'an ' : 'a '}${r.type}`);
      else if (r.oneOf && !r.oneOf.includes(v)) out.push(`"${k}" is ${JSON.stringify(v)}; it must be one of ${r.oneOf.join(', ')}`);
      else if (typeof v === 'number' && ((r.min !== undefined && v < r.min) || (r.max !== undefined && v > r.max))) out.push(`"${k}" is ${v}; it must be within ${r.min ?? '-∞'}..${r.max ?? '∞'}`);
    }
    return out;
  };
  check.rules = rules;
  return check;
}
