// The AutoPlayer's core (PLAN.md 8.20, M5): it plays the possessed protagonist by writing the same Intent a player's
// controller writes, so whatever it does a player could do (the attract mode, the bot campaign and the tests drive the
// real game code through it). This core goes places:
//   - on foot it walks the sidewalk graph's shortest way to the node nearest its goal, then straight to the goal; a
//     body stuck against something for a moment finds its way again;
//   - for a long way (TUNE.autoDriveFrom) it takes the nearest vehicle it can reach (△ / E at its door, as a player
//     would: the scene boards it), drives it on the GPS route with a player-style DriverBrain (quicker than traffic,
//     still stopping for red lights and what is in front of it), stops at the lane point nearest the goal, gets out and
//     walks the rest.
// M8 adds what the mission bot (missionbot.js) asks of it: get into one vehicle (board), keep to a vehicle at the goal
// (stay: it stops there, seated), get out for a goal on foot (foot), drive in a style (race: quicker, less patient), and
// a last stretch off the road (a yard, a plaza) driven straight at the goal, slowly. Deterministic: it reads only the
// simulation.
//   const A = new AutoPlayer({ city, roads: roadsOf(city), fleet, junctions });  A.goto(x, y)  ·  A.board(vehicle)
//   each step: I = A.update(dt, ped, { t, pedsNear, wanted, police })  ·  A.state: 'idle' | 'walk' | 'board' | 'drive' | 'escape' | 'final' | 'fly' | 'land' | 'exit' | 'arrived'
import { TUNE, knob } from '../core/tune.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { DriverBrain } from './driver.js';
import { inReach, boardingFor } from '../actors/boarding.js';
import { flyer } from '../sim/vehicle/defs.js';

knob('AutoPlayer', 'autoDriveFrom', 'Drives beyond', 420, 0, 3000, 10, 'The AutoPlayer takes a vehicle for a trip longer than this (u)');
knob('AutoPlayer', 'autoArrive', 'Arrives within', 14, 2, 80, 1, 'How near its goal the AutoPlayer stops (u)');
const CAR_REACH = 140, NODE_NEAR = 9, FINAL = 170, JACK = 60, SHUN = 60;
const occupied = v => v.seats.some(q => q && !q.dead);
const OFF_LIMITS = new Set(['police', 'medic', 'fire', 'service']);
/** a vehicle a player would take for a ride: on the road (no helicopter, boat or train), not locked or wrecked, not the
 *  city's (a works van) or the emergency services' (a cruiser, an ambulance, a fire engine: a crime of its own) */
export const pickable = v => !v.wrecked && !v.locked && !flyer(v) && v.cls !== 'boat' && v.cls !== 'rail' && v.owner !== 'service' && !OFF_LIMITS.has(v.def.role);
// does the segment (x0, y0)-(x1, y1) cross the box centred at (bx, by) with half-sizes (hx, hy)?
function segBox(x0, y0, x1, y1, bx, by, hx, hy) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - (bx - hx)], [dx, bx + hx - x0], [-dy, y0 - (by - hy)], [dy, by + hy - y0]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
// a course over water from cell (x0, y0) to the water cell nearest goal cell g (a pier's end, a quay: the water by it),
// eight ways, a cell beside the shore dearer than open water: [[cx, cy]...], or [] with no way
function seaPath(x0, y0, g, wet, W, H) {
  const ring = (cx, cy, ok) => { for (let r = 0; r <= 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (ok(cx + dx, cy + dy)) return [cx + dx, cy + dy]; } return null; };
  const s = ring(x0, y0, wet), e = ring(g[0], g[1], wet); if (!s || !e) return [];
  const I = (x, y) => y * W + x, cost = new Float64Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), open = [[0, s[0], s[1]]];
  const shore = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !wet(x + dx, y + dy));
  cost[I(s[0], s[1])] = 0;
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, x, y] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (x === e[0] && y === e[1]) break;
    const c = cost[I(x, y)];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (!wet(nx, ny) || (dx && dy && (!wet(x + dx, y) || !wet(x, y + dy)))) continue;
      const nc = c + (dx && dy ? 1.414 : 1) + (shore(nx, ny) ? 3 : 0); if (nc >= cost[I(nx, ny)]) continue;
      cost[I(nx, ny)] = nc; from[I(nx, ny)] = I(x, y); open.push([nc + Math.hypot(e[0] - nx, e[1] - ny), nx, ny]);
    }
  }
  if (from[I(e[0], e[1])] < 0 && (e[0] !== s[0] || e[1] !== s[1])) return [];
  const out = []; for (let k = I(e[0], e[1]); k >= 0; k = from[k]) out.push([k % W, Math.floor(k / W)]);
  return out.reverse();
}
// (player and race drive as a player does: through the lights and the stop signs, first into a junction's box, round
// what stands in the lane at once: the brain's siren mode, with no siren sounding; and round a queue that has not
// moved for a few seconds: its squeeze. Calm keeps to the rules. Smooth, a chauffeur's: through the lights and round
// what stands as a player, never squeezing round a queue: a limo on the walk past a jam had wedged against the sea wall)
const STYLES = { calm: { speed: 1, gap: 1, patience: 1, calm: true }, smooth: { speed: 1.1, gap: 1, patience: .6, calm: true, assertive: true }, careful: { speed: .95, gap: 1.2, patience: .6, calm: true, assertive: true, squeeze: 6 }, player: { speed: 1.25, gap: .75, patience: .5, calm: true, assertive: true, squeeze: 4 }, race: { speed: 1.6, gap: .6, patience: .15, calm: true, assertive: true, squeeze: 2.5 } };

