// The Proving Ground's vehicle pad (spike S3, PLAN.md 8.8): drive the Cortez (the vehicle bindings: throttle R2 / W,
// brake and reverse L2 / S, steer the left stick / A D, handbrake R1 / Space, nitro L1 / Shift), crash into the
// barriers, the lamps and the parked cars, drift round the skidpad, climb the curb, cross grass and dirt. Since M4 the
// cars are Fleet vehicles (dents, smoke, skid marks) and a driver sits at the wheel. ?wet=1 wets the road; ?mode=auto
// drives a lap of the pad by itself (screenshots, perf). The ISO camera zooms out with speed (SpeedZoom); ?zoom=.8
// holds one zoom; ?car=<vehicle id> drives another definition.
import { E, def, get, FloorChunks, Fleet, Ped, Combat, VehicleFX, drawVehicle, SpeedZoom, makeIntent, clearIntent } from '../../motor/index.js';
import { drawLamp } from './city-zones.js';

def('provingZones', 'pad', {
  title: 'Vehicle pad',
  make(app) {
    const { game, views, human, links, stage } = app;
    let map, floor, fleet, combat, fx, car, driver, wet, auto, wp, zoom, autoI;
    return {
      enter() {
        map = get('maps', 'vehicle-pad').build();
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: map.paintFloor });
        stage.setWorld({ map, floor, backdrop: new E.Backdrop('city-night') });
        wet = links.query.get('wet') === '1'; auto = links.query.get('mode') === 'auto'; wp = 0;
        combat = new Combat({ game, map, fire: false }); fleet = new Fleet({ map, combat, game }); fx = new VehicleFX(game);
        const id = get('vehicles', links.query.get('car') || '') ? links.query.get('car') : 'cortez';
        car = fleet.spawn(id, map.start[0], map.start[1], map.start[2], { mods: { nitro: 3 } });
        map.bays.forEach(([x, y, h], i) => fleet.spawn('cortez', x, y, h, { color: get('vehicles', 'cortez').palette[1 + i % 6] }));
        driver = combat.add(new Ped({ x: car.x, y: car.y, faction: 'crew', look: get('characters', 'dex').outfits[0] })); car.sit(driver, 0);
        autoI = makeIntent();
        game.cam.bounds = v => map.bounds(v);
        const fixed = +links.query.get('zoom'); zoom = fixed ? null : new SpeedZoom();
        game.setZoom(fixed || zoom.update(0, true, 0));   // a driving zoom: held, or by speed
        if (!game.headless) floor.warm(car.x, car.y, 400);
        return { map, floor };
      },
      update(dt) {
        let I;
        if (auto) {   // a lap round the pad's waypoints: pure pursuit, slower into the corners
          const W = [[30 * 16, 64 * 16], [70 * 16, 64 * 16], [72 * 16, 30 * 16], [40 * 16, 22 * 16], [10 * 16, 30 * 16], [8 * 16, 56 * 16]];
          let [tx, ty] = W[wp % W.length]; if (Math.hypot(tx - car.x, ty - car.y) < 90) { wp++; [tx, ty] = W[wp % W.length]; }
          const want = Math.atan2(ty - car.y, tx - car.x), err = Math.atan2(Math.sin(want - car.heading), Math.cos(want - car.heading));
          I = clearIntent(autoI); I.steer = E.clamp(err * 2.2, -1, 1); I.throttle = Math.abs(err) > .6 && car.speed > 120 ? 0 : .8; I.brake = Math.abs(err) > .9 && car.speed > 140 ? .6 : 0;
        } else { I = human.update('vehicle', null); if (I.tap.view) views.next(); }
        fleet.update(dt, { intent: v => v === car ? I : null, peds: [], wet: wet ? 1 : 0, night: true });
        driver.update(dt, clearIntent(autoI), { map, combat });
        if (zoom) stage.zoomTo(zoom.update(dt, true, car.speed));
        game.focus(car.x, car.y, 12);
      },
      draw(r) {
        const b = car.body;
        stage.begin(r, { focus: [car.x, car.y], vel: [b.vx, b.vy], speed01: car.speed / b.h.top });
        for (const [lx, ly] of map.lamps) stage.shape(lx, ly, 0, (g, P) => drawLamp(g, P, lx, ly));
        const dt = Math.min(.1, game.real - (this._t ?? game.real)); this._t = game.real;
        for (const v of fleet.vehicles) drawVehicle(stage, v, { dt, night: false });
        fx.draw(stage, fleet, [car.x, car.y]);
        stage.end();
      },
      hud() {
        const b = car.body, deg = Math.round(b.felt.slip * 57.3);
        return [`${car.def.name.toUpperCase()}  ${Math.round(car.speed)} U/S  GEAR ${b.gear}  RPM ${'|'.repeat(Math.round(b.rpm * 10))}  ${car.damage.state.toUpperCase()} ${Math.round(car.damage.health)}`,
          `SLIP ${deg}°  YAW ${b.w.toFixed(2)}  ${b.ctl.handbrake ? 'HANDBRAKE  ' : ''}${wet ? 'WET' : 'DRY'}  ${b.felt.hit > 1 ? 'HIT ' + Math.round(b.felt.hit / 1000) + 'K' : ''}  NITRO ${car.mods.nitro}${car.nitroT > 0 ? ' ON' : ''}`];
      },
      snapshot() { return { car: [car.x, car.y].map(Math.round), speed: Math.round(car.speed), heading: +car.heading.toFixed(2), def: car.def.id, health: Math.round(car.damage.health) }; },
      perf() { return { floor: { ...floor.stats }, walls: map.wallCache(), cars: fleet.vehicles.length }; },
      stateHash() { return [fleet.hash(), ...fleet.vehicles.flatMap(v => [Math.round(v.x * 8), Math.round(v.y * 8), Math.round(v.heading * 1000)])]; },
      handle() { return { map, floor, car, cars: fleet.vehicles, fleet, driver }; },
    };
  },
});
