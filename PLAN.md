# GRAND THEFT MOTO: master plan

**Unique ID:** `GrandTheftMoto-5S` · **Plan:** v1.0, 2026-10-17 · **Status:** planning complete, implementation not started

A vertical slice of an original spiritual successor to *Grand Theft Auto 2* (PC), with *Grand Theft Auto V*-depth systems,
built on the my-3D2dge engine and on **MOTOR**, the open-city engine layer this repository adds to it. The slice is one
polished district, **Lowtown**. MOTOR, the layer underneath, is built to carry the full game.

---

## 0. How to use this plan (for the implementing agent)

- **This file is the contract.** Read it whole before writing code. `GOAL.md` holds the `/goal` prompt that starts the
  run. In M0 you create `PROGRESS.md`. It tracks each milestone's status with evidence: commits, test output, screenshot
  paths and performance numbers. Keep it current, because it is how a cleared or resumed session picks up the work.
- **Order:** work through M0 to M13 (section 13). Inside a milestone, choose your own order. Each milestone ends in this
  state:
  - its acceptance checks pass;
  - `dist/index.html` builds and plays;
  - the work is committed and pushed;
  - `PROGRESS.md` is updated.
- **Decisions:** a reversible call (code, design, a dependency) is made at once and logged in `docs/DECISIONS.md` (date,
  call, why).
- **Scope is never cut silently.** A cut needs a DECISIONS entry. It must keep the system's architecture and at least
  one working content instance, so the full game can still add the content later.
- **Engine questions:** search `vendor/my-3d2dge/API-INDEX.md` first, then `API.md`, then the engine source. The source
  is 727 KB, so grep it; never read it whole. Line references below (`ENG:1234`) point at
  `engine/my-3d2dge.js` @ `cfa866a`.
- **Look at what you build.** Read your screenshots and filmstrips (the vendored `check.mjs` and `filmstrip.mjs`) and
  act on every look note. Humans judge fun from the playable file; you judge correctness from tests, and the look from
  images.
- **`PROGRESS.md` template:**

  ```md
  # Progress: GRAND THEFT MOTO
  Now: M<n>: <what is in flight>. Next: <the next step>. Blockers: <none | what, and who decides>.
  | Milestone | Status | Evidence (commits · tests · shots · perf) |
  |---|---|---|
  | M0 Bootstrap | done | a1b2c3d · npm test 41/41 · docs/media/shots/m0-*.png |
  ## Acceptance log
  - M0 · "dist/index.html plays from file://" · check.mjs report: docs/media/m0-check.json
  ```

---

## 1. Source information

Kept separate from the engine evaluation (section 18), as asked. This block is copied into `README.md`, into the built
game's HTML header, and onto its Credits & About screen.

| Item | Value |
|---|---|
| **Initial Date** | 2026-10-17 (UTC). The first prompt of session `session_01WbNfAChUb9NHRxNSExJF74` came at 02:30 UTC. The repository was created minutes earlier, 2026-10-16 19:29 UTC-7. |
| **SOURCE** | *Grand Theft Auto 2* (PC, 1999; DMA Design / Rockstar Games), with depth, features and gameplay drawn from *Grand Theft Auto V* (2013; Rockstar North). The views: isometric (primary), top-down (secondary), and Mode 7 / side-scroll (third), all in the my-3D2dge 2D pixel style. |
| **GAME ENGINE** | **my-3D2dge v0.46.1**, commit `cfa866a` (2026-10-15), <https://github.com/michaelcrosato/my-3d2dge> (MIT). It is vendored at `vendor/my-3d2dge/` and extended by MOTOR (`src/motor/`). |
| **Environment** | Claude Code (container build 2.1.302) in Anthropic's managed cloud environment: a claude.ai/code remote session started from the Claude desktop app. Linux: Ubuntu 24.04.5 LTS, kernel 6.18, x86_64. Node.js 22.22.0, npm 10.9.4, pnpm 10.28.0, Bun 1.4.2, Python 3.13. Headless Chromium 141 (Playwright build 1194, `/opt/pw-browsers`) for tests; no display or GPU. The game targets desktop Chromium, Firefox and Safari, and runs from one HTML file. |
| **Model and Effort Level** | AI lab: **Anthropic**. *Planning* effort: **max**, confirmed from the session's metadata. *Implementation* effort: recommended **xhigh** with `ultracode` (section 16). The exact model is given only in each session's chat report: this environment keeps model identifiers out of files pushed to the repository. |

---

## 2. The name

The instructions: build a playful version of the SOURCE name, write 50 candidate titles, pick one at random, and append
a 2-character alphanumeric ID as `[GameTitle-XX]`.

- **Method:** Python's `secrets.randbelow(50)` picked index **24** (1-based). `secrets.choice` over `A-Z0-9` drew the ID
  **`5S`**. The script and its output are in the planning session's log.
- **Result:** display title **GRAND THEFT MOTO**, unique ID **`GrandTheftMoto-5S`**. Use the ID for the repository,
  save keys, `E.store` prefixes and the ai-hub entry.
- **Tagline:** *"If it has a motor, it's yours."*
- **All 50 candidates:** Appendix A.

---

## 3. Vision

**Pitch.** Grand Theft Moto is a GTA2-style crime sandbox rebuilt for the couch. Lowtown is a living pixel-art city.
You can see it three ways:
- a crisp **isometric** diorama;
- a GTA2-style **top-down** perspective, where buildings lean away from the centre and the camera climbs as you speed
  up;
- a **Mode 7** street-level chase camera, with a horizon, rushing asphalt and neon.

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
| A top-down camera that climbs with speed; buildings lean in perspective | The TOP-DOWN view is a true perspective camera looking down, with the same lean and speed climb (section 5.2). |
| Three gangs per district with respect meters; working for one angers its rival | Chrome Saints, Harbor Rats and Lawn Gnomes; respect runs -100..100 and the three are rivals in a triangle (section 8.14). |
| Ringing payphones, colour-coded by gang and difficulty | Each gang's payphone rings in its colour and icon, with 1-3 difficulty pips. |
| Wanted heads that escalate (cops, SWAT, FBI, army) | Five stars: cruisers, then chopper and roadblocks, then SWAT, then Feds with spike strips. |
| Kill frenzies | **MAYHEM** skulls: timed rampages. |
| "Gouranga!": the Hare Krishna bonus | **The Marching Mimes.** Flatten the whole troupe and you get **ENCORE!** and a bonus. |
| "Jesus Saves": a church save that costs money | St. Christopher's Chapel: **"Saint Moto Saves"** (a donation, optional). |
| Spray shops, bomb shops, the car crusher | Spray & Pray, Boom Box Garage, the Crush Hour scrapyard. |
| Electrogun, flamethrower, car guns, oil slicks, mines | Zap-O-Matic, Hot Mess, and car mods (roof MG, oil slick, mines, nitro, car bomb). |
| Radio by car class, satirical DJs and ads | Six procedurally composed chip-tune stations, with DJ and ad lines as subtitles. |
| Emergent chaos: peds, cops, gangs and emergency services colliding | Systemic AI where each side reacts to the others: witnesses, gang wars, cops vs gangs, ambulances, fire trucks. |
| Points and cash popping off crimes and stunts | Cash pops (`+$50`) and a HEAT BONUS multiplier during chases. |
| Elevated roads, ramps, rooftop jumps; trains | The Loop elevated expressway, ramps, 5 stunt jumps, rooftop gaps; the L elevated train. |

### What GTA V adds, and where it lives in the slice

| GTA V | Grand Theft Moto |
|---|---|
| Three protagonists, the switch camera, special abilities | Dex (OVERDRIVE), Viv (DEAD CALM) and Gus (RED MIST). The switch zooms out to the sky, pans, and drops in. |
| Heists: setups, a choice of approach, a crew | *The Big Withdrawal*: three setups, LOUD or QUIET, and a crew cut. |
| A wanted level you can search out of, with cops' vision cones | Witnesses and cop sight cones on the radar, a search area, and hiding until they give up. |
| A weapon wheel with slow motion; lock-on aiming | Hold L1 for the radial wheel; L2 locks on. |
| The phone | A 10-foot phone with five apps: Contacts, Texts, Jobs, Snap, Settings. |
| Stats that grow with use | Driving, Shooting, Stamina, Stealth, Strength. |
| Shops and properties | Lead Farm, Boom Box Garage, Threads, Spray & Pray, a diner; 2 properties that pay income. |
| Side jobs and races | Vigilante, Paramedic, Firefighter, Tow, Moto Courier; races, store hold-ups, random events. |
| Day and night, weather | A 24-minute day and 5 weather states, which change traction, lighting and AI. |
| Checkpoints and medals | Checkpoints, instant retry, and 3 bonus objectives per mission that earn a medal. |

### Modernizations: pacing and UX that improve on the source

- **Failing costs little.** Instant retry from a checkpoint; no lives; a cab from the phone skips any drive for a fee;
  autosave after every mission and job, plus a manual save at the chapel.
- **You always know where to go.** A GPS route on the radar, map waypoints, and objective markers that point from the
  screen edge.
- **Aiming is built for a controller:**
  - twin-stick aiming on foot in iso and top-down;
  - lock-on with sticky target switching;
  - aim-assist levels;
  - a Mode 7 crosshair.
- **The HUD reads from the couch.** Prompts show the player's own button glyphs.
- **Accessibility:**
  - subtitles on by default;
  - gang and marker identities by colour *and* shape;
  - a hold or toggle option for every hold action;
  - less shake and flashing on request;
  - HUD scale 100/125/150%.
- **Pacing:**
  - missions run 3-6 minutes, with checkpoints every 60-90 s;
  - no forced drive of more than about 30 s without something happening;
  - a cab skip for repeat travel.

### Pillars

1. **A city that plays itself.** Every system reacts to every other: traffic, peds, cops, gangs, fire, weather.
2. **Three ways to see it, one simulation.** Changing the view never changes the game (this is tested).
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
| **District** | **Lowtown**, Motopolis: 192×192 tiles (about 3 km, stylized). Four neighbourhoods: Neon Mile, Palm Terraces, Brickyard, Harborfront. The Loop elevated expressway, the L elevated train, a canal with a drawbridge, and the harbour. |
| **Protagonists** | Dex Moreno (the wheelman), Viv Okafor (the planner), Gus Pilchard (the loose cannon). |
| **Gangs** | Chrome Saints, Harbor Rats, Lawn Gnomes; plus MPD police, SWAT and Feds. |
| **Story** | 14 missions: a prologue, 3 gang chains of 3 jobs each, and a 4-part heist with LOUD and QUIET approaches. |
| **Side content** | 5 repeatable jobs, 2 street races, 3 MAYHEM rampages, 5 stunt jumps, 25 Moto Tokens, 3 store hold-ups, 4 kinds of random event, 2 properties, 6 shops, a cab skip, an arcade cabinet, photo mode. |
| **Vehicles** | 23 models across 7 classes: car, bike, truck/bus, tow, boat, helicopter, rail. |
| **Weapons** | 11: fists, bat, pistol, SMG, shotgun, rocket launcher, Molotov, grenade, Zap-O-Matic, flamethrower, camera. |
| **Views** | ISO (primary), TOP-DOWN (GTA2 lean), MODE 7 (street level); SIDE for interiors (the bank and Club Chrome). |
| **Modes** | Title, attract/kiosk, free roam, missions, interiors, Proving Ground (developer level), arcade cabinet, photo mode. |
| **Platforms** | Desktop browsers with a gamepad (DualSense first), or keyboard and mouse. Phones run kiosk/attract only. |
| **Delivery** | `dist/index.html`: one self-contained file, no network, no binary assets. |

---

## 5. Perspectives

One simulation, several renderers. **The view is presentation only.** The simulation hash is identical whichever view is
active (section 14).

**How the brief is read.** The brief's third view is "Side Scroll mode 7", and this plan reads it as two things:
- **MODE 7:** a street-level, SNES-style pseudo-3D chase camera. It is the third view you can switch to anywhere
  outdoors (section 5.3).
