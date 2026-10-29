# Tuning

Every gameplay number is a knob, declared beside the code that reads it (MOTOR's in `src/motor`, the game's in `src/game/tune.js`) and live in the dev menu's TUNING pages (`?dev=1`). Overrides are kept apart from the save. This file is generated from the knob list (`node tools/tuning-doc.mjs`; `npm test` checks it is current).

## Camera

| Knob | Default | Range | What it does |
|---|---|---|---|
| `camMemory` Remember views | 1 | 0..1 | The last view on foot and the last in a vehicle kept apart, each back on getting out or in (1); one view for both (0) |
| `camAuto` Auto view | 0 | 0..1 | The view picked by itself (1): ISO on foot, TOP-DOWN at speed in a vehicle |
| `viewFade` View switch fade | 0.35 | 0..1 | Seconds the old view takes to dissolve into the new one (0: a cut) |
| `autoRail` Auto-rail | 1 | 0..1 | MODE 7 in a vehicle: the rail turns to the way it has held for 1.5 s, through the crossfade (1); only by hand (0) |
| `spinRate` Camera spin | 150 | 60..360 | Degrees a second the camera spins while a turn button is held ([ ] or R3 held with the right stick pushed); a tap still turns a quarter |
| `freeCam` Free camera | 0 | 0..1 | The camera stick (or [ ]) turns every view smoothly at the speed it is pushed and leaves it where it stops; up and down tilt ISO, MODE 7 and CHASE (TOP-DOWN only turns). 0: a tap a quarter, held a spin (D48). SETTINGS, DISPLAY, Free camera (D50) |
| `freeTurn` Free camera turn | 180 | 45..360 | Degrees a second the free camera turns with the stick pushed all the way (the push squared: a light one turns it slowly) |
| `freeTilt` Free camera tilt | 40 | 10..120 | Degrees a second the free camera tilts with the stick pushed all the way up or down |
| `zoomFoot` ISO zoom on foot | 1 | 0.8..1.2 | The camera zoom walking (1 is the base view) |
| `zoomDrive` ISO zoom driving | 0.8 | 0.6..1 | The camera zoom in a vehicle below the fast speed |
| `zoomFast` ISO zoom driving fast | 0.65 | 0.5..0.9 | The camera zoom in a vehicle above the fast speed |
| `zoomFastAbove` Fast above | 190 | 80..400 | Speed (u/s) past which the camera pulls out to the fast zoom |
| `zoomFastBelow` Back below | 140 | 40..380 | Speed (u/s) under which it comes back in (lower than the first: hysteresis) |
| `zoomDwell` Zoom dwell | 0.8 | 0..3 | Seconds a zoom level holds before the next change |
| `camLead` Driving look-ahead | 0.32 | 0..1 | Seconds of a vehicle's travel the ISO camera looks ahead of it |

## Graphics

| Knob | Default | Range | What it does |
|---|---|---|---|
| `rainDrops` Raindrops | 1 | 0.25..1 | How many raindrops fall round the camera, of the full 340 in a downpour (the Fast quality: half) |
| `crowdEvery` Crowd animation rate | 4 | 1..8 | A crowd body (o.key) is drawn every n frames (4: 15 a second, like classic townsfolk) and its image reused in between, at the place it is now (the player never); away from the player one and a half times n, small on screen twice n |
| `depthLightRes` Depth views' light coarseness | 4 | 1..8 | TOP-DOWN and MODE 7 at night work the dark and the lamps' pools out every n buffer pixels and scale them up smoothly (the pools are soft: 4 is a sixteenth of the work of 1, per pixel) |
| `lightRes` Light field coarseness | 2 | 1..4 | ISO lighting works the light out every n buffer pixels and scales it up smoothly (GTM-PATCH 7): 1 is per pixel, 2 a quarter of the work |

## Footprint

| Knob | Default | Range | What it does |
|---|---|---|---|
| `fpFull` Full-simulation radius | 400 | 150..900 | Vehicles inside it run full tyre physics; peds full brains (u) |
| `fpActivity` Activity radius | 700 | 300..1400 | Actors beyond it are coarse or removed (u) |
| `fpSpawnIn` Spawn annulus inner radius | 620 | 300..1300 | Nothing spawns nearer than this (u) |
| `fpSpawnOut` Spawn annulus outer radius | 760 | 320..1500 | Spawns happen inside the annulus; despawns beyond it (u) |

