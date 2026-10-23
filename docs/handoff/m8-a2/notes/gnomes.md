# Gnomes worker: G1-G3 (Lawn Gnomes' jobs)

Three new files and nothing else (no MOTOR file, no other worker's file, no git writes; copies under `files/`):

- `src/game/missions/g1-lawn-order.js`: `gnomes_lawn_order`, "Lawn Order"
- `src/game/missions/g2-bingo-night.js`: `gnomes_bingo_night`, "Bingo Night"
- `src/game/missions/g3-gutter-ball.js`: `gnomes_gutter_ball`, "Gutter Ball"

All three use `giver: { phone: 'gnomes' }` and `gang: 'gnomes'`, with tiers 1/2/3 and the chain prologue -> G1 -> G2 -> G3.
The unlocks come from the arsenal's existing entries: the Pineapple's unlock is `gnomes_lawn_order` and the Boom
Tube's is `gnomes_gutter_ball`. Nana says both at the end of the job. The files are deterministic: `m.rng` isn't
needed, no Math.random, Date or timers, and time comes from `m.stageTime` and `m.elapsed`. Every setup is idempotent:
`ensure.*` for what must survive a retry and `spawn.*` for what is made afresh, and a far-away player is placed at the
stage's start.

## How they play

### G1 · Lawn Order (tier 1, plays Gus; $2,500, gnomes +15, saints -5)
- **call**: Nana on the payphone.
- **smash**: Gus starts at the lanes' payphone (brought back when more than 300 u away) with only the Slugger in hand
  (`only`: his kit comes back at the end), health 100 and Nana's vest (armor 100). There are eight Saints cars (4
  Saint, 4 Zephyr GT in chrome, cyan and silver), parked and **locked** at curbs about Palm Terraces at 75% health,
  and a 2:00 timer (fail: time). A car counts once it **smokes** (about ten swings). Beat it further and it burns and
  goes up, which costs the bonus "Not one of them in flames". The objective counts down ("n to go"). The hint walks
  the bot to the nearest standing car (a foot `goto`) until it is within 10 u (box distance), then hands over to
  `kill`. During the 2:00, **property-damage heat accrues but the stars are capped at 0** (Nana's girls keep the
  precinct's switchboard busy). Gus gets a fresh vest for each car smashed. A passer-by who swings back (a skater the
  bat caught, his troupe with him) is sent running.
- **heat**: once the eighth car is done, one call gets through: the stars are capped at 1, meaning an arrest patrol
  and no shooting. Lose them, or get back to the lanes' door (within 100 u, so the avenue's lanes count) and the girls
  hide Gus (stars cleared). With no stars the evade is skipped. Then Nana: "Lead Farm will sell you a Pineapple now."
- Bonus: thirty seconds to spare; none of the cars in flames.

### G2 · Bingo Night (tier 2, plays any; $3,500, gnomes +15)
- **call**: the clock is set to 22:00 when it's day.
- **wagon**: Nana's Retiree waits double-parked in Loop Avenue's westbound lane up from the lanes. Get in.
- **pickup**: pull up, stopped, at the lanes' door. Nana (cast `nana`, 600 hp) walks out and boards seat 1; after 5 s
  she is helped in.
- **escape**: **3 stars**: the MPD Eye with its searchlight, plus roadblocks laid ahead. `allowWanted` is on. Drive
  her up Chapel Street and right onto Lantern Lane to the Greasy Spoke (within 72 u). The stage fails if Nana is lost
  or the wagon burns. Nana rides along: an op calls `ride()` on her each step (MOTOR request 1). At the diner she goes
  in through the kitchen. Her girls phone in a fire at the bank, so the Eye and the roadblocks leave (3 -> 2 stars).
- **lose**: evade the 2 stars. On a retry or a deep link: a fresh wagon at the diner and the two stars again.
- Bonus: under 5:00; the wagon above half health at the diner.

### G3 · Gutter Ball (tier 3, plays any; $5,000, gnomes +20, rats -15)
- **arrive**: reach the pier's foot at the end of Wharf Street on foot. The footbridge from there to the boathouse
  pier is the one line of sight that is open on every seed.
