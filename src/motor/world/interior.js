// An interior's own simulation (PLAN.md 5.4, 8.21), while the player is inside it. The city stands still meanwhile (the
// scene stops stepping it, its state and its hash kept); the interior, built from def('interiors', id, ...) by the
// district builder (world/district.js buildInterior), steps its guards, its CCTV and its noise:
//   - guards walk their rounds (a FlowField over the interior's map), looking ahead with E.sees into an E.Suspicion
//     mind. They mind only what a bank minds: someone past the counter (the public stays in the lobby), a gun out, a
//     wanted face. Seen, they notice (turn and look), search (go where they saw you) and at last fight: the fighter
//     brain the police and the gangs use. A sprint close by, heard (E.hears: a wall halves it), turns them to look; a
//     shot sends them to where it came from, to look round there a while;
//   - CCTV: a camera high on a wall sweeps its cone either side of its facing; one that sees what a guard would mind
//     raises the alarm: every guard alerted where it saw you, and the wanted level up ('bankAlarm', heard by the police
//     at once: they are waiting outside);
//   - a takedown: from behind and close, a guard that isn't hunting you falls without a shot (the engine's 'takedown'
//     action; the scene asks takedownFor(player) when the player presses attack);
//   - the doors: standing on a door's cells (its mark), the scene leaves by it.
// Deterministic: its own RNG streams ('interior:<id>', and its combat's), so the city's rolls are left as they were;
// the view is never read.
//   const R = new InteriorRun({ id, game, isPlayer, crime });  R.enter(ped, 'front')  R.update(dt, { player, wanted })
//   R.takedownFor(player)  R.takedown(player, guard)  R.doorAt(player)  R.spotAt(player)  R.leave(ped)  R.lights(fn)  R.draw(stage)  R.hash()
//   A mission's hold on it (m.inside.run): R.loopCameras(on)  R.pass(on)  R.watch() (what it may read: a copy)
import { E } from '../engine.js';
import { BUS } from '../core/bus.js';
import { TUNE, knob } from '../core/tune.js';
import { RNG } from '../core/rng.js';
import { get } from '../core/registry.js';
import { clearIntent, makeIntent } from '../sim/intent.js';
import { Ped } from '../actors/ped.js';
import { pedLook } from '../actors/peds.js';
import { Fighter } from '../ai/fighter.js';
import { Combat } from '../combat/combat.js';
import { buildInterior } from './district.js';

knob('Stealth', 'guardSight', 'A guard sees', 150, 40, 320, 5, 'How far a guard sees inside its cone (u)');
knob('Stealth', 'guardFov', 'A guard\'s cone', 1.4, .4, 3, .05, 'How wide a guard looks (radians)');
knob('Stealth', 'shotHeard', 'A shot is heard', 280, 40, 600, 10, 'How far a gunshot carries indoors (u; through a wall, half as far)');
knob('Stealth', 'stepHeard', 'A sprint is heard', 60, 0, 200, 5, 'How far running feet carry indoors (u)');
const T = 16, WAIT = .9, TAKEDOWN_R = 20, LOOK = 2.5;   // (s a guard stands at each corner of its round; how close a takedown is; s it looks round where a shot was)
const NOAIM = { candidates: [], level: 'off' };
const MARK = { notice: ['?', '#ffe066'], search: ['?', '#ffa040'], alert: ['!', '#ff3a30'] };   // (over a guard's head: what it makes of you)

