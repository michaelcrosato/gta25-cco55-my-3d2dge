# GRAND THEFT MOTO: the expansion (the full game)

**Unique ID:** `GrandTheftMoto-5S` · **Plan:** EXPANSION v1.0, 2026-10-26 (HANDOFF L5; its scope in `docs/DECISIONS.md`
D37) · **Status:** planned; built milestone by milestone in L6, with `PROGRESS.md` holding the evidence.

The slice (PLAN.md M0-M13) is Lowtown: one district, three gangs, fourteen missions and its side content, then L1-L4
(determinism, the known limits, performance, PLAN.md 19's backlog on Lowtown). This plan grows it into the full game
in PLAN.md 19's shape: **three districts of three gangs each, three heists, and the content packs** (planes, more
boats, more weapons). It is written in PLAN.md's form, and PLAN.md stays the contract for everything this file does
not change.

## 0. How to use this plan

- **This file and PLAN.md are the contract** (HANDOFF L5-L6). Where they differ, this file decides for the expansion.
  Scope changes go through `docs/DECISIONS.md` as PLAN.md section 0 says: never cut silently, keep the architecture and
  at least one working instance of anything cut.
- **Order:** X1 to X8 (section 8). Each milestone ends as PLAN.md's do: its acceptance passes, `dist/index.html` builds
  and plays, the work is committed and pushed, `PROGRESS.md` shows the evidence.