- **SIDE:** side-scroll cross-sections for interiors and set pieces (section 5.4).

If the owner meant only one of these, drop the other. Each is self-contained: the SIDE kit is the interiors in M7, and
MODE 7 is a preset of the perspective renderer.

### 5.1 ISO, the primary view

- **Base:** the engine's `iso` view (yaw 45°, pitch 30°, `ENG:485-492`), drawn by the engine renderer.
- **Floor:** MOTOR's chunked floor (section 8.4).
- **Buildings:** the engine TileMap's walls, roofs and facades, patched to draw only visible cells (section 12).
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
  - the engine's cut-away (`cut: true` on tall building types) lowers walls between the camera and the player;
  - x-ray silhouettes (`r.actor(..., { xray: true })`) show the player and vehicles behind walls and under decks;
  - deck slabs fade near the player when the player is under them.
- **Lighting:** the engine's canvas lighting, with streetlamp cones, neon emissives and headlight pairs.

### 5.2 TOP-DOWN, the secondary view and the GTA2 look

- **Renderer:** MOTOR's PerspRenderer (section 8.5), in the preset `top`.
- **Camera:**
  - a pinhole camera looking straight down, north up;
  - an option turns it with the vehicle;
  - FOV about 60°.
- **Height:**
  - 220 u on foot;
  - eases up to about 560 u at top speed, the GTA2 speed climb, continuous and cheap here;
  - in a vehicle, the focus leads along the velocity.
- **Buildings:**
  - walls facing the screen centre are drawn as trapezoids that lean outward;
  - roofs scale with height and are drawn tallest last;
  - this is GTA2's composition. The in-repo reference is the one-point lean in the shooter kit
    (`src/starter/30-shooter.js:138-141`).
- **Actors:** the engine's rigs, drawn through a cached top-down local `E.View` and scaled by their height above the
  floor.

### 5.3 MODE 7, the third view at street level

- **Renderer:** MOTOR's PerspRenderer in the preset `m7`.
- **Camera:**
  - **in a vehicle:** behind it, 72 u back and 34 u up;
  - **on foot:** 48 u back and 30 u up;
  - yaw follows the heading through a spring; on foot the right stick turns it.
- **Pitch is a horizon shear** (Doom/Build style), so vertical edges stay vertical and walls render by columns.
- **FOV** widens from 70° to 85° with speed.
- **Sky:** an `E.Backdrop` (`city-night`, `dusk`, `day` blends) whose parallax follows the yaw.
- **Fog:** distance fog, 450-900 u depending on weather.
- **Floor:** each scanline samples MOTOR's world-space chunk textures, with a half-resolution mip beyond 250 u to stop
  shimmer.
- **Buildings:** textured columns written to a per-column depth buffer.
- **Vehicles:** projected per vertex, so they are true perspective.
- **Peds and props:** scaled-orthographic rigs clipped by the depth buffer.
- **Reference:** the stress test's Mode 7 rail (`src/stress.game.js:615-844`) is a working proof of the floor bake and
  the per-scale Views. Its heading is locked north, and ours turns, so our floor is sampled per pixel, not drawn one
  `drawImage` per row.

### 5.4 SIDE, for interiors and set pieces

- **Base:** the engine's `side` view with `E.PlatformMap` + `E.Platformer`. The `brawler` 2.5D tilt is offered as a
  toggle.
- **Characters:** the same Humanoid rigs, weapons (side-plane `Bullets`), and Suspicion-driven guards.
- **Content:** the First Lowtown Bank (vault, records office, lobby) and Club Chrome.
- **Entering:** through a door in the city. The camera dollies into the facade, the scene fades, and the
  cross-section opens.

### 5.5 Switching views

- **R3** (keyboard `V`) cycles ISO → TOP-DOWN → MODE 7. Inside an interior it cycles SIDE ↔ 2.5D.
- **The transition takes 0.35 s:** a dithered crossfade between a snapshot of the old view and the live new view. It
  must never drop a frame below 30 fps.
- **Memory:** the last view is remembered separately on foot and in a vehicle (settings). An optional *Auto* mode
  picks ISO on foot and TOP-DOWN at speed.
- **Ownership:** the attract director and mission cut-scenes may choose views. Everything else is the player's choice.

### 5.6 Camera behaviour, shared by every view

- **Look-ahead:** along the velocity, up to 35% of the screen at top speed.
- **Shake:** on impacts, explosions and gunfire, scaled by the reduce-motion setting.
- **Cinematic shots:**
  - stunt jumps: slow motion with a Mode 7 orbit;
  - wrecked and nabbed cameras;
  - the switch camera: top-down climbing to 2,500 u, then a pan, then a drop;
  - mission intro fly-overs;
  - the attract director's shot list.

---

## 6. Tech stack and repository layout

### 6.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Engine base | **my-3D2dge v0.46.1, the full edition** (`engine/my-3d2dge.js`), vendored and pinned. | It is the richest edition: props, lighting, x-ray, Mover, perception, sessions and standard features. The agent edition leaves these out. MIT. |
| MOTOR and game code | **JavaScript (ES2022) modules, no runtime dependencies.** | The engine's idiom and doctrine (common ground, no deps). |
| Bundling | **esbuild** (pin exactly; 0.28.2 is current) bundles `src/main.js` into one IIFE. | Standard, fast, real imports. This deliberately departs from the engine's shared-scope file join (its D5, grandfathered there): this repository is not bound by D5, and modules give explicit seams for parallel work. Log it in DECISIONS. |
| Build | `tools/build.mjs` (about 80 lines) bundles, inlines the engine and the bundle into `src/index.template.html`, and writes `dist/index.html`. | One self-contained file that runs from `file://`, the engine's model. A rebuild of an unchanged tree must be byte-identical (tested). |
| Dev loop | `tools/serve.mjs` (`node:http`, no deps) plus esbuild watch. | Fast iteration in a browser. |
| Tests | `node:test` for unit and sim tests (the engine runs headless in Node). **Playwright pinned to 1.56.1** for browser tests. | 1.56.1 is the release built for the container's Chromium 141 / build 1194 (checked). Use `CHROMIUM_PATH=/opt/pw-browsers/chromium` and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. Outside the cloud, run `npx playwright install chromium`. The engine repo's `^1.56.0` resolves to 1.64.1, which expects Chromium 156: it works, but drifts. |
| Engine tools reused | The vendored `check.mjs`, `filmstrip.mjs` (`--seed`, `--compare`, `--expect-same`) and `replay.mjs`. | They are generic: they work on any page that loads the engine. |
| Lint | ESLint flat config, pinned (10.x): `recommended` plus `no-undef`, and a custom rule that bans `Date`, `performance.now`, `setTimeout` and `crypto` inside `src/motor/sim/**` and `src/game/**`. | Protects determinism. |
| Media | ffmpeg (bundled at `/opt/pw-browsers/ffmpeg-1011`). | Attract-mode MP4 and GIF captures for the README, made from the filmstrip frames. |
| CI | GitHub Actions `.github/workflows/ci.yml`: `npm ci`, build, lint, unit + sim, e2e smoke (Playwright installs Chromium in CI). | Keeps the PR green and makes handoff safe. |
| Cloud sessions | `.claude/settings.json` + `.claude/hooks/session-start.sh`: `npm ci` and `CHROMIUM_PATH`, as the engine repo does. | Future agents start ready. |
| Deploy | Static: `dist/index.html`. An optional `vercel.json`, or GitHub Pages: the owner's call. Never publish without the owner's go-ahead. | |

**Tools to install in M0:** `npm ci` (esbuild, playwright 1.56.1, eslint, optional terser). Chromium and ffmpeg already
exist in `/opt/pw-browsers`. Nothing global is needed. If a later need appears (an image diff, a WAV analyser), add it as
a pinned devDependency or a small script, and log the decision.

### 6.2 Repository layout

```
README.md                    game README: pitch, how to play, controls, Source Information, then the engine analysis (separate)
PLAN.md  GOAL.md  PROGRESS.md
package.json                 exact pins; "type": "module"
vendor/my-3d2dge/            the pinned upstream (MIT): engine/my-3d2dge.js, API.md, API-INDEX.md, AI_GUIDE.md,
  │                          docs/{STANDARD-FEATURES,ASSETS,MOCAP}.md, tools/{check,filmstrip,replay}.mjs (they need only playwright),
  │                          mocap/{readable,mocap}.js plus our cut clip set, LICENSE, UPSTREAM-README.md
  ├─ VERSION.json            upstream URL, version 0.46.1, commit cfa866a…, sha256 of every vendored file before and after patches
  └─ PATCHES.md              every GTM-PATCH: what, why, the hunk, its test, and upstream issue text
src/
  index.template.html        page shell: boot splash (E.bootSplash), meta, the Source Information comment
  main.js                    entry point: make the game, register MOTOR systems and Lowtown content, start the scenes
  motor/                     MOTOR, the open-city engine layer (generic: no Lowtown names in here)
    core/      registry.js bus.js tune.js rng.js clock.js schema.js log.js
    input/     actions.js activity.js analog.js glyphs.js prompts.js rumble.js
    world/     district-dsl.js builder.js validator.js citymap.js chunks.js decks.js zones.js pois.js interiors.js
    render/    projector.js floor-chunks.js deck-render.js persp/{renderer,floor,boxes,clip,light}.js view-manager.js
               sky.js fx-decals.js weather-fx.js
    sim/       actor.js intent.js ped.js ped-rig.js vehicle/{body,classes,model,damage,seats,tow,lights}.js
               projectile.js fire.js pickup.js prop.js world.js lod.js
    nav/       roadgraph.js signals.js gps.js sidewalks.js
    ai/        driver.js traffic.js pedbrain.js crowd.js police.js gangbrain.js emergency.js autoplayer.js director.js
    play/      combat.js weapons.js wanted.js factions.js economy.js stats.js abilities.js switching.js
               photo.js collectibles.js completion.js
    mission/   dsl.js runtime.js objectives.js checkpoints.js activities.js grading.js
    audio/     audiox.js voices.js radio.js composer.js sfxmap.js ambience.js
    ui/        tenfoot.js widgets/*.js hud.js radar.js mapscreen.js wheel.js phone.js menus/*.js toasts.js subtitles.js
               cards.js ui-scale.js
    save/      save.js migrations.js
    debug/     handle.js deeplinks.js overlays.js devmenu.js perf.js
    index.js   MOTOR's public API (the only thing src/game may import)
  game/                      Grand Theft Moto content: data and scripts that register into MOTOR
    tune.js                  every gameplay number, as TUNE knobs
    districts/lowtown/       blocks.js roads.js landmarks.js zones.js spawns.js props.js interiors/{bank,club}.js
    districts/proving/       the developer Proving Ground
    vehicles/ weapons/ peds/ gangs/ characters/ shops/ properties/ missions/ activities/ radio/ reels/ arcade/ scenes/
tools/   build.mjs serve.mjs test-run.mjs map-sheet.mjs shots.mjs perf.mjs soak-attract.mjs bot-campaign.mjs
         ui-audit.mjs pad-shim.js boundary-check.mjs vendor-check.mjs record-attract.mjs
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
| `lint` | ESLint, plus `boundary-check` (no reach-through) and `vendor-check` (checksums and patch list). |
| `test` | The fast gate, under 6 minutes: lint, unit, sim smoke, e2e smoke (boot, title, play, each view, attract enter and exit), and `check.mjs` on the dist. |
| `test:full` | `test` plus 10-minute traffic and crowd sims, the wanted scenarios, the bot campaign, the attract soak, the UI audit, the screenshot matrix, perf, determinism and replay, recipes, and phone emulation. |
| `soak` · `bot` · `shots` · `perf` · `audit` | Each heavy suite on its own. Each takes `--seed`, `--minutes` and `--out`. |
| `check` | `node vendor/my-3d2dge/tools/check.mjs dist/index.html`. |

---

## 7. Architecture (MOTOR)

### 7.1 Layers and boundaries

```
src/game     content (Lowtown, the Proving Ground): data and mission scripts. Imports only src/motor/index.js.
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
   1. Poll the devices and update the ActivityMonitor.
   2. The HumanController turns the action map into an `Intent` for the possessed protagonist.
   3. The AI brains, time-sliced, write their own Intents.