- **torch**: Party Starter x10 and the Hot Mess (300), and only those. Three fuel drums (mission barrels, plus
  stacked dressing and crates) sit on the pier's landward side. A drum with fire at its foot goes up 0.8 s later
  (a blast credited to nobody, plus fire) and lights its neighbours. Once all three are gone the planking is set ablaze
  from the footbridge to the far end (fire spread, explosions). The hint is a goto plus spray at the next drum,
  footbridge drum first.
- **fight**: the Buzzsaw and a fresh vest. Two of Nana's girls (gnome-grunt allies with bats) hold Dock Road's corner
  up the street. Three waves of Rats come up Wharf Street and down Dock Road: grunts with Snubs, then a rat-enforcer
  with a Persuader. The girls patch Gus up between waves. The stage fails beyond 520 u from the corner.
- **escape**: the player chooses. Either take the Rats' Bilge Rat speedboat, moored at the marina's north pier, out
  past the harbour wall (any vehicle counts at the sea point, and only a boat can get there; bonus "Away in the Rats'
  own speedboat" when it's theirs), or take the Gnomes' pink Brute up Wharf Street to the L's Harbor station. The bot
  takes the road.
- A `war` op runs through torch, fight and escape. It caps the stars at 0 (the precinct is busy with bingo night's
  paperwork) and refunds the respect lost for killing the city's Rats, so the job's -15 is the only cost. However the
  op ends, the heat is cleared.
- Bonus: under 6:00; away in the Rats' own speedboat.

## Bot runs (on the final files)

| mission | run | result |
|---|---|---|
| G1 | seeds 1, 2, 3 | gold 117 s, silver 119 s, gold 113 s; 0 retries |
| G1 | pad, seed 1 | gold 132 s; 0 retries |
| G2 | seeds 1, 2, 3 | gold 71 s, gold 71 s, gold 56 s; 0 retries |
| G2 | pad, seed 1 | gold 65 s; 0 retries |
| G3 | seeds 1, 2, 3 | silver 119 s, silver 83 s, silver 86 s; 0 retries (the bot leaves by road: no boat bonus) |
| G3 | pad, seed 1 | silver 105 s; 0 retries |

`npx eslint src tests tools` is clean. `node tools/boundary-check.mjs` reports 165 files, no reach-through.
`node --test tests/sim/mission-links.test.mjs` passes 2/2. Logs: `final-g1-*.log`, `g2-seeds.log`, `g2-pad.log`,
`g3-seeds2.log`, `g3-pad2.log`.

## Deviations from PLAN.md 9.4, and why

**G1**
- A car is "smashed" when it smokes, not when it is wrecked. Bat a car to burning and it explodes 4 s later; the
  blasts chain between parked cars within 48 u and killed Gus and passers-by, and the dead bystanders piled on heat.
  Burning a car still costs a bonus.
- Property-damage heat accrues, but no star shows during the 2:00. At 1 star a cop cuffs a bat-holder standing at a
  car, because melee counts as unarmed. At 2 stars the cops' rounds set the smoking Saints off next to Gus (seed 2:
  127 damage from a Saint a cop's burst lit). After the eighth car, one call gets through with a cap of 1 star. The
  player can lose it, or hide at the lanes' door. The bot was busted at a car door on two seeds. On seed 2, evading,
  it drove off with the patrol in tow and stalled. On seed 1 it pulled up short of a 40 u hiding spot. Hence the hide
  is the lanes' door, at 100 u.
- The Saints' cars are locked. The bot's getaway was otherwise the nearest smoking Saint.
- The fresh vest per car, and sending a passer-by who hits back running, are both there because the bot can't fight
  back against a city ped (MOTOR request 5).

**G2**
- The 3 stars are driven through to the safe spot, not lost. The bot can't lose 3 stars: the Eye sees 520 u except
  under decks, the roadblocks jam it, and in an early version it stood boarding a car for 290 s. At the diner the
  girls' call draws the Eye off (3 -> 2), and the 2 stars are lost. A player still gets the full 3-star night chase:
  the spotlight on the wagon, and roadblocks laid straight up Chapel Street, which the turn onto Lantern Lane goes
  round.

**G3**
- The boathouse building has no walls in the built city. This is a builder bug: a building lot on a pier over water
  is skipped cell by cell (MOTOR request 9). So the boathouse burned is its pier: the fuel drums and the planking.
- Molotovs: the player has Party Starters, but the bot torches with the Hot Mess, because a spray hint holds the
  button and a throw needs a press (request 3). The counter-attack carries Snubs, not the Rats' Molotovs, because
  fighters never throw (request 2).
- The counter-attack is held up the street at Dock Road's corner. Held at the pier's foot, the bot kited back onto
  the burning planks.
- There are no stars for the whole job. The gunfire and blasts brought patrols and fire engines that jammed the
  escape or busted the player.
- The Rats' speedboat is moored at the marina, because the boathouse pier is burning. Any boat out at sea counts for
  the escape; only the Rats' counts for the bonus.

## MOTOR requests (also in the structured output, each with its patch)

1. `src/motor/mission/actors.js` `update()`: seated mission peds never ride. Change
   `if (p.seat || p === P) continue;` to `if (p === P) continue; if (p.seat) { if (!p.dead) p.ride(); continue; }`.
2. `src/motor/ai/fighter.js`: fighters never throw. The `select()` cooldown eats the one tap, `throwT` resets and the
   gun comes straight back (molotov.mjs: 0 throws in 40 s from three Party Starter Rats, rounds unchanged). Fix: hold
   the thrown weapon while `ped.throwing`, and tap only when `inv.cool <= 0`.
3. `src/motor/ai/missionbot.js` `_goto()` spray: press per beat for weapons that aren't automatic (a held button never
   throws or swings).