## Vehicles

| Knob | Default | Range | What it does |
|---|---|---|---|
| `trainTop` L top speed | 210 | 60..400 | The L's cruising speed between stations (u/s) |
| `trainDwell` L dwell | 5 | 1..20 | Seconds an L train waits at a platform |
| `towHz` Tow stiffness | 2.2 | 0.5..8 | The tow link's natural frequency (Hz): higher is stiffer |
| `towDamp` Tow damping | 0.9 | 0.1..2 | The tow link's damping ratio (1: critical) |
| `smokeAt` Smokes below | 0.4 | 0.1..0.9 | A vehicle smokes below this share of its health |
| `fireAt` Burns below | 0.15 | 0.02..0.5 | A vehicle catches fire below this share of its health |
| `burnTime` Burn time | 4 | 0.5..15 | Seconds a burning vehicle takes to explode |
| `crashDv` Crash threshold | 45 | 0..200 | A crash hurts a vehicle beyond this change of speed (u/s) |
| `crashHurt` Crash damage | 0.28 | 0..2 | Health a crash takes per u/s of change beyond the threshold |
| `dentRate` Dent rate | 1.6 | 0..6 | How fast a zone dents: share of crush per share of health lost there |
| `nitroTime` Nitro burst | 2.5 | 0.5..8 | Seconds a nitro charge lasts |
| `nitroBoost` Nitro power | 1.8 | 1..4 | A factor on power (and launch) while the nitro burns |
| `sinkTime` Sinking time | 1.4 | 0.2..5 | Seconds a land vehicle takes to go under in deep water |
| `coastBelow` Parks below | 18 | 0..80 | An empty vehicle puts its handbrake on below this speed (u/s); faster, it rolls on |
| `carBlastDamage` Car blast damage | 160 | 0..600 | A vehicle's explosion: damage at its centre |
| `carBlastSplash` Car blast reach | 96 | 20..300 | A vehicle's explosion: its radius (u) |
| `carChain` Chain reach | 48 | 0..120 | A vehicle whose body is this near an explosion's centre goes up with it, a moment later (u): a car's half length and a parking gap |
| `carBlastLift` Blast lift | 170 | 0..500 | How hard an exploding vehicle jumps (u/s up) |
| `knockSpeed` Knockdown speed | 50 | 10..200 | A vehicle closing on a ped faster than this knocks it down (u/s) |
| `runOver` Run-over damage | 0.6 | 0..4 | Health a ped loses per u/s of closing speed past the knockdown speed |
| `propBreak` Breaks props above | 40 | 0..200 | A vehicle faster than this knocks over lamps, hydrants, bins and benches (u/s) |
| `bikeThrow` Rider thrown at | 90 | 20..400 | A bike crash with this change of speed throws its rider (u/s) |
| `skidSlip` Skid marks at | 0.2 | 0.05..1 | Rear slip (radians) past which the tyres leave marks |
| `breakIn` Break-in time | 1.2 | 0.2..4 | Seconds to jimmy a locked car (police cars) before getting in |
| `bailSpeed` Bail-out speed | 60 | 20..200 | Getting out above this speed (u/s) is a dive roll |
| `enterReach` Enter reach | 40 | 10..120 | How near a vehicle's side a ped must be to get in (u) |
| `boardSpeed` Boards below | 45 | 0..200 | A vehicle moving faster than this can't be got into (u/s) |
| `stairsReach` L stairs reach | 18 | 6..60 | How near a station's stairs the player stands to take them (u) |
| `trainReach` L door reach | 30 | 8..80 | How near a stopped L car's side a body on the platform boards it (u) |

## Attract

