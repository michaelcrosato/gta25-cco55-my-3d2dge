# GRAND THEFT MOTO: master plan

**Unique ID:** `GrandTheftMoto-5S` · **Plan:** v1.1, 2026-10-17 · **Status:** the slice is built (M0-M13 done, merged
into `main` on 2026-10-23). `PROGRESS.md` has the evidence, and `docs/HANDOFF.md` lists what is left.

A vertical slice of an original spiritual successor to *Grand Theft Auto 2* (PC), with *Grand Theft Auto V*-depth systems,
built on the my-3D2dge engine and on **MOTOR**, the open-city engine layer this repository adds to it. The slice is one
polished district, **Lowtown**. MOTOR, the layer underneath, is built to carry the full game.

---

## 0. How to use this plan (for the implementing agent)

- **This file is the contract.** Read it whole before writing code. Its last section (and `GOAL.md`) holds the `/goal`
  prompt that starts the run. In M0 you create `PROGRESS.md`. It tracks each milestone's status with evidence: commits,
  test output, screenshot paths and performance numbers. Keep it current, because it is how a cleared or resumed session
  picks up the work.
- **Order:** work through M0 to M13 (section 13). Inside a milestone, choose your own order. Each milestone ends in this
  state:
  - its acceptance checks pass;
  - `dist/index.html` builds and plays;
  - the work is committed and pushed;
  - `PROGRESS.md` is updated.
- **Decisions:** a reversible call (code, design, a dependency) is made at once and logged in `docs/DECISIONS.md` (date,
  call, why).
- **Scope changes only through `docs/DECISIONS.md`.** An entry says why. It must keep the system's architecture and at
  least one working content instance, so the full game can still add the content later.
  - The counts and budgets in sections 9 and 15 apply *as amended there*.
  - Never cut silently.
- **Engine questions:** search `vendor/my-3d2dge/API-INDEX.md` first, then `API.md`, then the engine source. The source
  is 727 KB, so grep it; never read it whole. Line references below (`ENG:1234`) point at `engine/my-3d2dge.js` @
  `cfa866a`.
- **Look at what you build, and record it.** Read your screenshots and filmstrips (the vendored `check.mjs` and
  `filmstrip.mjs`) and act on every look note.
  - Every check that is judged by eye needs evidence in `PROGRESS.md`: the image's path and a one-line verdict.
  - Humans judge fun from the playable file; you judge correctness from tests, and the look from images.
- **`PROGRESS.md` template:**

  ```md
  # Progress: GRAND THEFT MOTO
  Now: M<n>: <what is in flight>. Next: <the next step>. Blockers: <none | what, and who decides>.
  | Milestone | Status | Evidence (commits · tests · shots · perf) |
  |---|---|---|
  | M0 Bootstrap | done | a1b2c3d · npm test 41/41 · docs/media/shots/m0-*.png |
  ## Acceptance log
  - M0 · "dist/index.html plays from file://" · check.mjs report: docs/media/m0-check.json · verdict: plays, no notes
  ```

---

## 1. Source information

Kept separate from the engine evaluation (section 18), as asked. This block is copied into `README.md`, into the built
game's HTML header, and onto its Credits & About screen.

| Item | Value |
|---|---|
| **Initial Date** | 2026-10-17 (UTC). The first prompt of session `session_01WbNfAChUb9NHRxNSExJF74` came at 02:30 UTC. The repository was created minutes earlier, 2026-10-16 19:29 UTC-7. |
| **SOURCE** | *Grand Theft Auto 2* (PC, 1999; DMA Design / Rockstar Games), with depth, features and gameplay drawn from *Grand Theft Auto V* (2013; Rockstar North). In the my-3D2dge 2D pixel style, with the views isometric (primary), top-down (secondary), and the engine's side scrolling with depth (Mode 7). |
| **GAME ENGINE** | **my-3D2dge v0.46.1**, commit `cfa866a` (`cfa866aa45474868350cad1a7fc015e612f9305f`, 2026-10-15), <https://github.com/michaelcrosato/my-3d2dge> (MIT). It is vendored at `vendor/my-3d2dge/` and extended by MOTOR (`src/motor/`). |
| **Environment** | Claude Code (container build 2.1.302) in Anthropic's managed cloud environment: a claude.ai/code remote session started from the Claude desktop app. Linux: Ubuntu 24.04.5 LTS, kernel 6.18, x86_64. Node.js 22.22.0, npm 10.9.4, pnpm 10.28.0, Bun 1.4.2, Python 3.13. Headless Chromium 141 (Playwright build 1194, `/opt/pw-browsers`) for tests; no display or GPU. The game targets desktop Chromium, Firefox and Safari, and runs from one HTML file. |
| **Model and Effort Level** | AI lab: **Anthropic**. *Planning* effort: **max**, confirmed from the session's metadata. *Implementation* effort: recommended **xhigh** with `ultracode` (section 16). The exact model is given only in each session's chat report: this environment keeps model identifiers out of files pushed to the repository. |

---

## 2. The name

The instructions: build a playful version of the SOURCE name, write 50 candidate titles, pick one at random, and append
a 2-character alphanumeric ID as `[GameTitle-XX]`.

- **Method:** Python's `secrets.randbelow(50)` picked index **24** (1-based). `secrets.choice` over `A-Z0-9` drew the ID
  **`5S`**.
- **Result:** display title **GRAND THEFT MOTO**, unique ID **`GrandTheftMoto-5S`**. Use the ID for the repository,
  save keys, `E.store` prefixes and the ai-hub entry.
- **Tagline:** *"If it has a motor, it's yours."*
- **All 50 candidates:** Appendix A.

---

## 3. Vision

**Pitch.** Grand Theft Moto is a GTA2-style crime sandbox rebuilt for the couch. Lowtown is a living pixel-art city.
You can see it three ways:
- a crisp **isometric** diorama;
- GTA2's **top-down** perspective, where buildings lean away from the centre and the camera climbs as you speed up;
- **side-scrolling Mode 7**, a camera on a rail that follows you sideways while the avenues rush into the distance in
  SNES-style perspective.

It carries GTA V-depth systems:
- three switchable protagonists;
- a heist with a choice of approach;
- police you can search out of and evade;
- gang respect;
- a radio dial, a phone, shops, properties and stats.

All of it fits in one dense, polished district. Leave it at the title screen and it plays itself.

### What makes GTA2 distinctive, and our version of each

| GTA2 | Grand Theft Moto |
|---|---|
| A top-down camera that climbs with speed; buildings lean in perspective | The TOP-DOWN view is a true straight-down perspective, with the same lean and the same speed climb (section 5.2). |
| Three gangs per district with respect meters; working for one angers its rival | Chrome Saints, Harbor Rats and Lawn Gnomes; respect runs -100..100 and the three are rivals in a triangle (section 8.14). |
| Ringing payphones, colour-coded by gang and difficulty | Each gang's payphone rings in its colour and icon, with 1-3 difficulty pips. |
| Wanted heads that escalate (cops, SWAT, FBI, army) | Five stars: cruisers, then chopper and roadblocks, then SWAT, then Feds with spike strips. |
| Kill frenzies | **MAYHEM** skulls: timed rampages. |
| "Gouranga!": the Hare Krishna bonus | **The Marching Mimes.** Flatten the whole troupe and you get **ENCORE!** and a bonus. |
| "Jesus Saves": a church save that costs money | St. Christopher's Chapel: **"Saint Moto Saves"** (a donation, optional). |
| Spray shops, bomb shops, the car crusher | Spray & Pray, Boom Box Garage, the Crush Hour scrapyard. |
| Electrogun, flamethrower, car guns, oil slicks, mines | Zap-O-Matic, Hot Mess, and car mods (roof MG, oil slick, mines, nitro, car bomb). |
| Radio by car class, satirical DJs and ads | Four procedurally composed chip-tune stations (three music, one talk), with DJ and ad lines as subtitles. |
| Emergent chaos: peds, cops, gangs and emergency services colliding | Systemic AI where each side reacts to the others: witnesses, gang wars, cops vs gangs, ambulances, fire trucks. |
| Points and cash popping off crimes and stunts | Cash pops (`+$50`) and a HEAT BONUS multiplier during chases. |
| Elevated roads, ramps, rooftop jumps; trains | The Loop elevated expressway, ramps, 5 stunt jumps, rooftop gaps; the L elevated train. |

### What GTA V adds, and where it lives in the slice

| GTA V | Grand Theft Moto |
|---|---|
| Three protagonists, the switch camera, special abilities | Dex (OVERDRIVE), Viv (DEAD CALM) and Gus (RED MIST). The switch climbs to the sky in TOP-DOWN, pans, and drops in. |
| Heists: setups, a choice of approach, a crew | *The Big Withdrawal*: three setups, LOUD or QUIET, and a crew cut. |
| A wanted level you can search out of, with cops' vision cones | Witnesses and cop sight cones on the radar, a search area, and hiding until they give up. |
| A weapon wheel with slow motion; lock-on aiming | Hold L1 for the radial wheel; L2 locks on. |
| The phone | A 10-foot phone with five apps: Contacts, Texts, Jobs, Snap, Settings. |
| Stats that grow with use | Driving, Shooting, Stamina, Stealth, Strength. |
| Shops and properties | Lead Farm, Boom Box Garage, Threads, Spray & Pray, a diner; 2 properties that pay income. |
| Side jobs and races | Moto Courier, Vigilante, Firefighter; races, store hold-ups, random events. |
| Day and night, weather | A 24-minute day and 5 weather states, which change traction, lighting and AI. |
| Checkpoints and medals | Mission stages with instant retry, and 3 bonus objectives per mission that earn a medal. |

### Modernizations: pacing and UX that improve on the source

- **Failing costs little.** Instant retry from the stage you failed; no lives; a cab from the phone skips any drive for
  a fee; autosave after every mission and job, plus a manual save at the chapel.
- **You always know where to go.** A GPS route on the radar, map waypoints, and objective markers that point from the
  screen edge.
- **Aiming is built for a controller:**
  - twin-stick aiming on foot;
  - lock-on with sticky target switching;
  - aim-assist levels.
- **The HUD reads from the couch.** Prompts show the player's own button glyphs.
- **Accessibility:**
  - subtitles on by default;
  - gang and marker identities by colour *and* shape;
  - a hold or toggle option for every hold action;
  - less shake and flashing on request;
  - a HUD scale with whole-pixel steps.
- **Pacing:**
  - missions run 3-6 minutes, in stages of 60-90 s;
  - no forced drive of more than about 30 s without something happening;
  - a cab skip for repeat travel.

### Pillars

1. **A city that plays itself.** Every system reacts to every other: traffic, peds, cops, gangs, fire, weather.
2. **Three ways to see it, one simulation.** The view is presentation only. The simulation's footprint is set in world
   units, so switching views never changes the game (this is tested).
3. **Couch-first.** A DualSense, a 10-foot UI, and an attract mode that sells the game from across a room.
4. **Content is data.** Registries plus a mission DSL. The slice is a proving ground, and every content type has a
   recipe that a test exercises.
5. **Agent-operable and deterministic.** Any moment can be reached by a deep link or a replay, and everything is tested
   headless.

### Tone and IP rules

- The tone is satirical, playful and noir-neon, with a grin. It is never mean-spirited.
- Violence stays at GTA2's cartoon-pixel level. There are no harmable children.
- Every name, character, brand, song and line of dialogue is original. No Rockstar names, logos, music, art or mission
  text.
- *Grand Theft Moto* is a playful working title. Clear it with a trademark check before any commercial release.

---

## 4. The slice at a glance

| | |
|---|---|
| **District** | **Lowtown**, Motopolis: 160×160 tiles (2,560 u, stylized). Four neighbourhoods: Neon Mile, Palm Terraces, Brickyard, Harborfront. The Loop elevated expressway, the L elevated train, a canal with a drawbridge, the harbour, and one enterable interior: the First Lowtown Bank. |
| **Protagonists** | Dex Moreno (the wheelman), Viv Okafor (the planner), Gus Pilchard (the loose cannon). |
| **Gangs** | Chrome Saints, Harbor Rats, Lawn Gnomes; plus MPD police, SWAT and Feds. |
| **Story** | 14 missions: a prologue, 3 gang chains of 3 jobs each, and a 4-part heist with LOUD and QUIET approaches. |
| **Side content** | 3 repeatable jobs (3 levels each), 2 street races, 3 MAYHEM rampages, 5 stunt jumps, 25 Moto Tokens, 3 store hold-ups, 4 kinds of random event, 2 properties, 7 shops, a cab skip, photo mode. |
| **Vehicles** | 13 models and 19 vehicle definitions (variants), across 7 classes: car, truck, tow, bike, boat, helicopter (AI), rail (AI). |
| **Weapons** | 11: fists, bat, pistol, SMG, shotgun, rocket launcher, Molotov, grenade, Zap-O-Matic, flamethrower, camera. |
| **Views** | ISO (primary), TOP-DOWN (the GTA2 lean), SIDE-SCROLL MODE 7 (the engine's side scrolling with depth). The bank interior uses the same three. |
| **Modes** | Title, attract/kiosk, free roam, missions, interior, Proving Ground (developer level), photo mode. |
| **Platforms** | Desktop browsers with a gamepad (DualSense first), or keyboard and mouse. Phones run kiosk/attract only. |
| **Delivery** | `dist/index.html`: one self-contained file, no network, no binary assets. |

---

## 5. Perspectives

One simulation, several renderers. **The view is presentation only** (section 5.7).

**How the brief is read.** The brief's third view is "Side Scroll mode 7". my-3D2dge has a feature with that very
name: **"Side scrolling with depth (Mode 7)"**.
- It is the stress test's `?view=side&depth=1` (`src/labs.json:37`; `src/stress.game.js:615-844`;
  `docs/LAB-3D.md:175-179`).
- It is a perspective camera on a rail. The rail follows the hero sideways, with its heading locked, and keeps him 110
  to 260 units away.
- The floor is drawn one screen row at a time, SNES style, with walls and engine rigs back to front at the size their
  distance gives.

This plan builds that view for a city and calls it **SIDE-SCROLL MODE 7** (view id `side7`, labelled "MODE 7" in the
game). A free-turning chase camera (Mario Kart style) is *not* this view; it is in the expansion backlog (section 19).

### 5.1 ISO, the primary view

- **Base:** the engine's `iso` view (yaw 45°, pitch 30°, `ENG:485-492`), drawn by the engine renderer.
- **Floor:** MOTOR's chunked floor (section 8.4).
- **Buildings:** the engine TileMap's walls, roofs and facades, patched to draw only visible cells (GTM-PATCH 1).
- **Decks:** MOTOR's deck renderer draws the Loop and the bridges.
- **Rotation:** the camera turns in **90° steps** (hold R3 and flick the right stick; `[` `]` on the keyboard). That
  gives 4 yaws, each with its own wall cache. Never rotate continuously: each new yaw re-bakes everything (`ENG:2312`,
  `4376`, `4450`).
- **Zoom:**
  - **1.0** on foot; **0.8** and **0.65** when driving, chosen by speed (with hysteresis).
  - Each zoom value is a new engine view, so its wall blocks bake anew. Before switching, **pre-bake the visible wall
    blocks at the next level**, time-sliced over a few frames.
  - During the 0.25 s change, draw the previous frame's world layer affine-scaled toward the target. Then cut to the
    real view at the new level. The floor chunks never re-bake: they are affine blits at any zoom.
- **Occlusion:**
  - **What the engine's `cut: true` actually does:** it lowers only the camera-facing row of a cut type whose
    neighbour toward the camera is floor (`_isFront`, `ENG:4429-4435`). It ignores where the player stands, and on a
    solid block it notches the wrong row.
  - **So:** GTM-PATCH 1 adds a hook, `map.cutAt = (cx, cy, view) => bool`. MOTOR uses it for a **player-relative
    cut-away**: walls of buildings between the camera and the player, within a radius, drop to a low stub. Don't put
    `cut` on whole blocks.
  - **X-ray only the player and the player's vehicle.** `r.actor(..., { xray: true })` forces the slow composite path.
  - Deck slabs fade near the player when the player is under them.
- **Lighting:** the engine's canvas lighting (`game.lights`). Its lights are round pools on the ground (`ENG:1281+`),
  so:
  - headlights are 2-3 pools stepping along the beam, plus a drawn translucent beam polygon (as the lamp prop draws its
    cone, `ENG:1653-1656`);
  - neon is emissive.

### 5.2 TOP-DOWN, the secondary view and the GTA2 look

- **Camera:** a camera straight above the focus, looking down, north up (an option turns it with the vehicle).
- **The maths:** for a camera at height `H`, every point at height `z` lands at
  `screen = centre + (ortho(x, y) - centre) × k(z)`, where **`k(z) = H / (H - z)`**.
  - The floor (`z = 0`) is a plain orthographic overhead view at zoom `f / H`.
  - Everything taller leans outward from the centre.
  - This is exact perspective, not an approximation. The shooter kit's one-point lean (`src/starter/30-shooter.js:138-141`,
    `k = 1 + z·PERSP`) is its first-order form, and serves as the in-repo reference.
- **Speed climb:**
  - `H` eases from about 320 u on foot to about 640 u at top speed, the GTA2 climb;
  - the focus leads along the velocity;
  - `H` must stay above 1.6× the tallest building.
- **Drawing order**, in ascending height layers, which is GTA2's order:
  1. the floor chunks (affine blits);
  2. ground-level shadows, decals and actors;
  3. building side faces that face the centre, as trapezoids, then roofs, by roof height;
  4. deck slabs, then what is on the decks;
  5. the L track, then anything higher.
- **Actors:** engine rigs, drawn by MOTOR at `ortho(x, y)` pushed by `k(z)`. Each uses a cached top-down character View
  (`E.charView` style) at scale `zoom × k(z)`.
- **Lighting and particles:** MOTOR's own light pass (section 8.6), and particles projected by MOTOR.

### 5.3 SIDE-SCROLL MODE 7, the third view: the engine's side scrolling with depth

This generalizes the stress test's depth view (`src/stress.game.js:615-844`) from one hall to a chunked city.

- **The rail camera:**
  - **On foot:** `h` 70, pitch 14°, fov 50° (zoom narrows it). It follows the focus sideways with smoothing, and keeps
    it 110-260 u ahead, moving in depth only past those limits (`depthFollow`, 645-652).
  - **In vehicles:** `h` 90, 160-380 u ahead, and the fov widens with speed.
