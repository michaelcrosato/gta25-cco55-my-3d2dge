# Handoff: GRAND THEFT MOTO in the middle of M8

This is where a fresh session picks up the run. `PLAN.md` is still the contract and `GOAL.md` is the prompt that
started the run. This page says where the run stands, how the repository is worked, and what to watch for. The
`/goal` prompt that continues the run is at the end. The run paused here at the weekly usage limit (DECISIONS D21,
its last bullet), with every task it had started either finished or saved.

## Where it stands

- **Done: M0-M7** (`PROGRESS.md` has each milestone's evidence: commits, tests, shots and verdicts, perf):
  - the core, input and attract loop; the three views (ISO, TOP-DOWN, SIDE-SCROLL MODE 7) and the Stage; Lowtown with
    its clock, weather and drawbridge;
  - the crew on foot, combat and the wheels; the vehicles (7 classes, 13 models, 19 definitions);
  - the roads and traffic, the crowd on the sidewalks, the emergency services, the AutoPlayer (M5);
  - crimes and the wanted level, the police by tier, NABBED and WRECKED, the respray and bribes, the gangs with
    respect and turf (M6);
  - the view manager, MODE 7's lenses and Auto-rail, the bank with its guards, CCTV and takedowns (M7).
- **The pull requests:** michaelcrosato/gta25-cco55-my-3d2dge#1 carried M0-M4 and was merged into `main`. M5 onward is
  on `claude/compassionate-shannon-h7k7zk`, in the draft michaelcrosato/gta25-cco55-my-3d2dge#2. Keep working there
  and keep its CI green.
- **M8, in progress** (missions and the economy; PLAN.md M8, accepted by 8.15 and 8.16):
  - **part 1:** the staged mission runtime and its ops; the mission bot and the pad pass; the economy (shops,
    properties, completion); the activity frameworks (jobs, races, MAYHEM, tokens, stunt jumps, hold-ups, random
    events); the career's interim cards; saves; S1 (Holy Rollers), the reference mission;
  - **part 1b:** the career's screens read at 10 feet (`docs/media/m8/`);
  - **part 1c:** the bot campaign (`tools/bot-campaign.mjs`), and `tools/bot.mjs --par`;
  - **part 2a:** the Harbor Rats chain (R1-R3) from FAN-OUT A2, and the 14 MOTOR bugs that it and its re-runs found;
  - **part 2b:** the heist finale (H4) and the Lawn Gnomes chain (G1-G3), merged as written; the handoff.

  **8 of the 14 missions are in:** S1, R1-R3, H4 and G1-G3. Each passes through the bot on seeds 1-3 and through
  the pad.
- **Next: finish M8.** `docs/handoff/m8-a2/README.md` is the plan, in five steps:
  1. the MOTOR backlog from the H4 and Gnomes workers: `docs/handoff/m8-a2/motor-requests.md`, and the prepared
     patch `motor-patch.py`, which still has to be validated;
  2. the groups still to do: `heist-setups` (H1-H3) and `jobs` (3 jobs, 2 races, the MAYHEMs) from their saved
     work in progress, then `saints` (S2, S3), `prologue` (P0) and `extras` (tokens, stunts, 4 random events, their
     test), none of them started;
  3. every merged mission re-run after each MOTOR change;
  4. the bot campaign brought to 100%;
  5. M8's acceptance and evidence.
- **Remaining fan-out points** (PLAN.md 16): the rest of **A2** at M8, **C** at M9 (the UI screens, optional) and
  **B** at M13 (the adversarial verification).
- **Carried to M13** (D20): ISO's and MODE 7's frame-time medians (about 11.4 against 10.4 ms, and about 18 against
  12.7). D20 lists the levers to pull. D16's three carried reactions all landed (M5, M6, M8).

## Read first

1. This page, then `docs/handoff/m8-a2/README.md` (the state of FAN-OUT A2 and how to finish it).
2. `PLAN.md`, in full. It is the contract, and scope changes go only through `docs/DECISIONS.md`.
3. `PROGRESS.md`: each milestone's status and evidence (the acceptance log has M8's runs).
4. `docs/ARCHITECTURE.md`: the module map and the frozen contracts (the Stage and projectors, the registries, the
   Intent, the BUS).
5. `docs/DECISIONS.md`: D1-D21, every call made without an answer. D21 is M8's, including what the bot does and why.
6. `docs/CONTENT-GUIDE.md`: how each kind of content is added, the mission DSL and its `m` API included.
7. `vendor/my-3d2dge/PATCHES.md`: the engine patches (GTM-PATCH markers). Never read the 727 KB engine whole. Search
   its `API-INDEX.md` first.

## Working the repository