2. **Scripts:** the mission and activity runtime resumes its generators; triggers and the attract director run.
3. **Actors:** peds (Mover/Body), vehicles (physics), projectiles, fire, pickups, props.
4. **Collisions and damage:** these emit BUS events (`crime`, `hit`, `explode`, `vehicleDamage` ...).
5. **Systems:** wanted, factions, economy and stats, the traffic and ped spawners, emergency dispatch, the clock and
   weather.
6. **Camera:** target, look-ahead, speed zoom, shake.
7. **UI model:** HUD state, toasts, prompts. Nothing is drawn here.

Each frame then draws:
1. the active view's world renderer;
2. actors;
3. particles;
4. lights;
5. HUD;
6. menus and overlays.

**Draw never changes simulation state.** Headless runs skip drawing, so anything that happens in draw doesn't exist for
tests.

### 7.3 Determinism

- **Time:** take it from the engine's clock only (`dt`, `game.time`).
- **Banned in the simulation:** wall clock, `setTimeout`, `async` and promises. The lint rule enforces this. Boot steps
  may be async.
- **Gameplay randomness** comes from `MOTOR.rng.stream(name)`. It is `E.rng` (mulberry32) seeded from
  `hash(worldSeed, name)`. Each system has its own stream: `traffic`, `peds`, `police`, `gangs`, `loot`, `missions`,
  `weather`, `spawn`, `attract`.
  - A new feature takes a new sub-stream, so existing rolls never shift. This is Emberdeep's pattern
    (`src/emberdeep/32-wardens.js:151`).
- **Cosmetic randomness** (particles, rig blinks, flicker) may use `Math.random`. It must never feed back into the
  simulation.
- **`game.stateHash`** covers:
  - the protagonists' positions, quantized;
  - the vehicles' count and positions;
  - wanted heat and stars;
  - money and respect;
  - mission state;
  - the clock and the weather.
- **Proofs:**
  - the same seed and scripted inputs give the same hash after N steps, with or without drawing;
  - the same hash whichever view is active;
  - a session recorded with `?record=1` replays exactly through the vendored `replay.mjs`.

### 7.4 Registries, the BUS and TUNE

This is Emberdeep's proven pattern (`src/emberdeep/00-core.js:78-102`, `01-tune.js`), plus schema validation.

**Registries.** `def(kind, id, spec)`. Each kind declares a small schema (required fields, types, defaults) in
`core/schema.js`. A bad spec warns once through `E.warn` with the file and id, and falls back to defaults. The registry
kinds: `districts`, `zones`, `interiors`, `vehicles`, `vehicleModels`, `weapons`, `peds`, `outfits`, `gangs`,
`characters`, `abilities`, `crimes`, `policeTiers`, `missions`, `activities`, `events`, `reels`, `stations`, `songs`,
`ads`, `shops`, `items`, `properties`, `pickups`, `props`, `collectibles`, `stunts`, `races`, `glyphSets`, `cameraShots`,
`uiScreens`.

**The BUS.** `BUS.on(event, fn, scope)` and `BUS.emit(event, data)`. Scopes are `global`, `world` (cleared when a
district loads), `mission` (cleared when a mission ends) and `scene`. The catalogue, in `docs/ARCHITECTURE.md`:
- crime and police: `crime`, `witness`, `report`, `wanted`, `search`, `evaded`, `busted`, `wrecked`;
- combat: `hit`, `kill`, `explode`, `fire`;
- vehicles: `vehicleEnter`, `vehicleExit`, `carjack`, `vehicleDamage`, `vehicleDestroyed`;
- rewards: `pickup`, `cash`, `respect`, `stunt`, `collectible`, `stat`;
- missions: `missionStart`, `missionPass`, `missionFail`, `checkpoint`, `activityStart`, `activityEnd`;
- player: `switch`, `ability`;
- world: `view`, `radio`, `clock`, `weather`;
- save: `save`, `load`;
- attract: `attractBeat`;
- UI: `uiOpen`, `uiClose`.

**TUNE.** Every gameplay number is a knob in `src/game/tune.js`: `knob(section, id, label, default, min, max, step,
about)`. That covers handling, densities, wanted timers and thresholds, prices, damage and AI radii. Overrides are saved
apart from the game save. The dev menu builds a page for each section by itself. `docs/TUNING.md` is generated from the
knob list.

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

- **Intent** (`sim/intent.js`) is one struct used by every controller:
  - on foot: `move[2]`, `aim[2] | aimTarget`, `look[2]`;
  - buttons: `sprint`, `jump`, `roll`, `crouch`, `attack`, `aimHold`, `interact`, `reload`, `ability`;
  - in a vehicle: `throttle 0..1`, `brake 0..1`, `steer -1..1`, `handbrake`, `horn`, `fire`, `nitro`;
  - UI: `wheel`, `phone`, `map`, `pause`, `view`, `switch`.
- **Controllers:**
  - `HumanController`: the action map → Intent;
  - `AutoPlayer`: attract and bot;
  - `PedBrain`, `DriverBrain`, `CopBrain`, `GangBrain`.
  - Ped and vehicle code reads an Intent and never `game.input`, so the attract AI drives the very same code paths as
    a player. This is Emberdeep's `h.bot ? h.bot.input : game.input` (`src/emberdeep/20-hero.js:193`), generalized.
- **Possession:**
  - the HumanController possesses one protagonist;
  - switching hands the previous one to an ambient brain;
  - vehicles take their Intent from the driver seat's occupant.

### 7.6 World model and scale

- **Building a district.** `world/builder.js` turns a district definition (section 8.3) into a **CityMap**, from the
  seed and deterministically:
  - one engine `E.TileMap` for cells, heights, wall types (materials and facades) and floor tags. It is used for
    collision, sight, ledges, FlowField and walls; its whole-map floor bake is never used;
  - a surface grid: asphalt, sidewalk, curb, crosswalk, grass, dirt, water, deep water, rail, deck, plus markings;
  - the **lane graph** and the **sidewalk graph**;
  - **decks** (elevated roads and bridges): collision boxes plus render geometry, with clearance underneath;
  - **zones**: neighbourhood, gang turf, police patrol, no-spawn, water;
  - **POIs**: payphones, shops, the safehouse, the hospital, the precinct, doors, garages, stunt ramps;
  - spawn slots (parking, peds, gang hangouts) and collectibles.
- **Chunks:** 16×16 tiles (256 u). They hold floor textures, spawn bookkeeping, radar tiles and LOD.
- **Scale sheet** (1 tile = 16 u; tune these in the Proving Ground's scale yard):

  | Thing | Size (u) | Notes |
  |---|---|---|
  | Pedestrian | about 29 tall (Humanoid `size` .9); protagonists 1.0 (about 32) | Body r 5; eye 30, chest 22 (`E.HEIGHTS`) |
  | Compact / sedan / sports | 52×24×20 / 58×26×22 / 60×26×18 | |
  | Van / bus / truck | 66×30×34 / 124×34×44 / 90×32×40 | |
  | Moto | 30×10×18, plus the rider | |
  | Lane | 36 | traffic drives on the right |
  | 2-lane street | 5 tiles (80) | 4-lane avenue: 9 tiles (144), with an 8-u median |
  | Sidewalk | 2 tiles each side | curb 2 u: cars bump over it, peds step |
  | Building block | 14-18 tiles; the block pitch is about 24 tiles | storey 24 u: low-rise 1-3 storeys, mid 4-6, Neon Mile towers up to 8 (192 u) with cut-away |
  | The Loop deck | z 64, 6 tiles wide (2+2 lanes) | pillars every 4 tiles; 4 ramps |
  | L track | z 100, 3 tiles wide | stations about 12 tiles long |
  | District | 192×192 tiles (3,072 u) | |
  | Speeds | walk 50, run 85, sprint 125 (Mover defaults); cars 180-300 u/s top; bikes about 290; police 270 | arcade feel first; tune by playtest |

### 7.7 The rendering architecture

| View | World | Actors | Lighting | Particles |
|---|---|---|---|---|
| ISO | MOTOR `floor-chunks` (affine `drawImage` per visible chunk), then engine `TileMap.queueWalls` (patched), then MOTOR `deck-render` (slab pieces through `r.queue`/`r.box`) | engine `r.actor` / `r.queue` (depth-sorted; `footprint` for long vehicles) | engine canvas lighting (`game.lights`) | engine particles |
| TOP / M7 | MOTOR `persp/*`: a software floor, building boxes, decks and a depth buffer, into one ImageData | `Projector`: vehicles per vertex, rigs through cached local `E.View`s, clipped by depth | MOTOR's per-pixel lights, fed from the same light list | `game.particles.list`, projected by MOTOR |
| SIDE | engine PlatformMap | engine | engine | engine |

- **The Projector interface:** `project(x, y, z) → [sx, sy, depth]`, `scaleAt(depth)`, `actorView(x, y, z, facing)`.
  Vehicle models, props, markers and decals call it, so the same drawing code works in every view.
- **One light list:** `LightList` is filled once per frame, from streetlamps, neon, headlights, sirens, fires, muzzle
  flashes and explosions. In ISO it feeds `game.lights.add`; in the perspective views, the PerspRenderer reads it.

### 7.8 The save schema

Saves go through `E.store` (localStorage, the `my3d2dge:` prefix) under `GrandTheftMoto-5S:save:<slot>`. Settings and
tuning are kept apart from the save.

```js
{ schema: 1, game: 'GrandTheftMoto-5S', slot, label, playtime, gameDay, clock, weather,
  active: 'dex', protagonists: { dex: { pos, district, outfit, weapons, ammo, health, armor, stats, ability }, viv: {...}, gus: {...} },
  crewFund, respect: { saints, rats, gnomes }, missions: { done: [], medals: {} }, activities: { id: level },
  collectibles: [], stunts: [], properties: [], garage: [ { model, color, mods } ], completion, rngSeed }
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
  - missions: `startMission(id, { checkpoint })`, `pass()`, `fail()`;
  - cheats: `give(item)`, `money(n)`, `respect(gang, n)`;
  - inspection and bots: `snapshot()`, `stateHash()`, `botRun(opts)`, `attract(seed)`.
- **`game.debug.snapshot()`** returns the player, view, mission, wanted and fps, which `check.mjs` prints.
- **Deep links:**
  - scenes: `#title`, `#attract`, `#play`, `#play/<poi>`;
  - missions: `#mission/<id>[/<checkpoint>]`;
  - developer: `#proving[/<zone>]`, `#interior/<id>`, `#ui/<screen>`, `#arcade`;
  - query options: `?seed=`, `?view=iso|top|m7`, `?time=`, `?weather=`, `?kiosk=1`, `?dev=1`, `?record=1`,
    `?selftest=1`.
- **Dev menu** (`?dev=1`, or Settings → Developer):
  - god mode, no police, AI freeze, time scale, frame step;
  - spawning, teleport, the wanted level, time, weather;
  - mission select, unlock all;
  - the overlays: lanes, nav, sight cones, chunks, AI states, physics, perf;
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

- **Targets** in the dev container's headless Chromium, with a 480×270 buffer (1080p at S = 4):
  - update ≤ 1.5 ms per step on average (≤ 3 ms per frame);
  - draw ≤ 9 ms in ISO, ≤ 11 ms in TOP and M7;
  - p99 frame ≤ 20 ms during a 5★ night chase in the rain.
- **Resolution:** `res: 'ps1', expand: { maxW: 560, maxH: 320 }`.
- **Vehicle LOD:**
  - full tyre physics within about 1.5 screens;
  - beyond that, kinematic lane followers out to the despawn ring.
- **Ped LOD:**
  - near: a full brain at 10 Hz and Body every step;
  - far: coarse steps;
  - their rigs use `r.actor({ every: 2, key })` beyond a radius;
  - outlines off for the crowd.
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
  - the engine `Input`: bindings, `input.rebind(action, device, code)` and `unbind` (`ENG:737-745`);
  - DualSense detection (`padStyle`, `ENG:760-764`, matching `054c|playstation|dualsense|dualshock|wireless
    controller`);
  - deadzone and invert;
  - `input.rumble(strength, seconds)` (dual-rumble, `ENG:774-782`).
- **Build:**
  - **ActionMap:** controller-first actions per *context* (`onFoot`, `vehicle`, `menu`, `wheel`, `phone`, `photo`,
    `interior`), built over engine actions. Contexts switch on enter and exit; the engine's menu keys stay so nobody
    locks themselves out.
  - **Analog** (GTM-PATCH 4): `padValue(code)` reads `button.value` (triggers, 0..1) and both stick vectors. Polling
    covers **every** connected pad, and the *active* pad is the last one used. Today the engine reads the first pad
    only and `pressed` only (`ENG:934-960`).
  - **ActivityMonitor** (GTM-PATCH 4 adds the raw hooks): `activity.lastTime` and `activity.since(t)`. It counts:
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
  - unit tests: chords, hold/toggle, context switching, glyph resolution;
  - e2e with `tools/pad-shim.js`, which overrides `navigator.getGamepads` with id
    `DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)`:
    - PlayStation glyphs show;
    - R2 at 0.5 gives throttle 0.5;
    - unplugging pauses play;
    - a stick or trigger alone wakes the attract mode;
    - every screen can be driven by pad, by keyboard only and by mouse only.

### 8.2 Camera and the view manager

- **Build:** `render/view-manager.js` owns the active view, the transitions, per-context memory, and the camera rig
  (focus, look-ahead, speed zoom, shake, cinematic shots), as described in section 5. It exposes the Projector for the
  active view.
- **Accept:**
  - switching views mid-chase leaves the sim hash unchanged;
  - a transition takes ≤ 0.35 s, with no frame over 33 ms;
  - speed zoom is continuous in TOP and M7;
  - ISO zoom moves through ≤ 3 cached levels with no frame over 20 ms.

### 8.3 The city builder and the district DSL

- **Data:** `def('districts', 'lowtown', { size: [192, 192], seed, blocks, roads, decks, water, zones, landmarks, pois,
  props, interiors })`.
  - **Blocks** are block-level ASCII plus building specs:
    - footprint, storeys, facade (an engine wall type: `face` material, windows, shutters, balcony, door chance);
    - roof (`tiles`, `slab`, `grass` and so on), clutter (AC units, water tanks, billboards), signage (neon text and
      colour);
    - `cut: true` for anything tall.
  - **Road types:** `street`, `avenue`, `alley`, `deck`, `bridge`, `ramp`.
    - Lanes, the right-hand rule, crosswalks, signals (at avenue crossings) and stop signs (elsewhere) are derived
      automatically.
    - An override may say otherwise.
  - **Props** are placed by rule: lamps every N tiles, hydrants near corners, bins, benches, trees, payphones,
    newsstands. Each prop is drawn with `r.prop` / `r.shape`; solids are added at build time.
- **Build:**
  - **`builder.js`** builds everything in section 7.6 from the definition and its seed. Facade and colour variations
    come from a seeded stream.
  - **`validator.js`** reports:
    - unreachable cells;
    - lanes with no way out;
    - POIs on blocked cells;
    - decks without ramps;
    - interiors without doors.
  - **`tools/map-sheet.mjs`** draws a PNG of the whole district, with lanes, zones and POIs, for review.
  - **Street floor:** reuse the brawler kit's floor recipe (sidewalks, curb, gutters, asphalt, crosswalks, lane paint,
    manholes, puddles, `src/starter/50-brawler.js:38-62`), its neon signs (165-170) and its street clutter (171-176),
    ported with attribution (MIT).
