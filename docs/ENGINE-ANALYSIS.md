# Engine analysis: my-3D2dge under Grand Theft Moto

This is the final analysis, written after the build. It replaces the preliminary one in `PLAN.md` section 18, which
was written from planning research. `README.md`, the built page's header and the Credits & About screen carry its
summary (`src/about.js`).

- **The engine:** my-3D2dge v0.46.1, commit `cfa866aa45474868350cad1a7fc015e612f9305f` (2026-10-15),
  <https://github.com/michaelcrosato/my-3d2dge>, MIT. It is vendored whole at `vendor/my-3d2dge/` (the 742 KB
  `engine/my-3d2dge.js`, its tools, docs and mocap), checked against its SHA by `tools/vendor-check.mjs` on every
  `npm test`, and changed only by the seven patches in `vendor/my-3d2dge/PATCHES.md`.
- **What sits on it:** MOTOR (`src/motor/`, about 15,400 lines), an open-city layer, and the game's content
  (`src/game/`, about 8,400 lines), which imports MOTOR's public API alone (`tools/boundary-check.mjs` enforces it).
  MOTOR reaches the engine through one global, `E`, and its game object.
- **How this was worked out:** a census of every `E.*` name MOTOR and the content use (counts below are call sites),
  the decisions that chose against a piece (`docs/DECISIONS.md`), and the patches.

## What we used

**The loop and the frame.** `E.Game` runs everything: its exact fixed step (1/120 s, every system steps on `dt`), its
scenes and `game.go` fades (title, play, the interior, attract, the Proving Ground's zones), the boot screen and the
`expand` resolution (`res: 'ps1'`: a 480 × 270 buffer at 1080p). Headless, the same game runs in `node:vm` and steps
with `game.advance`: every sim test, the mission bot, the campaign and the soaks run the real game without a browser.
That one property carried the whole verification plan.

**Pixels.** The primitives everywhere MOTOR draws for itself: `E.px` (84 call sites), `E.mkCanvas` and `E.ctx2d`
(37), the colour helpers `E.shade`, `E.hex` and `E.tones` (34), `E.tex` textures (13), the pixel font `E.font` with
its title face (32), `E.ui` boxes (4), and `E.hash2`, `E.noise2` and `E.rng` for procedural detail (31): every car,
facade, sign, floor tile, HUD glyph and card is drawn with them at run time, with no image files.

**The world.** `E.TileMap` holds Lowtown's buildings and the bank's rooms: walls, roofs, facades, materials and
heights, `ray` and `sight` for lines of sight, and the solids street furniture and the Loop's deck pillars are made of
(GTM-PATCH 1 and 3 made it city-sized). `E.Backdrop` paints ISO's sky by the hour; the props registry (`E.prop`,
`E.PROPS`, `E.HEIGHTS`) supplies street furniture.

**Rendering.** The depth-sorted renderer (`r.queue`, `r.box`, `r.actor`) draws every body in ISO through MOTOR's
Stage; `E.View`'s `iso` view is ISO's projection and the model for the other two. Canvas lighting (`game.lights`,
made affordable at city scale by GTM-PATCH 7) lights the night in ISO. The particles and `hitFx` give every hit its
spark.

**The engine's two perspective tricks, generalized.** The stress test's side scrolling with depth (its `proj`,
`rowDepth`, `floor7`, `face7`, `view7`, `wall7`, `pool7`, `depthCut`) became SIDE-SCROLL MODE 7, a view the player
switches to anywhere, outdoors and in the bank (D4), with a level camera and a shifted lens so towers stand upright
(D8). The shooter kit's one-point lean became TOP-DOWN: GTA2's perspective, the camera climbing with speed.

**Characters.** `E.Humanoid`, subclassed for the crew, the crowd, the police, the gangs and the guards, in both its
styles (the classic rig kept as images for far crowds, D13), with `drawPortrait` on the phone and its weapons drawn
in the rig by GTM-PATCH 8 (D14). The mocap clips (19 call sites: driving, sitting, the phone, the pistol, getting up)
animate them. `E.Mover` walks, climbs and vaults every ped; `E.ACTIONS` and `E.Action` are getting in and out,
carjacks and takedowns (D15); `E.ik3` reaches for a door.

**Perception and AI.** `E.sees` (14 call sites), `E.hears` (4) and `E.Suspicion` (6) are how the police see a crime,
how a gang spots a hostile on its turf and how the bank's guards and cameras notice the player. `E.FlowField` walks the
guards' rounds inside the bank.

**Combat.** `E.Bullets` as the one pool every gun fires into, `E.Attack` for melee hits and `E.Combo` for the fists'
and the bat's chains.

**Input, sound and saves.** The Input class under MOTOR's own per-context bindings: DualSense detection, the dead
zones, `rumble` (15 call sites) and `consumeAll`, with the raw device state GTM-PATCH 4 adds (analog triggers, the
active pad, the activity clock the attract mode's idle timer reads). `ChipAudio`'s effects and presets for the SFX map
(14 call sites), and its buses (GTM-PATCH 5) for MOTOR's own sequencer, radio and engine voices. `E.store` keeps the
three save slots; `game.settings` holds the settings the 10-foot screens edit.

**Determinism and tools.** The engine's session recorder (`?record=1`) and `replay.mjs` prove a recorded drive replays
checksum for checksum (`tests/e2e/replay.mjs`). `check.mjs` (look lint, no external requests, frame times) runs on the
city and the bank in every `npm test`; `filmstrip.mjs` took the animation strips of M3-M6.

## What we built on top, because the engine has no such piece

These are MOTOR's, each with its tests (`docs/ARCHITECTURE.md` has the map):
- **vehicles:** a 2D rigid body with bicycle-model tyre forces for seven classes (cars, trucks, the tow truck, bikes,
  boats, the police helicopter, the L), box models in a painter's order, damage, fire and a fleet that sleeps and
  wakes (D15, D16);
- **the city's floor and decks:** floor chunks baked per view on demand (D9), decks with space under them (the Loop's
  elevated avenue, the drawbridge);