- **Content stays content:** a district, a gang, a mission, an interior, a vehicle or a weapon is a file under
  `src/game/` written to its recipe (`docs/CONTENT-GUIDE.md`). MOTOR changes (section 7) come with tests, and after any
  MOTOR, bot or map change every merged mission and activity is run again (D21's rule).
- **The bot proves it:** every mission and activity passes through the mission bot on seeds 1-3 and through a pad
  (`tools/bot.mjs`), and the bot campaign reaches 100% across all three districts.

## 1. The full game at a glance

| | The slice | The expansion adds | The full game |
|---|---|---|---|
| Districts | Lowtown | Ironside (District 2, grown from its stub), Glass Heights (District 3) | 3 |
| Gangs | Chrome Saints, Harbor Rats, Lawn Gnomes | Rust Monks, Volt Boys (Ironside), Velvet Syndicate, Yacht Club (Glass Heights); the Gnomes in Ironside, the Saints in Glass Heights | 7 (3 a district) |
| Missions | 14 (a prologue, 9 gang jobs, a heist of 4) | 18: 6 gang jobs and a heist of 3 in each district | 32 |
| Heists | The Big Withdrawal | Blackout (Ironside's power station), House Edge (Glass Heights' casino) | 3 |
| Jobs (3 levels) | 7 | Crop Duster (a plane), Limo (a limousine) | 9 |
| Races | 2 | the Ironside Air Race (planes), the Heights Regatta (boats) | 4 |
| MAYHEM | 3 | 1 a district | 5 |
| Stunt jumps | 5 | 3 a district | 11 |
| Moto Tokens | 25 | 15 a district | 55 |
| Properties | 2 | 2 a district | 6 |
| Interiors | the bank, Club Chrome | the Ironside Power Station, the Velvet Casino | 4 |
| Vehicles | 20 definitions (14 models) | planes (Duster, Gull), boats (Splash, Moneybags), the gangs' (Scrapper, Bucket, Velvet limo, Regatta), the Limo | 29 definitions |
| Weapons | 11 | Nail Gun, Flare Gun, Tesla Coil | 14 |
| Radio stations, arcade cabinets | 6; 1 (CHROME RAIDERS in Club Chrome) | none | 6; 1 |

## 2. The world

### 2.1 Travel between districts

- **One map at a time** (PLAN.md 19): a district is loaded whole. Crossing a bridge's end fades out, loads the other
  district, and puts the player at its end of the same bridge, in the vehicle they crossed in (its definition, paint,
  mods and damage), the crew with them, the time, weather, wanted level and the save carried over. The play scene
  re-enters with the district's id; the save records where the player is (`save.district`).
- **The bridges open with the story:**
  - Lowtown's west bridge (Loop Avenue, "BRIDGE CLOSED: GNOMES ON STRIKE") opens when The Big Withdrawal is done
    (Nana Gnorr calls the strike off: her cut of the bank job paid it);
  - the Loop Causeway, Loop Avenue carried on east from Lowtown's sea wall across the bay to Glass Heights, opens when Blackout is
    done (the lights out in Ironside, the Velvet Syndicate wants the crew).
  A closed bridge is barred as the slice has it (the embankment across Loop Avenue's west end and the strike's
  notice); the map shows it closed. Opened, the scene enters again where the player stands, the way through cut.
- **Streaming two districts at once is not in this expansion.** It comes when a profiler shows that the bridge fade is
  the only seam left and both districts fit the budgets together (a DECISIONS entry then).
- **The career is per district:** a mission, an activity, a token, a stunt, a property and a hold-up each belong to a
  district (`district`, Lowtown's when unsaid) and are offered, placed and marked only there; the phone's CONTACTS
  and JOBS list the district's own; texts, the save and COMPLETION count every district's; the dev menu's GO lists
  all three. Only a job holds a bridge ("NOT DURING THIS JOB"): the stars cross with the player, and the chase goes on
  in the other district.

### 2.2 Ironside (District 2)

West across the canal, 128 × 112 cells: the city's works. Three neighbourhoods:
- **The Foundry** (the Lawn Gnomes' union turf): smelters, the Union Hall (the Gnomes' Ironside HQ and their
  payphone), worker terraces, the rail yard.
- **Scrapyard Flats** (the Rust Monks): car-crusher yards, the Scrap Cathedral (the Monks' HQ: a church of welded
  hulks), Spray & Pray West.
- **Voltage Row** (the Volt Boys): the Ironside Power Station (Blackout's interior: the turbine hall, the control room,
  the switchyard), pylons, the Substation (the Volt Boys' HQ), Ironside Airstrip (the Duster's hangar, a runway).
- Water: the canal on the east (Lowtown beyond), the river along the south. A road deck (the Flyover) carries
  Ironside Avenue over the works; Loop Avenue's bridge is the canal's one crossing.
- Doors the play scene needs: a safehouse (a flat over the laundromat), the clinic, the precinct.
- Palette: rust, soot, sodium orange, safety yellow.

### 2.3 Glass Heights (District 3)

East across the bay, 128 × 112 cells: the money. Three neighbourhoods:
- **The Strip** (the Velvet Syndicate): the Velvet Casino (House Edge's interior: the floor, the cage, the vault, the
  roof), hotels, neon.
- **Marina Heights** (the Yacht Club): the marina and the Club's pier (the Gull's moorings), villas, the Regatta's buoys.
- **Cathedral Hill** (the Chrome Saints uptown): St. Chrome's cathedral (the Saints' Glass Heights HQ), the Glass
  Tower (a helipad on its roof), the observatory.
- Water: the bay on the west (Lowtown beyond it: the Causeway), the open sea on the east and the south.
- Doors: a safehouse (the penthouse), the hospital, the precinct.
- Palette: glass blue, white marble, gold, sunset pink.

## 3. The gangs

| Gang | District | Look | Vehicles | Weapons | Rival |
|---|---|---|---|---|---|
| Lawn Gnomes | Lowtown, Ironside | as in the slice (in Ironside: union hi-vis over the pastels) | Retiree, Brute | bat, grenade | Rust Monks (Ironside) |
| **Rust Monks** | Ironside | brown robes, welding masks; rust and bronze, ✚, rivets | Scrapper (a crane truck) | Nail Gun, Slugger | Volt Boys |
| **Volt Boys** | Ironside | hi-vis and hard hats; yellow and black, ⚡, chevrons | Bucket (a cherry-picker van) | Zap-O-Matic, Tesla Coil | Lawn Gnomes |
| Chrome Saints | Lowtown, Glass Heights | as in the slice | Saint, Zephyr GT | pistol, SMG | Yacht Club (Glass Heights) |
| **Velvet Syndicate** | Glass Heights | velvet suits, gold chains; plum and gold, ♠, damask | Velvet limo | SMG, shotgun | Chrome Saints |
| **Yacht Club** | Glass Heights | blazers and boat shoes; navy and white, ⚓, stripes | Regatta (a speedboat), Zephyr GT | Flare Gun, Snub .38 | Velvet Syndicate |

