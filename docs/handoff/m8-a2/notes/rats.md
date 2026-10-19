# The Harbor Rats chain (R1-R3): notes

Worker: rats. Base: `e88f1e2` (M8 part 1), worktree `wf_adf1e557-539-2`. Three new files, nothing else touched (no
MOTOR file, no other worker's file, no git writes):

- `src/game/missions/r1-rat-run.js` — `rats_rat_run` "Rat Run"
- `src/game/missions/r2-below-deck.js` — `rats_below_deck` "Below Deck"
- `src/game/missions/r3-crane-game.js` — `rats_crane_game` "Crane Game"

All three: giver `{ phone: 'rats' }`, gang `rats`, the requires chain `prologue` → R1 → R2 → R3. Deterministic (no
Math.random, Date or timers: `m.stageTime` / `m.elapsed` only). Every objective carries a hint the bot plays. Every setup
is idempotent: `ensure.*` for what lasts across stages and retries, `spawn.*` for what a stage makes fresh, the player put
back near the stage's start when far (a deep link, a retry).

## R1 · Rat Run (`rats_rat_run`, tier 1, plays any)

- **call**: Mama Bilge on the payphone.
- **van**: Bilge's yellow Hauler waits at the curb nearest the Rats' payphone (the end of Wharf Street; the spot is kept
  in `m.data` so every stage and retry uses the same one). Get in (`enter`, hint enterVehicle). The moment you're in,
  the stakeout lights it up: `m.wanted.set(2)`.
- **drop**: lose the police, then pull up at the construction site's frontage on Chapel Street (the Brickyard, the Boom
  Box's back lot under the Loop gap), where Lefty waits in the lot. `failIf` stars > 0 while stopped at the drop: "they
  saw you arrive" (arriving = stopped there, so driving past with stars is no fail). Spray & Pray is blipped on the
  radar: a respray loses them (and earns the paint bonus). `deliver` (stopped, radius 60) — the bot evades its stars
  first, then delivers. Lefty takes the van (removed); Bilge: Lead Farm sells you a Persuader now (the arsenal's
  Persuader unlock is this mission's id).
- Rewards $2,500, Rats +15, Gnomes -5. Bonuses: under 5:00; the van above 75%; lost them at Spray & Pray.
- Retry/deep link of **drop**: a fresh van at the curb (the old one removed if it is away), the player seated, the two
  stars again, Lefty ensured.

## R2 · Below Deck (`rats_below_deck`, tier 2, plays Viv)

- Club Chrome's front lot (the plaza) dressed as the Saints' chop shop from mission props: the workbench (a crate)
  with Fender's ledger, crates, pallets, barrels, a scaffold, and a stripped Saint (locked, 45%).
- **meet**: the Rats' lookout on the corner north of the club (out of every guard's sight).
- **sneak**: four Saints guards (role `guard`, at their posts facing out: south, south-east, south-west, west). Viv has
  the Snap and nothing else (`loadout({ weapons: ['snap'], only: true })`). The stealth hint path runs down the club's
  east side and along its front wall, behind the guards' backs and outside every cone (220 u, 2 rad; checked with
  E.sees on each seed); it passes 18 u behind the bench guard (the takedown from behind: bonus). Photograph the ledger
  from the spot by the bench (`m.photo(BENCH, { from: SPOT })`), then out the way you came (a second stealth path).
  Being seen = `failIf` any guard alerted and not taken down: "they made you".
- Rewards $3,500, Rats +15, Saints -10. Bonuses: under 4:00; took the bench guard down quietly.

## R3 · Crane Game (`rats_crane_game`, tier 3, plays any)

- **call**: Bilge: Fender is sending the Saints for her container yard.
- **yard**: to the yard's gate on Brick Lane, then on foot to the Rats at the yard's east side (over Dock Road, the
  cranes beyond). The kit: Lefty's Buzzsaw and Persuader (the job's alone, `only`), full health and a vest (100).
  Three mission Rats (bats: no friendly pellets in the player's back) fight beside the player.
- **east**: Saints across Dock Road from the cranes: three (two pistols, a bat), then two more behind them once the
  first are nearly down (or after 14 s). `m.kill('e')`.
- **cars**: two Saints cars (a Saint, a Zephyr) down Dock Road (one way, south), the second behind the first; each pulls
  up and its crew piles out on the yard's side (once there, stopped in traffic, wrecked/burning, or after 20 s); the
  second car's crew has a Molotov thrower. The hint targets the crews (the bot fights the first out while the second is
  coming). `m.kill('w')` once both are out.