| Knob | Default | Range | What it does |
|---|---|---|---|
| `attractStall` Watchdog: stalled after | 6 | 2..30 | Seconds without progress (the camera still, no op begun) before the director cuts to the next reel |
| `attractCard` A card shows for | 6 | 2..20 | Seconds an interstitial card (the title card, HOW TO PLAY, MOST WANTED) shows |
| `attractTail` A reel's end held | 1.5 | 0..6 | Seconds the end of a reel holds before the next |
| `attractSeed` The demo's first seed | 2600 | 1..999999 | The first reel's world (each after it: plus one; ?seed= gives another) |
| `attractTapNote` A kiosk's note at most every | 30 | 5..120 | Seconds between BEST WITH A CONTROLLER notes when the screen is tapped |
| `attractIdle` Title idle before the demo | 10 | 3..60 | Seconds without input on the title or its menus before the attract mode starts (the brief: 10) |

## Combat

| Knob | Default | Range | What it does |
|---|---|---|---|
| `regenDelay` Regeneration delay | 5 | 0..30 | Seconds out of combat before health creeps back |
| `regenRate` Regeneration rate | 6 | 0..50 | Health a second while regenerating |
| `regenTo` Regenerates to | 50 | 0..100 | Health regeneration stops here (GTA V: half) |
| `armorSoak` Armour soak | 0.8 | 0..1 | The share of a hit armour takes while it lasts |
| `knockdownAt` Knockdown threshold | 30 | 5..200 | A single hit this hard (after armour) knocks a body down |
| `downTime` Down time | 1.1 | 0.2..5 | Seconds on the ground after a knockdown, before getting up |
| `lockCone` Lock-on cone | 70 | 10..180 | Degrees of screen a lock-on looks across, centred on the aim |
| `lockKeep` Lock-on keeps to | 1.25 | 1..2 | A locked target stays locked out to this many times the weapon range |
| `flickAt` Flick threshold | 0.75 | 0.3..1 | How far the right stick must travel from rest, in a moment, to switch the lock |
| `flickCone` Flick cone | 60 | 10..120 | Degrees either side of the flick that the next target may lie in |
| `pointPast` Assist past the point | 40 | 0..400 | How far beyond the mouse's point the aim assist may still pull to a target (u) |
| `gravity` Thrown gravity | 520 | 100..2000 | Gravity on thrown things (u/s²) |
| `bounce` Grenade bounce | 0.38 | 0..1 | The share of its speed a grenade keeps off a bounce |
| `chainDelay` Chain delay | 0.18 | 0..2 | Seconds before a blast sets off the next explosive thing in reach |
| `blastKnock` Blast knockback | 260 | 0..1000 | Knockback speed at a blast's centre (u/s) |
| `fireSpread` Fire spread | 0.9 | 0..5 | Chance a second that a hot cell lights a neighbour that burns well |
| `fireDps` Fire damage | 14 | 0..100 | Damage a second to a body in a fully burning cell |
| `rainDamp` Rain damping | 2.5 | 0..10 | How much faster fire dies in a downpour |
| `fireHop` Fire vigour per hop | 0.62 | 0..1 | The vigour a cell lit by a neighbour keeps (1: it spreads without end) |
| `moveSpread` Moving spread | 1.5 | 1..4 | A factor on spread while the shooter moves |
| `crouchSpread` Crouched spread | 0.75 | 0.3..1 | A factor on spread while crouched |
| `zapReach` Zap chain reach | 70 | 10..200 | How far a zap arcs from one body to the next |
| `zapKill` Zaps to kill | 4 | 1..20 | Zap hits in a row that kill (the GTA2 Electrogun) |
| `meleeKnock` Melee knockback | 120 | 0..600 | A punch's knockback when it floors someone (u/s) |
| `throwDist` Throw distance | 150 | 30..400 | How far a throw goes with nothing aimed at |

## Stats

| Knob | Default | Range | What it does |
|---|---|---|---|
| `statRate` Stat gain rate | 1 | 0..10 | A factor on every stat gain (dev: raise it to test the curves) |

## Abilities

| Knob | Default | Range | What it does |
|---|---|---|---|
| `abilityFill` Ability fill rate | 1 | 0..10 | A factor on how fast every ability meter fills |

## On foot

