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
// M7: the First Lowtown Bank. △ / E at its door (or at the sewer grate round the side) fades into the interior; the city
// stands still meanwhile (its clock, weather, traffic, crowd and police unstepped, its BUS scope muted, its hash kept), and
// the interior runs its own guards, CCTV and noise (MOTOR's InteriorRun). Taken from behind, a guard goes down quietly
// (the attack button); seen past the counter, with a gun out or wanted, the guards come; a camera that sees you raises the
// alarm and the stars. △ at a door goes back out: by the door you came in, to the spot you left; by the other, to its
// own. #interior/bank starts inside.
// M8: the career (career.js) on top: the missions and their givers, the activities, the random events, the shops, the
// properties, the tokens, the stunt jumps, the hold-ups, the phone (d-pad up / T: jobs, cabs, contacts, completion) and
// the save (△ at the safehouse; the autosave after a mission or a job). #mission/<id>/<stage> starts a mission at a
// stage; ?bot=1 has the mission bot play it (?bot=pad: its wishes kept for a pad, tools/bot.mjs --pad); ?load=<slot>
// loads a save (the title's NEW GAME starts the prologue).
// M11: the attract mode plays it too (PLAY.make(app, demo)): a fresh world from demo.seed() each time it is entered, a
// blank save never written, the career's demo (the director's reels, played by its bot), no pause, no phone, the
// views the director's.
import { E, def, get, all, expose, BUS, RNG, TUNE, knob, FloorChunks, WorldClock, Weather, Drawbridge, skyAt, indoorSky, InteriorRun, drawBoxModel, carModel,
  Ped, Crew, Combat, CombatFX, Wheel, WeaponWheel, wheelPointer, drawPedHud, drawAimMarks, losClear, clearIntent, makeIntent,
  Fleet, VehicleFX, drawVehicle, drawTrain, drawVehicleHud, spawnFleet, boardingFor, inReach, exitFor, boxDistance, stationLabel, modelOf, SpeedZoom, CityLife, AutoPlayer, roadsOf,
  Radar, drawWanted, hudLayout, drawSubtitle, setting, toggled, DIFFICULTY, Onboarding, Radio, AudioDirector, SfxMap, Rumble, PhotoMode, Overlays, devScreen, WEATHERS } from '../../motor/index.js';
import { VIGNETTE_PROPS } from '../characters/vignette-props.js';
import { Career } from './career.js';
import { cityFor, citySeed } from './lowtown.js';
import { pauseScreen } from '../ui/pause.js';
import { TIPS } from '../ui/tips.js';
import { makeSaves, blankSave, normalizeSave } from '../save.js';

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
knob('Camera', 'camLead', 'Driving look-ahead', .32, 0, 1, .02, 'Seconds of a vehicle\'s travel the ISO camera looks ahead of it');
knob('Wanted', 'hospitalFee', 'Hospital bill', 100, 0, 5000, 10, 'What WRECKED costs ($)');
knob('Wanted', 'bailFee', 'Bail', 250, 0, 5000, 10, 'What NABBED costs ($), the guns aside');
knob('Wanted', 'resprayFee', 'Respray', 100, 0, 5000, 10, 'What Spray & Pray charges to lose the stars ($)');
knob('Wanted', 'cardTime', 'WRECKED and NABBED last', 3.2, 1, 10, .1, 'Seconds the card shows before the respawn');
const NOAIM = { candidates: [], level: 'off' };
const REFUSED = { wanted: 'NOT WHILE WANTED', mission: 'NOT DURING THIS JOB', down: 'THEY\'RE IN NO STATE', busy: '', same: '', unknown: '' };
const DOWN = { wrecked: { text: 'WRECKED', color: '#ff3a3a', tint: ['#280000', .35] }, nabbed: { text: 'NABBED', color: '#5a9aff', tint: ['#000828', .35] } };
const DOOR_R = 22, DOOR_FADE = .3;   // (how near a door's spot you stand to go through it; each half of its fade, s)