- **Accept:**
  - Lowtown builds headless in under 1.5 s;
  - the validator is clean;
  - every POI is reachable both by road and on foot (graph tests);
  - the map sheet has been reviewed and committed to `docs/media/`.

### 8.4 ISO world rendering

- **Reuse:**
  - the TileMap's walls, roofs, facades and materials (`ENG:4047-4103`, `4437-4483`), and its collision and height
    rules;
  - `r.prop` and `r.shape`; x-ray; cut-away; canvas lighting with `cone: true` streetlamps.
- **Build:**
  - **`floor-chunks.js`:**
    - each 256×256-unit chunk is baked once into a world-space texture (1 texel per unit; a Canvas, plus a `Uint32Array`
      copy for the perspective views);
    - the bake draws surfaces, lane paint, curbs, manholes, puddles, oil stains, grass, water, and AO along wall bases
      (from map heights);
    - **ISO draws each visible chunk with one affine `drawImage`**, using the view's `ax, ay, bx, by` and
      `imageSmoothingEnabled = false`; no re-bake on zoom or yaw;
    - an LRU of about 48 chunks;
    - bakes are time-sliced, at most 2 per frame, and spill to the next frame;
    - the water shimmer and the wet sheen are separate light passes;
    - **check this against the engine's own baked floor in screenshots.** If the affine blit reads noticeably softer or
      jaggier, add crisp per-view bakes for the 4 ISO yaws at the current zoom. Do it incrementally (a few rows per
      frame), and draw the affine version until a bake is ready.
  - **`deck-render.js`:** the Loop and the bridges are slabs one tile long, queued through `r.queue` with `r.box`: road
    texture on top, side faces, railings and pillars. A slab sorts by its own `x, y, z`, so actors under it and on it
    sort correctly.
  - The engine TileMap is used for walls with GTM-PATCHes 1-2 (the visible window, a bounded cache). **Never call
    `map.drawFloor`** on the city map: it bakes the whole map into one canvas per view, about 20 M px at 192² tiles,
    with multi-second stalls (`ENG:4375-4412`).
- **Accept:**
  - ISO draw ≤ 9 ms at night in the rain, with 20 cars and 40 peds in view;
  - screenshots of each neighbourhood, day and night, pass the look checklist (section 10);
  - `check.mjs` raises no "flat", "thin palette" or "low contrast" notes.

### 8.5 The perspective renderer (TOP and M7)

- **Build:** `render/persp/*`. One renderer, two presets.
  1. **Sky** (M7): an `E.Backdrop` painted with a yaw-parallax offset.
  2. **Floor:**
     - **M7:** scanline sampling from the chunks' `Uint32Array`s into an ImageData, with mip 1 beyond 250 u, fog, and
       per-pixel light from the LightList (culled per chunk);
     - **TOP** (pitch 90): an axis-aligned scaled `drawImage` of each chunk Canvas. The fast path.
  3. **Buildings:**
     - each chunk precomputes its cells as **box spans**: maximal rectangles of equal height and wall type;
     - wall faces are textured from the wall type's material pattern and facade rules: a window grid, doors, lit windows
       at night;
     - **M7:** column rendering into a per-column depth buffer. Vertical edges stay vertical because pitch is a horizon
       shear;
     - **TOP:** side faces that face the centre are drawn as trapezoids, then the roofs, tallest last.
  4. **Decks:** box spans like the buildings, with clearance underneath.
  5. **Dynamic objects**, sorted by depth:
     - vehicles: each model's vertices are projected, so they are true perspective;
     - peds and props: drawn through a cached local `E.View` per yaw bucket (15°) and scale bucket (1/16 steps), at the
       projected anchor. In M7 they are clipped against the depth buffer in column runs, with `ctx.clip` rects. If fully
       hidden, they get an x-ray silhouette when they are the player.
  6. **Particles:** `game.particles.list`, projected.
  7. **Lights and glows:** emissive sprites drawn after lighting.
  8. **HUD:** shared with every view.
- **Accept:**
  - both presets render Lowtown with draw ≤ 11 ms at 480×270;
  - a 200-frame filmstrip of a street chase in M7 shows no actor through a building, checked by eye and by an automated
    depth test on a fixture scene;
  - TOP screenshots show GTA2's composition: lean toward the centre, roofs growing with height.
- **Fallback, if the spike in M1 shows it isn't achievable** (log it as a decision):
  - TOP becomes the engine's orthographic `topdown` plus the shooter kit's one-point lean for the walls;
  - M7 becomes a heading-locked floor drawn by rows, the stress test's method. The yaw snaps to the 4 axis directions,
    each with a pre-rotated floor texture: a row strip only works along an axis.

### 8.6 Lighting, time of day, weather and effects

- **Time:**
  - one game day = 24 real minutes (TUNE);
  - the sun's angle drives `lights.ambient`, `dark`, `tint`, `darkness` and the backdrop blend (day, dusk, night,
    `city-night`). The engine has no day/night helper; animate those fields (`ENG:1313-1316`);
  - streetlamps switch on at dusk; neon flickers; windows light at random at night.
- **Weather:**
  - states: clear, overcast, rain, storm (lightning flash and thunder), fog;
  - it changes every 1-3 game hours, from the `weather` stream;
  - rain: projected streaks, splashes, puddle shimmer, glow smears from lights on wet floors, traction × 0.8, and peds
    who hurry or shelter under awnings;
  - fog: shorter M7 fog and dimmer neon halos.
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
    recomputes when the player leaves the route, and draws the route on the radar, with optional floor arrows;
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
    - `bike`: lean, a cosmetic wheelie, the rider thrown off in a hard crash;
    - `truck`/`bus`: heavy, wide turning circles;
    - `tow`: a hook with a spring-damper joint to the towed car;
    - `boat`: water cells only, a buoyant bob, a wake;
    - `heli`: altitude 0-200 u, hover and tilt, rotor wash. AI police; playable in the Proving Ground;
    - `rail`: the L, on a spline, with a timetable, doors at stations, and deadly to peds and cars.
  - **Models** (`sim/vehicle/model.js`): data such as
    `{ parts: [{ box: [x0, y0, z0, x1, y1, z1], mat, role: 'body' | 'cabin' | 'glass' | 'wheel' | 'light' | 'siren' | 'sign' | 'bumper' }], seats, doors, lights, palette }`.
    - Vertices are projected through the Projector into per-face `px.poly`s, shaded with `E.tones` by face normal and
      sun.
    - Front wheels steer visibly.
    - **Damage:** dented vertices per zone, smoke at 40%, fire at 15%, an explosion 4 s later. A car that rolls over
      lands upside down and burns.
  - **Seats and getting in:**
    - getting in, getting out and carjacking are `E.ACTIONS` beats: walk to the door, open it, (yank the driver out),
      sit (mocap);
    - the jacked driver tumbles and either flees or fights;
    - getting out above 60 u/s is a dive roll;
    - passengers;
    - police cars are locked: breaking in takes 1.2 s and raises heat;
    - bikes are mounted at once.
  - **Lights:**
    - headlights: a cone light in the LightList;
    - brake and reverse lights;
    - sirens: alternating red and blue emissives plus lights;
    - the taxi sign; the bus's interior glow.
  - **Radio:** a default station per class; switch with ← and →.
  - **Mods** (Boom Box Garage): paint, armour (health ×1.5), nitro (L1), oil slick, mines, a roof MG (fires with ○),
    and a car bomb (set on exit, triggered by ignition or by remote from the phone).
- **Data:** `def('vehicles', 'cortez', { class: 'car', model: 'cortez', mass, power, top, grip, brake, steer, drift,
  health, seats: 4, radio: 'lounge', spawn: { zones, weight, timeOfDay }, price, tags })`.
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
  - a model sheet of every vehicle in 3 views, in `docs/media/`.

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
  - **Spawner:**
    - density by zone, time and weather;
    - spawns in a ring outside the view and never in view (tested against the camera frustum);
    - despawns what is far and unseen;
    - parked cars are seeded per slot, persist, and wake when touched.