| Knob | Default | Range | What it does |
|---|---|---|---|
| `climbMax` Climb height | 34 | 0..82 | The highest ledge a jump climbs: a one-storey roof (24), a garage (32), a container |
| `jumpSpeed` Jump speed | 140 | 60..300 | A jump's upward speed: 140 peaks about 14 units up, knee to hip (the engine's 220 clears a ped's head) |
| `aimWalk` Aiming walk | 0.5 | 0.2..1 | The stick push while aiming (half: a walk) |
| `upGrace` Back-up grace | 1.4 | 0..5 | After getting up, how long a swing hurts but cannot floor again (no beating someone down for good) (s) |
| `rollDist` Roll distance | 34 | 10..60 | How far a dodge roll goes (it stops short of a wall) |
| `staminaBack` Stamina recovery | 0.5 | 0..3 | Seconds of sprint won back a second at rest |
| `walkSpeed` Walk speed | 50 | 20..120 | Mover walk (u/s) |
| `runSpeed` Run speed | 85 | 40..200 | Mover run (u/s) |
| `sprintSpeed` Sprint speed | 125 | 60..260 | Mover sprint (u/s) |

## Traffic

| Knob | Default | Range | What it does |
|---|---|---|---|
| `signalGreen` Green time | 11 | 3..40 | Seconds a signal shows green to one road |
| `signalAmber` Amber time | 2.5 | 1..6 | Seconds of amber before red |
| `signalClear` All-red time | 1.5 | 0..5 | Seconds every way is red between phases (the box clears) |
| `idmGap` Following time gap | 1.2 | 0.5..3 | Seconds a calm driver keeps behind the car ahead (IDM T) |
| `idmMin` Standstill gap | 5 | 1..30 | Units between bumpers a queue stops at (IDM s0) |
| `idmAccel` Driver acceleration | 130 | 30..400 | How briskly a calm driver speeds up (IDM a, u/s²) |
| `idmBrake` Comfortable braking | 220 | 60..600 | How hard a calm driver likes to brake (IDM b, u/s²) |
| `honkAfter` Honks after | 2 | 0.5..10 | Seconds blocked before a driver leans on the horn |
| `stopHalt` Stop-sign halt | 0.5 | 0..3 | Seconds a driver waits stopped at a stop sign before going |
| `passAfter` Goes round after | 2.5 | 0.5..15 | Seconds behind something stopped (not queueing) before a driver goes round it |
| `exitWait` Takes another turn after | 5 | 1..30 | Seconds a driver waits for a jammed exit before choosing another way |
| `gridlock` Breaks a gridlock after | 4 | 1..30 | Seconds a ring of stopped drivers, each waiting on the next (two nose to nose in a box with cars behind them, a gridlocked junction), stands before the one with the lowest id creeps on through |
| `pedPatience` Edges past peds after | 5 | 1..60 | Seconds a calm driver waits for people about a crossing (a crowd at a corner) before it waits only for those in its way |
| `trafficCars` Traffic cars | 34 | 0..200 | Moving traffic around the focus at full density (the neighbourhood, time and weather scale it) |
| `trafficNight` Night traffic | 0.6 | 0..1.5 | Traffic density at night, against the day |
| `trafficRain` Rain traffic | 0.8 | 0..1.5 | Traffic density in rain or storm |
| `panicRange` Panics within | 220 | 0..800 | A shot, blast or killing scares drivers this near (u) |
| `rammedOut` Gets out when rammed | 0.55 | 0..1 | The chance a driver the player rams hard gets out (angry or scared) |

## Random events

| Knob | Default | Range | What it does |
|---|---|---|---|
| `eventEvery` An event every | 150 | 20..1200 | Seconds of free roam between random events |
| `eventLeave` Left behind at | 900 | 200..3000 | How far the player can leave a random event before it ends (u) |

## Hold-ups

| Knob | Default | Range | What it does |
|---|---|---|---|
| `holdupTime` Aim for | 3 | 0.5..10 | Seconds a gun must be held on the clerk for the till |
| `holdupRange` Aim from within | 110 | 20..300 | How near the clerk the gun must be (u) |
| `holdupCash` The till | 450 | 0..5000 | Cash a hold-up takes ($) |
| `holdupRest` Shut for | 24 | 1..96 | Game hours a store stays shut to hold-ups after one |

## HUD

| Knob | Default | Range | What it does |
|---|---|---|---|
| `radarCones` Cop cones on the radar | 1 | 0..1 | Show the police's sight cones on the radar (1) or not (0) |
| `radarRange` Radar range | 560 | 200..1600 | World units from the radar's centre to its rim |

