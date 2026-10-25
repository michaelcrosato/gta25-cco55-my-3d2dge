// The dev menu (PLAN.md 8.23's dev tools; ?dev=1): a 10-foot screen of four tabs, opened from the pause's DEV tab or
// with the backquote key (`):
//   - TUNING: every knob by its section (the tuning pages), a slider each, live as it moves; SAVE keeps the changed ones
//     in this browser, apart from the save game; DEFAULTS puts every one back;
//   - OVERLAYS: what the simulation thinks, drawn over the world (debug/overlays.js): lanes, junctions, the sidewalks,
//     the minds, the boxes, the perf readout;
//   - WORLD: the hour, the weather, the wanted stars, a teleport to any point of interest, any vehicle at your side;
//   - GO: any mission at any stage, any activity at a level, any Proving Ground zone, any district the career plays.
// MOTOR knows no game: o hands it what to show and how to act. o: { overlays (an Overlays), world: { hour(), setHour(h),
// weather(), weathers, setWeather(s), stars(), setStars(n), pois: [ids], teleport(id), vehicles: [ids], spawn(id) },
// go: { missions: [{ id, title, stages: [ids] }], activities: [{ id, title, levels }], start(id, { stage, level,
// activity }), zones: [ids], zone(id), districts: [{ id, name, go() }] } }
import { List, UI } from './tenfoot.js';
import { tabbedScreen, confirmScreen } from './menus.js';
import { TUNE, tuneSet, knobs, sections, tuneReset, tuneSave } from '../core/tune.js';
import { OVERLAY_KINDS } from '../debug/overlays.js';

const OVERLAY_LABELS = { lanes: 'LANES', junctions: 'JUNCTIONS', walks: 'SIDEWALKS', minds: 'MINDS', boxes: 'BOXES', perf: 'PERF READOUT' };
const OVERLAY_HELP = { lanes: 'The road graph round you, an arrow the way each lane runs (the deck\'s cyan)', junctions: 'The junction boxes: red while someone holds one',
  walks: 'The sidewalk graph the crowd walks', minds: 'A word over each driver and ped: what holds it up', boxes: 'Every vehicle\'s box and every body\'s circle', perf: 'Draw and update times, the items drawn' };
// a knob's value as it reads best: whole numbers as they are, small ones to two places
const fmt = (k) => v => (k.step >= 1 || Number.isInteger(k.def) && Number.isInteger(v) ? String(Math.round(v)) : (+v).toFixed(v < 10 ? 2 : 1));

/** one section's knobs, a slider each (its about as the tip) */
export function knobScreen(app, section) {
  const items = knobs(section).filter(k => typeof k.def === 'number').map(k => ({ kind: 'slider', label: k.label.toUpperCase(), help: k.about || k.id, min: k.min, max: k.max,
    step: k.step || +((k.max - k.min) / 100).toPrecision(2), get: () => TUNE[k.id], set: v => tuneSet(k.id, v), format: fmt(k) }));
  return { id: 'dev-knobs', title: section.toUpperCase(), color: UI.pink, w: 440, tips: true, list: new List({ id: 'dev-knobs-' + section, items, color: UI.pink }) };
}

