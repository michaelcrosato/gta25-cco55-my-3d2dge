// Free roam in Lowtown (PLAN.md 9.1; M2: the city, on foot, in all three views). The protagonist starts at the safehouse
// (#play/<poi> starts at any point of interest: #play/bank-door, #play/marina), walks through the HumanController's
// Intent, and the city draws through the Stage: the chunked floor from the street painter, the patched walls, the decks,
// props and signs. The world clock runs from night (?time=day | dusk | night | dawn | <hour>) and the weather changes
// with it (?weather=clear | overcast | rain | storm | fog holds one); the sky follows both in every view. Dock Road's
// drawbridge lifts every 3 game hours (?bridge=up starts it up). ?crowd=1 adds stand-ins for M4 and M5's traffic and
// peds (40 walkers and 20 cars, all in view round the focus) so the perf gate measures their drawing before they exist;
// they are presentation only and never touch the simulation. ?tour=1 drives the camera round the district's tour at car speed and ?perf=1 records each frame's times
// (tools/perf.mjs). The city's later systems (vehicles, traffic, peds, police, missions) join this scene milestone by
// milestone.
import { E, def, expose, Actor, FloorChunks, buildCity, CityRenderer, WorldClock, Weather, Drawbridge, skyAt, drawBoxModel, carModel } from '../../motor/index.js';

let cached = null;   // one Lowtown per seed: built once (about 80 ms), kept across scene changes
/** the perf stand-ins: walkers and parked cars at fixed offsets round the focus (a seeded spread, the same each run).
 *  The walkers are the engine's classic rigs, the crowd's look (D13): the protagonists keep the detailed one */
function standIns() {
  const r = E.rng(77), pick = l => l[Math.floor(r() * l.length)], peds = [], cars = [];
  for (let i = 0; i < 40; i++) {
    const c = pick(['#c84a3a', '#3a6ac8', '#e8c040', '#3a8a5a', '#8a3a8a', '#e0e0e4']);
    peds.push({ ox: (r() * 2 - 1) * 170, oy: (r() * 2 - 1) * 150, ph: r() * 6.3, sp: 30 + r() * 25, rig: new E.Humanoid({ size: .9, style: 'classic', build: pick(['slim', 'average', 'heroic']), outfit: pick(['shirt', 'coat', 'dress']), hair: pick(['short', 'spiky', 'long', 'bald']), weapon: null,
      colors: { skin: pick(['#c8906a', '#8a5a3a', '#e0b090', '#5a3a2a']), hair: pick(['#1e1a22', '#6a4a2a', '#c8a050']), cloth: c, coat: E.shade(c, -.3), pants: pick(['#2a3048', '#3a3a3a', '#5a4a3a']), boot: '#18161c' } }) });
  }
  for (let i = 0; i < 20; i++) cars.push({ ox: (r() * 2 - 1) * 190, oy: (r() * 2 - 1) * 160, h: pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), model: carModel({ color: pick(['#c8423a', '#3a6ac8', '#d8c8a0', '#3a8a5a', '#2a2a30', '#e0e0e4']) }) });
  return { peds, cars };
}
function lowtown(seed) { if (!cached || cached.seed !== seed) { const city = buildCity('lowtown', seed); cached = { seed, city, render: new CityRenderer(city) }; } return cached; }

