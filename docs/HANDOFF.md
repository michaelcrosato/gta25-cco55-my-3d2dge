# Handoff: GRAND THEFT MOTO in M13

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
- **M13, parts 1-5 in** (D28, D29): the polish (the rumble, TUNING.md, the look notes, the respray's bay, sodium
  lamps), the perf levers, FAN-OUT B (eight reviewers, 47 findings, each a test under `tests/review/`, a step of
  `npm test`, every one fixed), and part 5: the bot after FAN-OUT B (the pull-away only from a cop coming for the door,
  the Eye lost under a deck, the stunt runner's stop) and the shots matrix with a verdict a row and its look pass
  (busier roofs, Neon Mile's neon, TOP-DOWN's roof clutter drawn). **The owner's directions (D29):** performance is out
  of the Definition of Done (the "perf gates" step left test:full; `tools/perf.mjs` stays for later), and the bots may
  play invulnerable (`?god=1`, the tools' `--god`; the campaign plays god by default, `--mortal` without; the mission
  bot's runs stay mortal).
- **M8, at its last step:** on FAN-OUT B's MOTOR (`7b1980f`) every mission and activity passed the bot on seeds 1-3
  but H4 on seed 3 (95/96), fixed in part 5 (`9843969`). Part 5's bot changes are being validated in turn: `node
  tools/bot.mjs --all --seeds 1,2,3 --par 3`, then `--all --pad --seeds 1 --par 3`, then the bot gym both ways
  (`docs/handoff/m8-a2/tools/botgym.mjs`, copied to `tools/_botgym.mjs`); then the campaign (`node
  tools/bot-campaign.mjs --seed 1 --verbose`, god) to 100%, then M8's acceptance with its evidence. The campaign's
  last full run (mortal, `839a4c5`) reached 89%: H4's getaway, Vigilante level 3, two stunt jumps. Probes since:
  four of the five stunts land at once, the canal now too (its runner's stop drove it back into the canal); `--only
  <ids>` probes one item at a time.
- **Then the rest of M13:** test:full, the release docs
  (README's and the Credits & About screen's Source Information and engine analysis, the HTML header,
  `docs/ENGINE-ANALYSIS.md` final, `vendor/my-3d2dge/PATCHES.md`), the Definition of Done check (PLAN.md 15 as D29
  amends it), PR 2's description.
- **Where runs go:** the validation tree `/home/user/gtm-m9` (branch `m11-attract`, its `node_modules` a symlink:
  never `git clean` it) is checked out at the commit under test; `npm test` runs alone (never beside the bot runs: the
  container was restarted once under that load).
- **The pull requests:** michaelcrosato/gta25-cco55-my-3d2dge#1 carried M0-M4 and was merged into `main`. M5 onward is
  on `claude/compassionate-shannon-h7k7zk`, in the draft michaelcrosato/gta25-cco55-my-3d2dge#2. Pushing works again
  (the 403 of D27 is gone since M13's part 3).
- **Fan-out points** (PLAN.md 16): A1 (M4), A2 (M8) and B (M13) ran; C (optional, M9's screens) was not used.

## Read first

1. This page, then `docs/handoff/m8-a2/README.md` (the state of FAN-OUT A2 and how to finish it).
2. `PLAN.md`, in full. It is the contract, and scope changes go only through `docs/DECISIONS.md`.
3. `PROGRESS.md`: each milestone's status and evidence (the acceptance log has M8's runs).
4. `docs/ARCHITECTURE.md`: the module map and the frozen contracts (the Stage and projectors, the registries, the
   Intent, the BUS).
5. `docs/DECISIONS.md`: D1-D29, every call made without an answer. D21 is M8's, including what the bot does and why;
   D29 has the owner's two directions (performance out of the Definition of Done, bots that may play god).
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