export function devScreen(app, o) {
  const S = app.ui.screens, W = o.world || {}, G = o.go || {}, say = s => { if (o.toast) o.toast(s); };
  const tuning = new List({ id: 'dev-tuning', color: UI.pink, items: [
    ...sections().map(sec => ({ label: sec.toUpperCase(), right: String(knobs(sec).length), help: `The ${sec.toLowerCase()} knobs, live as they move`, act: () => S.open(knobScreen(app, sec)) })),
    { label: 'SAVE THE CHANGED ONES', help: 'Kept in this browser, apart from the save game', act: () => { const n = Object.keys(tuneSave()).length; say(n ? `${n} KNOB(S) SAVED` : 'NOTHING CHANGED'); } },
    { label: 'ALL TO DEFAULTS', help: 'Every knob as it came', act: () => S.open(confirmScreen(S, { title: 'EVERY KNOB TO ITS DEFAULT?', yes: 'DEFAULTS', onYes: () => { tuneReset(); say('DEFAULTS'); } })) }] });
  const overlays = new List({ id: 'dev-overlays', color: UI.pink, items: OVERLAY_KINDS.map(k => ({ kind: 'toggle', label: OVERLAY_LABELS[k], help: OVERLAY_HELP[k], get: () => !!o.overlays.flags[k], set: v => { o.overlays.flags[k] = !!v; } })) });
  let poi = 0, veh = 0;
  const world = new List({ id: 'dev-world', color: UI.pink, items: [
    W.hour && { kind: 'slider', label: 'HOUR', help: 'The clock jumps to it', min: 0, max: 23, step: 1, get: () => Math.floor(W.hour()), set: v => W.setHour(v), format: v => String(v).padStart(2, '0') + ':00' },
    W.weathers && { kind: 'choice', label: 'WEATHER', help: 'Held there while the menu says so', get: () => W.weather(), set: v => W.setWeather(v), options: W.weathers.map(s => [s, s]) },
    W.stars && { kind: 'slider', label: 'WANTED', help: 'The stars, and the police that come with them', min: 0, max: 5, step: 1, get: () => W.stars(), set: v => W.setStars(v), format: v => (v ? v + (v > 1 ? ' STARS' : ' STAR') : 'NONE') },
    W.pois && W.pois.length && { kind: 'choice', label: 'PLACE', help: 'A point of interest to go to', get: () => poi, set: v => { poi = v; }, options: W.pois.map((p, i) => [i, p]) },
    W.pois && W.pois.length && { label: 'TELEPORT THERE', help: 'On foot, at the nearest sidewalk', act: () => { S.closeAll(); W.teleport(W.pois[poi]); } },
    W.vehicles && W.vehicles.length && { kind: 'choice', label: 'VEHICLE', help: 'Any definition', get: () => veh, set: v => { veh = v; }, options: W.vehicles.map((d, i) => [i, d]) },
    W.vehicles && W.vehicles.length && { label: 'SPAWN IT BESIDE YOU', help: 'Parked at your side, unlocked', act: () => { S.closeAll(); W.spawn(W.vehicles[veh]); } },
  ].filter(Boolean) });
  let mi = 0, st = 0, ai = 0, lv = 1, zi = 0;
  const M = G.missions || [], A = G.activities || [], Z = G.zones || [], stages = () => (M[mi] ? M[mi].stages : []);
  const go = new List({ id: 'dev-go', color: UI.pink, items: [
    M.length && { kind: 'choice', label: 'MISSION', help: 'Any of them, done or not', get: () => mi, set: v => { mi = v; st = 0; }, options: M.map((m, i) => [i, m.title]) },
    M.length && { kind: 'choice', label: 'AT THE STAGE', help: 'Its setup puts the world as the stage needs it', get: () => st, set: v => { st = v; }, get options() { return stages().map((s, i) => [i, s]); } },
    M.length && { label: 'START THE MISSION', act: () => { S.closeAll(); G.start(M[mi].id, { stage: stages()[st] || null }); } },
    A.length && { kind: 'choice', label: 'ACTIVITY', get: () => ai, set: v => { ai = v; lv = 1; }, options: A.map((a, i) => [i, a.title]) },
    A.length && { kind: 'choice', label: 'AT THE LEVEL', get: () => lv, set: v => { lv = v; }, get options() { return Array.from({ length: (A[ai] && A[ai].levels) || 1 }, (_, i) => [i + 1, String(i + 1)]); } },
    A.length && { label: 'START THE ACTIVITY', act: () => { S.closeAll(); G.start(A[ai].id, { activity: true, level: lv }); } },
    Z.length && { kind: 'choice', label: 'PROVING GROUND', help: 'A developer zone (?selftest=1 runs its self-test)', get: () => zi, set: v => { zi = v; }, options: Z.map((z, i) => [i, z]) },
    Z.length && { label: 'GO TO THE ZONE', act: () => { S.closeAll(); G.zone(Z[zi]); } },
    ...(G.districts || []).map(d => ({ label: 'GO TO ' + d.name, help: 'The district, as a new game there (EXPANSION.md: one map at a time)', act: () => { S.closeAll(); d.go(); } })),
  ].filter(Boolean) });
  return tabbedScreen({ id: 'dev', title: 'DEV', color: UI.pink, w: 420, back: o.back, tabs: [
    { id: 'tuning', label: 'TUNING', page: { list: tuning, tips: true } },
    { id: 'overlays', label: 'OVERLAYS', page: { list: overlays, tips: true } },
    { id: 'world', label: 'WORLD', page: { list: world, tips: true } },
    { id: 'go', label: 'GO', page: { list: go, tips: true } }] });
}
