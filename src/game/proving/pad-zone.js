// The Proving Ground's vehicle pad (spike S3, PLAN.md 8.8): drive the Cortez (the vehicle bindings: throttle R2 / W,
// brake and reverse L2 / S, steer the left stick / A D, handbrake R1 / Space), crash into the barriers, the lamps and the
// parked cars, drift round the skidpad, climb the curb, cross grass and dirt. ?wet=1 wets the road; ?mode=auto drives a
// lap of the pad by itself (screenshots, perf). The ISO camera zooms out with speed (SpeedZoom); ?zoom=.8 holds one zoom.
import { E, def, get, FloorChunks, makeBody, collidePairs, drawBoxModel, carModel, SpeedZoom } from '../../motor/index.js';
import { drawLamp } from './city-zones.js';

def('provingZones', 'pad', {
  title: 'Vehicle pad',
  make(app) {
    const { game, views, human, links, stage } = app;
    let map, floor, car, cars, wet, auto, wp, look, zoom;
    const models = new Map(), modelFor = b => { const k = b.def.id + b.color; let m = models.get(k); if (!m) { m = carModel({ ...b.def.model, color: b.color }); models.set(k, m); } return m; };
    return {
      enter() {
        map = get('maps', 'vehicle-pad').build();
        floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: map.paintFloor });
        stage.setWorld({ map, floor, backdrop: new E.Backdrop('city-night') });
        wet = links.query.get('wet') === '1'; auto = links.query.get('mode') === 'auto'; wp = 0;
        car = makeBody('cortez', map.start[0], map.start[1], map.start[2]); car.color = car.def.palette[0];
        cars = [car, ...map.bays.map(([x, y, h], i) => { const b = makeBody('cortez', x, y, h); b.color = b.def.palette[1 + i % (b.def.palette.length - 1)]; return b; })];
        look = { roll: 0, pitch: 0 };
        game.cam.bounds = v => map.bounds(v);
        const fixed = +links.query.get('zoom'); zoom = fixed ? null : new SpeedZoom();
        game.setZoom(fixed || zoom.update(0, true, 0));   // a driving zoom: held, or by speed
        if (!game.headless) floor.warm(car.x, car.y, 400);
        return { map, floor };
      },
      update(dt) {
        let ctl;
        if (auto) {   // a lap round the pad's waypoints: pure pursuit, slower into the corners
          const W = [[30 * 16, 64 * 16], [70 * 16, 64 * 16], [72 * 16, 30 * 16], [40 * 16, 22 * 16], [10 * 16, 30 * 16], [8 * 16, 56 * 16]];
          let [tx, ty] = W[wp % W.length]; if (Math.hypot(tx - car.x, ty - car.y) < 90) { wp++; [tx, ty] = W[wp % W.length]; }
          const want = Math.atan2(ty - car.y, tx - car.x), err = Math.atan2(Math.sin(want - car.heading), Math.cos(want - car.heading));
          ctl = { steer: E.clamp(err * 2.2, -1, 1), throttle: Math.abs(err) > .6 && car.speed > 120 ? 0 : .8, brake: Math.abs(err) > .9 && car.speed > 140 ? .6 : 0, handbrake: false };
        } else {
          const I = human.update('vehicle', null);
          ctl = { throttle: I.throttle, brake: I.brake, steer: I.steer, handbrake: I.down.handbrake };
          if (I.tap.view) views.next();
        }
        car.step(dt, ctl, { map, wet });
        for (const b of cars) if (b !== car) b.step(dt, { throttle: 0, brake: .4, steer: 0, handbrake: true }, { map, wet });   // parked: in gear, handbrake on
        collidePairs(cars);
        if (zoom) stage.zoomTo(zoom.update(dt, true, car.speed));
        game.focus(car.x, car.y, 12);
      },
      draw(r) {
        const k = 1 - Math.exp(-(1 / 60) * 8); look.roll += (E.clamp(-car.felt.lat * .0005, -.12, .12) - look.roll) * k; look.pitch += (E.clamp(car.felt.lon * .0004, -.08, .08) - look.pitch) * k;
        stage.begin(r, { focus: [car.x, car.y], vel: [car.vx, car.vy], speed01: car.speed / car.h.top });
        for (const [lx, ly] of map.lamps) stage.shape(lx, ly, 0, (g, P) => drawLamp(g, P, lx, ly));
        for (const b of cars) {
          const mine = b === car;
          stage.shape(b.x, b.y, 0, (g, P) => drawBoxModel(g, P, modelFor(b), b.x, b.y, b.z, b.heading, { roll: mine ? look.roll : 0, pitch: mine ? look.pitch : 0, lit: true, braking: mine && car.ctl.brake > 0 && car.u > 1 }));
        }
        stage.end();
      },
      hud() {
        const deg = Math.round(car.felt.slip * 57.3);
        return [`CORTEZ  ${Math.round(car.speed)} U/S  GEAR ${car.gear}  RPM ${'|'.repeat(Math.round(car.rpm * 10))}`, `SLIP ${deg}°  YAW ${car.w.toFixed(2)}  ${car.ctl.handbrake ? 'HANDBRAKE  ' : ''}${wet ? 'WET' : 'DRY'}  ${car.felt.hit > 1 ? 'HIT ' + Math.round(car.felt.hit / 1000) + 'K' : ''}`];
      },
      snapshot() { return { car: [car.x, car.y].map(Math.round), speed: Math.round(car.speed), heading: +car.heading.toFixed(2) }; },
      perf() { return { floor: { ...floor.stats }, walls: map.wallCache(), cars: cars.length }; },
      stateHash() { return cars.flatMap(b => [Math.round(b.x * 8), Math.round(b.y * 8), Math.round(b.heading * 1000)]); },
      handle() { return { map, floor, car, cars }; },
    };
  },
});
