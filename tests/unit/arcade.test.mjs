// The arcade cabinet (play/arcade.js, HANDOFF L4): the engine's shooter starter kit, the vendored slice verbatim, runs
// in a second engine game headless: its title takes a coin (✕), a play scores and ends at GAME OVER, the score and the
// best are read back, the same steps give the same play, and the cabinet never becomes the engine's current game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engineGlobal } from '../harness.mjs';

const E = engineGlobal();
const { Arcade } = await import('../../src/motor/play/arcade.js');
const kit = { id: 'shooter', title: 'CHROME RAIDERS', source: readFileSync(new URL('../../vendor/my-3d2dge/reference/starter-30-shooter.js', import.meta.url), 'utf8'), scene: 'shooter', res: [240, 320], input: {}, color: '#5af0ff' };
// a play as the bot plays it: ✕ in bursts, weaving across the playfield, a bomb every 9 s
function play(secs = 120) {
  const A = new Arcade({ E, kit }), seen = new Set(); let t = 0;
  for (let i = 0; i < secs * 120; i++) {
    const st = A.state; seen.add(st.scene);
    if (st.over) break;
    const s = st.ship, want = 136 + 70 * Math.sin(t * .8);
    A.step(1 / 120, st.scene === 'title' ? { fire: (i % 24) < 3 } : { fire: (t % .3) < .25, bomb: (t % 9) < .05, left: !!s && s.x > want + 4, right: !!s && s.x < want - 4 });
    t += 1 / 120;
  }
  const out = { ...A.state, seen: [...seen], t }; A.dispose(); return out;
}

test('the cabinet runs the shooter kit: a coin at its title, a play that scores and ends, its best kept; the same each time', () => {
  const was = E.current, warn = console.warn; console.warn = () => {};
  try {
    const a = play(), b = play();
    assert.equal(E.current, was, 'the cabinet is never the engine\'s current game');
    assert.ok(a.seen.includes('title') && a.seen.includes('shooter'), 'its title, then the kit\'s scene: ' + a.seen.join(', '));
    assert.ok(a.over && a.score > 0 && a.best === a.score && a.plays === 1, `a play ended at GAME OVER with a score: ${a.score} (best ${a.best}, plays ${a.plays}) after ${a.t.toFixed(0)} s`);
    assert.deepEqual([b.score, b.t], [a.score, a.t], 'the same steps, the same play');
  } finally { console.warn = warn; }
});