- **Heading:**
  - north by default (the camera stands south of the player, looking north);
  - it turns in **90° steps** (hold R3 and flick, or *Auto-rail* in vehicles);
  - **Auto-rail:** after 1.5 s of steady travel along an axis, the rail turns to face it, through the 0.35 s crossfade;
  - each heading is axis-aligned, so the floor rows stay simple.
- **Projection:** `proj(x, y, z) → [bx, by, k]` and `rowDepth(by)`, the inverse for floor rows (`stress.game.js:661-673`).
- **Floor:**
  - one screen row at a time, as in `floor7`: each row is the strip of floor texture at that row's distance, stretched
    to the screen's width;
  - the rows come from MOTOR's **chunk canvases** (section 8.4) instead of one whole-map canvas: one `drawImage` per
    row per overlapping chunk;
  - for east and west rails, a "row" is a texture column, drawn with a 90° transform;
  - the far end fades into the sky or fog colour.
- **Buildings:**
  - the TileMap's cells are merged into **box spans** (maximal rectangles of equal height and type);
  - their faces are perspective polygons textured like `face7` / `wall7` (783+), with windows lit at night.
- **Decks:** raised floor planes, drawn as rows at their own height, with side faces and pillars.
- **Order:** spans, decks, props and actors are drawn back to front along the rail's depth axis, as the stress test
  does.
- **Actors:** engine rigs drawn at their distance's scale through a per-scale View cache (`view7`, 702-706: whole
  1/16ths, capped).
- **Lights:** pools on the floor (`pool7`), plus a darkness pass, all MOTOR's. In this view the stress test switches
  off the engine's lighting and particles and draws its own (634-642), and so do we.
- **Cut-away:** the stress test's `depthCut` (653): walls of cut types between the camera and the player drop low.
- **Sky:** an `E.Backdrop` above the horizon, with yaw parallax.
- **Resolution:** drawn at the game's pixel buffer by default, for a SNES look consistent with the other views. A
  *Sharp* setting draws at the screen's own resolution, as the stress test does (`depthResolution`, 627-639).

### 5.4 Interiors

- **What they are:** small TileMap maps (`def('interiors', ...)`), built like districts.
- **Getting in:** through a door in the city, with a fade.
- **Views:** the same three. A dedicated interior cut-away keeps the room readable in ISO and SIDE7.
- **Why TileMaps:** the engine's perception (`E.sees`, `E.Suspicion`), Mover, FlowField and every MOTOR system work
  there unchanged.
- **Content:** the **First Lowtown Bank**: lobby, records office, vault, and a sewer approach. Missions H2 and H4 use
  it.

### 5.5 Switching views

- **R3** (keyboard `V`) cycles ISO → TOP-DOWN → SIDE-SCROLL MODE 7.
- **The transition takes 0.35 s:** a dithered crossfade between a snapshot of the old view and the live new view. It
  must never drop a frame below 30 fps.
- **Memory:** the last view is remembered separately on foot and in a vehicle (settings). An optional *Auto* mode
  picks ISO on foot and TOP-DOWN at speed.
- **Ownership:** the attract director and mission cut-scenes may choose views. Everything else is the player's choice.

### 5.6 Camera behaviour, shared by every view

- **Look-ahead:** along the velocity, up to 35% of the screen at top speed.
- **Shake:** on impacts, explosions and gunfire, scaled by the reduce-motion setting.
- **Cinematic shots:**
  - the switch camera: TOP-DOWN climbing to `H` 2,500, then a pan, then a drop;
  - stunt jumps: slow motion in SIDE7, on a rail set side-on to the jump;
  - wrecked and nabbed cameras;
  - mission intro fly-overs (TOP);
  - the attract director's shot list.

### 5.7 View independence

**What the simulation never depends on:**
- **The camera** is presentation: its state runs after the simulation step, is never read by it, and is excluded from
  `game.stateHash`.
- **The simulation's footprint is in world units around the focus:**
  - the activity radius;
  - the LOD rings;
  - the spawn and despawn annulus;
  - where roadblocks are placed.

  Size them for the farthest-seeing view, SIDE7, whose far fade ends at about 600 u (TUNE). None of them may ask
  whether something is "in view". To hide pop-in in SIDE7, new actors fade in over 0.5 s, a cosmetic effect.

**Input is screen-relative:** a stick maps to different world directions in different views. That is expected, and it
is not part of the simulation. Hash tests therefore drive **Intents** directly (section 7.5), never device input.

---

## 6. Tech stack and repository layout

### 6.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Engine base | **my-3D2dge v0.46.1, the full edition** (`engine/my-3d2dge.js`), vendored and pinned. | It is the richest edition: props, lighting, x-ray, Mover, perception, sessions and standard features. The agent edition leaves these out. MIT. |
| MOTOR and game code | **JavaScript (ES2022) modules, no runtime dependencies.** | The engine's idiom and doctrine (common ground, no deps). |
| Bundling | **esbuild** (pin exactly; 0.28.2 is current) bundles `src/main.js` into one IIFE. Content modules are **discovered at build time** (a sorted glob in a virtual module), so adding content never edits an index file. | Standard, fast, real imports. This deliberately departs from the engine's shared-scope file join (its D5, grandfathered there): this repository is not bound by D5, and modules give explicit seams for parallel work. Log it in DECISIONS. |
| Build | `tools/build.mjs` (about 100 lines) bundles, inlines the engine and the bundle into `src/index.template.html`, and writes `dist/index.html`. | One self-contained file that runs from `file://`, the engine's model. A rebuild of an unchanged tree must be byte-identical (tested). |
| Dev loop | `tools/serve.mjs` (`node:http`, no deps) plus esbuild watch. | Fast iteration in a browser. |
| Tests | `node:test` for unit and sim tests (the engine runs headless in Node). **Playwright pinned to 1.56.1** for browser tests. | 1.56.1 is the release built for the container's Chromium 141 / build 1194 (checked). Use `CHROMIUM_PATH=/opt/pw-browsers/chromium` and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. Outside the cloud, run `npx playwright install chromium`. The engine repo's `^1.56.0` resolves to 1.64.1, which expects Chromium 156: it works, but drifts. |
| Engine tools reused | The vendored `check.mjs`, `filmstrip.mjs` (`--seed`, `--compare`, `--expect-same`) and `replay.mjs`. | They are generic, and they import only `playwright` and Node built-ins. |
| Lint | ESLint flat config, pinned (10.x): `recommended` plus `no-undef`, and a **determinism rule** over `src/motor/{core,sim,nav,ai,play,mission,save}/**` and `src/game/**`. | The rule bans `Date`, `performance.now`, `setTimeout`, `setInterval` and `crypto`. It also bans `Math.random`, `E.rand`, `E.randInt`, `E.pick` and `E.chance`, which draw from `Math.random` (`ENG:229-235`) as draw code does; the simulation uses named streams instead. |
| Media | ffmpeg (bundled at `/opt/pw-browsers/ffmpeg-1011`). | Attract-mode MP4 and GIF captures for the README, made from the filmstrip frames. |
| CI | GitHub Actions `.github/workflows/ci.yml`: `npm ci`, build, lint, unit + sim, e2e smoke (Playwright installs Chromium in CI). | Keeps the PR green and makes handoff safe. **If pushing a workflow file is refused** (the GitHub App may lack the workflows permission): log it in DECISIONS, keep the file out of the push, and use `npm test` / `test:full` evidence in PROGRESS.md as the gate. Tell the owner they can add the file. |
| Cloud sessions | `.claude/settings.json` + `.claude/hooks/session-start.sh`: `npm ci` and `CHROMIUM_PATH`, as the engine repo does. | Future agents start ready. |
| Deploy | Static: `dist/index.html`. An optional `vercel.json`, or GitHub Pages: the owner's call. Never publish without the owner's go-ahead. | |

**Tools to install in M0:** `npm ci` (esbuild, playwright 1.56.1, eslint, optional terser). Chromium and ffmpeg already
exist in `/opt/pw-browsers`. Nothing global is needed. If a later need appears (an image diff, a WAV analyser), add it as
a pinned devDependency or a small script, and log the decision.

### 6.2 Repository layout

```
README.md                    the pitch, how to play, controls, Source Information, then the engine analysis (separate)
PLAN.md  GOAL.md  PROGRESS.md
package.json                 exact pins; "type": "module"
vendor/my-3d2dge/            the pinned upstream (MIT): engine/my-3d2dge.js, API.md, API-INDEX.md, AI_GUIDE.md,
  │                          docs/{STANDARD-FEATURES,ASSETS,MOCAP,LAB-3D}.md, tools/{check,filmstrip,replay}.mjs,
  │                          mocap/{readable,mocap}.js plus our cut clip set, LICENSE, UPSTREAM-README.md,
  │                          reference/ (stress.game.js, starter/30-shooter.js, 50-brawler.js, 70-stealth.js: read-only references)
  ├─ VERSION.json            upstream URL, version 0.46.1, the full commit, sha256 of every vendored file before and after patches
  └─ PATCHES.md              every GTM-PATCH: what, why, the hunk, its test, and upstream issue text
src/
  index.template.html        page shell: boot splash (E.bootSplash), meta, the Source Information and engine-analysis comments
  main.js                    entry point: make the game, register MOTOR systems and the discovered content, start the scenes
  motor/                     MOTOR, the open-city engine layer (generic: no Lowtown names in here)
    core/      registry.js bus.js tune.js rng.js clock.js schema.js log.js
    input/     bindings.js contexts.js activity.js glyphs.js prompts.js rumble.js
    world/     district-dsl.js builder.js validator.js citymap.js chunks.js spans.js decks.js zones.js pois.js interiors.js
    render/    projector.js floor-chunks.js deck-render.js view-manager.js depth/{top,side7,spans,lights,particles}.js
               sky.js fx-decals.js weather-fx.js
    sim/       actor.js intent.js ped.js ped-rig.js vehicle/{body,classes,model,damage,seats,tow,lights}.js
               projectile.js fire.js pickup.js prop.js world.js lod.js footprint.js
    nav/       roadgraph.js signals.js gps.js sidewalks.js
    ai/        driver.js traffic.js pedbrain.js crowd.js police.js gangbrain.js emergency.js autoplayer.js director.js
    play/      combat.js weapons.js wanted.js factions.js economy.js stats.js abilities.js switching.js
               photo.js collectibles.js completion.js
    mission/   dsl.js stages.js runtime.js objectives.js activities.js grading.js
    audio/     audiox.js voices.js sequencer.js radio.js composer.js sfxmap.js ambience.js
    ui/        layer.js tenfoot.js widgets/*.js hud.js radar.js mapscreen.js wheel.js phone.js menus/*.js toasts.js
               subtitles.js cards.js
    save/      save.js migrations.js
    debug/     handle.js deeplinks.js overlays.js devmenu.js perf.js
    index.js   MOTOR's public API (the only thing src/game may import)
  game/                      Grand Theft Moto content: data and scripts that register into MOTOR (found at build time)
    tune.js                  every gameplay number, as TUNE knobs
    districts/lowtown/       blocks.js roads.js landmarks.js zones.js spawns.js props.js
    districts/proving/       the developer Proving Ground
    interiors/bank.js
    vehicles/ weapons/ peds/ gangs/ characters/ shops/ properties/ missions/ activities/ radio/ reels/ scenes/
tools/   build.mjs serve.mjs test-run.mjs map-sheet.mjs shots.mjs perf.mjs soak-attract.mjs bot-campaign.mjs
         ui-audit.mjs pad-shim.js boundary-check.mjs vendor-check.mjs record-attract.mjs goal-sync.mjs
tests/   unit/ sim/ e2e/ recipes/ fixtures/
docs/    ARCHITECTURE.md CONTENT-GUIDE.md CONTROLS.md TUNING.md STYLE.md DECISIONS.md ENGINE-ANALYSIS.md
         FEEDBACK-FOR-ENGINE.md QA-DUALSENSE.md media/
.github/workflows/ci.yml   .claude/settings.json   .claude/hooks/session-start.sh
dist/index.html            built, committed, and checked current by the tests
```

### 6.3 npm scripts

| Script | Does |
|---|---|
| `build` | Bundle and inline into `dist/index.html`, and fail if a rebuild of an unchanged tree differs. |
| `dev` | Watch, rebuild and serve on `localhost:5173`. |
| `lint` | ESLint, plus three checks:<br>• `boundary-check`: no reach-through;<br>• `vendor-check`: checksums and the patch list;<br>• `goal-sync`: the prompt in GOAL.md and in PLAN.md section 20 are identical and under 4,000 characters. |
| `test` | The fast gate, under 6 minutes: lint, unit, sim smoke, e2e smoke (boot, title, play, each view, attract enter and exit), and `check.mjs` on the dist. |
| `test:full` | `test` plus 10-minute traffic and crowd sims, the wanted scenarios, the bot campaign, the attract soak, the UI audit, the screenshot matrix, perf, determinism and replay, recipes, and phone emulation. |
| `soak` · `bot` · `shots` · `perf` · `audit` | Each heavy suite on its own. Each takes `--seed`, `--minutes` and `--out`. |
| `check` | `node vendor/my-3d2dge/tools/check.mjs dist/index.html`. |

---

## 7. Architecture (MOTOR)

### 7.1 Layers and boundaries