- **Setup:** `npm ci` (Node 22). In a Claude Code cloud session the SessionStart hook installs everything.
- **The gate: `npm test`** runs lint, the boundary, vendor and goal-sync checks, "dist current", then the unit and sim
  tests (243, 1 skipped until every completion category has content), then the e2e smoke, replay and self-tests,
  then the engine's checker on the city and the bank. It takes about four minutes.
- **`npm run test:full`** adds the heavy suites: the city soaks, the gang sim, every mission through the bot on seeds
  1-3 and through a pad, and the bot campaign to 100%. The campaign cannot pass until all 14 missions and the side
  content are in, so until then run it for information (below).
- **Commit only when `npm test` exits 0.** Check the exit code itself, because a grep over its output once hid a lint
  failure.
- **`dist/index.html` is committed.** Rebuild it with `node tools/build.mjs` before committing, because the gate
  fails on a stale one. To build elsewhere, run `node tools/build.mjs --out <file>`, as the workers do.
- **The layers:** MOTOR in `src/motor`, content in `src/game`. Content imports only `src/motor/index.js` (the boundary
  check enforces it), and content files are found at build time, so adding a mission never edits an index.
- **Determinism:** the simulation and the content use no `Date`, `performance` or `Math.random` (lint enforces it).
  Time comes from `dt`, and randomness from named `RNG` streams. A view never changes the simulation's hash. Bot runs
  are deterministic too, so any change to MOTOR, the bot or the map moves every run: re-run all merged content after
  one.
- **Model identifiers stay out of repository files** (D3). They go only in the chat report.
- **Headless:** `tests/harness.mjs` runs the game in Node (`engineGlobal()`, `loadGame({ hash, query, pads })`,
  `holdCode`, `snap`). In a page, `window.__gtm` exposes the test hooks.
- **The bot's tools:**
  - `node tools/bot.mjs --mission <id> --seeds 1,2,3`: one mission through the mission bot.
    - `--all` runs every mission and activity level; `--pad` sends the bot's wishes through a gamepad (the scripted
      human-style pass); `--par N` runs N at once, each in its own process (3 on this machine).
    - `--stage <id>` starts at a stage; `--verbose` or `--trace` shows what the bot does.
  - `node tools/bot-campaign.mjs --seed 1 --verbose`: a new game from the title, played until completion reads
    100%. Its travel and seams are in D21.
  - `docs/handoff/m8-a2/tools/`: the probes the merges used. `botgym.mjs` plays one fixture per hint kind, and needs
    13/13 with the bot and through the pad; `r3trace.mjs` lists the damage taken by source; `s1trace.mjs` logs the
    bot's state each second; `m8shots.mjs` takes M8's shots. Copy one to `tools/_<name>.mjs` to run it, since git
    ignores `tools/_*.mjs`.
- **The other tools:**
  - `tools/perf.mjs`: frame times, interleaved with an older build via `--dist <file>`;
  - `tools/shots.mjs` and `tools/shot-matrix.mjs`: the views by time and weather;
  - `tools/model-sheet.mjs`, `tools/vehicle-bench.mjs`, `tools/map-sheet.mjs`;
  - `tools/cpu-profile.mjs` and `tools/profile-frame.mjs`: where a frame goes;
  - `tools/patch-record.mjs`: records an engine patch;
  - `tools/serve.mjs --watch` (`npm run dev`).

## Fan-outs: what A1 and A2 taught

- **Check each worktree's base.** A worktree may be created at the repository's first commit instead of the branch
  head. Each worker must first run `git checkout --detach <head>` in its worktree and confirm that `git log` shows
  the branch's history.
- **Workers own disjoint new files.** They run their own tests against a build in a temporary directory, and return
  `{ files, runs, notes, motorRequests }` in a structured result. A worker never edits MOTOR. It works round a gap in
  content and files a request. The main loop checks each request against the code and fixes it with a test, then
  ports the content to the new piece and re-runs it.
- **Merge each result as it lands**, from the workflow's `journal.jsonl`, not all at the end. A2's results needed
  more MOTOR work than the content took to write.
- **Workers never write** `dist/index.html`, `PROGRESS.md` or `DECISIONS.md`, and never commit or push.
- **Parallelism:** a workflow runs at most CPUs - 2 agents at once (2 on this machine). A finished group took its
  worker two to three hours: the Rats and the Gnomes about 2, the heist's finale about 3. Most of that time went on
  bot runs.
- **The session's scratchpad is shared** by every worker. Give each worker its own subfolder, or their probes
  overwrite each other.
- **Worktrees live in `.claude/worktrees/`**, which `.gitignore` and `eslint.config.js` both ignore. Never
  `git add -A` while they exist, because a worktree once went in as a gitlink. Add files by their paths.

## Known limits

