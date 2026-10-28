# Handoff: GRAND THEFT MOTO, the full game (M0-M13 and L1-L7), L8 with the owner

This is where a fresh session picks up the run. `PLAN.md` is still the contract and `GOAL.md` is the prompt that
started the run. This page says where the run stands, what is left (L1-L8), how the repository is worked, and what
to watch for. The `/goal` prompt that finishes what is left is at the end. The page is kept current as the run goes,
so a session that stops anywhere can resume from it: the work in flight is listed with where it lives.

## Where it stands

- **Done: M0-M12** (`PROGRESS.md` has each milestone's evidence: commits, tests, shots and verdicts, perf):
  - M0-M7: the core, input and attract loop; the three views and the Stage; Lowtown; the crew on foot, combat and the
    vehicles; the roads, traffic, crowds and emergency services; the wanted level, police and gangs; the bank;
  - M8: the mission runtime, the economy, all 14 missions and the side content (FAN-OUT A2), and the bot campaign at
    100% (`5c7c2ef`: a new game to the phone's COMPLETION in 2.15 h of game, every mission at its first try), with
    every merged mission and activity through the bot on seeds 1-3 and through the pad, and the bot gym both ways
    (D21, D30);
  - M9: the 10-foot UI on MOTOR's own layer (D23); M10: sound and the radio (D24); M11: the attract mode, kiosk and
    phone (D25); M12: the Proving Ground, photo mode, the dev tools, the 15 content recipes and District 2 (D26).
- **Done: M13** (D28-D31; `PROGRESS.md` has its acceptance, the Definition of Done item by item): the polish (the
  rumble, TUNING.md, the look notes, the respray's bay, sodium lamps), the perf levers, FAN-OUT B (eight reviewers, 47
  findings, each a test under `tests/review/`, a step of `npm test`, every one fixed), and part 5: the bot after
  FAN-OUT B, the shots matrix with a verdict a row and its look pass, the stalls the campaign found (each fixed where
  it lives, with a test), and what test:full and the audit found on the way (the gang shoot-out's tip for a hand in
  it, the page's inline icon so a static server is asked for nothing, the 10-foot UI at HUD Huge). `npm run test:full`
  passed every step on `154eb02`, the campaign at 100.0%, and CI is green; the page itself played the 14 missions
  through from file:// (D31). The release docs are final: README.md, `docs/ENGINE-ANALYSIS.md`, the Credits & About
  screen and the HTML header (both from `src/about.js`), `vendor/my-3d2dge/PATCHES.md`. **The owner's directions
  (D29):** performance is out of the Definition of Done (the "perf gates" step left test:full; `tools/perf.mjs` stays
  for later; D35 put it back, L3), and the bots may play invulnerable (`?god=1`, the tools' `--god`; the campaign
  plays god by default, `--mortal` without; the mission bot's runs stay mortal).
- **Done: L1-L7** (D33-D46, on this run's branch, `claude/laughing-fermi-w5m8oe`, in the draft PR
  michaelcrosato/gta25-cco55-my-3d2dge#4 to `main`; `PROGRESS.md` has each item's evidence): determinism across Node
  and Chromium (L1), the known limits (L2), every view within its budgets with a quality setting and the perf gate
  back in test:full (L3, superseding D29's first call), PLAN.md 19's backlog on Lowtown (L4), `docs/EXPANSION.md`
  (L5) and the full game it plans, built (L6: Ironside and Glass Heights, seven gangs, 32 missions, planes and boats,
  the campaign at 100% across the three districts), the desktop wrapper and the DualSense by WebHID (L7). Each closed
  with `npm run test:full` passing alone on its last commit, L7's on `9890e8f`.
- **L8, with the owner** (nothing has left the repository): the offer upstream (the seven patches' issue texts in
  `vendor/my-3d2dge/PATCHES.md` and the feedback F7 in `docs/FEEDBACK-FOR-ENGINE.md`, brought up to date with L1-L7),
  the DualSense checklist (`docs/QA-DUALSENSE.md`, sections 1-7, for a person with the pad and a TV) and that PR's
  review and merge. Its box stays open until the owner has done them.
- **Merged:** michaelcrosato/gta25-cco55-my-3d2dge#1 (M0-M4) and michaelcrosato/gta25-cco55-my-3d2dge#2 (M5-M13,
  merged on 2026-10-23 as `1a1f955`) are in `main`, and CI is green there. Their branch,
  `claude/compassionate-shannon-h7k7zk`, is spent. New work goes on a fresh branch cut from `main` (a cloud session's
  own), in a new draft PR to `main`. Pushing works.
- **Left:** L8, the owner's (below). Any further change keeps the game done: `npm test` before every commit,
  test:full before it closes, and all merged content re-run after a MOTOR, bot or map change.
- **The container**, checked on 2026-10-24 (D32): Node 22.22.0, npm 10.9.4, Playwright 1.56.1, ffmpeg and python3 on
  the PATH, 4 CPUs and 15 GB. Its Chromium is now **153** (build 1243, `/opt/pw-browsers/chromium`). PLAN.md 6.1 and D6
  pinned Playwright for Chromium 141 (build 1194). Playwright 1.56.1 still drives 153 through `CHROMIUM_PATH`, which
  the hook sets, and `npm test` passed every step on it in 8 min 46 s. The mission bot plays (the prologue on seed 1,
  gold), and `tools/perf.mjs` runs. D31's drift holds against 153 too: in a probe of 20,000 arguments each, `pow`
  differed on 2,022, `sin` on 711 and `cos` on 660. For L7, Rust 1.97 is installed and the npm registry answers, but
  a Tauri build still needs the WebKitGTK libraries, and an Electron build its binary download.
- **Where runs go:** the earlier containers' validation trees (`/home/user/gtm-m9`, `/home/user/gtm-v2`) are gone. To
  make one, run `git worktree add --detach <dir> <commit>` and link its `node_modules` to the repository's (never
  `git clean` it). `npm test` runs alone or beside one bot run at most (a container was restarted once under more).
- **Fan-out points** (PLAN.md 16): A1 (M4), A2 (M8) and B (M13) ran; C (optional, M9's screens) was not used.

## What's left (L1-L8)

This is everything the docs leave open: what DECISIONS left for later, the known limits below, and PLAN.md 19's
expansion path. Work it in this order (D32). An item closes when `npm run test:full` passes alone on its last commit
and its evidence is in `PROGRESS.md`; then tick its box here.

- [x] **L1 · Determinism across runtimes** (D31's limit; done, D33). The simulation computes with MOTOR's own `sin`, `cos` and
  `pow`, and with its own version of any other Math function that a probe finds differing between Node and Chromium.
  Reach the engine's `E.Mover` through a GTM-PATCH (PLAN.md 12). Add a test that one seed's run hashes the same
  headless and in the page. Once this holds, the page's bot plays the same game as the headless run.
- [x] **L2 · The known limits** (below; done, D34). Fix each one where it lives, with a test, or keep it with a DECISIONS entry
  that says why:
  - the night glows that show over the roofs in front of them;
  - bike riders at a fixed height instead of their own bike's;
  - the bot's limits: three stars, a delivery kept free of stars, a long truck at a tight corner, a passer-by who hits
    it, the pocket that pins it on foot, and the retries in the pad's gym.
- [x] **L3 · Performance** (left for later by D29; done, D35). D10 and D20 have the budgets, and D28 lists the levers taken and
  those left.
  - Take the reading of record (`node tools/perf.mjs --gate --rounds 3`, alone on the machine).
  - Bring every view inside its budget, or inside targets the owner sets, without cutting the look.
  - Add a quality setting for slower machines, with the full look as the default.
  - Put the perf step back in test:full, with a DECISIONS entry that supersedes D29's first call.
- [x] **L4 · PLAN.md 19's backlog, on Lowtown:**
  - the free-turning chase camera (a fourth view, as view-independent as the rest);
  - player-flown helicopters, and boarding the L;
  - more radio stations, and photo filters;
  - the Paramedic and Tow jobs, at three levels each;
  - the Club Chrome interior;
  - the arcade cabinet, which runs an engine starter kit inside the game.

  Each goes through the bot on seeds 1-3 and through the pad, gets a content recipe if it is a new kind, and counts
  toward the campaign's 100%.
- [x] **L5 · The expansion's plan:** write `docs/EXPANSION.md` in PLAN.md's form (the content spec, milestones with
  their acceptance, a Definition of Done). Commit it and record its scope in DECISIONS before building any of it. It
  follows PLAN.md 19's shape:
  - District 2, grown from its stub, and a District 3, each with its interiors, three gangs and their missions, and
    a heist (3 districts x 3 gangs, plus 3 heists);
  - the bridges, which open with the story and load one map at a time across a bridge fade, and when streaming
    between districts comes (PLAN.md 19 leaves that for later);
  - the content packs: planes, more boats, more weapons.
- [x] **L6 · The expansion, built** (done, D38-D45) milestone by milestone as `EXPANSION.md` lays it out, with the campaign reaching
  100% across all the districts.
- [x] **L7 · Platforms** (done, D46):
  - a desktop wrapper (Electron or Tauri, for desktops and the Steam Deck) around the one-file page, which stays
    unchanged. The wrapper is a dev dependency with its own build output.
  - real DualSense haptics and adaptive triggers through WebHID on desktop Chrome, with the rumble as the fallback.
    Their checks go into `docs/QA-DUALSENSE.md`.
- [ ] **L8 · The owner's items** (prepared on 2026-10-28 and put to the owner; open until they are done). The run
  prepares each one, and nothing leaves the repository without the owner's say-so:
  - the offer upstream: the seven patches' issue texts (`vendor/my-3d2dge/PATCHES.md`) and the feedback F7
    (`docs/FEEDBACK-FOR-ENGINE.md`), brought up to date with L1-L7;
  - the DualSense checklist (`docs/QA-DUALSENSE.md`), for a person with the pad and a TV;
  - each PR's review and merge.

## Read first

1. This page. (`docs/handoff/m8-a2/README.md` is FAN-OUT A2's record, finished at M8; its probes are below.)
2. `PLAN.md`, in full. It is the contract, and scope changes go only through `docs/DECISIONS.md`.
3. `PROGRESS.md`: each milestone's status and evidence (the acceptance log has every milestone's runs).
4. `docs/ARCHITECTURE.md`: the module map and the frozen contracts (the Stage and projectors, the registries, the
   Intent, the BUS).
5. `docs/DECISIONS.md`: D1-D47, every call made without an answer. D21 is M8's, including what the bot does and why;
   D29 has the owner's two directions (performance out of the Definition of Done, bots that may play god); D30 is
   M13's part 5 (the campaign's stalls, each fixed where it lives); D31 its close (determinism per runtime); D32 the
   container's Chromium 153 and L1-L8, the one list of what is left; D33-D47 the run that worked it, item by item.
6. `docs/CONTENT-GUIDE.md`: how each kind of content is added, the mission DSL and its `m` API included.
7. `vendor/my-3d2dge/PATCHES.md`: the engine patches (GTM-PATCH markers). Never read the 742 KB engine whole. Search
   its `API-INDEX.md` first.

## Working the repository

- **Setup:** `npm ci` (Node 22). In a Claude Code cloud session the SessionStart hook installs everything.
- **The gate: `npm test`** runs lint, the boundary, vendor and goal-sync checks, "dist current" and "tuning current",
  then the unit and sim tests (343), the 15 content recipes, FAN-OUT B's 78 review tests, the browser suites (the
  smoke from file:// and from a static server, replay, the Proving Ground's self-tests, audio, the attract mode, photo
  mode, the dev tools, and the cross-runtime check: one seed headless and in Chromium to the same hash, D33), then the
  engine's checker on the city and the bank. It takes 10 to 13 minutes.
- **`npm run test:full`** adds the heavy suites (`tools/test-run.mjs`): the 10-minute city and audio soaks, the
  attract soak (30 minutes on the shipped page and seeds 1-3, then 5 drawn in Chromium), the gang sim, the
  cross-runtime check at 600 s a scenario, the UI audit (each device alone at 1080p and 720p, then HUD Huge), the
  shots matrix, every mission and activity level through the bot on seeds 1-3 and through a pad, and the bot campaign
  to 100% (god). About three hours alone; it stops at the first failing step.
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

- **What the bot can't do** (D22 and D34: content never asks it):
  - lose three stars for sure: it hides from the Eye under the decks, but the police on foot shoot its car to a wreck
    while it is stopped or crawling, and which seeds get away moves with every change (the gym's `evade3`, played and
    reported but not gating). Content keeps a stage's stars below three or drives them through to where the story drops
    them;
  - fight back a passer-by who hits it: content sends them running instead (`m.shoo`); it walks on regardless (the
    gym's `passerby`);
  - turn a long truck at every tight corner quickly: a failing turn is kept off its next route, but on some seeds it
    costs minutes (the gym's `haul`: 35-102 s on seeds 1-3 and 5, 769 s on seed 4), and a tow truck parked tight by a
    junction facing the map's edge never gets out (the gym's `tow` on seed 4; seeds 1-3 and 5 pass in 92-124 s).
- **Performance:** back in the Definition of Done and in test:full since D35 (L3; D29 had left it for later): the
  "perf gates" step reads each view against M2's build, the median of five rounds. D10 and D20 have the budgets, D35
  where the frame goes and what each change saved; `node tools/perf.mjs --dist <old build>` measures interleaved with
  an older build. One round's readings vary about ±1.5%, and MODE 7's margin is about 2%: weigh a change to its frame
  by builds measured in turn, not by one reading.

## Continuing the run: the /goal prompt

Start a new session at the effort you choose (PLAN.md 16 recommends **xhigh**; this run used max), then paste this
block. It is plain ASCII and under the 4,000-character limit for `/goal` (`npm test`'s goal-sync step checks it).
Add the word `ultracode` to allow bounded workflows at PLAN.md 16's fan-out points, such as L6's content, the way A2
wrote M8's. Without it, the run stays single-agent.

```
/goal Finish GRAND THEFT MOTO (ID GrandTheftMoto-5S) in michaelcrosato/gta25-cco55-my-3d2dge: every item of the "What's left" list in docs/HANDOFF.md, L1-L8, in order. The slice (M0-M13) is done and merged on main. Read docs/HANDOFF.md first and follow its reading list, rules and tools. PLAN.md stays the contract; every scope change, the expansion's included, goes through docs/DECISIONS.md.

The list: L1 determinism across Node and Chromium; L2 the known limits; L3 performance (the budgets met, a quality setting, the perf gate back in test:full); L4 PLAN.md 19's backlog on Lowtown; L5 docs/EXPANSION.md, the plan for the full game; L6 that plan built; L7 a desktop wrapper and WebHID DualSense haptics; L8 the owner's items, prepared and put to them (nothing leaves the repo unasked).

Rules: GOAL.md's still hold (the engine patched only per PLAN.md 12; MOTOR in src/motor, content in src/game; the page needs no runtime dependency, network or binary asset; a deterministic, view-independent, headless-testable simulation; the controller-first 10-foot UI; attract mode). No model identifiers in repository files (D3).

Process: work on this session's branch, cut from main, in a draft PR to main with CI green. Commit each green step only when npm test exits 0, with dist/index.html rebuilt, and push. After any MOTOR, bot or map change, re-run all merged content as HANDOFF says. Close each item with npm run test:full passing, alone, its evidence in PROGRESS.md and its box ticked in HANDOFF. Read your own screenshots and fix every look note.

Done when L1-L7 are ticked, L8 is with the owner, and PLAN.md 15 (as DECISIONS and EXPANSION.md amend it) holds on the PR's head. End each item with a chat report (what changed, the evidence, the PR link), the last as PLAN.md 15 item 12 asks.
```
