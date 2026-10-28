// The Proving Ground's combat range (PLAN.md 8.23, M3): Dex with every weapon and deep pockets, on the range's yard.
// Dummies stand on the lane's posts, in the lock-on gallery, on the shed's roof and in the street below it; they
// show their health and get up again two seconds after they drop. The barrels and the parked Cortez take hits and
// blow, setting each other off. Hold L1 (Q) for the weapon wheel; L2 (right mouse) locks on, R2 (left mouse) fires;
// the d-pad steps through the weapons. ?bench=1 runs the weapons bench at entry (each weapon's DPS against its spec,
// in the readout); the accept tests run the same bench headless.
import { E, def, get, all, FloorChunks, Ped, Combat, CombatFX, WeaponWheel, drawPedHud, drawAimMarks, losClear, clearIntent, makeIntent, measureDps, benchable, drawBoxModel, modelOf, makeBody, TUNE } from '../../motor/index.js';
import { drawLamp } from './city-zones.js';

const BARREL = { parts: [{ box: [-3.2, -3.2, 0, 3.2, 3.2, 10], color: '#b8322a', role: 'body' }, { box: [-3.4, -3.4, 3.5, 3.4, 3.4, 4.5], color: '#8a2420', role: 'cabin' }, { box: [-1, -1, 10, 1, 1, 10.6], color: '#e8c040', role: 'body' }] };
const DUMMY_LOOK = { build: 'heroic', style: 'classic', outfit: 'shirt', hair: 'bald', colors: { skin: '#c8a060', cloth: '#d8b878', pants: '#8a6a3a', boot: '#5a4a2a', hair: '#c8a060' } };

