// The Proving Ground (PLAN.md 8.23): developer zones reached by deep link, #proving/<zone>. M1 brings two:
// - scale (spike S2): the 160x160 dummy city in ISO, drawn with MOTOR's floor chunks and the patched TileMap;
// - views (spike S1): a 64x64 city (4 x 4 chunks) with 40 walkers, for the three views side by side (?view=side7).
// The camera's focus drives a lap at car speed; ?mode=walk hands it to the player. A perf readout shows on screen,
// and ?perf=1 records every frame's update and draw times for tools/perf.mjs; ?zoom=.65 sets a driving zoom. The other
// zones (combat range, vehicle pad...) arrive with the systems they test.
import { E, def, get, expose, FloorChunks, Actor, RNG } from '../../motor/index.js';

const SPEED = 300;   // the lap's speed: a sports car's top speed (PLAN.md 7.6)
const ZONES = { scale: { size: 160, walkers: 0 }, views: { size: 64, walkers: 40 } };
const OUTFITS = ['#d23a3a', '#3a7ad2', '#3ab06a', '#d2a03a', '#8a4ad2', '#e0e0e0', '#3a3a44', '#c86a3a'];

/** a walker going round its block's sidewalk ring: position from the distance walked (no physics: a render load) */
function walkerAt(loop, d) {
  const [x0, y0, x1, y1] = loop, w = x1 - x0, h = y1 - y0, per = 2 * (w + h); d = ((d % per) + per) % per;
  if (d < w) return [x0 + d, y0, 1, 0]; d -= w;
  if (d < h) return [x1, y0 + d, 0, 1]; d -= h;
  if (d < w) return [x1 - d, y1, -1, 0]; d -= w;
  return [x0, y1 - d, 0, -1];
}