- **What the bot can't do yet:**
  - lose three stars (the Eye sees 520 u except under the decks, and roadblocks sit on its routes): content keeps a
    stage's stars below three or drives them through (G7 in the backlog);
  - always keep a delivery free of police stars: S1's long Brute is busted now and then, and wins on a retry;
  - always turn a long truck at a tight corner: a failing turn is kept off its next route, but it costs time;
  - fight back a passer-by who hits it (G5): content sends them running instead (`m.shoo`, in the patch).
- **The map by the harbour:** a building lot on a pier over water gets no walls (G9: the Rats' Boathouse, the
  Lighthouse). The one-line fix in `world/builder.js` changes the map there, so it is its own step, with R1-R3 and G3
  run again.
- **Night glows** (the head, tail and siren lights' halos) ignore occlusion. From some angles a far tail lamp's glow
  shows over a roof at night.
- **Performance margin:** see D20, and measure each milestone interleaved with the last
  (`node tools/perf.mjs --dist <old build>`). The machine's speed varies more than the budgets' margins.
- **Bike riders** sit at a fixed height whatever the bike.

## Continuing the run: the /goal prompt

Start a new session at the effort you choose (PLAN.md 16 recommends **xhigh**; this run used max), then paste this
block. It is plain ASCII and under the 4,000-character limit for `/goal` (`npm test`'s goal-sync step checks it).

```
/goal Continue GRAND THEFT MOTO (ID GrandTheftMoto-5S) in michaelcrosato/gta25-cco55-my-3d2dge from the middle of M8 through M13, exactly as PLAN.md specifies: it is the contract. M0-M4 are merged into main; M5-M7 and M8 so far are on branch claude/compassionate-shannon-h7k7zk in its draft PR #2: keep working there and keep its CI green. Read docs/HANDOFF.md first, then docs/handoff/m8-a2/README.md, PLAN.md in full, PROGRESS.md, docs/ARCHITECTURE.md (the frozen contracts), docs/DECISIONS.md (D1-D21) and docs/CONTENT-GUIDE.md.

Finish M8 first, in this order: apply docs/handoff/m8-a2/motor-patch.py and validate it (npm test, then every merged mission through the bot on seeds 1-3 and through the pad); port the content's workarounds to the new MOTOR pieces; finish FAN-OUT A2 (saints, prologue, extras; heist-setups and jobs from their saved work in progress); bring the bot campaign to 100%; then M8's acceptance and evidence. Bot runs are deterministic: after any MOTOR or bot change, re-run all merged content.

ultracode: run bounded workflows only at the remaining fan-out points in PLAN.md section 16 (A2's remaining groups at M8, C at M9 optional, B at M13). Each workflow has at most 10 agents, each in its own worktree on disjoint files. Each worker first checks out the branch head in its worktree, returns its files, runs and notes, and never writes dist/index.html, PROGRESS.md or DECISIONS.md, commits or pushes. Merge each result as it lands.

Rules, as in GOAL.md: my-3D2dge v0.46.1 at cfa866aa45474868350cad1a7fc015e612f9305f stays vendored in vendor/my-3d2dge, patched only per PLAN.md section 12 (GTM-PATCH markers, PATCHES.md, tests). MOTOR in src/motor, content in src/game (content imports only src/motor/index.js). No runtime dependencies, no network, no binary assets. The simulation is deterministic, view-independent and headless-testable. A controller-first 10-foot UI for a PS5 DualSense (code-drawn glyphs, analog triggers, rumble); keyboard and mouse on the same model; no dense web screens; no touch controls (phones run kiosk/attract mode only). Attract mode after 10 s idle; any input returns to the title at once; the demo never saves. Model identifiers stay out of repository files (D3).

Process: milestone by milestone. Commit after each green step, only when npm test exits 0 (check the exit code itself), with dist/index.html rebuilt; push at least once per milestone. Keep PROGRESS.md current with evidence: tests, screenshots with verdicts, and perf measured interleaved with the previous build. Change scope only through docs/DECISIONS.md, never silently. Read your own screenshots and fix every look note.

Done only when every item of PLAN.md section 15 holds (as amended in DECISIONS): npm test and test:full pass and CI is green; dist/index.html plays the whole slice from file://; all 14 missions, the side content, shops and properties work, and a headless bot campaign reaches 100%; the three views work outdoors and in the bank and never change the simulation hash; the attract soak and the exit-on-any-input matrix pass; the 10-foot UI audit and the controller-only, keyboard-only and mouse-only passes succeed; determinism, replay and the performance budgets pass; content-recipe tests pass; README.md, the Credits & About screen and the HTML header carry the Source Information and, separately, the engine analysis; docs/ENGINE-ANALYSIS.md is final.

End with a chat report: 1. Source Information (Initial Date, SOURCE, GAME ENGINE version/commit/URL, Environment, Model and Effort Level; only what you can confirm). 2. Separately, the Game Engine Analysis (what you used, what you did not, the one thing you would change). 3. How to play, and the PR link.
```
