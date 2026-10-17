// Free roam (M0: the hello block and a walking protagonist; MOTOR's controllers, the city and everything else replace
// the pieces here milestone by milestone).
import { E, def, get, expose } from '../../motor/index.js';

def('scenes', 'play', {
  make({ game, views }) {
    let map, hero, rig, bg;
    return {
      pausable: true, view: 'iso',
      enter() {
        map = get('maps', 'hello').build();
        const s = map.find('hero');
        hero = new E.Mover({ x: s.x, y: s.y });
        rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null,
          colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } });
        game.cam.bounds = v => map.bounds(v);
        bg = new E.Backdrop('city-night');
        expose('snapshot', () => ({ scene: 'play', view: views.active, hero: [hero.x, hero.y, hero.z].map(v => Math.round(v)) }));
        expose('teleport', (x, y) => { hero.x = x; hero.y = y; });
      },
      update(dt) {
        const I = game.input, m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
        hero.update(dt, map, { move: d, sprint: I.down('dash'), jumpPressed: I.pressed('jump') });
        rig.update(dt, hero.rigState());
        game.focus(hero.x, hero.y, 16);
      },
      draw(r) {
        bg.draw(r);
        map.drawFloor(r);
        r.shadow(hero.x, hero.y, 5);
        map.queueWalls(r);
        r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: true });
        r.text('LOWTOWN  •  HELLO BLOCK', 6, 6, '#ffe066', { shadow: '#000' });
      },
    };
  },
});