def('scenes', 'proving', {
  make(app) {
    const { game, views, human, links, stage } = app;
    let map, floor, hero, rig, leg, walk, rec, lamps, hud, zone, walkers;
    const perfOn = links.query.get('perf') === '1';
    return {
      pausable: true,
      enter(data) {
        const zid = ZONES[data && data.route && data.route[1]] ? data.route[1] : 'scale'; zone = ZONES[zid]; zone.id = zid;
        map = get('maps', 'scale-city').build(app.seed, zone.size);
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: map.paintFloor });
        stage.setWorld({ map, floor, backdrop: new E.Backdrop('city-night') });
        walk = links.query.get('mode') === 'walk'; leg = 0;
        const [x, y] = map.route[0];
        hero = new E.Mover({ x, y }); hero.actor = new Actor('ped', { x, y, faction: 'crew' });
        rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null,
          colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } });
        // walkers: each goes round a block's sidewalk ring at its own pace (seeded, so every run is the same crowd)
        const rng = RNG.stream('proving').sub(zid); walkers = [];
        for (let i = 0; i < zone.walkers; i++) {
          const loop = rng.pick(map.loops), speed = rng.range(36, 58) * (rng.chance(.5) ? 1 : -1), c = rng.pick(OUTFITS);
          walkers.push({ loop, speed, d: rng.range(0, 4000), x: 0, y: 0, rig: new E.Humanoid({ size: .9, build: rng.pick(['slim', 'average', 'heroic']), outfit: rng.pick(['shirt', 'coat', 'dress']), hair: rng.pick(['short', 'spiky', 'long', 'bald']), weapon: null,
            colors: { skin: rng.pick(['#c8906a', '#8a5a3a', '#e0b090', '#5a3a2a']), hair: rng.pick(['#1e1a22', '#6a4a2a', '#c8a050']), cloth: c, coat: E.shade(c, -.3), pants: rng.pick(['#2a3048', '#3a3a3a', '#5a4a3a']), boot: '#18161c' } }) });
        }
        // lamps by chunk, so a frame looks only at the lamps near the focus
        lamps = new Map(); for (const l of map.lamps) { const k = Math.floor(l[1] / 256) * 64 + Math.floor(l[0] / 256); if (!lamps.has(k)) lamps.set(k, []); lamps.get(k).push(l); }
        rec = perfOn ? { update: [], render: [], frames: 0 } : null;
        if (links.query.get('rail')) stage.side7.setHeading(+links.query.get('rail'), x, y);   // ?rail=90: MODE 7 facing east
        hud = { draw: 0, update: 0 };
        game.cam.bounds = v => map.bounds(v);
        if (links.query.get('zoom')) game.setZoom(+links.query.get('zoom'));   // the driving zooms: .8, .65
        if (!game.headless) floor.warm(x, y, 400);
        expose('snapshot', () => ({ scene: 'proving', zone: zid, view: views.active, hero: [hero.x, hero.y].map(Math.round), leg }));
        expose('perf', () => ({ ...rec, floor: { ...floor.stats, kept: floor.chunks.size }, walls: map.wallCache(), solids: map.solids.length, depth: stage.depth ? { ...stage.depth.stats } : null }));
        expose('yard', { map, floor });
        game.stateHash = () => [Math.round(hero.x * 8), Math.round(hero.y * 8), leg];
      },
      update(dt) {
        if (walk) {
          const I = human.update('onFoot', hero);
          hero.update(dt, map, { move: I.move, sprint: I.down.sprint, jumpPressed: I.tap.jump });
          if (I.tap.view) views.next();
          // [ and ] turn the camera a quarter (M2 binds R3 held with a flick): the rail in MODE 7, the yaw in ISO
          const turn = (game.input.raw.pressed.has('BracketRight') ? 1 : 0) - (game.input.raw.pressed.has('BracketLeft') ? 1 : 0);
          if (turn) { if (stage.depth === stage.side7) stage.side7.setHeading(stage.side7.heading + 90 * turn, hero.x, hero.y); else if (!stage.depth) game.rotateView(90 * turn); }
        } else {
          // the lap: straight legs between the route's corners at car speed (the floor and walls stream as it goes)
          const to = map.route[(leg + 1) % map.route.length], dx = to[0] - hero.x, dy = to[1] - hero.y, d = Math.hypot(dx, dy), step = SPEED * dt;
          if (d <= step) { hero.x = to[0]; hero.y = to[1]; leg = (leg + 1) % map.route.length; } else { hero.x += dx / d * step; hero.y += dy / d * step; }
          hero.vx = dx / (d || 1) * SPEED; hero.vy = dy / (d || 1) * SPEED; hero.facing = Math.atan2(dy, dx);
        }
        rig.update(dt, hero.rigState());
        for (const w of walkers) {
          w.d += w.speed * dt; const [x, y, ux, uy] = walkerAt(w.loop, w.d), s = Math.sign(w.speed);
          w.x = x; w.y = y; w.rig.update(dt, { x, y, z: 0, vx: ux * w.speed, vy: uy * w.speed, vz: 0, facing: Math.atan2(uy * s, ux * s), air: false });
        }
        game.focus(hero.x, hero.y, 16);
      },
      draw(r) {
        const st = game.stats; hud.draw += (st.renderMs - hud.draw) * .1; hud.update += (st.updateMs - hud.update) * .1;
        if (rec) { rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        stage.begin(r, { focus: [hero.x, hero.y], vel: [hero.vx || 0, hero.vy || 0], speed01: walk ? 0 : 1 });
        // lamp posts near the focus: a pole and a lit head
        const ci = Math.floor(hero.x / 256), cj = Math.floor(hero.y / 256);
        for (let j = cj - 3; j <= cj + 3; j++) for (let i = ci - 3; i <= ci + 3; i++) for (const [lx, ly] of lamps.get(j * 64 + i) || []) {
          if (Math.abs(lx - hero.x) > 700 || Math.abs(ly - hero.y) > 700) continue;
          stage.shape(lx, ly, 0, (g, P) => { const a = P.proj(lx, ly, 0), b = P.proj(lx, ly, 44); if (!a || !b) return; const w = Math.max(1, Math.round(1.6 * a[2])); g.fillStyle = '#3a3a44'; g.fillRect(Math.round(a[0] - w / 2), Math.round(b[1]), w, Math.max(1, Math.round(a[1] - b[1]))); g.fillStyle = '#ffe9a0'; g.fillRect(Math.round(b[0] - w * 1.5), Math.round(b[1] - w / 2), w * 3, Math.max(1, w)); g._c = null; });
        }
        for (const w of walkers) stage.actor(w.x, w.y, 0, (g, x, y, v) => w.rig.draw(g, x, y, v), { shadow: 4, crowd: true });
        stage.actor(hero.x, hero.y, hero.z, (g, x, y, v) => rig.draw(g, x, y, v), { shadow: 5, xray: true });
        stage.end();
        r.overlay(g => {
          const w = map.wallCache(), d = stage.depth, lines = [
            `${zone.id.toUpperCase()}  ${map.w}x${map.h}  ${views.active.toUpperCase()}  ${walk ? 'WALK' : 'LAP ' + SPEED + ' U/S'}`,
            `DRAW ${hud.draw.toFixed(1)} MS  UPDATE ${hud.update.toFixed(2)} MS  ITEMS ${d ? d.stats.items : st.items}`,
            d ? `QUADS ${d.stats.quads}  ROWS ${d.stats.rows || 0}  SPANS ${d.stats.spans}  ACTORS ${d.stats.actors}` : `FLOOR ${floor.chunks.size} CHUNKS (${floor.stats.drawn} DRAWN, ${floor.stats.waiting} WAITING)`,
            `WALLS ${w.blocks} BLOCKS ${(w.px / 1e6).toFixed(1)}M PX  SOLIDS ${map.solids.length}`,
          ];
          E.ui.box(g, 4, 4, 212, lines.length * 9 + 6, { alpha: .75 });
          lines.forEach((s, i) => E.font.text(g, s, 8, 8 + i * 9, i ? '#d8e4f0' : '#ffe066'));
        });
      },
    };
  },
});
