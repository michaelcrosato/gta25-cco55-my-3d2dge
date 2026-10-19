// Free roam in Lowtown (PLAN.md 9.1; M2: the city in all three views; M3: the crew on foot and the fights; M4: the
// vehicles: get in with △ / E by any door, jack the driver, drive, bail out; the L's trains and the MPD Eye). The three
// protagonists live in the city as Peds: Dex starts at the safehouse (#play/<poi> starts him at any point of interest:
// #play/bank-door, #play/marina), Viv at the Greasy Spoke, Gus at the car wash. The player possesses one through the
// HumanController's Intent; hold d-pad down (Z) for the character wheel and the switch camera, hold L1 (Q) for the
// weapon wheel. Pickups lie where the district puts them; Molotovs, grenades and rockets light the Fire grid. Crimes
// earn stars (M6: the police come; lose them out of sight, at Spray & Pray in a car, or a star with a bribe); WRECKED
// wakes you at the hospital, NABBED at the precinct without your guns, each for a fee. The world
// clock runs from night (?time=day | dusk | night | dawn | <hour>) and the weather changes with it (?weather=clear |
// overcast | rain | storm | fog holds one); Dock Road's drawbridge lifts every 3 game hours (?bridge=up starts it up).
// ?crowd=1 tops the real crowd and cars round the focus up to the perf gate's 40 walkers and 20 cars with stand-ins
// (presentation only); ?traffic=0 empties the streets and sidewalks; ?tour=1 drives the camera round the district's tour
// at car speed and ?perf=1 records each frame's times (tools/perf.mjs).
import { E, def, get, all, expose, BUS, TUNE, knob, FloorChunks, buildCity, CityRenderer, WorldClock, Weather, Drawbridge, skyAt, drawBoxModel, carModel,
  Ped, Crew, Combat, CombatFX, Wheel, WeaponWheel, wheelPointer, drawPedHud, drawAimMarks, losClear, clearIntent, makeIntent,
  Fleet, VehicleFX, drawVehicle, drawTrain, drawVehicleHud, spawnFleet, boardingFor, inReach, exitFor, boxDistance, stationLabel, modelOf, SpeedZoom, drawPrompt, CityLife, AutoPlayer, roadsOf,
  Radar, drawWanted } from '../../motor/index.js';
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
knob('Camera', 'camLead', 'Driving look-ahead', .32, 0, 1, .02, 'Seconds of a vehicle\'s travel the ISO camera looks ahead of it');
knob('Wanted', 'hospitalFee', 'Hospital bill', 100, 0, 5000, 10, 'What WRECKED costs ($)');
knob('Wanted', 'bailFee', 'Bail', 250, 0, 5000, 10, 'What NABBED costs ($), the guns aside');
knob('Wanted', 'resprayFee', 'Respray', 100, 0, 5000, 10, 'What Spray & Pray charges to lose the stars ($)');
knob('Wanted', 'cardTime', 'WRECKED and NABBED last', 3.2, 1, 10, .1, 'Seconds the card shows before the respawn');
const NOAIM = { candidates: [], level: 'off' };
const REFUSED = { wanted: 'NOT WHILE WANTED', mission: 'NOT DURING THIS JOB', down: 'THEY\'RE IN NO STATE', busy: '', same: '', unknown: '' };
const DOWN = { wrecked: { text: 'WRECKED', color: '#ff3a3a', tint: 'rgba(40,0,0,.35)' }, nabbed: { text: 'NABBED', color: '#5a9aff', tint: 'rgba(0,8,40,.35)' } };

