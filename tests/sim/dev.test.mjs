// The dev menu (PLAN.md 8.23's dev tools), headless: ` opens it only with ?dev=1 (and the pause offers it); its tuning
// pages move a knob live and DEFAULTS puts it back; its overlays toggle; its world tools set the hour, the stars, take
// the player to a point of interest and park a vehicle beside them; GO starts a mission at a stage, and District 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

const row = (list, label) => list.items.find(i => i.label === label);

test('the dev menu: only with ?dev=1; the tuning pages, the overlays, the world tools and GO', async () => {
  { const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } });
    game.advance(.5); holdCode(game, 'Backquote');
    assert.equal(gtm.ui.screens.top, null, 'no dev menu without ?dev=1'); }
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear', dev: '1' } });
  game.advance(.5); holdCode(game, 'Backquote');
  const S = gtm.ui.screens, dev = S.top; assert.equal(dev && dev.id, 'dev', '` opens it');
  // TUNING: a section's knobs, a slider each, live
  const sec = dev.list.items[0]; sec.act(); const page = S.top; assert.equal(page.id, 'dev-knobs');
  const k = page.list.items[0], v0 = k.get(), to = v0 === k.max ? k.min : k.max; k.set(to); assert.equal(k.get(), to, 'the knob moved'); assert.notEqual(k.get(), v0);
  S.back(); row(dev.list, 'ALL TO DEFAULTS').act(); S.top.list.items.find(i => i.label === 'DEFAULTS').act();
  assert.equal(k.get(), v0, 'DEFAULTS put it back');
  // OVERLAYS
  dev.show('overlays'); const lanes = row(dev.list, 'LANES'); lanes.set(true); assert.equal(lanes.get(), true, 'the lanes overlay on');
  // WORLD
  dev.show('world');
  row(dev.list, 'HOUR').set(22); assert.equal(Math.floor(gtm.clock.hour), 22, 'the hour');
  row(dev.list, 'WANTED').set(2); assert.equal(gtm.life.wanted.stars, 2, 'two stars'); row(dev.list, 'WANTED').set(0); assert.equal(gtm.life.wanted.stars, 0, 'none');
  const place = row(dev.list, 'PLACE'), pi = place.options.findIndex(o => o[1] === 'precinct'); place.set(pi); row(dev.list, 'TELEPORT THERE').act(); game.advance(.1);
  const pc = gtm.city.poi('precinct'), P = gtm.crew.ped; assert.ok(Math.hypot(P.x - pc.x, P.y - pc.y) < 140, 'at the precinct (' + Math.round(Math.hypot(P.x - pc.x, P.y - pc.y)) + ' u)');
  holdCode(game, 'Backquote'); dev.show('world'); const n0 = gtm.fleet.vehicles.length;
  const veh = row(dev.list, 'VEHICLE'); veh.set(veh.options.findIndex(o => o[1] === 'zephyr')); row(dev.list, 'SPAWN IT BESIDE YOU').act();
  assert.equal(gtm.fleet.vehicles.length, n0 + 1, 'a vehicle beside the player'); assert.equal(gtm.fleet.vehicles[gtm.fleet.vehicles.length - 1].def.id, 'zephyr');
  // GO: a mission at a stage
  holdCode(game, 'Backquote'); dev.show('go');
  const mis = row(dev.list, 'MISSION'), mi = mis.options.findIndex(o => o[1] === 'HOLY ROLLERS'); mis.set(mi);
  const stg = row(dev.list, 'AT THE STAGE'); stg.set(1); const want = stg.options[1][1]; row(dev.list, 'START THE MISSION').act(); game.advance(.2);
  assert.equal(gtm.career.R.state, 'running'); assert.equal(gtm.career.R.id, 'saints_holy_rollers'); assert.equal(gtm.career.R.stage.id, want, 'at the stage asked for');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('District 2 (the stub): the dev menu\'s GO and ?dev=1&district=district2 load it, the bridge closed; never without ?dev=1', async () => {
  const q = { seed: '1999', time: 'day', weather: 'clear' };
  const { game, gtm, snap } = await loadGame({ hash: '#play', query: { ...q, dev: '1' } });
  game.advance(.5); holdCode(game, 'Backquote'); const dev = gtm.ui.screens.top; dev.show('go');
  row(dev.list, 'DISTRICT 2 (THE STUB)').act(); game.advance(4);
  const s = snap(), C = gtm.city;
  assert.equal(s.hood, 'District 2'); assert.equal(C.w, 48); assert.ok(s.traffic > 0 && s.peds > 0, `traffic ${s.traffic}, crowd ${s.peds}`);
  assert.ok(C.signs.some(g => /BRIDGE CLOSED/.test(g.text)), 'the closed bridge\'s sign');
  assert.equal(gtm.motor.validateCity(C).errors.length, 0, 'it validates');
  const home = C.poi('safehouse'); assert.ok(Math.hypot(gtm.crew.ped.x - home.x, gtm.crew.ped.y - home.y) < 80, 'at its safehouse');
  assert.equal(gtm.career.available().length, 0, 'free roam: no job on offer');
  const linked = await loadGame({ hash: '#play', query: { ...q, dev: '1', district: 'district2' } }); linked.game.advance(.5);
  assert.equal(linked.snap().hood, 'District 2', 'by the link');
  const plain = await loadGame({ hash: '#play', query: { ...q, district: 'district2' } }); plain.game.advance(.5);
  assert.equal(plain.gtm.city.w, 160, 'without ?dev=1: Lowtown');
  assert.ok(plain.gtm.city.signs.some(g => /BRIDGE CLOSED/.test(g.text)), 'and Lowtown\'s side of the bridge is signed too');
});
