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
      update(dt) { zone.update(dt); },
      hud(P) { if (zone && zone.uiHud) zone.uiHud(P); },   // (a zone's HUD on the UI layer)
      draw(r) {
        const st = game.stats; hud.draw += (st.renderMs - hud.draw) * .1; hud.update += (st.updateMs - hud.update) * .1;
        if (rec) { rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        zone.draw(r);
        const d = stage.depth, title = get('provingZones', id).title.toUpperCase(), lines = [
          `${title}  ${views.active.toUpperCase()}`,
          `DRAW ${hud.draw.toFixed(1)} MS  UPDATE ${hud.update.toFixed(2)} MS  ${d ? `QUADS ${d.stats.quads}  ITEMS ${d.stats.items}` : `ITEMS ${st.items}`}`,
          ...zone.hud()];
        if (selftest && !selftest.result) { selftest.result = zone.selftest(selftest) || null; selftest.frame++; }
        if (selftest) lines.push(selftest.result ? `SELF-TEST ${selftest.result.ok ? 'PASSED' : 'FAILED'}` : `SELF-TEST RUNNING (${selftest.frame})`);
        r.overlay(g => { E.ui.box(g, 4, 4, 220, lines.length * 9 + 6, { alpha: .75 }); lines.forEach((s, i) => E.font.text(g, s, 8, 8 + i * 9, i ? '#d8e4f0' : '#ffe066')); });
      },
    };
  },
});
