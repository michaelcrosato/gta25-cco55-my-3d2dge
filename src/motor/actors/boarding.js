// Getting in and out of vehicles (PLAN.md 8.8): E.ACTIONS beats a ped plays against a vehicle's live pose (its doors
// and seats are in its own frame, so a slowly rolling car is boarded where it is now).
//   enterCar: open the door, get in, shut it (a passenger door with the driver's seat empty: slide across);
//   carjack: open the door, yank the driver out (a paired action: the victim is moved), throw them down, get in;
//   breakIn: a locked car (police): jimmy the lock first (TUNE.breakIn seconds; the BUS hears a crime);
//   mount: a bike or a boat: no door, a hop into the saddle;
//   exitCar: open, step out to the door's spot, shut; bailOut: above TUNE.bailSpeed, a dive roll out of the side.
// boardingFor(ped, vehicle, seat) picks the door and the beats; Ped runs them (ped.board / ped.leave), then
// vehicle.sit(ped, seat). The walk to the door is the Ped's own (a short auto-walk; the stick cancels it).
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';

knob('Vehicles', 'breakIn', 'Break-in time', 1.2, .2, 4, .1, 'Seconds to jimmy a locked car (police cars) before getting in');
knob('Vehicles', 'bailSpeed', 'Bail-out speed', 60, 20, 200, 5, 'Getting out above this speed (u/s) is a dive roll');
knob('Vehicles', 'enterReach', 'Enter reach', 40, 10, 120, 2, 'How near a vehicle\'s side a ped must be to get in (u)');
knob('Vehicles', 'boardSpeed', 'Boards below', 45, 0, 200, 5, 'A vehicle moving faster than this can\'t be got into (u/s)');

const W = (v, lx, ly) => { const c = Math.cos(v.heading), s = Math.sin(v.heading); return { x: v.x + lx * c - ly * s, y: v.y + lx * s + ly * c }; };
const lerpP = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const ease = E.ease;
/** the seat's height in a vehicle (the rider of a bike sits up on it) */
const seatZ = v => v.z + (v.cls === 'bike' ? 7 : v.cls === 'boat' ? 4 : 6);
/** the way into the car from a door's side */
const inward = (v, d) => d.side ? v.heading - d.side * Math.PI / 2 : v.heading + Math.PI;

