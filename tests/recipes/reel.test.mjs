// The reel recipe (docs/CONTENT-GUIDE.md, "An attract reel"): a reel in one new file (fixtures/reel.js). It registers
// with no warning, joins the show's rotation, and #attract/<id> plays it to its end (never cut by the watchdog), the
// camera plan's two views shown, its captions in turn, no error.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings } from './kit.mjs';

test('a reel from one new file: in the show\'s rotation; #attract/<id> plays it to its end in its views', async () => {
  const show = await withRecipe('reel', 'reels/cab-ride.js', { hash: 'attract' });
  assert.equal(specWarnings(show, ['cab-ride']).length, 0, specWarnings(show, ['cab-ride']).join('; '));
  assert.ok(show.gtm.director.reels.includes('cab-ride'), 'in the show: ' + show.gtm.director.reels.join(', '));
  const { game, gtm, snap } = await withRecipe('reel', 'reels/cab-ride.js', { hash: '#attract/cab-ride' }), D = gtm.director, caps = new Set();
  let first = null;
  for (let t = 0; t < 60 && !D.stats.ended['cab-ride']; t += .5) { game.advance(.5); first ||= snap().reel; if (D.caption) caps.add(D.caption.text); }
  assert.equal(first, 'cab-ride', 'the reel played');
  assert.equal(D.stats.ended['cab-ride'], 1, 'to its end: ' + JSON.stringify(D.log));
  assert.ok(!D.stats.cuts['cab-ride'], 'never cut');
  assert.ok(D.stats.views.has('top') && D.stats.views.has('side7'), 'its camera plan: ' + [...D.stats.views]);
  assert.ok(caps.has('TAKE A CAB') && caps.has('ALL THE WAY HOME'), 'its captions: ' + [...caps]);
  assert.equal(D.stats.errors, 0);
});
