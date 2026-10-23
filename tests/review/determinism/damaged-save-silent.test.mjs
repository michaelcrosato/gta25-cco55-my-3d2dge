// FAN-OUT B review, determinism and saves (PLAN.md 7.8: "Loading checks every field and fills defaults. A corrupt save
// is backed up to …:bak and the player is told"; 8.19: corrupt JSON is handled). SaveStore.read backs a damaged slot up
// and returns { data: null, error: 'corrupt' }, but PLAY.enter keeps only .data (saves.read(slot).data) and plays a
// blank save instead: CONTINUE (offered for the damaged slot, which list() reports) drops the player into a new world
// with no prologue started and nothing said, the slot itself now gone. And a hand-edited v1 save whose schema is not an
// integer ("1", or missing) is taken for v0 and run through MIGRATIONS[0], which drops all three protagonists' state
// and resets the crew fund to $250, reported as no error at all.
// The fix (D29): the title passes a damaged slot by (CONTINUE says "SLOT 1 IS DAMAGED"), a load that won't read starts a
// new game with the intro and says so, a numeric-string schema reads as the number, and MIGRATIONS[0] keeps the data.
// Run: node --test tests/review/determinism/damaged-save-silent.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../../harness.mjs';
import { bootWithStorage, storage, slotKey } from './_storage.mjs';

test('CONTINUE on a damaged save tells the player (and does not drop them into a blank world)', async () => {
  const store = storage(); store.setItem(slotKey('1'), '{"schema":1,"game":"GrandTheftMoto-5S","crewFund":48000,"missions":{"done":["prologue","saints_holy');   // (cut short: a full disk, a crash mid-write)
  const { game, gtm, snap } = await bootWithStorage({ hash: '', query: { seed: '1', time: 'day', weather: 'clear' }, store });
  game.advance(.5);
  const cont = gtm.ui.screens.top.list.items.find(i => i.label === 'CONTINUE');
  const offered = { disabled: !!cont.disabled, sub: cont.sub };
  cont.act(); game.advance(.6);
  // three seconds of what the UI layer draws (the HUD's toasts and pops, any screen): headless it still lays out and records
  const said = new Set();
  for (let i = 0; i < 30; i++) {
    gtm.motor.uiFrame({ ui: gtm.ui, game, bindings: gtm.bindings }, game.scene);
    const R = gtm.ui.record(); for (const t of [...R.texts, ...R.prompts]) said.add(t.s); if (R.screen) said.add('screen:' + R.screen);
    game.advance(.1);
  }
  const told = [...said].filter(s => /DAMAGED|CORRUPT|BACKED UP|COULD ?N.?T (LOAD|READ)|UNREADABLE/i.test(s));
  const state = { scene: snap().scene, fund: gtm.crew ? gtm.crew.fund : null, mission: snap().career && snap().career.mission, bak: store.getItem(slotKey('1') + ':bak') !== null, slot1: store.getItem(slotKey('1')) !== null };
  assert.ok(told.length > 0, `CONTINUE offered ${JSON.stringify(offered)}; then ${JSON.stringify(state)}; nothing drawn said so (the UI drew ${JSON.stringify([...said].slice(0, 12))})`);
});

test('a hand-edited save whose schema is "1" (a string) loads as the v1 save it is', async () => {
  engineGlobal();
  const { memoryBackend } = await import('../../../src/motor/core/save.js');
  const { makeSaves, blankSave } = await import('../../../src/game/save.js');
  const backend = memoryBackend(), saves = makeSaves({ backend });
  const d = blankSave(); d.crewFund = 54321; d.protagonists.viv.stats.shooting = 70; d.protagonists.dex.weapons.push('smg');
  saves.write('1', d);
  const edited = { ...JSON.parse(backend.get(saves.key('1'))), schema: '1' };   // (the one field a hand edit retyped)
  backend.set(saves.key('1'), JSON.stringify(edited));
  const r = saves.read('1');
  const got = r.data && { fund: r.data.crewFund, vivShooting: r.data.protagonists.viv.stats.shooting, dexWeapons: [...r.data.protagonists.dex.weapons] };
  assert.deepEqual({ error: r.error, ...got }, { error: null, fund: 54321, vivShooting: 70, dexWeapons: ['fists', 'smg'] }, `read back with error ${r.error}, migrated from v${r.migrated}: ${JSON.stringify(got)}`);
});
