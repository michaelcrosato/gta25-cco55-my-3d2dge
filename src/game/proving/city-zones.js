// Proving Ground zones on a dummy city (PLAN.md 8.23): 'scale' (spike S2: 160x160, no walkers) and 'views', the view
// lab (spike S1's 64x64 with 40 walkers; M3 adds the scale yard: the three protagonists in hand with three weapons
// and a parked Cortez beside them, where the lap starts). The focus drives a lap at car speed; ?mode=walk hands it to
// the player ([ and ] turn the camera); ?zoom=.65 sets a driving zoom; ?rail=90 faces MODE 7's rail east. The view
// lab's ?selftest=1 draws the same spot in ISO, TOP-DOWN and MODE 7 and checks each drew its bodies.
import { E, def, get, FloorChunks, Actor, RNG, PedRig, drawBoxModel, carModel } from '../../motor/index.js';

const SPEED = 300;   // the lap's speed: a sports car's top speed (PLAN.md 7.6)
const OUTFITS = ['#d23a3a', '#3a7ad2', '#3ab06a', '#d2a03a', '#8a4ad2', '#e0e0e0', '#3a3a44', '#c86a3a'];

/** a walker going round its block's sidewalk ring: position from the distance walked (no physics: a render load) */
function walkerAt(loop, d) {
  const [x0, y0, x1, y1] = loop, w = x1 - x0, h = y1 - y0, per = 2 * (w + h); d = ((d % per) + per) % per;
  if (d < w) return [x0 + d, y0, 1, 0]; d -= w;
  if (d < h) return [x1, y0 + d, 0, 1]; d -= h;
  if (d < w) return [x1 - d, y1, -1, 0]; d -= w;
  return [x0, y1 - d, 0, -1];
}