E.ACTIONS.enterCar = {
  beats: [['open', .3], ['in', .4], ['shut', .18]],
  setup(A) { A.from = { x: A.start.x, y: A.start.y }; },
  at(A, b, u) {
    const v = A.o.vehicle, d = A.o.door, s = A.o.seatSpot, door = W(v, d.x, d.y), seat = W(v, s.x, s.y), z0 = v.z, z1 = seatZ(v);
    if (b === 'open') return { ...lerpP(A.from, door, ease.outQuad(u)), z: z0, state: { facing: inward(v, d), stance: 'ready' } };
    if (b === 'in') return { ...lerpP(door, seat, ease.inOut(u)), z: z0 + (z1 - z0) * u, state: { facing: inward(v, d) + (v.heading - inward(v, d)) * u, crouch: true } };
    return { ...seat, z: z1, state: { facing: v.heading, crouch: true } };
  },
};
E.ACTIONS.carjack = {
  beats: [['open', .28], ['yank', .4], ['throw', .32], ['in', .4], ['shut', .16]],
  setup(A) { A.from = { x: A.start.x, y: A.start.y }; },
  at(A, b, u) {
    const v = A.o.vehicle, d = A.o.door, s = A.o.seatSpot, door = W(v, d.x, d.y), seat = W(v, s.x, s.y), z1 = seatZ(v), face = inward(v, d);
    // the victim: out of the seat, past the jacker, onto the ground beyond the door
    const out = d.side ? W(v, d.x - 10, d.y + d.side * 16) : W(v, d.x - 16, d.y), vs = { facing: face + Math.PI };
    if (b === 'open') return { ...lerpP(A.from, door, ease.outQuad(u)), z: v.z, state: { facing: face, stance: 'ready' }, other: { ...seat, z: z1, state: { ...vs, crouch: true } } };
    if (b === 'yank') return { ...door, z: v.z, state: { facing: face, attack: E.move('cross', u) }, other: { ...lerpP(seat, door, ease.inQuad(u)), z: z1 + (v.z - z1) * u, state: { ...vs, hurt: true } } };
    if (b === 'throw') return { ...door, z: v.z, state: { facing: face, attack: E.move('cross', 1, 'recover') }, other: { ...lerpP(door, out, ease.outQuad(u)), z: v.z + Math.sin(u * Math.PI) * 6, state: { ...vs, down: ease.inQuad(u) } } };
    const p = b === 'in' ? { ...lerpP(door, seat, ease.inOut(u)), z: v.z + (z1 - v.z) * u, state: { facing: face + (v.heading - face) * u, crouch: true } } : { ...seat, z: z1, state: { facing: v.heading, crouch: true } };
    return { ...p, other: { ...out, z: v.z, state: { ...vs, down: 1 } } };
  },
};
E.ACTIONS.breakIn = {
  beats: [['jimmy', 1.2]],
  setup(A) { A.beats = [['jimmy', TUNE.breakIn]]; A.from = { x: A.start.x, y: A.start.y }; },
  at(A, b, u) { const v = A.o.vehicle, d = A.o.door, door = W(v, d.x, d.y); return { ...lerpP(A.from, door, Math.min(1, u * 4)), z: v.z, state: { facing: inward(v, d), stance: 'ready', attack: u > .3 && u < .9 ? E.move('jab', (u * 5) % 1) : null } }; },
};
E.ACTIONS.mount = {
  beats: [['hop', .32]],
  setup(A) { A.from = { x: A.start.x, y: A.start.y, z: A.start.z }; },
  at(A, b, u) { const v = A.o.vehicle, s = A.o.seatSpot, seat = W(v, s.x, s.y), z1 = seatZ(v); return { ...lerpP(A.from, seat, ease.outQuad(u)), z: A.from.z + (z1 - A.from.z) * u + Math.sin(u * Math.PI) * 5, state: { facing: v.heading, air: u < .85, crouch: u > .7 } }; },
};
E.ACTIONS.exitCar = {
  beats: [['open', .24], ['out', .36], ['shut', .14]],
  setup(A) { A.from = { x: A.start.x, y: A.start.y }; },
  at(A, b, u) {
    const v = A.o.vehicle, d = A.o.door, s = A.o.seatSpot, seat = W(v, s.x, s.y), door = W(v, d.x, d.y), z1 = seatZ(v), face = inward(v, d) + Math.PI;
    if (b === 'open') return { ...seat, z: z1, state: { facing: v.heading, crouch: true } };
    if (b === 'out') return { ...lerpP(seat, door, ease.inOut(u)), z: z1 + (v.z - z1) * u, state: { facing: v.heading + (face - v.heading) * u, crouch: u < .5 } };
    return { ...door, z: v.z, state: { facing: face } };
  },
};
E.ACTIONS.bailOut = {
  beats: [['dive', .3], ['roll', .42], ['rise', .16]], safe: [.1, .7],
  setup(A) {
    const v = A.o.vehicle, d = A.o.door, side = d.side || 1, a = v.heading - side * Math.PI / 2 * .55;   // out of the side, carried forward
    A.facing = a; A.from = { x: A.start.x, y: A.start.y, z: A.start.z }; const sp = Math.min(220, v.speed) * .35;
    A.mid = { x: A.from.x + Math.cos(a) * (18 + sp * .4), y: A.from.y + Math.sin(a) * (18 + sp * .4), z: v.z }; A.end = { x: A.mid.x + Math.cos(a) * (16 + sp * .5), y: A.mid.y + Math.sin(a) * (16 + sp * .5), z: v.z };
  },
  at(A, b, u) {
    if (b === 'dive') return { ...lerpP(A.from, A.mid, u), z: A.from.z + (A.mid.z - A.from.z) * u + Math.sin(u * Math.PI) * 6, state: { facing: A.facing, air: true } };
    if (b === 'roll') return { ...lerpP(A.mid, A.end, ease.outQuad(u)), z: A.end.z, state: { facing: A.facing, flip: u, crouch: true } };
    return { ...A.end, state: { facing: A.facing, crouch: u < .6 } };
  },
};