- **Accept** (a 10-minute headless sim of Lowtown):
  - no deadlock: no car stopped over 20 s without a cause;
  - no cars inside each other;
  - zero signal violations by calm drivers;
  - average speed inside its band;
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
    - idles: phone, chat, bench, window-shopping, the club's dance floor, hailing a cab;
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
    - an ambulance comes to bodies; the paramedics may revive non-story peds;
    - a fire truck comes to car and prop fires and uses its water cannon;
    - the police answer reports.
  - **The Marching Mimes:** a troupe of 6 walking in single file. Hurt one and they all attack. Flatten them all with a
    vehicle for **ENCORE!**
- **Accept** (a 10-minute crowd sim):
  - no ped stuck over 15 s;
  - fleeing moves away from the threat;
  - a witness's call leads to a dispatch, and killing or scaring the witness cancels it;
  - each reaction can be seen in a filmstrip.

### 8.11 Protagonists, switching, abilities, stats and outfits

- **Protagonists** (`def('characters', ...)`):
  - each of the three persists in the world: position, vehicle, health, weapons, outfit, stats;
  - they share a *crew fund* (one wallet, a simplification; log it).
- **Switching:**
  - hold ↓ for the character wheel: 3 live portraits (`rig.drawPortrait`), each with a status line;
  - release, and the camera climbs (TOP preset, up to 2,500 u, 0.8 s), pans, and drops (0.8 s);
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
  - `E.Bullets` (the `ground` plane), `E.Attack` / `E.Combo` / `E.MOVES` (`jab cross hook uppercut overhead bash`),
    `E.knockback`, `game.hitFx`;
  - `rig.hand()` / `rig.tip()` / `rig.worldOffset()`;
  - mocap: `Pistol_*`, `OverhandThrow`, `Punch_*`.
- **Build:**
  - **Aiming:**
    - the right stick sets the aim direction (twin-stick) in ISO and TOP;
    - the mouse aims at the ground cursor (`game.mouseGround()` in ISO; MOTOR unprojects in the perspective views);
    - **L2 locks on** to the nearest valid target in a 70° screen cone, and a right-stick flick switches target;
    - aim assist has levels off, low, standard;
    - on foot in M7: a centre crosshair plus lock-on.
  - **Weapons registry:** `{ slot, ammo, mag, rate, spread, damage, range, projectile: 'bullet' | 'pellets' | 'rocket' |
    'molotov' | 'grenade' | 'stream' | 'zap' | 'photo', sound, recoil, rumble, model, price, unlock }`.
  - **Weapon layer:** `PedRig` draws weapon models at the hand joints. The engine's `weapon: 'gun'` is a one-handed
    pistol only (`ENG:3595-3598`). Long guns use `point: true` plus `aim` and a drawn stock. Bring the off hand to the
    foregrip where the rig allows it; otherwise use a stylized shouldered pose, and log it.
  - **Hits:**
    - bullets get a z filter (ignore |dz| > 20, because engine bullet hits are 2D circles, `ENG:5899`);
    - OBB hits against vehicles; props; tracers; shell casings.
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
  - **mission CCTV.**
- **Heat to stars** (TUNE): 20 / 60 / 150 / 300 / 600. Missions can set a floor or a cap.
- **Dispatch tiers** (`def('policeTiers', ...)`):

  | Stars | Response |
  |---|---|
  | 1★ | The nearest patrol car and foot cops. They try to arrest first. |
  | 2★ | More cruisers, and they shoot. |
  | 3★ | The MPD Eye chopper (a spotlight at night, it follows line of sight), and roadblocks on the predicted route, outside the view. |
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
  - roadblocks spawn ahead, out of view;
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

### 8.15 The missions and activities runtime (the DSL)

- **Data:**

  ```js
  defMission('saints_holy_rollers', { title: 'Holy Rollers', giver: { phone: 'saints' }, gang: 'saints', tier: 1,
    requires: ['prologue'], brief: ['Father Fender needs three cars blessed by midnight.'],
    rewards: { cash: 2500, respect: { saints: +15, rats: -5 } },
    bonus: [{ id: 'time', text: 'Under 6:00', check: m => m.elapsed < 360 }, ...],
    *run(m) { /* generator script */ } })
  ```

- **The `m` API** (generator-friendly; each call yields until it is done):

  | Group | Calls |
  |---|---|
  | Objectives | `objective(text, { hint })`, `marker(at or actor, opts)`, `route(to)` |
  | Waiting | `waitUntil(pred)`, `wait(s)` |
  | Talking | `say(lines, { name, portrait })` (subtitles and live portraits), `cutscene(shots)` |
  | Spawning | `spawn.vehicle / ped / pickup / prop(...)` |
  | Verbs | `deliver({ what, to })`, `chase(target)`, `follow(target, { dist })`, `protect(actor)`, `race(course)`, `timer(s)` |
  | Wanted | `wanted.set / floor / cap / clear` |
  | Flow | `checkpoint(name)`, `failIf(pred, reason)`, `parallel([...])`, `first([...])`, `choice(options)` |
  | Characters | `switchTo(character)` |
  | Ending | `reward()` |

  - Everything spawned is tagged `owner: 'mission'` and released when the mission ends.
- **Hints for the bot:** every objective names an AI hint (`goto`, `enterVehicle`, `kill`, `deliver`, `evade`,
  `follow`, `race`, `photo`, `stealth`). The AutoPlayer can play any mission from its hints. This proves the missions
  can be finished, and gives the attract mode its moves.
- **Runtime:**
  - one main mission at a time, plus activities;
  - **a failure** shows **JOB BLOWN**, then *Retry from checkpoint* (the protagonist's loadout is snapshotted at each
    checkpoint) or *Quit to free roam*;
  - **a pass** shows **JOB DONE!**, the rewards, the bonus objectives and a medal (bronze, silver, gold).
- **Activities:** `defActivity(id, { start, levels, *run(a, level) })`. Repeatable, scaling by level.
- **Accept:**
  - DSL unit tests;
  - **every mission passes headless through the bot with seeds 1-3**;
  - every fail condition fires;
  - retry works;
  - no leftover mission entities once a mission ends (a count check);
  - `#mission/<id>/<checkpoint>` lands at the right moment.

### 8.16 Economy, shops, properties, collectibles and completion

- **Cash:** from missions, jobs, hold-ups, stunts, cash pops and properties. It's spent in shops, on respray, mods,
  outfits, cabs, fees and donations.
- **Shops:**
  - the screens are 10-foot item cards, ≤ 6 per page;
  - buying is fast: ✕, then confirm only above $5,000;
  - the shops: Lead Farm (weapons, ammo, armour), Boom Box Garage (mods), Spray & Pray (respray and paint), Threads
    (outfits), the Greasy Spoke diner (full health), Gas'n'Sip (snacks, a small heal), Kwik-Lux (can be held up).
- **Properties:** the Palm Car Wash and the Pixel Palace Arcade. Each pays income at every in-game midnight, which you
  collect at the property. The arcade adds the cabinet (section 8.22).
- **Completion:** one checklist that sums to 100%: missions, jobs (level 3+), races, MAYHEMs, stunts, tokens,
  properties. The stats screen shows it as cards.
- **Cabs:** phone → Contacts → Lowtown Cabs → choose a destination on the map → a fade, a fee, and you're there.
- **Accept:**
  - purchase, ownership and income tests;
  - completion adds up to exactly 100;
  - collectibles survive a save.

### 8.17 Audio and radio

- **Reuse:**
  - `game.audio.sfx` and its presets, `music(song)`, the step sequencer and its note syntax;
  - `audio.ctx`, which is public (`ENG:6040-6075`).
- **Build:**
  - **`audio/audiox.js` + `voices.js`:** continuous voices on `audio.ctx`:
    - the engine hum: 2 oscillators plus filtered noise, pitch from RPM;
    - tyre squeal, by slip;
    - sirens: two-tone and wail, with Doppler;
    - rain and wind;
    - the crowd murmur and the city hum, by zone;
    - stereo pan and distance falloff;
    - a voice limit.

    They route through the engine's buses, which GTM-PATCH 5 makes public as `audio.bus('sfx' | 'music')`. Volume and
    mute are respected.
  - **Radio:**
    - `def('stations', id, { name, freq, dj, genre, color, songs, ads, jingle })`;
    - **`composer.js`** turns genre templates (tempo, scale, progressions, drum patterns, lead rules) and a seed into
      engine song objects;
    - a station is a timeline that keeps running while you're away: song, then a DJ line, an ad and a jingle. DJ and ad
      lines show as subtitles; there are no voices;
    - six stations (section 9.9), plus Off;
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
  - each station's first 10 s, rendered with `OfflineAudioContext`, is not silent (RMS over a threshold);
  - volume and mute are respected.

### 8.18 UI/UX: the 10-foot kit and the screens

**Rules** (they are tested by `tools/ui-audit.mjs`):
1. **Canvas pixel UI is primary.** The engine's HTML `E.Shell` and HTML standard menus are not TV-scaled: fixed 11-14
   px CSS and no UI scale (`ENG:7412-7444`). Start the game with `menu: false, corner: false` and draw our own, keeping
   `game.settings` and `input.rebind` underneath. Keep the engine's auto-pause (page hidden, controller unplugged), and
   route it to our pause screen. Log this as a decision; it is also engine feedback.
2. **Text size:**
   - body text at font scale 1 or more: 7 buffer px is about 28 device px at 1080p (S = 4);
   - headings × 2; key HUD numbers × 2;
   - never the 3×5 `tiny` font.
3. **Lists:**
   - ≤ 6 focusable items per list, and one decision per screen;
   - a strong focus highlight: a 2-px frame, a pulse, a 1-px lift;
   - every screen has a visible button legend in the player's glyphs.
4. **Navigation:** ✕ confirms, ○ goes back, L1/R1 change tabs, △/□ are secondary actions, Options closes everything.
5. **Layout:**
   - 5% safe-area margins;
   - no tables or grids of numbers: stats are big cards (≤ 6 per page) and the map is a big zoomable map.
6. **Every screen works by pad, by keyboard, and by mouse:** hover focuses, a click confirms, the wheel scrolls.
7. **Sound:** a sound on move, confirm, back and error.
8. **Readability options:**
   - HUD scale 100/125/150%;
   - subtitles on by default, with the speaker's name in colour;
   - gang and marker identities by colour, icon shape *and* pattern.

**Widgets:**
- **Basic controls:** focus list, card grid (≤ 6), tabs, slider, toggle, left-right choice.
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
  - CONTINUE, NEW GAME, LOAD, SETTINGS, EXTRAS. EXTRAS holds the Proving Ground, the arcade, and Credits & About.
- **Pause:** tabs MAP, BRIEF, STATS, SETTINGS, HELP; ○ resumes; QUIT asks first.
- **Map:**
  - pan with the left stick, zoom with L2/R2;
  - △ toggles the legend, ✕ sets a waypoint, L1/R1 filter by category.
- **Settings:**
  - Controls: the layout diagram in glyphs; rebinding per context; sensitivity, invert, vibration, glyph style
    (Auto/PS/Xbox/Keyboard);
  - Display: default view, HUD scale, subtitles, colourblind mode, shake, flashes, reduce motion, pixel scale;
  - Audio: master, music, radio, effects, DJ chatter;
  - Game: difficulty, aim assist, autosave;
  - Accessibility: the hold/toggle options.
- **Load and save:** 3 big slot cards.
- **The phone:** Contacts, Texts, Jobs, Snap, Settings. Big icons, one column.
- **Shops; mission results; NABBED and WRECKED cards.**
- **Help:** a one-page-per-topic field guide.
- **Credits & About:** the Source Information block (section 1), the engine credit and its MIT notice.
- **The kiosk overlay.**

