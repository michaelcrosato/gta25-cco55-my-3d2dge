// Radio stations (PLAN.md 8.17, 9.9): def('stations', id, spec) from the game's content. M4's stub: a vehicle's radio
// steps through them (and 'off') with d-pad left and right, and the HUD names the one tuned in; M10 gives them their
// songs, ads, jingles and DJs.
import { declare, get } from '../core/registry.js';
import { shape } from '../core/schema.js';

declare('stations', shape({
  name: { type: 'string', req: true }, freq: { type: 'string', def: '' }, dj: { type: 'string', def: '' }, genre: { type: 'string', def: '' },
  color: { type: 'string', def: '#ffe066' }, about: { type: 'string', def: '' },
}));
/** what the HUD shows for a station id ('off': RADIO OFF) */
export function stationLabel(id) { if (!id || id === 'off') return 'RADIO OFF'; const s = get('stations', id); return s ? (s.freq ? `${s.name}  ${s.freq}` : s.name) : id.toUpperCase(); }
