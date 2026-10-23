// FAN-OUT B review, determinism and saves (PLAN.md 7.8: the save holds each protagonist's { pos, map, outfit, weapons,
// ammo, health, armor, stats, ability }, and the weather; 8.11: stats "saved per protagonist"; 8.19: save round-trips).
// A load makes the crew afresh from their characters' starts (play.js spawnCrew: outfit 0, the start weapons and ammo,
// stats at 10, an empty ability meter) and Career._apply puts back only the position, health, armour, the saved weapons
// (added to the start ones) and their ammo, and the hour. The stats, the outfit, the ability meter and the weather are
// written and never read; a gun the police took comes back with its starting ammo. The next save writes the reset
// values, so the progress is gone for good. normalizeSave also clamps the outfit to 0..2, while docs/CONTENT-GUIDE.md's
// outfit recipe (D26) adds a fourth look.
// Run: node --test tests/review/determinism/load-drops-protagonist.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';
import { withRecipe } from '../../recipes/kit.mjs';

const Q = { seed: '1', time: 'day', weather: 'clear' };
async function playing(hash = '#play/safehouse', query = Q) {
  const g = await loadGame({ hash, query }); g.game.advance(.5);
  const mem = g.gtm.motor.memoryBackend(); g.gtm.career.saves.backend = mem;   // (headless: the saves in memory, as tools/bot.mjs keeps them)
  return { ...g, mem, file: slot => JSON.parse(mem.get(g.gtm.career.saves.key(slot))) };
}
const load = (g, slot) => { g.game.go('play', { load: slot }); g.game.advance(.5); };

test('a load brings back the possessed protagonist\'s stats, outfit and ability meter, and the next save keeps them', async () => {
  const g = await playing(), { gtm } = g, p = gtm.crew.ped;
  p.stats.shooting = 63; p.stats.driving = 41;   // (hours of play: GTA V's stats raised by doing)
  gtm.career.W.outfit(1);   // (Threads' "Night out", as a purchase puts it on)
  p.ability.meter = .8;
  assert.ok(gtm.career.write('1').ok);
  const wrote = g.file('1').protagonists.dex;
  load(g, '1');
  const q = gtm.crew.ped;
  const got = { shooting: Math.round(q.stats.shooting), driving: Math.round(q.stats.driving), outfit: gtm.crew.member('dex').outfit ?? 0, ability: +q.ability.meter.toFixed(2) };
  gtm.career.write('2'); const again = g.file('2').protagonists.dex;
  assert.deepEqual({ ...got, resaved: again.stats.shooting }, { shooting: 63, driving: 41, outfit: 1, ability: .8, resaved: 63 },
    `written ${JSON.stringify({ stats: wrote.stats, outfit: wrote.outfit, ability: wrote.ability })}; after the load ${JSON.stringify(got)}; the next save writes shooting ${again.stats.shooting}`);
});

test('a load brings back the weather it was saved in', async () => {
  const g = await playing('#play/safehouse', { seed: '1' }), { gtm } = g;   // (no ?weather=: the weather is the world's own)
  gtm.weather.set('storm'); g.game.advance(.2);
  assert.ok(gtm.career.write('1').ok);
  const wrote = g.file('1').weather;
  load(g, '1');
  assert.equal(gtm.weather.state, wrote, `saved in "${wrote}", loaded into "${gtm.weather.state}"`);
});

test('a load gives back only the weapons saved: a gun the police confiscated stays gone', async () => {
  const g = await playing(), { gtm } = g, p = gtm.crew.ped;
  const taken = p.inv.strip((id, spec) => spec.keep);   // (NABBED: play.js respawn's confiscation)
  assert.ok(gtm.career.write('1').ok);
  const wrote = g.file('1').protagonists.dex;
  load(g, '1');
  const inv = gtm.crew.ped.inv.toJSON();
  assert.deepEqual([...inv.weapons], [...wrote.weapons], `confiscated ${JSON.stringify(taken)}; saved ${JSON.stringify(wrote.weapons)} ${JSON.stringify(wrote.ammo)}; after the load ${JSON.stringify(inv.weapons)} ${JSON.stringify(inv.ammo)}`);
});

test('the outfit recipe\'s fourth look survives the save\'s field checks', async () => {
  const { game, gtm } = await withRecipe('outfit', 'outfits/track-suit.js', { hash: '#play/threads', query: Q });
  game.advance(.5);
  const C = gtm.career, mem = gtm.motor.memoryBackend(); C.saves.backend = mem;
  gtm.crew.fund = 2000;
  C._shopCard(gtm.motor.get('shops', 'threads'), { ped: gtm.crew.ped });
  C.card.items.find(i => i.label === 'TRACK SUIT').act();   // (bought: worn, kept as outfit 3)
  assert.equal(gtm.crew.member(gtm.crew.active).outfit, 3);
  assert.ok(C.write('1').ok);
  const read = C.saves.read('1').data;   // (what a load starts from: migrated and normalized)
  assert.equal(read.protagonists.dex.outfit, 3, `written outfit ${JSON.parse(mem.get(C.saves.key('1'))).protagonists.dex.outfit}, read back as ${read.protagonists.dex.outfit} (normalizeSave clamps 0..2)`);
});