def('provingZones', 'range', {
  title: 'Combat range',
  make(app) {
    const { game, views, human, links, stage, bindings: B } = app;
    let map, floor, combat, fx, me, dummies, things, car, carModelK, wheel, bench = null, idle;
    const spawnDummy = (x, y, z, tag) => { const d = new Ped({ x, y, z, faction: 'range', look: DUMMY_LOOK, facing: Math.PI / 2 }); d.home = [x, y, z]; d.tag = tag; d.respawn = 0; d.hostile = true; combat.add(d); return d; };
    return {
      enter() {
        map = get('maps', 'combat-range').build();
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: map.paintFloor });
        stage.setWorld({ map, floor, backdrop: new E.Backdrop('city-night') });
        // the Fire grid reads surfaces from a small stand-in for a CityMap
        combat = new Combat({ game, map, city: { w: map.w, h: map.h, T: map.T, surfaceAt: map.surfaceAt, decks: [], map } });
        const arsenal = all('weapons').map(w => w.id), ammo = Object.fromEntries(arsenal.map(id => [id, 9999]));
        me = combat.add(new Ped({ x: map.stand[0], y: map.stand[1], faction: 'crew', look: get('characters', 'dex').outfits[0], weapons: arsenal, ammo, current: 'snub38', ability: 'overdrive', facing: -Math.PI / 2 }));
        dummies = [...map.lane.map(([x, y], i) => spawnDummy(x, y - 40, 0, 'lane' + i)), ...map.gallery.map(([x, y], i) => spawnDummy(x, y, 0, 'gallery' + i)),
          spawnDummy(...map.roof.top, 'roof'), spawnDummy(...map.roof.street, 'street')];
        // barrels and the parked car: boxes that take hits, and blow at the end
        const thing = (x, y, o) => { const t = { id: o.id, x, y, z: 0, hl: o.hl, hw: o.hw, height: o.height, heading: o.heading || 0, hp: o.hp, max: o.hp, damage: o.damage, splash: o.splash, source: o.source, blown: false, dead: false,
          hurt: h => { if (t.blown) return null; t.hp -= h.amount; if (t.hp <= 0) { t.hp = 0; t.blown = true; t.dead = true; combat.explosives.blast({ x: t.x, y: t.y, z: 6, damage: t.damage, splash: t.splash, by: h.by, source: t.source }); } return { health: h.amount, armor: 0, down: false, killed: false }; },
          blow: () => { t.hp = 0; t.dead = true; } };
          combat.boxes.push(t); combat.explosive.push(t); return t; };
        things = map.barrels.map(([x, y], i) => thing(x, y, { id: 'barrel' + i, hl: 3.2, hw: 3.2, height: 10, hp: 25, damage: 80, splash: 60, source: 'barrel' }));
        car = makeBody('cortez', map.carBay[0], map.carBay[1], 0); car.color = car.def.palette[1]; carModelK = modelOf(car.def);
        things.push(thing(car.x, car.y, { id: 'car', hl: car.hl, hw: car.hw, height: 20, hp: 160, damage: 120, splash: 80, source: 'car' }));
        wheel = new WeaponWheel(B); idle = makeIntent(); fx = new CombatFX(game);
        bench = links.query.get('bench') === '1' ? all('weapons').filter(benchable).map(w => measureDps(w.id)) : null;
        game.cam.bounds = v => map.bounds(v);
        if (!game.headless) floor.warm(me.x, me.y, 400);
        return { map, floor };
      },
      update(dt) {
        const real = dt / Math.max(.05, game.timeScale);
        wheel.update(real, me, { game });
        game.timeScale = Math.min(wheel.open ? TUNE.wheelSlow : 1, me.ability ? me.ability.timeScale : 1);
        let I = human.update('onFoot', me); if (wheel.open) I = clearIntent(I);
        const W = { map, combat, aim: { candidates: combat.bodies.filter(b => b.aimable && !b.dead), toScreen: (x, y, z) => views.screenVec(x, y, z), los: (s, c) => losClear(map, s, c), level: 'standard' } };
        me.update(dt, I, W);
        for (const d of dummies) {
          d.update(dt, clearIntent(idle), W);
          if (d.dead) { d.respawn += dt; if (d.respawn > 2) { d.revive(...d.home); d.respawn = 0; d.mover.facing = Math.PI / 2; } }
        }
        combat.update(dt, { takers: [me] });
        if (me.dead) me.revive(map.stand[0], map.stand[1]);
        if (I.tap.view) views.next();
        stage.turnInput(dt, I);
        game.focus(me.x, me.y, 16);
      },
      draw(r) {
        stage.begin(r, { focus: [me.x, me.y], vel: [me.mover.vx, me.mover.vy], player: [me.x, me.y, me.z] });
        for (const [lx, ly] of map.lamps) stage.shape(lx, ly, 0, (g, P) => drawLamp(g, P, lx, ly));
        for (const t of things) {
          if (t.blown) { stage.floor((g, P) => { const q = P.proj(t.x, t.y, 0); if (q) { g.fillStyle = 'rgba(12,8,6,.6)'; g.beginPath(); g.ellipse(q[0], q[1], 10 * q[2], 5 * q[2], 0, 0, 7); g.fill(); g._c = null; } }); if (t.source !== 'car') continue; }
          const m = t.source === 'car' ? carModelK : BARREL;
          stage.shape(t.x, t.y, 0, (g, P) => drawBoxModel(g, P, m, t.x, t.y, 0, t.heading, { lit: true, paint: t.source === 'car' ? car.color : undefined, burnt: t.blown }));
        }
        for (const d of dummies) {
          d.draw(stage, {});
          if (!d.dead) stage.glow(d.x, d.y, d.z + 44, (g, sx, sy) => { E.px.rect(g, sx - 9, sy, 18, 3, '#05030c'); E.px.rect(g, sx - 8, sy + 1, Math.round(16 * d.health / 100), 1, d.health > 50 ? '#5ad84a' : d.health > 25 ? '#ffd23a' : '#ff3a3a'); }, { always: true });
        }
        me.draw(stage, { xray: true });
        fx.draw(stage, combat, [me.x, me.y]);
        drawAimMarks(stage, me, game.real);
        stage.end();
      },
      /** the HUD on the UI layer (the proving scene's hud(pen) calls it) */
      uiHud(P) { drawPedHud(P, me, { color: '#ff5a4a', name: 'RANGE' }); wheel.draw(P); },
      hud() {
        const spec = me.inv.spec(), rd = me.inv.rounds(), lines = [`${spec.name.toUpperCase()}  ${rd ? rd.mag + '/' + rd.total : ''}  KILLS ${combat.kills}  FIRE ${combat.fire ? combat.fire.count : 0}`];
        if (bench) for (const b of bench) lines.push(`${b.weapon.toUpperCase().padEnd(10)} ${b.dps.toFixed(1).padStart(6)} DPS  SPEC ${b.spec.toFixed(1).padStart(6)}  ${(b.ratio * 100).toFixed(0)}%`);
        return lines;
      },
      snapshot() { return { me: [me.x, me.y, me.z].map(Math.round), weapon: me.inv.current, kills: combat.kills, dummies: dummies.filter(d => !d.dead).length }; },
      perf() { return { floor: { ...floor.stats }, walls: map.wallCache(), bodies: combat.bodies.length }; },
      stateHash() { return [Math.round(me.x * 8), Math.round(me.y * 8), Math.round(me.z * 8), combat.hash()]; },
      handle() { return { map, combat, me, dummies, things, measure: measureDps }; },
      /** ?selftest=1: the bench (every weapon within 10% of its spec's DPS), then a lock on the lane's nearest post */
      selftest(st) {
        if (st.frame === 0) { st.rows = all('weapons').filter(benchable).map(w => measureDps(w.id)); return null; }
        const lock = combat.bodies.filter(b => b.tag && b.tag.startsWith('lane') && !b.dead).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        const checks = st.rows.map(r => ({ check: r.weapon + ' DPS', ok: r.ratio >= .9 && r.ratio <= 1.1, value: r.ratio }));
        checks.push({ check: 'dummies standing', ok: dummies.filter(d => !d.dead).length === dummies.length, value: dummies.length }, { check: 'a lane target in reach', ok: !!lock, value: lock && lock.tag });
        return { zone: 'range', ok: checks.every(c => c.ok), checks };
      },
    };
  },
});
