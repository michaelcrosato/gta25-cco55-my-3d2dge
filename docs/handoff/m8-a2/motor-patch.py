# The H4 and Gnomes workers' MOTOR requests (each checked against the code; see motor-requests.md), applied in one go from the
# repository root: python3 docs/handoff/m8-a2/motor-patch.py. Dry run on part 2b's tree: it applies cleanly, and the lint,
# the boundary check and the missions, combat and mission-links sim suites pass with it (26 tests). Not yet run through
# the whole gate or the bot: run npm test and every merged mission after it. Each edit asserts its anchor once, so a
# stale one stops it loudly.
import re
def edit(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w').write(s)

# ---- mission/actors.js: deck z at spawn; drive with goal heights, a handbrake stop, a crew with no orders parked; riders ride
edit('src/motor/mission/actors.js', [
 ("""    const [x, y] = this._at(at), h = o.heading ?? (at && typeof at.heading === 'number' ? at.heading : 0), v = this.W.fleet.spawn(def, x, y, h, { owner: 'mission', color: o.color, locked: o.locked, mods: o.mods });""",
  """    const q = this._at(at), [x, y] = q, h = o.heading ?? (at && typeof at.heading === 'number' ? at.heading : 0), v = this.W.fleet.spawn(def, x, y, h, { owner: 'mission', color: o.color, locked: o.locked, mods: o.mods });
    const z = o.z ?? q[2]; if (v.body && typeof z === 'number') v.body.z = z;   // (a deck's point: up there, not on the street under it)"""),
 ("""    const v = e.a, D = e.drive; e.I = null; if (!D || v.wrecked || !v.driver || v.driver.dead || v.driver === P) return;   // (anyone but the player at its wheel: a mission's driver, a protagonist not played)""",
  """    const v = e.a, D = e.drive; e.I = null; if (v.wrecked || !v.driver || v.driver.dead || v.driver === P) return;   // (anyone but the player at its wheel: a mission's driver, a protagonist not played)
    if (!D) { const I = clearIntent(e.Ib || (e.Ib = makeIntent())); I.down.handbrake = true; e.I = I; return; }   // (a crew with no orders: parked, the handbrake on, not nudged along by traffic)"""),
 ("""    if (D.chase === 'player' && P) { const t = P.seat && P.seat.vehicle ? P.seat.vehicle : P; goal = [t.x, t.y]; }""",
  """    if (D.chase === 'player' && P) { const t = P.seat && P.seat.vehicle ? P.seat.vehicle : P; goal = [t.x, t.y, t.z || 0]; }"""),
 ("""      const I = clearIntent(e.Ib || (e.Ib = makeIntent())); I.brake = 1; e.I = I; return;   // (there: it stops)""",
  """      const I = clearIntent(e.Ib || (e.Ib = makeIntent())); if (v.speed > 2) I.brake = 1; else I.down.handbrake = true; e.I = I; return;   // (there: it stops; stopped, the handbrake: a brake held at a stop backs it up)"""),
 ("""      const r = roads.gps.routeTo(v.x, v.y, v.heading, goal[0], goal[1], { z: v.z }); if (r) e.brain.setRoute(r.lanes, { lane: r.to.lane.id, s: r.to.s }); else if (D.flee) D.dest = null;   // (no way there: somewhere else to run to)""",
  """      const r = roads.gps.routeTo(v.x, v.y, v.heading, goal[0], goal[1], { z: v.z, tz: goal[2] ?? (v.z > 10 ? v.z : 0) }); if (r) e.brain.setRoute(r.lanes, { lane: r.to.lane.id, s: r.to.s }); else if (D.flee) D.dest = null;   // (a goal up on a deck: routed up there; no way there: somewhere else to run to)"""),
 ("""      const p = e.a; if (p.seat || p === P) continue;""",
  """      const p = e.a; if (p === P) continue;
      if (p.seat) { if (!p.dead) p.ride(); continue; }   // (a rider in its seat, wherever the vehicle goes: hits and draws find it there)"""),
])

# ---- mission/runtime.js: deliver's tow in its hint; clear the heat before the cap lifts; adopt; kill's done; hour, blast,
# shoo, truce, countdown
edit('src/motor/mission/runtime.js', [
 ("""      start: m => { m.objective(text, { hint: { kind: 'deliver', what: o.what, to } }); m.marker(to, { color: '#7aff8a', r: Math.min(r, 28) }); } });""",
  """      start: m => { m.objective(text, { hint: { kind: 'deliver', what: o.what, to, tow: o.tow } }); m.marker(to, { color: '#7aff8a', r: Math.min(r, 28) }); } });"""),
 ("""      clear: () => { const w = wanted(); if (w) { w.floor(0); w.cap(5); w.clear('mission'); } },""",
  """      clear: () => { const w = wanted(); if (w) { w.clear('mission'); w.floor(0); w.cap(5); } },   // (the heat gone before the cap lifts: no star shows for a step)"""),
 ("""  kill(tag, o = {}) {
    const need = m => (o.count ? Math.min(o.count, m.tagged(tag).length) : m.tagged(tag).length);
    return op(m => (m.tagged(tag).filter(done).length >= need(m) ? { value: true } : undefined),
      { nav: m => { const P = m.mover; let b = null, bd = 1e9; for (const a of m.tagged(tag)) if (!done(a)) { const d = Math.hypot(a.x - P.x, a.y - P.y); if (d < bd) { bd = d; b = a; } } return b; },
        start: m => { m.objective(o.text || 'Take them out', { hint: { kind: 'kill', targets: tag } }); for (const a of m.tagged(tag)) if (alive(a) && o.mark !== false) m.marker(a, { color: '#ff5a4a', ring: false }); } });""",
  """  kill(tag, o = {}) {
    const need = m => (o.count ? Math.min(o.count, m.tagged(tag).length) : m.tagged(tag).length), isDone = o.done ? a => done(a) || !!o.done(a) : done;
    return op(m => (m.tagged(tag).filter(isDone).length >= need(m) ? { value: true } : undefined),
      { nav: m => { const P = m.mover; let b = null, bd = 1e9; for (const a of m.tagged(tag)) if (!isDone(a)) { const d = Math.hypot(a.x - P.x, a.y - P.y); if (d < bd) { bd = d; b = a; } } return b; },
        start: m => { m.objective(o.text || 'Take them out', { hint: { kind: 'kill', targets: tag, done: o.done || null } }); for (const a of m.tagged(tag)) if (alive(a) && o.mark !== false) m.marker(a, { color: '#ff5a4a', ring: false }); } });"""),
 ("""  /** a gang on the player's side while the job runs (null: none): the player's strays on its members and cars rally
   *  no one and cost no respect, and its members never go for the player on sight (lifted when the run ends) */
  ally(gang) { const G = this.W.life && this.W.life.gangs; if (!G) return; G.ally = gang || null; this.R.allyHeld = true; }""",
  """  /** a gang whose city members stay out of the job's fight (null: none): the player's strays on them and their cars
   *  rally no one and cost no respect, and none go for the player on sight; lifted when the run ends. ally: a job
   *  fought beside that gang (R3's Rats); truce: one fought against its own (G3's), the same thing */
  ally(gang) { const G = this.W.life && this.W.life.gangs; if (!G) return; G.ally = gang || null; this.R.allyHeld = true; }
  truce(gang) { this.ally(gang); }
  /** put a world vehicle on the job's list under a tag (a garaged car, one the player came in): the hints can name it;
   *  the world's again when the run ends, and a retry never releases it */
  adopt(v, tag) { if (!v) return null; const R = this.R; if (R.actors.entry(v)) return v; const was = v.owner; R.actors._add(v, 'vehicle', { tag, stage: -1 }); v.adopted = was || 'world'; return v; }
  /** the hour on the clock (0..24) */
  get hour() { return this.W.clock ? this.W.clock.hour : 12; }
  /** a blast at a point, nobody's (a drum the fire set off): o { damage (80), splash (56), z (6), fire (false: no
   *  blaze), source ('blast') } */
  blast(at, o = {}) {
    const C = this.W.combat, [x, y] = this.at(at); if (!C) return null;
    const b = C.explosives.blast({ x, y, z: o.z ?? 6, damage: o.damage ?? 80, splash: o.splash ?? 56, by: null, source: o.source || 'blast' }); if (o.fire === false) b.fire = false; return b;
  }
  /** a passer-by sent running from the player (and its troupe with it): a crowd ped, by itself or its id (true: sent) */
  shoo(ped) {
    const C = this.W.life && this.W.life.crowd, P = this.player, id = ped && typeof ped === 'object' ? ped.id : ped; if (!C || !P) return false;
    const q = C.members.find(c => c.ped.id === id); if (!q || q.ped.gang || q.ped.patrol || q.ped.dead) return false;
    for (const c of C.members) if (c === q || (q.ped.troupe && c.ped.troupe === q.ped.troupe)) c.brain.react('flee', { x: P.x, y: P.y, t: 8, force: true });
    return true;
  }
  /** the countdown on the HUD now ({ left, total, stop() }), or null */
  get countdown() { return this.R.timer || null; }"""),
])

# ---- mission/actors.js: an adopted vehicle goes back to the world at the end, never removed
edit('src/motor/mission/actors.js', [
 ("""      if (e.kind === 'vehicle') {
        const v = e.a; if (e.brain && e.brain.dispose) e.brain.dispose();""",
  """      if (e.kind === 'vehicle') {
        const v = e.a; if (e.brain && e.brain.dispose) e.brain.dispose();
        if (v.adopted) { v.owner = v.adopted; v.adopted = null; continue; }   // (the world's own, lent to the job: back to the world)"""),
])

# ---- ai/missionbot.js: a tow's heights; a dead guard's unease; presses for a spray of a weapon that isn't automatic; a car
# far off walked to before the bat; a car taken for a getaway given up when it can't be boarded; kill's done
edit('src/motor/ai/missionbot.js', [
 ("""    if (car.towedBy === truck) { this.tow = null; return this._go(dt, p, h.to[0], h.to[1], { stay: true, style: 'careful', radius: 50 }, w); }""",
  """    if (car.towedBy === truck) { this.tow = null; return this._go(dt, p, h.to[0], h.to[1], { stay: true, style: 'careful', radius: 50, z: h.to[2] }, w); }"""),
 ("""      else return this._go(dt, p, S[0], S[1], { stay: true, radius: 16, slack: 10 }, w);""",
  """      else return this._go(dt, p, S[0], S[1], { stay: true, radius: 16, slack: 10, z: car.z }, w);   // (on a deck: the staging point up there)"""),
 ("""    if (run && run.guards && run.guards.some(g => g.mind && g.mind.state !== 'calm' && g.mind.state !== 'down' && !g.down)) return I;""",
  """    if (run && run.guards && run.guards.some(g => g.mind && g.mind.state !== 'calm' && g.mind.state !== 'down' && !g.down && !g.ped.dead)) return I;   // (a dead guard's unease is stale)"""),
 ("""I.aimPoint = [sp[0], sp[1], 0]; I.down.fire = true; I.down.attack = true; I.down.aim = !p.seat;""",
  """I.aimPoint = [sp[0], sp[1], 0]; const ws = !p.seat && p.inv.spec(), auto = !ws || ws.rate >= 6; I.down.fire = true; I.down.attack = auto || (this.t * 4 | 0) % 2 === 0; I.tap.attack = !auto && I.down.attack; I.down.aim = !p.seat;"""),   # (held for a hose or an SMG; pressed each beat for a bottle, a bat, a pistol)
 ("""        const bd = boxDistance(t, p.x, p.y); if (bd > 10) return F._go(dt, I, t.x, t.y, true, 'car' + t.id);""",
  """        const bd = boxDistance(t, p.x, p.y);
        if (bd > 40) { F.path = null; return this._go(dt, p, t.x, t.y, { foot: true, stay: true, radius: 8 }, w); }   // (a way off: the AutoPlayer's walk; the fighter's path re-plans to one node a post can block)
        if (bd > 10) return F._go(dt, I, t.x, t.y, true, 'car' + t.id);"""),
 ("""  _car(dt, p, w) {
    if (!this.car || this.car.wrecked""",
  """  _car(dt, p, w) {
    if (this.car && this.car === this._carFor && (this._carT = (this._carT || 0) + dt) > 12 && !(p.seat && p.seat.vehicle === this.car)) { this.auto.tried.add(this.car.id); this.car = null; }   // (not in it in 12 s: another)
    if (this.car !== this._carFor) { this._carFor = this.car; this._carT = 0; }
    if (!this.car || this.car.wrecked"""),
 ("""    const v = p.seat && p.seat.vehicle, live = a => alive(a) && !(a.damage && a.damage.burning); let t = null, td = 1e9;""",
  """    const v = p.seat && p.seat.vehicle, live = a => alive(a) && !(a.damage && a.damage.burning) && !(h.done && h.done(a)); let t = null, td = 1e9;   // (h.done: when the job counts one: a car once it smokes)"""),
])

# ---- actors/fleet.js: a blast reaches the cars about its own height, not a deck's 64 u above
edit('src/motor/actors/fleet.js', [
 ("""        if (v.wrecked || v.chainT >= 0 || !v.body) continue;
        const d = boxDistance(v, b.x, b.y);""",
  """        if (v.wrecked || v.chainT >= 0 || !v.body || Math.abs((v.z || 0) - (b.z || 0)) > 40) continue;   // (a street's blast never the deck's cars over it)
        const d = boxDistance(v, b.x, b.y);"""),
])

# ---- combat/aim.js: the assist's line of sight meets a deck's slab, as a shot does
edit('src/motor/combat/aim.js', [
 ("""export function losClear(map, a, b) {
  const az = (a.z || 0) + CHEST, bz = (b.z || 0) + CHEST * .8, n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
  for (let i = 1; i < n; i++) { const k = i / n; if (map.heightAt(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k) > az + (bz - az) * k) return false; }
  return true;
}""",
  """export function losClear(map, a, b, decks = null) {
  const az = (a.z || 0) + CHEST, bz = (b.z || 0) + CHEST * .8, n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
  for (let i = 1; i < n; i++) {
    const k = i / n, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, z = az + (bz - az) * k; if (map.heightAt(x, y) > z) return false;
    if (decks) for (const d of decks) { const top = d.heightAt(x, y); if (top !== null && z <= top && z >= top - (d.thickness || 6)) return false; }   // (a deck's slab between: a shooter up there and a ped on the street)
  }
  return true;
}"""),
])
edit('src/game/scenes/play.js', [
 ("""los: (s, c) => losClear(map, s, c), level: 'standard' });
    function switchItems() {""",
  """los: (s, c) => losClear(map, s, c, city.decks), level: 'standard' });
    function switchItems() {"""),
])

# ---- ai/autoplayer.js: a queue at a light isn't being boxed in
edit('src/motor/ai/autoplayer.js', [
 ("""    const L = b.leader, held = (L && L.gap < 14 && L.speed < 2) || b.cause === 'ped';""",
  """    const L = b.leader, waits = L && L.v && L.v.brain && !L.v.brain.parked && ['signal', 'queue', 'yield'].includes(L.v.brain.cause), held = (L && L.gap < 14 && L.speed < 2 && !waits) || b.cause === 'ped';   // (a leader waiting at a light, in a queue: traffic, not a box)"""),
])

# ---- ai/fighter.js: a throw that happens (the bottle held through the throw; a press once the switch has settled)
edit('src/motor/ai/fighter.js', [
 ("""    this.throwT -= dt;
    if (this.thrown""",
  """    this.throwT -= dt;
    if (this.thrown && this.ped.throwing) return this.thrown;   // (mid-throw: the bottle in hand till it's gone)
    if (this.thrown"""),
 ("""    if (spec.projectile === 'molotov' || spec.projectile === 'grenade') {   // (one thrown at its feet, then back to the gun)
      this._aimAt(I, tgt, false); I.aimPoint = [tgt.x, tgt.y, tgt.z || 0]; I.tap.attack = true; this.throwT = THROW_EVERY * (.8 + .4 * this._r());
      return I;
    }""",
  """    if (spec.projectile === 'molotov' || spec.projectile === 'grenade') {   // (one thrown at its feet, then back to the gun)
      this._aimAt(I, tgt, false); I.aimPoint = [tgt.x, tgt.y, tgt.z || 0];
      if (p.throwing) this.throwT = THROW_EVERY * (.8 + .4 * this._r());   // (it's away: the next one a while off)
      else if (p.inv.current === w && p.inv.cool <= 0) { I.tap.attack = true; I.down.attack = true; }   // (pressed once the switch to it has settled)
      return I;
    }"""),
])

# ---- world/interior.js: the CCTV looped (a crew's hacker) and back
edit('src/motor/world/interior.js', [
 ("""    this.cameras = this.spec.cameras.map(""",
  """    this.looped = false;
    this.cameras = this.spec.cameras.map("""),
])
edit('src/motor/world/interior.js', [
 ("""      const seen = minds ? E.sees({ x: c.x, y: c.y, z: 0, facing: c.facing }, P, { map: this.map, range: c.range, fov: c.fov, facing: c.facing, eye: c.z }) : 0;""",
  """      const seen = minds && !this.looped ? E.sees({ x: c.x, y: c.y, z: 0, facing: c.facing }, P, { map: this.map, range: c.range, fov: c.fov, facing: c.facing, eye: c.z }) : 0;   // (looped: they show yesterday's tape)"""),
 ("""  _noise(x, y, z, loud, by) {""",
  """  /** the CCTV on a loop (a crew's hacker, on: the cameras sweep and see nothing) or back (off) */
  loopCameras(on = true) { this.looped = !!on; }
  _noise(x, y, z, loud, by) {"""),
])
print('patched')