```
src/game     content (Lowtown, the bank, the Proving Ground): data and mission scripts. Imports only src/motor/index.js.
src/motor    MOTOR: generic open-city systems. Uses only the public API of my-3D2dge (My3D2dge / E), plus the patches in section 12.
vendor/      my-3D2dge, patched minimally. Every change is marked `// GTM-PATCH(n)` and listed in PATCHES.md.
```

- MOTOR never imports game code. Content registers into MOTOR's registries when it loads.
- `tools/boundary-check.mjs` enforces two things:
  - no access to `._private` members of engine objects outside `vendor/`;
  - no `src/game` import from below `src/motor/index.js`.
- Rule: if a system can't be built without a reach-through, add a named, tested patch instead.

### 7.2 Step order

Each fixed step is the engine's 1/120 s step (`dt` = 1/120 × `timeScale`).

1. **Input.**
   1. Poll the raw device state (GTM-PATCH 4) and update the ActivityMonitor.
   2. The HumanController turns MOTOR's per-context bindings into an `Intent` for the possessed protagonist.
   3. The AI brains, time-sliced, write their own Intents.
2. **Scripts:** the mission and activity runtime resumes its stage generators; triggers and the attract director run.
3. **Actors:** peds (Mover/Body), vehicles (physics), projectiles, fire, pickups, props.
4. **Collisions and damage:** these emit BUS events (`crime`, `hit`, `explode`, `vehicleDamage` ...).
5. **Systems:** wanted, factions, economy and stats, the footprint-based spawners (section 5.7), emergency dispatch,
   the clock and weather.
6. **Presentation state:** the camera (target, look-ahead, speed zoom or climb, shake) and the UI model (HUD state,
   toasts, prompts). Nothing in the simulation reads these.

Each frame then draws:
1. the active view's world renderer;
2. actors;
3. particles;
4. lights;
5. the UI layer: HUD and menus.

**Draw never changes simulation state.** Headless runs skip drawing, so anything that happens in draw doesn't exist for
tests.

### 7.3 Determinism

- **Time:** take it from the engine's clock only (`dt`, `game.time`).
- **Banned in the simulation:** wall clock, timers, and `async` or promises. The lint rule enforces this (section 6.1).
  Boot steps may be async.
- **Gameplay randomness** comes from `MOTOR.rng.stream(name)`. It is `E.rng` (mulberry32) seeded from
  `hash(worldSeed, name)`. Each system has its own stream: `traffic`, `peds`, `police`, `gangs`, `loot`, `missions`,
  `weather`, `spawn`, `attract`.
  - A new feature takes a new sub-stream, so existing rolls never shift. This is Emberdeep's pattern
    (`src/emberdeep/32-wardens.js:151`).
- **Cosmetic randomness** (particles, rig blinks, flicker, fade-ins) may use `Math.random`, but only in render, UI and
  audio code. It must never feed back into the simulation.
- **`game.stateHash`** covers:
  - the protagonists' positions, quantized;
  - the vehicles' count and positions;
  - wanted heat and stars;
  - money and respect;
  - mission state;
  - the clock and the weather.

  It **excludes** the camera, the UI and audio.
- **Proofs:**
  - the same seed and the same Intent script give the same hash after N steps, with or without drawing;
  - the same hash whichever view is active (driven by Intents);
  - a session recorded with `?record=1` replays exactly through the vendored `replay.mjs`.

### 7.4 Registries, the BUS and TUNE

This is Emberdeep's proven pattern (`src/emberdeep/00-core.js:78-102`, `01-tune.js`), plus schema validation.

**Registries.** `def(kind, id, spec)`. Each kind declares a small schema (required fields, types, defaults) in
`core/schema.js`. A bad spec warns once through `E.warn` with the file and id, and falls back to defaults. The registry
kinds: `districts`, `interiors`, `zones`, `vehicles`, `vehicleModels`, `weapons`, `peds`, `outfits`, `gangs`,
`characters`, `abilities`, `crimes`, `policeTiers`, `missions`, `activities`, `events`, `reels`, `stations`, `songs`,
`ads`, `shops`, `items`, `properties`, `pickups`, `props`, `collectibles`, `stunts`, `races`, `glyphSets`,
`cameraShots`, `uiScreens`.

**The BUS.** `BUS.on(event, fn, scope)` and `BUS.emit(event, data)`. Scopes are `global`, `world` (cleared when a map
loads), `mission` (cleared when a mission ends) and `scene`. The catalogue, in `docs/ARCHITECTURE.md`:
- crime and police: `crime`, `witness`, `report`, `wanted`, `search`, `evaded`, `busted`, `wrecked`;
- combat: `hit`, `kill`, `explode`, `fire`;
- vehicles: `vehicleEnter`, `vehicleExit`, `carjack`, `vehicleDamage`, `vehicleDestroyed`;
- rewards: `pickup`, `cash`, `respect`, `stunt`, `collectible`, `stat`;
- missions: `missionStart`, `stageStart`, `stageFail`, `missionPass`, `missionFail`, `activityStart`, `activityEnd`;
- player: `switch`, `ability`;
- world: `view`, `radio`, `clock`, `weather`;
- save: `save`, `load`;
- attract: `attractBeat`;
- UI: `uiOpen`, `uiClose`.

**TUNE.** Every gameplay number is a knob in `src/game/tune.js`: `knob(section, id, label, default, min, max, step,
about)`. That covers handling, densities, footprint radii, wanted timers and thresholds, prices, damage and AI radii.
Overrides are saved apart from the game save. The dev menu builds a page for each section by itself.
`docs/TUNING.md` is generated from the knob list.

### 7.5 Actors, controllers and intents

- **Actor** (`sim/actor.js`): `id`, `kind`, `x, y, z`, `facing`, `health`, `armor`, `faction`, `tags`, `owner` (`mission`
  or `world`), `lod`. Its subclasses:

  | Subclass | What it is |
  |---|---|
  | **Ped** | Body: an `E.Mover` for protagonists, cops and story characters; an `E.Body` for crowds. Rig: `PedRig`, an `E.Humanoid` subclass with a weapon layer and accessories (the brawler kit's `class Fighter extends E.Humanoid` pattern, `src/starter/50-brawler.js:243-300`). Inventory, brain. |
  | **Vehicle** | Physics, model, seats, lights, radio, damage. |
  | **Projectile** | |
  | **Pickup** | |
  | **Prop** | Destructible: lamp post, hydrant, bin, phone booth, bench, newsstand, barrel. |
  | **Fire** | |

- **Intent** (`sim/intent.js`) is one struct used by every controller. **It is world-space**: the HumanController
  converts screen-relative sticks through the active view.
  - on foot: `move[2]`, `aim[2] | aimTarget`;
  - buttons: `sprint`, `jump`, `roll`, `crouch`, `attack`, `aimHold`, `interact`, `reload`, `ability`;
  - in a vehicle: `throttle 0..1`, `brake 0..1`, `steer -1..1`, `handbrake`, `horn`, `fire`, `nitro`;
  - UI: `wheel`, `phone`, `map`, `pause`, `view`, `switch`.
- **Controllers:**
  - `HumanController`;
  - `AutoPlayer`: attract and bot;
  - `PedBrain`, `DriverBrain`, `CopBrain`, `GangBrain`.
  - Ped and vehicle code reads an Intent and never `game.input`, so the attract AI drives the very same code paths as
    a player. This is Emberdeep's `h.bot ? h.bot.input : game.input` (`src/emberdeep/20-hero.js:193`), generalized.
- **Possession:**
  - the HumanController possesses one protagonist;
  - switching hands the previous one to an ambient brain;
  - vehicles take their Intent from the driver seat's occupant.

### 7.6 World model and scale

- **Building a map.** `world/builder.js` turns a district or interior definition (section 8.3) into a **CityMap**, from
  the seed and deterministically:
  - one engine `E.TileMap` for cells, heights, wall types (materials and facades) and floor tags. It is used for
    collision, sight, ledges, FlowField and ISO walls; its whole-map floor bake is never used;
  - **box spans** for the depth views;
  - a surface grid: asphalt, sidewalk, curb, crosswalk, grass, dirt, water, deep water, rail, deck, plus markings;
  - the **lane graph** and the **sidewalk graph**;
  - **decks** (elevated roads and bridges): `map.addSolids` raised solids for peds (GTM-PATCH 3), plus MOTOR
    collision for vehicles, plus render geometry, with clearance underneath;
  - **zones**: neighbourhood, gang turf, police patrol, no-spawn, water;
  - **POIs**: payphones, shops, the safehouse, the hospital, the precinct, doors, garages, stunt ramps;
  - spawn slots (parking, peds, gang hangouts) and collectibles.
- **Chunks:** 16×16 tiles (256 u). They hold floor textures, box spans, spawn bookkeeping, radar tiles and LOD.
- **Scale sheet** (1 tile = 16 u; tune these in the Proving Ground's scale yard):

  | Thing | Size (u) | Notes |
  |---|---|---|
  | Pedestrian | about 29 tall (Humanoid `size` .9); protagonists 1.0 (about 32) | Body r 5; eye 30, chest 22 (`E.HEIGHTS`) |
  | Car (Cortez) / sports / muscle | 58×26×22 / 60×26×18 / 60×27×20 | |
  | Van (Hauler) / fire truck | 66×30×34 / 96×32×42 | |
  | Moto | 30×10×18, plus the rider | |
  | Lane | 36 | traffic drives on the right |
  | 2-lane street | 5 tiles (80) | 4-lane avenue: 9 tiles (144), with an 8-u median |
  | Sidewalk | 2 tiles each side | curb 2 u: cars bump over it, peds step |
  | Building block | 12-16 tiles; the block pitch is about 22 tiles | storey 24 u: low-rise 1-3 storeys, mid 4-6, Neon Mile towers up to 8 (192 u) |
  | The Loop deck | z 64, 6 tiles wide (2+2 lanes) | pillars every 4 tiles; 4 ramps |
  | L track | z 100, 3 tiles wide | stations about 12 tiles long |
  | District | 160×160 tiles (2,560 u) | |
  | Footprint | activity radius 700 u; spawn annulus 620-760 u; full-physics LOD 400 u | all TUNE knobs, world units, view-independent (section 5.7) |
  | Speeds | walk 50, run 85, sprint 125 (Mover defaults); cars 180-300 u/s top; bikes about 290; police 270 | arcade feel first; tune by playtest |

### 7.7 The rendering architecture

| View | World | Actors | Lighting | Particles |
|---|---|---|---|---|
| ISO | MOTOR `floor-chunks` (affine `drawImage` per visible chunk), then engine `TileMap.queueWalls` (patched), then MOTOR `deck-render` (slab pieces through `r.queue`/`r.box`) | engine `r.actor` / `r.queue`: depth-sorted; `footprint` for long vehicles; the fast path except for named characters | engine canvas lighting (`game.lights`) | engine particles |
| TOP | MOTOR `depth/top`: ortho floor chunks, then height layers of lean-projected spans and decks | MOTOR draws rigs through cached top-down Views at `zoom × k(z)` | MOTOR light pass | `game.particles.list`, projected by MOTOR |
| SIDE7 | MOTOR `depth/side7`: rail rows from the floor chunks, spans and decks back to front | MOTOR draws rigs through the per-scale View cache (`view7` style) | MOTOR pools (`pool7` style) plus darkness | projected by MOTOR |

- **The Projector interface:** `project(x, y, z) → [sx, sy, scale]`, `actorView(x, y, z, facing)`, `depthKey(x, y, z)`.
  Vehicle models, props, markers and decals call it, so the same drawing code works in every view.
- **One light list:** `LightList` is filled once per frame, from streetlamps, neon, headlights, sirens, fires, muzzle
  flashes and explosions. In ISO it feeds `game.lights.add`; in TOP and SIDE7, MOTOR's light pass reads it.
- **The UI layer** (`ui/layer.js`) is a second canvas over the game canvas, with its own integer scale (section 8.18).
  It sets `pointer-events: none`, and maps clicks from the game canvas.

### 7.8 The save schema

Saves go through `E.store` (localStorage, the `my3d2dge:` prefix) under `GrandTheftMoto-5S:save:<slot>`. Settings and
tuning are kept apart from the save.

```js
{ schema: 1, game: 'GrandTheftMoto-5S', slot, label, playtime, gameDay, clock, weather,
  active: 'dex', protagonists: { dex: { pos, map, outfit, weapons, ammo, health, armor, stats, ability }, viv: {...}, gus: {...} },
  crewFund, respect: { saints, rats, gnomes }, missions: { done: [], medals: {} }, activities: { id: level },
  collectibles: [], stunts: [], properties: [], garage: [ { def, color, mods } ], completion, rngSeed }
```

- **Migrations:** `MIGRATIONS[n](data) → data`, tested with fixtures.
- **Loading** checks every field and fills defaults.
- **A corrupt save** is backed up to `…:bak` and the player is told.
- **Slots:** 3 manual slots and 1 autosave.
- **The attract mode and the Proving Ground never write.**

### 7.9 Agent operability

- **Console handle** `window.__gtm`:
  - objects: `{ game, world, player, REG, BUS, TUNE }`;
  - spawning and setup: `spawn(kind, id, at)`, `teleport(x, y)`, `setWanted(n)`, `setTime(h)`, `setWeather(w)`,
    `view(id)`;
  - missions: `startMission(id, { stage })`, `pass()`, `fail()`;
  - cheats: `give(item)`, `money(n)`, `respect(gang, n)`;
  - inspection and bots: `snapshot()`, `stateHash()`, `botRun(opts)`, `attract(seed)`.
- **`game.debug.snapshot()`** returns the player, view, mission, wanted and fps, which `check.mjs` prints.
- **`check.mjs` cycles `game.views || E.VIEW_ORDER` through `setView`** (`tools/check.mjs:77-79`). So set
  `game.views = ['iso', 'top', 'side7']`, and have MOTOR wrap *our game instance's* `setView`:
  - `iso` goes to the engine;
  - `top` and `side7` go to the view manager.

  The checker then exercises all three views.
- **Deep links:**
  - scenes: `#title`, `#attract`, `#play`, `#play/<poi>`;
  - missions: `#mission/<id>[/<stage>]`;
  - developer: `#proving[/<zone>]`, `#interior/bank`, `#ui/<screen>`;
  - query options: `?seed=`, `?view=iso|top|side7`, `?time=`, `?weather=`, `?kiosk=1`, `?dev=1`, `?record=1`,
    `?selftest=1`.
- **Dev menu** (`?dev=1`, or Settings → Developer):
  - god mode, no police, AI freeze, time scale, frame step;
  - spawning, teleport, the wanted level, time, weather;
  - mission and stage select, unlock all;
  - the overlays: lanes, nav, sight cones, chunks, spans, footprint rings, AI states, physics, perf;
  - the tuning pages;
  - record a session.

### 7.10 Running headless

- All of `src/motor/{core,sim,nav,ai,play,mission,save}` and `src/game` must load and run under
  `new E.Game({ headless: true })` in Node, in the vendored handoff test's pattern: the engine and the bundle in
  `node:vm`.
- DOM, Canvas and Web Audio are touched only in `render/`, `ui/` draw code and `audio/`, each behind `game.headless`.
- Emberdeep can't run headless because it touches `document` at load (`src/emberdeep/00-core.js:25`). We must not
  repeat that.

### 7.11 Performance budgets and LOD

- **Budgets come from measurement.** Spikes S1 and S2 (M1) measure what the dev container's GPU-less headless
  Chromium can do at a 480×270 buffer. Log the budgets in DECISIONS.
  - The targets to aim for: update ≤ 1.5 ms per step (≤ 3 ms per frame); draw ≤ 9 ms in ISO and ≤ 11 ms in TOP and
    SIDE7.
  - **The gates use medians** of the engine's `stats.updateMs` / `stats.renderMs` over set scenarios, with a 15%
    tolerance.
  - The p99 frame time is recorded and reported, but not gated: headless timing is noisy.
- **Fast-path rules:** the engine's changelog measured 100 barrels through the actor composite at about 57 ms, headless
  (`CHANGELOG.md:241`; `ENG:1779-1784`). So:
  - outlines, rim and x-ray only for named characters, the player and the player's vehicle;
  - vehicles are MOTOR polygons through `r.queue`, never outlined actors;
  - crowds are outline-free, `r.actor({ every: 2, key })` beyond a radius.
- **Resolution:** `res: 'ps1', expand: { maxW: 560, maxH: 320 }` (1080p gives 480×270 at S = 4).
- **LOD** uses world-unit rings around the focus (section 7.6), never the view:
  - **vehicles:** full tyre physics within 400 u; beyond that, kinematic lane followers out to the despawn edge;
  - **peds:** a full brain at 10 Hz near, coarse steps far;
  - **AI time-slicing:** brains are spread across steps by `id % N`.
- **Caps** (TUNE):
  - 28 moving vehicles, 60 active peds, 12 police units;
  - particles: the engine's 900; bullets: 800.

---

## 8. Systems

Each system follows the same headings:
- **Reuse:** what the engine already gives.
- **Build:** what MOTOR adds.
- **Data:** the registry spec, where there is one.
- **Accept:** the checks that prove it.

Every Accept item becomes a test or a recorded piece of evidence.

### 8.1 Input and the controller

- **Reuse:**
  - the engine's raw device handling;
  - DualSense detection (`padStyle`, `ENG:760-764`, matching `054c|playstation|dualsense|dualshock|wireless
    controller`);
  - deadzone and invert;
  - `input.rumble(strength, seconds)` (dual-rumble, `ENG:774-782`);
  - `input.rebind`, `unbind` and `consumeAll` for the menu actions.
- **Engine traps to design around:**
  - `input.use()` calls `clear()` and drops held buttons (`ENG:706-707`). Switching presets at runtime would close a
    held weapon wheel and lose R2 held while getting into a car;
  - the d-pad and arrows are permanently bound to the move actions (`FIXED_CODES`, `ENG:1048`);
  - `rebind`'s conflict check covers one map, so it would block per-context bindings (`ENG:737-741`);
  - the DualSense touchpad is button 17: outside `BINDABLE` (`ENG:1047`), and non-standard outside Chromium.
- **Build:**
  - **Raw state** (GTM-PATCH 4):
    - `input.raw.keys`: held key codes, unbound ones included;
    - `input.raw.pads[i]`: `{ id, buttons: [{ pressed, value }], axes }` for **every** connected pad;
    - the active pad is the last one used;
    - `input.raw.activity`: the step of the last activity of any kind.
  - **MOTOR bindings** (`input/bindings.js` + `contexts.js`):
    - per-context bindings over raw codes, for `onFoot`, `vehicle`, `menu`, `wheel`, `phone`, `photo`;
    - MOTOR's own conflict check per context;
    - stored apart from the engine's bindings, under MOTOR's settings key;
    - **never call `input.use()` at runtime.**
  - **Movement** comes from the left stick plus WASD only, so the d-pad is free for phone, wheel, radio and weapon
    cycling.
  - **Menus** keep the engine's menu actions (confirm, cancel, pause), so nobody locks themselves out.
  - **Analog:** triggers 0..1 from `button.value`; both stick vectors.
  - **The ActivityMonitor** reads `raw.activity`. It counts:
    - any `keydown`, bound or not;
    - mouse move, button or wheel;
    - pointer and touch;
    - any pad button;
    - any pad axis past the deadzone;
    - a trigger above 0.1.

    It ignores synthetic bot input. It drives the 10 s attract timer and the kiosk logic. The engine's `anyPressed()`
    only sees bound actions (`ENG:904`).
  - **Glyphs:** button icons drawn by code as pixel sprites (`input/glyphs.js`):
    - PlayStation: ✕ ○ □ △, L1 R1 L2 R2 L3 R3, Options, Create, touchpad, PS, the d-pad directions, the sticks;
    - Xbox, Switch, keyboard keycaps and the mouse.

    Text tokens like `"{a:interact} Steal"` resolve to the current device's glyph. The engine's pixel font has no ✕ ○ □
    △ and draws `?` (`ENG:1160`).
  - **Rumble profiles:** crash (by impulse), gunshot (by weapon), explosion, low health heartbeat, landing.
    - Scaled by the Vibration setting.
    - Off in the attract mode: Emberdeep forgets this (`src/emberdeep/97-rumble.js:9-16`).
  - **Accessibility:** hold or toggle for sprint, aim, crouch and the wheels. The L3+R3 chord fires when both land
    within 120 ms.
  - **Not available:** DualSense adaptive triggers and HD haptics aren't exposed by the browser Gamepad API (that would
    need WebHID). They are out of scope and noted in `docs/QA-DUALSENSE.md`.
- **Accept:**
  - unit tests: chords, hold/toggle, context switching that keeps held buttons, per-context rebind conflicts, glyph
    resolution;
  - e2e with `tools/pad-shim.js`, which overrides `navigator.getGamepads` with id
    `DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)` and a pad that isn't pad 0:
    - PlayStation glyphs show;
    - R2 at 0.5 gives throttle 0.5;
    - unplugging pauses play;
    - a stick or trigger alone wakes the attract mode;
    - every screen can be driven by pad, by keyboard only and by mouse only.

### 8.2 Camera and the view manager

- **Build:** `render/view-manager.js` owns:
  - the active view and the game instance's wrapped `setView`;
  - transitions and per-context memory;
  - the camera rig: focus, look-ahead, ISO zoom levels, the TOP climb, the SIDE7 rail and Auto-rail, shake, cinematic
    shots.

  It exposes the Projector for the active view.
- **Accept:**
  - switching views in a scripted Intent run leaves the sim hash unchanged;
  - a transition takes ≤ 0.35 s, with no frame over 33 ms;
  - the TOP climb is continuous;
  - ISO zoom changes keep frame medians within budget.

### 8.3 The city builder and the district DSL

- **Data:** `def('districts', 'lowtown', { size: [160, 160], seed, blocks, roads, decks, water, zones, landmarks, pois,
  props, doors })`. `def('interiors', 'bank', { ... })` uses the same builder.
  - **Blocks** are block-level ASCII plus building specs:
    - footprint, storeys, facade (an engine wall type: `face` material, windows, shutters, balcony, door chance);
    - roof (`tiles`, `slab`, `grass` and so on), clutter (AC units, water tanks, billboards), signage (neon text and
      colour);
    - a cut-away class.
  - **Road types:** `street`, `avenue`, `alley`, `deck`, `bridge`, `ramp`.
    - Lanes, the right-hand rule, crosswalks, signals (at avenue crossings) and stop signs (elsewhere) are derived
      automatically.
    - An override may say otherwise.
  - **Props** are placed by rule: lamps every N tiles, hydrants near corners, bins, benches, trees, payphones,
    newsstands. Each prop is drawn with `r.prop` / `r.shape`; solids are added in one `map.addSolids` call at build
    time.
- **Build:**
  - **`builder.js`** builds everything in section 7.6 from the definition and its seed. Facade and colour variations
    come from a seeded stream.
  - **`validator.js`** reports:
    - unreachable cells;
    - lanes with no way out;
    - POIs on blocked cells;
    - decks without ramps;
    - doors without interiors.
  - **`tools/map-sheet.mjs`** draws a PNG of the whole district, with lanes, zones and POIs, for review.
  - **Street look:** the brawler kit's street floor (`src/starter/50-brawler.js:38-62`) is a single-street strip, so
    treat it as a *reference for the look* (sidewalks, curb, gutters, asphalt, crosswalks, lane paint, manholes,
    puddles). Re-implement it as MOTOR's world-space surface painter. Its neon signs (165-170) and clutter (171-176) can
    be ported with attribution (MIT).
- **Accept:**
  - Lowtown builds headless in under 1.5 s;
  - the validator is clean;
  - every POI is reachable both by road and on foot (graph tests);
  - the map sheet is committed to `docs/media/`, with a verdict in PROGRESS.

### 8.4 ISO world rendering and the floor chunks