Respect works as in the slice, per gang; a gang that is in two districts keeps one respect.

## 4. The missions (18 new)

Each gang gives two jobs in its district; the district's heist unlocks once two gangs' first jobs are done there. The
heists have two setups and a finale each.

| # | Mission | Giver | Summary | Systems it proves |
|---|---|---|---|---|
| IG1 | **Picket Line** | Gnomes (Union Hall) | Drive the strikers' soup van through the Monks' blockade to the picket, whole. | deliver with health, a blockade |
| IG2 | **Scab Labour** | Gnomes | Wreck the three scab buses the Volt Boys bus in, before they reach the Foundry. | moving targets, ramming |
| IM1 | **Holy Scrap** | Rust Monks (the Cathedral) | Tow three blessed wrecks from round Ironside to the Cathedral's crusher. | tow (the Hookline), multi-target |
| IM2 | **Sermon on the Mound** | Rust Monks | Hold the scrap mound against a Volt Boys raid, then chase their Bucket. | waves, chase |
| IV1 | **Live Wire** | Volt Boys (the Substation) | Photograph the Monks' stolen transformers without being seen. | stealth outdoors, photo |
| IV2 | **Short Circuit** | Volt Boys | Fly the Duster over the Gnomes' rally and drop leaflets on three marks. | the plane, flying to points |
| IH1 | **Setup: Grid Map** | the planning board | Inside the Power Station by night: photograph the switchyard plans. | an interior, stealth, CCTV |
| IH2 | **Setup: The Lineman** | the planning board | Steal a Volt Boys Bucket truck and park it under the pylon line. | a heavy vehicle, wanted |
| IH3 | **Blackout** | all three | Gus cuts the line from the Bucket, Viv shuts the turbines inside, Dex flies the payroll out in the Duster. | three protagonists, interior, plane, 3★ |
| GS1 | **Communion** | Saints (St. Chrome's) | Deliver Father Fender's chrome Saint to the cathedral through a Yacht Club ambush. | escort, drive-bys |
| GS2 | **High Mass** | Saints | Race the Yacht Club's Zephyrs down Cathedral Hill. | race |
| GV1 | **The Comp** | Velvet Syndicate (the Casino) | Collect four debts round the Strip in the Velvet limo, two of them running. | foot chases, takedowns |
| GV2 | **Loaded Dice** | Velvet Syndicate | Plant a crooked croupier in the Saints' cathedral bingo: get her in and out unseen. | stealth escort |
| GY1 | **Overboard** | Yacht Club (the pier) | In the Regatta, sink the Velvet Syndicate's party boat offshore. | boats, combat on water |
| GY2 | **Flare Up** | Yacht Club | Fire the Saints' car meet with the Flare Gun and lose 2★ by boat. | fire, evade by water |
| GH1 | **Setup: Floor Plan** | the planning board | Inside the casino by day as a high roller: photograph the cage and the vault door. | an interior's public room, photo |
| GH2 | **Setup: The Gull** | the planning board | Steal the Yacht Club's seaplane and moor it by the Glass Tower. | the seaplane, water landing |
| GH3 | **House Edge** | all three | Viv opens the vault from inside, Gus rams the cage van, Dex flies the take off the Glass Tower in the Gull. | interior, ramming, the seaplane, 4★ |

## 5. Side content (per new district)

| Kind | Ironside | Glass Heights |
|---|---|---|
| A job (3 levels) | **Crop Duster** (the Duster: rings over the allotments against the clock) | **Limo** (the limousine: fares to their doors, smoothly: a fare minds the bumps) |
| A race | **Ironside Air Race** (the Duster through gates over the works) | **Heights Regatta** (any boat round the buoys) |
| MAYHEM | the Nail Gun against Monks' Scrappers | the Flare Gun against Velvet limos |
| Stunt jumps | 3 (the Flyover's end, the slag heap, the crusher yard's ramp) | 3 (the Causeway's lift span, the villa ramp, the marina pier) |
| Moto Tokens | 15 | 15 |
| Properties | the Laundromat, the Airstrip | the Glass Tower penthouse, the Marina berth |
| Hold-ups | the Ironside Kwik-Lux | the Strip's Kwik-Lux |
| Random events | the slice's four kinds, in each district | the same |

## 6. The content packs: vehicles and weapons

| Vehicle | Class | Role | Where | What it is |
|---|---|---|---|---|
| Duster | plane | civilian | Ironside Airstrip's hangar | a crop-duster biplane: slow and forgiving, stalling under 70 u/s; Crop Duster's and the Air Race's |
| Gull | plane | special | the Yacht Club's moorings | a seaplane: takes off from and sets down on water; GH2's and House Edge's |
| Splash | boat | civilian | the marina | a jet-ski: quick, light, a passenger behind |
| Moneybags | boat | special | offshore | the Velvet Syndicate's party yacht: slow and heavy, GY1's target |
| Regatta | boat | gang | the Club's pier | the Yacht Club's speedboat |
| Scrapper | truck | gang | Scrapyard Flats | the Rust Monks' crane truck (a Hookline variant) |
| Bucket | van | gang | Voltage Row | the Volt Boys' cherry-picker van (a Hauler variant) |
| Velvet limo, Limo | car | gang, service | the Strip | a stretched sedan: the Syndicate's black one, the Limo job's white one (one model, two variants) |

| Weapon | Slot | What it does |
|---|---|---|
| Nail Gun | smg | a fast spray of nails, short range: the Rust Monks' |
| Flare Gun | special | a flare that sets what it hits burning (the molotov's fire, as a shot): the Yacht Club's |
| Tesla Coil | heavy | an arc that jumps from body to body (the Zap-O-Matic's, chained): the Volt Boys' |

**Controls:** a plane flies on the helicopter's buttons (R2 the throttle, L2 the air brake, the stick banks, R1 / L1
pitch up and down); on the ground it taxis as a car steers. A boat drives as a car does. Each is written to the
vehicle and weapon recipes (`docs/CONTENT-GUIDE.md`) and held to its spec by the handling and range benches.

## 7. Systems: MOTOR's work

- **Districts in play** (`world/`, the play scene, the career, the save): a district switch at a bridge's end (the
  fade, the carry-over, `save.district`), each district's fleet, traffic, crowd and police specs, the career's offers
  per district, the map screen's three districts (locked ones greyed), the dev menu's GO.
- **Planes** (`sim/vehicle/plane.js`, a `plane` class): a body that flies only above its stall speed, takes off from a
  runway (a seaplane from water) after a roll, banks into turns, climbs and descends with the pitch, and lands on a
  runway or water slow enough; the AutoPlayer flies one (a straight course at a cruising height, a circuit to land).
  The heli's controls carry over (R2 throttle, the stick banks, R1 / L1 pitch).
- **Interiors:** the Power Station and the Velvet Casino as the bank and Club Chrome are (guards, CCTV, public rooms,
  patrons, spots), and a heist finale that runs in an interior and outside it at once (the protagonists split).
- **Boats:** the slice's boat body carries the Splash, Moneybags and the Regatta; the AutoPlayer sails one (a course
  over the water's cells round the piers and the shore, at a speed it can turn at), as it flies a helicopter (L4).
- **Attract reels:** one a new district (the Airstrip at dusk; the Strip at night).
- **Completion:** the categories count every district's content; the weights stay.

## 8. Milestones

### X1: Districts in play, and Ironside's map
- The district switch, the carry-over and `save.district`; Ironside grown from the stub to its full map (section 2.2)
  with its fleet, traffic, crowd, police and doors; the west bridge closed until The Big Withdrawal is done.
- **Accept:** a drive and a walk over the west bridge both ways in each view (ISO, TOP-DOWN, MODE 7, the chase camera)
  with the vehicle, the crew, the time and the wanted level carried over; the simulation's hash steady over a crossing
  (replayed, it is the same); the district recipe test for Ironside; a 10-minute city soak in Ironside; the attract
  mode unchanged.

### X2: Planes
- The plane class (section 7), the Duster in Ironside Airstrip's hangar and the Gull (its moorings come with Glass
  Heights in X5: until then it is tried on Lowtown's harbour); the AutoPlayer flying them.
- **Accept:** a sim test (a takeoff, a circuit, a landing, a stall; the Gull off and onto water); the handling suite's
  plane checks; the bot gym's `plane` fixture on seeds 1-3 and through a pad (take off, fly to a point, land).

### X3: Ironside's gangs and missions
- The Rust Monks and the Volt Boys (gangs, archetypes, HQs, payphones), their vehicles (the Scrapper, the Bucket) and
  weapons (the Nail Gun, the Tesla Coil); the Gnomes' Ironside turf; IG1-IV2 and the heist IH1-IH3 with the Power
  Station interior.
- **Accept:** each mission through the bot on seeds 1-3 and through a pad; the interior's validation and its sim test;
  the gangs', vehicles' and weapons' recipe tests; screenshots of each HQ and the interior in every view, read and noted.

### X4: Ironside's side content
- Crop Duster, the Air Race, its MAYHEM, 3 stunts, 15 tokens, 2 properties, its hold-up; its attract reel.
- **Accept:** each through the bot on seeds 1-3 and a pad; the campaign completes Lowtown and Ironside.

### X5: Glass Heights' map and the Causeway
- Glass Heights (section 2.3), the Causeway (closed until Blackout).
- **Accept:** as X1 for the Causeway and Glass Heights.

### X6: Boats, and Glass Heights' gangs and missions
- The Splash, Moneybags and the Regatta, and the AutoPlayer sailing (section 7); the Velvet Syndicate and the Yacht
  Club, the Saints uptown, the Velvet limo and the Flare Gun; GS1-GY2 and the heist GH1-GH3 with the casino interior.
- **Accept:** as X3, and the bot gym's `boat` fixture on seeds 1-3 and through a pad.

### X7: Glass Heights' side content
- Limo, the Heights Regatta, its MAYHEM, 3 stunts, 15 tokens, 2 properties, its hold-up; its attract reel.
- **Accept:** each activity through the bot on seeds 1-3 and a pad.

### X8: The full game, verified
- The campaign across three districts, the perf gate in each, the docs (README, ARCHITECTURE, CONTENT-GUIDE, CONTROLS,
  TUNING, DECISIONS), the screenshot matrix in every district.
- **Accept:** section 9.

## 9. Definition of Done (the expansion)

1. Every milestone's acceptance is met, with its evidence in `PROGRESS.md` (a verdict for every check judged by eye).
2. `npm test` and `npm run test:full` pass, and CI is green on the PR's head.
3. `dist/index.html` is still one self-contained file (`check.mjs`: `external: []`; plays from `file://`; rebuilds
   byte-identical).
4. **The full game can be finished:** 32 missions and the side content of section 5; **a headless bot campaign reaches
   100% completion across all three districts.**
5. Every view works in every district and interior; a crossing and a view switch leave the simulation hash unchanged.
6. The attract mode, the 10-foot UI audit, determinism (Node and Chromium) and replay pass as PLAN.md 15 says.
7. Performance: each district's medians within the budgets (or the targets the owner set, L3/L8).
8. The docs are current, and the final chat report is as PLAN.md 15 item 12 asks.

## 10. Risks

- **Size:** 18 missions, two districts and two interiors are most of a game. The milestones keep each district's map,
  then its content, then its side content apart, so a stop at any milestone leaves a playable, finished-looking game.
- **The bot:** every new mission is written for the bot from its first stage (hints, curbs, cover), and the gym grows
  a fixture for each new hint kind (a plane, a boat). The bot does not fly a plane or sail until X2 and X6 teach it,
  so a mission that needs one comes after (the order of section 8).
- **Planes:** a plane's bot can't stop to think; it flies circuits and gives a landing up for another try, never a
  stall.
- **Memory and load time:** one district loaded at a time; the fade covers a load of up to 1 s.
