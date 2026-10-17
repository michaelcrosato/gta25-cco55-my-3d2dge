# Handoff: GRAND THEFT MOTO after M4

This is where a fresh session picks up the run. `PLAN.md` is still the contract and `GOAL.md` is the prompt that
started the run; this page says where the run stands, how the repository is worked, and what to watch for. The
`/goal` prompt that continues the run is at the end.

## Where it stands

- **Done: M0-M4** (`PROGRESS.md` has each milestone's evidence: commits, tests, shots and verdicts, perf):
  - the core, input and attract loop;
  - the three views' renderers (ISO, TOP-DOWN, SIDE-SCROLL MODE 7) and the Stage;
  - Lowtown with its clock, weather and drawbridge;
  - the crew on foot, combat and the weapon and character wheels;
  - the vehicles: 7 classes, 13 models, 19 definitions; boarding, carjacking, towing, damage, chained explosions,
    lights and sirens, the radio stub and the mods.
- **The pull request:** michaelcrosato/gta25-cco55-my-3d2dge#1 carried M0-M4 and was merged into `main` when M4 closed
  ({{MERGE}}). Later work goes on the new session's own branch, started from `main`, in a new draft pull request.
- **Next: M5** (roads, traffic, pedestrians, emergency services; it is accepted by PLAN.md 8.7, 8.9 and 8.10). A
  parked start on it is in `docs/handoff/m5-draft/`: the lane graph, the GPS and the signals work and are tested; the
  DriverBrain is a draft that still stalls. Its README says how to restore it and lists the known stalls.
- **Remaining fan-out points** (PLAN.md 16): **A2** at M8 (missions and activities), **C** at M9 (the UI screens,
  optional) and **B** at M13 (the adversarial verification).
- **Carried to later milestones**, also logged in `docs/DECISIONS.md` D16:
  - the jacked driver's flee-or-fight reaction comes with PedBrain (M5);
  - the heat from a break-in or a carjack comes with the wanted system (M6);
  - the Boom Box Garage's shop screen comes with M8.

  The mods themselves work and are tested.

## Read first

1. `PLAN.md`, in full. It is the contract; scope changes go only through `docs/DECISIONS.md`.
2. `PROGRESS.md`: the milestones' status and evidence.
3. `docs/ARCHITECTURE.md`: the module map and the frozen contracts (the Stage and projectors, the registries, the
   Intent, the BUS).
4. `docs/DECISIONS.md`: D1-D16, every call made without an answer.
5. `docs/CONTENT-GUIDE.md`: how each kind of content is added (districts, weapons, vehicles...).
6. `vendor/my-3d2dge/PATCHES.md`: the engine patches (GTM-PATCH markers). Never read the 727 KB engine whole: search
   its `API-INDEX.md` first.

## Working the repository

- **Setup:** `npm ci` (Node 22). In a Claude Code cloud session the SessionStart hook installs everything.
- **The gate: `npm test`** runs lint, the boundary, vendor and goal-sync checks, "dist current", the unit and sim
  tests ({{TESTS}}), the e2e smoke, replay and self-tests, and the engine's checker. It takes under a minute.
  `npm run test:full` adds the heavy suites as they land.
- **Commit only when `npm test` exits 0.** Check the exit code itself: a grep over its output once hid a lint failure.
- **`dist/index.html` is committed.** Rebuild it with `npm run build` before committing; the gate fails on a stale
  one. Build elsewhere with `node tools/build.mjs --out <file>`, which is what workers do.
- **The layers:** MOTOR in `src/motor`, content in `src/game`. Content imports only `src/motor/index.js` (the boundary
  check enforces it), and content files are found at build time, so adding content never edits an index.
- **Determinism:** in the simulation and the content, there is no `Date`, `performance` or `Math.random` (lint
  enforces this). Time comes from `dt`, and randomness from named `RNG` streams. A view never changes the
  simulation's hash.
- **Model identifiers stay out of repository files** (D3). They go only in the chat report.
- **Headless:** `tests/harness.mjs` runs the game in Node: `engineGlobal()`, `loadGame({ hash, query })`, `holdCode`
  and `snap`. In a page, `window.__gtm` exposes the test hooks (`ready`, `snapshot`, `city`, `clock`, `weather`,
  `combat`, `fleet`, `crew`, `teleport`, `bridges`, `yard`, `vehicles`, `zones`, `selftest`, `perf`).
- **The tools:**
  - `tools/model-sheet.mjs` (the vehicle sheet);
  - `tools/vehicle-bench.mjs` (the handling numbers per definition);
  - `tools/map-sheet.mjs` (the district's map sheet);
  - `tools/shot-matrix.mjs` and `tools/shots.mjs` (views by time and weather);
  - `tools/perf.mjs` (frame times from `?perf=1`);
  - `tools/cpu-profile.mjs` and `tools/profile-frame.mjs` (where a frame goes);
  - `tools/patch-record.mjs` (records an engine patch);
  - `tools/serve.mjs --watch` (`npm run dev`).

  Local probes go in `tools/_*.mjs`, which git ignores.

## Fan-outs: what A1 taught

- **Check each worktree's base.** A worktree may be created at the repository's first commit instead of the branch
  head, so each worker must first run `git checkout --detach <head>` in its worktree and confirm `git log` shows the
  branch's history.
- **Workers own disjoint new files**, run their own tests against a build in a temporary directory, and return
  `{ files: [{ path, content }], notes }` in a structured result. The main loop writes the files, runs that group's
  tests, then the gate, and commits.
- **Workers never write** `dist/index.html`, `PROGRESS.md` or `DECISIONS.md`, and never commit or push.
- **Parallelism:** with 4 CPUs a workflow runs 2 agents at once, so 7 groups took about {{A1TIME}} hours.
- **The session's scratchpad is shared** by every worker. Give each worker its own subfolder, or their probes
  overwrite each other.
- **Worktrees live in `.claude/worktrees/`**, which `.gitignore` and `eslint.config.js` both ignore. Never
  `git add -A` while they exist: a worktree once went in as a gitlink.

## Known limits (renderer)

- **Night glows** (the head, tail and siren lights' halos) ignore occlusion: from some angles a far tail lamp's glow
  shows over the roof at night.

## Continuing the run: the /goal prompt

Start a new session with effort **xhigh** (PLAN.md 16 recommends it; M0-M4 ran at max), then paste this block. It is
{{GOALLEN}} characters of plain ASCII, under the 4,000-character limit for `/goal`.

```
{{GOAL}}
```