**Onboarding:** a contextual prompt the first time each verb becomes possible ("△ Steal", "R1 Handbrake"). The prologue
mission teaches the core loop. Nothing needs a manual.

**Accept:** `ui-audit.mjs` walks every screen by synthetic pad input and asserts:
- the focus is visible;
- ≤ 6 items;
- the smallest text scale is 1 or more;
- every glyph token resolves;
- nothing falls outside the safe area.

It also captures screenshots at 1920×1080 and 1280×720. Separate passes check keyboard only and mouse only.

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
- it follows mission hints.

**The director** (`ai/director.js`) plays reels from the registry (section 9.11). Each reel scripts:
- its setup: time, weather, spawn, wanted level;
- the AutoPlayer's goals;
- a camera plan: the views and cinematic shots, so **all three views and a side interior are shown**;
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
  - every reel ran at least once; all 3 views and an interior were shown;
  - at least one chase reached 3★, at least one explosion, at least one switch;
- phone emulation (390×844 @3, touch):
  - no touch UI;
  - the attract mode runs;
  - the menu button opens its overlay;
  - taps never leave the demo;
  - a simulated pad connection opens the title.

### 8.21 Side-scroll interiors

- **Data:** `def('interiors', id, { door, rows, legend, types, spawns, lights, music, guards, exits })`.
- **Build:**
  - the `interior` scene builds a `PlatformMap`;
  - the protagonist is a `Platformer` with weapons (side-plane `Bullets`);
  - guards: a Platformer, plus a side-view sight check (x/z rays against solid tiles) feeding `E.Suspicion`;
  - cameras;
  - elevators (moving platforms), doors, the vault door;
  - leaving returns you to the city door with the world state kept (the wanted level and the clock).
- **Content:** the **First Lowtown Bank** (lobby, records office, vault) and **Club Chrome** (dance floor, VIP,
  offices).
- **Accept:**
  - entering and leaving keeps the world hash;
  - both interiors pass `check.mjs`;
  - side-view stealth tests (seen, heard, alarm).

### 8.22 The arcade cabinet: engine kits hidden in plain sight

- **Build:** the Pixel Palace cabinet runs **RAT RACER 1999**, a one-stage vertical shoot-'em-up ported from the
  engine's SHOOTER starter slice (`src/starter/30-shooter.js`), as a scene pushed over a paused city. The high score is
  saved.
- **Accept:** it opens and closes cleanly; scores save; the city's hash is unchanged afterwards.

### 8.23 Photo mode (Snap)

- **Build:**
  - Create (or the Snap phone app) freezes the sim (`timeScale 0`);
  - a free camera: stick pans, L2/R2 zoom, R3 cycles all three views;
  - HUD off;
  - filters: none, neon, noir, sepia (a palette remap);
  - a frame overlay;
  - ✕ saves a PNG (`canvas.toBlob` download).
  - Missions can require a photo (R2 *Below Deck*, H2 *Blueprints*).
- **Accept:** entering and leaving restores the state; the export works in Chromium.

### 8.24 The developer Proving Ground and dev tools

- **Build:** the `proving` district (64×64), with zones:
  - **handling:** skidpad, slalom, ramps of several angles, surface strips (dry, wet, grass, sand, oil, ice), a boat
    basin, a helipad;
  - **traffic lab:** a 3×3 signalized grid with density sliders;
  - **crowd lab;**
  - **combat range;**
  - **wanted sandbox:** set the stars and watch dispatch and search with the overlays;
  - **view lab:** every view at once in split tiles, with the perf HUD;
  - **scale yard:** a ped beside every vehicle;
  - **UI gallery:** every widget and screen in every glyph set;
  - **jukebox:** the stations, songs and effects;
  - **mission bench:** one tiny mission per objective type;
  - **interior test room;**
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
        │ ST.CHRISTOPHER'S CHAPEL ⛪ GREASY SPOKE    │ PIXEL PALACE   BANK OF LAST    CLUB      │
        │ (safehouse · save)         diner           │ arcade         RESORT (tower)  CHROME ◆  │
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

- **The L** runs north-south down the central avenue at z 100. It stops at four stations: Palm, Neon Mile, Brickyard and
  Harbor.
- **The Loop** crosses under it.
- **Three bridges** cross the canal; one of them is the drawbridge, which rises every 3 game hours (a stunt jump).
- **The tallest buildings** stand in the Neon Mile: the Bank of Last Resort is a landmark visible from everywhere in
  M7.
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
| Mr. Pennywhistle | Manager of the Bank of Last Resort | suit | heist inside man (QUIET) |
| Lefty | Boom Box Garage mechanic | overalls | mods tutorial |
| DJs | Captain Static, MC Lugnut, Smooth Sal, Tex Tumbleweed, Nova, Phil Buster | portraits only | radio subtitles |

### 9.3 The gangs

| Gang | Turf | Colour, icon, pattern | Vehicles | Weapons | Rival |
|---|---|---|---|---|---|
| **Chrome Saints** | Neon Mile | silver and cyan, ◆, diagonal stripes | Saint, Zephyr GT | pistol, SMG | Harbor Rats |
| **Harbor Rats** | Harborfront | yellow and black, ▲, dots | Hauler, Bilge Rat | shotgun, Molotov | Lawn Gnomes |
| **Lawn Gnomes** | Palm Terraces | pink and mint, ●, checks | Retiree, Putt-Putt | bat, grenade | Chrome Saints |

### 9.4 The missions (14)

The heist unlocks once the third job of any one gang is done. QUIET's crew options also need +40 respect with the gang
that supplies the hacker or the driver.

| # | Mission | Giver | Plays as | Summary | Systems it proves |
|---|---|---|---|---|---|
| P0 | **Two Wheels, No Brakes** | intro | Dex | Walk, sprint, steal a moped, a timed courier run. You run a red in front of a cop (1★) and lose him, then save at the chapel. | onboarding prompts, getting in and out, bikes, GPS, timer, 1★ search and evade, saving |
| S1 | **Holy Rollers** | Saints ◆ phone | any | Steal 3 named cars around town and deliver them above 60% health. | multi-target GPS, parked cars and carjacks, damage, garage drop-off |
| S2 | **Confession Booth** | Saints | any | Escort Father Fender's limo while the Rats ambush. | follow and protect, drive-bys, gang vehicle AI |
| S3 | **Drag Mass** | Saints | any | A street race on the Loop against 3 Saints racers. | race system, racer AI, decks, ramps |
| R1 | **Rat Run** | Rats ▲ phone | any | Take a contraband van (2★ at once) to the Brickyard without being seen arriving. | wanted, evade, respray |
| R2 | **Below Deck** | Rats | Viv | Sneak into the Saints' chop shop and photograph the ledger. | stealth (`E.sees` + Suspicion + cones), takedowns, Snap photo |
| R3 | **Crane Game** | Rats | any | Hold the container yard against a Saints assault, then chase their leader. | combat waves, cover-lite, Molotovs and barrels, fire, chase |
| G1 | **Lawn Order** | Gnomes ● phone | Gus | Smash 8 Saints cars in Palm Terraces with a bat in 2:00. | melee against vehicles, property-damage heat, timer |
| G2 | **Bingo Night** | Gnomes | any | A police raid at night: pick up Nana in her slow wagon and escape 3★. | 3★ chopper and spotlight, roadblocks, night, a heavy car |
| G3 | **Gutter Ball** | Gnomes | any | Firebomb the Rats' boathouse, survive the counter-attack, escape by speedboat or by road. | fire spread, explosions, boats, gang war |
| H1 | **Setup: Getaway** | Viv (phone) | Dex | Steal a Zephyr GT from the Saints' showroom and stash it; plant a moto by the Loop. | garages and persistent vehicles |
| H2 | **Setup: Blueprints** | Viv | Viv | The bank's records office at night, in side-scroll: stealth past guards and cameras, photograph the plans, or bribe the janitor. | side-scroll interior, side stealth, a choice |
| H3 | **Setup: The Big Drill** | Viv | Gus | Steal the drill rig from the construction site and tow it to the Brickyard at 2★. | towing, a heavy vehicle, wanted |
| H4 | **The Big Withdrawal** | the planning board | all three | Choose **LOUD** (Gus rams the armoured truck; a shootout in the side-scroll lobby; 4★) or **QUIET** (Viv through the sewer, alarms off; Gus drills from below; 2★). Both end in a **Mode 7 getaway on the Loop**: switch between Dex driving, Viv shooting from the window and Gus clearing a roadblock with the tow truck. Then the split of the take, the results, and the credits ("District 2: coming soon"). | everything: choices, mid-mission switching, interiors, M7 set piece, results |

### 9.5 Side content