## Photo

| Knob | Default | Range | What it does |
|---|---|---|---|
| `photoPan` Photo camera pan speed | 260 | 40..800 | World units a second the photo camera pans at a full push |
| `photoReach` Photo camera reach | 320 | 80..1200 | How far from the player the photo camera may pan (u) |
| `photoFrame` Photo frame | 140 | 40..400 | How near the middle of the picture (u, at zoom 1) a subject must be to be in the photo |

## Crowd

| Knob | Default | Range | What it does |
|---|---|---|---|
| `fleeTime` Flees for | 7 | 1..30 | Seconds a scared ped runs before it calms down |
| `callAfter` Call lasts | 2 | 0.5..10 | Seconds a witness spends on the phone before the police have the report (it can be stopped before then) |
| `idleChance` Stops to idle | 0.14 | 0..1 | The chance a walking ped stops for something at a corner |
| `shelterChance` Shelters from rain | 0.45 | 0..1 | The share of peds who stand under cover while it rains |
| `crowdDensity` Crowd density | 2 | 0..6 | Peds per 100 u of sidewalk at full density (the neighbourhood, time and weather scale it) |
| `crowdIn` Crowd ring inner radius | 420 | 200..900 | No ped is put down nearer the focus than this (u); new ones fade in |
| `crowdOut` Crowd ring outer radius | 540 | 220..1000 | Peds are put down inside this and leave beyond it (u): the crowd lives in this disc |
| `crowdNight` Night crowd | 0.55 | 0..1.5 | Crowd density at night, against the day |
| `crowdRain` Rain crowd | 0.55 | 0..1.5 | Crowd density in rain or storm |
| `crowdMax` Crowd cap | 200 | 0..400 | The most crowd peds round the focus, near and far |
| `crowdNear` Physical peds | 60 | 0..120 | The most peds run on their physics at once (the rest glide along their lines) |
| `bodyTime` Bodies lie for | 60 | 5..300 | Seconds a dead ped lies where it fell |
| `hearShots` Shots heard within | 300 | 50..800 | How far gunfire carries (peds flee it) |
| `witnessRange` Sees a crime within | 260 | 50..600 | How far a ped can see a crime it might phone in |
| `witnessMax` Witnesses per crime | 3 | 1..10 | How many peds at most phone one crime in |

## Services

| Knob | Default | Range | What it does |
|---|---|---|---|
| `reviveChance` Paramedics revive | 0.6 | 0..1 | The chance the Medic's crew brings a dead non-story ped back |
| `medicAfter` Medic called after | 6 | 0..60 | Seconds after a death before the Medic is sent |
| `fireAfter` Pumper called after | 3 | 0..60 | Seconds a fire burns before the Pumper is sent |
| `callTimeout` A unit gives up after | 75 | 10..300 | Seconds a unit may take to reach its call before it is stood down |
| `searchTime` Officers look round for | 9 | 1..60 | Seconds the officers who answer a report search the scene |

## AutoPlayer

| Knob | Default | Range | What it does |
|---|---|---|---|
| `autoDriveFrom` Drives beyond | 420 | 0..3000 | The AutoPlayer takes a vehicle for a trip longer than this (u) |
| `autoArrive` Arrives within | 14 | 2..80 | How near its goal the AutoPlayer stops (u) |

## Wanted