- **Reuse:**
  - the TileMap's walls, roofs, facades and materials (`ENG:4047-4103`, `4437-4483`), and its collision and height
    rules;
  - `r.prop` and `r.shape`; x-ray (player and player's car only); canvas lighting.
- **Build:**
  - **`floor-chunks.js`:**
    - each 256×256-unit chunk is baked once into a world-space canvas (1 texel per unit, the way the stress test's
      `floor7` bakes, but per chunk);
    - the bake draws surfaces, lane paint, curbs, manholes, puddles, oil stains, grass, water, and AO along wall bases
      (from map heights);
    - **ISO draws each visible chunk with one affine `drawImage`**, using the transform derived from `r.w` at three
      points and `imageSmoothingEnabled = false`; there is no re-bake on zoom or yaw;
    - TOP blits the same canvases scaled, and SIDE7 reads them row by row;
    - an LRU of about 48 chunks;
    - bakes are time-sliced, at most 2 per frame, and spill to the next frame;
    - the water shimmer and the wet sheen are separate passes;
    - **check this against the engine's own baked floor in screenshots.** If the affine blit reads noticeably softer or
      jaggier, add crisp per-view bakes for the 4 ISO yaws at the current zoom. Do it incrementally (a few rows per
      frame), and draw the affine version until a bake is ready.
  - **`deck-render.js`:** the Loop and the bridges are slabs one tile long, queued through `r.queue` with `r.box`: road
    texture on top, side faces, railings and pillars. A slab sorts by its own `x, y, z`, so actors under it and on it
    sort correctly.
  - The engine TileMap is used for walls with GTM-PATCH 1 (the visible window and the cut hook) and GTM-PATCH 2 (a
    bounded cache). **Never call `map.drawFloor`** on the city map: it bakes the whole map into one canvas per view,
    about 20 M px at this scale, with multi-second stalls (`ENG:4375-4412`).
- **Accept:**
  - ISO medians within budget at night in the rain, with 20 cars and 40 peds in view;
  - screenshots of each neighbourhood, day and night, pass the look checklist (section 10), with verdicts in PROGRESS;
  - `check.mjs` raises no "flat", "thin palette" or "low contrast" notes.

### 8.5 The depth renderer (TOP and SIDE-SCROLL MODE 7)

- **Build:** `render/depth/*`. The stress test's depth view (`src/stress.game.js:615-844`), generalized and chunked.
  - **Shared parts:**
    - `spans.js`: each chunk caches its **box spans**, with faces textured by wall type (the `face7` approach: a small
      canvas per type and height, plus a window grid and lit windows at night);
    - `lights.js`: the LightList as floor pools (the `pool7` approach) plus a darkness multiply pass;
    - `particles.js`: `game.particles.list`, projected and drawn;
    - a per-scale View cache for rigs (`view7`: scale in whole 1/16ths, cleared past 400).
  - **`top.js`:** see section 5.2.
    - the floor chunks, scaled;
    - then ascending height layers: ground actors, then span side faces facing the centre (trapezoids from
      `ortho × k(z)`), then roofs by height, then decks and what is on them;
    - `H` drives the speed climb.
  - **`side7.js`:** see section 5.3.
    - the rail and `proj` / `rowDepth`;
    - floor rows from the chunk canvases, with a 90° transform for east and west rails;
    - back to front: spans (`wall7`-style polygons), deck rows at their own height, props, actors;
    - the far fade and the sky;
    - the depth cut-away (`depthCut`);
    - Auto-rail.
- **Accept:**
  - both views render Lowtown with medians within budget;
  - in a 200-frame filmstrip of a street chase in SIDE7, nothing behind a building shows through it. Back the verdict
    with a fixture scene that has a known occluder;
  - TOP screenshots show GTA2's composition: lean toward the centre, roofs growing with height;
  - SIDE7 screenshots: the player shrinks walking north and grows coming back, as the stress test's own check does
    (`tools/stress-test.mjs`).
- **Fallback, if spike S1 says it isn't achievable** (log it as a decision): reduce SIDE7 to the stress test's exact
  method, with one rail heading (north) and no Auto-rail; reduce TOP's lean to walls and roofs only.

### 8.6 Lighting, time of day, weather and effects

- **Time:**
  - one game day = 24 real minutes (TUNE);
  - the sun's angle drives `lights.ambient`, `dark`, `tint` and `darkness` (ISO; the engine has no day/night helper,
    so animate those fields, `ENG:1313-1316`), MOTOR's darkness pass (TOP, SIDE7), and the backdrop blend (day, dusk,
    night, `city-night`);
  - streetlamps switch on at dusk; neon flickers; windows light at random at night.
- **Weather:**
  - states: clear, overcast, rain, storm (lightning flash and thunder), fog;
  - it changes every 1-3 game hours, from the `weather` stream;
  - rain: projected streaks, splashes, puddle shimmer, glow smears from lights on wet floors, traction × 0.8, and peds
    who hurry or shelter under awnings;
  - fog: a shorter SIDE7 far fade and dimmer neon halos.
- **Effects:**
  - skid marks: a ring buffer of world-space segments, drawn in the floor pass;
  - tyre smoke, scrape sparks, car fire, explosions (`particles.explosion`);
  - bullet impacts and shell casings;
  - pixel blood splats (a setting, on by default, GTA2 level);
  - hydrant water jets, broken-glass bits, debris.
- **Accept:**
  - a time-of-day filmstrip;
  - a weather × view screenshot matrix (5 × 3);
  - wet braking distance at least 20% longer than dry (a sim test).

### 8.7 The road network and GPS

- **Build:**
  - **`nav/roadgraph.js`:** lane segments derived from road cells; intersections with turn connectors (Bezier); lane
    change zones; parking slots; deck lanes at their own z, and ramps;
  - **`signals.js`:** phase controllers and stop-sign logic;
  - **`gps.js`:** A* over the lane graph for the player's route (waypoint or objective) and for AI drivers. It
    recomputes when the player leaves the route, and draws the route on the radar;
  - **`sidewalks.js`:** the ped graph, with crosswalks tied to the signals.
- **Accept:**
  - every lane is reachable;
  - no dead ends except marked ones;
  - A* matches Dijkstra on 1,000 random pairs;
  - a recompute takes < 2 ms;
  - signal timing tests pass.

### 8.8 Vehicles

- **Reuse:**
  - lights, `particles.explosion`, `game.hitFx`;
  - Emberdeep's powder-keg chain explosions as the model for cars that set each other off
    (`src/emberdeep/45-mechanics-core.js:30-43`);
  - `E.ACTIONS` for paired actions (`ENG:5496-5512`; `takedown` is the template, `5587-5609`);
  - mocap clips `Driving_Loop`, `Sitting_Enter` and `Sitting_Exit` (`src/mocap/catalogs/quaternius.json`).
- **Don't use:**
  - `E.Body`: a circle with no heading;
  - `r.shape`: its facing snaps to 32 steps, and a cache of 800 pictures churns across models and colours;
  - `r.sprite`: no rotation;
  - `map.solid` for moving things: every call bumps `map.version` and re-bakes the caches.
- **Build:**
  - **Physics** (`sim/vehicle/body.js`):
    - a 2D rigid body with bicycle-model tyre forces: slip angle; μ by surface and weather; the handbrake drops rear
      grip, which makes drifts;
    - a torque curve and an automatic gearbox (it feeds the audio RPM); brakes; drag; rolling resistance;
    - cosmetic body roll and pitch;
    - collisions:
      - an OBB against TileMap heights: curbs ≤ 4 u climb, walls stop;
      - against decks;
      - car against car: SAT, impulses, restitution 0.2;
      - against peds: a knockdown by relative speed;
      - against props: lamps fall, hydrants spray, bins scatter;
    - airborne off ramps and deck edges: ballistic z and a suspension squash on landing;
    - fixed substeps at high speed, so nothing tunnels at 400 u/s.
  - **Classes:**
    - `car`;
    - `truck`: heavy, wide turning circles;
    - `tow`: a hook with a spring-damper joint to the towed car;
    - `bike`: lean, a cosmetic wheelie, the rider thrown off in a hard crash;
    - `boat`: water cells only, a buoyant bob, a wake;
    - `heli`: **AI only** in the slice (the police chopper): altitude, hover and tilt, a spotlight;
    - `rail`: **AI only**: the L loops on a spline, stops at stations, is deadly to peds and cars, and can't be boarded
      in the slice.
  - **Models** (`sim/vehicle/model.js`): data such as
    `{ parts: [{ box: [x0, y0, z0, x1, y1, z1], mat, role: 'body' | 'cabin' | 'glass' | 'wheel' | 'light' | 'siren' | 'bumper' }], seats, doors, lights, palette }`.
    - Vertices are projected through the Projector into per-face `px.poly`s, drawn on the fast path and shaded with
      `E.tones` by face normal and sun.
    - Front wheels steer visibly.
    - **Damage:** dented vertices per zone, smoke at 40%, fire at 15%, an explosion 4 s later. A car that rolls over
      lands upside down and burns.
  - **Variants:** `def('vehicles', id, { model, palette, handling, role, ... })` reuses a model with its own paint,
    handling and role. Examples: the Retiree and the Fed Sedan are Cortez variants; the Medic, MPD Rhino and Strongbox
    are Hauler variants.
  - **Seats and getting in:**
    - getting in, getting out and carjacking are `E.ACTIONS` beats: walk to the door, open it, (yank the driver out),
      sit (mocap);
    - the jacked driver tumbles and either flees or fights;
    - getting out above 60 u/s is a dive roll;
    - passengers;
    - police cars are locked: breaking in takes 1.2 s and raises heat;
    - bikes are mounted at once.
  - **Lights:**
    - headlights: in ISO, pools plus a drawn beam (section 5.1); in TOP and SIDE7, MOTOR's beams;
    - brake and reverse lights;
    - sirens: alternating red and blue emissives plus lights.
  - **Radio:** a default station per class; switch with ← and →.
  - **Mods** (Boom Box Garage): paint, armour (health ×1.5), nitro (L1), oil slick, mines, a roof MG (fires with ○),
    and a car bomb (set on exit, triggered by ignition or by remote from the phone).
- **Data:** `def('vehicles', 'cortez', { model: 'cortez', class: 'car', mass, power, top, grip, brake, steer, drift,
  health, seats: 4, radio: 'neon', spawn: { zones, weight, timeOfDay }, price, tags })`.
- **Accept:**
  - a headless handling suite on the Proving Ground's track:
    - 0-200 u/s time within ±10% of spec;
    - braking distance, dry and wet;
    - skidpad lateral grip;
    - a handbrake drift reaches its yaw-rate threshold;
  - no tunnelling at 400 u/s;
  - getting in, getting out and carjacking from all 4 sides;
  - a tow joint stays stable for 60 s;
  - chained explosions;
  - a model sheet of every vehicle definition in 3 views, in `docs/media/`, with a verdict.

### 8.9 Traffic AI

- **Build:** `ai/driver.js`, `ai/traffic.js`.
  - **`DriverBrain`:**
    - lane following by pure pursuit;
    - IDM car following, with a desired speed set by road class, time, weather and personality;
    - obeys signals and stop signs;
    - turns chosen by weighted road class; lane changes on multi-lane roads;
    - yields to peds in crosswalks;
    - honks when blocked for 2 s; goes around stopped obstacles;
    - **panic** (shots or explosions nearby): flees and ignores the signals;
    - **after a crash:** stops, then gets out angry or flees;
    - **pursuit** (police): A* to the target, direct steering when close, ram/PIT;
    - pulls right for sirens.
  - **Spawner** (`sim/footprint.js`):
    - density by zone, time and weather;
    - spawns **only in the world-space annulus** around the focus (section 7.6), and fades new arrivals in;
    - despawns beyond its outer edge;
    - parked cars are seeded per slot, persist, and wake when touched.
- **Accept** (a 10-minute headless sim of Lowtown):
  - no deadlock: no car stopped over 20 s without a cause;
  - no cars inside each other;
  - zero signal violations by calm drivers;
  - average speed inside its band;
  - no spawn inside the annulus's inner radius;
  - within the perf budget.

### 8.10 Pedestrians, crowds and emergency services

- **Reuse:**
  - `E.sees` / `E.hears` / `E.Suspicion` (`ENG:5821-5877`);
  - the brawler kit's knockdown recipe (`src/starter/50-brawler.js:358-403`) and `E.ACTIONS.getUp`;
  - mocap clips: `Idle_TalkingPhone_Loop`, `Sitting_Idle_Loop`, `Dance_Loop`, `Help_Two_Arms` (cower), `Run_Stealth`,
    `Crawl`, and CMU `Fall_On_Face` / `Get_Up_*`.
- **Build:** `ai/pedbrain.js`, `crowd.js`, `emergency.js`.
  - **The ped brain** is utility AI at 10 Hz:
    - wanders between POIs on the sidewalk graph;
    - idles: phone, chat, bench, window-shopping, hailing a cab;
    - crosses at crosswalks on the signal;
    - shelters from rain.
  - **Reactions:**
    - **flee:** from gunfire, explosions, or a car on the sidewalk; directed away from the threat with a sidewalk-graph
      bias;
    - **cower:** when aimed at;
    - **fight back:** tough peds and gang members;
    - **witness:** phones the police after 2-4 s (interruptible), which makes a `report`;
    - **knocked down:** by a car, a blow or an explosion;
    - **dead:** the body lies for 60 s.
  - **Gangs and cops:** gang members hang out on and patrol their turf; foot cops patrol near the precinct.
  - **Emergency services:**
    - an ambulance (the Medic) comes to bodies; the paramedics may revive non-story peds;
    - a fire truck (the Pumper) comes to car and prop fires and uses its water cannon;
    - the police answer reports.
  - **The Marching Mimes:** a troupe of 6 walking in single file. Hurt one and they all attack. Flatten them all with a
    vehicle for **ENCORE!**
- **Accept** (a 10-minute crowd sim):
  - no ped stuck over 15 s;
  - fleeing moves away from the threat;
  - a witness's call leads to a dispatch, and killing or scaring the witness cancels it;
  - each reaction can be seen in a filmstrip, with a verdict.

### 8.11 Protagonists, switching, abilities, stats and outfits

- **Protagonists** (`def('characters', ...)`):
  - each of the three persists in the world: position, map, vehicle, health, weapons, outfit, stats;
  - they share a *crew fund* (one wallet, a simplification; log it).
- **Switching:**
  - hold d-pad ↓ for the character wheel: 3 live portraits (`rig.drawPortrait`), each with a status line;
  - release, and the camera climbs (TOP, `H` up to 2,500, 0.8 s), pans, and drops (0.8 s);
  - the arrival starts a short **vignette**: Dex tuning his moto, Viv in a diner booth, Gus arguing with a parking
    meter;
  - switching is blocked while wanted or in a mission, unless the mission allows it.
- **Abilities** (meters filled by playing in character):

  | Ability | Who | Effect |
  |---|---|---|
  | **OVERDRIVE** | Dex | time × 0.5, handling × 1.3, 8 s |
  | **DEAD CALM** | Viv | time × 0.35 while aiming, accuracy and damage up |
  | **RED MIST** | Gus | damage taken × 0.5, melee knockback × 2, 10 s |

- **Stats** (0-100, raised by doing):
  - **Driving**: time at speed, near misses;
  - **Shooting**: hits;
  - **Stamina**: sprinting;
  - **Stealth**: sneaking, takedowns;
  - **Strength**: melee.

  They act on handling, spread, sprint length, noise radius and melee damage.
- **Outfits:** 3 per protagonist, sold at Threads. Each is a set of Humanoid colours, an outfit and a hat.
- **Accept:**
  - a switch between every pair;
  - the vignettes play;
  - abilities pass their unit and sim tests;
  - stats survive a save round-trip.

### 8.12 Combat and weapons

- **Reuse:**
  - `E.Bullets` (the `ground` plane) as a pool, `E.Attack` / `E.Combo` / `E.MOVES` (`jab cross hook uppercut overhead
    bash`), `E.knockback`, `game.hitFx`;
  - `rig.hand()` / `rig.tip()` / `rig.worldOffset()`;
  - mocap: `Pistol_*`, `OverhandThrow`, `Punch_*`.
- **Build:**
  - **Aiming:**
    - the right stick sets the aim direction (twin-stick);
    - the mouse aims at the ground cursor (`game.mouseGround()` in ISO; MOTOR unprojects in TOP and SIDE7);
    - **L2 locks on** to the nearest valid target in a 70° screen cone, and a right-stick flick switches target;
    - aim assist has levels off, low, standard.
  - **Weapons registry:** `{ slot, ammo, mag, rate, spread, damage, range, projectile: 'bullet' | 'pellets' | 'rocket' |
    'molotov' | 'grenade' | 'stream' | 'zap' | 'photo', sound, recoil, rumble, model, price, unlock }`.
  - **Weapon layer:** `PedRig` draws weapon models at the hand joints. The engine's `weapon: 'gun'` is a one-handed
    pistol only (`ENG:3595-3598`). Long guns use `point: true` plus `aim` and a drawn stock. Bring the off hand to the
    foregrip where the rig allows it; otherwise use a stylized shouldered pose, and log it.
  - **Hits:**
    - **MOTOR's own hit loop over `shots.list`**, with a z filter (ignore |dz| > 20) and OBB tests against vehicles and
      props. `Bullets.hit` can't refuse a hit, because the bullet dies right after the callback (`ENG:5915`), and its
      hits are 2D circles;
    - tracers; shell casings.
  - **Melee:** fist combos; bat swings (`overhead`, `slash`) with a bat model; knockdown.
  - **Explosives:**
    - grenades arc and bounce;
    - Molotovs leave burning ground that spreads to peds and cars;
    - rockets: a straight line and a splash;
    - car explosions chain.
  - **Fire** (`sim/fire.js`): burning cells and objects that spread and burn out. Rain and the fire truck put it out.
  - **Cover-lite:** crouching behind low walls or cars lowers the `exposure` that `E.sees` reports, which lowers enemy
    accuracy. There is no snap-to-cover.
  - **Health:** 100. It regenerates to 50% when out of combat (GTA V). Armour 100.
  - **Drive-by:** ○ fires the current pistol or SMG toward the right stick, or at the auto-target.
  - **Pickups:** weapons, ammo, health, armour, cash, police bribes (★ -1), Moto Tokens.
- **Accept:**
  - the Proving Ground's range: DPS within spec for each weapon;
  - lock-on selection tests;
  - Molotov spread;
  - z-aware hits: a roof shooter against a street target;
  - drive-bys on both sides.

### 8.13 Wanted level and police