function cityZone(id, size, nWalkers) {
  def('provingZones', id, {
    title: id === 'scale' ? 'Scale yard' : 'View lab',
    make(app) {
      const { game, views, human, links, stage } = app;
      let map, floor, hero, rig, leg, walk, lamps, walkers, yard = null;
      return {
        enter() {
          map = get('maps', 'scale-city').build(app.seed, size);
          floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: map.paintFloor });
          stage.setWorld({ map, floor, backdrop: new E.Backdrop('city-night') });
          walk = links.query.get('mode') === 'walk'; leg = 0;
          const [x, y] = map.route[0];
          hero = new E.Mover({ x, y }); hero.actor = new Actor('ped', { x, y, faction: 'crew' });
          rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null,
            colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } });
          // walkers: each goes round a block's sidewalk ring at its own pace (seeded, so every run is the same crowd)
          const rng = RNG.stream('proving').sub(id); walkers = [];
          for (let i = 0; i < nWalkers; i++) {
            const loop = rng.pick(map.loops), speed = rng.range(36, 58) * (rng.chance(.5) ? 1 : -1), c = rng.pick(OUTFITS);
            walkers.push({ loop, speed, d: rng.range(0, 4000), x: 0, y: 0, rig: new E.Humanoid({ size: .9, build: rng.pick(['slim', 'average', 'heroic']), outfit: rng.pick(['shirt', 'coat', 'dress']), hair: rng.pick(['short', 'spiky', 'long', 'bald']), weapon: null,
              colors: { skin: rng.pick(['#c8906a', '#8a5a3a', '#e0b090', '#5a3a2a']), hair: rng.pick(['#1e1a22', '#6a4a2a', '#c8a050']), cloth: c, coat: E.shade(c, -.3), pants: rng.pick(['#2a3048', '#3a3a3a', '#5a4a3a']), boot: '#18161c' } }) });
          }
          // the scale yard (the view lab): the crew holding a pistol, an SMG and the Boom Tube, a parked Cortez beside them
          yard = id === 'views' ? { at: [x + 30, y - 46], car: carModel({ color: '#3a6ac8' }), crew: ['dex', 'viv', 'gus'].map((c, i) => { const p = new PedRig(get('characters', c).outfits[0]); p.hold(['pistol', 'smg', 'launcher'][i]); return p; }) } : null;
          lamps = new Map(); for (const l of map.lamps) { const k = Math.floor(l[1] / 256) * 64 + Math.floor(l[0] / 256); if (!lamps.has(k)) lamps.set(k, []); lamps.get(k).push(l); }
          game.cam.bounds = v => map.bounds(v);
          if (links.query.get('zoom')) game.setZoom(+links.query.get('zoom'));   // the driving zooms: .8, .65
          if (links.query.get('rail')) stage.side7.setHeading(+links.query.get('rail'), x, y);
          if (!game.headless) floor.warm(x, y, 400);
          return { map, floor };
        },
        update(dt) {
          if (walk) {
            const I = human.update('onFoot', hero);
            hero.update(dt, map, { move: I.move, sprint: I.down.sprint, jumpPressed: I.tap.jump });
            if (I.tap.view) views.next();
            if (I.tap.turnLeft || I.tap.turnRight) stage.turn(I.tap.turnRight ? 1 : -1);   // ([ ] or R3 held with a flick: the yaw in ISO, the rail in MODE 7)
          } else {
            // the lap: straight legs between the route's corners at car speed (the floor and walls stream as it goes)
            const to = map.route[(leg + 1) % map.route.length], dx = to[0] - hero.x, dy = to[1] - hero.y, d = Math.hypot(dx, dy), step = SPEED * dt;
            if (d <= step) { hero.x = to[0]; hero.y = to[1]; leg = (leg + 1) % map.route.length; } else { hero.x += dx / d * step; hero.y += dy / d * step; }
            hero.vx = dx / (d || 1) * SPEED; hero.vy = dy / (d || 1) * SPEED; hero.facing = Math.atan2(dy, dx);
          }
          rig.update(dt, hero.rigState());
          if (yard) yard.crew.forEach((p, i) => p.update(dt, { x: yard.at[0] + i * 18, y: yard.at[1], z: 0, vx: 0, vy: 0, vz: 0, facing: Math.PI / 2, air: false, point: true, aim: 0 }));
          for (const w of walkers) {
            w.d += w.speed * dt; const [x, y, ux, uy] = walkerAt(w.loop, w.d), s = Math.sign(w.speed);
            w.x = x; w.y = y; w.rig.update(dt, { x, y, z: 0, vx: ux * w.speed, vy: uy * w.speed, vz: 0, facing: Math.atan2(uy * s, ux * s), air: false });
          }
          game.focus(hero.x, hero.y, 16);
        },
        draw(r) {
          stage.begin(r, { focus: [hero.x, hero.y], vel: [hero.vx || 0, hero.vy || 0], speed01: walk ? 0 : 1 });
          const ci = Math.floor(hero.x / 256), cj = Math.floor(hero.y / 256);
          for (let j = cj - 3; j <= cj + 3; j++) for (let i = ci - 3; i <= ci + 3; i++) for (const [lx, ly] of lamps.get(j * 64 + i) || []) {
            if (Math.abs(lx - hero.x) > 700 || Math.abs(ly - hero.y) > 700) continue;
            stage.shape(lx, ly, 0, (g, P) => drawLamp(g, P, lx, ly));
          }
          for (const w of walkers) stage.actor(w.x, w.y, 0, (g, x, y, v) => w.rig.draw(g, x, y, v), { shadow: 4, crowd: true });
          if (yard) {
            yard.crew.forEach((p, i) => { const px = yard.at[0] + i * 18, py = yard.at[1]; stage.actor(px, py, 0, (g, sx, sy, v) => p.draw(g, sx, sy, v), { shadow: 5 }); });
            const [cx, cy] = [yard.at[0] + 18, yard.at[1] + 34]; stage.shape(cx, cy, 0, (g, P) => drawBoxModel(g, P, yard.car, cx, cy, 0, 0, { lit: true }));
          }
          stage.actor(hero.x, hero.y, hero.z, (g, x, y, v) => rig.draw(g, x, y, v), { shadow: 5, xray: true });
          stage.end();
        },
        hud() { const w = map.wallCache(); return [`${walk ? 'WALK' : 'LAP ' + SPEED + ' U/S'}`, `FLOOR ${floor.chunks.size} CHUNKS (${floor.stats.drawn} DRAWN, ${floor.stats.waiting} WAITING)`, `WALLS ${w.blocks} BLOCKS ${(w.px / 1e6).toFixed(1)}M PX  SOLIDS ${map.solids.length}`]; },
        snapshot() { return { hero: [hero.x, hero.y].map(Math.round), leg }; },
        perf() { return { floor: { ...floor.stats, kept: floor.chunks.size }, walls: map.wallCache(), solids: map.solids.length }; },
        stateHash() { return [Math.round(hero.x * 8), Math.round(hero.y * 8), leg]; },
        handle() { return { map, floor }; },
        /** ?selftest=1 (the view lab): the same spot drawn in ISO, TOP-DOWN and MODE 7, 40 frames each; each view must
         *  draw its bodies (the crew, the walkers near) inside the frame budget's double */
        selftest: id !== 'views' ? undefined : st => {
          const order = ['iso', 'top', 'side7'], i = Math.floor(st.frame / 40);
          if (st.frame === 0) { st.rows = []; walk = true; }   // (hold the lap: the spot stays put)
          if (i < 3) {
            if (st.frame % 40 === 0) game.setView(order[i]);
            if (st.frame % 40 === 39) st.rows.push({ view: order[i], actors: game.stats.actors, renderMs: +game.stats.renderMs.toFixed(2) });
            return null;
          }
          game.setView('iso');
          const checks = st.rows.map(r => ({ check: r.view + ' draws its bodies', ok: r.actors >= 3, value: r.actors }));
          return { zone: 'views', ok: checks.every(c => c.ok), checks, rows: st.rows };
        },
      };
    },
  });
}
/** a lamp post through a projector: a pole and a lit head */
export function drawLamp(g, P, lx, ly) {
  const a = P.proj(lx, ly, 0), b = P.proj(lx, ly, 44); if (!a || !b) return;
  const w = Math.max(1, Math.round(1.6 * a[2]));
  g.fillStyle = '#3a3a44'; g.fillRect(Math.round(a[0] - w / 2), Math.round(b[1]), w, Math.max(1, Math.round(a[1] - b[1])));
  g.fillStyle = '#ffe9a0'; g.fillRect(Math.round(b[0] - w * 1.5), Math.round(b[1] - w / 2), w * 3, Math.max(1, w)); g._c = null;
}
cityZone('scale', 160, 0);
cityZone('views', 64, 40);