| Knob | Default | Range | What it does |
|---|---|---|---|
| `star1` 1 star at heat | 20 | 1..2000 | Heat for one star |
| `star2` 2 stars at heat | 60 | 1..2000 | Heat for two stars |
| `star3` 3 stars at heat | 150 | 1..2000 | Heat for three stars |
| `star4` 4 stars at heat | 300 | 1..4000 | Heat for four stars |
| `star5` 5 stars at heat | 600 | 1..8000 | Heat for five stars |
| `evade1` Evade 1 star in | 10 | 1..120 | Seconds out of every unit's sight that clear one star |
| `evade2` Evade 2 stars in | 15 | 1..120 | Seconds out of sight that clear two stars |
| `evade3` Evade 3 stars in | 25 | 1..120 | Seconds out of sight that clear three stars |
| `evade4` Evade 4 stars in | 35 | 1..120 | Seconds out of sight that clear four stars |
| `evade5` Evade 5 stars in | 45 | 1..180 | Seconds out of sight that clear five stars |
| `copSeenMul` Seen by a cop | 1.5 | 1..4 | Heat a crime earns when a cop sees it, against a civilian's report |
| `searchR0` Search radius | 120 | 20..600 | The search area's radius when the player is first lost (u) |
| `searchGrow` Search widens | 12 | 0..80 | How fast the search area widens, u a second |
| `searchMax` Search radius at most | 520 | 100..1500 | The widest the search area grows (u) |
| `hospitalFee` Hospital bill | 100 | 0..5000 | What WRECKED costs ($) |
| `bailFee` Bail | 250 | 0..5000 | What NABBED costs ($), the guns aside |
| `resprayFee` Respray | 100 | 0..5000 | What Spray & Pray charges to lose the stars ($) |
| `cardTime` WRECKED and NABBED last | 3.2 | 1..10 | Seconds the card shows before the respawn |

## Police

| Knob | Default | Range | What it does |
|---|---|---|---|
| `directFrom` Drives straight within | 170 | 40..400 | How near a unit leaves the lanes and steers straight for its target (u) |
| `stopShort` Stops short by | 26 | 8..80 | How far short of a target on foot (or stopped) a unit stops (u) |
| `copRange` Officers shoot within | 150 | 40..400 | How near an officer comes before it stops to shoot (u) |
| `copBurst` A burst lasts | 0.7 | 0.1..3 | Seconds an officer holds the trigger |
| `copPause` Between bursts | 0.6 | 0.1..3 | Seconds between an officer's bursts |
| `copAimOff` Officers' aim | 0.07 | 0..0.4 | How far off (radians) an officer's burst may be |
| `copSight` Officers see | 240 | 60..600 | How far an officer on foot sees (u) |
| `copFov` Officers' view | 2.6 | 0.5..6.3 | How wide an officer on foot sees (radians) |
| `carSight` A crew in its car sees | 300 | 60..700 | How far the crew of a police car sees, all round (u) |
| `heliSight` The Eye sees | 520 | 100..1200 | How far the MPD Eye sees down, all round (u) |
| `arrestTime` Cuffed after | 0.8 | 0.1..4 | Seconds a cop must be at a slow or unarmed player on foot to cuff them |
| `doorTime` Pulled out after | 1.5 | 0.2..6 | Seconds a cop must stand at the door of the player's stopped car |
| `arrestReach` Cuffs within | 12 | 4..30 | How near a cop must be to cuff the player (u) |
| `slowSpeed` Slow enough to cuff | 35 | 5..200 | A player on foot slower than this can be cuffed even armed (u/s) |
| `roadblockEvery` A roadblock every | 18 | 3..120 | Seconds between roadblocks (from 3 stars, while the player drives) |
| `spikeEvery` Spike strips every | 25 | 3..120 | Seconds between spike strips (from 4 stars) |
| `speedLimit` Speeding above | 230 | 60..500 | A speed a cop who sees it calls speeding (u/s) |

## Gangs

| Knob | Default | Range | What it does |
|---|---|---|---|
| `respectKill` Respect for a member killed | -5 | -50..0 | What killing one of a gang's members costs with that gang |
| `respectRival` Respect for a rival killed | 1 | 0..20 | What killing a member of a gang's rival earns with that gang |
| `respectCar` Respect for a car damaged | -2 | -20..0 | What damaging one of a gang's cars costs with that gang (once a car a while) |
| `gangSight` Members see | 200 | 60..500 | How far a gang member sees the player or a rival (u) |
| `gangHangout` At the HQ | 3 | 0..8 | Members hanging out by a gang's HQ while it is near |
| `gangPatrol` A patrol | 2 | 0..6 | Members walking each of a gang's beats while it is near |
| `gangCars` Gang cars | 0.3 | 0..1 | The share of the traffic in a gang's turf that is its own cars |
| `turfWarTime` A turf war lasts at most | 60 | 10..300 | Seconds before a turf war's survivors walk away |

## Stealth

