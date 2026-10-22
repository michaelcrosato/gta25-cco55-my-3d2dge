// FAN-OUT B review, determinism and saves (PLAN.md 8.19; D21: "during a mission only a step that asks for it offers a
// door's prompt (the prologue's save)"). The prologue's last stage asks the player to save at the chapel's door, but the
// save written there is a snapshot of a mission still running: missions.done holds no 'prologue' and the $500 reward
// is not in yet (the mission passes a line of dialogue later). Loading the slot the game told the player to save in
// offers the prologue again from its start. (With continue-stale-save.test.mjs's stamps, CONTINUE picks that slot.)
// The fix (D29): the prologue's save stage is passOnSave: a save written there passes the job first, so the slot holds
// it done and paid.
// Run: node --test tests/review/determinism/prologue-save-step.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('the save the prologue asks for counts the prologue done: its slot loads past it', async () => {
  const { game, gtm, snap } = await loadGame({ hash: '#mission/prologue/save', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(.5);
  const C = gtm.career, mem = gtm.motor.memoryBackend(); C.saves.backend = mem;   // (headless: the saves in memory)
  assert.equal(snap().career.stage, 'save');
  const door = gtm.city.poi('safehouse');   // (the chapel's door: the step's goto)
  gtm.pilot((dt, p) => { const I = gtm.motor.makeIntent(), dx = door.x - p.x, dy = door.y - p.y, d = Math.hypot(dx, dy); if (d > 4) { I.move[0] = dx / d; I.move[1] = dy / d; } return I; });
  for (let t = 0; t < 30 && !(C.prompt && /SAVE/.test(C.prompt.text)); t += .25) game.advance(.25);
  gtm.pilot(null);
  assert.ok(C.prompt && /SAVE/.test(C.prompt.text), 'the door offers SAVE');
  C.prompt.act(); gtm.ui.screens.top.cards.cards.find(c => c.slot === '1').act();   // (△, then SLOT 1)
  const slot1 = JSON.parse(mem.get(C.saves.key('1')));
  for (let t = 0; t < 10 && C.R.state === 'running'; t += .5) game.advance(.5);
  const passed = C.R.state, liveDone = [...C.save.missions.done], liveFund = gtm.crew.fund;
  game.go(game.sceneName, { load: '1' }); game.advance(1);   // (the same scene, whose store holds the slot: a deep link's #mission scene keeps its own, headless)
  const offered = gtm.career.available().map(m => m.id);
  assert.ok(!offered.includes('prologue'), `the prologue ${passed} with done ${JSON.stringify(liveDone)} and $${liveFund}; slot 1 holds done ${JSON.stringify(slot1.missions.done)} and $${slot1.crewFund}; loaded, the givers offer ${JSON.stringify(offered)}`);
});
