// What an hour looks like (PLAN.md 8.6): the light level, the colour of the dark, the lamps, the sky and the fog, for
// every view, eased between keyframes through the day (night, dawn, day, dusk). The engine has no day/night of its
// own, so this sets the fields its canvas lighting reads (ambient, dark, tint: ENG:1313-1316) for ISO, and the same
// numbers drive MOTOR's own light pass in TOP and MODE 7 (Stage) and their skies and fog.
import { E } from '../engine.js';

const NIGHT = { ambient: .4, dark: [10, 6, 24], tint: .32, sky: ['#07081c', '#1c1a48', '#5a2a5a'], fog: '#2a1f3e', top: '#0a0812', phase: 'night' };
const DAWN = { ambient: .66, dark: [44, 26, 52], tint: .22, sky: ['#2a2458', '#8a5a88', '#f0a088'], fog: '#9a7088', top: '#3a2a3a', phase: 'dusk' };
const DAY = { ambient: 1, dark: [30, 30, 50], tint: 0, sky: ['#3a78d8', '#78b0ee', '#c8e4f8'], fog: '#a8c4e0', top: '#5a6a7a', phase: 'day' };
const DUSK = { ambient: .62, dark: [48, 20, 44], tint: .26, sky: ['#1a1440', '#7a3a70', '#f0906a'], fog: '#8a5068', top: '#2a1a2a', phase: 'dusk' };
const KEYS = [[0, NIGHT], [4.5, NIGHT], [6, DAWN], [7.5, DAY], [17.5, DAY], [19, DUSK], [20.5, NIGHT], [24, NIGHT]];

/** the ISO backdrops by phase (seen past the edges of the map) */
export const BACKDROPS = {
  night: 'city-night',
  dusk: { sky: ['#1a1440', '#6a3a78', '#e0766a', '#f8c080'], sun: { x: .3, y: .62, r: 16, color: '#ffd8a0' },
    layers: [{ kind: 'city', color: '#3a2448', y: .62, height: .42, parallax: .08, windows: '#ffd87a' }, { kind: 'city', color: '#241634', y: .76, height: .36, parallax: .22, windows: '#ffb85a', seed: 7 }] },
  day: { sky: ['#3a78d8', '#78b0ee', '#c8e4f8'], sun: { x: .8, y: .18, r: 10, color: '#fff8d8' },
    layers: [{ kind: 'clouds', color: '#ffffff', y: .28, height: .16, parallax: .05, drift: 4 }, { kind: 'city', color: '#7a88a8', y: .62, height: .42, parallax: .08 }, { kind: 'city', color: '#5a6888', y: .76, height: .36, parallax: .22, seed: 7 }] },
};

const mixHex = (a, b, t) => { const p = E.hex(a), q = E.hex(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const ease = t => t * t * (3 - 2 * t);

/** the look at an hour (0-24) in a weather ({ cloud, rain, fog, wet, flash }: world/weather.js, or none): { ambient,
 *  dark [r, g, b], tint, sky [3 colours], fog (its colour), top (TOP's ground colour beyond the map), phase ('night' |
 *  'dusk' | 'day'), lamps (the street lamps are on), night (windows and neon lit), haze, rain, wet, flash (0..1) } */
export function skyAt(hour, w = null) {
  const s = clearSky(hour); if (!w) return s;
  const c = w.cloud || 0, f = w.fog || 0, day = E.clamp((s.ambient - .62) / .38, 0, 1);
  s.ambient *= 1 - c * (.34 * day + .12 * (1 - day));   // clouds dim a day a lot, a night a little
  s.sky = s.sky.map(col => mixHex(col, '#5a6070', .6 * c)); s.top = mixHex(s.top, '#3e424c', .5 * c);
  s.fog = mixHex(s.fog, s.ambient > .6 ? '#a4aab4' : '#3a3c48', Math.min(1, .8 * f + .35 * c));
  s.lamps = s.ambient < .8; s.night = s.ambient < .66;   // (a storm by day puts the lamps on)
  s.haze = f; s.rain = w.rain || 0; s.wet = w.wet || 0; s.flash = w.flash || 0;
  if (s.flash > 0) s.ambient = Math.min(1, s.ambient + s.flash * 2.2);   // lightning lights the whole city for a moment
  return s;
}
function clearSky(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1], t = ease(h1 > h0 ? (h - h0) / (h1 - h0) : 0);
  const ambient = a.ambient + (b.ambient - a.ambient) * t;
  return {
    hour: h, ambient, tint: a.tint + (b.tint - a.tint) * t,
    dark: a.dark.map((v, k) => Math.round(v + (b.dark[k] - v) * t)),
    sky: a.sky.map((c, k) => mixHex(c, b.sky[k], t)), fog: mixHex(a.fog, b.fog, t), top: mixHex(a.top, b.top, t),
    phase: t < .5 ? a.phase : b.phase, lamps: ambient < .8, night: ambient < .66, haze: 0, rain: 0, wet: 0, flash: 0,
  };
}

/** indoors (an interior, PLAN.md 5.4): the room's own light, the same at every hour but dimmer after closing (o.dim
 *  0..1), no weather; a dark ceiling for MODE 7's sky and no ISO backdrop past the walls (indoor: true) */
export function indoorSky(hour, o = {}) {
  const h = ((hour % 24) + 24) % 24, open = h >= 8 && h < 18, dim = o.dim ?? (open ? 0 : 1), ambient = .78 - .3 * dim;
  return { hour: h, ambient, tint: .2 + .1 * dim, dark: [18, 14, 30], sky: ['#0c0a12', '#16131e', '#221d2c'], fog: '#1a1622', top: '#0a0812',
    phase: 'night', lamps: true, night: true, haze: 0, rain: 0, wet: 0, flash: 0, indoor: true };
}