| Knob | Default | Range | What it does |
|---|---|---|---|
| `guardSight` A guard sees | 150 | 40..320 | How far a guard sees inside its cone (u) |
| `guardFov` A guard's cone | 1.4 | 0.4..3 | How wide a guard looks (radians) |
| `shotHeard` A shot is heard | 280 | 40..600 | How far a gunshot carries indoors (u; through a wall, half as far) |
| `stepHeard` A sprint is heard | 60 | 0..200 | How far running feet carry indoors (u) |

## World

| Knob | Default | Range | What it does |
|---|---|---|---|
| `dayMinutes` Day length | 24 | 2..120 | Real minutes for one game day (24: a game minute each real second) |
| `weatherHoursMin` Weather lasts at least | 1 | 0.25..12 | Game hours before the weather may change |
| `weatherHoursMax` Weather lasts at most | 3 | 0.5..24 | Game hours before it changes for sure |
| `wetMinutes` Soaked after | 20 | 1..120 | Game minutes of rain to soak the streets |
| `dryMinutes` Dry after | 120 | 5..600 | Game minutes for soaked streets to dry once the rain stops |
| `drawbridgeEvery` Drawbridge lifts every | 3 | 0.25..24 | Game hours between lifts (PLAN.md 9.1: every 3) |
| `drawbridgeRaise` Drawbridge lift time | 8 | 2..30 | Seconds for the leaves to rise (and to come down) |
| `drawbridgeUp` Drawbridge held up | 20 | 3..120 | Seconds the leaves stay up |

## Switch

| Knob | Default | Range | What it does |
|---|---|---|---|
| `switchHeight` Switch camera height | 2500 | 600..4000 | How high the switch camera climbs between protagonists (TOP view units) |
| `switchUp` Switch climb time | 0.8 | 0.2..3 | Seconds the switch camera takes to climb, and again to drop |
| `switchPan` Switch pan speed | 3200 | 500..10000 | Units a second the switch camera crosses at height |
| `vignetteTime` Vignette time | 3.2 | 0..10 | Seconds a protagonist is left to their vignette before control returns (any move ends it sooner) |
| `awayFresh` Away to be found anew | 60 | 0..600 | Seconds a protagonist must be left alone before a switch finds them at their vignette, not where they were left |

## UI

| Knob | Default | Range | What it does |
|---|---|---|---|
| `wheelSlow` Wheel slow motion | 0.3 | 0.05..1 | The game's speed while a wheel is open (GTA V: about a third) |
| `wheelHold` Wheel hold | 0.14 | 0..0.5 | Seconds the wheel button is held before the wheel opens (a quick tap does nothing) |
| `tipTime` Onboarding hint time | 6 | 2..20 | Seconds a first-time hint stays up |

## Prices