def('scenes', 'play', {
  make(app) {
    const { game, views, human, footprint, links, stage } = app;
    let city, map, cityR, floor, hero, rig, clock, weather, bridges = [], hoodName = '', tour = null, rec = null, crowd = null;
    const TOUR_SPEED = 300;   // a sports car's top speed (PLAN.md 7.6)
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
        const at = tour ? { x: city.tour[0][0], y: city.tour[0][1] } : city.poi((data && data.route && data.route[1]) || 'safehouse') || city.poi('safehouse');
        hero = new E.Mover({ x: at.x, y: at.y }); hero.actor = new Actor('ped', { x: at.x, y: at.y, faction: 'crew' });
        rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null,
          colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } });
        game.cam.bounds = v => map.bounds(v);
        if (!game.headless) floor.warm(hero.x, hero.y, 420);
        expose('snapshot', () => ({ scene: 'play', view: views.active, hero: [hero.x, hero.y, hero.z].map(v => Math.round(v)), hood: hoodName, time: clock.label(), weather: weather.state }));
        expose('teleport', (x, y) => { hero.x = x; hero.y = y; });
        expose('city', city); expose('clock', clock); expose('weather', weather); expose('bridges', bridges);
        expose('perf', () => ({ ...rec, floor: { ...floor.stats, kept: floor.chunks.size }, walls: map.wallCache(), solids: map.solids.length, depth: stage.depth ? { ...stage.depth.stats } : null }));
        game.stateHash = () => [Math.round(hero.x * 8), Math.round(hero.y * 8), Math.round(hero.z * 8), Math.round(clock.hour * 60), weather.index, Math.round(weather.wet * 100), ...bridges.map(b => Math.round(b.lift * 100))];
      },
      exit() { game.lights.enabled = false; },
      update(dt) {
        const h0 = clock.hour; clock.update(dt); const hours = ((clock.hour - h0) + 24) % 24;
        weather.update(dt, hours);
        for (const b of bridges) b.update(dt, hours, br => br.contains(hero.x, hero.y));   // (it waits while the protagonist is on it)
        const I = human.update('onFoot', hero);
        if (tour) {   // straight legs between the tour's corners at car speed (the floor and walls stream as it goes)
          const to = city.tour[(tour.leg + 1) % city.tour.length], dx = to[0] - hero.x, dy = to[1] - hero.y, d = Math.hypot(dx, dy), step = TOUR_SPEED * dt;
          if (d <= step) { hero.x = to[0]; hero.y = to[1]; tour.leg = (tour.leg + 1) % city.tour.length; } else { hero.x += dx / d * step; hero.y += dy / d * step; }
          hero.vx = dx / (d || 1) * TOUR_SPEED; hero.vy = dy / (d || 1) * TOUR_SPEED; hero.facing = Math.atan2(dy, dx);
        } else hero.update(dt, map, { move: I.move, sprint: I.down.sprint, jumpPressed: I.tap.jump });
        hero.actor.x = hero.x; hero.actor.y = hero.y; hero.actor.z = hero.z;
        rig.update(dt, hero.rigState());
        if (I.tap.view) views.next();
        if (I.tap.turnLeft || I.tap.turnRight) stage.turn(I.tap.turnRight ? 1 : -1);
        footprint.update(hero.x, hero.y);
        const h = city.hoodAtPoint(hero.x, hero.y); hoodName = h ? h.name : '';
        game.focus(hero.x, hero.y, 16);
      },
      draw(r) {
        if (rec) { const st = game.stats; rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        stage.setSky(skyAt(clock.hour, weather));
        stage.begin(r, { focus: [hero.x, hero.y], vel: [hero.vx, hero.vy], player: [hero.x, hero.y, hero.z] });
        cityR.queue(stage, hero.x, hero.y, stage.depth === stage.side7 ? 700 : 520, stage.world.lamps, [hero.x, hero.y, hero.z]);
        if (crowd) {   // (presentation only: offsets round the focus, walking in place along their own line)
          const t = game.real;
          for (const p of crowd.peds) {
            const x = hero.x + p.ox + Math.sin(t * .4 + p.ph) * 40, y = hero.y + p.oy, vx = Math.cos(t * .4 + p.ph) * 16;
            stage.actor(x, y, 0, (g, sx, sy, v) => p.rig.draw(g, sx, sy, v), { shadow: 4, crowd: true, key: p.rig, pose: dt => p.rig.update(dt, { x, y, z: 0, vx, vy: 0, vz: 0, facing: vx >= 0 ? 0 : Math.PI, air: false }) });
          }
          for (const c of crowd.cars) { const x = hero.x + c.ox, y = hero.y + c.oy; stage.shape(x, y, 0, (g, P) => drawBoxModel(g, P, c.model, x, y, 0, c.h, { lit: true }), { kept: { key: c, r: 34, h: 24 } }); }
        }
        stage.actor(hero.x, hero.y, hero.z, (g, x, y, v) => rig.draw(g, x, y, v), { shadow: 5, xray: true });
        stage.end();
        r.overlay(g => E.font.text(g, (hoodName || 'LOWTOWN').toUpperCase() + '  •  ' + clock.label() + '  •  ' + (views.spec.label || views.active).toUpperCase(), 6, 6, '#ffe066', { shadow: '#000' }));
      },
    };
  },
});