4. `src/motor/ai/missionbot.js` `_fight()` vehicle melee: walk with the bot's own `_go` while more than 40 u from the
   car. The Fighter's `_go` re-plans to the same blocked node (a lamp post), and a stale path flip-flopped between two
   cars.
5. `src/motor/ai/missionbot.js`: fight back against a city ped that hit the player in the last 2 s within 30 u. In
   seed 3 a skater troupe took Gus from 100+100 to 0 in 20 s (g1-s3-fight.log).
6. `src/motor/ai/missionbot.js` `_board()`: give up on a vehicle not boarded in about 12 s. Seen: stuck in 'board' from
   110 s to 400 s (g2-lose-s2.log).
7. `src/motor/ai/missionbot.js` `_evade()`/`_far()`: with the chopper up, prefer cover under the decks, and route
   round `police.blocks`. As it stands, 3 stars can't be lost.
8. `src/motor/mission/runtime.js` `m.wanted.clear`: clear the heat before lifting the cap. Today it re-stars for a
   step (1 -> 2 -> 0, g1-s2-probe3.log); G1 and G3 call `set(0)` first.
9. `src/motor/world/builder.js` `addLot()`: a pier or quay over water should make its cells ground for later lots
   (`if (overWater && taken[i] === 1) taken[i] = 0;`), so the boathouse and lighthouse get their walls (boathouse.mjs).
10. `src/motor/mission/runtime.js`: `m.kill(tag, { done })`, a predicate for when a target counts. G1 sets the cars'
    `out` from a 'hit' listener.
11. `src/motor/mission/runtime.js`: DSL calls so content needn't reach into `m.W`: `m.hour`, `m.blast(at, o)`
    (G3's drums), `m.shoo(ped)` (G1's passers-by), and a respect truce with a gang (G3's refund). Related to the
    Rats' requests 7 and 8.

G2 respawns the wagon (`m.remove` plus `ensure.vehicle`) rather than `m.place`-ing it, as with the Rats' request 1.
No MOTOR file was changed locally.

## Scratch

The probes and logs are in this folder:

- mapdump, curbs, tags, boathouse, spray, line, stuck, probe, fightlog and molotov (`.mjs`)
- `g1-*.log`, `g2-*.log` and `g3-*.log`
- `final-g1-*.log`: the final G1 runs