| Knob | Default | Range | What it does |
|---|---|---|---|
| `price_slugger` Lowtown Slugger | 60 | 0..50000 | Lowtown Slugger ($) |
| `price_snub38` Snub .38 | 250 | 0..50000 | Snub .38 ($) |
| `price_ammo_snub38` Snub .38 ammo | 31 | 0..50000 | Snub .38 ammo ($) |
| `price_buzzsaw` Buzzsaw | 900 | 0..50000 | Buzzsaw ($) |
| `price_ammo_buzzsaw` Buzzsaw ammo | 113 | 0..50000 | Buzzsaw ammo ($) |
| `price_persuader` Persuader | 1200 | 0..50000 | Persuader ($) |
| `price_ammo_persuader` Persuader ammo | 150 | 0..50000 | Persuader ammo ($) |
| `price_partystarter` Party Starter | 150 | 0..50000 | Party Starter ($) |
| `price_pineapple` Pineapple | 300 | 0..50000 | Pineapple ($) |
| `price_hotmess` Hot Mess | 3500 | 0..50000 | Hot Mess ($) |
| `price_boomtube` Boom Tube | 5000 | 0..50000 | Boom Tube ($) |
| `price_zapomatic` Zap-O-Matic | 4000 | 0..50000 | Zap-O-Matic ($) |
| `price_nailgun` Nail Gun | 1100 | 0..50000 | Nail Gun ($) |
| `price_ammo_nailgun` Nail Gun ammo | 138 | 0..50000 | Nail Gun ammo ($) |
| `price_teslacoil` Tesla Coil | 6000 | 0..50000 | Tesla Coil ($) |
| `price_flaregun` Flare Gun | 1800 | 0..50000 | Flare Gun ($) |
| `price_ammo_flaregun` Flare Gun ammo | 225 | 0..50000 | Flare Gun ammo ($) |
| `price_armor` Body armour | 400 | 0..50000 | Body armour ($) |
| `price_mod_armor` Armour plating | 2500 | 0..50000 | Armour plating ($) |
| `price_mod_nitro` Nitro | 1500 | 0..50000 | Nitro ($) |
| `price_mod_oil` Oil slick | 800 | 0..50000 | Oil slick ($) |
| `price_mod_mines` Mines | 1200 | 0..50000 | Mines ($) |
| `price_mod_bomb` Car bomb | 2000 | 0..50000 | Car bomb ($) |
| `price_mod_roofmg` Roof gun | 6000 | 0..50000 | Roof gun ($) |
| `price_repair` A repair | 250 | 0..50000 | A repair ($) |
| `price_paint` A paint job | 120 | 0..50000 | A paint job ($) |
| `price_outfit0` The usual | 100 | 0..50000 | The usual ($) |
| `price_outfit1` Night out | 400 | 0..50000 | Night out ($) |
| `price_outfit2` Beach day | 600 | 0..50000 | Beach day ($) |
| `price_plate` The blue plate | 30 | 0..50000 | The blue plate ($) |
| `price_coffee` Coffee | 4 | 0..50000 | Coffee ($) |
| `price_hotdog` Hot dog | 8 | 0..50000 | Hot dog ($) |
| `price_soda` Neon soda | 3 | 0..50000 | Neon soda ($) |
| `price_jerky` Mystery jerky | 12 | 0..50000 | Mystery jerky ($) |
| `price_carwash` Palm Car Wash | 15000 | 0..200000 | Palm Car Wash ($) |
| `income_carwash` Car wash income | 600 | 0..20000 | Car wash income ($) |
| `cap_carwash` Car wash till | 3000 | 0..100000 | Car wash till ($) |
| `price_arcade` Pixel Palace Arcade | 25000 | 0..200000 | Pixel Palace Arcade ($) |
| `income_arcade` Arcade income | 900 | 0..20000 | Arcade income ($) |
| `cap_arcade` Arcade till | 4500 | 0..100000 | Arcade till ($) |
| `price_launderette` Sudsy's Launderette | 20000 | 0..200000 | Sudsy's Launderette ($) |
| `income_launderette` Launderette income | 700 | 0..20000 | Launderette income ($) |
| `cap_launderette` Launderette till | 3500 | 0..100000 | Launderette till ($) |
| `price_airstrip` Ironside Airstrip | 40000 | 0..200000 | Ironside Airstrip ($) |
| `income_airstrip` Airstrip income | 1200 | 0..20000 | Airstrip income ($) |
| `cap_airstrip` Airstrip till | 6000 | 0..100000 | Airstrip till ($) |
| `price_penthouse` The Glass Tower penthouse | 60000 | 0..200000 | The Glass Tower penthouse ($) |
| `income_penthouse` Penthouse income | 1600 | 0..20000 | Penthouse income ($) |
| `cap_penthouse` Penthouse till | 8000 | 0..100000 | Penthouse till ($) |
| `price_berth` The Marina berth | 30000 | 0..200000 | The Marina berth ($) |
| `income_berth` Berth income | 900 | 0..20000 | Berth income ($) |
| `cap_berth` Berth till | 4500 | 0..100000 | Berth till ($) |

## Economy

| Knob | Default | Range | What it does |
|---|---|---|---|
| `cabBase` Cab flag fall | 20 | 0..500 | What a cab costs to start ($) |
| `cabRate` Cab fare per 100 u | 4 | 0..100 | What a cab costs per 100 units of the trip ($) |

## Missions

| Knob | Default | Range | What it does |
|---|---|---|---|
| `giverReach` Giver reach | 18 | 6..60 | How near a mission's marker you walk to be offered the job (u) |
| `botRetries` Bot retries | 4 | 0..10 | How many times the bot retries a failed stage before it quits (as a player plays it again) |
