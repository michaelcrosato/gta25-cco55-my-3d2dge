# H4 heist_big_withdrawal: The Big Withdrawal

The one file: `src/game/missions/h4-big-withdrawal.js` (copy in `files/src/game/missions/`). No other file touched.

## What it is

- `defMission('heist_big_withdrawal')`: giver `{ at: 'safehouse' }` (the planning board), requires
  `heist_getaway`, `heist_blueprints`, `heist_big_drill`; plays 'any', allowSwitch, tier 4.
- Rewards: $60,000 (the pass pays it into the crew fund); +10 respect to the gang that helped
  (`rewards.respect` is a getter, filled in at the split: QUIET's helper, Rats or Saints; LOUD's, the gang the
  crew stands best with).
- Bonuses: "Under 12:00" (m.elapsed), "The getaway car above half" (the car's health at the end of the drive).
- Stages: `plan`, `ram` + `lobby` (LOUD), `drill` + `vault` (QUIET), then `getaway`, `window`, `tow`, `home`,
  `split` for both. The branch stages are wrapped by `branch(plan, stage)`: started directly, a branch stage sets
  `m.data.plan ??= plan`; the other branch's stages pass over (setup and run do nothing). Every stage has its own
  idempotent setup (crew placed, cars ensured and put, the roadblock, the van), so each one deep-links.

## How each piece plays

1. **plan** (Viv): walk to the board; Viv's brief; `m.choice` LOUD ("RAM THE STRONGBOX 4 STARS") / QUIET ("THE
   SEWER 2 STARS"), QUIET disabled with "NEEDS +40 RATS OR SAINTS" unless `m.save.respect.rats` or `.saints` >= 40.
   `bot: 'loud'`. Sets `m.data.plan` and `m.data.helper`.
2. **ram** (LOUD, Gus): Gus in a Hookline on Lantern Lane; the bank's Strongbox (its own guard driving a calm loop
   round the bank's block, two guards aboard). Ram it three times (contact episodes at a closing speed over 25 count;
   objective 0/3..3/3; kill hint: the bot rams from the wheel). Stopped, its guards bail out and run (role flee).
3. **lobby** (LOUD, Viv): switch to Viv; loadout Buzzsaw (600 rounds), health 100, armor 100, only. In through the
   front door (goto + interact); "Take out the guards": a spray hint that follows the nearest guard still up; the
   lobby held; out the front door (goto + interact on the door's own mark cell).
4. **drill** (QUIET, Gus): the Drill Rig to the curb by the sewer grate (`m.curb('bank-sewer')`); a 14 s DRILLING
   timer that only runs while the rig stands there.
5. **vault** (QUIET, Viv): down the grate; the helper loops the CCTV (the interior's camera ranges to 0, while the
   job lasts); a stealth path along the sewer and up the hatch into the vault; 3 s for the deposit boxes; the stealth
   path back; up through the sewer door.
6. **getaway** (Dex, both plans): the Zephyr (`m.garaged('getaway')` when H1's car is in the garage, else a fresh
   armoured one) pulls out of a free spot on Lantern Lane past Dock Road; 4 stars (LOUD) / 2 (QUIET), allowWanted;
   to the Loop's east ramp; at the ramp the MPD pulls back to its roadblock (stars capped at 0, the radio says
   so); up onto the deck: SIDE7; west along the deck to the roadblock (an MPD cruiser across the westbound lane,
   siren on, put down once its stretch is clear of traffic or as Dex nears). Stopped behind it: the view goes ISO
   and the SWAT van pulls up on Dex's tail.
7. **window** (Viv): switch to Viv in the passenger seat; Snub .38 only; shoot the SWAT van's engine out (to below
   40% health: smoking, never burning); the gun put away at once. The kill hint is held (no target) while any other
   vehicle is across the line of fire.
8. **tow** (Gus): switch to Gus in the Hookline past the roadblock, its hook toward the cruiser's nose; SIDE7; hook
   it and drag it off the Loop, down the west ramp to Gnome Row (deliver hint with tow).
9. **home** (Dex): switch to Dex; SIDE7; Gus's Hookline is parked at the curb and the towed cruiser cleared away
   (out of sight); through the gap and down the west ramp; ISO and the stars cleared; to the chapel on Lantern Lane,
   stopped; the car stashed in the garage as 'getaway'.
10. **split** (Viv): to the board; the split lines (ten for the helping gang, the rest in the pot); a cutscene over
    the city with the credits ("GRAND THEFT MOTO", "Lowtown: done.", "District 2: coming soon."); then the
    runtime's pass: the JOB DONE card with the medal and the bonuses.

## Bot runs (final file)