- **Crimes** (`def('crimes', ...)` with heat), from mild to severe:
  - speeding or running a red near cops;
  - trespass in mission areas;
  - property damage;
  - shots fired;
  - car theft (if seen);
  - assault, robbery;
  - explosions;
  - murder, cop assault, police car theft, cop murder.
- **Detection:**
  - **cops** see directly: `E.sees` plus a `Suspicion` per cop, and an alert files a report;
  - **civilian witnesses** phone it in;
  - **mission CCTV** in the bank.
- **Heat to stars** (TUNE): 20 / 60 / 150 / 300 / 600. Missions can set a floor or a cap.
- **Dispatch tiers** (`def('policeTiers', ...)`):

  | Stars | Response |
  |---|---|
  | 1★ | The nearest patrol car and foot cops. They try to arrest first. |
  | 2★ | More cruisers, and they shoot. |
  | 3★ | The MPD Eye chopper (a spotlight at night, it follows line of sight), and **roadblocks** on the predicted route, placed in the world-space annulus ahead. |
  | 4★ | SWAT vans and spike strips. |
  | 5★ | Feds: black sedans, flanking, rifles. |

- **Search and evade** (GTA V):
  - while any unit has line of sight, the stars are solid and the last-known position updates;
  - lose sight and the stars flash: units converge on the last-known position and search outward;
  - the search radius shows on the radar, with cop sight cones (a toggle);
  - stay out of every cone for 10 / 15 / 25 / 35 / 45 s (by star) and the stars clear;
  - alleys, under decks and parking structures cut exposure.
- **Clearing the stars:**
  - Spray & Pray (not while seen; costs money);
  - a bribe pickup (★ -1);
  - some mission passes;
  - wrecked or nabbed.
- **NABBED:**
  - on foot when cuffed: a cop reaches you while you're slow or unarmed;
  - or in a stopped car with a cop at the door for 1.5 s;
  - then the bust camera, a respawn at the precinct, a fee, and weapons lost (not mission items).
- **WRECKED:** a respawn at the hospital, and a fee.
- **Accept** (scenario sims):
  - crimes with and without witnesses; killing a witness cancels the report;
  - the stars escalate on time;
  - the chopper arrives at 3★;
  - roadblocks spawn ahead, inside the annulus;
  - hiding clears the stars in the expected time;
  - the respray clears them;
  - every condition for being nabbed.

### 8.14 Gangs and respect

- **Data:** `def('gangs', id, { name, colors, icon: 'diamond' | 'triangle' | 'circle', pattern, turf, hq, phone, rival,
  vehicles, weapons, peds, thresholds: { hostile: -20, friendly: 40 }, chain })`.
- **Respect** runs -100..100 per gang:
  - missions ±;
  - killing a member -5;
  - killing a rival +1;
  - damaging their cars -2.
- **Behaviour:**
  - **hostile** members attack on sight inside their turf;
  - **friendly** members help in fights and ignore small offences;
  - gang cars patrol their turf;
  - rival patrols that meet start a spontaneous turf war;
  - turf shows on the map, hatched in the gang's colour and pattern.
- **Accept:**
  - respect maths tests;
  - the hostility threshold switches;
  - a 5-minute gang sim with no errors;
  - a turf war breaks out at least once in 10 minutes with seed 1.

### 8.15 The missions and activities runtime: a DSL built on stages

**Why stages.** A single generator can't be resumed halfway through after a failure or from a link. So a mission is an
**ordered list of stages**. Each stage has:
- a `setup` that restores the world state it needs (spawns, mission entities, the protagonist's loadout, the time and
  the place);
- a `*run` generator.

Retrying, and every deep link, restarts a stage from its setup. **Freeze this contract in M1, before fan-out A2.**

```js
defMission('saints_holy_rollers', { title: 'Holy Rollers', giver: { phone: 'saints' }, gang: 'saints', tier: 1,
  requires: ['prologue'], brief: ['Father Fender needs three cars blessed by midnight.'],
  rewards: { cash: 2500, respect: { saints: +15, rats: -5 } },
  bonus: [{ id: 'time', text: 'Under 6:00', check: m => m.elapsed < 360 }],
  stages: [
    { id: 'steal',   setup(m) { m.spawn.vehicle('saint', at.showroom, { tag: 'target' }); }, *run(m) { /* ... */ } },
    { id: 'deliver', setup(m) { m.place(m.player, { in: m.tagged('target')[0] }); },        *run(m) { /* ... */ } },
  ] })
```

**The `m` API** (generator-friendly; each call yields until it is done):

| Group | Calls |
|---|---|
| Objectives | `objective(text, { hint })`, `marker(at or actor, opts)`, `route(to)` |
| Waiting | `waitUntil(pred)`, `wait(s)` |
| Talking | `say(lines, { name, portrait })` (subtitles and live portraits), `cutscene(shots)` |
| Spawning and placing | `spawn.vehicle / ped / pickup / prop(...)`, `place(actor, at or { in })`, `tagged(tag)` |
| Verbs | `deliver({ what, to })`, `chase(target)`, `follow(target, { dist })`, `protect(actor)`, `race(course)`, `timer(s)` |
| Wanted | `wanted.set / floor / cap / clear` |
| Flow | `failIf(pred, reason)`, `parallel([...])`, `first([...])`, `choice(options)` |
| Characters | `switchTo(character)` |
| Ending | `reward()` |

- Everything spawned is tagged `owner: 'mission'` and released when the mission ends.

**Hints for the bot.** Every objective names an AI hint. The hints **carry data**: a goal position or route, the
vehicle to enter, the targets, a stealth path made of waypoints and cover points, a race line. The kinds:
- `goto`, `enterVehicle`, `kill`, `deliver`, `evade`;
- `follow`, `race`, `photo`, `stealth`.

The AutoPlayer can play any mission from its hints. That proves the missions can be finished, and it gives the attract
mode its moves.

**Runtime:**
- one main mission at a time, plus activities;
- **a failure** shows **JOB BLOWN**, then *Retry this stage* or *Quit to free roam*;
- **a pass** shows **JOB DONE!**, the rewards, the bonus objectives and a medal (bronze, silver, gold).

**Activities:** `defActivity(id, { start, levels, stages })` uses the same staged form. Repeatable, scaling by level.

**Accept:**
- DSL unit tests, including stage setup idempotence: a setup run twice gives the same state;
- **every mission passes headless through the bot with seeds 1-3**;
- every fail condition fires;
- retry restarts the stage cleanly;
- no leftover mission entities once a mission ends (a count check);
- `#mission/<id>/<stage>` lands at the right moment.

### 8.16 Economy, shops, properties, collectibles and completion

- **Cash:** from missions, jobs, hold-ups, stunts, cash pops and properties. It's spent in shops, on respray, mods,
  outfits, cabs, fees and donations.
- **Seven shops:**
  - the screens are 10-foot item cards, ≤ 6 per page;
  - buying is fast: ✕, then confirm only above $5,000;
  - the shops: Lead Farm (weapons, ammo, armour), Boom Box Garage (mods), Spray & Pray (respray and paint), Threads
    (outfits), the Greasy Spoke diner (full health), Gas'n'Sip (snacks, a small heal), Kwik-Lux (can be held up).
- **Two properties:** the Palm Car Wash and the Pixel Palace Arcade. Each pays income at every in-game midnight, which
  you collect at the property.
- **Completion:** one checklist that sums to 100%: missions, jobs (level 3), races, MAYHEMs, stunts, tokens,
  properties. The stats screen shows it as cards.
- **Cabs:** phone → Contacts → Lowtown Cabs → choose a destination on the map → a fade, a fee, and you're there.
- **Accept:**
  - purchase, ownership and income tests;
  - completion adds up to exactly 100;
  - collectibles survive a save.

### 8.17 Audio and radio

- **Reuse:** `game.audio.sfx` and its presets, `audio.ctx` (public, `ENG:6040-6075`), and the engine's note and drum
  syntax for song data.
- **Not reused for the radio:** the engine's `music()`. It has one slot, schedules with `setInterval` against the
  realtime context, and always starts at step 0 (`ENG:6140-6170`). That rules out:
  - a station that keeps playing while you're away;
  - radio under mission music;
  - offline tests.

  It can still serve the title jingle.
- **Build:**
  - **`audio/sequencer.js`:** MOTOR's own look-ahead sequencer.
    - It runs on any `BaseAudioContext`: the realtime one in play, an `OfflineAudioContext` in tests.
    - It reads song objects in the engine's note syntax.
    - Many sequences can run at once. Each has its own position, so a station's timeline continues while it is off.
  - **`audio/audiox.js` + `voices.js`:** continuous voices:
    - the engine hum: 2 oscillators plus filtered noise, pitch from RPM;
    - tyre squeal, by slip;
    - sirens: two-tone and wail, with Doppler;
    - rain and wind;
    - the crowd murmur and the city hum, by zone;
    - stereo pan and distance falloff;
    - a voice limit.

    Everything routes through the engine's buses, which GTM-PATCH 5 makes public as `audio.bus(name)`. Volume and mute
    are respected.
  - **Radio:**
    - `def('stations', id, { name, freq, dj, genre, color, songs, ads, jingle })`;
    - **`composer.js`** turns genre templates (tempo, scale, progressions, drum patterns, lead rules) and a seed into
      songs;
    - a station is a timeline: song, then a DJ line, an ad and a jingle. DJ and ad lines show as subtitles; there are no
      voices;
    - four stations (section 9.9), plus Off;
    - each vehicle class has a default station.
  - **Score:** missions may ask for tension layers (`m.music('chase')`). The radio ducks under them.
  - **SFX map:**
    - footsteps by surface; guns; impacts; glass; explosions;
    - horns by class; doors;
    - payphone rings, each gang's distinct;
    - UI sounds: move, confirm, back, error;
    - pickups; cash.
- **Accept:**
  - the audio graph builds with no errors in headless Chromium (autoplay flag);
  - the voice and node count is stable over a 10-minute soak;
  - the radio timeline is deterministic per seed;
  - each station's first 10 s, rendered offline, is not silent (RMS over a threshold);
  - volume and mute are respected.

### 8.18 UI/UX: the 10-foot kit and the screens

**Rules** (they are tested by `tools/ui-audit.mjs`):
1. **Canvas pixel UI is primary.** The engine's HTML `E.Shell` and HTML standard menus are not TV-scaled: fixed 11-14
   px CSS and no UI scale (`ENG:7412-7444`). Start the game with `menu: false, corner: false` and draw our own, keeping
   `game.settings` and the input APIs underneath. Keep the engine's auto-pause (page hidden, controller unplugged), and
   route it to our pause screen. Log this as a decision; it is also engine feedback.
2. **The UI layer:**
   - HUD and menus draw into MOTOR's own UI canvas (section 7.7), at an integer scale chosen by **HUD size**:
     *Standard* = the game's S; *Large* = S + 1; *Huge* = S + 2, where at least 320×180 UI pixels still fit;
   - text is always whole-pixel crisp;
   - the 5×7 font at scale 1 on the UI layer is at least about 28 device px at 1080p;
   - never the 3×5 `tiny` font.
3. **Lists:**
   - **≤ 6 items visible per page.** Longer lists (Display settings, rebinding with about 20 actions per context) page
     by group, with a visible page indicator "2/4";
   - one decision per screen;
   - a strong focus highlight: a 2-px frame, a pulse, a 1-px lift;
   - every screen has a visible button legend in the player's glyphs.
4. **Navigation:**
   - ✕ confirms, ○ goes back;
   - **L1/R1 change tabs only.** Filters and sub-lists use □ or the d-pad;
   - △ is a secondary action;
   - Options closes everything.
5. **Layout:**
   - 5% safe-area margins;
   - no tables or grids of numbers: stats are big cards (≤ 6 per page) and the map is a big zoomable map.
6. **Every screen works by pad, by keyboard, and by mouse:** hover focuses, a click confirms, the wheel scrolls.
7. **Sound:** a sound on move, confirm, back and error.
8. **Readability:**
   - subtitles on by default, with the speaker's name in colour;
   - gang and marker identities by colour, icon shape *and* pattern.

**Widgets:**
- **Basic controls:** focus list with paging, card grid (≤ 6), tabs, slider, toggle, left-right choice.
- **Wheels:**
  - the radial wheel: 8 slices, chosen by stick angle, at 30% slow motion;
  - the character wheel.
- **Prompts and messages:**
  - a prompt (glyph + verb, with a hold-progress ring);
  - the objective line; subtitles; toasts;
  - big-number pops (`$+500`, `+RESPECT`);
  - the results card.
- **The radar:**
  - it turns with the vehicle and is north-up on foot;
  - the GPS line;
  - blips with shapes, and up/down arrows for height;
  - the search circle and cop cones.
- **Status:**
  - wanted stars, which flash while searching;
  - money, weapon and ammo, health and armour, the ability meter;
  - the radio toast; an optional speedometer.

**Screens:**
- **Title:**
  - the GRAND THEFT MOTO logo (`E.font.title`, extruded gradient) over a live, slow fly-over of Lowtown;
  - CONTINUE, NEW GAME, LOAD, SETTINGS, EXTRAS. EXTRAS holds the Proving Ground and Credits & About.
- **Pause:** tabs MAP, BRIEF, STATS, SETTINGS, HELP; ○ resumes; QUIT asks first.
- **Map** (the pause's first tab, and the touchpad's shortcut):
  - pan with the left stick, zoom with L2/R2;
  - △ toggles the legend, ✕ sets a waypoint, □ cycles the category filter.
- **Settings:**
  - Controls: the layout diagram in glyphs; rebinding per context, paged; sensitivity, invert, vibration, glyph style
    (Auto/PS/Xbox/Keyboard);
  - Display: default view, Auto-rail, Sharp SIDE7, HUD size, subtitles, colourblind mode, shake, flashes, reduce
    motion;
  - Audio: master, music, radio, effects, DJ chatter;
  - Game: difficulty, aim assist, autosave;
  - Accessibility: the hold/toggle options.
- **Load and save:** 3 big slot cards.
- **The phone:** Contacts, Texts, Jobs, Snap, Settings. Big icons, one column.
- **Shops; mission results; NABBED and WRECKED cards.**
- **Help:** a one-page-per-topic field guide.
- **Credits & About:** the Source Information block (section 1), then, as a separate card, the engine-analysis summary
  (section 18), then the engine credit and its MIT notice.
- **The kiosk overlay.**

**Onboarding:** a contextual prompt the first time each verb becomes possible ("△ Steal", "R1 Handbrake"). The prologue
mission teaches the core loop. Nothing needs a manual.

**Accept:** `ui-audit.mjs` walks every screen by synthetic pad input and asserts:
- the focus is visible;
- ≤ 6 visible items per page;
- every text is at UI-layer scale ≥ 1;
- every glyph token resolves;
- nothing falls outside the safe area.

It also captures screenshots at 1920×1080 and 1280×720, with verdicts. Separate passes check keyboard only and mouse
only.

### 8.19 Saving and loading

As section 7.8.

- **Accept:**
  - save round-trips;
  - a v0 fixture migrates to v1;
  - corrupt JSON is handled;
  - autosave fires after missions and jobs;
  - the attract mode and the Proving Ground never write (a spy on `E.store.set`).

### 8.20 Attract mode, AutoPlayer, director, kiosk and mobile

**Into the attract mode:**
- 10.0 s of idle (the ActivityMonitor, any device) on the title **or any menu opened from it** goes to a dedicated,
  non-pausable `attract` scene through a fade. The one exception: while a rebind is waiting for a key.
- It is **isolated**:
  - a fresh world from `attractSeed + loop`, with its own state objects;
  - no saves, stats or records;
  - rumble off;
  - audio only if the browser has already unlocked it.

**Out of it:**
- **Any** input from any device leaves it. That includes Options/Start, which would otherwise pause, and an unbound key,
  a mouse move or a stick nudge.
- On that input: `input.consumeAll()`, then `game.go('title')` in the same step, with a fade ≤ 0.2 s.
- The title's idle timer restarts. The input that woke it never triggers a title action.

**The AutoPlayer** (`ai/autoplayer.js`) writes Intents through the same controllers as a player:
- it drives on GPS routes with a player-style DriverBrain (fast, drifting at corners, near misses);
- it locks on and shoots;
- it evades: routes away from units, to hiding spots;
- it follows mission hints;
- for the bot campaign only (never the attract mode), it may travel by the cab skip or the dev teleport.

**The director** (`ai/director.js`) plays **5 reels** (section 9.11). Each reel scripts:
- its setup: time, weather, spawn, wanted level;
- the AutoPlayer's goals;
- a camera plan: the views and cinematic shots, so **all three views and the bank interior are shown**;
- captions: "THREE WAYS TO SEE LOWTOWN", plus a DEMO badge, a logo bug and a blinking "PRESS ANY BUTTON".

**Running forever:**
- **Watchdog:** no progress for 6 s, or a reel past its time, cuts to the next reel.
- **Interstitials** every 2-3 reels:
  - the title card;
  - HOW TO PLAY (a controller diagram in PlayStation glyphs);
  - LOWTOWN'S MOST WANTED (local records).
- **It loops forever,** rotating seeds. Memory stays flat.

**Kiosk and mobile:**
- **Triggers:** `?kiosk=1`, or a coarse pointer (`matchMedia('(pointer: coarse)')`) with no keyboard or pad detected.
  Either boots straight into the attract mode.
- **No touch controls:**
  - set `input.touchEnabled = false` and `input.touchFilter = () => false`, which stops the floating stick
    (`ENG:691`);
  - no scene sets `touch`, and nothing calls `touchButtons`. Otherwise `_touchSync` runs, and it resets
    `touchEnabled` from the settings (`ENG:820-828`);
  - with the engine corner off, the menu button is our canvas button.
- **The menu button** (top right) opens a small overlay: sound on/off, volume, view style, About.
- **Taps elsewhere** show "Best with a controller", at most once per 30 s, and never leave the demo.
- **A real controller connecting, or a hardware key,** opens the title and normal play.

**Accept** (virtual time):
- 9.9 s idle → no attract; 10.0 s → attract;
- each input type leaves within 1 step: a key, an unbound key, a mouse move, a click, the wheel, a pad button, a stick,
  a trigger;
- the soak: **30 virtual minutes × seeds 1-3, headless** (the sim, the director and the AutoPlayer in Node, no drawing),
  plus **5 virtual minutes × seed 1 in Chromium with drawing** (render paths and memory):
  - zero errors;
  - entity counts bounded;
  - heap growth < 10% after warm-up. The Chromium run uses `performance.memory` and launches with
    `--enable-precise-memory-info`;
  - every reel ran at least once; all 3 views and the bank were shown;
  - at least one chase reached 3★, at least one explosion, at least one switch;
