// FAN-OUT B (missions and activities). Career._free (src/game/scenes/career.js) returns as soon as the player stands
// within TUNE.giverReach (18 u) of an offered mission's marker, before _doors() can offer the door's own prompt. Two
// givers stand on doors: the prologue and the Big Withdrawal on the chapel's (the safehouse: △ SAVE, PLAN.md 8.19, D21),
// and the three heist setups on the Greasy Spoke's (the diner: full health, PLAN.md 8.16). While any of them is on
// offer the door's prompt only shows in the 2 u ring between 18 and 20 u (SHOP_R) from the door: the game can't be
// saved at the safehouse before the finale (nor before the prologue is done), and the diner sells nothing during the
// whole heist's setup.
//   node --test tests/review/missions/giver-shadows-save-and-diner.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('the chapel\'s SAVE and the Greasy Spoke\'s diner are offered at their doors while a job is on offer there', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(1);
  const C = gtm.career, p = gtm.crew.ped, city = gtm.city, done = C.save.missions.done;
  // walk up to a door (from a few steps off, so the marker counts as entered), answer NOT NOW to a JOB card, and read
  // the prompt the door gives; then the same 1 u further out, ring by ring
  const at = (q, dy) => { p.place(q.x, q.y + dy, 0); p.mover.vx = p.mover.vy = 0; };
  const door = id => {
    const q = city.poi(id); at(q, 60); game.advance(.5); at(q, 0); game.advance(.5);
    const card = C.card && C.card.id; C.close(); game.advance(.5);
    const rings = []; for (let d = 0; d <= 24; d += 2) { at(q, d); game.advance(.25); if (C.prompt) rings.push(d); C.close(); }
    at(q, 0); game.advance(.25);
    return { card, prompt: C.prompt ? C.prompt.text : null, rings: rings.join(',') };
  };
  // nothing on offer at either door: the prompts are there (the control)
  done.push('prologue');
  const chapel0 = door('safehouse'), diner0 = door('greasy-spoke');
  assert.equal(chapel0.prompt, '{onFoot:interact} SAVE'); assert.equal(diner0.prompt, '{onFoot:interact} SHOP  THE GREASY SPOKE');
  // a gang's chain done: Setup: Getaway is on offer at the diner's door
  done.push('rats_rat_run', 'rats_below_deck', 'rats_crane_game');
  const diner = door('greasy-spoke');
  // the three setups done: The Big Withdrawal is on offer at the chapel's door
  done.push('heist_getaway', 'heist_blueprints', 'heist_big_drill');
  const chapel = door('safehouse');
  assert.deepEqual({ chapel: chapel.prompt, diner: diner.prompt }, { chapel: '{onFoot:interact} SAVE', diner: '{onFoot:interact} SHOP  THE GREASY SPOKE' },
    `with a job on offer, at the door after NOT NOW: chapel ${JSON.stringify(chapel)} (control ${JSON.stringify(chapel0)}), diner ${JSON.stringify(diner)} (control ${JSON.stringify(diner0)}); ` +
    `"rings": the distances (u, south of the door) where a prompt shows`);
});
