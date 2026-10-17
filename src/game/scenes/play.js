// Free roam in Lowtown (PLAN.md 9.1; M2: the city in all three views; M3: the crew on foot and the fights). The three
// protagonists live in the city as Peds: Dex starts at the safehouse (#play/<poi> starts him at any point of interest:
// #play/bank-door, #play/marina), Viv at the Greasy Spoke, Gus at the car wash. The player possesses one through the
// HumanController's Intent; hold d-pad down (Z) for the character wheel and the switch camera, hold L1 (Q) for the
// weapon wheel. Pickups lie where the district puts them; Molotovs, grenades and rockets light the Fire grid. The world
// clock runs from night (?time=day | dusk | night | dawn | <hour>) and the weather changes with it (?weather=clear |
// overcast | rain | storm | fog holds one); Dock Road's drawbridge lifts every 3 game hours (?bridge=up starts it up).
// ?crowd=1 adds stand-ins for M4 and M5's traffic and peds (40 walkers and 20 cars round the focus, presentation only:
// the perf gate measures their drawing before they exist); ?tour=1 drives the camera round the district's tour at car
// speed and ?perf=1 records each frame's times (tools/perf.mjs).
import { E, def, get, all, expose, BUS, TUNE, FloorChunks, buildCity, CityRenderer, WorldClock, Weather, Drawbridge, skyAt, drawBoxModel, carModel,
  Ped, Crew, Combat, CombatFX, Wheel, WeaponWheel, wheelPointer, drawPedHud, drawAimMarks, losClear, clearIntent, makeIntent } from '../../motor/index.js';
import { VIGNETTE_PROPS } from '../characters/vignette-props.js';

let cached = null;   // one Lowtown per seed: built once (about 80 ms), kept across scene changes
/** the perf stand-ins: walkers and parked cars at fixed offsets round the focus (a seeded spread, the same each run).
 *  The walkers are the engine's classic rigs, the crowd's look (D13): the protagonists keep the detailed one */
function standIns() {
  const r = E.rng(77), pick = l => l[Math.floor(r() * l.length)], peds = [], cars = [];
  for (let i = 0; i < 40; i++) {
    const c = pick(['#c84a3a', '#3a6ac8', '#e8c040', '#3a8a5a', '#8a3a8a', '#e0e0e4']);
    peds.push({ ox: (r() * 2 - 1) * 170, oy: (r() * 2 - 1) * 150, ph: r() * 6.3, sp: 30 + r() * 25, rig: new E.Humanoid({ size: .9, style: 'classic', build: pick(['chibi', 'heroic', 'bulky']), outfit: pick(['shirt', 'coat', 'tunic']), hair: pick(['short', 'spiky', 'long', 'bald']), weapon: null,
      colors: { skin: pick(['#c8906a', '#8a5a3a', '#e0b090', '#5a3a2a']), hair: pick(['#1e1a22', '#6a4a2a', '#c8a050']), cloth: c, coat: E.shade(c, -.3), pants: pick(['#2a3048', '#3a3a3a', '#5a4a3a']), boot: '#18161c' } }) });
  }
  for (let i = 0; i < 20; i++) cars.push({ ox: (r() * 2 - 1) * 190, oy: (r() * 2 - 1) * 160, h: pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), model: carModel({ color: pick(['#c8423a', '#3a6ac8', '#d8c8a0', '#3a8a5a', '#2a2a30', '#e0e0e4']) }) });
  return { peds, cars };
}
function lowtown(seed) { if (!cached || cached.seed !== seed) { const city = buildCity('lowtown', seed); cached = { seed, city, render: new CityRenderer(city) }; } return cached; }
const REFUSED = { wanted: 'NOT WHILE WANTED', mission: 'NOT DURING THIS JOB', down: 'THEY\'RE IN NO STATE', busy: '', same: '', unknown: '' };