/** the door a ped at (x, y) uses to reach seat (the nearest door that serves it; any door for a driver's seat: a
 *  passenger door slides across), and whether getting in needs a jack, a break-in or a hop. null: it can't be boarded */
export function boardingFor(ped, v, seat = 0) {
  if (!v.body || v.wrecked || v.sunk || v.cls === 'heli' || v.cls === 'rail' || v.towedBy) return null;
  if (v.speed > TUNE.boardSpeed) return null;
  const doors = v.model.doors; if (!doors.length) return null;
  let best = null, bd = Infinity;
  for (const d of doors) {
    if (d.seat !== seat && !(seat === 0 && v.cls !== 'bike')) continue;   // (the driver may come in by any door: a slide across)
    const p = W(v, d.x, d.y), dist = Math.hypot(p.x - ped.x, p.y - ped.y) + (d.seat === seat ? 0 : 6);   // (its own door, all else equal)
    if (dist < bd) { bd = dist; best = d; }
  }
  if (!best) return null;
  const s = v.model.seats[Math.min(seat, v.model.seats.length - 1)] || { x: 0, y: 0 }, occupant = v.seats[seat];
  const kind = v.cls === 'bike' || (v.cls === 'boat' && !v.model.doors.some(d => d.side === 0)) ? 'mount' : occupant ? 'carjack' : 'enterCar';
  return { vehicle: v, door: best, seat, seatSpot: s, kind, victim: occupant || null, locked: v.locked && kind !== 'mount' && !occupant, dist: bd, at: W(v, best.x, best.y) };
}
/** can a ped standing at (x, y) get into v now (near enough to it)? */
export function inReach(ped, v) { const dx = ped.x - v.x, dy = ped.y - v.y, c = Math.cos(v.heading), s = Math.sin(v.heading), lx = dx * c + dy * s, ly = -dx * s + dy * c; return Math.abs(lx) <= v.hl + TUNE.enterReach && Math.abs(ly) <= v.hw + TUNE.enterReach; }
/** the way out: the seat's own door (a driver's on the left), or, where that is blocked, the nearest clear one (across
 *  the car); a dive roll above the bail-out speed. ok(x, y): can a body stand there (a wall, the water)? A boat is only
 *  left where a door opens onto dry ground (null otherwise: nobody swims in the slice) */
export function exitFor(ped, v, ok = null) {
  const seat = v.seats.indexOf(ped); if (seat < 0) return null;
  const own = v.model.doors.filter(d => d.seat === seat), rest = v.model.doors.filter(d => d.seat !== seat);
  let door = null;
  for (const d of [...own, ...rest]) { const p = W(v, d.x, d.y); if (!ok || ok(p.x, p.y)) { door = d; break; } }
  if (!door) { if (v.cls === 'boat') return null; door = own[0] || v.model.doors[0] || { id: 'x', x: 0, y: -v.hw - 6, side: -1, seat }; }
  const s = v.model.seats[Math.min(seat, v.model.seats.length - 1)] || { x: 0, y: 0 };
  return { vehicle: v, door, seat, seatSpot: s, kind: v.speed > TUNE.bailSpeed && v.cls !== 'boat' ? 'bailOut' : 'exitCar', at: W(v, door.x, door.y) };
}