export const PLAY = {
  /** demo: the attract mode's ({ seed() -> the world's seed }), or null; opts.district: a district other than Lowtown
   *  (one of the Proving Ground's; else ?dev=1&district=<id>, District 2), played as free roam alone; opts.bot: the career's
   *  bot plays what it starts (the mission bench) */
  make(app, demo = null, opts = {}) {
    const { game, views, human, footprint, links, stage, bindings: B } = app;
    let city, map, cityR, floor, clock, weather, bridges = [], hoodName = '', tour = null, rec = null, crowd = null;
    let crew, combat, fx, weaponWheel, switchWheel, holdS = 0, toast = null, down = null, prevView = null, mouse0 = null, radar = null, inShop = false, lastCause = null;
    let fleet, vfx, zoom, fleetCount = null, lastRadio = null, lastT = 0, board = null, life = null, unsub = [], auto = null;
    let inside = null, transit = null, door = null, takedown = null;   // (the interior the player is in; a door's fade; the door or the guard the prompt offers)
    let district = 'lowtown';   // (the district played: Lowtown's, a Proving Ground one, District 2's)
    let career = null, save = null;   // (M8: the career on top of free roam, and the save it plays)
    let switchLatch = false;   // (the character wheel opened by a press, Settings, ACCESS)
    // photo mode (PLAN.md 8.22): the world stands still while the camera roams; a photo frames the bodies and the cars
    const photo = new PhotoMode({ game, stage, views, bindings: B, canvas: () => (typeof document !== 'undefined' ? document.getElementById('game') || document.querySelector('canvas') : null),
      bodies: () => (inside ? inside.run.combat.bodies : combat ? combat.bodies : []), vehicles: () => (inside || !fleet ? [] : fleet.vehicles) });
    const tips = new Onboarding(game, TIPS); let playT = 0, wheelT = 0;   // (the first-time hints; seconds of play, and at the wheel)
    // the sound (M10, presentation): the radio's stations as timelines (the same each seed), the director playing what
    // the possessed one's vehicle is tuned to and a job's score, the continuous voices and the SFX map; fed each frame
    let radio = null, sound = null, sfx = null, rumble = null, crowdNear = 0, crowdT = 0, lastF = 0;
    let pilot = null;   // (tests and tools: a function (dt, ped) -> Intent in place of the player's controller)
    let slow = 1;   // (a job's slow motion: m.slowmo)
    const saves = makeSaves();
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
      life = links.query.get('traffic') === '0' ? null : new CityLife({ city, fleet, combat, footprint, spec: fl || {}, respect: save.respect, isPlayer: id => !!crew.ped && crew.ped.id === id });   // (?traffic=0: an empty city; respect: the save's)
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
      const c = career && career.take(p, k); if (c !== null && c !== undefined) return c;   // (a Moto Token, a mission's item)
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
    // the player's aim assist and the damage they take (Settings, GAME): theirs to choose, the bot's always the defaults
    const assist = () => (career && career.bot ? 'standard' : setting(game, 'aimAssist', 'standard'));
    const hurtScale = () => (career && career.bot ? 1 : DIFFICULTY[setting(game, 'difficulty', 'normal')] || 1);
    const aimCtx = () => ({ candidates: combat.bodies.filter(b => b.aimable && !b.dead), toScreen: (x, y, z) => views.screenVec(x, y, z), los: (s, c) => losClear(map, s, c, city.decks), level: assist() });
    function switchItems() {
      const ANG = { dex: Math.PI, viv: -Math.PI / 2, gus: 0 };
      const items = crew.order.map(id => {
        const m = crew.member(id), ch = chOf(id), hood = city.hoodAtPoint(m.ped.x, m.ped.y), ok = crew.canSwitch(id, { wanted: stars() });
        return { id, label: ch.name, sub: id === crew.active ? 'YOU' : `${hood ? hood.name : 'Lowtown'}  ${Math.round(m.ped.health)}%`, color: ch.color, angle: ANG[id], disabled: id !== crew.active && !ok.ok,
          icon: (g, x, y, r) => { const s = Math.round(r * 1.6); m.ped.rig.portrait(g, Math.round(x - s / 2), Math.round(y - s / 2), s, { frame: false, bg: null }); } };
      });
      return { items, sel: Math.max(0, crew.order.indexOf(crew.active)) };
    }
    // the dev menu and its overlays (?dev=1; PLAN.md 8.23): ` or the pause's DEV MENU
    const devOn = links.query.get('dev') === '1', overlays = new Overlays(); let devKey0 = false;
    function openDev() {
      const S = app.ui.screens; if (!devOn || demo || S.top) return false;
      S.open(devScreen(app, { overlays, toast: s => { toast = { text: s, t: 2 }; },
        world: { hour: () => clock.hour, setHour: h => clock.set(h), weather: () => weather.state || 'clear', weathers: WEATHERS, setWeather: s => weather.set(s),
          stars: () => stars(), setStars: n => { const w = life && life.wanted; if (w) { if (n) w.set(n, 'dev'); else w.clear(); } },
          pois: city.pois.filter(q => q.kind !== 'door').map(q => q.id), teleport: id => { const q = city.poi(id); if (q) { const n = roadsOf(city).walks.nearestNode(q.x, q.y, 400); hero().place(n ? n.x : q.x, n ? n.y : q.y); game.cam.snap = true; } },
          vehicles: all('vehicles').map(d => d.id), spawn: id => { const p = hero(), v = fleet.spawn(id, p.x + 40, p.y, 0, { owner: 'world' }); if (v) fleet.wake(v); } },
        go: { missions: all('missions').map(m => ({ id: m.id, title: (m.title || m.id).toUpperCase(), stages: (m.stages || []).map(s => s.id) })), activities: all('activities').map(a => ({ id: a.id, title: (a.title || a.id).toUpperCase(), levels: a.levels || 1 })),
          start: (id, q) => career.startMission(id, q), zones: all('provingZones').map(z => z.id), zone: id => game.go('proving', { route: ['proving', id] }),
          district2: get('districts', 'district2') ? () => game.go('play', { district: 'district2' }) : null } }));
      return true;
    }
    // into photo mode, when free to (not in the demo, a card, a wheel, the switch, a fade, WRECKED or NABBED)
    function enterPhoto() { if (demo || !crew || crew.switching || (career && career.busy) || weaponWheel.open || switchWheel.open || transit || down) return false; return photo.enter(hero()); }
    function trySwitch(id, forced = false, free = false) {   // (free: a reel's switch, as a player's but in its job)
      const r = crew.request(id, forced ? { forced: true, H0: stage.top.H || 320 } : { wanted: stars(), mission: !free && career && career.running ? career.R.spec : null, H0: stage.top.H || 320, vignetteAt: who => { const v = chOf(who).vignette, q = v && city.poi(v.poi); return q ? [q.x, q.y] : null; } },
        (m, fresh, at) => { if (fresh && at) m.ped.place(at[0], at[1], 0); });
      if (!r.ok) { if (REFUSED[r.reason]) toast = { text: REFUSED[r.reason], t: 2 }; return; }
      prevView = views.active; if (prevView !== 'top') game.setView('top');
    }
    // the doors: a city door (a 'door' point of interest with its interior) the body stands at, on foot
    function cityDoor(p) {
      if (p.seat || p.boarding || p.dead) return null; let best = null, bd = DOOR_R;
      for (const q of city.pois) if (q.kind === 'door' && q.interior) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { best = q; bd = d; } }
      return best;
    }
    // into an interior by a city door: the interior's own run and world, the city held still (its BUS scope muted)
    function goInside(poi) {
      const p = hero(), spec = get('interiors', poi.interior), d = spec.doors.find(q => q.from === poi.id) || spec.doors[0];
      const run = new InteriorRun({ id: poi.interior, game: game.headless ? null : game, isPlayer: id => crew.order.some(k => crew.member(k).ped.id === id),
        crime: e => { const W = wanted(); if (W) W.crime({ ...e, x: poi.x, y: poi.y }); } });   // (the alarm: the police hear of it at the door)
      const back = { x: p.x, y: p.y, z: p.z, facing: p.mover.facing, poi: poi.id, weapon: p.inv.current };
      p.aiming = false; p.inv.select('fists');   // (in through a door, the gun put away: drawing it again is for the guards to see)
      run.enter(p, d.id); p.mover.vx = p.mover.vy = 0;
      const M = run.map, fl = new FloorChunks({ w: M.w * M.T, h: M.h * M.T, paint: (g, x0, y0, x1, y1) => run.city.painter.paint(g, x0, y0, x1, y1) });
      inside = { id: poi.interior, run, back, map: M, city: run.city, floor: fl, name: spec.name };
      BUS.mute('world'); stage.setWorld({ map: M, city: run.city, floor: fl });
      game.cam.bounds = v => M.bounds(v); game.cam.snap = true; if (!game.headless) fl.warm(p.x, p.y, 420);
      BUS.emit('interior', { id: poi.interior, door: d.id, enter: true });
    }
    // back out by door d (null: carried out, WRECKED): by the door you came in, to the spot you left; by another, to its own
    function goOutside(d) {
      const p = hero(), I0 = inside; I0.run.leave(p); I0.run.dispose(); inside = null; takedown = null;
      BUS.unmute('world'); stage.setWorld({ map, city, floor });
      game.cam.bounds = v => map.bounds(v); game.cam.snap = true;
      if (d) {
        const same = d.from === I0.back.poi, q = same ? I0.back : city.poi(d.from) || I0.back;
        p.place(q.x, q.y, same ? I0.back.z : 0); p.mover.vx = p.mover.vy = 0; p.mover.facing = same ? I0.back.facing + Math.PI : Math.PI / 2;
        if (p.inv.current === 'fists' && I0.back.weapon && p.inv.has(I0.back.weapon)) p.inv.select(I0.back.weapon);   // (the gun back in hand, if it was)
      }
      if (!game.headless) floor.warm(p.x, p.y, 420);
      BUS.emit('interior', { id: I0.id, door: d ? d.id : null, enter: false });
    }
    // a door's fade: dark over DOOR_FADE, through the door at the dark, light again (the simulation's steps time it)
    const through = go => { transit = { t: 0, go, done: false }; };
    // a door's spot on the floor: a ring that breathes, in the door's colour (yellow in, green out); a mission's marker too
    function doorRing(x, y, color, r = 9) {
      const t = game.real; stage.floor((g, P) => {
        const k = 1 + .12 * Math.sin(t * 4), pts = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, q = P.proj(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k, 0); if (!q) return; pts.push(q); }
        g.strokeStyle = color; g.lineWidth = 1.5; g.globalAlpha = .85; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts) g.lineTo(q[0], q[1]); g.stroke(); g.globalAlpha = 1;
      });
    }
    // indoors: the interior's lamps, its guards and cameras, its doors, the possessed one and the fights' effects
    function drawInside(p, fx0, fy0) {
      const R = inside.run, T = R.map.T;
      R.lights((x, y, z, rad, c) => stage.light(x, y, z, rad, 1, c ? { color: c } : undefined));
      R.draw(stage);
      for (const d of R.spec.doors) { const m = R.city.marks[d.mark]; if (m && m.length) doorRing((m[0][0] + .5) * T, (m[0][1] + .5) * T, '#7aff8a'); }
      p.draw(stage, { xray: true });
      fx.draw(stage, R.combat, [fx0, fy0]);
      drawAimMarks(stage, p, game.real);
    }
    // the world the career and its missions see (live: the scene makes its parts again on enter)
    const world = {
      game, stage,
      get city() { return city; }, get fleet() { return fleet; }, get combat() { return combat; }, get crew() { return crew; }, get life() { return life; },
      get clock() { return clock; }, get weather() { return weather; }, get roads() { return city ? roadsOf(city) : null; }, get junctions() { return life ? life.junctions : null; },
      get bot() { return !!(career && career.bot); },
      wanted: () => wanted(),
      cash: (n, why) => { crew.fund = Math.max(0, crew.fund + n); BUS.emit('cash', { amount: n, reason: why }); },
      respect: (g, d, why) => { if (life && life.gangs) life.gangs.add(g, d, why); else save.respect[g] = Math.max(-100, Math.min(100, (save.respect[g] || 0) + d)); },
      possess: id => { if (crew.possess(id)) game.cam.snap = true; },
      switchTo: (id, o = {}) => trySwitch(id, !o.vignette, !!o.vignette),
      enter: (id, doorId) => { const spec = get('interiors', id), d = spec && (spec.doors.find(q => q.id === doorId) || spec.doors[0]); if (d && !inside) goInside(city.poi(d.from)); },
      leave: () => { if (inside) goOutside(inside.run.spec.doors.find(q => q.from === inside.back.poi) || inside.run.spec.doors[0]); },
      inside: () => inside,
      snap: () => { game.cam.snap = true; const p = hero(), v = p.seat && p.seat.vehicle; footprint.update(v ? v.x : p.x, v ? v.y : p.y); },
      fade: go => through(go),
      ring: (x, y, color, r) => doorRing(x, y, color, r),
      outfit: i => { const ch = chOf(crew.active), look = ch && ch.outfits[i]; if (look) { hero().rig.setLook(look); crew.member(crew.active).outfit = i; } },
      stash: (v, id, at) => career && career.stash(v, id, at),
      garaged: id => (career ? career.garaged(id) : null),
      slowmo: k => { slow = Math.max(.1, Math.min(1, +k || 1)); },
      photo: () => enterPhoto(),   // (the phone's SNAP)
      endMission: () => {},
    };
    const subtitle = (P, name, color, line, y) => { if (setting(game, 'subtitles', true)) drawSubtitle(P, name, color, line, y); };
    // the GPS line on the radar, in a vehicle: the quickest way by road to the waypoint, or to the job's marker (worked
    // out again twice a second, or when the goal moves: presentation, nothing reads it back)
    let gps = null;
    function gpsRoute(v) {
      const goal = v && !inside && career ? career.gpsGoal() : null; if (!goal) { gps = null; return null; }
      const t = game.real; if (gps && gps.goal[0] === goal[0] && gps.goal[1] === goal[1] && t - gps.t < .5) return gps.pts;
      const R = roadsOf(city), r = R.gps.routeTo(v.x, v.y, v.heading, goal[0], goal[1], { z: v.z || 0 });
      gps = { goal, t, pts: r ? [[v.x, v.y], ...r.lanes.map(i => R.graph.lanes[i].b), goal] : null }; return gps.pts;
    }
    // the sound for this frame: the radio tuned in the possessed one's vehicle at the radio clock (play time: saved, so
    // a station picks up where it was), a job's score, the engines and sirens round the focus, the weather and the
    // street's murmur, footsteps, horns held and the gangs' payphones ringing (presentation: read only)
    function feedSound(p, pv, fx0, fy0) {
      if (!sound || game.headless) return;
      const t = game.real, dt = Math.min(.1, Math.max(0, t - lastF)); lastF = t;
      if (!inside && life && (crowdT -= dt) <= 0) { crowdT = .5; crowdNear = Math.min(1, life.pedsNear(fx0, fy0, 180).length / 15); }
      const near = inside ? [] : fleet.vehicles.filter(v => Math.abs(v.x - fx0) < 700 && Math.abs(v.y - fy0) < 700 && !v.wrecked && v.cls !== 'rail');
      const mine = pv && pv.driver === p ? pv : null;
      sound.frame({ station: mine ? mine.radio : 'off', t: save.playtime, volume: setting(game, 'radio', .8), score: career.R.active ? career.R.music : null, dt, x: {
        listener: { x: fx0, y: fy0 }, weather: inside ? null : { rain: weather.rain, wind: weather.state === 'storm' ? 1 : weather.cloud * .3 }, zone: inside ? { crowd: 0, city: .1 } : { crowd: crowdNear, city: .4 },
        vehicles: near.filter(v => v.speed > 5 || v === mine).map(v => ({ id: v.id, x: v.x, y: v.y, speed: v.speed, slip: v.body && v.body.felt ? Math.abs(v.body.felt.slip) * (v.speed > 60 ? 1 : 0) : 0, mine: v === mine })),
        sirens: near.filter(v => v.siren).map(v => ({ id: v.id, x: v.x, y: v.y, vx: v.body ? v.body.vx : 0, vy: v.body ? v.body.vy : 0, kind: v.def.role === 'police' ? 'two' : 'wail' })) } });
      const T = city.T, sp = Math.hypot(p.mover.vx, p.mover.vy);
      rumble.frame(dt);
      sfx.frame(dt, { steps: !pv && !p.dead && !inside ? { speed: sp, surface: city.surfaceAt(Math.floor(p.x / T), Math.floor(p.y / T)), wet: weather.wet > .3 } : !pv && inside ? { speed: sp, surface: 'plaza' } : null,
        horns: near.filter(v => v.horn).map(v => ({ id: v.id, x: v.x, y: v.y, kind: v.def.horn })),
        rings: inside || career.R.active ? [] : career.available().filter(m => m.giver && m.giver.phone).map(m => { const at = career.giverOf(m); return at && Math.hypot(at[0] - fx0, at[1] - fy0) < 320 ? { x: at[0], y: at[1], gang: m.giver.phone } : null; }).filter(Boolean) });
    }
    // the pause (PLAN.md 8.18): ours, over the game held still; the engine's auto-pause comes to it (MOTOR's uiFrame)
    const U = app.ui.screens;
    const pauseView = { get city() { return city; }, get career() { return career; }, get crew() { return crew; }, get save() { return save; }, get turf() { return turfOf(); },
      player: () => { const p = hero(), v = p.seat && p.seat.vehicle; return v ? { x: v.x, y: v.y, facing: v.heading } : { x: p.x, y: p.y, facing: p.mover.facing }; },
      quitToTitle: () => { U.closeAll(); game.go('title'); },
      get dev() { return devOn && !demo ? () => { U.closeAll(); openDev(); } : null; } };
    function openPause(reason, tab) { if (demo || U.isOpen || !career) return false; U.open(pauseScreen(app, pauseView, { reason, tab })); return true; }
    return {
      // (the engine pauses on its own only for what it alone sees: the page hidden, the window left, a controller
      // unplugged; the pause button is ours, read in the step, so a pause is a step's input like any other)
      get pausable() { return !demo && !U.isOpen && !(career && career.busy) && !game.input.pressed('pause'); },
      openPause: reason => openPause(reason),
      pauseScreen: tab => pauseScreen(app, pauseView, { tab }),   // (the pause as a screen, for the Proving Ground's UI gallery)
      // (the attract mode's hold on it: the career, where the camera looks, the stars, the interior)
      get career() { return career; },
      focus() { const p = hero(), v = p.seat && p.seat.vehicle, h = stage.top.hold; return h ? [h.x, h.y] : v ? [v.x, v.y] : [p.x, p.y]; },
      stars: () => stars(),
      inside: () => !!inside,
      enter(data) {
        if (demo) RNG.seed(demo.seed());   // (the attract mode: a fresh world from its seed, every stream from the start)
        const dq = !demo && links.query.get('dev') === '1' ? links.query.get('district') : null;   // (?dev=1&district=<id>)
        district = opts.district || [data && data.district, dq].find(id => id && get('districts', id)) || 'lowtown';   // (the dev menu's GO to District 2 brings it in data)
        ({ city, render: cityR } = cityFor(district, district === 'lowtown' ? citySeed(links) : get('districts', district).seed));
        if (!demo) { const dv = links.query.get('view') || setting(game, 'defaultView', 'iso'); if (game.views.includes(dv) && views.active !== dv) game.setView(dv); }   // (Settings, Display: the view a game starts in; the attract's are its director's)
        map = city.map;
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: (g, x0, y0, x1, y1) => city.painter.paint(g, x0, y0, x1, y1) });
        stage.setWorld({ map, city, floor });
        const Q = k => (demo ? null : links.query.get(k));   // (the attract mode takes nothing from the page's link)
        clock = new WorldClock(Q('time') || 'night');
        const w = Q('weather'); weather = new Weather(w ? { state: w, fixed: true } : {});
        bridges = city.drawbridges.map(b => new Drawbridge(b, city)); cityR.bridges = bridges;
        if (Q('bridge') === 'up') bridges.forEach(b => b.raiseNow());
        tour = Q('tour') === '1' && city.tour.length ? { leg: 0, at: [...city.tour[0]] } : null;
        rec = Q('perf') === '1' ? { update: [], render: [], frames: 0 } : null; stage.profFlush = Q('prof') === '1';   // (?prof=1: the depth views' sections timed with their raster: tools/_prof)
        crowd = Q('crowd') === '1' ? standIns() : null;
        const route = (!demo && data && data.route) || [], into = route[0] === 'interior' ? get('interiors', route[1] || 'bank') : null;   // (#interior/bank: in at its first door)
        const slot = (!demo && data && data.load) || Q('load'), loaded = slot ? saves.read(slot).data : null;
        save = normalizeSave(loaded || blankSave());
        spawnCrew(into ? into.doors[0].from : route[0] === 'mission' ? null : route[1]);
        if (tour) hero().place(city.tour[0][0], city.tour[0][1]);
        // ?auto=<poi>: the AutoPlayer takes the possessed protagonist there (walking, or driving a long way)
        const goal = Q('auto') && city.poi(Q('auto'));
        auto = goal ? new AutoPlayer({ city, roads: roadsOf(city), fleet, junctions: life ? life.junctions : null }).goto(goal.x, goal.y) : null;
        footprint.update(hero().x, hero().y);   // (the rings round the focus before the first step: traffic spawns round it)
        fx = new CombatFX(game); weaponWheel = new WeaponWheel(B); switchWheel = new Wheel({ title: 'CREW' });
        holdS = 0; toast = null; down = null; prevView = null; slow = 1; stage.top.hold = null; zoom = new SpeedZoom(); vfx = new VehicleFX(game); lastRadio = null; board = null; radar = null; inShop = false;
        if (inside) { inside.run.dispose(); inside = null; BUS.unmute('world'); } transit = null; door = null; takedown = null;
        for (const u of unsub) u(); unsub = [BUS.on('encore', () => { toast = { text: 'ENCORE!', t: 3 }; }, 'scene'),   // (the Marching Mimes, flattened)
          BUS.on('busted', e => { if (!down) down = { kind: 'nabbed', t: 0, by: e.by }; }, 'scene'),
          BUS.on('kill', e => { if (e.target === hero().id) lastCause = e.kind || 'unknown'; }, 'scene')];
        game.cam.bounds = v => map.bounds(v);
        if (!game.headless) floor.warm(hero().x, hero().y, 420);
        if (into) goInside(city.poi(into.doors[0].from));
        if (career) career.dispose();
        career = demo ? new Career({ app, world, save, saves, bot: true, demo: true }) : new Career({ app, world, save, saves, bot: opts.bot || (links.query.get('bot') === 'pad' ? 'pad' : links.query.get('bot') === '1'), lab: district !== 'lowtown' });
        radio ||= new Radio({ stations: all('stations'), ads: Object.fromEntries(all('radioAds').map(a => [a.id, a])), seed: app.seed });
        if (sound) sound.dispose(); sound = new AudioDirector(game, { radio });
        if (sfx) sfx.dispose(); sfx = new SfxMap(game, () => { const q = hero(), v = q.seat && q.seat.vehicle; return v ? [v.x, v.y] : [q.x, q.y]; }, { isPlayer: id => !!crew.ped && crew.ped.id === id, where: id => { const v = fleet.vehicles.find(q => q.id === id); return v ? [v.x, v.y] : null; } }).attach();
        if (rumble) rumble.dispose(); rumble = new Rumble(game, { player: () => crew && crew.ped, off: () => !!demo }).attach();   // (the controller's: never in the demo)
        career.start({ loaded: !!loaded, newGame: !!(data && data.newGame), mission: route[0] === 'mission' ? route[1] : null, stage: route[0] === 'mission' ? route[2] : undefined, level: +links.query.get('level') || undefined });
        expose('career', career); expose('pilot', f => { pilot = f || null; }); expose('sound', sound); expose('radio', radio);
        expose('snapshot', () => { const p = hero(), v = p.seat && p.seat.vehicle; return { scene: 'play', view: views.active, hero: [p.x, p.y, p.z].map(v => Math.round(v)), hood: hoodName, time: clock.label(), weather: weather.state,
          crew: crew.active, health: Math.round(p.health), armor: Math.round(p.armor), weapon: p.inv.current, switching: crew.switching, fund: crew.fund,
          vehicle: v ? v.def.id : null, speed: v ? Math.round(v.speed) : 0, boarding: p.boarding ? p.boarding.plan.kind : null, vehicles: fleet.vehicles.length, awake: fleet.awake, traffic: life && life.traffic ? life.traffic.count : 0, peds: life && life.crowd ? life.crowd.count : 0,
          stars: stars(), down: down ? down.kind : null, interior: inside ? inside.id : null, alarm: inside ? !!inside.run.alarm : false, door: door ? door.id || door.label : null, career: career ? career.debug() : null }; });
        expose('teleport', (x, y) => { hero().place(x, y); game.cam.snap = true; });
        expose('photo', photo);   // (photo mode: tests, the e2e's PNG)
        expose('overlays', overlays);   // (the dev overlays: the e2e draws them in every view)
        expose('interior', () => inside); expose('views', views); expose('stage', stage); expose('life', life); expose('auto', auto); expose('city', city); expose('clock', clock); expose('weather', weather); expose('bridges', bridges); expose('crew', crew); expose('combat', combat); expose('fleet', fleet); expose('fleetCount', fleetCount);
        expose('perf', () => ({ ...rec, floor: { ...floor.stats, kept: floor.chunks.size }, walls: map.wallCache(), solids: map.solids.length, depth: stage.depth ? { ...stage.depth.stats } : null }));
        // (indoors the city's part stands as it was at the door: the possessed one counted where it went in; the interior's
        // own part, its guards, its fights and where the possessed one is in it, follows)
        game.stateHash = () => [...crew.order.flatMap(id => { const p = crew.member(id).ped, at = inside && inside.run.player === p ? inside.back : p; return [Math.round(at.x * 8), Math.round(at.y * 8), Math.round(at.z * 8), Math.round(p.health * 10)]; }),
          crew.order.indexOf(crew.active), Math.round(clock.hour * 60), weather.index, Math.round(weather.wet * 100), ...bridges.map(b => Math.round(b.lift * 100)), combat.hash(), fleet.hash(), ...(life ? life.hash() : []), ...(inside ? inside.run.hash() : []), crew.fund, ...(career ? career.hash() : [])];
      },
      exit() { photo.exit(); if (sound) { sound.dispose(); sound = null; } if (sfx) { sfx.dispose(); sfx = null; } if (rumble) { rumble.dispose(); rumble = null; } if (career) { career.dispose(); career = null; } game.lights.enabled = false; game.timeScale = 1; stage.top.hold = null; game.setZoom(1); if (inside) { inside.run.dispose(); inside = null; BUS.unmute('world'); } if (life) { life.dispose(); life = null; } if (auto) { auto.dispose(); auto = null; } for (const u of unsub) u(); unsub = []; },
      update(dt) {
        const real = dt / Math.max(.05, game.timeScale);
        if (photo.active) {   // photo mode: the world held still, the camera free (nothing below runs: no clock, no traffic, no job)
          photo.update(real); game.timeScale = 1;
          stage.update(real, { vehicle: false, vel: null }); if (stage.rig) game.focus(stage.rig.x, stage.rig.y, 16);
          return;
        }
        if (!demo && !app.ui.took && (B.tap('photo', 'onFoot') || B.tap('photo', 'vehicle')) && enterPhoto()) return;   // (Create / B)
        if (devOn) { const k = B.codeValue('Backquote') > 0; if (k && !devKey0 && openDev()) { devKey0 = k; return; } devKey0 = k; }   // (`: the dev menu)
        if (!demo && !app.ui.took && !career.busy && (B.tap('pause', 'onFoot') || game.input.pressed('pause') || B.tap('map', 'onFoot'))) { const map = B.tap('map', 'onFoot'); if (openPause(null, map ? 'map' : null)) return; }   // (Options, Esc, P: the pause; the touchpad, M, Tab: its map)
        if (transit) { transit.t += dt; if (!transit.done && transit.t >= DOOR_FADE) { transit.done = true; transit.go(); } if (transit.t >= DOOR_FADE * 2) transit = null; }
        if (!inside) {   // (indoors the city stands still: its clock, its weather, its bridges)
          const h0 = clock.hour; clock.update(dt); const hours = ((clock.hour - h0) + 24) % 24;
          weather.update(dt, hours);
          for (const b of bridges) b.update(dt, hours, br => crew.order.some(id => br.contains(crew.member(id).ped.x, crew.member(id).ped.y)));   // (it waits while a protagonist is on it)
        }
        // the switch camera: TOP, held where the crew says, until control passes
        const wasSwitching = crew.switching, cam = crew.update(dt);
        if (cam) { stage.top.hold = { x: cam.x, y: cam.y, H: cam.H }; game.focus(cam.x, cam.y, 1); }
        else if (wasSwitching) { stage.top.hold = null; if (prevView && prevView !== 'top') game.setView(prevView); prevView = null; }
        const p = hero(), busy = crew.switching || weaponWheel.open || switchWheel.open || (transit && !transit.done);
        // the wheels: held open, picked on release
        const toggles = human.toggles = toggled(game);   // (Settings, ACCESS: what a press toggles instead of a hold)
        weaponWheel.update(real, p, { game, blocked: crew.switching || switchWheel.open || !!p.seat || !!p.boarding, toggle: toggles.has('wheel') });   // (in a vehicle L1 is the nitro)
        if (!crew.switching && !p.dead && !inside) {   // the character wheel: hold d-pad down (Z), point, let go on another (not indoors); or press, point, press
          if (toggles.has('switch')) { if (B.tap('switch', 'onFoot')) switchLatch = !switchLatch; } else switchLatch = false;
          if ((toggles.has('switch') ? switchLatch : B.down('switch', 'onFoot')) && !weaponWheel.open) { holdS += real; if (!switchWheel.open && (toggles.has('switch') || holdS >= TUNE.wheelHold)) { const w = switchItems(); switchWheel.show(w.items, w.sel); mouse0 = null; } }
          else { switchLatch = false; if (switchWheel.open) { const it = switchWheel.hide(); if (it && it.id !== crew.active) trySwitch(it.id); } holdS = 0; }
          if (switchWheel.open) { const ptr = wheelPointer(game, B, mouse0); if (ptr.mouse && !mouse0) mouse0 = ptr.mouse; switchWheel.update(real, { dir: ptr.dir }); }
        }
        game.timeScale = Math.min(weaponWheel.open || switchWheel.open ? TUNE.wheelSlow : 1, p.ability ? p.ability.timeScale : 1, slow);
        // the player's intent (nothing while a wheel is open, the switch camera flies or the vignette plays): the vehicle
        // controls while seated, on foot otherwise
        const seated = p.seat && p.seat.vehicle;
        let I = pilot ? pilot(dt, p) : auto && !inside ? auto.update(dt, p, { t: life ? life.t : 0, pedsNear: life ? (x, y, r) => life.pedsNear(x, y, r) : null, wet: weather.wet }) : human.update(seated ? 'vehicle' : 'onFoot', p);
        I = career.update(dt, { p, I, inside, busy, down });   // (the career: the bot's Intent while it plays a mission; none while a card is up)
        if (busy || down) I = clearIntent(I);   // (WRECKED, NABBED: the card plays out)
        if (I.tap.phone && !inside && !career.busy && !demo) { career.phone(); I = clearIntent(I); }   // (d-pad up / T: the phone)
        // a door: a city door's spot, or inside one of the interior's own (its marked cells)
        door = !busy && !down && !p.dead && !p.seat && !p.boarding ? (inside ? inside.run.doorAt(p) : cityDoor(p)) : null;
        if (!busy && !p.dead && I.tap.interact && !p.boarding) {   // △ / E: through a door; get in (the nearest door of a vehicle), or get out
          if (door) { const d = door; through(inside ? () => goOutside(d) : () => goInside(d)); I = clearIntent(I); }
          else if (career.prompt && !seated) { career.prompt.act(); I = clearIntent(I); }   // (a shop's door, a property, the safehouse)
          else if (seated) p.leave(exitFor(p, seated, (x, y) => city.walkable(Math.floor(x / city.T), Math.floor(y / city.T)) && !fleet.near(x, y, 2).some(o => o !== seated && boxDistance(o, x, y) < 4)));
          else if (!inside) { const plan = boardTarget(p); if (plan) p.board(plan); }
        }
        // a takedown: from behind and close, a guard who isn't hunting you (the attack button, instead of a swing)
        const td = inside ? inside.run : career.R.active ? career.R.actors : null;   // (indoors the bank's guards; outdoors a mission's)
        takedown = td && !busy && !down && !p.dead && !p.mover.action ? td.takedownFor(p) : null;
        if (takedown && I.tap.attack) { td.takedown(p, takedown); I.tap.attack = I.down.attack = false; takedown = null; }
        if (crew.vignette && crew.vignette.who === crew.active) {
          const moved = Math.hypot(I.move[0], I.move[1]) > .3 || I.down.aim || Object.values(I.tap).some(Boolean);   // (any press ends it)
          if (moved) { crew.endVignette(); p.posing = null; } else { p.posing = crew.vignette.pose; I = clearIntent(I); }
        } else p.posing = null;
        if (tour && !inside) {   // the camera tour: the possessed body rides straight legs between the tour's corners at car speed (from the
          // tour's own point: a car or a body in its way pushes it aside a moment, never holds the tour up)
          const A = tour.at, to = city.tour[(tour.leg + 1) % city.tour.length], dx = to[0] - A[0], dy = to[1] - A[1], d = Math.hypot(dx, dy), step = TOUR_SPEED * dt;
          if (d <= step) { A[0] = to[0]; A[1] = to[1]; tour.leg = (tour.leg + 1) % city.tour.length; } else { A[0] += dx / d * step; A[1] += dy / d * step; }
          p.place(A[0], A[1]);
          p.mover.vx = dx / (d || 1) * TOUR_SPEED; p.mover.vy = dy / (d || 1) * TOUR_SPEED; p.mover.facing = Math.atan2(dy, dx); I = clearIntent(I);
        }
        const night = clock.hour >= 19 || clock.hour < 6.5;
        if (inside) {   // indoors: the possessed one in the interior's world, then its guards, its cameras and its fights
          const R = inside.run;
          p.lazyRig = false; p.hurtScale = hurtScale(); p.update(dt, I, { map: R.map, city: R.city, combat: R.combat, fleet: null, aim: { candidates: R.combat.bodies.filter(b => b.aimable && !b.dead), toScreen: (x, y, z) => views.screenVec(x, y, z), los: (a, c) => losClear(R.map, a, c), level: assist() } });
          R.update(dt, { player: p, wanted: stars() });
        } else {
          { const pv = p.seat && p.seat.vehicle; footprint.update(pv ? pv.x : p.x, pv ? pv.y : p.y); }   // (the focus where it is now: a teleport, a switch or the hospital may have moved it)
          if (life) life.update(dt, { night, wet: weather.wet, player: p.seat && p.seat.vehicle && p.seat.vehicle.driver === p ? p.seat.vehicle : null, ped: p, others: crew.order.map(id => crew.member(id).ped) });
          fleet.update(dt, { intent: v => (v.driver === p ? I : (life && life.intentFor(v)) || career.intentFor(v) || clearIntent(idle)), peds: combat.bodies, night, wet: weather.wet });
          const W = { map, city, combat, fleet, aim: aimCtx() }, W0 = { map, city, combat, fleet, aim: NOAIM };
          const hs = hurtScale();
          for (const id of crew.order) { const q = crew.member(id).ped; q.lazyRig = q !== p; q.hurtScale = hs; q.update(dt, q === p ? I : clearIntent(idle), q === p ? W : W0); }   // (the others stand about: posed when drawn, aiming at nothing)
          combat.update(dt, { wet: weather.wet, takers: [p], take });
        }
        // what the possessed one drives: its name on getting in, the station when it changes; the driving zoom
        const v = p.seat && p.seat.vehicle;
        if (v && lastRadio === null) { toast = { text: v.def.name.toUpperCase(), t: 2.2 }; lastRadio = v.radio; }
        else if (v && v.radio !== lastRadio) { lastRadio = v.radio; toast = { text: stationLabel(v.radio), t: 2 }; }
        if (!v) lastRadio = null;
        if (!tour) stage.zoomTo(down && down.kind === 'nabbed' ? 1.6 : zoom.update(dt, !!v, v ? v.speed : 0));   // (the bust camera: in close)
        board = !v && !p.boarding && !p.dead && !busy && !inside && !door && !career.prompt && !career.busy ? boardTarget(p) : null;
        { const drv = v && v.driver === p ? v : null, sp = drv ? 0 : Math.hypot(p.mover.vx, p.mover.vy), spec = p.inv.spec(); playT += real; wheelT = drv ? wheelT + real : 0;   // (the first-time hints: what the player can do now)
          tips.update(real, { off: !!career.bot || !!pilot || !!auto || !!tour || crew.switching, board, v: drv, vt: wheelT, moving: sp > 20, gun: !!(spec && spec.mag), weapons: p.inv.slots ? Object.values(p.inv.slots).filter(Boolean).length + 1 : 1, free: !career.R.active && !career.busy, wanted: stars() > 0, inside: !!inside, t: playT }); }
        // WRECKED (dead) or NABBED (the police's `busted`): the card, then the respawn
        if (p.dead && (!down || down.kind !== 'wrecked')) { down = { kind: 'wrecked', t: 0 }; BUS.emit('wrecked', { cause: lastCause || 'unknown' }); lastCause = null; }
        if (down) { down.t += dt; if (down.t > TUNE.cardTime) { const k = down.kind; down = null; if (inside) goOutside(null); respawn(k); } }
        if (v && !down) respray(p, v);
        if (!busy && !down && !demo) views.context(v ? 'vehicle' : 'foot', v ? v.speed / ((v.body && v.body.h.top) || 260) : 0);   // (the view kept on foot and in a vehicle; Auto. The attract's are its director's)
        stage.update(dt, { vehicle: !!v, vel: v && v.body ? [v.body.vx, v.body.vy] : null });   // (MODE 7's Auto-rail)
        if (I.tap.view && !busy) views.next();
        if ((I.tap.turnLeft || I.tap.turnRight) && !busy) stage.turn(I.tap.turnRight ? 1 : -1);
        if (toast) { toast.t -= real; if (toast.t <= 0) toast = null; }
        const q = hero(), qv = q.seat && q.seat.vehicle, fx1 = qv ? qv.x : q.x, fy1 = qv ? qv.y : q.y;
        if (inside) hoodName = inside.name; else { footprint.update(fx1, fy1); const hd = city.hoodAtPoint(fx1, fy1); hoodName = hd ? hd.name : ''; }
        // the camera leads a moving vehicle by a third of a second (eased: presentation only, nothing reads it back)
        const k = Math.min(1, real * 2.5), want = qv ? [qv.body.vx * TUNE.camLead, qv.body.vy * TUNE.camLead] : [0, 0];
        lead[0] += (want[0] - lead[0]) * k; lead[1] += (want[1] - lead[1]) * k;
        if (stage.rig) game.focus(stage.rig.x, stage.rig.y, 16);   // (the camera rig holds every view: photo mode, a cut-scene)
        else if (!cam) game.focus(fx1 + (stage.depth ? 0 : lead[0]), fy1 + (stage.depth ? 0 : lead[1]), 16);   // (TOP leads by itself; MODE 7 rides its rail)
      },
      draw(r) {
        if (rec) { const st = game.stats; rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        const p = hero(), hold = stage.top.hold, pv = p.seat && p.seat.vehicle, pr = photo.active ? photo.rig : null, fx0 = pr ? pr.x : hold ? hold.x : pv ? pv.x : p.x, fy0 = pr ? pr.y : hold ? hold.y : pv ? pv.y : p.y;
        stage.setSky(inside ? indoorSky(clock.hour) : skyAt(clock.hour, weather));
        stage.begin(r, { focus: [fx0, fy0], vel: hold ? [0, 0] : pv ? [pv.body.vx, pv.body.vy] : [p.mover.vx, p.mover.vy], speed01: pv ? Math.min(1, pv.speed / 300) : 0, vehicle: !!pv, player: [p.x, p.y, p.z] });
        const vg = crew.vignette;
        if (inside) { drawInside(p, fx0, fy0); stage.end(); } else {
        cityR.queue(stage, fx0, fy0, hold ? Math.min(1400, 520 * hold.H / 320) : stage.depth === stage.side7 ? 700 : 520, stage.world.lamps, [p.x, p.y, p.z]);
        for (const q of city.pois) if (q.kind === 'door' && q.interior && Math.abs(q.x - fx0) < 400 && Math.abs(q.y - fy0) < 400) doorRing(q.x, q.y, '#ffe066');
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
        career.draw(stage, fx0, fy0, reach);   // (the mission's peds and props, its markers; the givers' and the starts' rings)
        if (vg && VIGNETTE_PROPS[vg.prop]) { const q = crew.member(vg.who).ped, x = q.x + 14, y = q.y + 4; stage.shape(x, y, 0, (g, P) => drawBoxModel(g, P, VIGNETTE_PROPS[vg.prop], x, y, 0, vg.prop === 'moto' ? Math.PI / 2 : 0, { lit: true })); }
        fx.draw(stage, combat, [fx0, fy0]);
        if (!crew.switching) drawAimMarks(stage, p, game.real);
        stage.end();
        if (overlays.any) { const rd = roadsOf(city); overlays.draw(stage, r, { graph: rd.graph, junctions: life ? life.junctions : null, walks: rd.walks, fleet, bodies: combat.bodies, focus: [fx0, fy0], reach: 500, stats: { ...game.stats } }); }
        }
        feedSound(p, pv, fx0, fy0);
      },
      // the HUD on the UI layer (PLAN.md 8.18), inside the safe area: where and when at the top left, the weapon, the
      // stars and a job's timer at the top right, the radar (with the GPS line in a vehicle) and the bars at the bottom
      // left, the vehicle at the bottom right, the prompts, the objective and the subtitles at the foot, the wheels,
      // the toasts and pops; then WRECKED or NABBED, then a door's fade over all of it
      hud(P) {
        if (photo.active) { photo.legend(P); return; }   // (photo mode: the HUD off, the legend only, never in the picture)
        const p = hero(), pv = p.seat && p.seat.vehicle, hold = stage.top.hold, fx0 = hold ? hold.x : pv ? pv.x : p.x, fy0 = hold ? hold.y : pv ? pv.y : p.y;
        const L = hudLayout(P), ch = chOf(crew.active), t = game.real, cx = P.W / 2, vg = crew.vignette;
        if (!demo) P.text((hoodName || 'LOWTOWN').toUpperCase() + '  •  ' + clock.label() + '  •  ' + (views.spec.label || views.active).toUpperCase(), L.sx0, L.sy0, '#ffe066');   // (the attract mode's bug stands there)
        if (!crew.switching && !down) tips.draw(P, L.sx0, L.sy0 + 12);
        if (!crew.switching) {
          drawPedHud(P, p, { color: ch.color, name: ch.short + '   $' + crew.fund });
          radar ||= new Radar(city, { turf: turfOf() }); radar.r = L.R;
          if (!inside) radar.draw(P, L.radar[0], L.radar[1], { focus: [fx0, fy0], heading: pv && !pv.def.tool ? pv.heading : null, player: p, police: life && life.police, blips: career.blips(), route: gpsRoute(pv), t });   // (indoors: no street map)
          drawWanted(P.g, L.stars[0], L.stars[1], wanted(), t);
          if (pv) drawVehicleHud(P, pv, { radio: stationLabel(pv.radio), speedo: setting(game, 'speedometer', false) });
        }
        if (inside && inside.run.alarm && Math.floor(t * 2.5) % 2 === 0) P.text('ALARM', cx, L.sy0 + 4, '#ff3a30', { align: 'center', scale: 2 });
        const prompt = crew.switching || down ? null : door ? [`{onFoot:interact} ${inside ? 'LEAVE' : 'ENTER'}  ${(inside ? (door.id === 'sewer' ? 'BY THE SEWER' : 'TO THE STREET') : door.label || 'DOOR').toUpperCase()}`, inside ? '#7aff8a' : '#ffe066']
          : takedown ? ['{onFoot:attack} TAKEDOWN', '#ff8a5a'] : board ? [`{onFoot:interact} ${board.locked ? PROMPT.breakIn : PROMPT[board.kind]}  ${board.vehicle.def.name.toUpperCase()}`, '#ffe066'] : null;
        if (prompt && !demo) P.prompt(prompt[0], cx, L.sy1 - 10, { align: 'center', color: prompt[1] });   // (the attract mode's PRESS ANY BUTTON stands there)
        career.hud(P, { blocked: !!prompt || crew.switching });
        weaponWheel.draw(P); switchWheel.draw(P);
        if (vg && vg.line && vg.who === crew.active) subtitle(P, chOf(vg.who).short, chOf(vg.who).color, vg.line, L.sy1 - 46);
        else if (pv && pv.driver === p && pv.radio && pv.radio !== 'off' && radio && setting(game, 'djChatter', true) && !(career.R.lines || career.events.R.lines)) {   // (the radio's words: its DJ, its ads, its callers)
          const ln = radio.line(pv.radio, save.playtime), st = ln && get('stations', pv.radio); if (ln) subtitle(P, ln.name, st ? st.color : '#ffe066', ln.text, L.sy1 - 46);
        }
        if (crew.switching) P.text(chOf(crew.seq.to).name.toUpperCase(), cx, L.sy1 - 30, chOf(crew.seq.to).color, { align: 'center', scale: 2 });
        if (toast) P.text(toast.text, cx, L.sy0 + 38, '#ffe066', { align: 'center' });
        if (down && down.t > .6) {   // WRECKED and NABBED: the tint, the bands, the word, what it costs
          const D = DOWN[down.kind]; P.fill(0, 0, P.W, P.H, D.tint[0], D.tint[1]); P.fill(0, 0, P.W, L.sy0 + 8, '#05030c'); P.fill(0, L.sy1 - 8, P.W, P.H - L.sy1 + 8, '#05030c');
          P.fill(0, P.H / 2 - 24, P.W, 50, '#05030c', .66);   // (a band behind the word and the bill: the street's own signs read through nothing)
          P.text(D.text, cx, P.H / 2 - 16, D.color, { align: 'center', scale: 3 });
          P.text(down.kind === 'nabbed' ? `BAIL $${TUNE.bailFee}  •  THE GUNS ARE GONE` : `THE HOSPITAL BILL  $${TUNE.hospitalFee}`, cx, P.H / 2 + 12, '#f0ecff', { align: 'center' });
        }
        if (transit) { const k = transit.t / DOOR_FADE, a = k < 1 ? k : 2 - k; P.fill(0, 0, P.W, P.H, '#05030c', E.clamp(a, 0, 1)); }   // (a door's fade)
      },
    };
  },
};
def('scenes', 'play', PLAY);
def('scenes', 'interior', { make: app => PLAY.make(app) });   // (#interior/bank: the same free roam, started inside)
def('scenes', 'mission', { make: app => PLAY.make(app) });   // (#mission/<id>/<stage>: the same, a mission started at a stage)