def('scenes', 'play', {
  make(app) {
    const { game, views, human, footprint, links, stage, bindings: B } = app;
    let city, map, cityR, floor, clock, weather, bridges = [], hoodName = '', tour = null, rec = null, crowd = null;
    let crew, combat, fx, weaponWheel, switchWheel, holdS = 0, toast = null, wasted = 0, prevView = null, mouse0 = null;
    const idle = makeIntent(), TOUR_SPEED = 300;   // (the tour: a sports car's top speed, PLAN.md 7.6)
    const hero = () => crew.ped, chOf = id => get('characters', id);
    function spawnCrew(startPoi) {
      crew = new Crew(); combat = new Combat({ game, city });
      for (const ch of all('characters').filter(c => c.protagonist)) {
        const first = !crew.active, at = (first && startPoi && city.poi(startPoi)) || city.poi(ch.start.poi) || city.poi('safehouse');
        const p = new Ped({ x: at.x, y: at.y, faction: 'crew', character: ch.id, look: ch.outfits[0], weapons: ch.start.weapons, ammo: ch.start.ammo, ability: ch.ability });
        const gun = ch.start.weapons.find(w => w !== 'fists'); if (gun) p.inv.select(gun);
        crew.add(ch.id, p); combat.add(p);
      }
      for (const s of city.pickupSpots) combat.pickups.place({ kind: s.kind, item: s.item, amount: s.amount, x: s.x, y: s.y, respawn: s.respawn });
    }
    // what a pickup does for the one who walks over it (true: it was used)
    function take(p, k) {
      if (k.kind === 'health') { if (p.vitals.health >= 100) return false; p.vitals.heal(k.amount); return true; }
      if (k.kind === 'armor') { if (p.vitals.armor >= 100) return false; p.vitals.addArmor(k.amount); return true; }
      if (k.kind === 'weapon') { const had = p.inv.has(k.item); p.inv.give(k.item, k.amount); if (!had) toast = { text: (get('weapons', k.item)?.name || k.item).toUpperCase(), t: 2 }; BUS.emit('pickup', { item: k.item, by: p.id }); return true; }
      if (k.kind === 'ammo') { if (!p.inv.has(k.item)) return false; p.inv.give(k.item, k.amount); return true; }
      if (k.kind === 'cash') { crew.fund += k.amount; BUS.emit('cash', { amount: k.amount, reason: 'pickup' }); toast = { text: '+$' + k.amount, t: 1.5 }; return true; }
      BUS.emit('pickup', { item: k.kind, by: p.id }); return true;
    }
    const aimCtx = () => ({ candidates: combat.bodies.filter(b => b.aimable && !b.dead), toScreen: (x, y, z) => views.screenVec(x, y, z), los: (s, c) => losClear(map, s, c), level: 'standard' });
    function switchItems() {
      const ANG = { dex: Math.PI, viv: -Math.PI / 2, gus: 0 };
      const items = crew.order.map(id => {
        const m = crew.member(id), ch = chOf(id), hood = city.hoodAtPoint(m.ped.x, m.ped.y), ok = crew.canSwitch(id, { wanted: 0 });
        return { id, label: ch.name, sub: id === crew.active ? 'YOU' : `${hood ? hood.name : 'Lowtown'}  ${Math.round(m.ped.health)}%`, color: ch.color, angle: ANG[id], disabled: id !== crew.active && !ok.ok,
          icon: (g, x, y, r) => { const s = Math.round(r * 1.6); m.ped.rig.portrait(g, Math.round(x - s / 2), Math.round(y - s / 2), s, { frame: false, bg: null }); } };
      });
      return { items, sel: Math.max(0, crew.order.indexOf(crew.active)) };
    }
    function trySwitch(id) {
      const r = crew.request(id, { wanted: 0, mission: null, H0: stage.top.H || 320, vignetteAt: who => { const v = chOf(who).vignette, q = v && city.poi(v.poi); return q ? [q.x, q.y] : null; } },
        (m, fresh, at) => { if (fresh && at) m.ped.place(at[0], at[1], 0); });
      if (!r.ok) { if (REFUSED[r.reason]) toast = { text: REFUSED[r.reason], t: 2 }; return; }
      prevView = views.active; if (prevView !== 'top') game.setView('top');
    }
    return {
      pausable: true,
      enter(data) {
        ({ city, render: cityR } = lowtown(+(links.query.get('seed') || 1999)));
        map = city.map;
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: (g, x0, y0, x1, y1) => city.painter.paint(g, x0, y0, x1, y1) });
        stage.setWorld({ map, city, floor });
        clock = new WorldClock(links.query.get('time') || 'night');
        const w = links.query.get('weather'); weather = new Weather(w ? { state: w, fixed: true } : {});
        bridges = city.drawbridges.map(b => new Drawbridge(b, city)); cityR.bridges = bridges;
        if (links.query.get('bridge') === 'up') bridges.forEach(b => b.raiseNow());
        tour = links.query.get('tour') === '1' && city.tour.length ? { leg: 0 } : null;
        rec = links.query.get('perf') === '1' ? { update: [], render: [], frames: 0 } : null;
        crowd = links.query.get('crowd') === '1' ? standIns() : null;
        spawnCrew(data && data.route && data.route[1]);
        if (tour) hero().place(city.tour[0][0], city.tour[0][1]);
        fx = new CombatFX(game); weaponWheel = new WeaponWheel(B); switchWheel = new Wheel({ title: 'CREW' });
        holdS = 0; toast = null; wasted = 0; prevView = null; stage.top.hold = null;
        game.cam.bounds = v => map.bounds(v);
        if (!game.headless) floor.warm(hero().x, hero().y, 420);
        expose('snapshot', () => { const p = hero(); return { scene: 'play', view: views.active, hero: [p.x, p.y, p.z].map(v => Math.round(v)), hood: hoodName, time: clock.label(), weather: weather.state,
          crew: crew.active, health: Math.round(p.health), armor: Math.round(p.armor), weapon: p.inv.current, switching: crew.switching, fund: crew.fund }; });
        expose('teleport', (x, y) => hero().place(x, y));
        expose('city', city); expose('clock', clock); expose('weather', weather); expose('bridges', bridges); expose('crew', crew); expose('combat', combat);
        expose('perf', () => ({ ...rec, floor: { ...floor.stats, kept: floor.chunks.size }, walls: map.wallCache(), solids: map.solids.length, depth: stage.depth ? { ...stage.depth.stats } : null }));
        game.stateHash = () => [...crew.order.flatMap(id => { const p = crew.member(id).ped; return [Math.round(p.x * 8), Math.round(p.y * 8), Math.round(p.z * 8), Math.round(p.health * 10)]; }),
          crew.order.indexOf(crew.active), Math.round(clock.hour * 60), weather.index, Math.round(weather.wet * 100), ...bridges.map(b => Math.round(b.lift * 100)), combat.hash()];
      },
      exit() { game.lights.enabled = false; game.timeScale = 1; stage.top.hold = null; },
      update(dt) {
        const real = dt / Math.max(.05, game.timeScale);
        const h0 = clock.hour; clock.update(dt); const hours = ((clock.hour - h0) + 24) % 24;
        weather.update(dt, hours);
        for (const b of bridges) b.update(dt, hours, br => crew.order.some(id => br.contains(crew.member(id).ped.x, crew.member(id).ped.y)));   // (it waits while a protagonist is on it)
        // the switch camera: TOP, held where the crew says, until control passes
        const wasSwitching = crew.switching, cam = crew.update(dt);
        if (cam) { stage.top.hold = { x: cam.x, y: cam.y, H: cam.H }; game.focus(cam.x, cam.y, 1); }
        else if (wasSwitching) { stage.top.hold = null; if (prevView && prevView !== 'top') game.setView(prevView); prevView = null; }
        const p = hero(), busy = crew.switching || weaponWheel.open || switchWheel.open;
        // the wheels: held open, picked on release
        weaponWheel.update(real, p, { game, blocked: crew.switching || switchWheel.open });
        if (!crew.switching && !p.dead) {   // the character wheel: hold d-pad down (Z), point, let go on another
          if (B.down('switch', 'onFoot') && !weaponWheel.open) { holdS += real; if (!switchWheel.open && holdS >= TUNE.wheelHold) { const w = switchItems(); switchWheel.show(w.items, w.sel); mouse0 = null; } }
          else { if (switchWheel.open) { const it = switchWheel.hide(); if (it && it.id !== crew.active) trySwitch(it.id); } holdS = 0; }
          if (switchWheel.open) { const ptr = wheelPointer(game, B, mouse0); if (ptr.mouse && !mouse0) mouse0 = ptr.mouse; switchWheel.update(real, { dir: ptr.dir }); }
        }
        game.timeScale = Math.min(weaponWheel.open || switchWheel.open ? TUNE.wheelSlow : 1, p.ability ? p.ability.timeScale : 1);
        // the player's intent (nothing while a wheel is open, the switch camera flies or the vignette plays)
        let I = human.update('onFoot', p);
        if (busy) I = clearIntent(I);
        if (crew.vignette && crew.vignette.who === crew.active) {
          const moved = Math.hypot(I.move[0], I.move[1]) > .3 || I.tap.attack || I.tap.jump || I.tap.roll || I.down.aim;
          if (moved) { crew.endVignette(); p.posing = null; } else { p.posing = crew.vignette.pose; I = clearIntent(I); }
        } else p.posing = null;
        if (tour) {   // the camera tour: the possessed body rides straight legs between the tour's corners at car speed
          const to = city.tour[(tour.leg + 1) % city.tour.length], dx = to[0] - p.x, dy = to[1] - p.y, d = Math.hypot(dx, dy), step = TOUR_SPEED * dt;
          if (d <= step) { p.place(to[0], to[1]); tour.leg = (tour.leg + 1) % city.tour.length; } else p.place(p.x + dx / d * step, p.y + dy / d * step);
          p.mover.vx = dx / (d || 1) * TOUR_SPEED; p.mover.vy = dy / (d || 1) * TOUR_SPEED; p.mover.facing = Math.atan2(dy, dx); I = clearIntent(I);
        }
        const W = { map, city, combat, aim: aimCtx() };
        for (const id of crew.order) { const q = crew.member(id).ped; q.update(dt, q === p ? I : clearIntent(idle), W); }
        combat.update(dt, { wet: weather.wet, takers: [p], take });
        // WASTED: three seconds, then the hospital (and its bill)
        if (p.dead) { wasted += real; if (wasted > 3.2) { const h = city.poi('hospital'); p.revive(h.x, h.y); crew.fund = Math.max(0, crew.fund - 100); wasted = 0; toast = { text: 'HOSPITAL BILL  -$100', t: 2.5 }; } } else wasted = 0;
        if (I.tap.view && !busy) views.next();
        if ((I.tap.turnLeft || I.tap.turnRight) && !busy) stage.turn(I.tap.turnRight ? 1 : -1);
        if (toast) { toast.t -= real; if (toast.t <= 0) toast = null; }
        const q = hero(); footprint.update(q.x, q.y);
        const hd = city.hoodAtPoint(q.x, q.y); hoodName = hd ? hd.name : '';
        if (!cam) game.focus(q.x, q.y, 16);
      },
      draw(r) {
        if (rec) { const st = game.stats; rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        const p = hero(), hold = stage.top.hold, fx0 = hold ? hold.x : p.x, fy0 = hold ? hold.y : p.y;
        stage.setSky(skyAt(clock.hour, weather));
        stage.begin(r, { focus: [fx0, fy0], vel: hold ? [0, 0] : [p.mover.vx, p.mover.vy], player: [p.x, p.y, p.z] });
        cityR.queue(stage, fx0, fy0, hold ? Math.min(1400, 520 * hold.H / 320) : stage.depth === stage.side7 ? 700 : 520, stage.world.lamps, [p.x, p.y, p.z]);
        if (crowd) {   // (presentation only: offsets round the focus, walking in place along their own line)
          const t = game.real;
          for (const c of crowd.peds) {
            const x = p.x + c.ox + Math.sin(t * .4 + c.ph) * 40, y = p.y + c.oy, vx = Math.cos(t * .4 + c.ph) * 16;
            stage.actor(x, y, 0, (g, sx, sy, v) => c.rig.draw(g, sx, sy, v), { shadow: 4, crowd: true, key: c.rig, pose: dt => c.rig.update(dt, { x, y, z: 0, vx, vy: 0, vz: 0, facing: vx >= 0 ? 0 : Math.PI, air: false }) });
          }
          for (const c of crowd.cars) { const x = p.x + c.ox, y = p.y + c.oy; stage.shape(x, y, 0, (g, P) => drawBoxModel(g, P, c.model, x, y, 0, c.h, { lit: true }), { kept: { key: c, r: 34, h: 24 } }); }
        }
        // the crew where they stand (the possessed one seen through walls), a vignette's prop beside its protagonist
        for (const id of crew.order) {
          const q = crew.member(id).ped; if (Math.abs(q.x - fx0) > 900 || Math.abs(q.y - fy0) > 900) continue;
          q.draw(stage, { xray: q === p });
        }
        const vg = crew.vignette; if (vg && VIGNETTE_PROPS[vg.prop]) { const q = crew.member(vg.who).ped, x = q.x + 14, y = q.y + 4; stage.shape(x, y, 0, (g, P) => drawBoxModel(g, P, VIGNETTE_PROPS[vg.prop], x, y, 0, vg.prop === 'moto' ? Math.PI / 2 : 0, { lit: true })); }
        fx.draw(stage, combat, [fx0, fy0]);
        if (!crew.switching) drawAimMarks(stage, p, game.real);
        stage.end();
        r.overlay(g => {
          const W = r.W, H = r.H, ch = chOf(crew.active);
          E.font.text(g, (hoodName || 'LOWTOWN').toUpperCase() + '  •  ' + clock.label() + '  •  ' + (views.spec.label || views.active).toUpperCase(), 6, 6, '#ffe066', { shadow: '#000' });
          if (!crew.switching) drawPedHud(g, W, H, p, { color: ch.color, name: ch.short + '   $' + crew.fund });
          weaponWheel.draw(g, W, H); switchWheel.draw(g, W, H);
          if (vg && vg.line && vg.who === crew.active) { E.ui.box(g, W / 2 - 150, H - 46, 300, 22, { alpha: .7 }); E.font.text(g, `${chOf(vg.who).short}: ${vg.line}`, W / 2, H - 40, '#f0ecff', { align: 'center', wrap: 290 }); }
          if (crew.switching) E.font.text(g, chOf(crew.seq.to).name.toUpperCase(), W / 2, H - 30, chOf(crew.seq.to).color, { align: 'center', scale: 2, outline: '#05030c' });
          if (toast) E.font.text(g, toast.text, W / 2, 34, '#ffe066', { align: 'center', outline: '#05030c' });
          if (p.dead && wasted > .6) { g.fillStyle = 'rgba(40,0,0,.35)'; g.fillRect(0, 0, W, H); E.font.text(g, 'WASTED', W / 2, H / 2 - 12, '#ff3a3a', { align: 'center', scale: 3, outline: '#05030c' }); }
        });
      },
    };
  },
});
