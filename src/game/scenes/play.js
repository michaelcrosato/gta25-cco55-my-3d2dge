// Free roam (M1: the hello block and the possessed protagonist driven through the HumanController's Intent; the city,
// vehicles and everything else replace the pieces here milestone by milestone).
import { E, def, get, expose, Actor } from '../../motor/index.js';

def('scenes', 'play', {
  make(app) {
    const { game, views, human, footprint } = app;
    let map, hero, rig, bg;
    return {
      pausable: true, view: 'iso',
      enter() {
        map = get('maps', 'hello').build();
        const s = map.find('hero');
        hero = new E.Mover({ x: s.x, y: s.y }); hero.actor = new Actor('ped', { x: s.x, y: s.y, faction: 'crew' });
        rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null,
          colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } });
        game.cam.bounds = v => map.bounds(v);
        bg = new E.Backdrop('city-night');
        expose('snapshot', () => ({ scene: 'play', view: views.active, hero: [hero.x, hero.y, hero.z].map(v => Math.round(v)) }));
        expose('teleport', (x, y) => { hero.x = x; hero.y = y; });
        game.stateHash = () => [Math.round(hero.x * 8), Math.round(hero.y * 8), Math.round(hero.z * 8)];
      },
      update(dt) {
        const I = human.update('onFoot', hero);
        hero.update(dt, map, { move: I.move, sprint: I.down.sprint, jumpPressed: I.tap.jump });
        hero.actor.x = hero.x; hero.actor.y = hero.y; hero.actor.z = hero.z;
        rig.update(dt, hero.rigState());
        if (I.tap.view) views.next();
        footprint.update(hero.x, hero.y);
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