- phone emulation (390×844 @3, touch):
  - no touch UI;
  - the attract mode runs;
  - the menu button opens its overlay;
  - taps never leave the demo;
  - a simulated pad connection opens the title.

### 8.21 Interiors: the bank

- **Data:** `def('interiors', 'bank', { size, blocks, doors, spawns, guards, cameras, lights, music, exits })`. It is
  built by the same builder as a district.
- **Build:**
  - **Getting in and out:** a door in the city fades to the interior map. Leaving returns you to that door with the
    world state kept (the wanted level and the clock). The city's simulation is suspended while you're inside; the
    interior runs its own.
  - **The map:** the lobby, the records office, the vault with its door, and a sewer approach from below for QUIET.
  - **Guards:** `E.sees` + `E.Suspicion` + patrol routes (the stealth starter's pattern,
    `src/starter/70-stealth.js:56-101`), CCTV cameras (sight cones that report), and takedowns (`E.ACTIONS.takedown`).
  - **Views:** all three, with interior cut-aways.
- **Accept:**
  - entering and leaving keeps the city's hash;
  - `check.mjs` passes on `#interior/bank`;
  - stealth tests: seen, heard, a camera alarm, a takedown.

### 8.22 Photo mode (Snap)

- **Build:**
  - Create (or the Snap phone app) freezes the sim (`timeScale 0`);
  - a free camera: stick pans, L2/R2 zoom, R3 cycles all three views;
  - HUD off;
  - ✕ takes the photo: it satisfies photo objectives, and on desktop it saves a PNG (`canvas.toBlob` download).
  - Missions R2 *Below Deck* and H2 *Blueprints* need a photo.
- **Accept:** entering and leaving restores the state; a photo objective completes; the PNG export works in Chromium.

### 8.23 The developer Proving Ground and dev tools

- **Build:** the `proving` district (64×64), with 8 zones:
  - **handling:** skidpad, slalom, ramps, surface strips (dry, wet, grass, sand, oil, ice), and a boat basin;
  - **traffic and crowd lab:** a 3×3 signalized grid with density sliders;
  - **combat range;**
  - **wanted sandbox:** set the stars and watch dispatch and search with the overlays;
  - **view lab:** the same spot in all three views, with the perf HUD, plus the scale yard (a ped beside every vehicle);
  - **UI gallery and jukebox:** every widget and screen in every glyph set; the stations, songs and effects;
  - **mission bench:** one tiny mission per objective type;
  - **stress pad:** sliders up to 200 cars and 300 peds.

  Every zone has a `?selftest=1` script that e2e runs. The Proving Ground is just another `districts` entry, which
  proves districts are content.
- **Accept:** every zone loads by deep link and passes its self-test.

---

## 9. Content spec: Lowtown

### 9.1 The map, at block level (north up)

```
            W                                                                              E
        ┌──────────────────── PALM TERRACES ─────────┬────────────── NEON MILE ─────────────────┐
        │ row houses   GAS'N'SIP     PALM PARK(pond) │ HOTEL MARQUEE  PLAZA(fountain) LEAD FARM │
        │ ST.CHRISTOPHER'S CHAPEL ⛪ GREASY SPOKE    │ PIXEL PALACE   FIRST LOWTOWN   CLUB      │
        │ (safehouse · save)         diner           │ arcade         BANK (tower; ⌂) CHROME ◆  │
        │ GUTTERBALL LANES ●  LOWTOWN GENERAL ✚      │ MPD 5TH PRECINCT  L: NEON MILE  towers   │
        │ (Gnomes HQ)         THREADS  KWIK-LUX      │ KWIK-LUX                                 │
        ├════════ THE LOOP: elevated expressway ring, z 64, ramps at the 4 corners ══════════════┤
        │ BOOM BOX GARAGE  CONSTRUCTION SITE  WAREHOUSES│ FISH MARKET  CONTAINER YARD  CRANES    │
        │ (mods · bombs)   (drill rig; Loop gap!)       │ KWIK-LUX     (stacks · ramp)           │
        │ SPRAY & PRAY     L DEPOT (rail yard)  CRUSH  │ MARINA (boats)  HARBOR RATS BOATHOUSE ▲  │
        │ (respray)        PALM CAR WASH        HOUR   │                 (Rats HQ, on piers)      │
        ├~~~~~~~~~~ THE CANAL ~~~~~~~ [DRAWBRIDGE] ~~~~~~~~~~ HARBOUR ~~~~~~~ LIGHTHOUSE ~~~~~~~~~~┤
        └──────────────────── BRICKYARD ────────────────┴────────────── HARBORFRONT ─────────────┘
   West edge: "BRIDGE CLOSED: GNOMES ON STRIKE" (the hook for District 2)        South and east: open water
```

- **The L** runs north-south down the central avenue at z 100, through four stations: Palm, Neon Mile, Brickyard and
  Harbor.
- **The Loop** crosses under it.
- **Three bridges** cross the canal; one of them is the drawbridge, which rises every 3 game hours (a stunt jump).
- **The First Lowtown Bank** (⌂, enterable) is the tallest building and a landmark down every SIDE7 avenue.
- **Club Chrome** is the Saints' HQ, with an exterior and a payphone; its interior is in the backlog.
- **Each neighbourhood has a palette:**
  - Neon Mile: magenta and cyan neon on deep blue;
  - Palm Terraces: pastel stucco, palm green, warm;
  - Brickyard: rust, brick and soot;
  - Harborfront: teal water, yellow cranes, grey concrete.

### 9.2 The cast

| Who | Role | Look (Humanoid) | Notes |
|---|---|---|---|
| **Dex Moreno** | Protagonist: a motorcycle courier and wheelman who owes everyone | heroic build, a short jacket (`coat`), spiky hair, red and black | OVERDRIVE; starts with the Sparrow moped |
| **Viv Okafor** | Protagonist: an ex-MPD detective, fired for noticing too much | long coat, ponytail, teal and grey | DEAD CALM; drives a Cortez |
| **Gus Pilchard** | Protagonist: a tow-truck philosopher with a temper | bulky build, overall colours, a cap, orange and blue | RED MIST; drives the Hookline |
| Father Fender | Chrome Saints boss: a defrocked mechanic-preacher who blesses cars | robe, chrome trim | Club Chrome |
| Mama Bilge | Harbor Rats boss: a sea-salty matriarch | yellow slicker, hat | the boathouse |
| Nana Petunia Gnorr | Lawn Gnomes boss: runs numbers from a bowling alley | pastel tracksuit, pointed hat | Gutterball Lanes |
| Sgt. Dolores Kettle | MPD: Viv's ex-partner and nemesis | uniform colours, a cap | heist antagonist |
| Mr. Pennywhistle | Manager of the First Lowtown Bank | suit | heist inside man (QUIET) |
| Lefty | Boom Box Garage mechanic | overalls | mods tutorial |
| DJs | Captain Static, MC Lugnut, Nova, Phil Buster | portraits only | radio subtitles |

### 9.3 The gangs

| Gang | Turf | Colour, icon, pattern | Vehicles | Weapons | Rival |
|---|---|---|---|---|---|
| **Chrome Saints** | Neon Mile | silver and cyan, ◆, diagonal stripes | Saint, Zephyr GT | pistol, SMG | Harbor Rats |
| **Harbor Rats** | Harborfront | yellow and black, ▲, dots | Hauler, Bilge Rat | shotgun, Molotov | Lawn Gnomes |
| **Lawn Gnomes** | Palm Terraces | pink and mint, ●, checks | Retiree, Brute | bat, grenade | Chrome Saints |

### 9.4 The missions (14)

The heist unlocks once the third job of any one gang is done. QUIET's crew options also need +40 respect with the gang
that supplies the hacker or the driver.

| # | Mission | Giver | Plays as | Summary | Systems it proves |
|---|---|---|---|---|---|
| P0 | **Two Wheels, No Brakes** | intro | Dex | Walk, sprint, steal a moped, a timed courier run. You run a red in front of a cop (1★) and lose him, then save at the chapel. | onboarding prompts, getting in and out, bikes, GPS, timer, 1★ search and evade, saving |
| S1 | **Holy Rollers** | Saints ◆ phone | any | Steal 3 named cars around town and deliver them above 60% health. | multi-target GPS, parked cars and carjacks, damage, garage drop-off |
| S2 | **Confession Booth** | Saints | any | Escort Father Fender's chrome Saint while the Rats ambush. | follow and protect, drive-bys, gang vehicle AI |
| S3 | **Drag Mass** | Saints | any | A street race on the Loop against 3 Saints racers. | race system, racer AI, decks, ramps |
| R1 | **Rat Run** | Rats ▲ phone | any | Take a contraband van (2★ at once) to the Brickyard without being seen arriving. | wanted, evade, respray |
| R2 | **Below Deck** | Rats | Viv | Sneak into the Saints' chop shop (an open yard of TileMap walls) and photograph the ledger. | stealth (`E.sees` + Suspicion + cones), takedowns, Snap photo |
| R3 | **Crane Game** | Rats | any | Hold the container yard against a Saints assault, then chase their leader. | combat waves, cover-lite, Molotovs and barrels, fire, chase |
| G1 | **Lawn Order** | Gnomes ● phone | Gus | Smash 8 Saints cars in Palm Terraces with a bat in 2:00. | melee against vehicles, property-damage heat, timer |
| G2 | **Bingo Night** | Gnomes | any | A police raid at night: pick up Nana in her slow Retiree wagon and escape 3★. | 3★ chopper and spotlight, roadblocks, night, a heavy car |
| G3 | **Gutter Ball** | Gnomes | any | Firebomb the Rats' boathouse, survive the counter-attack, escape by speedboat or by road. | fire spread, explosions, boats, gang war |
| H1 | **Setup: Getaway** | Viv (phone) | Dex | Steal a Zephyr GT from the Saints' showroom and stash it; plant a Vandal 600 by the Loop. | garages and persistent vehicles |
| H2 | **Setup: Blueprints** | Viv | Viv | The bank interior at night: stealth past guards and cameras to photograph the plans, or bribe the janitor. | the interior, stealth, CCTV, a choice |
| H3 | **Setup: The Big Drill** | Viv | Gus | Steal the Drill Rig from the construction site and tow it to the Brickyard at 2★. | towing, a heavy vehicle, wanted |
| H4 | **The Big Withdrawal** | the planning board | all three | Choose **LOUD** (Gus rams the Strongbox; a shoot-out in the bank lobby; 4★) or **QUIET** (Viv through the sewer, alarms off; Gus drills from below; 2★). Both end in a **SIDE-SCROLL MODE 7 getaway on the Loop**: switch between Dex driving, Viv shooting from the window and Gus clearing a roadblock with the tow truck. Then the split of the take, the results, and the credits ("District 2: coming soon"). | everything: choices, mid-mission switching, the interior, the SIDE7 set piece, results |

### 9.5 Side content