def('scenes', 'play', {
  make(app) {
    const { game, views, human, footprint, links, stage, bindings: B } = app;
    let city, map, cityR, floor, clock, weather, bridges = [], hoodName = '', tour = null, rec = null, crowd = null;
    let crew, combat, fx, weaponWheel, switchWheel, holdS = 0, toast = null, down = null, prevView = null, mouse0 = null, radar = null, inShop = false, lastCause = null;
    let fleet, vfx, zoom, fleetCount = null, lastRadio = null, lastT = 0, board = null, life = null, unsub = [], auto = null;
    const lead = [0, 0];
    const idle = makeIntent(), TOUR_SPEED = 300;   // (the tour: a sports car's top speed, PLAN.md 7.6)
    const hero = () => crew.ped, chOf = id => get('characters', id);
    function spawnCrew(startPoi) {
      crew = new Crew(); combat = new Combat({ game, city });
      const taken = [];
      for (const ch of all('characters').filter(c => c.protagonist)) {
        const first = !crew.active; let at = (first && startPoi && city.poi(startPoi)) || city.poi(ch.start.poi) || city.poi('safehouse');
        // (a deep link to another one's hangout puts the possessed one on that spot: the other stands a few steps aside)
        if (taken.some(q => Math.hypot(q.x - at.x, q.y - at.y) < 16)) at = [[-22, 0], [22, 0], [0, 22], [0, -22], [-30, 18], [30, 18]].map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy }))
          .find(q => city.walkable(Math.floor(q.x / city.T), Math.floor(q.y / city.T)) && !taken.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 16)) || at;
        taken.push(at);
        const p = new Ped({ x: at.x, y: at.y, faction: 'crew', character: ch.id, look: ch.outfits[0], weapons: ch.start.weapons, ammo: ch.start.ammo, ability: ch.ability });
        const gun = ch.start.weapons.find(w => w !== 'fists'); if (gun) p.inv.select(gun);
        crew.add(ch.id, p); combat.add(p);
      }
      for (const s of city.pickupSpots) combat.pickups.place({ kind: s.kind, item: s.item, amount: s.amount, x: s.x, y: s.y, respawn: s.respawn });
      fleet = new Fleet({ city, combat, bridges, game });
      const fl = get('fleets', 'lowtown'); fleetCount = fl ? spawnFleet(fleet, city, fl, city.seed) : null;
      if (life) life.dispose();
      life = links.query.get('traffic') === '0' ? null : new CityLife({ city, fleet, combat, footprint, spec: fl || {}, isPlayer: id => !!crew.ped && crew.ped.id === id });   // (?traffic=0: an empty city)
    }
    // the vehicle the possessed one could get into now: the nearest in reach, by its nearest door (the driver's seat)
    function boardTarget(p) {
      let best = null;
      for (const v of fleet.near(p.x, p.y, 70)) { if (!inReach(p, v)) continue; const plan = boardingFor(p, v, 0); if (plan && (!best || plan.dist < best.dist)) best = plan; }
      return best;
    }
    const PROMPT = { enterCar: 'GET IN', carjack: 'JACK', mount: 'RIDE', breakIn: 'BREAK IN' };
    // what a pickup does for the one who walks over it (true: it was used)
    function take(p, k) {
      if (k.kind === 'health') { if (p.vitals.health >= 100) return false; p.vitals.heal(k.amount); return true; }
      if (k.kind === 'armor') { if (p.vitals.armor >= 100) return false; p.vitals.addArmor(k.amount); return true; }
      if (k.kind === 'weapon') { const had = p.inv.has(k.item); p.inv.give(k.item, k.amount); if (!had) toast = { text: (get('weapons', k.item)?.name || k.item).toUpperCase(), t: 2 }; BUS.emit('pickup', { item: k.item, by: p.id }); return true; }
      if (k.kind === 'ammo') { if (!p.inv.has(k.item)) return false; p.inv.give(k.item, k.amount); return true; }
      if (k.kind === 'cash') { crew.fund += k.amount; BUS.emit('cash', { amount: k.amount, reason: 'pickup' }); toast = { text: '+$' + k.amount, t: 1.5 }; return true; }
      if (k.kind === 'bribe') { const W = wanted(); if (!W || !W.stars) return false; W.lose(1); BUS.emit('pickup', { item: 'bribe', by: p.id }); toast = { text: 'BRIBED  \u2605 -1', t: 2 }; return true; }   // (a star off; left lying with none)
      BUS.emit('pickup', { item: k.kind, by: p.id }); return true;
    }
    const wanted = () => life && life.wanted;
    const turfOf = () => all('gangs').map(q => ({ hoods: q.turf, color: q.colors[0], pattern: q.pattern }));   // (the radar's hatching)
    const stars = () => { const W = wanted(); return W ? W.stars : 0; };
    // WRECKED and NABBED: the card for downTime, then a fresh start at the hospital or the precinct, a fee, the stars
    // cleared (and, nabbed, the guns gone: not a job's tools)
    function respawn(kind) {
      const p = hero(), poi = city.poi(kind === 'nabbed' ? 'precinct' : 'hospital'), fee = kind === 'nabbed' ? TUNE.bailFee : TUNE.hospitalFee;
      // (out on the sidewalk in front, the nearest within 4 tiles: a forecourt has its trees, and one stood in front of them)
      const T = city.T, cx = Math.floor(poi.x / T), cy = Math.floor(poi.y / T); let at = null;
      for (let r = 0; r <= 4 && !at; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && city.surfaceAt(cx + dx, cy + dy) === 'walk' && city.walkable(cx + dx, cy + dy) && (!at || Math.hypot(dx, dy) < at.d)) at = { x: (cx + dx + .5) * T, y: (cy + dy + .5) * T, d: Math.hypot(dx, dy) };
      at = at || poi;
      if (p.seat) p.seat.vehicle.unseat(p); p.boarding = null;
      if (p.dead) p.revive(at.x, at.y); else { p.place(at.x, at.y, 0); p.mover.vx = p.mover.vy = 0; }
      if (kind === 'nabbed') { const gone = p.inv.strip((id, spec) => spec.keep); if (gone.length) BUS.emit('confiscated', { weapons: gone }); }
      const paid = Math.min(crew.fund, fee); crew.fund -= paid; BUS.emit('cash', { amount: -paid, reason: kind === 'nabbed' ? 'bail' : 'hospital' });
      if (life && life.police) life.police.reset(kind);
      game.cam.snap = true;   // (a cut to the hospital or the precinct, not a slide across town)
      toast = { text: (kind === 'nabbed' ? 'BAIL  -$' : 'HOSPITAL BILL  -$') + paid, t: 2.5 };
      BUS.emit('respawn', { kind, x: Math.round(at.x), y: Math.round(at.y) });
    }
    // Spray & Pray: drive in wanted and out of sight, pay, and the car comes out another colour with the stars gone
    function respray(p, v) {
      const W = wanted(), shop = city.poi('spray-pray'); if (!W || !W.stars || !shop || v.driver !== p || v.speed > 40 || Math.hypot(v.x - shop.x, v.y - shop.y) > 44) { inShop = false; return; }
      if (W.seen) { if (!inShop) toast = { text: 'NOT WHILE THEY\'RE WATCHING', t: 2 }; inShop = true; return; }   // (said once a visit; out of sight, it goes ahead)
      if (inShop === 'broke') return; inShop = true;
      if (crew.fund < TUNE.resprayFee) { toast = { text: 'NO MONEY, NO PAINT  $' + TUNE.resprayFee, t: 2 }; inShop = 'broke'; return; }
      if (crew.fund < TUNE.resprayFee) { toast = { text: 'NO MONEY, NO PAINT  $' + TUNE.resprayFee, t: 2 }; return; }
      crew.fund -= TUNE.resprayFee; BUS.emit('cash', { amount: -TUNE.resprayFee, reason: 'respray' });
      const pal = v.def.palette || [v.color], next = pal[(Math.max(0, pal.indexOf(v.color)) + 1) % pal.length]; v.color = next !== v.color ? next : '#' + ((parseInt(v.color.slice(1), 16) ^ 0x5a5a5a) >>> 0).toString(16).padStart(6, '0');
      v.flats = 0; if (v.body) v.body.flat = 0;
      W.clear('respray'); BUS.emit('respray', { vehicle: v.id, color: v.color }); toast = { text: 'RESPRAYED  -$' + TUNE.resprayFee, t: 2.5 };
    }
    const aimCtx = () => ({ candidates: combat.bodies.filter(b => b.aimable && !b.dead), toScreen: (x, y, z) => views.screenVec(x, y, z), los: (s, c) => losClear(map, s, c), level: 'standard' });
    function switchItems() {
      const ANG = { dex: Math.PI, viv: -Math.PI / 2, gus: 0 };
      const items = crew.order.map(id => {
        const m = crew.member(id), ch = chOf(id), hood = city.hoodAtPoint(m.ped.x, m.ped.y), ok = crew.canSwitch(id, { wanted: stars() });
        return { id, label: ch.name, sub: id === crew.active ? 'YOU' : `${hood ? hood.name : 'Lowtown'}  ${Math.round(m.ped.health)}%`, color: ch.color, angle: ANG[id], disabled: id !== crew.active && !ok.ok,
          icon: (g, x, y, r) => { const s = Math.round(r * 1.6); m.ped.rig.portrait(g, Math.round(x - s / 2), Math.round(y - s / 2), s, { frame: false, bg: null }); } };
      });
      return { items, sel: Math.max(0, crew.order.indexOf(crew.active)) };
    }
    function trySwitch(id) {
      const r = crew.request(id, { wanted: stars(), mission: null, H0: stage.top.H || 320, vignetteAt: who => { const v = chOf(who).vignette, q = v && city.poi(v.poi); return q ? [q.x, q.y] : null; } },
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
        tour = links.query.get('tour') === '1' && city.tour.length ? { leg: 0, at: [...city.tour[0]] } : null;
        rec = links.query.get('perf') === '1' ? { update: [], render: [], frames: 0 } : null;
        crowd = links.query.get('crowd') === '1' ? standIns() : null;
        spawnCrew(data && data.route && data.route[1]);
        if (tour) hero().place(city.tour[0][0], city.tour[0][1]);
        // ?auto=<poi>: the AutoPlayer takes the possessed protagonist there (walking, or driving a long way)
        const goal = links.query.get('auto') && city.poi(links.query.get('auto'));
        auto = goal ? new AutoPlayer({ city, roads: roadsOf(city), fleet, junctions: life ? life.junctions : null }).goto(goal.x, goal.y) : null;
        footprint.update(hero().x, hero().y);   // (the rings round the focus before the first step: traffic spawns round it)
        fx = new CombatFX(game); weaponWheel = new WeaponWheel(B); switchWheel = new Wheel({ title: 'CREW' });
        holdS = 0; toast = null; down = null; prevView = null; stage.top.hold = null; zoom = new SpeedZoom(); vfx = new VehicleFX(game); lastRadio = null; board = null; radar = null; inShop = false;
        for (const u of unsub) u(); unsub = [BUS.on('encore', () => { toast = { text: 'ENCORE!', t: 3 }; }, 'scene'),   // (the Marching Mimes, flattened)
          BUS.on('busted', e => { if (!down) down = { kind: 'nabbed', t: 0, by: e.by }; }, 'scene'),
          BUS.on('kill', e => { if (e.target === hero().id) lastCause = e.kind || 'unknown'; }, 'scene')];
        game.cam.bounds = v => map.bounds(v);
        if (!game.headless) floor.warm(hero().x, hero().y, 420);
        expose('snapshot', () => { const p = hero(), v = p.seat && p.seat.vehicle; return { scene: 'play', view: views.active, hero: [p.x, p.y, p.z].map(v => Math.round(v)), hood: hoodName, time: clock.label(), weather: weather.state,
          crew: crew.active, health: Math.round(p.health), armor: Math.round(p.armor), weapon: p.inv.current, switching: crew.switching, fund: crew.fund,
          vehicle: v ? v.def.id : null, speed: v ? Math.round(v.speed) : 0, boarding: p.boarding ? p.boarding.plan.kind : null, vehicles: fleet.vehicles.length, awake: fleet.awake, traffic: life && life.traffic ? life.traffic.count : 0, peds: life && life.crowd ? life.crowd.count : 0,
          stars: stars(), down: down ? down.kind : null }; });
        expose('teleport', (x, y) => { hero().place(x, y); game.cam.snap = true; });
        expose('life', life); expose('auto', auto); expose('city', city); expose('clock', clock); expose('weather', weather); expose('bridges', bridges); expose('crew', crew); expose('combat', combat); expose('fleet', fleet); expose('fleetCount', fleetCount);
        expose('perf', () => ({ ...rec, floor: { ...floor.stats, kept: floor.chunks.size }, walls: map.wallCache(), solids: map.solids.length, depth: stage.depth ? { ...stage.depth.stats } : null }));
        game.stateHash = () => [...crew.order.flatMap(id => { const p = crew.member(id).ped; return [Math.round(p.x * 8), Math.round(p.y * 8), Math.round(p.z * 8), Math.round(p.health * 10)]; }),
          crew.order.indexOf(crew.active), Math.round(clock.hour * 60), weather.index, Math.round(weather.wet * 100), ...bridges.map(b => Math.round(b.lift * 100)), combat.hash(), fleet.hash(), ...(life ? life.hash() : [])];
      },
      exit() { game.lights.enabled = false; game.timeScale = 1; stage.top.hold = null; game.setZoom(1); if (life) { life.dispose(); life = null; } if (auto) { auto.dispose(); auto = null; } for (const u of unsub) u(); unsub = []; },
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
        weaponWheel.update(real, p, { game, blocked: crew.switching || switchWheel.open || !!p.seat || !!p.boarding });   // (in a vehicle L1 is the nitro)
        if (!crew.switching && !p.dead) {   // the character wheel: hold d-pad down (Z), point, let go on another
          if (B.down('switch', 'onFoot') && !weaponWheel.open) { holdS += real; if (!switchWheel.open && holdS >= TUNE.wheelHold) { const w = switchItems(); switchWheel.show(w.items, w.sel); mouse0 = null; } }
          else { if (switchWheel.open) { const it = switchWheel.hide(); if (it && it.id !== crew.active) trySwitch(it.id); } holdS = 0; }
          if (switchWheel.open) { const ptr = wheelPointer(game, B, mouse0); if (ptr.mouse && !mouse0) mouse0 = ptr.mouse; switchWheel.update(real, { dir: ptr.dir }); }
        }
        game.timeScale = Math.min(weaponWheel.open || switchWheel.open ? TUNE.wheelSlow : 1, p.ability ? p.ability.timeScale : 1);
        // the player's intent (nothing while a wheel is open, the switch camera flies or the vignette plays): the vehicle
        // controls while seated, on foot otherwise
        const seated = p.seat && p.seat.vehicle;
        let I = auto ? auto.update(dt, p, { t: life ? life.t : 0, pedsNear: life ? (x, y, r) => life.pedsNear(x, y, r) : null, wet: weather.wet }) : human.update(seated ? 'vehicle' : 'onFoot', p);
        if (busy || down) I = clearIntent(I);   // (WRECKED, NABBED: the card plays out)
        if (!busy && !p.dead && I.tap.interact && !p.boarding) {   // △ / E: get in (the nearest door), or get out
          if (seated) p.leave(exitFor(p, seated, (x, y) => city.walkable(Math.floor(x / city.T), Math.floor(y / city.T)) && !fleet.near(x, y, 2).some(o => o !== seated && boxDistance(o, x, y) < 4)));
          else { const plan = boardTarget(p); if (plan) p.board(plan); }
        }
        if (crew.vignette && crew.vignette.who === crew.active) {
          const moved = Math.hypot(I.move[0], I.move[1]) > .3 || I.down.aim || Object.values(I.tap).some(Boolean);   // (any press ends it)
          if (moved) { crew.endVignette(); p.posing = null; } else { p.posing = crew.vignette.pose; I = clearIntent(I); }
        } else p.posing = null;
        if (tour) {   // the camera tour: the possessed body rides straight legs between the tour's corners at car speed (from the
          // tour's own point: a car or a body in its way pushes it aside a moment, never holds the tour up)
          const A = tour.at, to = city.tour[(tour.leg + 1) % city.tour.length], dx = to[0] - A[0], dy = to[1] - A[1], d = Math.hypot(dx, dy), step = TOUR_SPEED * dt;
          if (d <= step) { A[0] = to[0]; A[1] = to[1]; tour.leg = (tour.leg + 1) % city.tour.length; } else { A[0] += dx / d * step; A[1] += dy / d * step; }
          p.place(A[0], A[1]);
          p.mover.vx = dx / (d || 1) * TOUR_SPEED; p.mover.vy = dy / (d || 1) * TOUR_SPEED; p.mover.facing = Math.atan2(dy, dx); I = clearIntent(I);
        }
        const night = clock.hour >= 19 || clock.hour < 6.5;
        { const pv = p.seat && p.seat.vehicle; footprint.update(pv ? pv.x : p.x, pv ? pv.y : p.y); }   // (the focus where it is now: a teleport, a switch or the hospital may have moved it)
        if (life) life.update(dt, { night, wet: weather.wet, player: p.seat && p.seat.vehicle && p.seat.vehicle.driver === p ? p.seat.vehicle : null, ped: p, others: crew.order.map(id => crew.member(id).ped) });
        fleet.update(dt, { intent: v => (v.driver === p ? I : (life && life.intentFor(v)) || clearIntent(idle)), peds: combat.bodies, night, wet: weather.wet });
        const W = { map, city, combat, fleet, aim: aimCtx() }, W0 = { map, city, combat, fleet, aim: NOAIM };
        for (const id of crew.order) { const q = crew.member(id).ped; q.lazyRig = q !== p; q.update(dt, q === p ? I : clearIntent(idle), q === p ? W : W0); }   // (the others stand about: posed when drawn, aiming at nothing)
        combat.update(dt, { wet: weather.wet, takers: [p], take });
        // what the possessed one drives: its name on getting in, the station when it changes; the driving zoom
        const v = p.seat && p.seat.vehicle;
        if (v && lastRadio === null) { toast = { text: v.def.name.toUpperCase(), t: 2.2 }; lastRadio = v.radio; }
        else if (v && v.radio !== lastRadio) { lastRadio = v.radio; toast = { text: stationLabel(v.radio), t: 2 }; }
        if (!v) lastRadio = null;
        if (!tour) stage.zoomTo(down && down.kind === 'nabbed' ? 1.6 : zoom.update(dt, !!v, v ? v.speed : 0));   // (the bust camera: in close)
        board = !v && !p.boarding && !p.dead && !busy ? boardTarget(p) : null;
        // WRECKED (dead) or NABBED (the police's `busted`): the card, then the respawn
        if (p.dead && (!down || down.kind !== 'wrecked')) { down = { kind: 'wrecked', t: 0 }; BUS.emit('wrecked', { cause: lastCause || 'unknown' }); lastCause = null; }
        if (down) { down.t += dt; if (down.t > TUNE.cardTime) { const k = down.kind; down = null; respawn(k); } }
        if (v && !down) respray(p, v);
        if (I.tap.view && !busy) views.next();
        if ((I.tap.turnLeft || I.tap.turnRight) && !busy) stage.turn(I.tap.turnRight ? 1 : -1);
        if (toast) { toast.t -= real; if (toast.t <= 0) toast = null; }
        const q = hero(), qv = q.seat && q.seat.vehicle, fx1 = qv ? qv.x : q.x, fy1 = qv ? qv.y : q.y; footprint.update(fx1, fy1);
        const hd = city.hoodAtPoint(fx1, fy1); hoodName = hd ? hd.name : '';
        // the camera leads a moving vehicle by a third of a second (eased: presentation only, nothing reads it back)
        const k = Math.min(1, real * 2.5), want = qv ? [qv.body.vx * TUNE.camLead, qv.body.vy * TUNE.camLead] : [0, 0];
        lead[0] += (want[0] - lead[0]) * k; lead[1] += (want[1] - lead[1]) * k;
        if (!cam) game.focus(fx1 + (stage.depth ? 0 : lead[0]), fy1 + (stage.depth ? 0 : lead[1]), 16);   // (TOP leads by itself; MODE 7 rides its rail)
      },
      draw(r) {
        if (rec) { const st = game.stats; rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        const p = hero(), hold = stage.top.hold, pv = p.seat && p.seat.vehicle, fx0 = hold ? hold.x : pv ? pv.x : p.x, fy0 = hold ? hold.y : pv ? pv.y : p.y;
        stage.setSky(skyAt(clock.hour, weather));
        stage.begin(r, { focus: [fx0, fy0], vel: hold ? [0, 0] : pv ? [pv.body.vx, pv.body.vy] : [p.mover.vx, p.mover.vy], speed01: pv ? Math.min(1, pv.speed / 300) : 0, player: [p.x, p.y, p.z] });
        cityR.queue(stage, fx0, fy0, hold ? Math.min(1400, 520 * hold.H / 320) : stage.depth === stage.side7 ? 700 : 520, stage.world.lamps, [p.x, p.y, p.z]);
        if (life) life.draw(stage, fx0, fy0, hold ? 1400 : stage.depth === stage.side7 ? 760 : 600);
        if (crowd) {   // (presentation only: offsets round the focus, walking in place along their own line, topping the real crowd up to the gate's 40)
          const t = game.real, realPeds = life ? life.pedsNear(p.x, p.y, 200).filter(q => q.crowd && Math.abs(q.x - p.x) < 200 && Math.abs(q.y - p.y) < 170).length : 0;
          for (const c of crowd.peds.slice(realPeds)) {
            const x = p.x + c.ox + Math.sin(t * .4 + c.ph) * 40, y = p.y + c.oy, vx = Math.cos(t * .4 + c.ph) * 16;
            stage.actor(x, y, 0, (g, sx, sy, v) => c.rig.draw(g, sx, sy, v), { shadow: 4, crowd: true, key: c.rig, pose: dt => c.rig.update(dt, { x, y, z: 0, vx, vy: 0, vz: 0, facing: vx >= 0 ? 0 : Math.PI, air: false }) });
          }
          // the cars only top up the real ones round the focus to the gate's 20 (M4's fleet is real; M5 brings the traffic)
          const real = fleet.near(p.x, p.y, 240).filter(v => v.cls !== 'heli').length;
          for (const c of crowd.cars.slice(real)) { const x = p.x + c.ox, y = p.y + c.oy; stage.shape(x, y, 0, (g, P) => drawBoxModel(g, P, c.model, x, y, 0, c.h, { lit: true }), { kept: { key: c, r: 34, h: 24 } }); }
        }
        // the crew where they stand (the possessed one seen through walls), a vignette's prop beside its protagonist
        for (const id of crew.order) {
          const q = crew.member(id).ped; if (Math.abs(q.x - fx0) > 900 || Math.abs(q.y - fy0) > 900) continue;
          q.draw(stage, q === p ? { xray: true } : { crowd: true, key: q.rig });   // (the others stand about: kept images, D13)
        }
        // the fleet round the focus (parked ones are kept images), the L's trains, their effects
        const dtr = Math.min(.1, game.real - lastT), reach = hold ? 1400 : stage.depth === stage.side7 ? 760 : 600; lastT = game.real;
        for (const v of fleet.vehicles) if (Math.abs(v.x - fx0) < reach && Math.abs(v.y - fy0) < reach && stage.onScreen(v.x, v.y, v.z, v.z + v.height, v.hl + 8)) drawVehicle(stage, v, { dt: dtr, night: stage.world.lamps });
        for (const tr of fleet.trains) if (Math.abs(tr.cars[0].x - fx0) < reach + 200 && Math.abs(tr.cars[0].y - fy0) < reach + 200) drawTrain(stage, tr, modelOf(tr.line.def), { color: tr.line.def.palette[0], night: stage.world.lamps });
        vfx.draw(stage, fleet, [fx0, fy0]);
        const vg = crew.vignette; if (vg && VIGNETTE_PROPS[vg.prop]) { const q = crew.member(vg.who).ped, x = q.x + 14, y = q.y + 4; stage.shape(x, y, 0, (g, P) => drawBoxModel(g, P, VIGNETTE_PROPS[vg.prop], x, y, 0, vg.prop === 'moto' ? Math.PI / 2 : 0, { lit: true })); }
        fx.draw(stage, combat, [fx0, fy0]);
        if (!crew.switching) drawAimMarks(stage, p, game.real);
        stage.end();
        r.overlay(g => {
          const W = r.W, H = r.H, ch = chOf(crew.active);
          E.font.text(g, (hoodName || 'LOWTOWN').toUpperCase() + '  •  ' + clock.label() + '  •  ' + (views.spec.label || views.active).toUpperCase(), 6, 6, '#ffe066', { shadow: '#000' });
          if (!crew.switching) {
            drawPedHud(g, W, H, p, { color: ch.color, name: ch.short + '   $' + crew.fund });
            radar ||= new Radar(city, { turf: turfOf() }); const R = radar.r;
            radar.draw(g, 12 + R, H - 48 - R, { focus: [fx0, fy0], heading: pv && !pv.def.tool ? pv.heading : null, player: p, police: life && life.police, t: game.real });
            drawWanted(g, W, 56, wanted(), game.real);
          }
          if (!crew.switching && pv) drawVehicleHud(g, W, H, pv, { radio: stationLabel(pv.radio), x: 2 * (radar ? radar.r : 44) + 22 });
          if (board && !crew.switching) drawPrompt(g, `{interact} ${board.locked ? PROMPT.breakIn : PROMPT[board.kind]}  ${board.vehicle.def.name.toUpperCase()}`, W / 2, H - 64, B, game.input, { align: 'center', color: '#ffe066' });
          weaponWheel.draw(g, W, H); switchWheel.draw(g, W, H);
          if (vg && vg.line && vg.who === crew.active) { E.ui.box(g, W / 2 - 150, H - 46, 300, 22, { alpha: .7 }); E.font.text(g, `${chOf(vg.who).short}: ${vg.line}`, W / 2, H - 40, '#f0ecff', { align: 'center', wrap: 290 }); }
          if (crew.switching) E.font.text(g, chOf(crew.seq.to).name.toUpperCase(), W / 2, H - 30, chOf(crew.seq.to).color, { align: 'center', scale: 2, outline: '#05030c' });
          if (toast) E.font.text(g, toast.text, W / 2, 34, '#ffe066', { align: 'center', outline: '#05030c' });
          if (down && down.t > .6) { const D = DOWN[down.kind]; g.fillStyle = D.tint; g.fillRect(0, 0, W, H); g.fillStyle = '#05030c'; g.fillRect(0, 0, W, 18); g.fillRect(0, H - 18, W, 18); g._c = null; E.font.text(g, D.text, W / 2, H / 2 - 12, D.color, { align: 'center', scale: 3, outline: '#05030c' }); }
        });
      },
    };
  },
});
