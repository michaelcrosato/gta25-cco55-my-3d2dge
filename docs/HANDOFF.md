# Handoff: GRAND THEFT MOTO, the slice done (M0-M13)

This is where a fresh session picks up the run. `PLAN.md` is still the contract and `GOAL.md` is the prompt that
started the run. This page says where the run stands, how the repository is worked, and what to watch for. The
`/goal` prompt that continues the run is at the end. It is kept current as the run goes, so a session that stops
anywhere can resume from it: the work in flight is listed with where it lives.

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
  for later), and the bots may play invulnerable (`?god=1`, the tools' `--god`; the campaign plays god by default,
  `--mortal` without; the mission bot's runs stay mortal).
- **Left, and the owner's:** the review of PR 2 (a draft until the owner asks for it to be marked ready), and whatever
  comes next: performance (D29), the expansion path (PLAN.md 19). Each change keeps the slice done: `npm test` before
  every commit, test:full before a change closes, all merged content re-run after a MOTOR, bot or map change.
- **Where runs go:** the validation trees `/home/user/gtm-m9` and `/home/user/gtm-v2` (detached worktrees, their
  `node_modules` symlinks: never `git clean` them) are checked out at the commit under test; `npm test` runs alone or
  beside one bot run at most (the container was restarted once under more). A new container has neither: make one with
  `git worktree add --detach <dir> <commit>` and link its `node_modules` to the repository's.
- **The pull requests:** michaelcrosato/gta25-cco55-my-3d2dge#1 carried M0-M4 and was merged into `main`. M5 onward is
  on `claude/compassionate-shannon-h7k7zk`, in the draft michaelcrosato/gta25-cco55-my-3d2dge#2. Pushing works again
  (the 403 of D27 is gone since M13's part 3).
- **Fan-out points** (PLAN.md 16): A1 (M4), A2 (M8) and B (M13) ran; C (optional, M9's screens) was not used.

## Read first

1. This page. (`docs/handoff/m8-a2/README.md` is FAN-OUT A2's record, finished at M8; its probes are below.)
2. `PLAN.md`, in full. It is the contract, and scope changes go only through `docs/DECISIONS.md`.
3. `PROGRESS.md`: each milestone's status and evidence (the acceptance log has every milestone's runs).
4. `docs/ARCHITECTURE.md`: the module map and the frozen contracts (the Stage and projectors, the registries, the
   Intent, the BUS).
5. `docs/DECISIONS.md`: D1-D31, every call made without an answer. D21 is M8's, including what the bot does and why;
   D29 has the owner's two directions (performance out of the Definition of Done, bots that may play god); D30 is
   M13's part 5 (the campaign's stalls, each fixed where it lives); D31 its close (determinism per runtime).
6. `docs/CONTENT-GUIDE.md`: how each kind of content is added, the mission DSL and its `m` API included.
7. `vendor/my-3d2dge/PATCHES.md`: the engine patches (GTM-PATCH markers). Never read the 742 KB engine whole. Search
   its `API-INDEX.md` first.

## Working the repository

- **Setup:** `npm ci` (Node 22). In a Claude Code cloud session the SessionStart hook installs everything.
- **The gate: `npm test`** runs lint, the boundary, vendor and goal-sync checks, "dist current" and "tuning current",
  then the unit and sim tests (343), the 15 content recipes, FAN-OUT B's 78 review tests, the browser suites (the
  smoke from file:// and from a static server, replay, the Proving Ground's self-tests, audio, the attract mode, photo
  mode, the dev tools), then the engine's checker on the city and the bank. It takes about twelve minutes.
- **`npm run test:full`** adds the heavy suites (`tools/test-run.mjs`): the 10-minute city and audio soaks, the
  attract soak (30 minutes on the shipped page and seeds 1-3, then 5 drawn in Chromium), the gang sim, the UI audit
  (each device alone at 1080p and 720p, then HUD Huge), the shots matrix, every mission and activity level through
  the bot on seeds 1-3 and through a pad, and the bot campaign to 100% (god). About three hours alone; it stops at
  the first failing step.
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

- **What the bot can't do** (D22: content never asks it):
  - lose three stars (the Eye sees 520 u except under the decks, and roadblocks sit on its routes): content keeps a
    stage's stars below three or drives them through to where the story drops them;
  - always keep a delivery free of police stars: S1's long Brute is busted now and then, and wins on a retry;
  - always turn a long truck at a tight corner: a failing turn is kept off its next route, but it costs time;
  - fight back a passer-by who hits it: content sends them running instead (`m.shoo`).
- **Determinism is per runtime** (D31): Node's V8 and Chromium's differ in the last bit of `Math.pow`, `Math.sin` and
  `Math.cos` for a few arguments in a hundred, so one seed played headless and in the page drifts apart. Every proof
  of PLAN.md 7.3 holds within its runtime (a recording replays in the browser it was made in); a bot run in the page
  is a different game from the same seed's headless run.
- **The bot can be pinned on foot:** with every car near it given up on for the trip, a car it left parked, a wall and
  peds standing in the gap can close a pocket round it, and its walk then cycles its start nodes without leaving (met
  once, in the page's run of Gutter Ball on seed 1, D31; no headless run has met it). A player walks round, or takes
  the car.
- **The bot gym through the pad is the touchiest probe:** `follow` (a calm car tailed across town) and `kill` pass,
  but often on a retry; every MOTOR change moves them first.
- **Night glows** (the head, tail and siren lights' halos) ignore occlusion. From some angles a far tail lamp's glow
  shows over a roof at night.
- **Performance:** out of the Definition of Done since D29 (the owner's call: FPS targets and optimization come later).
  D20 has the budgets and where the frame goes; `node tools/perf.mjs --dist <old build>` measures interleaved with an
  older build. The machine's speed varies more than the budgets' margins.
- **Bike riders** sit at a fixed height whatever the bike.

## Continuing the run: the /goal prompt

Start a new session at the effort you choose (PLAN.md 16 recommends **xhigh**; this run used max), then paste this
block. It is plain ASCII and under the 4,000-character limit for `/goal` (`npm test`'s goal-sync step checks it).

```
/goal Keep GRAND THEFT MOTO (ID GrandTheftMoto-5S) in michaelcrosato/gta25-cco55-my-3d2dge done, and take it where the owner asks. M0-M13 are done: every item of PLAN.md section 15 holds as amended in docs/DECISIONS.md, and PROGRESS.md has M13's acceptance with its evidence. PLAN.md stays the contract, and scope changes go only through docs/DECISIONS.md. Work on branch claude/compassionate-shannon-h7k7zk in draft PR #2 and keep its CI green. Read docs/HANDOFF.md first and follow its reading list, rules and tools.

The work is the owner's to set: their review of PR #2 (answer each comment; fix what they ask where it lives, with a test), and what they choose next (performance, D29; the expansion path, PLAN.md section 19). Mark the PR ready only when the owner asks.

Rules: every rule in GOAL.md holds (the vendored engine patched only per PLAN.md section 12; MOTOR in src/motor, content in src/game; no runtime dependencies, network or binary assets; a deterministic, view-independent, headless-testable simulation; the controller-first 10-foot UI; attract mode). Model identifiers stay out of repository files (D3).

Process: commit after each green step, only when npm test exits 0 (check the exit code itself), with dist/index.html rebuilt; push. Bot runs are deterministic: after any MOTOR, bot or map change, re-run all merged content (tools/bot.mjs --all on seeds 1-3 and through the pad, the bot gym, the campaign to 100%), and run npm run test:full, alone, before a change closes. Keep PROGRESS.md (tests, shots with verdicts) and docs/HANDOFF.md current, so a paused run resumes exactly. Read your own screenshots and fix every look note.

End each piece of work with a chat report: what changed, the evidence (tests, runs, shots with verdicts), and the PR link.
```