- **south**: over Brick Lane and round the cranes' south end, with their enforcer (160 hp) and a Molotov thrower.
- Red barrels by the yard's east side and over Dock Road (b1/b2/b3, a set per wave): shot (20 hp), blasted or stood in
  fire 1.2 s they blow (70 dmg, 48 splash) and set each other off. Built in content as Combat explosive boxes (see
  MOTOR requests); swept out of Combat's lists when done. Molotovs (partystarter) start fires.
- Between waves the Rats patch the player up (health, vest, ammo); a Rat killed loses the crew bonus (a fresh one comes
  with the next wave). `failIf` the player strays 520 from the yard: "you left the yard".
- **chase**: the Saints' captain runs. The player is patched up once more; the Rats' Brute waits in the lane of the
  yard's west street (one way, north, away from the fight's wrecks and fire engines), boarded while the Rat talks;
  once the player is at its wheel the captain's chrome Saint pulls out
  150 u ahead and runs up the street and west along Loop Avenue (a `route`; where it ends he stops). Catch him:
  `m.chase('leader', { reach: 72 })` (in reach and stopped: boxed in, or wrecked) or his car burning / rammed below half.
  The bot rams (kill hint). Then the reward at once (what blows up after is the city's business).
- Rewards $5,000, Rats +20, Saints -10. Bonuses: under 7:00; every Rat walked away. Unlocks the Hot Mess at Lead Farm
  (its unlock is this mission's id).
- While the fight and the chase run (one op beside each stage's own, `start`/`end`): the precinct looks the other way
  (`wanted.cap(0)`, lifted and the heat cleared in the op's `end`, however the stage ends: next stage, fail, quit); the
  city's Rats count the player one of theirs (the player's `gang` is `rats` while it runs, so a stray hit on a city Rat
  rallies nobody, and Rats respect lost to the crossfire — a kill, a car — is refunded); a Saint that gets no nearer and
  is not hurt for 15 s (stuck behind a pillar or a container where neither side's shots get through) breaks and runs
  (removed).

## Bot runs (final; `node tools/bot.mjs`)

| mission | seed | pad | passed | medal | game s | retries |
|---|---|---|---|---|---|---|
| rats_rat_run | 1 | - | yes | silver | 56 | 0 |
| rats_rat_run | 2 | - | yes | silver | 50 | 0 |
| rats_rat_run | 3 | - | yes | silver | 73 | 0 |
| rats_rat_run | 1 | pad | yes | silver | 75 | 0 |
| rats_below_deck | 1 | - | yes | gold | 95 | 0 |
| rats_below_deck | 2 | - | yes | gold | 105 | 0 |
| rats_below_deck | 3 | - | yes | gold | 131 | 0 |
| rats_below_deck | 1 | pad | yes | gold | 91 | 0 |
| rats_crane_game | 1 | - | yes | silver | 116 | 0 |
| rats_crane_game | 2 | - | yes | silver | 132 | 0 |
| rats_crane_game | 3 | - | yes | gold | 137 | 0 |
| rats_crane_game | 1 | pad | yes | silver | 102 | 0 |

R1 is silver on every seed: the bot evades the stars rather than respraying, so the paint bonus at least is missed.
R3's silvers finish minutes inside the time bonus, so the bonus they miss is the crew's (a Rat falls in the crossfire). A second round of R3 gave pad 102 s / 0 retries again and seeds 1-3 116 / 135 / 137 s, all 0 retries.
The runs are not always repeatable: before R3's last change, the same pad command gave 105 s with a chase retry
(wrecked) once and 106 s with none the next time (see MOTOR request 10), which is why the chase stage now patches the
player up and boards the Brute during the Rat's lines. Also:
`npx eslint src tests tools` clean; `node tools/boundary-check.mjs` "165 files, no reach-through";
`node --test tests/sim/mission-links.test.mjs` 2/2 pass (every stage lands from its deep link).

## Deviations from the brief, and why

- **R1's drop** is the construction site's frontage on Chapel Street (the Boom Box's back lot), not Crush Hour's yard or
  the Boom Box's front: the crusher's yard borders the water (the bot's overshoot drowned the van) and the crusher
  traps it; at the Boom Box the fleet's parked Brute blocks the lot on some seeds, and Lefty was run over on the
  approach (a runOver crime: stars at the drop). The frontage has no random clutter and a clear lane on every seed.
  Arriving means stopping there (the lane is 56 u off the lot).
- **R2's chop shop** is Club Chrome's front lot (the plaza), not the boom-box or container yard: the plaza has no random
  props on any seed, so the cover and the sight lines (the stealth path outside every cone) are the same each seed.
- **R3** holds the yard's *east* side (the Saints come from the cranes and down Dock Road: the misses fly over the quay
  and the harbour, not into Neon Mile's sidewalks); the Rats fight with bats (with Persuaders their pellets killed the
  player in the crossfire); the precinct is paid off for the night (stray crimes otherwise earned stars and busts mid
  wave); the player counts as a Rat for the city's Rats during the fight (the yard is their turf: their members, hit by
  strays, rallied against the player, and after a few stray kills — -5 each against a hostile line of -20 from the
  bot run's 0 — they beat the player to death on sight in the last wave; see MOTOR requests); the captain's
  Saint drives a `route`, not `flee: 'player'` (broken: see MOTOR requests), and leaves from the west street, not
  Brick Lane (after the waves Brick Lane jams with fire engines and wrecks); a stalled Saint breaks and runs (the
  fighters' line of fire ignores solids: see MOTOR requests).
- **No `gang` on any mission ped or car** (R2's guards, R3's Saints and Rats): with one, a stray hit by the player
  rallies that gang's city members against the player and each kill costs respect beyond the job's own.
- R1's retry respawns the van rather than `m.place`-ing it back (that throws: see MOTOR requests).

## MOTOR requests (also in the structured output, each with its patch)

1. `src/motor/mission/actors.js` `place()`: a vehicle's `b.vx = b.vy = b.vz = 0; b.speed = 0;` throws (VehicleBody's
   vx, vy and speed are getters over u, v): use `b.u = b.v = b.w = 0; b.vz = 0;`.
2. `src/motor/mission/actors.js` `_away()`: reads `L.ax`/`L.ay`, but lanes carry `a`/`b` points: every distance is NaN,
   so a fleeing car always heads for `[v.x + 600, v.y]` (off the network, never reached) and stops for good at the end
   of its route. Use `L.a[0]`, `L.a[1]` (ground lanes), and drop `D.dest` when `routeTo` finds no route.
3. `src/motor/ai/fighter.js` `_lineTo()`: `map.ray` sees map cells only; solids (Loop pillars, containers, crates) stop
   the bullets but not the line test, so a fighter empties its gun into a pillar (and the other side's muzzle, 10 u
   forward, clears it): test the solids along the segment too and answer `'wall'`.
4. `src/motor/actors/ped.js`: `E.sees` reads `target.crouch`; the Ped keeps `crouching`: add `get crouch()`.
   (Measured: exposure 1.00 standing, 1.00 crouched, 0.60 with the getter.)
5. `src/motor/combat/combat.js` `shoot()`: the Snap files a `'shooting'` crime before its photo branch (measured:
   "shooting, photo" from one press): branch on `'photo'` before the muzzle flash and the crime.
6. `src/motor/mission/runtime.js`: a `wanted.cap`/`floor` set by a stage outlives the mission unless the script lifts
   it (a quit mid-stage leaves cap 0 for good): reset floor 0 / cap 5 at the mission's end when a stage touched them.
7. `src/motor/mission/actors.js` `prop()`: `o.explosive` (hp, damage, splash, fire) registering the prop with Combat's
   boxes/explosives and removing it on release (R3 builds its barrels from Combat's internals).
8. `src/motor/gangs/gangs.js` + `src/motor/mission/runtime.js`: a mission-level ally gang (`m.ally(gang)`): the player's
   hits on its members rally nobody and its kills/car hits cost no respect while the mission runs (R3 sets the
   player's `gang` and refunds respect on the BUS instead).
9. `src/motor/mission/runtime.js`: `m.alerted(tag)` (R2 reads `m.R.actors.entry(a).alerted`).
10. `src/motor/actors/ped-rig.js` `setLook()` (suspected cause of the unrepeatable runs): the engine's Humanoid starts
    its clock at `Math.random() * 10` (the idle sway), and the player's shots leave from the posed hand
    (`combat.shoot`: `p.rig.muzzle()` for a rig that isn't lazy), so the same bot run can play differently. Start the
    rig's clock at 0 (`this.rig.t = 0` after `new E.Humanoid`), or take the simulation's muzzle from `handOf()`.

## Scratch

Probes and logs are in this folder (mapdump, lanebox, curbs, lanes, sight, crouch, snap, probe-r1/r2/r3, probe-chase,
probe-chase2 and their logs; final-*.log are the final bot runs).
