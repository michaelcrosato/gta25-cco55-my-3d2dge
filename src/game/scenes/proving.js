// The Proving Ground (PLAN.md 8.23): developer zones reached by deep link, #proving/<zone>, each a registered
// provingZones module (src/game/proving/). M1 brought 'scale' (spike S2), 'views' (S1, now the view lab) and 'pad'
// (S3); M3 the combat 'range'; the rest arrive with the systems they test. A perf readout shows on screen; ?perf=1
// records every frame's update and draw times for tools/perf.mjs. ?selftest=1 runs the zone's self-test (zone.selftest,
// called after each drawn frame with its own state until it returns { ok, checks }), published as __gtm.selftest for
// the e2e suite (tests/e2e/selftest.mjs).
import { E, def, get, all, expose } from '../../motor/index.js';

def('scenes', 'proving', {
  make(app) {
    const { game, views, links, stage } = app;
    const zones = new Map();
    let zone, id, rec, hud, selftest = null;
    const perfOn = links.query.get('perf') === '1';
    return {
      pausable: true,
      enter(data) {
        const want = data && data.route && data.route[1];
        id = get('provingZones', want) ? want : 'scale';
        if (!zones.has(id)) zones.set(id, get('provingZones', id).make(app));
        zone = zones.get(id);
        const world = zone.enter();
        rec = perfOn ? { update: [], render: [], frames: 0 } : null; hud = { draw: 0, update: 0 };
        expose('snapshot', () => ({ scene: 'proving', zone: id, view: views.active, ...zone.snapshot() }));
        expose('perf', () => ({ ...rec, ...zone.perf(), depth: stage.depth ? { ...stage.depth.stats } : null }));
        expose('yard', zone.handle ? zone.handle() : world);
        expose('zones', all('provingZones').map(z => z.id));
        game.stateHash = () => zone.stateHash();
        selftest = links.query.get('selftest') === '1' && zone.selftest ? { zone: id, frame: 0, result: null } : null;
        expose('selftest', selftest ? () => selftest.result : () => ({ zone: id, ok: null, note: 'no self-test asked (?selftest=1)' }));
      },
      exit() { if (zone && zone.exit) zone.exit(); },   // (a city zone puts its knobs back, its play scene away)
      update(dt) { zone.update(dt); },
      hud(P) { if (zone && zone.uiHud) zone.uiHud(P); },   // (a zone's HUD on the UI layer)
      draw(r) {
        const st = game.stats; hud.draw += (st.renderMs - hud.draw) * .1; hud.update += (st.updateMs - hud.update) * .1;
        if (rec) { rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        zone.draw(r);
        const d = stage.depth, title = get('provingZones', id).title.toUpperCase(), lines = [
          `${title}  ${views.active.toUpperCase()}`,
          zone.uiHud ? `DRAW ${hud.draw.toFixed(1)}  UPD ${hud.update.toFixed(1)}  ITEMS ${d ? d.stats.items : st.items}` : `DRAW ${hud.draw.toFixed(1)} MS  UPDATE ${hud.update.toFixed(2)} MS  ${d ? `QUADS ${d.stats.quads}  ITEMS ${d.stats.items}` : `ITEMS ${st.items}`}`,   // (the city zones' box is narrower)
          ...zone.hud()];
        if (selftest && !selftest.result) { selftest.result = zone.selftest(selftest) || null; selftest.frame++; }
        if (selftest) lines.push(selftest.result ? `SELF-TEST ${selftest.result.ok ? 'PASSED' : 'FAILED'}` : `SELF-TEST RUNNING (${selftest.frame})`);
        // (the box sized to its lines; a zone with the play scene's HUD has it low in the middle, between the radar and the
        // vehicle's panel, its lines wrapped to fit: clear of the HUD's corners, its banner and the player)
        const side = !!zone.uiHud, maxW = side ? Math.round(r.bw * .44) : r.bw - 8, rows = side ? lines.flatMap((s, i) => E.font.wrap(s, maxW - 8, {}).map(t => [t, i])) : lines.map((s, i) => [s, i]);
        const bw = Math.min(maxW, Math.max(side ? 120 : 220, ...rows.map(([s]) => E.font.width(s) + 8))), bh = rows.length * 9 + 6, bx = side ? Math.round((r.bw - bw) / 2) : 4, by = side ? r.bh - bh - Math.round(r.bh * .13) : 4;
        r.overlay(g => { E.ui.box(g, bx, by, bw, bh, { alpha: .75 }); rows.forEach(([s, i], k) => E.font.text(g, s, bx + 4, by + 4 + k * 9, i ? '#d8e4f0' : '#ffe066')); });
      },
    };
  },
});
