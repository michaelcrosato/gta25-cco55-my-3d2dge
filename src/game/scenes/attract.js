// The attract mode (M1 stub; the director, the reels and the AutoPlayer arrive in M11): the city plays by itself under
// a DEMO badge until any input from any device, which returns to the title at once. Never saves anything.
import { E, def, get, expose, RNG, Actor, FloorChunks, paintTileMapFloor } from '../../motor/index.js';

def('scenes', 'attract', {
  make(app) {
    const { game, activity, stage } = app;
    let map, hero, rig, t = 0, goal = null, rng;
    return {
      view: 'iso',
      enter() {
        t = 0; activity.reset(); rng = RNG.stream('attract');
        map = get('maps', 'hello').build();
        stage.setWorld({ map, floor: new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: paintTileMapFloor(map), size: 128 }), backdrop: new E.Backdrop('city-night') });
        const s = map.find('hero'); hero = new E.Mover({ x: s.x, y: s.y }); hero.actor = new Actor('ped', { x: s.x, y: s.y, faction: 'crew' });
        rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null, colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c' } });
        game.cam.bounds = v => map.bounds(v);
        expose('snapshot', () => ({ scene: 'attract', t: +t.toFixed(2), hero: [hero.x, hero.y].map(Math.round) }));
      },
      exit() { game.timeScale = 1; game.input.stopRumble && game.input.stopRumble(); },
      update(dt) {
        t += dt;
        if (activity.idle() < t - 1e-9) { game.input.consumeAll(); game.go('title', null, { fade: .15 }); return; }   // any input since entering
        if (!goal || Math.hypot(goal[0] - hero.x, goal[1] - hero.y) < 12 || rng.chance(dt * .1)) {
          const b = map.bounds(game.view); goal = [rng.range(48, 32 * 16 - 48), rng.range(48, 32 * 16 - 48)]; void b;
        }
        const dx = goal[0] - hero.x, dy = goal[1] - hero.y, l = Math.hypot(dx, dy) || 1;
        hero.update(dt, map, { move: [dx / l * .8, dy / l * .8], sprint: false, jumpPressed: false });
        rig.update(dt, hero.rigState());
        game.focus(hero.x, hero.y, 16);
      },
      draw(r) {
        stage.begin(r, { focus: [hero.x, hero.y], vel: [hero.vx, hero.vy] });
        stage.actor(hero.x, hero.y, hero.z, (g, x, y, v) => rig.draw(g, x, y, v), { shadow: 5 });
        stage.end();
        r.overlay(g => {
          E.ui.box(g, 6, 6, 44, 15, { alpha: .7 }); E.font.text(g, 'DEMO', 28, 10, '#ffe066', { align: 'center' });
          if ((t * 1.4 | 0) % 2 === 0) E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 22, '#ffffff', { align: 'center', shadow: '#000' });
        });
      },
    };
  },
});
