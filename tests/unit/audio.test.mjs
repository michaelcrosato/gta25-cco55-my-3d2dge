// MOTOR's audio (PLAN.md 8.17): the note syntax, the composer (the same song for a seed), the radio's timelines
// (deterministic per seed, a station's place by the radio clock, its words), the sequencer's scheduling on any context
// (a stand-in one here; tests/e2e/audio.mjs renders real ones offline) and its voice cap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { parseSong, parseTrack, noteFreq } = await import('../../src/motor/audio/notes.js');
const { compose, GENRES, SCORES } = await import('../../src/motor/audio/composer.js');
const { Radio, stationTimeline } = await import('../../src/motor/audio/radio.js');
const { Sequencer } = await import('../../src/motor/audio/sequencer.js');

test('the note syntax: notes, holds, rests, bars, drums', () => {
  assert.equal(Math.round(noteFreq('A4')), 440); assert.equal(Math.round(noteFreq('C4')), 262); assert.equal(Math.round(noteFreq('Bb2')), 117); assert.equal(noteFreq('H4'), null);
  const t = parseTrack('C4 - - . | E4 . G4 -');
  assert.equal(t.len, 8, 'a bar line counts for nothing'); assert.deepEqual(t.events.map(e => [e.step, e.len]), [[0, 3], [4, 1], [6, 2]]);
  const d = parseTrack('k . hs . kc', true); assert.deepEqual(d.events.map(e => e.drum).join(''), 'khskc', 'several drums on one step');
  const s = parseSong({ bpm: 120, steps: 4, tracks: [{ wave: 'square', notes: 'C4 . . .' }, { wave: 'drums', notes: 'k . s . k . s .' }] });
  assert.equal(s.stepDur, .125); assert.equal(s.length, 1);
});

test('the composer: each station\'s genre and each score cue, the same song for the same seed, another for another', () => {
  for (const g of [...Object.keys(GENRES), ...Object.keys(SCORES)]) {
    const a = compose(g, 7), b = compose(g, 7), c = compose(g, 8), p = parseSong(a);
    assert.deepEqual(a, b, g + ': the same seed'); if (GENRES[g]) assert.notDeepEqual(a, c, g + ': another seed');   // (a score's cue may be one loop)
    assert.ok(p.length > 5 && p.tracks.length >= 3, g + ': a song with its parts');
    assert.ok(p.tracks.every(t => t.len === p.lenSteps), g + ': every part as long as the song');
    assert.ok(p.tracks.some(t => t.events.length > 10), g + ': notes in it');
  }
});

const STATIONS = [
  { id: 'crash', name: 'CRASH FM', dj: 'Captain Static', genre: 'synth-punk', seed: 101, songs: [{ title: 'A' }, { title: 'B' }, { title: 'C' }], djLines: ['Static here.'], ads: ['x'], jingle: 'CRASH!' },
  { id: 'talk', name: 'TALK', dj: 'Phil', genre: 'talk', seed: 1210, talk: [['PHIL: Go ahead.', 'CALLER: My mailbox moved.'], ['PHIL: Next.']], ads: ['x'], jingle: 'TALK.' },
];
const ADS = { x: { name: 'KWIK-LUX', lines: ['Open twenty-five hours.'] } };
test('the radio: each station a timeline, the same per seed; where it has got to by the radio clock; its words', () => {
  const R1 = new Radio({ stations: STATIONS, ads: ADS, seed: 3 }), R2 = new Radio({ stations: STATIONS, ads: ADS, seed: 3 }), R3 = new Radio({ stations: STATIONS, ads: ADS, seed: 4 });
  const T = R1.timelines.get('crash');
  assert.deepEqual(T.segs.map(s => s.kind), ['song', 'dj', 'song', 'ad', 'song', 'dj', 'jingle'], 'song, DJ, song, ad... the jingle');
  assert.deepEqual(T.segs.map(s => s.dur), R2.timelines.get('crash').segs.map(s => s.dur), 'the same seed, the same radio');
  assert.notDeepEqual(T.segs.map(s => s.dur), R3.timelines.get('crash').segs.map(s => s.dur), 'another seed, another');
  const mid = T.segs[2].t0 + 5, a = R1.at('crash', mid);
  assert.equal(a.seg, T.segs[2]); assert.ok(Math.abs(a.offset - 5) < 1e-9, 'tuned in mid-song: five seconds in');
  assert.equal(R1.at('crash', mid + T.length).seg, T.segs[2], 'the timeline goes round');
  const dj = R1.line('crash', T.segs[1].t0 + .1); assert.equal(dj.name, 'Captain Static'); assert.equal(dj.text, 'Static here.');
  const ad = R1.line('crash', T.segs[3].t0 + .1); assert.equal(ad.name, 'KWIK-LUX');
  assert.equal(R1.line('crash', mid), null, 'a song: no words');
  const call = R1.line('talk', 12), L = R1.timelines.get('talk'); assert.equal(L.segs[0].kind, 'talk'); assert.equal(call.name, 'CALLER', 'a caller named by their line'); assert.equal(call.text, 'My mailbox moved.');
});

