// FAN-OUT B review, determinism and saves (PLAN.md 7.8: "The attract mode and the Proving Ground never write"; 8.19's
// Accept). The Proving Ground's lab zones (lab-zones.js) run the play scene on the Proving Ground's town and put the
// player at its 'safehouse' door; the career offers △ SAVE at any district's safehouse (Career._doors has no lab
// check), Career.write refuses only the demo, and SaveStore.locked (the lock save.js documents for exactly this) is set
// nowhere. Saving there writes the lab's blank game, at the town's coordinates, over the player's real slot.
// Run: node --test tests/review/determinism/proving-ground-writes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('the Proving Ground never writes: no SAVE at its town\'s safehouse, and the player\'s slot 1 is left as it was', async () => {
  const { game, gtm, snap } = await loadGame({ hash: '#proving/traffic', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(1);
  assert.equal(snap().zone, 'traffic');
  const C = gtm.career, mem = gtm.motor.memoryBackend(); C.saves.backend = mem;   // (headless: storage in memory, as tools/bot.mjs keeps it)
  const real = { schema: 1, game: 'GrandTheftMoto-5S', slot: '1', label: 'Lowtown', crewFund: 98765, missions: { done: ['prologue', 'saints_holy_rollers'], medals: {} }, savedAt: 1 };
  mem.set(C.saves.key('1'), JSON.stringify(real));
  const prompt = C.prompt ? C.prompt.text : null;
  // what a player does at that prompt: △, SLOT 1, SAVE OVER IT
  if (C.prompt) C.prompt.act();
  const U = gtm.ui.screens;
  if (U.top && U.top.cards) U.top.cards.cards.find(c => c.slot === '1').act();
  const yes = U.top && U.top.list && U.top.list.items.find(i => /SAVE OVER/.test(i.label)); if (yes) yes.act();
  const now = JSON.parse(mem.get(C.saves.key('1')));
  const saveOffered = /\{onFoot:interact\} SAVE\b/.test(prompt || '');
  assert.deepEqual({ saveOffered, writes: C.saves.writes, fund: now.crewFund, done: now.missions.done.length }, { saveOffered: false, writes: 0, fund: 98765, done: 2 },
    `in #proving/traffic the career offers "${prompt}" (store locked: ${C.saves.locked}); saving there wrote ${C.saves.writes} save(s): slot 1 now holds $${now.crewFund}, ${now.missions.done.length} missions, Dex at ${JSON.stringify(now.protagonists && now.protagonists.dex.pos)} (was $98765 and 2 missions)`);
});
