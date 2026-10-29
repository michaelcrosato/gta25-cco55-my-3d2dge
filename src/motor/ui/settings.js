// The player's settings (PLAN.md 8.18): the engine's own store (game.settings: saved under the game's id, apart from the
// save and the tuning, and applied as they load) with MOTOR's added to it. The settings screen shows them in five tabs:
//   CONTROLS: the stick's dead zone, invert, vibration, a DualSense's haptics, the button symbols, then the layout and each context's bindings;
//   DISPLAY: the default view, Auto-rail, Sharp MODE 7, the HUD size, subtitles, colourblind markers, and the engine's
//            screen shake, flashes and reduced motion;
//   AUDIO: the engine's sound, master volume, music and effects, and the radio's volume and its DJ chatter;
//   GAME: difficulty, aim assist, autosave;
//   ACCESS: hold or toggle for sprint, aim, crouch and the wheels (the HumanController latches a toggled one).
// Presentation and comfort only, but for difficulty and aim assist, which the player chooses for the simulation they
// play (a bot's runs and the tests keep the defaults).
import { tuneSet } from '../core/tune.js';
import { PROMPTS } from '../input/prompts.js';
import { SCHEMES, startingScheme } from '../input/bindings.js';
import { MARKERS } from './radar.js';

export const SETTING_TABS = [
  { id: 'controls', label: 'CONTROLS', keys: ['controlScheme', 'deadzone', 'invertY', 'rumble', 'haptics', 'promptStyle'] },
  { id: 'display', label: 'DISPLAY', keys: ['defaultView', 'quality', 'freeCamera', 'autoRail', 'sharpSide7', 'hudSize', 'subtitles', 'colorblind', 'speedometer', 'shake', 'flashes', 'motion'] },
  { id: 'audio', label: 'AUDIO', keys: ['sound', 'volume', 'music', 'radio', 'effects', 'djChatter'] },
  { id: 'game', label: 'GAME', keys: ['difficulty', 'aimAssist', 'autosave'] },
  { id: 'access', label: 'ACCESS', keys: ['holdSprint', 'holdAim', 'holdCrouch', 'holdWheel'] },
];
/** the damage the player takes, by difficulty */
export const DIFFICULTY = { easy: .7, normal: 1, hard: 1.35 };
/** the actions a toggle setting latches (ACCESS) */
/** the Graphics setting's knobs: [knob, Full, Fast]. Full is the look as made; Fast trades the light's grain, the crowd's
 *  animation rate and the rain's density for frame time (drawing only: the simulation is the same either way) */
export const QUALITY = [['lightRes', 2, 3], ['depthLightRes', 4, 6], ['crowdEvery', 4, 6], ['rainDrops', 1, .5]];
export const HOLDS = { holdSprint: ['sprint'], holdAim: ['aim'], holdCrouch: ['crouch'], holdWheel: ['wheel', 'switch'] };
// the engine's settings as the 10-foot screen names them, and a tip where the engine gives none
const LABELS = { deadzone: 'Stick dead zone', invertY: 'Invert aim', rumble: 'Vibration', volume: 'Master volume', sound: 'Sound', music: 'Music', effects: 'Effects', shake: 'Screen shake', flashes: 'Screen flashes', motion: 'Reduce motion' };
const TIPS = { deadzone: 'How far a stick moves before it counts (twin-stick aim has no speed to scale)', invertY: 'The right stick\'s up and down swapped when aiming', rumble: 'How hard the controller shakes',
  volume: 'Everything at once', sound: 'All sound on or off', music: 'The menus\' music', effects: 'Guns, engines, crashes and the menus\' clicks', shake: 'How much the screen shakes', flashes: 'How bright explosions and camera flashes get' };

