# Handoff: GRAND THEFT MOTO at the end of M8

This is where a fresh session picks up the run. `PLAN.md` is still the contract and `GOAL.md` is the prompt that
started the run. This page says where the run stands, how the repository is worked, and what to watch for. The
`/goal` prompt that continues the run is at the end. It is kept current as the run goes, so a session that stops
anywhere can resume from it: the work in flight is listed with where it lives.

## Where it stands

- **Done: M0-M7 and M9-M12** (`PROGRESS.md` has each milestone's evidence: commits, tests, shots and verdicts, perf):
  - M0-M7: the core, input and attract loop; the three views and the Stage; Lowtown; the crew on foot, combat and the
    vehicles; the roads, traffic, crowds and emergency services; the wanted level, police and gangs; the bank;
  - M9: the 10-foot UI on MOTOR's own layer (D23); M10: sound and the radio (D24); M11: the attract mode, kiosk and
    phone (D25); M12: the Proving Ground, photo mode, the dev tools, the 15 content recipes and District 2 (D26).
- **M8, at its last step:** all 14 missions and the side content are in and pass through the bot on seeds 1-3 (96/96)
  and through a pad (32/32) (parts 1-3c); parts 4a-4d fixed what the bot campaign and the full validations found
  (D27; part 4d: crossfire spares the player, the police nab on the player's level, the bot waits for no cop, the
  campaign's rescue, the bot's retries). What is left is the bot campaign to 100% (`tools/bot-campaign.mjs --seed 1
  --verbose`; the last full run, on part 4d before its last fixes, reached 54.8% and stopped on a bug of the tool's
  own, fixed: run it again on this head), then M8's acceptance.
- **The work in flight (2026-10-22):** this tree holds M13's second batch, uncommitted (`git stash list`:
  `m13-part2-wip` if it is still stashed): the respray's bay at the curb in front of Spray & Pray (D20's carried map
  fix: a car's turning circle off Canal Street never brought it within reach of the door), the streetlamps' sodium
  orange (PLAN.md 10), and their tests. The validation tree `/home/user/gtm-m9` (branch `m11-attract`) is where the
  bot runs go: `node tools/bot.mjs --all --seeds 1,2,3 --par 3`, then `--all --pad --seeds 1 --par 3`, then the bot
  gym both ways (`docs/handoff/m8-a2/tools/botgym.mjs`, copied to `tools/_botgym.mjs`), and the campaign; `npm test`
  runs alone (never beside the bot runs: the container was restarted once under that load).
- **Then M13** (PLAN.md 13): the perf pass (ISO about 11.4 ms against 10.4, MODE 7 about 18 against 12.7: D20's levers;
  measured so far, under load: in MODE 7 the textured faces cost about 6 ms of a 25 ms frame, the bodies about 5, the
  cars 2, the deck cells 2; three levers tried did not pay and were dropped: the fog folded into the face textures, the
  floor as one raster, and bodies' kept images scaled between redraws), the shots matrix with a verdict per row,
  FAN-OUT B's eight reviewers (PLAN.md 13's areas, read-only, each returning failing tests or repro scripts), test:full,
  the release docs and the Definition of Done.
