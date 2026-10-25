// The Proving Ground's garage (PLAN.md 8.8, 8.23): every vehicle definition parked in the showroom, its name over it.
// d-pad left and right (A, D) step the camera from one to the next; the HUD names the one in view, its model, kit,
// class, role and spec. ?only=id,id parks just those (the model sheet shoots one at a time at the centre);
// ?bench=1 measures each against its spec (sim/vehicle/handling.js) into the HUD; ?night=1 turns the lights on,
// ?siren=1 the sirens; ?sheet=1 hides the labels and the HUD. ?selftest=1: every model sound, every definition within
// its spec, all of them drawn.
import { E, def, get, all, expose, FloorChunks, Fleet, Combat, VehicleFX, drawVehicle, drawTrain, RailLine, Train, standInCity, classOf, modelOf, checkModel, measureHandling, handlingChecks } from '../../motor/index.js';

const T = 16;
def('provingZones', 'garage', {
  title: 'Garage',
  make(app) {
    const { game, views, human, links, stage, bindings: B } = app;
    let map, floor, city, combat, fleet, fx, shown, sel, bench, trains, night, sheet;
    // where each definition parks: land vehicles in the bays (trucks at the back; planes too), boats and seaplanes in the basin, the heli over its
    // pad, the L's cars on the track; alone (?only=one), at the centre (a boat in the basin, the L on the track)
    function park(defs) {
      const sea = d => classOf(d) === 'boat' || (classOf(d) === 'plane' && !!(d.handling || {}).water);   // (a seaplane floats in the basin with the boats)
      const out = [], land = defs.filter(d => !['boat', 'heli', 'rail'].includes(classOf(d)) && !sea(d)).sort((a, b) => (classOf(a) === 'truck' || classOf(a) === 'tow') - (classOf(b) === 'truck' || classOf(b) === 'tow'));
      const one = defs.length === 1;
      land.forEach((d, i) => { const c = i % 6, r = Math.floor(i / 6); out.push({ d, at: one ? map.center : [(4 + c * 6 + 3) * T, (5 + r * 9 + 2.5) * T + (classOf(d) === 'truck' || classOf(d) === 'tow' ? 8 : 0)], heading: -Math.PI / 2 }); });
      defs.filter(sea).forEach((d, i) => out.push({ d, at: [map.boatSpot[0] - i * 40, map.boatSpot[1]], heading: Math.PI }));
      defs.filter(d => classOf(d) === 'heli').forEach((d, i) => out.push({ d, at: one ? map.center : [map.heliPad[0] - i * 80, map.heliPad[1]], heading: -Math.PI / 2, z: 30 }));
      defs.filter(d => classOf(d) === 'rail').forEach(d => out.push({ d, at: [(map.track[0][0] + map.track[1][0]) / 2, map.track[0][1]], heading: 0 }));
      return out;
    }
    return {
      enter() {
        map = get('maps', 'garage').build();
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: map.paintFloor });
        stage.setWorld({ map, floor, backdrop: new E.Backdrop('city-night') });
        city = standInCity(map, map.surfaceAt); combat = new Combat({ game, map, city, fire: false });
        fleet = new Fleet({ city, map, combat, game }); fx = new VehicleFX(game);
        night = links.query.get('night') === '1'; sheet = links.query.get('sheet') === '1';
        const only = (links.query.get('only') || '').split(',').filter(id => get('vehicles', id)), defs = only.length ? only.map(id => get('vehicles', id)) : all('vehicles');
        shown = []; trains = [];
        for (const p of park(defs)) {
          if (classOf(p.d) === 'rail') {   // the L's cars stand on a stretch of track (a line of their own that never runs)
            const [[ax, ay], [bx]] = map.track, line = new RailLine({ points: [[ax, ay], [bx, ay], [bx, ay + 2], [ax, ay + 2]], z: 0 });
            const tr = new Train(line, { ...p.d.handling, s: (ax + bx) / 2 + (p.d.handling.cars || 2) * ((p.d.handling.carLength || 84) + 6) / 2 - ax, id: p.d.id }); trains.push({ tr, d: p.d });
            shown.push({ d: p.d, x: p.at[0], y: p.at[1], z: 0, train: tr }); continue;
          }
          const v = fleet.spawn(p.d.id, p.at[0], p.at[1], p.heading, { color: p.d.palette[0] });
          if (p.z) { v.body.z = p.z; v.ai = () => ({ to: [p.at[0], p.at[1]], alt: p.z, face: p.heading, spot: [p.at[0] + 60, p.at[1] + 30] }); }
          if (links.query.get('siren') === '1' && v.hasSiren) v.siren = true;
          v.showLights = night;
          shown.push({ d: p.d, x: p.at[0], y: p.at[1], z: p.z || 0, v });
        }
        expose('vehicles', () => all('vehicles').map(d => ({ id: d.id, name: d.name, model: d.model, kit: d.kit, class: classOf(d), role: d.role, spec: Object.entries(d.spec).map(([k, v]) => k + ' ' + v).join(', ') })));
        sel = 0; bench = links.query.get('bench') === '1' ? all('vehicles').map(d => ({ id: d.id, checks: handlingChecks(d.id, measureHandling(d.id)) })) : null;
        game.cam.bounds = v => map.bounds(v);
        const z = +links.query.get('zoom'); if (z) game.setZoom(z);
        if (!game.headless) floor.warm(map.center[0], map.center[1], 600);
        return { map, floor };
      },
      update(dt) {
        const I = human.update('onFoot', null);
        if (B.tap('right', 'onFoot') || I.tap.weaponNext) sel = (sel + 1) % shown.length;
        if (B.tap('left', 'onFoot') || I.tap.weaponPrev) sel = (sel - 1 + shown.length) % shown.length;
        if (I.tap.view) views.next();
        if (I.tap.turnLeft || I.tap.turnRight) stage.turn(I.tap.turnRight ? 1 : -1);
        fleet.update(dt, { intent: () => null, peds: [], night });
        const s = shown[sel]; if (s) game.focus(s.v ? s.v.x : s.x, s.v ? s.v.y : s.y, (s.v ? s.v.z : 0) + 8);   // (a heli is framed where it hovers)
      },
      draw(r) {
        const s = shown[sel], fx0 = s ? (s.v ? s.v.x : s.x) : map.center[0], fy0 = s ? (s.v ? s.v.y : s.y) : map.center[1];
        stage.begin(r, { focus: [fx0, fy0], vel: [0, 0] });
        const dt = Math.min(.1, game.real - (this._t ?? game.real)); this._t = game.real;
        for (const v of fleet.vehicles) drawVehicle(stage, v, { dt, night });
        for (const { tr, d } of trains) drawTrain(stage, tr, modelOf(d), { color: d.palette[0], night });
        fx.draw(stage, fleet, [fx0, fy0]);
        if (!sheet) for (const q of shown) {
          const x = q.v ? q.v.x : q.x, y = q.v ? q.v.y : q.y, z = (q.v ? q.v.z : 0) + (modelOf(q.d).height || 20) + 10, name = q.d.name.toUpperCase(), on = q === s;
          stage.glow(x, y, z, (g, sx, sy) => E.font.text(g, name, sx, sy, on ? '#ffe066' : '#c8c0e0', { align: 'center', outline: '#05030c' }), { always: true });
        }
        stage.end();
      },
      hud() {
        if (sheet) return [];
        const s = shown[sel]; if (!s) return ['GARAGE: NO VEHICLES'];
        const d = s.d, m = modelOf(d), lines = [`${d.name.toUpperCase()}  (${d.id})  ${classOf(d).toUpperCase()}  ${d.role.toUpperCase()}  MODEL ${m.name.toUpperCase()}${d.kit ? ' + ' + d.kit.toUpperCase() : ''}  ${sel + 1}/${shown.length}`,
          `SPEC ${Object.entries(d.spec).map(([k, v]) => k + ' ' + v).join('  ')}  HEALTH ${d.health}  SEATS ${d.seats || m.seats.length}`];
        if (bench) { const b = bench.find(q => q.id === d.id); if (b) lines.push(b.checks.map(c => (c.ok ? '' : '!') + c.check + ' ' + c.value).join('  ')); }
        return lines;
      },
      snapshot() { const s = shown[sel]; return { shown: shown.length, sel: s ? s.d.id : null, vehicles: fleet.vehicles.length, trains: trains.length }; },
      perf() { return { floor: { ...floor.stats }, vehicles: fleet.vehicles.length }; },
      stateHash() { return [fleet.hash()]; },
      handle() { return { map, fleet, shown, trains, bench }; },
      /** ?selftest=1: every model sound, every definition within its spec, every one drawn (a frame each, in this view) */
      selftest(st) {
        if (st.frame === 0) { st.rows = all('vehicles').map(d => ({ id: d.id, problems: checkModel(modelOf(d)), checks: handlingChecks(d.id, measureHandling(d.id)) })); return null; }
        if (st.frame < 3) { sel = (sel + 1) % shown.length; return null; }
        const checks = [{ check: 'vehicles shown', ok: shown.length === all('vehicles').length, value: shown.length }];
        for (const r of st.rows) checks.push({ check: r.id + ' model', ok: r.problems.length === 0, value: r.problems.join('; ') || 'sound' }, { check: r.id + ' handling', ok: r.checks.every(c => c.ok), value: r.checks.filter(c => !c.ok).map(c => c.check).join('; ') || 'within spec' });
        return { zone: 'garage', ok: checks.every(c => c.ok), checks };
      },
    };
  },
});