| Kind | Content |
|---|---|
| Jobs (repeatable, levels 1-5) | **Vigilante** (police cruiser: stop the criminals' cars), **Paramedic** (ambulance: deliver the injured), **Firefighter** (fire truck: put out car fires), **Tow** (Gus or any tow truck: illegal parkers to the impound), **Moto Courier** (any bike: timed deliveries) |
| Street races | Loop Sprint, Harbor Hustle |
| MAYHEM (rampages) | 3: the Zap-O-Matic against Rats, a bat against Saints cars, the Boom Tube against gang vehicles |
| Stunt jumps | 5: the Loop gap, the drawbridge, the container-stack ramp, the parking-garage roof, the canal |
| Collectibles | 25 **Moto Tokens** on roofs and in alleys (the map marks the ones found) |
| Hold-ups | 3 Kwik-Lux stores: aim at the clerk, take the cash, 2★ |
| Random events | a purse snatcher on foot, a stalled car to push or jack, a gang shoot-out in progress, a police chase passing (join it or help) |
| Properties | Palm Car Wash, Pixel Palace Arcade |
| Other | Marching Mimes ENCORE, cab skip, photo mode, the arcade cabinet |

### 9.6 Vehicles (23)

| Class | Models |
|---|---|
| car | Pip (compact), Cortez (sedan), Saint (chrome luxury), Brute (muscle), Zephyr GT (sports), Retiree (boxy wagon), Putt-Putt (golf cart), Fed Sedan, MPD Cruiser, Medic (ambulance), Strongbox (armoured truck) |
| truck/bus | Hauler (van), Lowtown Transit bus, MPD Rhino (SWAT van), Pumper (fire truck, water cannon), Drill Rig |
| tow | Hookline |
| bike | Sparrow (moped), Vandal 600 (sport bike), Hog (cruiser) |
| boat | Bilge Rat (speedboat) |
| heli | MPD Eye (AI police; playable in the Proving Ground) |
| rail | The L (2 trains) |

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

### 9.9 Radio stations (6)

| Station | Freq | DJ | Genre template | Content |
|---|---|---|---|---|
| CRASH FM | 101.1 | Captain Static | synth-punk (fast square leads, noise snare) | 3 songs, 2 ads, jingle |
| WHEELZ | 88.8 | MC Lugnut | boom-bap chip beats (swing, sub-bass triangle) | 3 songs, 2 ads, jingle |
| LOUNGE LIZARD | 99.9 | Smooth Sal | bossa and lounge (7th chords, soft pulse) | 3 songs, 2 ads, jingle |
| KOWBOY | 104.4 | Tex Tumbleweed | chip country (twangy pulse12, shuffle) | 3 songs, 2 ads, jingle |
| NEON DRIVE | 85.0 | Nova | synthwave (arpeggios, gated drums) | 3 songs, 2 ads, jingle |
| LOWDOWN TALK | 1210 AM | Phil Buster | talk radio (call-ins as subtitles over a jingle bed) | 6 segments, 3 ads |

**Satirical ads (originals):** Kwik-Lux ("open 25 hours"), Boom Box Garage, Saint Moto's Chapel ("we save, you
donate"), Gutterball Lanes, Lowtown General ("now with fewer waits"), Lead Farm.

### 9.10 Shops and properties

See section 8.16. All are reached through big 10-foot cards, and every price is a TUNE knob.

### 9.11 Attract reels (8)

| Reel | Shows | Views |
|---|---|---|
| **Joyride** | a carjack, then traffic weaving, a drift, a stunt jump in Mode 7 slow motion | TOP → M7 |
| **Hot Pursuit** | a 3★ night chase in the rain, the chopper's spotlight, a respray escape | M7 → TOP |
| **Turf War** | an iso gang shoot-out, Molotov fire, an explosion chain | ISO |
| **Switch!** | the switch camera across all three protagonists' vignettes | TOP switch-cam → ISO |
| **Night Moves** | a moto through the neon at dusk, a time-lapse into night | ISO → M7 |
| **Heist Tease** | a side-scroll vault takedown, then the Mode 7 getaway | SIDE → M7 |
| **Emergency!** | a fire truck putting out a car fire, ambulance paramedics | ISO |
| **Mime Time** | the ENCORE gag | TOP |

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
  3. A backdrop behind every outdoor view (sky blend by time).
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
  - **peds:** idle variety from mocap clips (phone, chat, bench, dance);
  - **reactions:** flinch, knockdown and get-up, cower, flee;
  - **getting in and out:** reaching, sitting, a pulled driver who tumbles;
  - **specials:** the switch-camera swoop, and the stunt-jump slow-motion orbit;
  - **every attack** has a visible wind-up (check it in a filmstrip, per API.md).
- **Evidence:** `tools/shots.mjs` builds the matrix: neighbourhood (4) × time (day, dusk, night) × view (3), plus each
  interior and each UI screen, into `docs/media/shots/`. Review it against this section and fix whatever falls short.

---

## 11. Controls

PS5 DualSense is primary; keyboard and mouse map onto the same model. Everything can be rebound. `docs/CONTROLS.md`
holds the diagram.

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
| Change view (hold + R-stick turns ISO) | R3 | R3 | V (`[` `]` turn) |
| Map | touchpad | touchpad | M / Tab |
| Pause | Options | Options | Esc |
| Photo mode | Create | Create | B |

**In menus:**
- D-pad or left stick navigates;
- ✕ confirms, ○ goes back;
- L1/R1 change tabs;
- △ and □ are secondary actions;
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
| 1 | `TileMap.queueWalls`: loop over the **visible cell window** (the screen corners through `view.toGround`, plus a margin for wall height), not all w×h cells (`ENG:4437-4445`). | 37k cells scanned every frame; tall walls pop in at the bottom edge. |
| 2 | TileMap wall-block cache: a **memory-bounded LRU** across blocks and views (`ENG:4447-4468`). | A long drive caches thousands of blocks. |
| 3 | `map.solid`: **spatial bucketing** for body-against-solid checks, plus `map.solids(list)` to add many solids with one `version` bump (`ENG:7049-7090`). | Deck pillars and street furniture are hundreds of solids, each checked against every body; each add re-bakes the caches. |
| 4 | Input: `padValue(code)` (analog `button.value`), polling **every** pad with the active pad chosen by last use, and raw activity hooks (any `keydown`, mouse move and wheel, any pad change) (`ENG:669`, `851-960`). | Analog triggers for driving; the attract idle timer; a DualSense that isn't pad 0. |
| 5 | Audio: `audio.bus(name)`, a public getter for the gain node of `'sfx'` or `'music'` (`ENG:6058-6064`). | Continuous voices (engine hum, sirens, rain) must follow the volume settings without reaching for `_sfxBus`. |
| 6 | Only if needed: a `TileMap({ floor: false })` flag that guarantees the whole-map floor is never baked (by the minimap, GPU lighting or `drawFloor`). | Memory: about 90 MB per view canvas at 192². |

**MOTOR extensions (no patch):** everything else in sections 7-8.
- Rendering: the chunked floor, decks, the PerspRenderer, the Projector, vehicle models.
- Simulation: vehicle physics; traffic, peds, police and gangs; the wanted system.
- Content runtime: the mission DSL, economy, stats, abilities and switching.
- Interface: the 10-foot UI kit, glyphs, the ActivityMonitor wrapper.
- Audio: AudioX and the radio.
- Modes and tooling: the AutoPlayer and director, saves, the debug tools.

---

## 13. Milestones

Every milestone ends green, playable, committed, pushed, and recorded in `PROGRESS.md`. **FAN-OUT** marks where
`ultracode` workflows pay off (section 16).

### M0: Bootstrap and infrastructure

- **Vendor the engine:**
  - clone <https://github.com/michaelcrosato/my-3d2dge> at `cfa866a` if `/home/user/michaelcrosato/my-3d2dge` isn't
    there (`GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1`), and check the commit;
  - copy the files listed in section 6.2, write `VERSION.json` (sha256s) and keep the `LICENSE`.
- **Tooling:** `package.json` (exact pins), `build.mjs`, `serve.mjs`, `test-run.mjs`, ESLint, `boundary-check`,
  `vendor-check`, CI, and the `.claude` SessionStart hook.
- **Docs:** `README.md` (pitch, Source Information, how to run), `PROGRESS.md`, and skeletons for
  `docs/ARCHITECTURE.md`, `DECISIONS.md` and `CONTENT-GUIDE.md`.
- **Hello city:** boot, title, then play on a 32×32 test TileMap with a walking protagonist. Deep links, `window.__gtm`,
  `game.debug.snapshot`.
- Make sure a **draft PR** exists for the branch (the planning session opened one), and subscribe to it.
- **Accept:**
  - `npm ci && npm test` green locally and in CI;
  - `dist/index.html` plays from `file://`;
  - `npm run check` is clean;
  - `vendor-check` passes.

### M1: Core architecture, plus three timeboxed spikes

- **Core:** `core/*` (registries with schemas, BUS, TUNE with dev pages, RNG streams), the Actor/Intent/controllers,
  and the ActionMap.
- **Input:** GTM-PATCH 4 with the ActivityMonitor and glyphs plus tokens.
- **Scenes:** boot, title, an attract stub, play.
- **Proofs:** the headless sim harness (`node:vm`), `stateHash`, a replay round-trip.
- **Spikes** (keep what they produce):
  - **S1 PerspRenderer:** an M7 floor, boxes, a rig and a box car at 60 fps; the TOP lean;
  - **S2 Floor and scale:** `floor-chunks` on a dummy 192² map, with GTM-PATCHes 1-3, inside the budget;
  - **S3 Vehicle physics:** the bicycle model on a test pad, with drift and collisions.
- **Write `docs/ARCHITECTURE.md`** and **freeze the contracts**: Intent, Projector, the registry schemas, the BUS
  catalogue, the mission `m` API surface.
- **Accept:**
  - unit tests for every core module;
  - the spikes' screenshots and perf numbers in PROGRESS;
  - a DECISIONS entry for any fallback taken.

### M2: The Lowtown world and ISO rendering

- **Build:** the district DSL, the builder, the validator and `map-sheet`.
- **Lowtown v1:** every neighbourhood, the Loop decks with ramps, the canal and bridges (the drawbridge mechanism),
  water, every landmark, POIs, zones, the prop rules.
- **ISO:** finished, with cut-away, x-ray, 4-yaw rotation, quantized speed zoom and baseline lighting.
- **Accept:** section 8.3 and 8.4 checks; the neighbourhood screenshots.

### M3: Protagonists, moving on foot, combat

- **Characters:** the three protagonists (PedRig with weapon layer and outfits).
- **Movement:** Mover verbs (sprint, jump, climb, vault, roll, crouch).
- **Combat:** melee and firearms (lock-on, twin-stick, mouse), z-aware bullets, health and armour, pickups,
  knockdown and get-up.
- **Explosives and fire:** grenades, Molotovs, rockets, the fire system.
- **UI first pass:** the weapon wheel.
- **Switching:** the switch wheel and switch camera; abilities; stats.
- **Proving Ground (first zones):** the combat range and the scale yard.
- **Accept:** sections 8.11 and 8.12.

### M4: Vehicles

- **Physics and classes:** all 7 classes; the models and handling of all 23 vehicles.
- **Entering:** getting in, getting out, carjacking, towing.
- **Damage:** damage, fire, chained explosions.
- **Lights and sirens.**
- **Feel:** skid marks, tyre smoke and sparks; drift; speed zoom; the radio stub; mods.
- **FAN-OUT A1:** vehicle models and handling specs, one agent per class group, against the frozen model and handling
  schema. Each agent's output must pass its class's handling test.
- **Accept:** section 8.8.

### M5: Roads, traffic, pedestrians, emergency services

- **Roads:** the lane graph, signals and GPS.
- **Traffic:** DriverBrain, the spawner, parked cars.
- **Peds:** PedBrain, the sidewalks, reactions, witnesses.
- **Services:** the ambulance and the fire truck.
- **The Marching Mimes.**
- **Performance:** LOD and time-slicing.
- **AutoPlayer core:** driving and walking to goals; later milestones extend it.
- **Accept:** sections 8.7, 8.9 and 8.10, inside the perf budget at target densities.

### M6: Wanted level, police and gangs

- **Crimes and police:** crimes, detection, stars, every dispatch tier, cop AI on foot and in cars, roadblocks, spike
  strips, the chopper and spotlight, SWAT, Feds.
- **Search and evade:** with cones on the radar.
- **Clearing the stars:** respray and bribes.
- **NABBED and WRECKED:** the flows and respawns.
- **Gangs:** respect, turf, hostility, patrols and turf wars.
- **Accept:** sections 8.13 and 8.14.

### M7: TOP and MODE 7 for real, plus side-scroll interiors

- **The PerspRenderer**, finished:
  - both presets, with lights, fog, sky and decks;
  - perspective vehicles, scaled rigs, particles, depth clipping.
- **View manager:** transitions and per-context memory.
- **Cameras:** the speed climb; the M7 chase on foot and in vehicles; the camera rig for photo mode.
- **Interiors:** the side-scroll kit and the shells of the Bank and Club Chrome.
- **Accept:**
  - sections 8.2, 8.5 and 8.21;
  - the view-independence hash test;
  - the perf budget in all views.

### M8: Missions, activities and economy (content)

- **Runtime first:** the mission DSL and runtime with checkpoints, retry and grading. Then **freeze the `m` API**.
- **Systems:**
  - economy, shops, properties, completion, the cab skip;
  - the collectibles, stunts, MAYHEM and races frameworks;
  - jobs, hold-ups and random events.
- **FAN-OUT A2:** the content runs in parallel, each agent owning its own files and passing the bot test with seeds 1-3:
  - one agent per gang chain (S, R, G);
  - one for P0;
  - one for the heist (H1-H4);
  - one for jobs and activities.
- **Accept:** sections 8.15 and 8.16; every mission passes through the bot and by a scripted human-style pass.

### M9: The 10-foot UI and UX

- **The widget kit, then every widget and screen in section 8.18:**
  - in play: the HUD, the radar with GPS, the map screen, the phone;
  - menus: pause tabs, settings (all of them), controls and rebinding, load and save;
  - cards and results: shops, results, the NABBED and WRECKED cards;
  - pages: the title, help, Credits & About with the Source Information;
  - text: subtitles; accessibility; HUD scale.
- **Onboarding prompts.**
- **The UI audit tool.**
- **FAN-OUT C** (optional): screens in parallel once the widget kit is frozen.
- **Accept:** section 8.18; the audit clean at 1080p and 720p; pad, keyboard-only and mouse-only passes.

### M10: Audio and radio

- **Engine and voices:** GTM-PATCH 5, AudioX and its continuous voices.
- **Sound:** the SFX map, ambience, mission music cues.
- **Radio:** the composer and the 6 stations, with their DJ and ad text.
- **FAN-OUT A3** (optional): the stations' genre templates and copy.
- **Accept:** section 8.17.

### M11: Attract mode, kiosk and mobile

- **Players:** the full AutoPlayer behaviours.
- **The show:** the director, the 8 reels, the interstitials, the watchdog.
- **Ins and outs:** the title idle timer; leaving on any input.
- **Kiosk and mobile:** the kiosk/mobile mode.
- **Tooling:** the soak tool, and an attract capture to MP4/GIF (`tools/record-attract.mjs` + ffmpeg) for the README.
- **Accept:** section 8.20, every item.

### M12: The Proving Ground, arcade, photo mode, dev tools, handoff docs

- **Proving Ground:** every zone, each with its self-test.
- **The arcade cabinet; photo mode.**
- **Dev tools:** the dev menu, the overlays, the tuning pages.
- **Handoff docs:**
  - `docs/CONTENT-GUIDE.md`, a recipe per content type (vehicle, weapon, ped, outfit, gang, mission, activity,
    station, song, shop, property, interior, reel, district), each naming the test to run;
  - `tests/recipes/*.test.js`: each recipe followed to the letter, adding a new instance through the public API and
    proving it works end to end;
  - **District 2 stub:** one block behind the closed bridge, loaded only with `?dev=1`. It proves a new district is
    content.
- **Accept:** section 8.24; every recipe test is green.

### M13: Polish, performance, verification, release

- **Polish:** a visual pass on the look checklist for every screen in the shots matrix, and a performance pass.
- **FAN-OUT B:** parallel adversarial reviewers, one per area:
  - vehicles and physics;
  - traffic and peds;
  - wanted and gangs;
  - missions;
  - the 10-foot UI;
  - the attract mode;
  - perf and memory;
  - determinism and saves.

  Each one reproduces its findings as failing tests. The main agent fixes them and re-runs `test:full`.
- **Writing:**
  - finish `README.md` (media, controls, Source Information, then the engine analysis summary in its own section);
  - write `docs/ENGINE-ANALYSIS.md` in its final form, and `docs/FEEDBACK-FOR-ENGINE.md` (in the engine's
    FEEDBACK-LOG format);
  - finish `PATCHES.md`.
- **Release:** CI green; the PR description complete; mark the PR ready only when the owner asks.
- **Accept:** section 15, all of it.

---

## 14. Verification strategy

| Layer | Tooling | What it proves |
|---|---|---|
| Unit | `node:test` | core, input, vehicle maths, graphs, DSL, economy, saves, patches |
| Sim (headless game) | `node:test` with the engine and bundle in `node:vm` | 10-minute traffic and crowd runs, wanted scenarios, gang sims, the mission bot (3 seeds), the bot campaign to 100% |
| E2E browser | Playwright 1.56.1 with `CHROMIUM_PATH` | boot, every scene, every view, the pad shim, the UI audit, the attract enter/exit matrix, phone emulation |
| Visual | vendored `check.mjs` (look lint) + `filmstrip.mjs` (`--seed`, `--compare`) + `shots.mjs` | the look checklist; animations (getting in and out, carjacks, drifts, crashes, explosions, the switch camera, the wheel, the M7 chase) |
| Perf | `perf.mjs` | the budgets in section 7.11, per view and per scenario |
| Determinism | same-seed hash, view-independence hash, `filmstrip --expect-same`, vendored `replay.mjs` | section 7.3 |
| Soak | `soak-attract.mjs` | section 8.20 |
| Content | the district validator, registry schemas, a mission lint (every objective has a hint, every fail has a reason) | the content contracts |
| Extensibility | `tests/recipes/*` | **content is added, not architecture** |
| Boundary | `boundary-check`, `vendor-check` | the layers and patches stay honest |

- **Gate:** `npm test` (about 6 min) on every push. `npm run test:full` before every milestone closes, and in CI
  nightly if the owner wants it.
- **Manual QA hand-off:** `docs/QA-DUALSENSE.md` is a 15-minute checklist for a human with a real DualSense on a TV:
  glyphs, rumble, triggers, legibility at 10 ft.

---

## 15. Definition of Done

1. **Milestones:** every milestone's acceptance checks are met, and `PROGRESS.md` shows the evidence for each.
2. **Tests:** `npm test` and `npm run test:full` pass, and CI is green on the PR's head.
3. **The file:** `dist/index.html` is one self-contained file:
   - `check.mjs` reports `external: []`;
   - it plays from `file://` and from a static server;
   - a rebuild is byte-identical.
4. **The slice is all there** (section 9) and can be finished:
   - 14 missions, all side content, shops and properties;
   - **a headless bot campaign reaches 100% completion.**
5. **Views:** ISO, TOP and M7 work everywhere outdoors, and SIDE in the interiors. Switching is instant and leaves the
   simulation unchanged (hash test).
6. **Attract:** the attract mode meets every item in section 8.20, including the 30-minute × 3-seed soak and the
   leave-on-any-input matrix. The kiosk/mobile behaviour is verified on phone emulation.
7. **The 10-foot UI:** the audit passes; controller-only, keyboard-only and mouse-only passes succeed on every screen.
8. **Determinism and replay:** both pass. **Performance:** the budgets are met.
9. **Extensibility:** the Proving Ground self-tests and every content recipe test pass, and the District 2 stub loads.
10. **Docs:** complete:
    - `README.md`: Source Information, then the engine analysis in a separate section, how to play, the controls,
      media;
    - `docs/ARCHITECTURE.md`, `CONTENT-GUIDE.md`, `CONTROLS.md`, `TUNING.md`, `DECISIONS.md`;
    - `docs/ENGINE-ANALYSIS.md` (final), `FEEDBACK-FOR-ENGINE.md`, `QA-DUALSENSE.md`;
    - `vendor/my-3d2dge/PATCHES.md`.
11. **Source Information** also appears in the built HTML (a comment header) and on Credits & About. In files, "Model
    and Effort Level" follows section 1's wording: the AI lab and the effort, with the exact model left to the chat
    report.
12. **The final chat report:**
    1. the Source Information, on its own;
    2. the Game Engine Analysis, separately: what was used, what wasn't, and the one thing to change;
    3. how to play;
    4. the PR link.

---

## 16. Execution recommendation

**Recommended:** the model the owner proposed, at effort **xhigh**, with **`ultracode`** in the `/goal` prompt. `ultracode`
authorizes bounded workflows: at most 10 agents each, and never two agents on one file.

**Why xhigh and not max:**
- This plan front-loads the hard thinking. The architecture, the rendering approach for every view, the data contracts
  and the tests are decided here, and the risky parts are spiked in M1.
- What remains is long, mostly well-specified building and checking, spread over hundreds of turns. There, max's extra
  thinking on *every* turn adds a lot of tokens and little quality.
- The hard problems that remain (the perspective renderer, vehicle physics, robust AI) are within xhigh.
- Where extra rigour does pay, in independent verification, parallel reviewers buy more than deeper single-thread
  thought.

**Why ultracode is worth it here:**
- The slice has about 20 subsystems and about 60 content items with clean seams: registries, the DSL and frozen
  contracts.
- Parallel authoring at **A1** (vehicles), **A2** (missions and activities) and **A3/C** (radio, UI screens) cuts wall
  time a lot.
- Parallel **adversarial verification at B** (M13) catches what one pass misses.
- Keep it bounded. Use workflows only at those points. The main agent integrates, and owns `src/motor/core`, the
  contracts and `test:full`.

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
| The perspective renderer is too slow or too complex | medium | high | Spike S1 in M1, a perf budget, and the fallback in section 8.5 (logged). |
| The city's scale breaks the TileMap (memory, stalls) | high without the patches | high | GTM-PATCHes 1-3 and `floor-chunks` (spike S2); fallback, a 160² district. |
| AI gridlock, stuck peds, a stuck attract AI | medium | medium | 10-minute sims in `test:full`, watchdogs, the director's cuts, time-sliced brains. |
| Determinism drifts | medium | high | the lint rule on `Date`/`performance`/`setTimeout`, hash tests in CI, named RNG streams. |
| Scope: 14 missions + 20 systems | high | high | milestone gates, the DSL first, fan-out A2, bot tests, scope changes only through DECISIONS. |
| UI too small or too dense on a TV | medium | medium | the UI audit with measured text sizes, 1080p screenshots, the ≤ 6-item rule. |
| No real gamepad in CI | certain | medium | the pad shim; the owner's DualSense checklist (`docs/QA-DUALSENSE.md`). |
| Browser audio autoplay blocking | certain | low | audio only after a gesture; a silent attract mode until then; tests run with the autoplay flag. |
| Session or context limits on a very long run | high | medium | PROGRESS.md, frequent commits and pushes, compaction-friendly notes. |
| Upstream engine changes | low | medium | pinned vendor, documented patches, `vendor-check`. |
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
- **Characters and AI:**
  - `E.Humanoid` (subclassed), with `drawPortrait`;
  - mocap clips (Driving, Sitting, Phone, Pistol, getting up);
  - `E.Mover`, `E.ACTIONS` (getting in and out, carjacks);
  - `E.sees` / `E.hears` / `E.Suspicion`;
  - `FlowField` (foot chases).
- **Combat:** `E.Bullets`, `E.Attack` / `E.Combo` / `E.MOVES`.
- **Interiors:** `PlatformMap` + `Platformer`.
- **Input, sound and saving:**
  - `Input`: rebinding, DualSense detection, rumble;
  - the chip synth and sequencer;
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
| `TileMap.drawFloor` on the city | It bakes the whole map per view: about 20 M px at 192². |
| `E.Shell` and the HTML standard menus for player-facing UI | Fixed small CSS, no UI scale, no pixel font: not 10-foot. |
| The `topdown` view as the TOP-DOWN perspective | It is orthographic, with no GTA2 lean. |
| `E.Body`, `r.shape` and `r.sprite` for vehicles | No heading; 32 facing steps and cache churn; no rotation. |
| `FlowField` for vehicles | One target, no cell costs. |
| GPU lighting | Optional, and needs WebGPU; Canvas lighting does the job. |
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

---

## 19. The expansion path after the slice

- **Districts:** each new district is a district definition, its interiors, its gangs and its missions. The bridges
  open with the story. MOTOR loads one district at a time across a bridge fade; multi-district streaming comes later.
- **Content packs:**
  - more classes: planes; more boats and helicopters for the player;
  - weapons, gangs, stations, jobs, heists.
- **The story:** 3 districts × 3 gangs (GTA2's shape), plus 3 heists.
- **Platforms:**
  - an Electron or Tauri wrapper for desktop and Steam Deck;
  - real DualSense haptics and adaptive triggers through WebHID on desktop Chrome.

---

## 20. The /goal prompt

The prompt is in `GOAL.md`, ready to paste, and under the 4,000-character limit. Run `/clear`, then paste it.

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
| Views (orthographic `E.View`, presets) | `engine/my-3d2dge.js:428-512` |
| TileMap floor bake / walls / facades | `4375-4412` / `4437-4483` / `4047-4103` |
| `map.solid` | `7049-7090` |
| Input: bindings, rebind, glyphs, rumble, pad polling | `737-782`, `851-960`, `1041-1089` |
| Actions (`E.ACTIONS`, `getUp`, `takedown`) | `5496-5609` |
| Mover / perception / Bullets | `5689-5805` / `5821-5877` / `5879-5935` |
| Audio (`ChipAudio`, `audio.ctx`) | `6040-6208` |
| Shell (HTML UI) | `7387-7856` |
| Sessions | `8198-8616` |
| Mode 7 rail (stress test) | `src/stress.game.js:615-844` |
| One-point perspective buildings | `src/starter/30-shooter.js:138-141` |
| Street floor, neon, clutter, knockdown, `Fighter extends Humanoid` | `src/starter/50-brawler.js:38-62, 165-176, 243-300, 358-403` |
| Stealth guards (Mover + Suspicion + FlowField) | `src/starter/70-stealth.js:56-101` |
| Attract demo + autopilot (Emberdeep) | `src/emberdeep/90-scenes.js:156-213, 358`; `93-autopilot.js` |
| Registries / BUS / TUNE | `src/emberdeep/00-core.js:78-102`; `01-tune.js` |
| Handoff template and headless test | `src/handoff/game/{game.js,test.mjs}` |