- **The pull requests:** michaelcrosato/gta25-cco55-my-3d2dge#1 carried M0-M4 and was merged into `main`. M5 onward is
  on `claude/compassionate-shannon-h7k7zk`, in the draft michaelcrosato/gta25-cco55-my-3d2dge#2. Since 2026-10-21 every
  push is refused with a 403 (the Claude GitHub App has no access for the owner's organization): the commits wait
  locally, PLAN.md 6.1's fallback stands in for CI (D27), and one push carries them all once access is back.
- **Remaining fan-out point** (PLAN.md 16): **B** at M13 (the adversarial review).

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

- **What the bot can't do** (D22: content never asks it):
  - lose three stars (the Eye sees 520 u except under the decks, and roadblocks sit on its routes): content keeps a
    stage's stars below three or drives them through to where the story drops them;
  - always keep a delivery free of police stars: S1's long Brute is busted now and then, and wins on a retry;
  - always turn a long truck at a tight corner: a failing turn is kept off its next route, but it costs time;
  - fight back a passer-by who hits it: content sends them running instead (`m.shoo`).
- **The bot gym through the pad is the touchiest probe:** `follow` (a calm car tailed across town) and `kill` pass,
  but often on a retry; every MOTOR change moves them first.
- **Night glows** (the head, tail and siren lights' halos) ignore occlusion. From some angles a far tail lamp's glow
  shows over a roof at night.
- **Performance margin:** see D20, and measure each milestone interleaved with the last
  (`node tools/perf.mjs --dist <old build>`). The machine's speed varies more than the budgets' margins.
- **Bike riders** sit at a fixed height whatever the bike.

## Continuing the run: the /goal prompt

Start a new session at the effort you choose (PLAN.md 16 recommends **xhigh**; this run used max), then paste this
block. It is plain ASCII and under the 4,000-character limit for `/goal` (`npm test`'s goal-sync step checks it).

```
/goal Finish GRAND THEFT MOTO (ID GrandTheftMoto-5S) in michaelcrosato/gta25-cco55-my-3d2dge, from the middle of M8 through M13, exactly as PLAN.md specifies: it is the contract, and scope changes go only through docs/DECISIONS.md. Work on branch claude/compassionate-shannon-h7k7zk in draft PR #2 and keep its CI green. Read docs/HANDOFF.md first and follow its reading list, rules and tools, then docs/handoff/m8-a2/README.md.

Finish M8 first, in order: apply docs/handoff/m8-a2/motor-patch.py and validate it (npm test, then every merged mission through tools/bot.mjs on seeds 1-3 and through the pad, and the bot gym); port the content's workarounds listed at the end of motor-requests.md, and settle its open requests (H13, G5, G7, G9, J1) in DECISIONS; finish FAN-OUT A2 (heist-setups and jobs from docs/handoff/m8-a2/wip/, then saints, prologue, extras); bring tools/bot-campaign.mjs to 100%; record M8's acceptance and evidence. Bot runs are deterministic: after any MOTOR, bot or map change, re-run all merged content. Then M9-M13 per PLAN.md section 13.

ultracode: bounded workflows only at the remaining fan-outs in PLAN.md section 16 (the rest of A2, C at M9 optional, B at M13): at most 10 agents, each in its own worktree on disjoint files, each first checking out the branch head. Workers never write dist/index.html, PROGRESS.md or DECISIONS.md, commit or push. Merge each result as it lands.

Rules: every rule in GOAL.md holds (the vendored engine patched only per PLAN.md section 12; MOTOR in src/motor, content in src/game; no runtime dependencies, network or binary assets; a deterministic, view-independent, headless-testable simulation; the controller-first 10-foot UI; attract mode). Model identifiers stay out of repository files (D3).

Process: commit after each green step, only when npm test exits 0 (check the exit code itself), with dist/index.html rebuilt; push at least once per milestone. Keep PROGRESS.md (tests, shots with verdicts, perf interleaved with the previous build) and docs/HANDOFF.md current, so a paused run resumes exactly. Read your own screenshots and fix every look note.

Done only when every item of PLAN.md section 15 holds, as amended in DECISIONS: npm test and test:full pass and CI is green; dist/index.html plays the whole slice from file://; all 14 missions, the side content, shops and properties work, and the bot campaign reaches 100%; the three views work outdoors and in the bank and never change the simulation hash; the attract soak and the exit-on-any-input matrix pass; the 10-foot UI audit and the controller-only, keyboard-only and mouse-only passes succeed; determinism, replay and the performance budgets pass; the recipe tests and the District 2 stub pass; README.md, the Credits & About screen and the HTML header carry the Source Information and, separately, the engine analysis; docs/ENGINE-ANALYSIS.md is final.

End with a chat report: 1. Source Information (Initial Date, SOURCE, GAME ENGINE version/commit/URL, Environment, Model and Effort Level; only what you can confirm). 2. Separately, the Game Engine Analysis (what you used, what you did not, the one thing you would change). 3. How to play, and the PR link.
```