/** add MOTOR's settings to the game's store (once; their saved values load and apply) */
export function defineSettings(game) {
  const S = game.settings; if (!S || !S.define) return null;
  const def = sp => { if (!S.spec(sp.key)) S.define(sp); };
  def({ key: 'controlScheme', group: 'Controller', label: 'Control scheme', type: 'select', value: startingScheme(), options: Object.entries(SCHEMES).map(([id, s]) => [id, s.label]),
    help: 'Modern: the right stick turns the camera, L2 aims with it. Original: the right stick aims, R3 held turns the camera', apply: (g, v) => { if (g.bindings) g.bindings.setScheme(v); } });
  def({ key: 'promptStyle', group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['playstation', 'PlayStation'], ['xbox', 'Xbox'], ['nintendo', 'Nintendo'], ['keyboard', 'Keyboard']],
    help: 'Auto: the symbols of the controller in use, or the keys', apply: (g, v) => { PROMPTS.keys = v === 'keyboard'; if (g.input) g.input.glyphs = v === 'keyboard' ? 'auto' : v; } });
  def({ key: 'haptics', group: 'Controller', label: 'DualSense haptics', type: 'toggle', value: true, help: 'A DualSense\'s triggers and light bar (in Chrome or Edge, the first time: a key or a click, and the browser asks which)',
    apply: (g, v) => { const H = g.haptics; if (!H) return; if (v) H.connect(true); else H.close(); } });   // (a key or a click grants the browser's prompt; a pad's button can't)
  def({ key: 'defaultView', group: 'Display', label: 'Default view', type: 'select', value: 'iso', options: [['iso', 'ISO'], ['top', 'Top-down'], ['side7', 'Mode 7'], ['chase', 'Chase']], help: 'The view a game starts in' });
  def({ key: 'freeCamera', group: 'Display', label: 'Free camera', type: 'toggle', value: false, help: 'Try it: the right stick turns every view smoothly at any angle and leaves it there; up and down tilt ISO, MODE 7 and CHASE',
    apply: (g, v) => tuneSet('freeCam', v ? 1 : 0) });
  def({ key: 'autoRail', group: 'Display', label: 'Auto-rail', type: 'toggle', value: true, help: 'MODE 7 in a vehicle: the rail turns to the way you have held', apply: (g, v) => tuneSet('autoRail', v ? 1 : 0) });
  def({ key: 'quality', group: 'Display', label: 'Graphics', type: 'select', value: 'full', options: [['full', 'Full'], ['fast', 'Fast']], help: 'Fast, for a slower machine: a coarser light, the crowd animated less often, half the rain', apply: (g, v) => { for (const [k, full, fast] of QUALITY) tuneSet(k, v === 'fast' ? fast : full); } });
  def({ key: 'sharpSide7', group: 'Display', label: 'Sharp MODE 7', type: 'toggle', value: false, help: 'MODE 7 drawn at the screen\'s own resolution: crisp instead of the pixel look' });
  def({ key: 'hudSize', group: 'Display', label: 'HUD size', type: 'select', value: 0, options: [[0, 'Standard'], [1, 'Large'], [2, 'Huge']], help: 'The HUD and the menus, bigger' });
  def({ key: 'subtitles', group: 'Display', label: 'Subtitles', type: 'toggle', value: true, help: 'What people say, at the foot of the screen' });
  def({ key: 'speedometer', group: 'Display', label: 'Speedometer', type: 'toggle', value: false, help: 'The speed in the vehicle\'s panel' });
  def({ key: 'colorblind', group: 'Display', label: 'Colourblind markers', type: 'toggle', value: false, help: 'Markers and blips in colours everyone tells apart', apply: (g, v) => { MARKERS.cvd = !!v; } });
  def({ key: 'radio', group: 'Sound', label: 'Radio', type: 'slider', value: .8, help: 'The car radio\'s volume' });
  def({ key: 'djChatter', group: 'Sound', label: 'DJ chatter', type: 'toggle', value: true, help: 'The DJs\' and the ads\' lines between songs' });
  def({ key: 'difficulty', group: 'Game', label: 'Difficulty', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], help: 'How much the street hurts' });
  def({ key: 'aimAssist', group: 'Game', label: 'Aim assist', type: 'select', value: 'standard', options: [['off', 'Off'], ['low', 'Low'], ['standard', 'Standard']], help: 'How far free aim is pulled toward a target' });
  def({ key: 'autosave', group: 'Game', label: 'Autosave', type: 'toggle', value: true, help: 'After every mission and job' });
  for (const [k, l, v] of [['holdSprint', 'Sprint', 'hold'], ['holdAim', 'Aim', 'hold'], ['holdCrouch', 'Crouch', 'toggle'], ['holdWheel', 'Wheels', 'hold']]) def({ key: k, group: 'Access', label: l, type: 'select', value: v, options: [['hold', 'Hold'], ['toggle', 'Toggle']], help: `Hold the button, or press once to start and again to stop (${l.toLowerCase()})` });
  return S;
}
/** a setting's value, or its fallback where the store or the setting is missing (headless, a test) */
export function setting(game, key, fallback) { const S = game && game.settings; if (!S || !S.spec || !S.spec(key)) return fallback; const v = S[key]; return v === undefined ? fallback : v; }
/** how strong a full-screen flash may be (0..1): the engine's SCREEN FLASHES, softer again with REDUCE MOTION (as the
 *  engine's own game.flash does); MOTOR's own flashes, lightning and the photo shutter, are drawn at this */
export function flashScale(game) { const k = Math.max(0, Math.min(1, +setting(game, 'flashes', 1) || 0)); return game && game.reduceMotion ? k * .4 : k; }
/** the actions a toggle latches now (the ACCESS tab) */
export function toggled(game) { const out = new Set(); for (const [k, acts] of Object.entries(HOLDS)) if (setting(game, k, k === 'holdCrouch' ? 'toggle' : 'hold') === 'toggle') for (const a of acts) out.add(a); return out; }
/** the List rows for settings by key (those the store has): a toggle, a slider or a left-right choice each, with its tip */
export function settingRows(game, keys) {
  const S = game.settings, out = [];
  for (const key of keys) {
    const sp = S && S.spec && S.spec(key); if (!sp) continue;
    const label = (LABELS[key] || sp.label || key).toUpperCase(), help = TIPS[key] || sp.help || '', get = () => S[key], set = v => S.set(key, v);
    if (sp.type === 'toggle') out.push({ kind: 'toggle', key, label, help, get, set });
    else if (sp.type === 'slider') { const min = sp.min ?? 0, max = sp.max ?? 1; out.push({ kind: 'slider', key, label, help, get, set, min, max, step: sp.step || (max - min) / 20, format: max <= 1 ? v => Math.round(v * 100) + '%' : v => String(+v.toFixed(2)) + (sp.unit || '') }); }
    else if (sp.type === 'select') out.push({ kind: 'choice', key, label, help, get, set, options: (sp.options || []).map(o => (Array.isArray(o) ? o : [o, String(o)])) });
  }
  return out;
}
/** every setting of the tabs back to its default */
export function resetSettings(game, keys) { const S = game.settings; if (!S || !S.spec) return; for (const k of keys) if (S.spec(k)) S.set(k, S.default(k)); }
