// The crowd (PLAN.md 8.10, 7.11): the people on a district's sidewalks round the focus.
//   - the spawner: a density along the sidewalks (peds per 100 u of sidewalk line), scaled by the neighbourhood (the
//     district fleet's `crowd` spec: { hoods: { id: factor } }), the hour and the weather. The crowd keeps a disc of
//     its own, smaller than the traffic's (TUNE.crowdIn..crowdOut: peds are slow, and only the ones near are seen, so
//     its people stand where they are seen): peds appear only in its ring, fading in, of an archetype the
//     neighbourhood and the hour allow, and leave beyond it; when the focus first arrives somewhere (the scene's start,
//     a teleport, a switch, the hospital) they fill the whole disc;
//   - LOD: a calm ped glides along its sidewalk line (no physics: PedBrain.glide), on half the steps near the focus
//     (the nearest TUNE.crowdNear inside fpFull: PLAN.md 7.11's 60 active peds) and a quarter of them far, each at
//     the steps it missed; one that reacts near a threat, was just hurt, is floored or burning, or stands off its line
//     runs on its feet (its physics, half the steps). Rigs are posed only when drawn (Ped.lazyRig);
//   - reactions: crimes, blasts and hits reach the peds near them (E.hears for noise, E.sees for sight): they flee,
//     cower, fight back or witness, and a witness phones it in (a `report`, unless stopped first);
//   - bodies lie for TUNE.bodyTime, then go (emergency.js's medics may get there first);
//   - troupes (the spec's troupes: [{ id, arch, n, gap, hoods, times }]: PLAN.md 8.10's Marching Mimes): n of an
//     archetype in single file behind a leader; hurt one and they all go for whoever did it; flatten every one with a
//     vehicle and the BUS hears 'encore' (they don't come back that day); patrols (patrols: [{ arch, n, near (a point of
//     interest), r }]: the foot cops round the precinct) walk their beat;
//   - pedsNear(x, y, r): the bodies on foot near a point (drivers yield to them; peds keep apart). spots: benches,
//     shop windows and curbs a ped may head for, one at a time.
// Deterministic: the 'peds' RNG stream; peds in a fixed order; the camera is never read.
//   const C = new Crowd({ city, walks, combat, fleet, footprint, spec });  C.update(dt, ctx);  C.pedsNear(x, y, r)
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { makeIntent } from '../sim/intent.js';
import { Ped } from '../actors/ped.js';
import { pedLook, pickPed, pedFits, traitsOf } from '../actors/peds.js';
import { get } from '../core/registry.js';
import { PedBrain } from './pedbrain.js';

knob('Crowd', 'crowdDensity', 'Crowd density', 2, 0, 6, .05, 'Peds per 100 u of sidewalk at full density (the neighbourhood, time and weather scale it)');
knob('Crowd', 'crowdIn', 'Crowd ring inner radius', 420, 200, 900, 10, 'No ped is put down nearer the focus than this (u); new ones fade in');
knob('Crowd', 'crowdOut', 'Crowd ring outer radius', 540, 220, 1000, 10, 'Peds are put down inside this and leave beyond it (u): the crowd lives in this disc');
knob('Crowd', 'crowdNight', 'Night crowd', .55, 0, 1.5, .05, 'Crowd density at night, against the day');
knob('Crowd', 'crowdRain', 'Rain crowd', .55, 0, 1.5, .05, 'Crowd density in rain or storm');
knob('Crowd', 'crowdMax', 'Crowd cap', 200, 0, 400, 5, 'The most crowd peds round the focus, near and far');
knob('Crowd', 'crowdNear', 'Physical peds', 60, 0, 120, 1, 'The most peds run on their physics at once (the rest glide along their lines)');
knob('Crowd', 'bodyTime', 'Bodies lie for', 60, 5, 300, 5, 'Seconds a dead ped lies where it fell');
knob('Crowd', 'hearShots', 'Shots heard within', 300, 50, 800, 10, 'How far gunfire carries (peds flee it)');
knob('Crowd', 'witnessRange', 'Sees a crime within', 260, 50, 600, 10, 'How far a ped can see a crime it might phone in');
knob('Crowd', 'witnessMax', 'Witnesses per crime', 3, 1, 10, 1, 'How many peds at most phone one crime in');
const SAMPLE = 24, SPAWN_EVERY = .25, CELL = 64, NEAR_IN = 20, HURT_KEEP = 4, FADE_IN = .8;
const VIOLENT = new Set(['shooting', 'explosion', 'murder', 'runOver']);
const NOAIM = { candidates: [], level: 'off' };