/** a stand-in context: nodes that remember when they start and stop */
function fakeContext() {
  const started = [], node = () => ({ connect() {}, disconnect() {}, gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, Q: { value: 1 } });
  const src = kind => ({ ...node(), kind, start(t) { started.push({ kind, t }); }, stop() {}, setPeriodicWave() {}, type: '' });
  return { started, ctx: { currentTime: 0, sampleRate: 8000, createGain: node, createBiquadFilter: node, createOscillator: () => src('osc'), createBufferSource: () => src('noise'), createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createPeriodicWave: () => ({}) } };
}
test('the sequencer schedules each note once, where its timeline puts it, many sequences at once, and caps its voices', () => {
  const { ctx, started } = fakeContext(), S = new Sequencer(ctx, {});
  const song = parseSong({ bpm: 120, steps: 4, tracks: [{ wave: 'square', notes: 'C4 . E4 .' }, { wave: 'drums', notes: 'k . . .' }] });   // (half a second a loop)
  S.play(song, { t0: 0 }); S.schedule(0, .26); S.schedule(.1, .26);
  assert.deepEqual(started.filter(s => s.kind === 'osc').map(s => s.t).sort((a, b) => a - b), [0, 0, .25], 'the kick and two notes, each once (a kick is an oscillator too)');
  started.length = 0; S.schedule(.26, 1.01);
  assert.deepEqual(started.filter(s => s.kind === 'osc').map(s => s.t).sort((a, b) => a - b), [.5, .5, .75, 1, 1], 'it loops on its own length');
  // a station tuned in late: t0 in the past, the song where it has got to
  const S2 = new Sequencer(ctx, {}); started.length = 0; S2.play(song, { t0: -.25 }); S2.schedule(0, .3);
  assert.deepEqual(started.filter(s => s.kind === 'osc').map(s => s.t).sort((a, b) => a - b), [0, .25, .25], 'from the middle of its loop');
  const S3 = new Sequencer(ctx, {}, { maxVoices: 3 }); S3.play(parseSong({ bpm: 600, steps: 4, tracks: [{ wave: 'square', notes: 'C4 C4 C4 C4 C4 C4 C4 C4' }] })); S3.schedule(0, 1);
  assert.equal(S3.stats().voices, 3, 'the cap holds'); assert.ok(S3.stats().dropped > 0, 'the rest dropped, never the graph grown');
});

test('a station\'s timeline comes from its spec alone (stationTimeline)', () => {
  const t = stationTimeline(STATIONS[0], 1); assert.ok(t.length > 60 && t.segs.every(s => s.song && s.dur > 0), 'every segment its music and its time');
});

test('the SFX map: the game\'s events heard near the listener, quieter farther off; a door the player\'s alone', async () => {
  const { SfxMap } = await import('../../src/motor/audio/sfxmap.js');
  const { BUS } = await import('../../src/motor/core/bus.js');
  const heard = [], game = { headless: false, audio: { ready: true, define() {}, sfx: (n, o) => heard.push([n, +o.vol.toFixed(2)]) } };
  const M = new SfxMap(game, () => [0, 0], { isPlayer: id => id === 'me' }).attach();
  BUS.emit('explode', { x: 100, y: 0, power: 100 }); BUS.emit('explode', { x: 2000, y: 0, power: 100 });
  assert.equal(heard.length, 1, 'too far: not heard'); assert.ok(heard[0][1] < 1 && heard[0][1] > .3, 'nearer, louder: ' + heard[0][1]);
  heard.length = 0; BUS.emit('vehicleEnter', { actor: 'someone' }); BUS.emit('vehicleEnter', { actor: 'me' });
  assert.deepEqual(heard.map(h => h[0]), ['doorShut'], 'the city\'s doors are not slammed in your ear');
  heard.length = 0; M.frame(.5, { steps: { speed: 80, surface: 'grass' } }); assert.equal(heard[0][0], 'stepSoft', 'a footstep by the surface underfoot');
  M.dispose(); heard.length = 0; BUS.emit('explode', { x: 0, y: 0 }); assert.equal(heard.length, 0, 'gone with its scene');
  game.headless = true; assert.equal(M.play('cash'), false, 'a headless game hears nothing');
});

test('a content pack\'s genres (def(\'genres\')): every station\'s genre composes, the new stations\' too, each within its tempo', async () => {
  const { all, get } = await import('../../src/motor/core/registry.js');
  await import('../../src/motor/audio/stations.js'); await import('../../src/game/radio/stations.js');
  const st = all('stations'); assert.ok(st.length >= 6, 'six stations: ' + st.map(s => s.id).join(', '));
  for (const s of st) {
    const G = GENRES[s.genre] || get('genres', s.genre); assert.ok(G, `${s.id}: its genre ${s.genre} is known`);
    const song = compose(s.genre, s.seed); assert.ok(song.bpm >= G.bpm[0] && song.bpm <= G.bpm[1] && song.tracks.length >= 3 && song.tracks.every(t => t.notes && t.notes.length), `${s.id}: a song at ${song.bpm} bpm, its tracks`);
  }
  assert.deepEqual(compose('surf-rock', 973), compose('surf-rock', 973), 'the same seed, the same song');
  assert.notDeepEqual(compose('lounge', 1), compose('lounge', 2), 'another seed, another song');
});