| Kind | Content |
|---|---|
| Jobs (repeatable, levels 1-3) | **Moto Courier** (any bike: timed deliveries), **Vigilante** (police cruiser: stop the criminals' cars), **Firefighter** (the Pumper: put out car fires) |
| Street races | Loop Sprint, Harbor Hustle |
| MAYHEM (rampages) | 3: the Zap-O-Matic against Rats, a bat against Saints cars, the Boom Tube against gang vehicles |
| Stunt jumps | 5: the Loop gap, the drawbridge, the container-stack ramp, the parking-garage roof, the canal |
| Collectibles | 25 **Moto Tokens** on roofs and in alleys (the map marks the ones found) |
| Hold-ups | 3 Kwik-Lux stores: aim at the clerk, take the cash, 2★ |
| Random events | a purse snatcher on foot, a stalled car to push or jack, a gang shoot-out in progress, a police chase passing (join it or help) |
| Properties | Palm Car Wash, Pixel Palace Arcade |
| Other | Marching Mimes ENCORE, cab skip, photo mode |

### 9.6 Vehicles (13 models, 19 definitions)

| Class | Models (variants) |
|---|---|
| car | **Cortez** (Cortez sedan, *Retiree* pastel wagon, *Fed Sedan*), **Saint** (chrome luxury), **Brute** (muscle), **Zephyr GT** (sports), **MPD Cruiser** |
| truck | **Hauler** (Hauler van, *Medic* ambulance, *MPD Rhino* SWAT, *Strongbox* armoured), **Pumper** (fire truck, water cannon) |
| tow | **Hookline** (Hookline tow truck, *Drill Rig* flatbed) |
| bike | **Sparrow** (moped), **Vandal 600** (sport bike) |
| boat | **Bilge Rat** (speedboat) |
| heli | **MPD Eye** (AI police) |
| rail | **The L** (AI, 2 trains) |

### 9.7 Weapons (11)

| Slot | Weapons |
|---|---|
| melee | fists, Lowtown Slugger (bat) |
| pistol | Snub .38 |
| SMG | Buzzsaw |
| shotgun | Persuader |
| heavy | Boom Tube (rocket launcher), Hot Mess (flamethrower) |
| thrown | Party Starter (Molotov), Pineapple (grenade) |
| special | Zap-O-Matic (chain-arc stun, which kills on repeat hits: the GTA2 Electrogun homage), Snap (the phone camera, for photo objectives) |

### 9.8 Peds

- **Civilians:** office worker, tourist, jogger, dock worker, retiree, club-goer, vendor, skater, busker. Each archetype
  comes in 3+ colour schemes.
- **Gangs:** 3 gangs × (grunt, enforcer).
- **Services:** MPD officer, SWAT, Fed, paramedic, firefighter.
- **Others:** shopkeepers, bank guards, the Marching Mimes (6), and the story cast.
- **Variety:** every ped has its own `colors` (the engine's look target: never the defaults on everyone).

### 9.9 Radio stations (4)

| Station | Freq | DJ | Genre template | Content |
|---|---|---|---|---|
| CRASH FM | 101.1 | Captain Static | synth-punk (fast square leads, noise snare) | 3 songs, 2 ads, jingle |
| WHEELZ | 88.8 | MC Lugnut | boom-bap chip beats (swing, sub-bass triangle) | 3 songs, 2 ads, jingle |
| NEON DRIVE | 85.0 | Nova | synthwave (arpeggios, gated drums) | 3 songs, 2 ads, jingle |
| LOWDOWN TALK | 1210 AM | Phil Buster | talk radio (call-ins as subtitles over a jingle bed) | 6 segments, 3 ads |

**Satirical ads (originals):** Kwik-Lux ("open 25 hours"), Boom Box Garage, Saint Moto's Chapel ("we save, you
donate"), Gutterball Lanes, Lowtown General ("now with fewer waits"), Lead Farm.

### 9.10 Shops and properties

See section 8.16. All are reached through big 10-foot cards, and every price is a TUNE knob.

### 9.11 Attract reels (5)

| Reel | Shows | Views |
|---|---|---|
| **Joyride** | a carjack, then traffic weaving, a drift, a stunt jump in slow motion | TOP → SIDE7 |
| **Hot Pursuit** | a 3★ night chase in the rain, the chopper's spotlight, a respray escape | SIDE7 → TOP |
| **Turf War** | a gang shoot-out, Molotov fire, an explosion chain | ISO |
| **Switch!** | the switch camera across all three protagonists' vignettes | TOP → ISO |
| **Heist Tease** | a stealth takedown in the bank, then the getaway on the Loop | ISO → SIDE7 |

---

## 10. Look, feel and atmosphere

- **Mood:** GTA2's neon-noir with a grin.
  - Wet asphalt; sodium-orange streetlights against cyan and magenta neon; grime.
  - Chunky cars and hard shadows.
  - Dense signage with silly brand names; rooftop clutter (AC units, water tanks, billboards).
  - Chaos you can read at a glance.
- **The engine's look target**, applied to every screen (API.md, "Look target"):
  1. `res: 'ps1'` + `expand`. Protagonists stand about 40 px tall at zoom 1 in ISO (Humanoid `size` 1.0, about 32 u);
     crowds are slightly smaller.
  2. Every character is dressed: outfit, hair, hat and a real palette.
  3. A backdrop behind every outdoor view (sky blend by time; SIDE7's horizon).
  4. Textured floors and walls: materials, facades, roofs.
  5. 3-8 props per screen.
  6. Effects on every hit.
  7. `E.tones` shading for everything we draw ourselves.
  8. Title typography with `E.font.title`.
  9. Portraits in dialogue.
- **Signage:** procedural neon signs in the pixel font, with glow and flicker. The names:
  - PIZZAZZ PIZZA, KWIK-LUX, HOTEL MARQUEE, GAS'N'SIP;
  - PIXEL PALACE, LEAD FARM, THREADS, CLUB CHROME;
  - GUTTERBALL, SPRAY & PRAY, CRUSH HOUR.
- **HUD style:**
  - chunky, GTA2-flavoured, modern in its clarity;
  - green money with `$`;
  - outlined stars;
  - a round radar with chunky shaped blips;
  - big result cards: "JOB DONE!  +$2,500  ·  +15 RESPECT ◆".
- **Copy:** playful and short. Every on-screen line fits on one line of a 10-foot layout.
- **Animation** (the engine's rule: animate from continuous values, never frame lists):
  - **vehicles:** suspension bob and body roll, steered front wheels, wheel spin, doors that open for getting in and
    out, a bike's lean, wheel smoke on burnouts;
  - **peds:** idle variety from mocap clips (phone, chat, bench);
  - **reactions:** flinch, knockdown and get-up, cower, flee;
  - **getting in and out:** reaching, sitting, a pulled driver who tumbles;
  - **specials:** the switch-camera swoop, and the stunt-jump slow motion;
  - **every attack** has a visible wind-up (check it in a filmstrip, per API.md).
- **Evidence:** `tools/shots.mjs` builds the matrix: neighbourhood (4) × time (day, dusk, night) × view (3), plus the
  bank and each UI screen, into `docs/media/shots/`. Review it against this section and record a verdict per row in
  PROGRESS.

---

## 11. Controls

PS5 DualSense is primary; keyboard and mouse map onto the same model. Everything can be rebound per context.
`docs/CONTROLS.md` holds the diagram.

| Action | On foot (PS5) | In a vehicle (PS5) | Keyboard / mouse |
|---|---|---|---|
| Move / steer | L-stick | L-stick | WASD (W/S throttle and brake in a vehicle) |
| Aim / look | R-stick | R-stick (drive-by aim) | mouse (a ground cursor) |
| Lock-on aim (hold) | L2 | — | right mouse |
| Attack / fire | R2 | — | left mouse |
| Throttle / brake-reverse (analog) | — | R2 / L2 | W / S |
| Sprint (hold) | ✕ | — | Shift |
| Horn / siren | — | ✕ | H |
| Jump, climb, vault | □ | — | Space |
| Handbrake | — | R1 | Space |
| Roll / dodge | ○ | — | X |
| Drive-by / vehicle gun | — | ○ | left mouse |
| Enter, exit, interact, carjack | △ | △ | E |
| Reload | R1 | — | R |
| Weapon wheel (hold) | L1 | — | Q (hold); the mouse wheel or 1-8 cycle |
| Nitro | — | L1 | Shift |
| Quick weapon cycle | D-pad ← → | — | mouse wheel |
| Radio station | — | D-pad ← → | , and . |
| Phone | D-pad ↑ | D-pad ↑ | T |
| Character wheel (hold) | D-pad ↓ | D-pad ↓ | Z (hold) |
| Crouch / stealth | L3 | — | C |
| Special ability | L3+R3 | L3+R3 | F |
| Change view (hold + R-stick turns ISO and the SIDE7 rail) | R3 | R3 | V (`[` `]` turn) |
| Map | touchpad, or Options → MAP (the pause's first tab) | same | M / Tab |
| Pause | Options | Options | Esc |
| Photo mode | Create | Create | B |

**Movement comes from the left stick and WASD only.** The d-pad never moves the player, because MOTOR's bindings
replace the engine's fixed d-pad moves in play (section 8.1). In menus the d-pad navigates as usual.

**In menus:**
- d-pad or left stick navigates;
- ✕ confirms, ○ goes back;
- L1/R1 change tabs;
- □ cycles filters;
- △ is a secondary action;
- Options closes everything.

**On the keyboard:**
- arrows or WASD navigate;
- Enter or Space confirms;
- Esc or Backspace goes back;
- Q/E change tabs;
- mouse hover focuses, a click confirms, the wheel scrolls.

**Never bind Ctrl or Alt chords:** Ctrl+W closes the tab, and Alt opens browser menus.

---

## 12. Engine changes: patches to my-3D2dge, and MOTOR extensions

**Policy:**
- Extend first.
- Patch the vendored engine only where an extension would need to reach into private state.
- Each patch is marked `// GTM-PATCH(n): <why>` in `vendor/my-3d2dge/engine/my-3d2dge.js`, listed in
  `vendor/my-3d2dge/PATCHES.md` with its hunk, its test in `tests/unit/engine-patches.test.js`, and upstream issue text.
- `vendor-check.mjs` verifies the original checksums and that every marker is listed.

| # | Patch (vendored engine) | Why |
|---|---|---|
| 1 | `TileMap.queueWalls`: loop over the **visible cell window** (the screen corners through `view.toGround`, plus a margin for wall height), not all w×h cells (`ENG:4437-4445`). Add a **cut hook**, `map.cutAt(cx, cy, view)`, which `_isFront` consults (`ENG:4429-4435`). | 25k cells scanned every frame; tall walls pop in at the bottom edge; a player-relative cut-away. |
| 2 | TileMap wall-block cache: a **memory-bounded LRU** across blocks and views (`ENG:4447-4468`). | A long drive caches thousands of blocks. |
| 3 | Solids: **`map.addSolids(list)`** adds many solids with one `version` bump. Note that `map.solids` is already the public array (`ENG:7051-7057`), so don't reuse that name. Also **spatial bucketing** for the body-against-solid checks *and* for `groundAt` / `heightAt`, which loop over every solid (`ENG:7068-7089`). | Deck pillars and street furniture are hundreds of solids, checked by every body and every bullet every step; each add re-bakes the caches. |
| 4 | Input raw state: `input.raw.keys`, held codes including unbound ones (`ENG:669`). `input.raw.pads[]`: every connected pad's buttons as `{ pressed, value }` plus its axes, with the active pad chosen by last use; today the engine polls the first pad, `pressed` only (`ENG:851-960`). `input.raw.activity`: the step of the last activity of any kind, mouse move and wheel included. | Analog triggers for driving; a DualSense that isn't pad 0; the attract idle timer; MOTOR's per-context bindings without `use()`. |
| 5 | Audio: `audio.bus(name)`, a public getter for the gain node of `'sfx'` or `'music'` (`ENG:6058-6064`). | Continuous voices and MOTOR's sequencer must follow the volume settings without reaching for `_sfxBus`. |
| 6 | Only if needed: a `TileMap({ floor: false })` flag that guarantees the whole-map floor is never baked (by the minimap, GPU lighting or `drawFloor`). | Memory: about 60 MB per view canvas at 160². |

**MOTOR extensions (no patch):** everything else in sections 7-8.
- Rendering: the floor chunks, decks, the depth renderer (TOP and SIDE7), the Projector, vehicle models.
- Simulation: vehicle physics; traffic, peds, police and gangs; the wanted system.
- Content runtime: the staged mission DSL, economy, stats, abilities and switching.
- Interface: the bindings and contexts, the ActivityMonitor, the glyphs, the UI layer and its 10-foot kit.
- Audio: the sequencer, AudioX and the radio.
- Modes and tooling: the AutoPlayer and director, saves, the debug tools.

---

## 13. Milestones

Every milestone ends green, playable, committed, pushed, and recorded in `PROGRESS.md`. **FAN-OUT** marks where
`ultracode` workflows pay off (section 16).

### M0: Bootstrap and infrastructure

- **Vendor the engine at its exact commit.** `git clone --depth 1` gets whatever `main` is today, so instead:
  1. `git init`;
  2. `GIT_LFS_SKIP_SMUDGE=1 git fetch --depth 1 https://github.com/michaelcrosato/my-3d2dge cfa866aa45474868350cad1a7fc015e612f9305f`;
  3. `git checkout FETCH_HEAD`;
  4. check `git rev-parse HEAD`.

  A checkout at `/home/user/michaelcrosato/my-3d2dge` may be reused after the same check. If the fetch is refused, ask
  for the repository through `add_repo`.

  Then copy the files listed in section 6.2, write `VERSION.json` (sha256s), and keep the `LICENSE`.
- **Tooling:** `package.json` (exact pins), `build.mjs` (with content discovery), `serve.mjs`, `test-run.mjs`, ESLint
  with the determinism rule, `boundary-check`, `vendor-check`, `goal-sync`, and the `.claude` SessionStart hook.
- **CI:** add `.github/workflows/ci.yml`. If the push is refused, take the fallback in section 6.1.
- **Docs:** `README.md` (pitch, Source Information, how to run), `PROGRESS.md`, and skeletons for
  `docs/ARCHITECTURE.md`, `DECISIONS.md` and `CONTENT-GUIDE.md`.
- **Hello city:** boot, title, then play on a 32×32 test map with a walking protagonist. Deep links, `window.__gtm`,
  `game.debug.snapshot`, `game.views` routing.
- Make sure a **draft PR** exists for the branch (the planning session opened one), and subscribe to it.
- **Accept:**
  - `npm ci && npm test` green locally, and in CI (or the fallback);
  - `dist/index.html` plays from `file://`;
  - `npm run check` is clean;
  - `vendor-check` passes.

### M1: Core architecture, plus three timeboxed spikes

- **Core:** `core/*` (registries with schemas, BUS, TUNE with dev pages, RNG streams), the Actor/Intent/controllers,
  the footprint rings.
- **Input:** GTM-PATCH 4, MOTOR bindings and contexts, the ActivityMonitor, glyphs and tokens.
- **Scenes:** boot, title, an attract stub, play.
- **Proofs:** the headless sim harness (`node:vm`), `stateHash`, a replay round-trip.
- **Spikes** (keep what they produce):
  - **S1 Depth renderer:** SIDE7 (rail, floor rows from chunk canvases, box spans, decks, 40 scaled rigs) and TOP (the
    lean) on a dummy city of 4×4 chunks. Measure them;
  - **S2 Floor and scale:** `floor-chunks` and GTM-PATCHes 1-3 on a dummy 160² map, in ISO. Measure;
  - **S3 Vehicle physics:** the bicycle model on a test pad, with drift and collisions.
- **Write `docs/ARCHITECTURE.md`** and **freeze the contracts**: Intent, Projector, the registry schemas, the BUS
  catalogue, the **staged mission API** and hint data.
- **Log the measured performance budgets** in DECISIONS.
- **Accept:**
  - unit tests for every core module;
  - the spikes' screenshots (with verdicts) and perf numbers in PROGRESS;
  - a DECISIONS entry for any fallback taken.

### M2: The Lowtown world and ISO rendering

- **Build:** the district DSL, the builder, the validator and `map-sheet`.
- **Lowtown v1:** every neighbourhood, the Loop decks with ramps, the canal and bridges (the drawbridge mechanism),
  water, every landmark, POIs, zones, the prop rules.
- **ISO:** finished, with the player-relative cut-away, x-ray (the player only), 4-yaw rotation, quantized speed zoom
  and baseline lighting.
- **Accept:** section 8.3 and 8.4 checks; the neighbourhood screenshots with verdicts.

### M3: Protagonists, moving on foot, combat

- **Characters:** the three protagonists (PedRig with weapon layer and outfits).
- **Movement:** Mover verbs (sprint, jump, climb, vault, roll, crouch).
- **Combat:** melee and firearms (lock-on, twin-stick, mouse), MOTOR's z-aware bullet hits, health and armour,
  pickups, knockdown and get-up.
- **Explosives and fire:** grenades, Molotovs, rockets, the fire system.
- **UI first pass:** the weapon wheel.
- **Switching:** the switch wheel and switch camera; abilities; stats.
- **Proving Ground (first zones):** the combat range and the view lab.
- **Accept:** sections 8.11 and 8.12.

### M4: Vehicles

- **Physics and classes:** all 7 classes; the 13 models and 19 definitions.
- **Entering:** getting in, getting out, carjacking, towing.
- **Damage:** damage, fire, chained explosions.
- **Lights and sirens.**
- **Feel:** skid marks, tyre smoke and sparks; drift; ISO speed zoom; the radio stub; mods.
- **FAN-OUT A1:** vehicle models and handling specs, one agent per class group, against the frozen model and handling
  schema. Each agent's output must pass its class's handling test.
- **Accept:** section 8.8.

### M5: Roads, traffic, pedestrians, emergency services

- **Roads:** the lane graph, signals and GPS.
- **Traffic:** DriverBrain, the annulus spawner, parked cars.
- **Peds:** PedBrain, the sidewalks, reactions, witnesses.
- **Services:** the Medic and the Pumper.
- **The Marching Mimes.**
- **Performance:** LOD and time-slicing.
- **AutoPlayer core:** driving and walking to goals; later milestones extend it.
- **Accept:** sections 8.7, 8.9 and 8.10, inside the budget at target densities.

### M6: Wanted level, police and gangs

- **Crimes and police:** crimes, detection, stars, every dispatch tier, cop AI on foot and in cars, roadblocks, spike
  strips, the chopper and spotlight, SWAT, Feds.
- **Search and evade:** with cones on the radar.
- **Clearing the stars:** respray and bribes.
- **NABBED and WRECKED:** the flows and respawns.
- **Gangs:** respect, turf, hostility, patrols and turf wars.
- **Accept:** sections 8.13 and 8.14.

### M7: TOP and SIDE-SCROLL MODE 7 for real, plus the bank interior

- **The depth renderer**, finished: both views, with lights, the far fade, sky, decks, perspective vehicles, scaled
  rigs, particles and Auto-rail.
- **View manager:** transitions and per-context memory.
- **Cameras:** the TOP climb; the SIDE7 rail on foot and in vehicles; the camera rig for photo mode.
- **The bank:** the interior map, guards, CCTV, doors in and out.
- **Accept:**
  - sections 8.2, 8.5 and 8.21;
  - the view-independence hash test;
  - medians within budget in all views.

### M8: Missions, activities and economy (content)

- **Runtime first:** the staged mission DSL and runtime with retry and grading.
- **Systems:**
  - economy, shops, properties, completion, the cab skip;
  - the collectibles, stunts, MAYHEM and races frameworks;
  - jobs, hold-ups and random events.
- **FAN-OUT A2:** the content runs in parallel, each agent in its own worktree and owning its own files, each passing
  the bot test with seeds 1-3:
  - one agent per gang chain (S, R, G);
  - one for P0;
  - one for the heist (H1-H4);
  - one for jobs and activities.
- **Accept:** sections 8.15 and 8.16; every mission passes through the bot and by a scripted human-style pass.

### M9: The 10-foot UI and UX

- **The UI layer and widget kit, then every widget and screen in section 8.18:**
  - in play: the HUD, the radar with GPS, the map screen, the phone;
  - menus: pause tabs, settings (all of them), paged per-context rebinding, load and save;
  - cards and results: shops, results, the NABBED and WRECKED cards;
  - pages: the title, help, Credits & About with the Source Information and the engine summary;
  - text: subtitles; accessibility; HUD size.
- **Onboarding prompts.**
- **The UI audit tool.**
- **FAN-OUT C** (optional): screens in parallel once the widget kit is frozen.
- **Accept:** section 8.18; the audit clean at 1080p and 720p; pad, keyboard-only and mouse-only passes.

### M10: Audio and radio

- **Engine and voices:** GTM-PATCH 5, MOTOR's sequencer, AudioX and its continuous voices.
- **Sound:** the SFX map, ambience, mission music cues.
- **Radio:** the composer and the 4 stations, with their DJ and ad text.
- **Accept:** section 8.17.

### M11: Attract mode, kiosk and mobile

- **Players:** the full AutoPlayer behaviours.
- **The show:** the director, the 5 reels, the interstitials, the watchdog.
- **Ins and outs:** the title idle timer; leaving on any input.
- **Kiosk and mobile:** the kiosk/mobile mode.
- **Tooling:** the soak tool, and an attract capture to MP4/GIF (`tools/record-attract.mjs` + ffmpeg) for the README.
- **Accept:** section 8.20, every item.

### M12: The Proving Ground, photo mode, dev tools, handoff docs

- **Proving Ground:** all 8 zones, each with its self-test.
- **Photo mode.**
- **Dev tools:** the dev menu, the overlays, the tuning pages.
- **Handoff docs:**
  - `docs/CONTENT-GUIDE.md`, a recipe per content type (vehicle, variant, weapon, ped, outfit, gang, mission,
    activity, station, song, shop, property, interior, reel, district), each naming the test to run;
  - `tests/recipes/*.test.js`: each recipe followed to the letter, adding a new instance through the public API and
    proving it works end to end;
  - **District 2 stub:** one block behind the closed bridge, loaded only with `?dev=1`. It proves a new district is
    content.
- **Accept:** section 8.23; every recipe test is green.

### M13: Polish, performance, verification, release

- **Polish:** a visual pass on the look checklist for every row of the shots matrix, and a performance pass.
- **FAN-OUT B:** parallel adversarial reviewers, read-only and one per area:
  - vehicles and physics;
  - traffic and peds;
  - wanted and gangs;
  - missions;
  - the 10-foot UI;
  - the attract mode;
  - perf and memory;
  - determinism and saves.

  Each one returns its findings as failing tests or repro scripts. The main agent fixes them and re-runs `test:full`.
- **Writing:**
  - finish `README.md` (media, controls, Source Information, then the engine analysis summary in its own section);
  - write `docs/ENGINE-ANALYSIS.md` in its final form, and `docs/FEEDBACK-FOR-ENGINE.md` (in the engine's
    FEEDBACK-LOG format);
  - finish `PATCHES.md`.
- **Release:** CI green (or the fallback); the PR description complete; mark the PR ready only when the owner asks.
- **Accept:** section 15, all of it.

---

## 14. Verification strategy

| Layer | Tooling | What it proves |
|---|---|---|
| Unit | `node:test` | core, input, vehicle maths, graphs, DSL and stages, economy, saves, patches |
| Sim (headless game) | `node:test` with the engine and bundle in `node:vm`, driven by Intents | 10-minute traffic and crowd runs, wanted scenarios, gang sims, the mission bot (3 seeds), the bot campaign to 100% |
| E2E browser | Playwright 1.56.1 with `CHROMIUM_PATH` | boot, every scene, every view (through `game.views`), the pad shim, the UI audit, the attract enter/exit matrix, phone emulation |
| Visual | vendored `check.mjs` (look lint) + `filmstrip.mjs` (`--seed`, `--compare`) + `shots.mjs` | the look checklist; animations (getting in and out, carjacks, drifts, crashes, explosions, the switch camera, the wheel, the SIDE7 chase), each with a verdict |
| Perf | `perf.mjs` | the budgets logged in DECISIONS (medians gated, p99 reported) |
| Determinism | same-seed hash, view-independence hash, `filmstrip --expect-same`, vendored `replay.mjs` | section 7.3 |
| Soak | `soak-attract.mjs` | section 8.20 |
| Content | the district validator, registry schemas, a mission lint (every objective has a hint with data, every fail has a reason, every stage has a setup) | the content contracts |
| Extensibility | `tests/recipes/*` | **content is added, not architecture** |
| Boundary | `boundary-check`, `vendor-check`, `goal-sync` | the layers, the patches and the prompt stay honest |

- **Gate:** `npm test` (about 6 min) on every push. `npm run test:full` before every milestone closes, and in CI
  nightly if the owner wants it.
- **Manual QA hand-off:** `docs/QA-DUALSENSE.md` is a 15-minute checklist for a human with a real DualSense on a TV:
  glyphs, rumble, triggers, legibility at 10 ft.

---

## 15. Definition of Done

Counts and budgets apply *as amended in `docs/DECISIONS.md`* (section 0).

1. **Milestones:** every milestone's acceptance checks are met, and `PROGRESS.md` shows the evidence for each, with a
   verdict for every check judged by eye.
2. **Tests:** `npm test` and `npm run test:full` pass, and CI is green on the PR's head (or the fallback in section 6.1).
3. **The file:** `dist/index.html` is one self-contained file:
   - `check.mjs` reports `external: []`;
   - it plays from `file://` and from a static server;
   - a rebuild is byte-identical.
4. **The slice is all there** (section 9) and can be finished:
   - 14 missions, all side content, shops and properties;
   - **a headless bot campaign reaches 100% completion.**
5. **Views:** ISO, TOP-DOWN and SIDE-SCROLL MODE 7 work outdoors and in the bank. Switching takes ≤ 0.35 s and leaves
   the simulation hash unchanged.
6. **Attract:** the attract mode meets every item in section 8.20, including the soak and the leave-on-any-input
   matrix. The kiosk/mobile behaviour is verified on phone emulation.
7. **The 10-foot UI:** the audit passes; controller-only, keyboard-only and mouse-only passes succeed on every screen.
8. **Determinism and replay:** both pass. **Performance:** the medians are within the logged budgets.
9. **Extensibility:** the Proving Ground self-tests and every content recipe test pass, and the District 2 stub loads.
10. **Docs:** complete:
    - `README.md`: Source Information, then the engine analysis in a separate section, how to play, the controls,
      media;
    - `docs/ARCHITECTURE.md`, `CONTENT-GUIDE.md`, `CONTROLS.md`, `TUNING.md`, `DECISIONS.md`;
    - `docs/ENGINE-ANALYSIS.md` (final), `FEEDBACK-FOR-ENGINE.md`, `QA-DUALSENSE.md`;
    - `vendor/my-3d2dge/PATCHES.md`.
11. **The built HTML** carries the Source Information and, separately, the engine-analysis summary, both in its comment
    header and on Credits & About. In files, "Model and Effort Level" follows section 1's wording: the AI lab and the
    effort, with the exact model left to the chat report.
12. **The final chat report:**
    1. the Source Information, on its own;
    2. the Game Engine Analysis, separately: what was used, what wasn't, and the one thing to change;
    3. how to play;
    4. the PR link.

---

## 16. Execution recommendation

**Recommended:** the model the owner proposed, at effort **xhigh**, with **`ultracode`** in the `/goal` prompt.
`ultracode` authorizes bounded workflows: at most 10 agents each, with the isolation rules below.

**Why xhigh and not max:**
- This plan front-loads the hard thinking. The architecture, the rendering approach for every view, the data contracts
  and the tests are decided here, and the risky parts are spiked in M1.
- The riskiest renderer now extends a technique the engine already ships: the depth view.
- What remains is long, mostly well-specified building and checking, spread over hundreds of turns. There, max's extra
  thinking on *every* turn adds a lot of tokens and little quality.
- Where extra rigour does pay, in independent verification, parallel reviewers buy more than deeper single-thread
  thought.

**Why ultracode is worth it here:**
- The slice has about 20 subsystems and about 50 content items with clean seams: registries, the staged DSL and frozen
  contracts.
- Parallel authoring at **A1** (vehicles), **A2** (missions and activities) and **C** (UI screens) cuts wall time a lot.
- Parallel **adversarial verification at B** (M13) catches what one pass misses.

**Isolation rules for workers:**
- **Each worker runs in its own git worktree** (`isolation: "worktree"`). It owns a disjoint set of new files, and
  content is discovered at build time, so no worker edits a shared index.
- **Workers run their own unit, sim and bot tests**, building to a temporary directory. They never write
  `dist/index.html`, `PROGRESS.md` or `DECISIONS.md`, and they never commit to the PR branch. They return their files and
  notes.
- **The main agent merges**, rebuilds, runs `npm test` / `test:full`, commits, and updates PROGRESS and DECISIONS.
- **Reviewers at B are read-only.**

**On a tighter budget:** delete the word `ultracode` from the prompt. The plan works single-agent, at a slower pace and
with single-thread verification.

**Process:**
- Commit after every green step, and push at least once per milestone: the container can be reclaimed.
- `PROGRESS.md` is always current, so a cleared or resumed session continues exactly.
- Keep the draft PR updated and CI green.
- Run long suites in the background.
- Never read the 727 KB engine whole: search `API-INDEX.md` first.

---

## 17. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The depth renderer misses its budget at city scale | medium | high | It extends the engine's working depth view; spike S1 in M1; the fallback in section 8.5 (logged). |
| The city's scale breaks the TileMap (memory, stalls) | high without the patches | high | GTM-PATCHes 1-3 and `floor-chunks` (spike S2); 160² rather than 192². |
| The headless performance budgets can't be met | medium | high | Measure first (M1), gate on medians, use the fast-path rules (section 7.11). |
| AI gridlock, stuck peds, a stuck attract AI | medium | medium | 10-minute sims in `test:full`, watchdogs, the director's cuts, time-sliced brains. |
| Determinism drifts, or the simulation leaks the view | medium | high | the lint rule, the world-unit footprint, hashes driven by Intents in CI, named RNG streams. |
| Scope: 14 missions + 20 systems | high | high | milestone gates, the staged DSL first, fan-out A2, bot tests, amendments only through DECISIONS. |
| Input traps (`use()` clears; the fixed d-pad) | certain without the fix | medium | MOTOR bindings over raw state (GTM-PATCH 4); held-button tests. |
| UI too small or too dense on a TV | medium | medium | the UI layer at integer scales, the audit with measured sizes, 1080p screenshots, paging. |
| No real gamepad in CI | certain | medium | the pad shim; the owner's DualSense checklist (`docs/QA-DUALSENSE.md`). |
| Workflow files can't be pushed | possible | medium | the fallback in section 6.1, and tell the owner. |
| Browser audio autoplay blocking | certain | low | audio only after a gesture; a silent attract mode until then; tests run with the autoplay flag. |
| Session or context limits on a very long run | high | medium | PROGRESS.md, frequent commits and pushes, compaction-friendly notes. |
| Upstream engine changes | low | medium | vendored at the full SHA, documented patches, `vendor-check`. |
| IP | low | high | the originality rules in section 3; the trademark note on the title. |

---

## 18. Preliminary engine analysis

**To be finished in `docs/ENGINE-ANALYSIS.md`.** This is written from planning research: reading the engine and running
its kits. The final version must reflect what was actually built.

### What we plan to use

- **Base systems:**
  - the game loop and its exact fixed step;
  - scenes, boot steps and `game.go` fades;
  - `expand` resolution;
  - pixel primitives, `E.font` / `E.font.title`, `E.ui`;
  - `E.tones` / `E.ramp`.
- **World and rendering:**
  - the depth-sorted renderer (`r.actor`, `r.queue`, `r.box`, footprints, x-ray, emissive);
  - `E.View` and the `iso` view;
  - TileMap walls, roofs, facades, materials, heights, `ray`/`sight`/`ledge`;
  - `E.Backdrop`;
  - props and the shapes store;
  - canvas lighting;
  - particles, `hitFx`, `flash`, `shake`, `freeze`.
- **The engine's two perspective tricks:**
  - **the stress test's side scrolling with depth (Mode 7):** `proj`, `rowDepth`, `floor7`, `face7`, `view7`, `wall7`,
    `pool7`, `depthCut`, generalized into SIDE7;
  - **the shooter kit's one-point lean**, generalized into the exact TOP view.
- **Characters and AI:**
  - `E.Humanoid` (subclassed), with `drawPortrait`;
  - mocap clips (Driving, Sitting, Phone, Pistol, getting up);
  - `E.Mover`, `E.ACTIONS` (getting in and out, carjacks, takedowns);
  - `E.sees` / `E.hears` / `E.Suspicion`;
  - `FlowField` (foot chases).
- **Combat:** `E.Bullets` as a pool, `E.Attack` / `E.Combo` / `E.MOVES`.
- **Input, sound and saving:**
  - DualSense detection, deadzone, `rumble`, `consumeAll`, the menu actions;
  - `ChipAudio` (`sfx`, presets, `audio.ctx`);
  - `E.store`; `game.settings`.
- **Determinism and tools:**
  - `E.session` record and replay;
  - headless `game.advance` / `input.tap`;
  - `check.mjs`, `filmstrip.mjs`, `replay.mjs`.

### What we plan not to use, and why

| Piece | Why not |
|---|---|
| The agent edition | It lacks props, lighting, Mover, perception, Shell and sessions. |
| The 3D engine (three.js + Rapier) | It must be served, not opened from disk. It has its own world and physics. It doesn't render in the 2D pixel style. |
| `PlatformMap` / `Platformer` | The interior is a TileMap, so stealth, AI and all three views work unchanged. |
| `TileMap.drawFloor` on the city | It bakes the whole map per view: about 13 M px at 160². |
| `TileMap`'s `cut: true` as it is | It isn't player-relative (`_isFront`). |
| `E.Shell` and the HTML standard menus for player-facing UI | Fixed small CSS, no UI scale, no pixel font: not 10-foot. |
| The `topdown` view as the TOP-DOWN perspective | It is orthographic, with no GTA2 lean. |
| `E.Body`, `r.shape` and `r.sprite` for vehicles | No heading; 32 facing steps and cache churn; no rotation. |
| `FlowField` for vehicles | One target, no cell costs. |
| `Bullets.hit` | It can't refuse a hit, and its hits are 2D circles. |
| `input.use()` at runtime, and the fixed d-pad moves | `use()` clears held buttons. |
| The engine's `music()` for the radio | One slot, `setInterval`, always starts at step 0. |
| GPU lighting | Optional, and needs WebGPU; Canvas lighting does the job in ISO. |
| `E.Shell`'s minimap | It fits the whole map; there is no scrolling radar. |

### If I could change one thing about the engine

**Make the world scale.** I would make TileMap a chunked, streamed map:
- the floor baked per chunk and per view, lazily, with an LRU;
- walls culled to the visible window;
- layered cells, so bridges, overpasses and tunnels can have space beneath them.

**Why this, above everything else:** every other gap a GTA-style game hits can be added on top in game code: vehicles,
a perspective camera, a TV-scale UI, analog triggers. This one sits inside the engine and blocks every open-world game:
city sandboxes, overworlds, large RPG towns. The same whole-map bake is also why continuous zoom and yaw stutter: each
new value re-bakes the floor and walls.

**Close second:** promote the stress test's side scrolling with depth (Mode 7) from page code to an engine view any game
can switch to.

---

## 19. The expansion path after the slice

- **Districts:** each new district is a district definition, its interiors, its gangs and its missions. The bridges
  open with the story. MOTOR loads one map at a time across a bridge fade; multi-district streaming comes later.
- **From the backlog** (trimmed from the slice on purpose):
  - a free-turning Mario Kart-style chase camera;
  - player-flown helicopters and boarding the L;
  - more stations, jobs (Paramedic, Tow) and photo filters;
  - the Club Chrome interior;
  - an arcade cabinet that runs an engine starter kit inside the game.
- **Content packs:** planes, more boats, weapons, gangs, heists.
- **The story:** 3 districts × 3 gangs (GTA2's shape), plus 3 heists.
- **Platforms:**
  - an Electron or Tauri wrapper for desktop and Steam Deck;
  - real DualSense haptics and adaptive triggers through WebHID on desktop Chrome.

---

## Appendix A: the 50 candidate titles (#24 was drawn)

1. Grand Theft Ought-To
2. Bland Theft Auto
3. Granny Theft Auto
4. Grand Daft Auto
5. Grand Theft Auto-Tune
6. Grand Theft Autobahn
7. Grand Theft Avocado
8. Grand Theft Go-Kart
9. Grand Theft Jalopy
10. Grand Theft Hubcap
11. Grand Theft Hotwire
12. Grand Theft Joyride
13. Grand Theft Getaway
14. Grand Theft Gridlock
15. Grand Theft Tailpipe
16. Grand Theft Fender Bender
17. Grand Theft Turbo Two
18. Grand Theft Two-Door
19. Grand Theft Tutu
20. Grand Theft Auto Too
21. Grand Theft Ditto
22. Grand Theft Lotto
23. Grand Theft Pinto
24. **Grand Theft Moto** ← drawn: `GrandTheftMoto-5S`
25. Grand Theft Burrito
26. Grand Theft Mojito
27. Grand Theft Stiletto
28. Grand Theft Allegro
29. Grand Theft Ottomatic
30. Grand Theft Ottoman
31. Grand Theft Auto-Pilot
32. Grand Theft Pixel
33. Grand Theft Isometro
34. Grand Theft Neon Nights
35. Grand Theft Rooftop
36. Grand Theft Wheelie
37. Grand Theft Bumper Cars
38. Grand Heist Auto
39. Grand Larceny Lowrider
40. Grand Theft Tow Truck
41. Grand Theft Toot-Toot
42. Grand Theft Odd Job
43. Grand Theft Gotcha
44. Grand Theft Downtown Deux
45. Grand Theft Double Park
46. Grand Theft Parking Ticket
47. Grand Theft Pocket Rocket
48. Grand Theft Hot Rod
49. Grand Theft Ricochet
50. Grand Theft Motor Mouth

## Appendix B: engine references used by this plan

All paths are in `my-3d2dge` @ `cfa866a`.

| Topic | Where |
|---|---|
| Views (orthographic `E.View`, presets, `charView`) | `engine/my-3d2dge.js:428-512` |
| TileMap floor bake / `_isFront` cut / walls / facades | `4375-4412` / `4429-4435` / `4437-4483` / `4047-4103` |
| Solids (`map.solid`, `map.solids`, `groundAt` / `heightAt`) | `7049-7090` |
| Input: `use()`, rebind, `padStyle`, rumble, pad polling, `FIXED_CODES` / `BINDABLE` | `703-709`, `737-782`, `851-960`, `1041-1089` |
| Touch: the floating stick, `_touchSync` | `691`, `820-828` |
| Actions (`E.ACTIONS`, `getUp`, `takedown`) | `5496-5609` |
| Mover / perception / Bullets (`hit` at 5910-5918) | `5689-5805` / `5821-5877` / `5879-5935` |
| Lights (round pools) / the lamp prop's cone polygon | `1248-1342` / `1650-1657` |
| Audio (`ChipAudio`, `audio.ctx`, `music()` on `setInterval`) | `6040-6208` |
| Shell (HTML UI) | `7387-7856` |
| Sessions | `8198-8616` |
| **Side scrolling with depth (Mode 7)**: `DEPTH`, `depthResolution`, `depthFollow`, `depthCut`, `proj`, `rowDepth`, `floor7`, `face7`, `view7`, `pool7`, `wall7` | `src/stress.game.js:615-844` (627, 645, 653, 661-673, 675, 690, 702, 708, 783); `src/labs.json:37`; `docs/LAB-3D.md:175-179` |
| One-point lean (GTA1/2 buildings) | `src/starter/30-shooter.js:138-141` |
| Street look, neon, clutter, knockdown, `Fighter extends Humanoid` | `src/starter/50-brawler.js:38-62, 165-176, 243-300, 358-403` |
| Stealth guards (Mover + Suspicion + FlowField) | `src/starter/70-stealth.js:56-101` |
| Attract demo and autopilot (Emberdeep) | `src/emberdeep/90-scenes.js:156-213, 358`; `93-autopilot.js` |
| Registries / BUS / TUNE | `src/emberdeep/00-core.js:78-102`; `01-tune.js` |
| Handoff template and headless test | `src/handoff/game/{game.js,test.mjs}` |
| `check.mjs` view cycling | `tools/check.mjs:77-79` |
| Actor composite cost | `CHANGELOG.md:241`; `engine/my-3d2dge.js:1779-1784` |

---

## 20. The /goal prompt (run this)

Set the effort to **xhigh**, run `/clear`, and paste the block below. It is also in `GOAL.md`; `npm run lint`
(`goal-sync`) keeps the two identical and under 4,000 characters. Delete the word `ultracode` to keep the run
single-agent.

```
/goal Build GRAND THEFT MOTO (ID GrandTheftMoto-5S) in this repo (michaelcrosato/gta25-cco55-my-3d2dge, branch claude/compassionate-shannon-h7k7zk) exactly as PLAN.md specifies. Read PLAN.md fully first: it is the contract. ultracode: run bounded workflows (max 10 agents, each in its own worktree, never two on one file) only at the fan-out points in PLAN.md section 16.

The game: an original spiritual successor to Grand Theft Auto 2 (PC) with GTA V depth, in the my-3D2dge 2D pixel style, with three views: ISOMETRIC (primary), TOP-DOWN (GTA2 perspective lean, speed climb) and SIDE-SCROLL MODE 7 (the engine's side scrolling with depth). The slice is one polished district, Lowtown, with an enterable bank. The MOTOR engine layer under it must carry the full game, so growing it means adding content, not architecture. A developer Proving Ground exercises every system.

Rules:
- Vendor my-3D2dge v0.46.1 at commit cfa866aa45474868350cad1a7fc015e612f9305f (github.com/michaelcrosato/my-3d2dge) into vendor/my-3d2dge. Patch it only per PLAN.md section 12 (GTM-PATCH markers, PATCHES.md, tests). MOTOR goes in src/motor, content in src/game.
- No runtime dependencies, no network, no binary assets: everything is drawn and synthesized by code. The simulation is deterministic, view-independent and headless-testable.
- A controller-first 10-foot UI for a PS5 DualSense (code-drawn PlayStation glyphs, analog triggers, rumble). Keyboard and mouse map onto the same model. No dense web-style screens. No touch controls: phones run kiosk/attract mode with only a menu button.
- Attract mode: after 10 s without input on the title or its menus, the AI plays showcase reels indefinitely. Any input from any device returns to the title at once. The demo never saves.
- Install whatever tools you need (PLAN.md section 6).

Process: work milestone by milestone (M0-M13). Keep PROGRESS.md current with evidence (tests, screenshots with verdicts, perf numbers, commits). Commit after each green step, push at least once per milestone, and keep the draft PR's CI green. Change scope only through docs/DECISIONS.md, keeping the architecture and one working instance; never cut silently. Read your own screenshots and filmstrips, and fix every look note.

Done only when every item of PLAN.md section 15 holds (counts and budgets as amended in DECISIONS), including:
- npm test and npm run test:full pass, and CI is green (or the section 6.1 fallback);
- dist/index.html is one self-contained file that plays the whole slice from file://;
- all 14 missions, the side content, shops and properties work, and a headless bot campaign reaches 100% completion;
- the three views work outdoors and in the bank, and switching never changes the simulation hash;
- the attract soak and the exit-on-any-input matrix pass;
- the 10-foot UI audit and the controller-only, keyboard-only and mouse-only passes succeed;
- determinism, replay and the performance budgets pass;
- content-recipe tests prove every content type can be added from docs/CONTENT-GUIDE.md alone;
- README.md, the Credits & About screen and the HTML header carry the Source Information and, separately, the engine analysis;
- docs/ENGINE-ANALYSIS.md is final.

End with a chat report:
1. Source Information: Initial Date, SOURCE, GAME ENGINE (version, commit, URL), Environment (CLI/app or cloud, OS, browser), Model and Effort Level (lab, model, effort; only what you can confirm).
2. Separately, the Game Engine Analysis: what you used, what you didn't, and the one thing you would change.
3. How to play, and the PR link.
```