class Guard extends Fighter {
  /** ped: its Ped; o: { map, rng, route: [[x, y]...] (world) } */
  constructor(ped, o) {
    super(ped, { map: o.map, rng: o.rng, profile: { range: .4, burst: .6, pause: .8, aimOff: .1 } });
    this.route = o.route; this.at = 1 % o.route.length; this.wait = 0; this.flow = new E.FlowField(o.map);
    this.mind = new E.Suspicion({ rise: 1.8, decay: .25, forget: 8 }); this.down = false; this.probe = null;
  }
  /** a shot heard from (x, y): it goes there and looks round */
  heard(x, y) { this.probe = { x, y, look: LOOK, t: 0, there: false }; }
  // can it walk to (x, y) from where it stands (the flow field's distance there is finite)?
  _reachable(x, y) { const m = this.map, p = this.ped; this.flow.update(x, y); return this.flow.d[Math.floor(p.y / m.T) * m.w + Math.floor(p.x / m.T)] < 1e9; }
  /** one step: w { player, seen (E.sees, or 0 when there is nothing to mind), alarm } -> the Intent */
  update(dt, w) {
    const I = clearIntent(this.I), p = this.ped; if (p.dead || this.down || p.floored) return I;
    const st = this.mind.update(dt, w.seen, w.player);
    if (st === 'alert' && !w.player.dead) return this.attack(dt, I, w.player);
    if (st === 'search' && this.mind.last) return this._go(dt, I, this.mind.last.x, this.mind.last.y, true);
    if (this.probe) {   // (where a shot was: there at a run, then a look round; a place it can't get to, a look that way)
      const q = this.probe; q.t += dt;
      if (!q.there) { if (Math.hypot(q.x - p.x, q.y - p.y) > 12 && q.t < 12 && this._reachable(q.x, q.y)) return this._go(dt, I, q.x, q.y, true); q.there = true; p.mover.facing = Math.atan2(q.y - p.y, q.x - p.x); }
      q.look -= dt; p.mover.facing += dt * 1.6; if (q.look <= 0) this.probe = null;
      return I;
    }
    if (st === 'notice' && this.mind.last) { p.mover.facing = E.approachAng(p.mover.facing, Math.atan2(this.mind.last.y - p.y, this.mind.last.x - p.x), dt * 3); return I; }
    if (this.wait > 0) { this.wait -= dt; return I; }
    const q = this.route[this.at];
    if (Math.hypot(q[0] - p.x, q[1] - p.y) < 8) { this.at = (this.at + 1) % this.route.length; this.wait = WAIT; return I; }
    return this._go(dt, I, q[0], q[1], false);
  }
  // (on its way by the flow field over the interior's map: round the counter, through the doorways)
  _go(dt, I, tx, ty, run) {
    const p = this.ped; if (Math.hypot(tx - p.x, ty - p.y) < 5) return I;
    this.flow.update(tx, ty); const [dx, dy] = this.flow.dir(p.x, p.y, tx, ty), k = run ? 1 : .45;
    I.move[0] = dx * k; I.move[1] = dy * k; I.down.sprint = !!run;
    return I;
  }
}