- **the Stage** with its three projectors (ISO, TOP-DOWN, MODE 7), the view manager and its dissolve, Auto-rail, the
  cut-aways indoors and out;
- **the roads and their traffic, the crowd** on the sidewalks, the emergency services, the police by tier with the
  wanted level, the gangs with respect and turf;
- **the mission runtime and its DSL,** the mission bot that plays any mission from its hints, the bot campaign;
- **the 10-foot UI** on its own canvas layer (D2, D23), our own pause;
- **audio:** a look-ahead sequencer, a composer and four radio stations on the play clock (D24);
- **the attract mode's Director,** the Proving Ground, photo mode and the dev tools.

## What we did not use, and why

| Piece | Why not |
|---|---|
| The agent edition | It lacks props, lighting, `E.Mover`, perception, the shell and sessions. |
| The 3D engine (three.js + Rapier) | It must be served, not opened from disk; it has its own world and physics, and it doesn't draw in the 2D pixel style. |
| `PlatformMap` and `Platformer` | The bank is a `TileMap`, so stealth, the AI and all three views work in it unchanged. |
| `TileMap.drawFloor` on the city | It bakes the whole map per view (about 13 M px at 160 × 160). MOTOR bakes chunks; `?floor=engine` keeps the engine's bake for a side-by-side check on small maps (D7, D9). |
| `E.Shell`, its minimap and the HTML standard menus | Fixed small CSS with no UI scale, no ✕ ○ □ △ in the canvas font: not readable at 10 feet (D2). The radar scrolls with the player; the shell's minimap fits the whole map. |
| The `topdown` view | Orthographic: no GTA2 lean. TOP-DOWN is the shooter kit's lean, generalized. |
| `E.Body`, `r.shape` and `r.sprite` for vehicles | A circle with no heading, 32 facing steps and cache churn. Cars need oriented boxes, tyres and a turn of any angle (D15). `E.Body`'s step still slides a knocked-down ped. |
| `FlowField` for vehicles | One target and no cell costs; the road graph routes cars. |
| `Bullets.hit` | It can't refuse a hit, and its hits are circles: MOTOR resolves hits against vehicles' boxes and the crew's cover. |
| `input.use()` at run time, the fixed d-pad moves | `use()` clears held buttons; MOTOR switches binding contexts (on foot, in a vehicle, the menus) without it. |
| `music()` for the radio | One slot, `setInterval`, always from step 0: a station must be where its clock says, and a score must duck it (D24). |
| GPU lighting | Optional and needs WebGPU; canvas lighting does ISO's night in every browser and every check (D11). |
| The glow mask | MOTOR draws its own glows for lamps, neon, head and tail lights (D11). |
| `E.ramp` | `E.tones` covered every palette. |

## The patches

Seven, each marked `// GTM-PATCH(n)` in the engine, tested in `tests/unit/engine-patches.test.mjs`, recorded in
`PATCHES.md` and `PATCHES.json` with the issue text to offer upstream:

| # | What | Why |
|---|---|---|
| 1 | `queueWalls` scans the cells under the screen; walls culled by their own height; a `cutAt` hook | 25,600 cells scanned a frame at 160 × 160; towers popped in; a player-relative cut-away |
| 2 | one wall-block cache for every view, bounded by pixels; blocks cropped to what they draw; a time-budgeted prebake | the cache grew without bound; fast cameras baked dozens of blocks in a frame |
| 3 | `solidsNear`, a bulk `addSolids`, a bucket grid for the solid queries | hundreds of solids checked by every body, query and drawing |
| 4 | `input.raw`: every key and pad, the active pad, an activity clock | analog triggers, a DualSense that isn't pad 0, the attract mode's idle timer, our own bindings |
| 5 | `audio.bus(name)` | MOTOR's own voices through the engine's volume, mute and ducking |
| 7 | `lights.res` and a table for the tint curve | Lowtown's night lighting cost 8.2 ms a frame |
| 8 | `o.weaponDraw(api)` on the Humanoid | eleven weapons drawn in the rig, a gun behind the arm that holds it |

Patch 6 (a `floor: false` flag) was planned and never needed: the city never calls `drawFloor`.

## If I could change one thing about the engine

**Make the world scale: a chunked, streamed `TileMap`.**
- The floor baked per chunk and per view, on demand, with a least-recently-used bound.
- Walls found and drawn only within the visible window, in a cache bounded by memory.
- The solids and every query on them indexed by place.
- Layered cells, so a bridge, an elevated road or a tunnel has space under it.

**Why this one.** The build bears out what planning guessed. Four of the seven patches (1, 2, 3, 7) exist only because
Lowtown is a city and not a level. MOTOR's floor chunks and its decks are the rest of the same gap, written outside the
engine. And the frame budget that still runs over (MODE 7's and ISO's medians, D20) is spent mostly on drawing a big
world, not on simulating it. Every other gap a GTA-style game met could be built on top in game code: vehicles, the
perspective views, the TV-scale UI, analog triggers, the radio. This one sits inside the engine and holds back every
open-world game made with it: city sandboxes, overworlds, large towns.

**A close second:** promote the stress test's side scrolling with depth from page code to a view any game can switch
to. MOTOR had to lift it out of a demo page and make it general (a level camera, any heading, textured faces,
occlusion indoors), and it is the engine's most distinctive picture.
