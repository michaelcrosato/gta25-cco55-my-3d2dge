// Free roam (M1: the hello block and the possessed protagonist driven through the HumanController's Intent; the city,
// vehicles and everything else replace the pieces here milestone by milestone).
import { E, def, get, expose, Actor, FloorChunks, paintTileMapFloor } from '../../motor/index.js';

def('scenes', 'play', {
  make(app) {
    const { game, views, human, footprint, links, stage } = app;
    let map, hero, rig;
    return {
      pausable: true,
      enter() {
        map = get('maps', 'hello').build();
        // the floor in MOTOR's chunks (every view reads them); ?floor=engine draws the engine's own bake in ISO instead,
        // for the side-by-side check (PLAN.md 8.4)
        const engineFloor = links.query.get('floor') === 'engine';
        stage.setWorld({ map, floor: new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: paintTileMapFloor(map), size: 128 }), backdrop: new E.Backdrop('city-night'), engineFloor });
        const s = map.find('hero');
        hero = new E.Mover({ x: s.x, y: s.y }); hero.actor = new Actor('ped', { x: s.x, y: s.y, faction: 'crew' });
        rig = new E.Humanoid({ size: 1, build: 'heroic', outfit: 'coat', hair: 'spiky', weapon: null,
          colors: { skin: '#c8906a', hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } });
        game.cam.bounds = v => map.bounds(v);
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
        stage.begin(r, { focus: [hero.x, hero.y], vel: [hero.vx, hero.vy] });
        stage.actor(hero.x, hero.y, hero.z, (g, x, y, v) => rig.draw(g, x, y, v), { shadow: 5, xray: true });
        stage.end();
        r.overlay(g => E.font.text(g, 'LOWTOWN  •  HELLO BLOCK  •  ' + (views.spec.label || views.active).toUpperCase(), 6, 6, '#ffe066', { shadow: '#000' }));
      },
    };
  },
});