export class InteriorRun {
  /** o: { id (an interiors entry), game (effects; null headless), isPlayer(id), crime(e) (the wanted system's: the
   *  alarm files 'bankAlarm') } */
  constructor(o) {
    this.id = o.id; this.spec = get('interiors', o.id); this.city = buildInterior(o.id); this.map = this.city.map;
    this.rng = RNG.stream('interior:' + o.id); this.isPlayer = o.isPlayer || (() => false); this.crime = o.crime || null;
    this.combat = new Combat({ game: o.game || null, city: this.city, rng: RNG.stream('interior:' + o.id + ':combat') });
    this.guards = this.spec.guards.map((g, i) => {
      const arch = get('peds', g.arch), [cx, cy] = g.route[0];
      const ped = new Ped({ x: (cx + .5) * T, y: (cy + .5) * T, faction: arch.faction || 'security', look: pedLook(arch, this.rng), lazyRig: true, health: arch.health || 100, maxHealth: arch.health || 100, weapons: arch.weapons || ['fists'] });
      ped.archetype = arch.id; ped.guard = i; this.combat.add(ped);
      return new Guard(ped, { map: this.map, rng: this.rng, route: g.route.map(([x, y]) => [(x + .5) * T, (y + .5) * T]) });
    });
    // the patrons (a club's dancers and drinkers): bodies posed where they stand, a mocap clip or a pose each, minding
    // nothing (the guards mind the player for the house)
    this.patrons = (this.spec.patrons || []).map(q => {
      const arch = get('peds', q.arch), [cx, cy] = q.at;
      const ped = new Ped({ x: (cx + .5) * T, y: (cy + .5) * T, faction: 'civilian', look: pedLook(arch, this.rng), lazyRig: true, health: 60, maxHealth: 60 });
      ped.archetype = arch.id; ped.mover.facing = q.facing ?? Math.PI / 2; if (q.clip) ped.clip = q.clip; if (q.pose) ped.posing = q.pose; this.combat.add(ped);
      return ped;
    });
    this._pI = makeIntent();
    this.looped = false; this.staff = false;
    this.cameras = this.spec.cameras.map(c => ({ x: (c.at[0] + .5) * T, y: (c.at[1] + .5) * T, z: c.z, base: c.facing, sweep: c.sweep, period: c.period, range: c.range, fov: c.fov, facing: c.facing, mind: new E.Suspicion({ rise: 2.4, decay: .4 }), sees: false }));
    this.alarm = null; this.t = 0; this.player = null; this.lastShot = 0; this.downs = 0;
    this.publics = this.spec.rooms.filter(r => r.public).map(r => r.rect);   // (where the public may be: a bank's lobby; a club's floor, stage and lounge)
    this.lobby = this.publics[0] || [0, 0, -1, -1];
    this._unsub = [BUS.on('crime', e => { if (e.type === 'shooting') this._noise(e.x, e.y, 0, TUNE.shotHeard, e.by); }, 'interior'), BUS.on('explode', e => this._noise(e.x, e.y, e.z || 0, TUNE.shotHeard * 1.5, e.by), 'interior')];
  }
  dispose() { for (const u of this._unsub) u(); this._unsub = []; }
  /** the player comes in by door id: placed on its cell inside, in the interior's combat; returns [x, y] */
  enter(ped, doorId) {
    const d = this.spec.doors.find(q => q.id === doorId) || this.spec.doors[0], x = (d.at[0] + .5) * T, y = (d.at[1] + .5) * T;
    ped.place(x, y, 0); ped.mover.facing = -Math.PI / 2; this.combat.add(ped); this.player = ped; this.door = d.id;
    return [x, y];
  }
  /** the player goes back out: out of the interior's combat */
  leave(ped) { this.combat.remove(ped); this.player = null; }
  /** the door whose cells the body stands on (or beside), or null: { id, from } */
  doorAt(ped) {
    const cx = Math.floor(ped.x / T), cy = Math.floor(ped.y / T);
    for (const d of this.spec.doors) for (const [mx, my] of this.city.marks[d.mark] || []) if (Math.abs(mx - cx) <= 1 && Math.abs(my - cy) <= 1) return d;
    return null;
  }
  /** the spot whose marked cell the body stands at (or beside): { id, mark, label }, or null (a club's arcade cabinet) */
  spotAt(ped) {
    const cx = Math.floor(ped.x / T), cy = Math.floor(ped.y / T);
    for (const s of this.spec.spots || []) for (const [mx, my] of this.city.marks[s.mark] || []) if (Math.abs(mx - cx) <= 1 && Math.abs(my - cy) <= 1) return s;
    return null;
  }
  /** a spot's cell's middle (world units), or null */
  spotCell(id) { const s = (this.spec.spots || []).find(q => q.id === id), m = s && this.city.marks[s.mark]; return m && m.length ? [(m[0][0] + .5) * T, (m[0][1] + .5) * T] : null; }
  /** what a guard or a camera minds about the player: past the counter (anywhere but the lobby and its doors), a gun
   *  out, or wanted */
  _minds(P, wanted) {
    const cx = Math.floor(P.x / T), cy = Math.floor(P.y / T), inLobby = this.publics.some(L => cx >= L[0] && cx <= L[2] && cy >= L[1] && cy <= L[3]);
    const spec = P.inv && P.inv.spec(P.inv.current), gun = spec && spec.projectile !== 'melee' && P.inv.current !== 'fists';
    return (!inLobby && !this.staff) || gun || P.aiming || wanted > 0 || !!this.alarm;
  }
  /** one step: ctx { player (the possessed Ped), wanted (its stars) } */
  update(dt, ctx = {}) {
    this.t += dt; const P = ctx.player || this.player, minds = P && !P.dead && this._minds(P, ctx.wanted || 0);
    // the cameras sweep, and look
    for (const c of this.cameras) {
      c.facing = c.base + c.sweep * Math.sin(this.t * Math.PI * 2 / c.period);
      const seen = minds && !this.looped ? E.sees({ x: c.x, y: c.y, z: 0, facing: c.facing }, P, { map: this.map, range: c.range, fov: c.fov, facing: c.facing, eye: c.z }) : 0;   // (looped: they show yesterday's tape)
      c.sees = !!(seen && seen.seen); c.mind.update(dt, seen, P);
      if (c.mind.state === 'alert' && !this.alarm) this.raise('camera', P);
    }
    // the guards: look, mind, act (one taken down lies where it fell: held by the takedown, then down for good)
    const W = { map: this.map, city: this.city, combat: this.combat, fleet: null, aim: NOAIM };
    for (const g of this.guards) {
      const p = g.ped;
      if (p.dead && !g.counted) { g.counted = true; if (!this.alarm) this.raise('body', P); }
      if (p.dead || g.down) { if (g.down && !p.held) p.vitals.down = Math.max(p.vitals.down, 1e6); g.sees = false; p.update(dt, clearIntent(g.I), W); continue; }
      const seen = minds && P ? E.sees({ x: p.x, y: p.y, z: p.z, facing: p.mover.facing }, P, { map: this.map, range: TUNE.guardSight, fov: TUNE.guardFov, facing: p.mover.facing }) : 0;
      g.sees = !!(seen && seen.seen);
      if (g.sees && g.mind.state === 'alert' && !this.alarm) this.raise('guard', P);
      p.update(dt, g.update(dt, { player: P || p, seen }), W);
    }
    for (const p of this.patrons) p.update(dt, clearIntent(this._pI), W);
    // a sprint close by is heard
    if (P && P.mover && P.mover.sprinting && Math.hypot(P.mover.vx, P.mover.vy) > 60) this._noise(P.x, P.y, P.z || 0, TUNE.stepHeard, P.id);
    this.combat.update(dt, { takers: [], take: () => false });
  }
  /** the CCTV on a loop (a crew's hacker, on: the cameras sweep and see nothing) or back (off) */
  loopCameras(on = true) { this.looped = !!on; }
  /** a staff pass (a bribed janitor's word, a borrowed uniform): on, nobody minds the player past the counter; a gun
   *  out, a wanted face or the alarm still do */
  pass(on = true) { this.staff = !!on; }
  /** what a mission may read of it (a copy: nothing written back): t (s since it was built), alarm (what raised it, or
   *  null), looped, staff; each guard's { at (the corner of its round it walks to), x, y, cx, cy (in cells), facing,
   *  down (taken down or dead), state (its mind), sees }; each camera's { phase (0..1 through its sweep), period,
   *  facing, state, sees } */
  watch() {
    return { t: this.t, alarm: this.alarm ? this.alarm.by : null, looped: this.looped, staff: this.staff,
      guards: this.guards.map(g => { const p = g.ped; return { at: g.at, x: p.x, y: p.y, cx: p.x / T, cy: p.y / T, facing: p.mover.facing, down: !!(g.down || p.dead), state: g.mind.state, sees: g.sees }; }),
      cameras: this.cameras.map(c => ({ phase: ((this.t / c.period) % 1 + 1) % 1, period: c.period, facing: c.facing, state: c.mind.state, sees: c.sees })) };
  }
  // a noise at (x, y, z) loud far: the guards who hear it go to look (a shot of their own colleagues' aside)
  _noise(x, y, z, loud, by) {
    if (!this.player || (by != null && !this.isPlayer(by))) return;
    const shot = loud >= TUNE.shotHeard;
    for (const g of this.guards) { const p = g.ped; if (p.dead || g.down) continue; const k = E.hears(p, { x, y, z, loud }, this.map); if (k > 0) { g.mind.hear(k + (shot ? .6 : 0), { x, y, z }); if (shot) g.heard(x, y); } }
  }
  /** the alarm: every guard alerted where the player is, and the police told (the wanted system's 'bankAlarm') */
  raise(by, P) {
    if (this.alarm) return; this.alarm = { by, t: this.t };
    for (const g of this.guards) { if (g.ped.dead || g.down) continue; g.mind.level = 1.2; g.mind.state = 'alert'; g.mind._hot = true; if (P) g.mind.last = { x: P.x, y: P.y, z: P.z || 0 }; }
    BUS.emit('alarm', { interior: this.id, by, x: P ? Math.round(P.x) : 0, y: P ? Math.round(P.y) : 0 });
    if (this.crime && P) this.crime({ type: 'bankAlarm', x: P.x, y: P.y, by: P.id, victim: null });
  }
  /** a guard the player could take down now (from behind and close, one that isn't hunting them), or null */
  takedownFor(P) {
    for (const g of this.guards) {
      const p = g.ped; if (p.dead || g.down || g.mind.state === 'alert' || p.mover.action) continue;
      const d = Math.hypot(p.x - P.x, p.y - P.y), behind = Math.abs(E.angDiff(p.mover.facing, Math.atan2(p.y - P.y, p.x - P.x))) < 1.1;
      if (d < TAKEDOWN_R && behind && Math.abs((p.z || 0) - (P.z || 0)) < 10) return g;
    }
    return null;
  }
  /** the player takes guard g down: the paired action plays on both bodies, and the guard is out of it */
  takedown(P, g) {
    g.ped.held = P.mover.play('takedown', { other: g.ped.mover, map: this.map }); g.down = true; g.mind.reset(); this.downs++;
    if (P.stats) P.stats.did('takedown'); if (P.ability) P.ability.feed('takedown');   // (PLAN.md 8.11: a stealth takedown, in character)
    BUS.emit('takedown', { interior: this.id, guard: g.ped.id, by: P.id });
    return true;
  }
  /** each light of the interior: fn(x, y, z, radius, color) (the scene hands them to stage.light every frame) */
  lights(fn) { for (const L of this.spec.lights || []) fn((L.at[0] + .5) * T, (L.at[1] + .5) * T, L.z ?? 40, L.radius || 80, L.color || null); }
  /** the guards with their cones on the floor and what they make of you over their heads, the CCTV with its cone and
   *  its eye (red while it sees you), through the stage (every view) */
  draw(stage) {
    const cones = [];
    for (const p of this.patrons) p.draw(stage);
    for (const g of this.guards) {
      const p = g.ped; p.draw(stage);
      if (p.dead || g.down) continue;
      cones.push([p.x, p.y, p.mover.facing, TUNE.guardFov, TUNE.guardSight, g.sees, g.mind.state]);
      const m = MARK[g.mind.state]; if (m) stage.glow(p.x, p.y, (p.z || 0) + 46, (q, sx, sy, k) => E.font.text(q, m[0], Math.round(sx), Math.round(sy - 6), m[1], { align: 'center', scale: k > 1.6 ? 2 : 1, outline: '#05030c' }), { always: true });
    }
    for (const c of this.cameras) cones.push([c.x, c.y, c.facing, c.fov, c.range, c.sees, c.mind.state]);
    stage.floor((q, P) => {
      for (const [x, y, facing, fov, range, sees, state] of cones) {   // (a pale wash; amber while it wonders, red while it sees you)
        const pts = [P.proj(x, y, 0)]; for (let k = 0; k <= 6; k++) { const r = this._reach(x, y, facing - fov / 2 + fov * k / 6, range); pts.push(P.proj(r[0], r[1], 0)); }
        if (pts.some(v => !v)) continue;
        const [rgb, a] = sees ? ['255,60,50', .3] : state !== 'calm' ? ['255,170,60', .24] : ['150,210,255', .16];
        q.beginPath(); q.moveTo(pts[0][0], pts[0][1]); for (const v of pts.slice(1)) q.lineTo(v[0], v[1]); q.closePath();
        q.fillStyle = `rgba(${rgb},${a})`; q.fill(); q.strokeStyle = `rgba(${rgb},${Math.min(1, a * 2.4).toFixed(2)})`; q.lineWidth = 1; q.stroke();
      }
    });
    for (const c of this.cameras) stage.shape(c.x, c.y, c.z, (q, P) => {
      const v = P.proj(c.x, c.y, c.z); if (!v) return; const k = v[2], dx = Math.cos(c.facing), dy = Math.sin(c.facing), e = P.proj(c.x + dx * 6, c.y + dy * 6, c.z);
      q.fillStyle = '#2a2a30'; q.fillRect(Math.round(v[0] - 3 * k), Math.round(v[1] - 2 * k), Math.max(2, Math.round(6 * k)), Math.max(2, Math.round(4 * k)));
      if (e) { q.fillStyle = c.sees ? '#ff3a30' : '#3aff6a'; q.fillRect(Math.round(e[0] - k), Math.round(e[1] - k), Math.max(1, Math.round(2 * k)), Math.max(1, Math.round(2 * k))); }
    });
  }
  // how far a ray from (x, y) at angle a reaches across the floor before a wall (range at most)
  _reach(x, y, a, range) {
    let d = 0; const dx = Math.cos(a), dy = Math.sin(a);
    while (d < range) { const nx = x + dx * (d + 8), ny = y + dy * (d + 8); if (this.map.cell(Math.floor(nx / T), Math.floor(ny / T)) > 0) break; d += 8; }
    return [x + dx * d, y + dy * d];
  }
  /** the interior's state: its alarm, its guards, its fights and where the player is in it */
  hash() {
    let h = this.alarm ? 7 : 0; for (const g of this.guards) h = (h * 31 + Math.round(g.ped.x * 4) * 7 + Math.round(g.ped.y * 4) + (g.down ? 3 : 0)) >>> 0;
    for (const p of this.patrons) h = (h * 31 + (p.dead ? 5 : 0) + Math.round(p.x * 4)) >>> 0;
    const P = this.player;
    return [h, this.combat.hash(), this.downs, P ? Math.round(P.x * 8) : 0, P ? Math.round(P.y * 8) : 0, P ? Math.round((P.z || 0) * 8) : 0];
  }
}
