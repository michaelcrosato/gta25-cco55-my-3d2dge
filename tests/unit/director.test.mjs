// MOTOR's director (PLAN.md 8.20, 9.11) on a stand-in host: the show's order (the reels shuffled by the seed, a card
// after every two or three, never the same reel twice running), a fresh seed for each reel, the camera plan and the
// captions (a reel's title first, then each stage's), the watchdog (stalled, past its time, failed), and what it
// counts for the soak.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { Director } = await import('../../src/motor/ai/director.js');
const { def } = await import('../../src/motor/core/registry.js');
await import('../../src/motor/mission/dsl.js');
const { BUS } = await import('../../src/motor/core/bus.js');

const stage = (id, view, caption) => ({ id, view, caption, setup() {}, *run() {} });
for (const id of ['ra', 'rb', 'rc', 'rd', 're']) def('reels', id, { title: 'Reel ' + id, shows: 'what ' + id, time: 30, stages: [stage('one', 'top', id.toUpperCase() + ' ONE'), stage('two', 'side7', id.toUpperCase() + ' TWO')] });

/** a stand-in host: a runtime the test drives, a camera it moves, the views it was asked for */
function host() {
  const H = { started: [], stopped: 0, cards: [], v: 'iso', at: [0, 0], st: 0, isIn: false,
    R: { state: 'idle', stageIdx: -1, stage: null, op: null, errors: [], spec: null, failure: null } };
  return Object.assign(H, {
    startReel(id, seed) { H.started.push([id, seed]); const spec = { id, time: 30, stages: [{ id: 'one', view: 'top', caption: 'ONE' }, { id: 'two', view: 'side7', caption: 'TWO' }] }; Object.assign(H.R, { state: 'running', stageIdx: 0, stage: spec.stages[0], op: {}, errors: [], spec, failure: null }); },
    stopReel() { H.stopped++; H.R.state = 'idle'; },
    card(id) { H.cards.push(id); },
    runtime: () => H.R, focus: () => H.at, view(v) { H.v = v; }, viewNow: () => H.v, inside: () => H.isIn, stars: () => H.st,
  });
}
const run = (D, secs, dt = 1 / 10, each = null) => { for (let t = 0; t < secs; t += dt) { if (each) each(t); D.update(dt); } };

test('the show: the reels shuffled by the seed, a card after every two or three, a fresh seed each reel, never one twice running', () => {
  const H = host(), D = new Director({ reels: ['ra', 'rb', 'rc', 'rd', 're'], cards: ['title', 'howto', 'wanted'], seed: 40, host: H });
  const kinds = [];
  for (let n = 0; n < 24; n++) { D._next(); kinds.push(D.now.kind === 'card' ? 'C:' + D.now.id : D.now.id); }
  const loop = kinds.slice(0, 7);
  assert.deepEqual(loop.map(k => (k.startsWith('C:') ? 'C' : 'r')).join(''), 'rrCrrrC', 'two reels, a card, three reels, a card');
  assert.deepEqual(new Set(loop.filter(k => !k.startsWith('C:'))).size, 5, 'every reel once a time round');
  assert.deepEqual(kinds.filter(k => k.startsWith('C:')).slice(0, 4), ['C:title', 'C:howto', 'C:wanted', 'C:title'], 'the cards in turn');
  const reels = kinds.filter(k => !k.startsWith('C:'));
  for (let i = 1; i < reels.length; i++) assert.notEqual(reels[i], reels[i - 1], 'never the same reel twice running');
  assert.deepEqual(H.started.map(s => s[1]).slice(0, 4), [40, 41, 42, 43], 'each reel a fresh world: the seed plus the count');
  const other = new Director({ reels: ['ra', 'rb', 'rc', 'rd', 're'], cards: [], seed: 41, host: host() });
  const again = new Director({ reels: ['ra', 'rb', 'rc', 'rd', 're'], cards: [], seed: 40, host: host() });
  const order = d => d.show.map(q => q.id).join();
  assert.equal(order(again), order(new Director({ reels: ['ra', 'rb', 'rc', 'rd', 're'], cards: [], seed: 40, host: host() })), 'the same seed, the same show');
  assert.notEqual(order(other), order(again), 'another seed, another order');
  D.dispose(); other.dispose(); again.dispose();
});

test('the camera plan and the captions: the reel\'s title, then each stage\'s view and caption', () => {
  const H = host(), D = new Director({ reels: ['ra'], cards: [], seed: 1, host: H });
  D.update(.1); D.update(.1);   // (the reel started, then its first stage's camera plan)
  assert.equal(D.caption.text, 'REEL RA'); assert.equal(D.caption.sub, 'what ra'); assert.equal(H.v, 'top', 'the first stage\'s view at once');
  run(D, 3.5, .1, () => { H.at[0] += 5; });
  assert.equal(D.caption.text, 'ONE', 'the stage\'s caption after the title');
  H.R.stageIdx = 1; H.R.stage = H.R.spec.stages[1]; D.update(.1);
  assert.equal(H.v, 'side7'); assert.equal(D.caption.text, 'TWO');
  assert.deepEqual([...D.stats.views].sort(), ['side7', 'top'], 'the views it showed');
  D.dispose();
});

test('the watchdog: nothing moving for six seconds cuts; so does a reel past its time, or one that fails; an end is kept a moment', () => {
  const H = host(), D = new Director({ reels: ['ra', 'rb'], cards: [], seed: 7, host: H });
  D.update(.1); const first = D.now.id;
  run(D, 5.8); assert.equal(D.now.id, first, 'still: not yet');
  run(D, .4); assert.notEqual(D.now.id, first, 'six seconds still: cut'); assert.equal(D.log[0].why, 'stalled');
  run(D, 31, .1, () => { H.at[0] += 5; }); assert.equal(D.log[1].why, 'time', 'moving, but past its time');
  H.R.state = 'failed'; H.R.failure = 'wrecked'; D.update(.1); assert.equal(D.log[2].why, 'failed:wrecked');
  const id = D.now.id; H.R.state = 'passed'; run(D, 1); assert.equal(D.now.id, id, 'the end held a moment');
  run(D, 1); assert.equal(D.log[3].why, 'end'); assert.equal(D.stats.ended[id], 1);
  D.dispose();
});

test('what it counts for the soak: the reels, the views, the bank, the most stars, the explosions, the switches the camera made', () => {
  const H = host(), D = new Director({ reels: ['ra'], cards: [], seed: 3, host: H });
  D.update(.1); H.isIn = true; H.st = 3; D.update(.1); H.st = 1; D.update(.1);
  BUS.emit('explode', { x: 0, y: 0 }); BUS.emit('switch', { from: 'dex', to: 'viv' }); BUS.emit('switch', { from: 'viv', to: 'gus', camera: true });
  assert.equal(D.stats.bank, true); assert.equal(D.stats.stars, 3); assert.equal(D.stats.explosions, 1);
  assert.equal(D.stats.switches, 1, 'a protagonist possessed at once is no switch to show');
  D.dispose(); BUS.emit('explode', { x: 0, y: 0 }); assert.equal(D.stats.explosions, 1, 'gone with the scene');
});