export class Crowd {
  /** o: { city, walks (Sidewalks), combat, fleet, footprint, spec (the fleets entry's crowd: { hoods }), rng, archetype
   *  (filter: which ped archetypes walk here; civilians by default) } */
  constructor(o) {
    this.city = o.city; this.S = o.walks; this.combat = o.combat || null; this.fleet = o.fleet || null; this.fp = o.footprint;
    this.spec = Object.assign({ hoods: {} }, o.spec || {}); this.rng = o.rng || RNG.stream('peds');
    this.kind = o.archetype || (s => s.kind === 'civilian');
    this.members = []; this.t = 0; this.step = 0; this._spawnT = 0; this._nearT = 0; this.spawned = 0; this.despawned = 0; this.filled = false; this.fills = 0; this._fx = 0; this._fy = 0;
    this.crimes = []; this.reports = 0; this.grid = new Map(); this._ids = 0; this.idle = makeIntent();
    // spawn points: every SAMPLE units along each sidewalk edge (not the crosswalks), with their neighbourhood's factor
    this.points = []; let len = 0;
    for (const e of this.S.edges) {
      if (e.kind !== 'walk') continue; len += e.len;
      const A = this.S.nodes[e.a], B = this.S.nodes[e.b], n = Math.max(1, Math.floor(e.len / SAMPLE));
      for (let k = 0; k < n; k++) {
        const u = (k + .5) / n, x = A.x + (B.x - A.x) * u, y = A.y + (B.y - A.y) * u, hood = this.city.hoodAtPoint(x, y);
        if (this.city.zonesAt(x, y).some(z => z.kind === 'noSpawn')) continue;
        const f = hood && this.spec.hoods[hood.id] !== undefined ? this.spec.hoods[hood.id] : 1;
        this.points.push({ e, d: u * e.len, x, y, hood: hood ? hood.id : '', f, w: e.len / n });
      }
    }
    this.sidewalk = len;
    this.spots = this._spots();
    this.troupes = (this.spec.troupes || []).map(t => ({ gap: 13, n: 6, hoods: [], times: ['day', 'night'], ...t, members: [], encored: false, nextT: 0, kills: new Map() }));
    this.patrols = (this.spec.patrols || []).map(q => ({ n: 2, r: 300, ...q, members: [] }));
    this._unsub = [
      BUS.on('kill', e => this._kill(e), 'world'),
      BUS.on('crime', e => this._crime(e), 'world'),
      BUS.on('hit', e => this._hit(e), 'world'),
      BUS.on('explode', e => this._blast(e), 'world'),
    ];
  }
  dispose() { for (const u of this._unsub) u(); for (const m of [...this.members]) this._drop(m); }
  get count() { return this.members.length; }
  /** how many peds the focus's surroundings want now (the sidewalk within the despawn ring, by neighbourhood) */
  target(ctx = {}) {
    const fp = this.fp, R = TUNE.crowdOut, R2 = R * R; let w = 0;
    for (const q of this.points) { const dx = q.x - fp.x, dy = q.y - fp.y; if (dx * dx + dy * dy <= R2) w += q.w * q.f; }
    return Math.min(TUNE.crowdMax, Math.round(w / 100 * TUNE.crowdDensity * (ctx.night ? TUNE.crowdNight : 1) * (ctx.wet > .5 ? TUNE.crowdRain : 1)));
  }
  /** one step. ctx: { t (the signals' clock), night, wet, player (the possessed Ped), others (bodies on foot the
   *  crowd does not own: the crew) } */
  update(dt, ctx = {}) {
    this.t += dt; this.step++; const fp = this.fp, t = ctx.t ?? this.t;
    // the first step, and a jump of the focus (a teleport, a switch, the hospital): the disc filled (nothing round it has
    // been seen yet); then spawns in the annulus, despawns beyond it
    const jump = this.filled && Math.hypot(fp.x - this._fx, fp.y - this._fy) > TUNE.crowdIn / 2; this._fx = fp.x; this._fy = fp.y;
    for (let i = this.members.length - 1; i >= 0; i--) {
      const m = this.members[i], p = m.ped;
      if (m.owner === 'world' && fp.d(p.x, p.y) > TUNE.crowdOut + 60 && !m.attended && !(m.brain.follow && fp.d(m.brain.follow.leader.ped.x, m.brain.follow.leader.ped.y) <= TUNE.crowdOut + 60)) { this._drop(m); continue; }
      if (p.dead && !m.deadT) { m.deadT = this.t; m.brain._die(); }   // (its call to the police dies with it)
      if (m.deadT && this.t - m.deadT > TUNE.bodyTime && !m.attended) this._drop(m);
    }
    if (!this.filled || jump) { this.filled = true; this.fills++; this._fill(ctx); }
    this._spawnT -= dt;
    if (this._spawnT <= 0) {
      this._spawnT = SPAWN_EVERY; const want = this.target(ctx); for (let k = 0; k < 3 && this.members.length < want; k++) if (!this._spawn(ctx, TUNE.crowdIn)) break;
      if ((this.step / 30 | 0) % 8 === 0) { for (const t of this.troupes) this._troupe(t, ctx, TUNE.crowdIn); for (const q of this.patrols) this._patrol(q, ctx, TUNE.crowdIn); }
    }
    // near and far: the nearest TUNE.crowdNear inside fpFull (with a little hysteresis) run on their physics
    this._nearT -= dt; if (this._nearT <= 0) { this._nearT = .25; this._sortNear(); }
    this._grid(ctx.others || []);
    const W = { t, dt, near: false, city: this.city, fleet: this.fleet, player: ctx.player || null, truce: ctx.truce || null, wet: ctx.wet || 0, closedAt: ctx.closedAt || null, crowdNear: (x, y, r) => this.pedsNear(x, y, r),   // (truce: the gangs a job has out of it, gangs.js's allies)
      spotFor: (k, x, y, b) => this._spotFor(k, x, y, b), partnerFor: b => this._partnerFor(b) };
    const PW = { map: this.city.map, city: this.city, combat: this.combat, fleet: this.fleet, aim: NOAIM };
    for (const m of this.members) {
      const p = m.ped, b = m.brain;
      if (m.deadT) { if (!m.still) { p.update(dt, this.idle, PW); if (this.t - m.deadT > 2) m.still = true; } continue; }   // (the fall plays, then the body lies)
      const forced = p.floored || p.held || p.burning > 0 || p.vitals.stun > 0 || this.t - m.hurtT < HURT_KEEP;
      p.coast = !m.near && !forced && !b.feet;
      if (forced || b.feet) {
        if (((this.step + m.k) & 1) === 0) { W.near = m.near; const I = b.update(dt * 2, W); p.update(dt * 2, I, PW); }
        m.feet = true;
      } else {
        if (m.feet) { m.feet = false; if (!b.rejoin()) continue; }   // (back from its feet: onto its line, or on its feet still)
        const every = m.near ? 2 : 4;
        if ((this.step + m.k) % every === 0) { W.near = m.near; b.glide(dt * every, W); }
      }
    }
  }
  // who runs on physics: the nearest inside fpFull (hysteresis either side), up to the cap; and any that must
  _sortNear() {
    const fp = this.fp, list = [];
    for (const m of this.members) {
      if (m.deadT) { m.near = false; continue; }
      const d = fp.d(m.ped.x, m.ped.y), keep = m.brain.state === 'fight' || this.t - m.hurtT < HURT_KEEP || m.ped.floored || m.ped.held;
      m.d = d; if (keep || d < TUNE.fpFull + (m.near ? NEAR_IN : -NEAR_IN)) list.push(m); else m.near = false;
    }
    list.sort((a, b) => a.d - b.d || a.k - b.k);
    list.forEach((m, i) => { m.near = i < TUNE.crowdNear || m.brain.state === 'fight' || m.ped.floored; });
  }
  // the scene starts: peds everywhere in the disc but right beside the focus
  _fill(ctx) {
    const want = this.target(ctx); for (let k = 0; k < want * 2 && this.members.length < want; k++) this._spawn(ctx, 60);
    for (const t of this.troupes) this._troupe(t, ctx, 60); for (const q of this.patrols) this._patrol(q, ctx, 60);
  }
  // a troupe: none about, its neighbourhood and hour, not yet flattened: in from the annulus, in single file
  _troupe(t, ctx, rIn) {
    t.members = t.members.filter(m => this.members.includes(m));
    if (t.members.length || t.encored || this.t < t.nextT) return;
    const arch = get('peds', t.arch); if (!arch || !t.times.includes(ctx.night ? 'night' : 'day')) return;
    const fp = this.fp, cand = this.points.filter(q => { const d = Math.hypot(q.x - fp.x, q.y - fp.y); return d >= rIn && d <= TUNE.crowdOut && q.e.len >= t.n * t.gap && (!t.hoods.length || t.hoods.includes(q.hood)); });
    if (!cand.length) return;
    // (the whole file in the annulus: the last of it can lie nearer the focus than its leader)
    const fileOut = (q, dir) => { for (let i = 0; i < t.n; i++) { const [x, y] = this.S.along(q.e, Math.max(0, Math.min(q.e.len, q.d - dir * i * t.gap)), 0); if (Math.hypot(x - fp.x, y - fp.y) < rIn) return false; } return true; };
    let q = null, dir = 1;
    for (let k = 0; k < 6 && !q; k++) { const c = cand[Math.floor(this.rng.next() * cand.length)], d0 = this.rng.next() < .5 ? 1 : -1; if (fileOut(c, d0)) { q = c; dir = d0; } else if (fileOut(c, -d0)) { q = c; dir = -d0; } }
    if (!q) return;
    const e = q.e, A = this.S.nodes[e.a], B = this.S.nodes[e.b];
    const ux = (B.x - A.x) / e.len * dir, uy = (B.y - A.y) / e.len * dir; let lead = null; t.kills = new Map();
    for (let i = 0; i < t.n; i++) {
      const d = q.d - dir * i * t.gap, [x, y] = this.S.along(e, Math.max(0, Math.min(e.len, d)), 0);
      const ped = new Ped({ x, y, faction: arch.faction || 'civilian', look: pedLook(arch, this.rng), lazyRig: true, health: arch.health || 60, facing: Math.atan2(uy, ux) });
      ped.archetype = arch.id; ped.crowd = true; ped.troupe = t.id;
      const brain = new PedBrain(ped, this.S, { rng: this.rng, traits: { ...traitsOf(arch), idles: [] } });
      brain.place(e, Math.max(0, Math.min(e.len, d)), 0, dir); brain.want = 0;
      if (!lead) { lead = brain; brain.trail = []; for (let k = t.n * t.gap; k >= 3; k -= 3) brain.trail.push([x - ux * k, y - uy * k]); }   // (the file already behind its leader)
      else brain.follow = { leader: lead, i, gap: t.gap };
      t.members.push(this._add(ped, brain, arch));
    }
  }
  // a patrol's beat round its point: its walkers kept up to strength while the point is near
  _patrol(q, ctx, rIn) {
    q.members = q.members.filter(m => this.members.includes(m) && !m.deadT);
    const poi = this.city.poi(q.near), arch = get('peds', q.arch); if (!poi || !arch || q.members.length >= q.n || this.fp.d(poi.x, poi.y) > TUNE.crowdOut + q.r) return;
    const fp = this.fp, cand = this.points.filter(p => Math.hypot(p.x - poi.x, p.y - poi.y) < q.r && (d => d >= rIn && d <= TUNE.crowdOut)(Math.hypot(p.x - fp.x, p.y - fp.y)));
    for (let k = q.members.length; k < q.n && cand.length; k++) {
      const p = cand[Math.floor(this.rng.next() * cand.length)], dir = this.rng.next() < .5 ? 1 : -1, [x, y] = this.S.along(p.e, p.d, 0);
      const ped = new Ped({ x, y, faction: arch.faction || 'civilian', look: pedLook(arch, this.rng), lazyRig: true, health: arch.health || 100, weapons: arch.weapons || ['fists'] });
      ped.archetype = arch.id; ped.crowd = true; ped.patrol = q.near;
      const brain = new PedBrain(ped, this.S, { rng: this.rng, traits: { ...traitsOf(arch), idles: ['chat'] } }); brain.place(p.e, p.d, 0, dir); brain.home = { x: poi.x, y: poi.y, r: q.r };
      q.members.push(this._add(ped, brain, arch));
    }
  }
  // a death: a troupe's flattened member is counted (all of them by vehicle: ENCORE!)
  _kill(e) {
    for (const t of this.troupes) {
      const m = t.members.find(q => q.ped.id === e.target); if (!m) continue;
      t.kills.set(m.ped.id, e.kind);
      if (t.kills.size === t.n && [...t.kills.values()].every(k => k === 'vehicle') && !t.encored) { t.encored = true; BUS.emit('encore', { troupe: t.id, by: e.by }); }
      if (t.members.every(q => q.ped.dead)) t.nextT = this.t + 120;
    }
  }
  // a ped somewhere on the sidewalks between rIn and the annulus's outer edge, where the neighbourhood allows one
  _spawn(ctx, rIn) {
    const fp = this.fp, outR = TUNE.crowdOut, cand = [];
    for (const q of this.points) { const d = Math.hypot(q.x - fp.x, q.y - fp.y); if (d >= rIn && d <= outR) cand.push(q); }
    if (!cand.length) return null;
    const fmax = Math.max(1, ...Object.values(this.spec.hoods));
    for (let tries = 0; tries < 4; tries++) {
      const q = cand[Math.floor(this.rng.next() * cand.length)];
      if (this.rng.next() > q.f / fmax) continue;
      if (this.pedsNear(q.x, q.y, 14).some(o => Math.hypot(o.x - q.x, o.y - q.y) < 12)) continue;
      const arch = pickPed(this.rng, s => this.kind(s) && pedFits(s, q.hood, !!ctx.night)) || pickPed(this.rng, this.kind); if (!arch) return null;
      const dir = this.rng.next() < .5 ? 1 : -1, lat = this.S.freeAt(q.e, q.d, (2 + this.rng.next() * 8) * dir); if (lat === null) continue;
      const [x, y] = this.S.along(q.e, q.d, lat), A = this.S.nodes[q.e.a], B = this.S.nodes[q.e.b];
      const ped = new Ped({ x, y, faction: arch.faction || 'civilian', look: pedLook(arch, this.rng), lazyRig: true, health: arch.health || 60, weapons: arch.weapons || ['fists'], facing: Math.atan2((B.y - A.y) * dir, (B.x - A.x) * dir) });
      ped.archetype = arch.id; ped.crowd = true;
      const brain = new PedBrain(ped, this.S, { rng: this.rng, traits: traitsOf(arch) }); brain.place(q.e, q.d, lat, dir);
      this._add(ped, brain, arch);
      return ped;
    }
    return null;
  }
  _add(ped, brain, arch, owner = 'world') {
    const m = { ped, brain, arch: arch ? arch.id : null, k: this._ids++, near: false, feet: false, d: 0, deadT: 0, still: false, hurtT: -99, attended: false, owner, bornT: this.t };
    this.members.push(m); this.spawned++; if (this.combat) this.combat.add(ped);
    return m;
  }
  _drop(m) {
    const i = this.members.indexOf(m); if (i >= 0) this.members.splice(i, 1);
    m.brain._die(); m.brain.gone = true; if (this.combat) this.combat.remove(m.ped); this.despawned++;
    for (const q of this.members) if (q.brain.follow && q.brain.follow.leader === m.brain) this._drop(q);   // (a troupe leaves with its leader)
  }
  /** a ped of someone else's taken on (a traffic driver out of its car): its brain starts from why ('angry': it goes for
   *  whoever wronged it; 'scared': it runs from the car; 'jacked': one or the other, by its toughness; 'dead': a body).
   *  o: { from (the car), by (the body to fight), arch } */
  adopt(ped, why, o = {}) {
    const old = this.members.find(m => m.ped === ped); if (old) return old;
    ped.lazyRig = true; ped.crowd = true;
    const traits = traitsOf(o.arch || null), brain = new PedBrain(ped, this.S, { rng: this.rng, traits }), m = this._add(ped, brain, o.arch || null);
    m.near = true; m.hurtT = this.t; m.adopted = why;
    const car = o.from, by = o.by && !o.by.dead ? o.by : null;
    const fight = why === 'angry' || (why === 'jacked' && this.rng.next() < (traits.tough ?? .15) * 1.6);
    if (why === 'calm') { m.hurtT = -99; m.near = false; brain.feet = !brain.rejoin(); return m; }
    if (ped.dead) m.deadT = this.t;
    else if (fight && by) brain.react('fight', { target: by, t: 15 });
    else if (car) brain.react('flee', { x: car.x, y: car.y, t: 5 + 3 * this.rng.next() });
    return m;
  }
  /** a group put down for someone else (a gang's hangout or patrol: gangs.js): n peds of the archetypes (ids, in turn)
   *  together on sidewalk points o.where(point) keeps, inside the crowd's ring (o.rIn: its inner edge, the default; 60
   *  as the disc fills), walking a beat round o.home ({ x, y, r }); o.tag(ped) marks each, o.idles are theirs. Returns
   *  the members put down (none when there is no room) */
  group(o) {
    const fp = this.fp, rIn = o.rIn ?? TUNE.crowdIn, cand = this.points.filter(q => { const d = Math.hypot(q.x - fp.x, q.y - fp.y); return d >= rIn && d <= TUNE.crowdOut && (!o.where || o.where(q)); });
    const out = []; if (!cand.length) return out;
    const q0 = cand[Math.floor(this.rng.next() * cand.length)], near = cand.filter(q => Math.hypot(q.x - q0.x, q.y - q0.y) < 50).sort((a, b) => Math.hypot(a.x - q0.x, a.y - q0.y) - Math.hypot(b.x - q0.x, b.y - q0.y));
    for (let i = 0; i < o.n; i++) {
      const q = near[i % near.length], arch = get('peds', o.arch[i % o.arch.length]); if (!arch) continue;
      const dir = this.rng.next() < .5 ? 1 : -1, lat = this.S.freeAt(q.e, q.d, (2 + (i % 3) * 4) * dir) ?? 0, [x, y] = this.S.along(q.e, q.d, lat), A = this.S.nodes[q.e.a], B = this.S.nodes[q.e.b];
      if (this.pedsNear(x, y, 10).some(p => Math.hypot(p.x - x, p.y - y) < 8)) continue;
      const ped = new Ped({ x, y, faction: arch.faction || 'civilian', look: pedLook(arch, this.rng), lazyRig: true, health: arch.health || 100, maxHealth: arch.health || 100, armor: arch.armor || 0, weapons: arch.weapons || ['fists'], facing: Math.atan2((B.y - A.y) * dir, (B.x - A.x) * dir) });
      ped.archetype = arch.id; ped.crowd = true; if (o.tag) o.tag(ped);
      const tr = traitsOf(arch), brain = new PedBrain(ped, this.S, { rng: this.rng, traits: { ...tr, idles: o.idles || tr.idles } }); brain.place(q.e, q.d, lat, dir); if (o.home) brain.home = o.home;
      out.push(this._add(ped, brain, arch));
    }
    return out;
  }
  /** a member let go to someone else (a patrol officer who joins the police's chase): out of the crowd, still in Combat.
   *  Returns true when it was one */
  release(m) {
    const i = this.members.indexOf(m); if (i < 0) return false;
    this.members.splice(i, 1); m.brain._cancelCall(); m.brain.gone = true; m.ped.coast = false; m.ped.gliding = false;
    for (const q of this.members) if (q.brain.follow && q.brain.follow.leader === m.brain) q.brain.follow = null;
    return true;
  }
  /** a dead ped brought back (the Medic's crew): on its feet again, calm, walking on */
  revive(m) {
    const p = m.ped; p.revive(p.x, p.y, p.z); p.vitals.health = Math.min(p.vitals.maxHealth, p.vitals.health); p.mover.play('getUp');
    m.deadT = 0; m.still = false; m.attended = false; m.hurtT = this.t; m.brain.state = 'walk'; m.brain.feet = true; m.brain.threat = null;
  }
  /** the bodies on foot near (x, y): the crowd's own and the others it was handed (for drivers and for keeping apart).
   *  Callers check the distance themselves */
  pedsNear(x, y, r) {
    const out = [], x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const a = this.grid.get(gx * 65536 + gy); if (a) for (const p of a) out.push(p); }
    return out;
  }
  _grid(others) {
    const G = this.grid, used = this._used || (this._used = []); for (const a of used) a.length = 0; used.length = 0;
    const put = p => { if (p.seat || p.removed) return; const k = Math.floor(p.x / CELL) * 65536 + Math.floor(p.y / CELL); let a = G.get(k); if (!a) G.set(k, a = []); if (!a.length) used.push(a); a.push(p); };
    for (const m of this.members) put(m.ped);
    for (const p of others) put(p);
  }
  // benches, shop windows and curbs: where an idle may take a ped (one ped a spot)
  _spots() {
    const C = this.city, out = [], T = C.T;
    for (const pr of C.props) {
      if (pr.kind !== 'bench' && pr.kind !== 'newsstand') continue;
      const x = pr.x, y = pr.y, n = this.S.nearestNode(x, y, 160); if (!n) continue;
      if (pr.kind === 'bench' && pr.facing !== undefined) {   // (sat on its front edge, the way it faces: the seat behind)
        const c = Math.cos(pr.facing), s = Math.sin(pr.facing); out.push({ kind: 'bench', x: x + c * 7, y: y + s * 7, face: { x: x + c * 60, y: y + s * 60 }, by: null }); continue;
      }
      // (in front of it, on the walking side: toward the nearest sidewalk node)
      const dx = n.x - x, dy = n.y - y, l = Math.hypot(dx, dy) || 1;
      out.push({ kind: pr.kind === 'bench' ? 'bench' : 'shop', x: x + dx / l * 12, y: y + dy / l * 12, face: { x, y }, by: null });
    }
    for (const q of C.pois) if (q.kind === 'shop') { const n = this.S.nearestNode(q.x, q.y, 120); if (n) out.push({ kind: 'shop', x: (n.x + q.x) / 2, y: (n.y + q.y) / 2, face: { x: q.x, y: q.y }, by: null }); }
    // curbs to hail a cab from: the avenues' sidewalk lines, every so often, on the road side
    for (const e of this.S.edges) {
      if (e.kind !== 'walk' || !e.road || e.road.kind !== 'avenue' || e.len < 48) continue;
      const A = this.S.nodes[e.a], B = this.S.nodes[e.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, r = e.road, ns = r.axis === 'y';
      const mid = (ns ? (r.band[0] + r.band[2] + 1) / 2 : (r.band[1] + r.band[3] + 1) / 2) * T, side = Math.sign(mid - (ns ? mx : my)) || 1;
      out.push({ kind: 'cab', x: ns ? mx + side * 10 : mx, y: ns ? my : my + side * 10, face: { x: ns ? mid : mx, y: ns ? my : mid }, by: null });
    }
    return out;
  }
  _spotFor(kind, x, y) {
    let best = null, bd = 150;
    for (const s of this.spots) if (s.kind === kind && !s.by) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  // a passer-by to chat to: a walking ped within a few steps, not busy
  _partnerFor(b) {
    const p = b.ped;
    for (const o of this.pedsNear(p.x, p.y, 40)) {
      if (o === p || !o.crowd || o.dead) continue; const m = this.members.find(q => q.ped === o);
      if (m && m.brain.state === 'walk' && !(m.brain.edge && m.brain.edge.kind === 'cross') && Math.hypot(o.x - p.x, o.y - p.y) < 36) return m.brain;   // (never one at a crossing's curb)
    }
    return null;
  }
  // a crime: the peds who hear it flee, those who see it may phone it in (not one only the police care about: speeding)
  _crime(e) {
    if (e.x === undefined) return;
    const spec = get('crimes', e.type); if (spec && spec.report === false) return;
    const now = this.t;
    let c = this.crimes.find(q => q.type === e.type && q.by === e.by && now - q.t < 3 && Math.hypot(q.x - e.x, q.y - e.y) < 80);
    if (!c) { c = { type: e.type, x: e.x, y: e.y, by: e.by, victim: e.victim, severity: e.severity || 1, t: now, witnesses: 0, reported: false, cancelled: 0 }; this.crimes.push(c); if (this.crimes.length > 40) this.crimes.shift(); }
    else c.t = now;
    const violent = VIOLENT.has(e.type), loud = e.type === 'explosion' ? TUNE.hearShots * 1.4 : e.type === 'shooting' ? TUNE.hearShots : 0, map = this.city.map;
    const R = Math.max(loud, TUNE.witnessRange), cand = [];
    for (const m of this.members) {
      const p = m.ped; if (p.dead || m.deadT || p.id === e.by || p.id === e.victim || p.seat || p.faction === 'police' || p.gang) continue;   // (an officer on its beat, a gang's member: they see to crimes themselves)
      const d = Math.hypot(p.x - e.x, p.y - e.y); if (d > R) continue;
      cand.push({ m, d });
    }
    cand.sort((a, b) => a.d - b.d || a.m.k - b.m.k);
    for (const { m, d } of cand) {
      const p = m.ped, b = m.brain;
      const seen = d <= TUNE.witnessRange && E.sees(p, { x: e.x, y: e.y, z: 0, r: 5 }, { range: TUNE.witnessRange, fov: 3.6, facing: p.facing, map }).seen;
      const heard = loud > 0 && E.hears(p, { x: e.x, y: e.y, z: 0, loud }, map) > 0;
      if (!seen && !heard) continue;
      if (seen && !e.lawful && c.witnesses < TUNE.witnessMax && !c.reported && this.rng.next() < (b.traits.phone ?? .5) && (!violent || d > 120 || b.traits.brave > .4)) {   // (the police's own shots: nobody phones them in)
        if (b.react('witness', { crime: c })) { c.witnesses++; continue; }
      }
      if (violent && b.state !== 'witness' && b.state !== 'phone' && (d < 120 || this.rng.next() > b.traits.brave)) b.react('flee', { x: e.x, y: e.y, t: TUNE.fleeTime * (d < 120 ? 1.3 : 1) });
    }
  }
  // a hit on one of ours: it fights back (the tough) or runs; a hit near makes the nervous run
  _hit(e) {
    const m = this.members.find(q => q.ped.id === e.target); if (!m || m.ped.gang) return;   // (a gang's member: gangs.js decides)
    m.hurtT = this.t; m.near = true; const p = m.ped;
    const by = this.combat ? this.combat.bodies.find(b => b.id === e.by) : null, b = m.brain;
    const t = p.troupe && this.troupes.find(q => q.id === p.troupe);
    if (t && by && by.troupe === t.id) return;   // (a fellow's stray punch in a brawl: never one another)
    if (t && by && !by.dead) { for (const q of t.members) if (!q.ped.dead) { q.brain.follow = null; q.brain.react('fight', { target: by, t: 25, force: true }); q.hurtT = this.t; q.near = true; } return; }   // (hurt one and they all come: on their feet at once)
    if (p.dead) return;
    if (by && !by.dead && e.kind === 'melee' && this.rng.next() < (b.traits.tough ?? .15) * 2) b.react('fight', { target: by, t: 12, force: true });
    else b.react('flee', { x: by ? by.x : e.x, y: by ? by.y : e.y, t: TUNE.fleeTime, force: true });
  }
  // a blast (a Molotov too: the crime is only the bigger ones): everyone near runs from it
  _blast(e) {
    if (e.x === undefined) return; const r = Math.max(120, (e.r || 40) * 3);
    for (const m of this.members) { const p = m.ped; if (p.dead || m.deadT || p.seat || p.gang) continue; if (Math.abs(p.x - e.x) < r && Math.abs(p.y - e.y) < r && Math.hypot(p.x - e.x, p.y - e.y) < r) m.brain.react('flee', { x: e.x, y: e.y, t: TUNE.fleeTime * 1.2 }); }
  }
  /** draw the crowd round the focus (reach: world units either way) */
  draw(stage, fx, fy, reach) {
    for (const m of this.members) {
      const p = m.ped; if (p.seat || Math.abs(p.x - fx) > reach || Math.abs(p.y - fy) > reach) continue;
      p.draw(stage, { crowd: true, key: p.rig, alpha: Math.min(1, (this.t - m.bornT) / FADE_IN) });   // (a new arrival fades in)
    }
  }
  /** for state hashes: the crowd's size and its spawn count (the bodies themselves are in Combat's hash), and every
   *  ped's place */
  hash() { let h = this.members.length * 31 + this.spawned; for (const m of this.members) h = (h * 31 + Math.round(m.ped.x * 4) * 7 + Math.round(m.ped.y * 4)) >>> 0; return [this.members.length, this.spawned, h]; }
  stats() {
    let near = 0, dead = 0; const states = {};
    for (const m of this.members) { if (m.near) near++; if (m.deadT) dead++; states[m.brain.state] = (states[m.brain.state] || 0) + 1; }
    return { peds: this.members.length, near, dead, spawned: this.spawned, despawned: this.despawned, states, sidewalk: Math.round(this.sidewalk) };
  }
}
