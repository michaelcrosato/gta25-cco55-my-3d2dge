// The Proving Ground (PLAN.md 8.23): developer zones reached by deep link, #proving/<zone>. M1 brings the scale yard
// (spike S2): the 160x160 dummy city in ISO, drawn with MOTOR's floor chunks and the patched TileMap, a camera that
// drives a lap at car speed (?mode=walk hands it to the player instead), and a perf readout. ?perf=1 records every
// frame's update and draw times for tools/perf.mjs. The other zones (combat range, view lab, vehicle pad...) arrive
// with the systems they test.
import { E, def, get, expose, FloorChunks, Actor } from '../../motor/index.js';

const SPEED = 300;   // the lap's speed: a sports car's top speed (PLAN.md 7.6)

def('scenes', 'proving', {
  make(app) {
    const { game, views, human, links } = app;
    let map, floor, hero, rig, bg, leg, walk, rec, lamps, hud;
    const perfOn = links.query.get('perf') === '1';
    return {
      pausable: true, view: 'iso',
      enter() {
        map = get('maps', 'scale-city').build(app.seed);
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: map.paintFloor });
        walk = links.query.get('mode') === 'walk'; leg = 0;
        const [x, y] = map.route[0];
        hero = new E.Mover({ x, y }); hero.actor = new Actor('ped', { x, y, faction: 'crew' });
        rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null,
          colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } });
        bg = new E.Backdrop('city-night');
        // lamps by chunk, so a frame looks only at the lamps near the screen
        lamps = new Map(); for (const l of map.lamps) { const k = Math.floor(l[1] / 256) * 64 + Math.floor(l[0] / 256); if (!lamps.has(k)) lamps.set(k, []); lamps.get(k).push(l); }
        rec = perfOn ? { update: [], render: [], frames: 0 } : null;
        hud = { draw: 0, update: 0 };
        game.cam.bounds = v => map.bounds(v);
        if (links.query.get('zoom')) game.setZoom(+links.query.get('zoom'));   // the driving zooms: .8, .65
        if (!game.headless) floor.warm(x, y, 400);
        expose('snapshot', () => ({ scene: 'proving', zone: 'scale', view: views.active, hero: [hero.x, hero.y].map(Math.round), leg }));
        expose('perf', () => ({ ...rec, floor: { ...floor.stats, kept: floor.chunks.size }, walls: map.wallCache(), solids: map.solids.length }));
        expose('yard', { map, floor, bg });
        game.stateHash = () => [Math.round(hero.x * 8), Math.round(hero.y * 8), leg];
      },
      update(dt) {
        if (walk) {
          const I = human.update('onFoot', hero);
          hero.update(dt, map, { move: I.move, sprint: I.down.sprint, jumpPressed: I.tap.jump });
          if (I.tap.view) views.next();
        } else {
          // the lap: straight legs between the route's corners at car speed (the floor and walls stream as it goes)
          const to = map.route[(leg + 1) % map.route.length], dx = to[0] - hero.x, dy = to[1] - hero.y, d = Math.hypot(dx, dy), step = SPEED * dt;
          if (d <= step) { hero.x = to[0]; hero.y = to[1]; leg = (leg + 1) % map.route.length; } else { hero.x += dx / d * step; hero.y += dy / d * step; }
          hero.vx = dx / (d || 1) * SPEED; hero.vy = dy / (d || 1) * SPEED;
        }
        rig.update(dt, hero.rigState());
        game.focus(hero.x, hero.y, 16);
      },
      draw(r) {
        const st = game.stats; hud.draw += (st.renderMs - hud.draw) * .1; hud.update += (st.updateMs - hud.update) * .1;
        if (rec) { rec.update.push(+st.updateMs.toFixed(3)); rec.render.push(+st.renderMs.toFixed(3)); rec.frames++; }
        bg.draw(r);
        floor.drawIso(r);
        map.queueWalls(r);
        map.prebakeWalls(r);   // the blocks about to scroll in, a little each frame
        // lamp posts near the screen: a pole and a head, queued so walls and bodies sort with them
        const [i0, j0, i1, j1] = floor.rangeIso(r, 64);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const [lx, ly] of lamps.get(j * 64 + i) || []) {
          const [sx, sy] = r.w(lx, ly, 0); if (sx < -8 || sx > r.W + 8 || sy < -8 || sy > r.H + 60) continue;
          r.queue(lx, ly, 0, g => { const [a, b] = r.w(lx, ly, 0), [c, d] = r.w(lx, ly, 44); E.px.rect(g, a - 1, d, 2, b - d, '#3a3a44'); E.px.rect(g, c - 2, d - 1, 5, 2, '#ffe9a0'); }, { hides: true });
        }
        r.shadow(hero.x, hero.y, 5);
        r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: true });
        r.overlay(g => {
          const w = map.wallCache(), lines = [
            `SCALE YARD  ${map.w}x${map.h}  ${walk ? 'WALK' : 'LAP ' + SPEED + ' U/S'}`,
            `DRAW ${hud.draw.toFixed(1)} MS  UPDATE ${hud.update.toFixed(2)} MS  ITEMS ${st.items}`,
            `FLOOR ${floor.chunks.size} CHUNKS (${floor.stats.drawn} DRAWN, ${floor.stats.waiting} WAITING)`,
            `WALLS ${w.blocks} BLOCKS ${(w.px / 1e6).toFixed(1)}M PX  SOLIDS ${map.solids.length}`,
          ];
          E.ui.box(g, 4, 4, 196, lines.length * 9 + 6, { alpha: .75 });
          lines.forEach((s, i) => E.font.text(g, s, 8, 8 + i * 9, i ? '#d8e4f0' : '#ffe066'));
        });
      },
    };
  },
});
