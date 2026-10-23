// The station recipe (docs/CONTENT-GUIDE.md, "A radio station"): a station and its ad in one new file
// (fixtures/station.js). Its timeline is laid out (its songs composed, the DJ's lines, its ads, the jingle), it is on
// every car's dial (the radio buttons step to it, the HUD names it), and the radio shows its words when they play.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings, boardParked, tap } from './kit.mjs';

test('a station from one new file: its timeline laid out; on the dial in a car; its words on the radio', async () => {
  const g = await withRecipe('station', 'radio/brick-fm.js', { hash: 'play', query: { seed: '1', time: 'day', traffic: '0' } });
  const { game, gtm, M } = g, st = M.get('stations', 'brickfm');
  assert.equal(specWarnings(g, ['brickfm', 'mortar-mart']).length, 0, specWarnings(g, ['brickfm', 'mortar-mart']).join('; '));
  const T = M.stationTimeline(st), kinds = T.segs.map(s => s.kind);
  assert.equal(T.segs.filter(s => s.kind === 'song').length, 2, kinds.join(' '));
  assert.ok(['dj', 'ad', 'jingle'].every(k => kinds.includes(k)), 'a DJ\'s line, an ad and the jingle: ' + kinds.join(' '));
  assert.ok(T.segs.every(s => s.song && s.song.length > 0 && s.song.tracks.some(t => t.events.length)), 'music under every segment');
  game.advance(.2);
  const v = boardParked(g, 'cortez'); assert.equal(gtm.crew.ped.seat && gtm.crew.ped.seat.vehicle, v, 'in the car');
  for (let i = 0; i < 8 && v.radio !== 'brickfm'; i++) tap(game, 'Period', .1);
  assert.equal(v.radio, 'brickfm', 'on the dial'); assert.equal(M.stationLabel(v.radio), 'BRICK FM  93.3', 'as the HUD names it');
  const ad = T.segs.find(s => s.kind === 'ad' && s.ad === 'mortar-mart'), line = gtm.radio.line('brickfm', ad.t0 + 1);
  assert.ok(line && /Mortar Mart/.test(line.text), 'its ad\'s words: ' + JSON.stringify(line));
});
