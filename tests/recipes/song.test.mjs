// The song recipe (docs/CONTENT-GUIDE.md, "A song"): a song written in the engine's note syntax in one new file
// (fixtures/song.js). It parses (its tempo, its three tracks, every note), it joins NEON DRIVE after the songs the
// composer writes, the radio plays it in its turn, and MOTOR's sequencer schedules its notes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings, fakeAudio } from './kit.mjs';

test('a song from one new file: parsed, on NEON DRIVE in its turn, its notes scheduled by the sequencer', async () => {
  const g = await withRecipe('song', 'songs/night-bus.js', { hash: 'play', query: { seed: '1', time: 'day' } });
  const { gtm, M } = g, spec = M.get('songs', 'night-bus');
  assert.equal(specWarnings(g, ['night-bus']).length, 0, specWarnings(g, ['night-bus']).join('; '));
  const song = M.parseSong(spec);
  assert.equal(song.bpm, 92); assert.equal(song.tracks.length, 3);
  assert.equal(song.lenSteps, 64, 'four bars of sixteen steps'); assert.ok(song.tracks.every(t => t.events.length > 0), 'notes on every track');
  const T = M.stationTimeline(M.get('stations', 'neon')), songs = T.segs.filter(s => s.kind === 'song');
  assert.deepEqual([...songs].map(s => s.title), ['Midnight on Neon Mile', 'Chrome Horizon', 'Overpass Lovers', 'Night Bus'], 'after the composer\'s three');
  const seg = songs[3]; assert.equal(gtm.radio.at('neon', seg.t0 + 1).seg.title, 'Night Bus', 'the radio plays it in its turn');
  const { ctx, started } = fakeAudio(), S = new M.Sequencer(ctx, {});
  S.play(seg.song, { t0: 0 }); S.schedule(0, seg.song.stepDur * 16 - .001);
  const at = ts => [...new Set(ts.map(t => t.toFixed(4)))].sort().join(' ');   // (a drum may start two nodes: its noise and its body)
  const want = at(seg.song.tracks.flatMap(t => t.events.filter(e => e.step < 16).map(e => e.step * seg.song.stepDur)));
  assert.equal(at(started.map(q => q.t)), want, 'its first bar\'s notes and drums, each where its step puts it');
});
