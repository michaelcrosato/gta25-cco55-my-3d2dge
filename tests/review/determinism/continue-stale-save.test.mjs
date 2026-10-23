// FAN-OUT B review, determinism and saves (PLAN.md 7.8, 8.19; D21: the title's ✕ continues the latest save). Every
// save the career writes is stamped savedAt 0: Career.snapshot() copies the normalized save, whose savedAt is 0 for a
// new game (normalizeSave: num(d.savedAt, 0)), and SaveStore.write keeps it (data.savedAt ?? Date.now() only replaces
// null or undefined). The title's latest() sorts by savedAt, so every save ties and CONTINUE takes the first slot in
// the list ('1' before 'auto'): a safehouse save in slot 1 is continued over every autosave written after it.
// Run: node --test tests/review/determinism/continue-stale-save.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootWithStorage, slotKey } from './_storage.mjs';

test('CONTINUE resumes the newest save: the autosave written after a slot 1 save, not slot 1', async () => {
  const { game, gtm, snap, store } = await bootWithStorage({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(.5);
  const C = gtm.career;
  assert.ok(C.write('1', true).ok, 'the safehouse SAVE into slot 1 (what its slot card calls)');
  game.advance(10); gtm.crew.fund += 1000;   // (ten seconds of play and a job's pay)
  await new Promise(r => setTimeout(r, 25));   // (a later moment on the wall clock too)
  assert.ok(C.write('auto').ok, 'the autosave after a job (what Career._ended calls)');
  const s1 = JSON.parse(store.getItem(slotKey('1'))), sa = JSON.parse(store.getItem(slotKey('auto')));
  const stamps = `slot 1: savedAt ${s1.savedAt}, playtime ${s1.playtime.toFixed(1)} s, $${s1.crewFund}; autosave: savedAt ${sa.savedAt}, playtime ${sa.playtime.toFixed(1)} s, $${sa.crewFund}`;
  game.go('title'); game.advance(1);
  const cont = gtm.ui.screens.top.list.items.find(i => i.label === 'CONTINUE'), offered = cont.sub;
  cont.act(); game.advance(1);
  assert.equal(snap().scene, 'play');
  assert.deepEqual({ offered, fund: gtm.crew.fund }, { offered: 'AUTOSAVE', fund: sa.crewFund }, `CONTINUE offered "${offered}" and loaded $${gtm.crew.fund} (${stamps})`);
});