| run | result |
| --- | --- |
| `--seeds 1,2,3` (LOUD, the choice's bot) | 1: gold 242 s, 0 retries · 2: gold 186 s, 0 retries · 3: gold 181 s, 0 retries |
| `--pad --seeds 1` (LOUD) | gold 233 s, 0 retries |
| `--stage drill --seeds 1,2,3` (QUIET from its first stage) | 1: gold 217 s · 2: gold 251 s · 3: gold 274 s, 0 retries |

Also: `npx eslint src tests tools` clean; `node tools/boundary-check.mjs` clean (163 files);
`node --test tests/sim/mission-links.test.mjs` 2/2 pass (every stage, the QUIET ones included, lands from its link).

What the earlier failures were, and what fixed them (all in content):
- The getaway car wrecked at the standoff: (a) Viv's assisted shots went to peds on the street under the deck
  (pitched into the deck slab, or into passing cars); (b) traffic overtaking a van parked further back cut back in,
  into her line of fire, set burning beside the car. Now the van parks tight on the car's tail with two troopers
  inside, kept at the van's middle at a seated rider's height so the assist locks onto them; the Snub .38; the bot's
  trigger held while anything crosses the line; the gun put away the moment the van is disabled.
- A crewed van (a driver with no orders) rolled into the car as the traffic behind nudged it: its troopers sit in
  the back seats, nobody at the wheel, so it parks.
- The jam at the foot of the west ramp (seed 1, home): the towed cruiser and the Hookline left in Gnome Row's lane
  held its traffic back to the ramp. Now the cruiser is cleared and the Hookline parked at the curb once Dex has the
  wheel; the ramp objective is the lower ramp (whatever queues at the light below it); 12 s out of the car fails the
  stage (a retry), as in the getaway.

## Deviations from PLAN.md 9.4 / the brief

- Stars: 4 (LOUD) / 2 (QUIET) on the ground from the bank to the east ramp, with allowWanted; capped at 0 once Dex
  reaches the ramp (the MPD "holds back" to its roadblock on the Loop), cleared after the off-ramp. A 4-star
  pursuit on the ramps and the deck wrecked the Zephyr in the jams, and the bot cannot evade at 4 stars there.
- Viv shoots one SWAT van parked tight on the car's tail (engine shot out, disabled), not chasing cruisers: driven
  mission chasers back away at their stop and route to the ground under the deck (motorRequests), and a car burning
  on the deck chains into the getaway car. Tight on the tail, nothing can cut in between (traffic overtaking a van
  further back cut back into Viv's line of fire and was set burning).
- Viv's segment is in ISO, not SIDE7: SIDE7's rail looks the way Dex drove, so the van behind is out of its view.
  The drive along the deck, the tow and the off-ramp are SIDE7.
- Snub .38 for the window (accurate: no rounds into the traffic going by), the Buzzsaw for the lobby.
- The roadblock is one mission cruiser (the one Gus tows), not a police-tier roadblock.
- The CCTV is looped by setting the interior's camera ranges to 0 (no CCTV API).
- QUIET's two stars appear at the getaway (the night man finds the hole), not in the vault.

## MOTOR requests (worked around in content; details in the return's motorRequests)

1. `mission/actors.js` place(): a vehicle's `b.vx = b.vy = ...; b.speed = 0` throws (getters): use `b.setVelocity(0, 0)`.
2. `mission/actors.js` vehicle(): the spawn ignores the point's height (deck points): set `v.body.z` from o.z / at.z.
3. `mission/actors.js` _drive(): routes ignore the goal's height (pass `tz`); at its stop `brake = 1` reverses (use
   the handbrake); a driven mission vehicle with no orders gets no handbrake and rolls when nudged.
4. `mission/actors.js` update(): seated mission peds never follow their vehicle (and sit at its z, not +6).
5. `mission/runtime.js` deliver(): the hint drops `o.tow`.
6. `ai/missionbot.js` _towTo(): its `_go` calls carry no z (a deck staging point resolves to the street).
7. `ai/missionbot.js` _stealth(): a dead guard's stale unease keeps the bot waiting.
8. `actors/fleet.js` blast chain: 2D, so a street blast chains into the deck's cars 64 u above.
9. `combat/aim.js` losClear(): deck slabs not tested, so the assist pulls a deck shooter to peds on the street below.
10. `ai/autoplayer.js`: a queue at a red light counts as boxed in, so the bot leaves the car.
11. `mission/runtime.js`: no `m.adopt(v, tag)` for a world vehicle (the garaged getaway car takes no vehicle hint).
12. `world/interior.js`: no CCTV control (content sets each camera's range to 0).
13. SIDE7: no way to point the rail from a mission (`m.view('side7', { heading })`).