export class AutoPlayer {
  /** o: { city, roads ({ graph, gps, walks }), fleet, junctions } */
  constructor(o) {
    this.city = o.city; this.G = o.roads.graph; this.gps = o.roads.gps; this.S = o.roads.walks; this.fleet = o.fleet; this.J = o.junctions || null;
    this.I = makeIntent(); this.goal = null; this.state = 'idle'; this.path = null; this.i = 0; this.brain = null; this.car = null;
    this.stuck = 0; this.last = [0, 0]; this.t = 0; this.tried = new Set(); this.gaveUp = new Map();
  }
  // a car given up on (no way to its door, boxed in): kept off for this goal (tried) and, whatever the goals that
  // follow, for SHUN s (gaveUp): a fresh goal had cleared tried and the same car out of reach was taken again, for ever
  _giveUp(id) { if (id == null) return; this.tried.add(id); this.gaveUp.set(id, this.t); }
  /** is the vehicle with this id one not to take (given up on for this goal, or a moment ago)? */
  shuns(id) { return this.tried.has(id) || (this.gaveUp.has(id) && this.t - this.gaveUp.get(id) < SHUN); }
  /** go to (x, y): o.foot keeps it on foot (out of a vehicle first); o.car: drive there in this vehicle; o.stay: stop
   *  there seated; o.style: 'calm' | 'smooth' | 'careful' | 'player' | 'race'; o.radius: near enough; o.z: the goal's height (a
   *  deck: driven to the lane up there); o.hold: never give up the vehicle it drives (a job's own: a jam it can't drive
   *  out of is backed and driven round, again and again, never left); o.heading: come in along a lane running that way
   *  (a tow truck to stand facing it); o.hover: in a helicopter, held over it (not landed); o.keep: the same trip to a
   *  goal that moved (what it learned on the way kept: the car it is taking, the cars it gave up on, the lanes it keeps
   *  off, how long it has been stuck) */
  goto(x, y, o = {}) {
    this.goal = { x, y, z: o.z ?? null, foot: !!o.foot, stay: !!o.stay, style: o.style || 'player', radius: o.radius || 0, hold: !!o.hold, heading: o.heading ?? null, hover: !!o.hover, land: o.land ?? null, taxi: !!o.taxi, speed: o.speed ?? null }; this.state = 'idle'; this.path = null; this._dropBrain();   // (heading: the route's last lane one running that way; hover: a helicopter held over it, not landed)
    // (a new trip's counts start at nothing: they had run on from trip to trip, so a long-lived AutoPlayer (the campaign's,
    // the career's mission bot's) got out of the car at its first box once three were behind it anywhere, gave up a car
    // at a glance once 20 s of walks to doors were, and after its first hop anywhere never walked straight again, each
    // walk begun from a node farther off)
    if (!o.keep) { this.car = o.car || null; this.tried.clear(); this.prog = null; this.avoid = null; this.esc = null; this.wedge = null; this.round = null; this.boxed = this.boxT = this.exitHeld = 0; this.shoveNext = false; this._jam = null; this._boardT = 0; this.skip = 0; }
    return this;
  }
  /** get into this vehicle (out of another first) */
  board(v) { this.goal = { x: v.x, y: v.y, board: v }; this.state = 'board'; this.path = null; this.car = v; this.esc = null; this.wedge = null; this._dropBrain(); return this; }   // (the cars given up on are kept: the mission bot's, one it could not reach, had come back after the next and the next, round and round)
  /** a new goal point for the trip under way (a moving target): re-routed only when it moved more than o.slack (24) */
  retarget(x, y, o = {}) { const g = this.goal; if (!g || g.board || Math.hypot(g.x - x, g.y - y) > (o.slack ?? 24)) return this.goto(x, y, { foot: g ? g.foot : false, stay: g ? g.stay : false, style: g ? g.style : 'player', radius: g ? g.radius : 0, hold: g ? g.hold : false, hover: g ? g.hover : false, keep: !!g && !g.board, ...o }); return this; }
  get arrived() { return this.state === 'arrived'; }
  /** one step for the possessed ped: its Intent (on foot or at the wheel). w: { t (the signals' clock), pedsNear } */
  update(dt, p, w = {}) {
    const I = clearIntent(this.I); this.t += dt; this._w = w; if (!this.goal || p.dead) return I;
    const g = this.goal, v = p.seat && p.seat.vehicle, d = Math.hypot(g.x - p.x, g.y - p.y);
    // a boarding the ped gave up on (its door out of reach: a car alongside, a post): twice, another door or car
    if (this._wasBoarding && !p.boarding && !v && this.car) { this._bfails = (this._bfails || 0) + 1; if (this._bfails >= 2) { this._bfails = 0; if (g.board) this._door = (this._door || 0) + 1; else { this._giveUp(this.car.id); this.car = null; this.state = 'walk'; } } }
    this._wasBoarding = !!p.boarding && !!p.boarding.plan && p.boarding.v === this.car;
    if (p.boarding || p.held || p.floored) return I;   // (the scene plays getting in and out)
    if (g.board) {   // into that vehicle: there already, out of another first, or to its door
      if (v === g.board) { this.state = 'arrived'; return I; }
      if (v) return this._exit(v);
      this.car = g.board; this.state = 'board'; return this._board(dt, p, true);
    }
    if (v && v.cls === 'heli') return this._fly(dt, p, v, g, d);
    if (v && v.cls === 'plane') return this._plane(dt, p, v, g, d);
    if (v && v.cls === 'boat') return this._boat(dt, p, v, g);
    if (v) return g.foot ? this._exit(v) : this._drive(dt, p, v, w);
    if (d < Math.max(TUNE.autoArrive, g.radius ? g.radius * .6 : 0)) { this.state = 'arrived'; return I; }
    // a long way on foot: a vehicle near enough to take?
    if (!g.foot && d > TUNE.autoDriveFrom && this.state !== 'board') { const car = this.car && !this.car.wrecked ? this.car : this._pickCar(p); if (car) { this.car = car; this.state = 'board'; } }
    if (this.state === 'board') return this._board(dt, p);
    return this._walk(dt, p);
  }
  // ---- on foot
  // pinned (a pocket: the cars near it all given up on, one it left parked, a wall, peds in the gap) and within 40 of one
  // spot for 20 s: the cars given up on are taken again, and the walk starts over from the nearest node (it had cycled
  // its start nodes round and round there, D31)
  _walk(dt, p) {
    this.state = 'walk';
    const K = this.pin && this.pin.goal === this.goal ? this.pin : (this.pin = { goal: this.goal, at: [p.x, p.y], t: 0 });
    if (Math.hypot(p.x - K.at[0], p.y - K.at[1]) > 40) { K.at = [p.x, p.y]; K.t = 0; }
    else if ((K.t += dt) > 20) { K.t = 0; this.tried.clear(); this.gaveUp.clear(); this.car = null; this.skip = 0; this.path = null; }
    return this._walkTo(dt, p, this.goal.x, this.goal.y, 'goal');
  }
  // to (tx, ty) on foot: the sidewalk graph's shortest way between the nodes nearest each end, then straight there;
  // stuck against something, a hop, then the way again from the next-nearest node
  _walkTo(dt, p, tx, ty, key) {
    const I = this.I, far = Math.hypot(tx - p.x, ty - p.y);
    if (!this.path || this.pathKey !== key) {   // (straight there when the way is open: a park, a plaza, across a yard)
      if (this.pathKey !== key) this.skip = 0;   // (a new place to walk to: the hops at the last one forgotten)
      const a = this._startNode(p), b = this.S.nearestNode(tx, ty, 200);
      this.path = a && b && far > 60 && !this._open(p.x, p.y, tx, ty) ? this.S.route(a.id, b.id) || [] : []; this.i = 0; this.pathKey = key;
    }
    let to = [tx, ty];
    while (this.i < this.path.length) {
      const n = this.S.nodes[this.path[this.i]];
      if (Math.hypot(n.x - p.x, n.y - p.y) < NODE_NEAR) { this.i++; continue; }
      if (this.i > 0 && far < Math.hypot(tx - n.x, ty - n.y)) { this.i = this.path.length; break; }   // (the target nearer than the next node: straight on)
      to = [n.x, n.y]; break;
    }
    const dx = to[0] - p.x, dy = to[1] - p.y, l = Math.hypot(dx, dy) || 1;
    I.move[0] = dx / l; I.move[1] = dy / l; I.down.sprint = far > 120 && p.stamina > .4;
    const moved = Math.hypot(p.x - this.last[0], p.y - this.last[1]); this.last[0] = p.x; this.last[1] = p.y;
    this.stuck = moved < .1 ? this.stuck + dt : 0;
    // no nearer the point it walks to for 2 s (sliding along a wall toward a node behind it): stuck as well
    const tk = Math.round(to[0]) + ',' + Math.round(to[1]);
    if (this._toK !== tk) { this._toK = tk; this._toBest = l; this._toT = 0; }
    else if (l < this._toBest - 3) { this._toBest = l; this._toT = 0; } else if ((this._toT += dt) > 2) { this._toT = 0; this._toBest = l; this.stuck = 1.01; this.dodged = true; }
    if (this.dodge > 0) { this.dodge -= dt; const k = this.side || 1; I.move[0] = -dy / l * k; I.move[1] = dx / l * k; I.down.sprint = false; return I; }   // (a step to one side: round a trunk, a post)
    if (this.stuck > .5 && !this.dodged) { this.dodged = true; this.dodge = .45; this.side = -(this.side || -1); this.stuck = 0; }
    else if (this.stuck > 1) { this.stuck = 0; this.dodged = false; this.skip = (this.skip || 0) + 1; this.path = null; I.tap.jump = true; I.down.jump = true; }   // (a hop: a low wall, a fence; then another way)
    if (moved > .5) this.dodged = false;
    return I;
  }
  // is the way from (x0, y0) to (x1, y1) walkable all along (every 8 u), clear of the solids a body bumps (a palm's
  // trunk, a bench), and short enough to walk straight (400 u)?
  _open(x0, y0, x1, y1) { return Math.hypot(x1 - x0, y1 - y0) <= 400 && !this.skip && this._line(x0, y0, x1, y1); }
  // the straight line walkable and clear of those solids
  _line(x0, y0, x1, y1) {
    const C = this.city, T = C.T, d = Math.hypot(x1 - x0, y1 - y0);
    for (let k = 0, n = Math.ceil(d / 8); k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; if (!C.walkable(Math.floor(x / T), Math.floor(y / T))) return false; }
    const lx = Math.min(x0, x1) - 12, hx = Math.max(x0, x1) + 12, ly = Math.min(y0, y1) - 12, hy = Math.max(y0, y1) + 12;
    for (const b of C.map.solidsNear ? C.map.solidsNear((x0 + x1) / 2, (y0 + y1) / 2, d / 2 + 16) : C.map.solids || []) {
      if (b.x < lx || b.x > hx || b.y < ly || b.y > hy || b.z > 20 || b.top < 4) continue;
      if (segBox(x0, y0, x1, y1, b.x, b.y, b.hx + 6, b.hy + 6)) return false;
    }
    return true;
  }
  // the node to start a walk from: the nearest, or after being stuck, the next-nearest ones in turn
  _startNode(p) {
    const k = this.skip || 0, near = this.S.live.map(n => [Math.hypot(n.x - p.x, n.y - p.y), n]).filter(q => q[0] < 260).sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
    const open = near.slice(0, 8).filter(q => this._line(p.x, p.y, q[1].x, q[1].y)), list = open.length ? open : near;   // (one it can walk to straight: not one behind a wall)
    return list.length ? list[k % list.length][1] : null;
  }
  // the nearest vehicle to take: unlocked, standing, nobody in it but traffic's driver (a carjack, as a player would);
  // one parked and empty before one with someone in it unless that one is JACK nearer (a carjack is a crime: the
  // witnesses phone it in, and the trip goes on with a star)
  _pickCar(p) {
    let best = null, bd = CAR_REACH + JACK;
    for (const v of this.fleet.near(p.x, p.y, CAR_REACH)) {
      if (this.shuns(v.id) || !pickable(v) || v.speed > 30) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y), k = d + (occupied(v) ? JACK : 0); if (d < CAR_REACH && k < bd) { bd = k; best = v; }
    }
    return best;
  }
  // out of a vehicle: stopped first, then △
  _exit(v) {
    const I = clearIntent(this.I); this._dropBrain(); this.state = 'exit';
    if (v.speed > 6) { I.brake = 1; return I; }
    I.tap.interact = true; I.down.interact = true; return I;
  }
  // to the vehicle's door, then △ (the scene boards: get in, or jack the driver); keep: this one only (never another).
  // The scene boards the nearest vehicle in reach, so △ waits until this one's door is the nearest
  _board(dt, p, keep = false) {
    const I = this.I, v = this.car; if (!v || v.wrecked || (!keep && (v.speed > 40 || Math.hypot(v.x - p.x, v.y - p.y) > CAR_REACH * 2))) { if (keep) return I; this._giveUp(v && v.id); this.car = null; this.state = 'walk'; return I; }   // (gone, driven off, or left far behind: another)
    if (this._boardFor !== v) { this._boardFor = v; this._boardT = 0; }   // (the walk's clock is this car's)
    const plan = boardingFor(p, v, 0);
    if (plan && inReach(p, v) && plan.dist < 16 && !this._nearer(p, v, plan.dist)) {   // (at the door itself: △, the scene's own walk a step or two)
      I.tap.interact = true; I.down.interact = true; this._tries = (this._tries || 0) + 1; if (this._tries > 90 && !keep) { this._giveUp(v.id); this.car = null; this.state = 'walk'; this._tries = 0; } return I; }
    this._boardT = (this._boardT || 0) + dt; if (this._boardT > 20 && !keep) { this._boardT = 0; this._giveUp(v.id); this.car = null; this.state = 'walk'; return I; }   // (no way to it: another, or on foot)
    // to a door: the nearest, or (no nearer for a while: another car in the way) the next one round
    const doors = v.model.doors; if (!doors.length) return this._walkTo(dt, p, v.x, v.y, 'car' + v.id);
    const at = k => { const d = doors[k % doors.length], c = Math.cos(v.heading), sn = Math.sin(v.heading); return [v.x + d.x * c - d.y * sn, v.y + d.x * sn + d.y * c]; };
    if (this._doorFor !== v) { this._doorFor = v; this._door = plan ? Math.max(0, doors.indexOf(plan.door)) : 0; this._doorBest = 1e9; this._doorT = 0; }
    const q = at(this._door), dq = Math.hypot(q[0] - p.x, q[1] - p.y);
    if (dq > 70) { this._doorBest = dq; this._doorT = 0; }   // (still on the way: the way may lead off before it comes back)
    else if (dq < this._doorBest - 2) { this._doorBest = dq; this._doorT = 0; } else if ((this._doorT += dt) > 1.8) { this._door++; this._doorBest = 1e9; this._doorT = 0; }
    return this._walkTo(dt, p, q[0], q[1], 'door' + v.id + ':' + (this._door % doors.length));
  }
  // another vehicle in reach with a door nearer than d (the one the scene would board)
  _nearer(p, v, d) { for (const o of this.fleet.near(p.x, p.y, 80)) { if (o === v || !inReach(p, o)) continue; const q = boardingFor(p, o, 0); if (q && q.dist < d) return true; } return false; }
  // ---- at the wheel
  // the route to the goal: along the lane it faces, after a U-turn, else from the nearest lane whichever way it runs;
  // the way round a jammed exit (avoid) when that costs not much more
  _plan(v, g) {
    // (never round by a dead end's stub, turning back in it, unless nothing else goes: the one at the Harbor's sea turns
    // back through the sea, and a bot had driven a job's Saint into it)
    const via = o => this.gps.routeTo(v.x, v.y, v.heading, g.x, g.y, o) || this.gps.routeTo(v.x, v.y, v.heading + Math.PI, g.x, g.y, o) || this.gps.routeTo(v.x, v.y, null, g.x, g.y, o);
    const plan = o => via({ ...o, noDeadEnds: true }) || via(o);
    const av = this.avoid, tz = g.z || 0, toHeading = g.heading, base = plan({ z: v.z, tz, toHeading });
    const alt = av && av.size ? plan({ z: v.z, tz, toHeading, avoid: L => av.has(L.id) }) : null;
    return alt && (!base || alt.cost <= base.cost * 1.6 + 10) ? alt : base;
  }
  _drive(dt, p, v, w) {
    const g = this.goal, level = g.z == null || Math.abs((v.z || 0) - g.z) < 24, d = Math.hypot(g.x - v.x, g.y - v.y) + (level ? 0 : 400); this._tries = 0; this._bfails = 0; this._boardT = 0;   // (a goal on a deck: not there from the road under it)
    if (v.driver !== p) { this.state = 'exit'; this.I.tap.interact = true; return this.I; }   // (a passenger seat: out)
    if (g.stay && d < Math.max(TUNE.autoArrive * 2, (g.radius || 0) * .6)) { this.state = 'arrived'; this._dropBrain(); const I = clearIntent(this.I); if (v.speed > 2 && this._fwd(v)) I.brake = 1; else if (v.speed > 2) I.throttle = 1; else I.down.handbrake = true; return I; }   // (there, seated: it stops)
    if (this.esc) return this._escape(dt, v);
    if (!this.brain || this.brain.v !== v) {
      this._dropBrain();
      const st = STYLES[g.style] || STYLES.player;
      this.brain = new DriverBrain(v, this.G, { junctions: this.J, personality: st, siren: !!st.assertive }); this.brainNew = true;
      // (round a jammed exit only when that way costs not much more: else it waits, as a U-turn at the map's edge in a
      // lorry is worse than the jam)
      // (no way there along the lane it faces, a one-way that leads off it: after a U-turn, else from the nearest lane
      // whichever way it runs; a car left with no route at all wanders the lanes, and that's how a short trip went round
      // the city)
      const r = this._plan(v, g); if (r) this.brain.setRoute(r.lanes, { lane: r.to.lane.id, s: r.to.s });
      this.state = 'drive'; this.offT = 0;
    }
    const b = this.brain;
    // off its route a moment (a turn missed, a pass round a wreck onto the next lane): a fresh route from where it is,
    // the brain kept (with the old route it wanders, and Communion's chrome Saint, past its turn, had gone round Glass
    // Heights' ring of one-way streets for good; waited longer, a Medic past its turn was up the Loop's ramp and stuck on
    // its deck). Not near the goal, nor to a goal to be faced a way: there the last lanes are the approach's to work out
    // (Holy Scrap's tow truck, re-routed as it went, came at its last wreck where it couldn't face it, and a Tow job's
    // owner got to its car first)
    const here = b.here; this.offT = here && here.k === 'lane' && b.route && b.goal && d > 300 && g.heading == null && !b.route.includes(here.id) ? (this.offT || 0) + dt : 0;
    if (this.offT > .6) { this.offT = 0; const r = this._plan(v, g); if (r) b.setRoute(r.lanes, { lane: r.to.lane.id, s: r.to.s }); }
    // stalled (a jam, a gridlocked box): a fresh route from here; three times, out (at street level). An exit jammed
    // past the brain's wait: a fresh route that keeps off that lane
    const jam = b.cause === 'exit' && v.speed < 3; this.exitHeld = jam ? (this.exitHeld || 0) + dt : Math.max(0, (this.exitHeld || 0) - dt * .5);
    if (jam && b.exitConn) this._jam = b.exitConn;
    if (this.exitHeld > 8 && this._jam) { this.exitHeld = 0; this._keepOff(this._jam); this._dropBrain(); return clearIntent(this.I); }
    if (this._stalled(dt, v, d)) {
      const P = this.prog; if (this._jam) this._keepOff(this._jam);
      { const cur = b.path[b.i], nx = b.path[b.i + 1], c = cur && cur.k === 'conn' ? this.G.conns[cur.id] : nx && nx.k === 'conn' ? this.G.conns[nx.id] : null; if (c) this._keepOff(c); }   // (the turn it can't make, a long truck at a corner's post: the next route another way)
      if (P.n >= 3 && v.z < 10) { P.n = 0; if (!g.hold) return this._bail(v); this.esc = { to: this._ahead(b, 180) || [g.x, g.y], t: 0, slow: 0, back: 0, side: -1 }; this._dropBrain(); return this._escape(dt, v); }   // (a job's own car: off the road round it again, the other way)
      if (P.n === 2 && v.z < 10) { this.esc = { to: this._ahead(b, 180) || [g.x, g.y], t: 0, slow: 0, back: 0, side: 1 }; this._dropBrain(); return this._escape(dt, v); }   // (the second time: off the road round it)
      this._dropBrain(); return clearIntent(this.I);
    }
    if (g.stay && b.lost && d > FINAL) {   // (off the road a long way out: back onto the nearest lane, then the route from there)
      const n = this.G.nearestLane(v.x, v.y, null, v.z || 0, 300), q = n && this.G.pointOn(n.lane, n.s);
      if (q) { this.esc = { to: [q[0], q[1]], t: 0, slow: 0, back: 0, side: 1 }; this._dropBrain(); return this._escape(dt, v); }
    }
    if (g.stay) { if (b.lost || b.arrived || (d < 70 && v.speed < 8)) return this._final(dt, v, g, d); }   // (the last stretch: off the road, straight at it)
    else if (b.lost || ((b.arrived || d < 70) && v.speed < 8) || (d < TUNE.autoArrive * 3 && v.speed < 20)) {   // there (or as near as the road goes): out, and on foot the rest
      if (v.speed > 6) { const I = clearIntent(this.I); I.brake = 1; return I; }
      this.state = 'exit'; this._dropBrain(); const I = clearIntent(this.I); I.tap.interact = true; I.down.interact = true; return I;
    }
    // boxed in (a dead or abandoned car in the lane, no pass the brain can plan; a ped standing in the road): backed off, then round it on one side,
    // then the other; three times boxed in, out on foot (another car, or the rest of the way walking), at street level
    // only, as a stall's (out on a deck, a walk has no way down)
    if (this.round) return this._round(dt, v);
    // at a star or more, standing still with a cop on foot coming for the door (NABBED there in a moment): off at once,
    // as a player floors it: round whatever holds it, away from the cop (backing first only when the cop is ahead)
    const cop = w.wanted && w.wanted.stars > 0 && v.speed < 6 ? this._copComing(v, w.police) : null;
    if (cop) {
      const c = Math.cos(v.heading), s = Math.sin(v.heading), dx = cop.x - v.x, dy = cop.y - v.y;
      this.round = { t: dx * c + dy * s > 0 ? 0 : 1.1, side: c * dy - s * dx > 0 ? -1 : 1 }; return this._round(dt, v);
    }
    if (this._wedged(dt, v, b)) { this.esc = { to: this._ahead(b, 180) || [g.x, g.y], t: 0, slow: 0, back: 0, side: this.wedge.n % 2 ? 1 : -1 }; this._dropBrain(); return this._escape(dt, v); }   // (off the road round it, as the second try does)
    // (a leader waiting at a light, in a queue: traffic, not a box; a job's car too, by its driver's brain: a race's rival
    // stopped at a red, taken for a box, was swung round and the fresh route from the swerve went round the block)
    // (a brain made this step has seen nothing yet: the last one's cause stands for it, so a body standing in the lane
    // still holds the box's clock. A chase's goal moves every few seconds, each move a new brain, and the clock had
    // started again each time: IM2's Brute stood behind a hostile Volt Boy in the lane, the Bucket gone, to the job's end.
    // A queue's leader it hasn't seen yet: that clock starts again, as it did)
    const fresh = this.brainNew; this.brainNew = false; const cause = fresh ? this.lastCause : b.cause; this.lastCause = cause;
    const L = b.leader, LB = L && L.v && (L.v.brain || L.v.drivenBy), waits = !!LB && !LB.parked && ['signal', 'queue', 'yield'].includes(LB.cause), held = (L && L.gap < 14 && L.speed < 2 && !waits) || cause === 'ped';
    this.boxT = held && v.speed < 3 && !b.pass && cause !== 'signal' && cause !== 'arrived' ? (this.boxT || 0) + dt : 0;
    // (a car nobody drives in the way: pushed on, as the brain's gridlock shove does, sooner, every other time it boxes
    // us in (a round the times between); a car on the hook never rounds, backing folds the rig and a slant can't take
    // the two past: it pushes, and waits out anything else (a long jam is a stall's). Each round had dropped the brain
    // before its shove came: a tow stood at a turf war's wreck, rocking, to the clock's end, and a Medic behind an
    // ambulance its crew had left in the lane rocked there through four retries)
    const dead = !!L && !!L.v && !L.v.brain && !L.v.driver && L.v.owner !== 'mission';
    if (this.boxT > 5 && (v.towing || (dead && this.shoveNext))) { this.boxT = 0; this.shoveNext = false; if (dead) b.blocked = Math.max(b.blocked, TUNE.gridlock * 4 + .01); }
    if (this.boxT > (cause === 'ped' ? 8 : 5)) { this.boxT = 0; this.shoveNext = dead; this.boxed = (this.boxed || 0) + 1; if (this.boxed > 3 && !g.hold && (v.z || 0) < 10) { this.boxed = 0; return this._bail(v); } this.round = { t: 0, side: this.boxed % 2 ? 1 : -1 }; return this._round(dt, v); }
    const Bs = this.fleet && this.fleet.bridges, closed = Bs && Bs.length ? id => Bs.some(q => q.id === id && q.closed) : null;   // (a drawbridge's gates shut: stopped short as traffic is; unwatched, a job's truck had met a rising leaf at full tilt and flown past its turn)
    // (the player's enemies in the road aren't waited for: Volt Boys going for the player had stood round IM2's Brute in
    // their turf, and it waited on them to the job's end, rounding and rounding)
    const pedsNear = w.pedsNear ? (x, y, r) => w.pedsNear(x, y, r).filter(q => !q.hostile) : null;
    const I = b.update(dt, { fleet: this.fleet, t: w.t || this.t, pedsNear, wet: w.wet || 0, sirens: null, closed });
    return I;
  }
  // out of a jam the player's way: off the road (a sidewalk, a plaza, the wrong side) toward a point farther along the
  // route, backing off whatever it runs into, for a few seconds; then the route again from there
  _escape(dt, v) {
    const X = this.esc, I = clearIntent(this.I); X.t += dt; this.state = 'escape';
    // (a truck with a car on its hook backs only a moment, pinned: reversing folds the rig; it pulls on along its own
    // heading, the car swinging in behind it, then the route again: jackknifed at a corner it had sawn back and forth to
    // the job's end, and never backing at all, its nose on a kerb's bench, it had pushed at it for minutes)
    if (v.towing && !X.tow) {   // (to the lane ahead of it, the road's middle: straight on, its corner had met the kerb's lamp)
      const a = [v.x + Math.cos(v.heading) * 120, v.y + Math.sin(v.heading) * 120], n = this.G.nearestLane(a[0], a[1], v.heading, v.z || 0, 120), q = n && this.G.pointOn(n.lane, n.s); X.tow = true; X.to = q ? [q[0], q[1]] : a; X.t = Math.min(X.t, 3); X.back = 0; X.slow = 0;
    }
    if (X.back > 0) { X.back -= dt; if (this._footIn(v, -1)) { X.back = 0; return this._hold(v, I); } I.brake = .8; I.steer = -X.side; return I; }   // (backing: the nose swings toward it; never into someone behind)
    const d = Math.hypot(X.to[0] - v.x, X.to[1] - v.y);
    if (X.t > 9 || d < 40) { this.esc = null; this._dropBrain(); return I; }
    if (this._footIn(v, 1)) return this._hold(v, I);   // (someone ahead: held till they are by)
    let da = Math.atan2(X.to[1] - v.y, X.to[0] - v.x) - v.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    X.slow = v.speed < 3 ? X.slow + dt : 0;
    if (X.slow > 1.2) { X.slow = 0; X.back = v.towing ? .7 : 1 + Math.max(0, v.hl - 30) / 20; X.side = da > 0 ? 1 : -1; return I; }   // (a long truck backs farther: a second's reverse turned it a hair, and it sawed at a kerb for minutes)
    I.steer = Math.max(-1, Math.min(1, da * 2)); if (v.speed < 35) I.throttle = .6; return I;
  }
  // no nearer the goal (d) and no farther on for 15 s: a stall (true once, then the clock starts again), counted in
  // prog.n; the count starts again once the last stall is left 300 behind (a jam up on a deck and another across town
  // are not one jam: the third would have put it out of a race's car the moment it was down the ramp)
  _stalled(dt, v, d) {
    const P = this.prog || (this.prog = { best: d, t: 0, n: 0, at: [v.x, v.y], jam: null });
    if (d < P.best - 30 || Math.hypot(v.x - P.at[0], v.y - P.at[1]) > 80) {
      P.best = Math.min(P.best, d); P.at = [v.x, v.y]; P.t = 0;
      if (P.n && P.jam && Math.hypot(v.x - P.jam[0], v.y - P.jam[1]) > 300) P.n = 0;
      return false;
    }
    if ((P.t += dt) <= 15) return false;
    P.t = 0; P.best = d; P.n++; P.jam = [v.x, v.y]; return true;
  }
  // the point dist farther along brain b's path (null: none)
  _ahead(b, dist) {
    if (!b || !b.path || !b.path.length) return null;
    let left = dist + (b.s || 0);
    for (let k = b.i; k < b.path.length; k++) {
      const e = b.path[k];
      if (e.k === 'lane') { const L = this.G.lanes[e.id], s0 = e.s0 || 0; if (left <= e.len) { const q = this.G.pointOn(L, s0 + left); return [q[0], q[1]]; } }
      left -= e.len;
    }
    const e = b.path[b.path.length - 1]; if (e.k !== 'lane') return null; const L = this.G.lanes[e.id], q = this.G.pointOn(L, L.len); return [q[0], q[1]];
  }
  // a jammed exit kept off: the lane past it out of the routes for this goal
  _keepOff(c) { (this.avoid || (this.avoid = new Set())).add(c.to); this._jam = null; }
  // stuck for good (a gridlock, boxed in again and again): out, and that vehicle not taken again for this goal
  _bail(v) { this._giveUp(v.id); this.car = null; this.esc = null; this.state = 'exit'; this._dropBrain(); const I = clearIntent(this.I); I.tap.interact = true; I.down.interact = true; return I; }
  // round something in the way: back off a second, then on at a slant to one side, then the route again
  _round(dt, v) {
    const R = this.round, I = clearIntent(this.I); R.t += dt;
    if (R.t < 1.1) { if (this._footIn(v, -1)) { R.t = 1.1; return this._hold(v, I); } I.brake = .8; I.steer = -R.side * .6; return I; }   // (backing: the nose swings out; never into someone behind)
    if (R.t < 2.6) {
      if (this._footIn(v, 1)) { R.t -= dt; R.wait = (R.wait || 0) + dt; if (R.wait > 6) { this.round = null; this._dropBrain(); } return this._hold(v, I); }   // (someone in the way: held, a while)
      I.throttle = .55; I.steer = R.side * .5; return I;
    }
    this.round = null; this._dropBrain(); return I;   // (a fresh route from here)
  }
  // wedged (true once, then the clock starts again): no light, no queue, nobody close ahead, and no more than a rock back
  // and forth for 5 s, at street level: pressed into a corner or a post with no room behind for the brain's own back-off
  _wedged(dt, v, b) {
    const W = this.wedge || (this.wedge = { t: 0, at: [v.x, v.y], n: 0 });
    if (b.cause || (b.leader && b.leader.gap < 30) || Math.hypot(v.x - W.at[0], v.y - W.at[1]) > 10) { W.t = 0; W.at = [v.x, v.y]; return false; }
    if ((W.t += dt) <= 5 || (v.z || 0) >= 10) return false;
    W.t = 0; W.n++; return true;
  }
  // someone on foot where the car is about to go (dir 1 ahead, -1 behind), within its length and a stride and across
  // its width and a stride: the unstick moves look before they back off or swing out (a cop by a cruiser parked at a
  // scene stands in the lane beside it). Wanted, a cop on foot is no one to wait for (they come for the door: a player
  // held still for them is NABBED), and with one closing on the car nobody is: off at once, as a player floors it
  _footIn(v, dir) {
    const w = this._w; if (!w || !w.pedsNear) return false;
    const chased = !!(w.wanted && w.wanted.stars > 0); if (chased && this._copAt(v, w.police, 45)) return false;
    const c = Math.cos(v.heading) * dir, s = Math.sin(v.heading) * dir, reach = v.hl + 30;
    for (const p of w.pedsNear(v.x + c * reach / 2, v.y + s * reach / 2, reach)) {
      if (p.dead || p.floored || p.seat || Math.abs((p.z || 0) - (v.z || 0)) > 14 || (chased && p.faction === 'police')) continue;
      const dx = p.x - v.x, dy = p.y - v.y, along = dx * c + dy * s, off = Math.abs(dy * c - dx * s);
      if (along > 0 && along < reach && off < v.hw + 10) return true;
    }
    return false;
  }
  // a cop on foot within r of the car, on its level (police: the Police, its cops), or null
  _copAt(v, police, r = 80) {
    for (const c of (police && police.cops) || []) { const q = c.ped; if (!q.dead && !q.seat && !q.floored && Math.hypot(q.x - v.x, q.y - v.y) < r && Math.abs((q.z || 0) - (v.z || 0)) < 14) return q; }
    return null;
  }
  // a cop on foot coming for the car's door: within 80, and already close or closing on it. One who holds off at range
  // (shooting, from two stars) is no reason to back off and swing out: it was done again and again, the car never off
  _copComing(v, police) {
    for (const c of (police && police.cops) || []) {
      const q = c.ped; if (q.dead || q.seat || q.floored || Math.abs((q.z || 0) - (v.z || 0)) >= 14) continue;
      const dx = v.x - q.x, dy = v.y - q.y, d = Math.hypot(dx, dy); if (d >= 80) continue;
      const m = q.mover, closing = m && d > 0 ? (m.vx * dx + m.vy * dy) / d : 0;
      if (d < 30 || closing > 10) return q;
    }
    return null;
  }
  // stopped where it is: braked against the way it rolls (the brake backs it up from a standstill, the throttle drives
  // it on), the handbrake once still
  _hold(v, I) { if (v.speed > 3) { if (this._fwd(v)) I.brake = 1; else I.throttle = 1; } else I.down.handbrake = true; return I; }
  // straight at the goal at a crawl (a yard, a plaza, the rest of the way past the road's end); reversing when it lies
  // behind and close. Held still for 1.5 s (a long truck's tail swung into a deck's pillar as it turned off the lane):
  // backed off and on round it, as the way out of a jam goes (it had sat there till the stall's 15 s, then gone round
  // the block to the same pillar, five times)
  _final(dt, v, g, d) {
    const I = clearIntent(this.I); this.state = 'final';
    let da = Math.atan2(g.y - v.y, g.x - v.x) - v.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > 2.1 && d < 60) { I.steer = da > 0 ? -1 : 1; I.brake = v.speed > 4 && this._fwd(v) ? 1 : .7; this.finSlow = 0; return I; }
    this.finSlow = v.speed < 3 ? (this.finSlow || 0) + dt : 0;
    if (this.finSlow > 1.5) { this.finSlow = 0; this.esc = { to: [g.x, g.y], t: 0, slow: 0, back: 1, side: da > 0 ? 1 : -1 }; this._dropBrain(); return this._escape(dt, v); }
    const want = Math.min(FINAL * .6, 25 + d * .5);
    I.steer = Math.max(-1, Math.min(1, da * 2));
    if (v.speed < want) I.throttle = .7; else if (v.speed > want + 25) I.brake = .6;
    return I;
  }
  // ---- on the water (a boat, EXPANSION.md X6): a course over the water's cells to the one nearest the goal (a pier's
  // end, a mooring, a point out at sea), kept off the shore where it can be (a cell beside land costs more), sailed at
  // the farthest of its corners in plain water ahead, at a speed it can turn at, slowing as it comes in. There it holds
  // (stay: stopped, seated) or steps off (not stay: onto what it came in against). Stuck against a pier or the shore:
  // astern a moment, the helm the other way, then on
  _boat(dt, p, v, g) {
    const I = clearIntent(this.I), C = this.city, T = C.T, W = this.fleet.world, b = v.body; this.state = 'sail'; this._dropBrain();
    const sea = (cx, cy) => cx >= 0 && cy >= 0 && cx < C.w && cy < C.h && !!W.water(cx, cy), sx = Math.floor(v.x / T), sy = Math.floor(v.y / T);
    // (what lies moored, stopped on the water, the cells under it, looked for every few seconds: sailed round as the
    // shore is; the Regatta had pushed at the Gull's tail along the Club's pier for good, and burned)
    if (!this.moored || this.t - this.moored.t > 5) {
      const set = new Set();
      for (const q of this.fleet.vehicles) {
        if (q === v || q.wrecked || q.speed > 5 || !sea(Math.floor(q.x / T), Math.floor(q.y / T))) continue;
        for (let u = -q.hl; u <= q.hl + .1; u += Math.max(4, q.hl / 3)) for (let s = -q.hw; s <= q.hw + .1; s += Math.max(4, q.hw)) { const [x, y] = q.toWorld(u, s); set.add(Math.floor(y / T) * C.w + Math.floor(x / T)); }
      }
      this.moored = { t: this.t, set };
    }
    const M = this.moored.set, wet = (cx, cy) => sea(cx, cy) && (!M.has(cy * C.w + cx) || (cx === sx && cy === sy));
    const near = Math.max(TUNE.autoArrive * 2, g.radius || 0), d = Math.hypot(g.x - v.x, g.y - v.y);
    if (d < near) { if (g.foot || !g.stay) return v.speed > 6 ? (I.brake = 1, I) : this._exit(v); this.state = 'arrived'; if (v.speed > 3) I.brake = 1; return I; }
    // the course: planned again for a goal that moved a cell, and every few seconds (what drifted in the way)
    const gc = [Math.floor(g.x / T), Math.floor(g.y / T)], key = gc[0] + ',' + gc[1];
    if (!this.sea || this.sea.key !== key || this.t - this.sea.t > 5) this.sea = { key, t: this.t, path: seaPath(Math.floor(v.x / T), Math.floor(v.y / T), gc, wet, C.w, C.h).map(([cx, cy]) => [(cx + .5) * T, (cy + .5) * T]), i: 0 };
    const S = this.sea, P = S.path;
    while (S.i < P.length - 1 && Math.hypot(P[S.i][0] - v.x, P[S.i][1] - v.y) < T * 1.5) S.i++;
    // (a goal ashore, a quay or a pier: there once at the water nearest it)
    const end = P.length ? P[P.length - 1] : null;
    if (end && !wet(gc[0], gc[1]) && S.i >= P.length - 1 && Math.hypot(end[0] - v.x, end[1] - v.y) < T * 1.6) { if (g.foot || !g.stay) return v.speed > 6 ? (I.brake = 1, I) : this._exit(v); this.state = 'arrived'; if (v.speed > 3) I.brake = 1; return I; }
    // (aimed at the farthest corner ahead it can sail to in a straight line over water, a few cells' clearance of its beam)
    const open = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L / 8); for (let k = 1; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; if (!wet(Math.floor(x / T), Math.floor(y / T))) return false; } return true; };
    let to = P.length ? P[Math.min(S.i, P.length - 1)] : [g.x, g.y];
    for (let k = Math.min(P.length - 1, S.i + 12); k > S.i; k--) if (open(v.x, v.y, P[k][0], P[k][1])) { to = P[k]; break; }
    if (S.i >= P.length - 1 && open(v.x, v.y, g.x, g.y)) to = [g.x, g.y];
    const ang = a => Math.atan2(Math.sin(a), Math.cos(a)), a = ang(Math.atan2(to[1] - v.y, to[0] - v.x) - v.heading);
    // (stuck against something: astern a moment with the helm reversed)
    const moved = this.lastSea ? Math.hypot(v.x - this.lastSea[0], v.y - this.lastSea[1]) : 1; this.lastSea = [v.x, v.y];
    this.seaStuck = moved < dt * 6 && !(this.astern > 0) ? (this.seaStuck || 0) + dt : 0;
    if (this.seaStuck > 1.5) { this.seaStuck = 0; this.astern = 1.4; }
    if (this.astern > 0) { this.astern -= dt; I.brake = 1; I.steer = -Math.sign(a || 1); return I; }
    // (a sharp turn with no room ahead, the shore or the world's edge a length or two off its bow: backed round, the helm
    // the other way, till it faces the course; it had driven on at the edge, no way on yet for its rudder to bite)
    const room = k => wet(Math.floor((v.x + Math.cos(v.heading) * k) / T), Math.floor((v.y + Math.sin(v.heading) * k) / T)), L = b.h.length;
    if (Math.abs(a) > .9 && !(room(L * .8) && room(L * 1.4))) {
      if ((this.backT || 0) < 3 && room(-L * .9)) { this.backT = (this.backT || 0) + dt; I.brake = v.speed > 30 && b.u > 0 ? .8 : 1; I.steer = -Math.sign(a); return I; }   // (water astern, three seconds at most: else round ahead under full helm)
    } else if (Math.abs(a) < .6) this.backT = 0;
    I.steer = Math.max(-1, Math.min(1, a * 2.2));
    const want = Math.min(b.h.top * (g.style === 'race' ? .95 : .8), Math.abs(a) > 1 ? 45 : Math.abs(a) > .5 ? 90 : 1e9, 30 + Math.max(0, d - near) * .8);   // (slow to turn, and slower as it comes in: a walking pace at the goal, stopped short of what lies past it)
    if (v.speed < want) I.throttle = 1; else if (v.speed > want + 20) I.brake = .6;
    return I;
  }
  // ---- in the air (a helicopter: no lanes): lifted off, up to a cruising height clear of what stands below, turned to
  // the goal and flown at it straight, slowed as it nears; there (within its radius, slow), held where it is (o.hover),
  // else let down to land, and out of it if the rest is on foot. Its height kept clear of the roofs: the body never
  // flies into them, but it brakes against a tower's side
  _fly(dt, p, v, g, d) {
    const I = clearIntent(this.I), b = v.body; this.state = 'fly'; this._dropBrain();
    const near = Math.max(TUNE.autoArrive * 2, (g.radius || 0) * .6), there = d < near;
    if (b.landed) {
      if (there || (g.foot && d < 200)) { if (g.foot || !g.stay) return this._exit(v); this.state = 'arrived'; return I; }
      I.down.handbrake = true; return I;   // (lift off)
    }
    let da = Math.atan2(g.y - v.y, g.x - v.x) - v.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    const u = b.u || 0, cruise = Math.max(110, (b.pad ? (b.pad(this.fleet.world, g.x, g.y) ?? 0) : 0) + 60);   // (a roof at the goal: over it)
    if (there && v.speed < 40) {   // there: held (hover), or down
      this.state = g.hover ? 'arrived' : 'land';
      if (u > 8) I.brake = 1; else if (u < -8) I.throttle = .4;
      if (!g.hover) I.down.nitro = true;
      return I;
    }
    // (what stands ahead taller than it flies, a tower on the way: up over it first, held where it is)
    const W = this.fleet.world, ah = b.pad ? b.pad(W, v.x + Math.cos(v.heading) * 90, v.y + Math.sin(v.heading) * 90) : null;
    if ((ah !== null && ah + 24 > v.z) || (this.flyUp && v.z < this.flyUp)) { I.down.handbrake = true; I.steer = Math.max(-1, Math.min(1, da * 2.5)); if (u > 10) I.brake = 1; return I; }
    this.flyUp = 0;
    if (v.z < cruise - 10) I.down.handbrake = true; else if (v.z > cruise + 40 && d > 300) I.down.nitro = true;
    I.steer = Math.max(-1, Math.min(1, da * 2.5));
    const want = Math.min(b.h.top, 20 + d * .9);
    if (Math.abs(da) > .9 || v.z < 60) { if (u > 20) I.brake = 1; return I; }   // (turned, or still climbing: hanging there)
    if (u < want) I.throttle = Math.min(1, (want - u) / 40 + .3); else if (u > want + 15) I.brake = 1;
    // (pushing on and going nowhere a second, against what the look ahead missed: up 48 before on again. A tower's
    // corner under a skid, the point 90 on clear beyond it, had held a SkyCam against its side till the story was lost)
    this.flyStall = I.throttle > .3 && v.speed < 6 ? (this.flyStall || 0) + dt : 0;
    if (this.flyStall > 1) { this.flyStall = 0; this.flyUp = v.z + 48; }
    return I;
  }
  // a plane (X2): off the ground along a clear run (turned at a taxi onto the longest clear one, toward the goal); in the
  // air at a cruising height clear of what stands below and ahead, banked toward the goal; over it, there (held circling
  // with stay). goal.land (the strip's heading, radians): down on the strip ending at the goal: a point 700 back along it
  // at 150, then the glide in (lined up, slow, a gentle sink) to touch down 300 short of the goal, down and stopped;
  // lined up wrong, too fast near the ground or not down 60 short of the goal, round again (a circuit: the approach
  // point once more), never a stall
  _plane(dt, p, v, g, d) {
    const I = clearIntent(this.I), b = v.body, h = b.h, W = this.fleet.world; this.state = 'fly'; this._dropBrain();
    const near = Math.max(TUNE.autoArrive * 2, g.radius || 0), ang = a => Math.atan2(Math.sin(a), Math.cos(a));
    const steerTo = (x, y, k = 2) => { const a = ang(Math.atan2(y - v.y, x - v.x) - v.heading); I.steer = Math.max(-1, Math.min(1, a * k)); return a; };
    const gnd = (x, y) => b.ground(W, x, y);
    if (b.landed) {
      d = Math.hypot(g.x - v.x, g.y - v.y);   // (on the ground, how far the plane is, not its cockpit: Blackout's Duster had stopped 2 short of the hangar's apron, arrived by its pilot's seat)
      if (g.air) { g.air = false; if (g.land !== null && g.land !== undefined) g.down = true; }   // (touched down)
      if (g.down) { I.brake = 1; if (v.speed < 4) { g.down = false; g.done = true; } return I; }   // (down: stopped)
      const up = g.z !== null && g.z !== undefined && (g.land === null || g.land === undefined) && g.z > (gnd(g.x, g.y) ?? 0) + 20;   // (a goal up in the air, a ring: never reached from the ground under it; Crop Duster's Duster, left on the runway under the first ring, had sat there arrived to the job's end)
      if (g.done || (!up && d < near && v.speed < 8)) { if (g.foot || !g.stay) return this._exit(v); this.state = 'arrived'; return I; }
      if (g.taxi) {   // (taxi: along the ground to it, never off it: a hangar's door off the strip's end, flown to and circled for good)
        const a = steerTo(g.x, g.y, 2.5); I.throttle = d >= near && v.speed < (Math.abs(a) > .6 ? 14 : 36) ? .5 : 0;
        // (a goal behind it: turned round the way there is room for its wings, held till it faces the goal; landed
        // west on the strip, Blackout's Duster had turned for the hangar toward the strip's edge and stood against the
        // wall there till the police shot it to a wreck)
        const room = s => { const hd = v.heading + s * Math.PI / 2; for (let r = 16; r <= 96; r += 8) { const q = gnd(v.x + Math.cos(hd) * r, v.y + Math.sin(hd) * r); if (q === null || q > 3) return r; } return 96; };
        if (Math.abs(a) > 1.2) { if (!g.turn) g.turn = room(1) >= room(-1) ? 1 : -1; I.steer = g.turn; } else g.turn = 0;
        if (v.speed > 44 || (d < near * 2 && v.speed > 16) || d < near) I.brake = 1; return I;   // (within reach: braked there, whichever way it faces; it had circled the Air Race's start for good, the line inside its turn)
      }
      // the run: the way it faces if clear for its roll, else the longest clear one of the compass's eight (and the
      // goal's way), the nearer the goal's the better
      const clear = (hd, len) => { for (let s2 = 24; s2 <= len; s2 += 16) { const x = v.x + Math.cos(hd) * s2, y = v.y + Math.sin(hd) * s2, gr = gnd(x, y); if (gr === null || gr > 3 || (h.water && W.water && !W.water(Math.floor(x / 16), Math.floor(y / 16)))) return s2; } return len; };
      const need = h.vr * h.vr / (2 * h.accel) * 1.6 + 40, toward = Math.atan2(g.y - v.y, g.x - v.x);
      if (g.run === undefined) {
        if (clear(v.heading, need) >= need) g.run = v.heading;
        else { let best = null; for (const hd of [toward, ...Array.from({ length: 8 }, (_, k) => k * Math.PI / 4)]) { const len = clear(hd, need); if (len < need) continue; const sc = -Math.abs(ang(hd - toward)); if (!best || sc > best.sc) best = { hd, sc }; } g.run = best ? best.hd : v.heading; }
      }
      const da = ang(g.run - v.heading);
      if (Math.abs(da) > .08) { I.throttle = v.speed < 18 ? .5 : 0; I.steer = Math.sign(da); if (v.speed > 25) I.brake = 1; return I; }   // (turned onto it at a taxi)
      I.throttle = 1; I.steer = Math.max(-1, Math.min(1, da * 3)); if (b.u >= h.vr) I.down.handbrake = true;
      return I;
    }
    g.air = true; g.run = undefined;
    const look = (s2, z) => { const gr = gnd(v.x + Math.cos(v.heading) * s2, v.y + Math.sin(v.heading) * s2); return gr !== null && gr + 30 > z; };
    const fly = (alt, thr = .85) => {   // (to alt: climbed or let down, kept clear of what stands ahead)
      if (look(120, v.z) || look(260, v.z) || v.z < alt - 8) I.down.handbrake = true; else if (v.z > alt + 15) I.down.nitro = true;
      I.throttle = b.stalled || b.u < h.stall * 1.3 ? 1 : thr;   // (slow: full power, never a stall)
    };
    const cruise = Math.max(h.cruiseZ || 200, (gnd(g.x, g.y) ?? 0) + 70);
    // a goal with a height (a ring, a race's gate: EXPANSION.md X4): flown through at it (kept 40 over what stands
    // there), never circled
    const at = g.z !== null && g.z !== undefined && (g.land === null || g.land === undefined) ? Math.max(g.z, (gnd(g.x, g.y) ?? 0) + 40) : null;
    if (at !== null) { if (d < near) this.state = 'arrived'; steerTo(g.x, g.y); fly(at, g.speed ? Math.max(.35, Math.min(1, g.speed / h.top)) : .85); if (g.speed && b.u > g.speed + 20 && !b.stalled) I.brake = .5; return I; }   // (speed: held at it, a Crop Duster's dusting pace: the turns tighter)
    if (g.land === null || g.land === undefined) {   // over the goal (stay: circling it)
      if (d < near) { this.state = 'arrived'; if (g.stay) I.steer = .6; else steerTo(g.x, g.y); } else steerTo(g.x, g.y);
      fly(cruise); return I;
    }
    // the landing: to the approach point, up to 700 back along the strip (less where the world's edge is nearer: water
    // runs along Glass Heights' edges, X6) at 150; then the glide in. The approach point itself is the one aimed at
    // (kept inside the edge by its distance, never moved off the line: moved, it was never reached lined up, and the
    // Gull circled the bay for good); the turn point out beyond it is kept a margin inside the edge
    const hd = g.land, cx = Math.cos(hd), cy = Math.sin(hd), along = (v.x - g.x) * cx + (v.y - g.y) * cy, cross = -(v.x - g.x) * cy + (v.y - g.y) * cx;
    const C = this.city, X = C.w * C.T, Y = C.h * C.T, inside = (q, m) => q[0] >= m && q[0] <= X - m && q[1] >= m && q[1] <= Y - m;
    if (!g.appr) { let L = 700; while (L > 440 && !inside([g.x - cx * L, g.y - cy * L], 40)) L -= 20; g.appr = L; }
    const L = g.appr, AZ = 150 * Math.min(1, (L - 300) / 400);
    if (g.leg !== 'final') {   // (near the approach point but not lined up: on out 600 farther back first, to come round onto the line: at 300, its own turning circle, Blackout's Duster had come back over the point still turning, and circled it till the police shot it down)
      const A = [g.x - cx * L, g.y - cy * L], dA = Math.hypot(v.x - A[0], v.y - A[1]), lined = Math.abs(ang(hd - v.heading)) < .5;
      if (dA < 160 && lined && Math.abs(cross) < 60) { g.leg = 'final'; return I; }
      if (dA < 200) g.wide = true; else if (dA > 500) g.wide = false;
      const keep = q => [Math.max(100, Math.min(X - 100, q[0])), Math.max(100, Math.min(Y - 100, q[1]))];   // (the turn point kept inside the world's edge)
      const B = g.wide ? keep([A[0] - cx * 600, A[1] - cy * 600]) : A; steerTo(B[0], B[1]); fly(dA > 450 && !g.wide ? cruise : 150, .6);   // (at the cruise's height till near it: at 150 the Gull had flown into a tower of Glass Heights' on the way)
      if (g.wide && Math.hypot(v.x - B[0], v.y - B[1]) < 120) g.wide = false;
      return I;
    }
    // final: lined up (the line's error steered out), on the glide (150 at the approach point, less on a shorter one,
    // down to the ground 300 short of the goal: the rest of the strip to stop in), slow and never stalled
    const ha = ang(hd - v.heading), ground = gnd(v.x, v.y) ?? 0, gz = ground + Math.max(0, Math.min(AZ, (-300 - along) / (L - 300) * AZ));
    I.steer = Math.max(-1, Math.min(1, ha * 2.2 - cross * .012));
    if (v.z > gz + 6) I.down.nitro = true; else if (v.z < gz - 6) I.down.handbrake = true;
    I.throttle = b.u > h.landSpeed * .8 ? 0 : b.u < h.stall * 1.3 ? .7 : .2; if (b.u > h.landSpeed * .9) I.brake = .6;
    if (b.stalled) { I.throttle = 1; I.down.nitro = false; }
    // round again: off the line, turned away, past the goal still flying, or coming in too fast near the ground
    if (Math.abs(cross) > 90 || Math.abs(ha) > .7 || along > -60 || (v.z - ground < 25 && b.u > h.landSpeed * .97)) { g.leg = null; g.rounds = (g.rounds || 0) + 1; }
    return I;
  }
  _fwd(v) { const b = v.body; return b ? b.vx * Math.cos(b.heading) + b.vy * Math.sin(b.heading) > 0 : true; }
  _dropBrain() { if (this.brain) this.brain.dispose(); this.brain = null; }
  dispose() { this._dropBrain(); }
}
