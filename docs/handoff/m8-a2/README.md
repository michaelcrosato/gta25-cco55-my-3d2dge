# M8, FAN-OUT A2: where it stopped, and how to pick it up

The run paused mid-M8 at the session's weekly limit (D21, the last bullet). Everything here is what the next session
needs to finish M8's content and its acceptance. The scratchpad it came from is gone; this folder is the copy.

## The 14 missions and the side content

| Group (worker key) | Files | State |
|---|---|---|
| S1 (by hand, part 1) | `src/game/missions/s1-holy-rollers.js` | merged; the reference mission |
| `rats` | `r1-rat-run.js`, `r2-below-deck.js`, `r3-crane-game.js` | merged (part 2a); every MOTOR request done |
| `heist-finale` | `h4-big-withdrawal.js` | merged as written (part 2b); its MOTOR requests not yet done (below) |
| `gnomes` | `g1-lawn-order.js`, `g2-bingo-night.js`, `g3-gutter-ball.js` | merged as written (part 2b); requests not yet done |
| `heist-setups` | `wip/heist-setups/h1-getaway.js`, `h2-blueprints.js`, `h3-big-drill.js` | **work in progress**, stopped mid-way |
| `jobs` | `wip/jobs/*.js` (3 jobs, 2 races, the MAYHEMs) | **work in progress**, stopped mid-way |
| `saints` | `s2-confession-booth.js`, `s3-drag-mass.js` | not started |
| `prologue` | `p0-prologue.js` | not started |
| `extras` | tokens, stunts, 4 random events, `tests/sim/side-content.test.mjs` | not started |

The briefs every worker got are in `briefs.json` (`common`: the shared rules, with HEAD_SHA, OUT/ and FILES filled in
per worker; `groups`: each group's key, files and task). `workflow.js` is the workflow that ran them (eight workers,
two at a time: the cores less two). Each finished worker's notes and structured result are in `notes/`.

### The work in progress (copied from the workers' worktrees when they were stopped)

- **heist-setups:** H1 passed seed 1 (silver, one retry); H2 failed at `inside` (the alarm went up: the plans are
  moved), three times on seed 1; H3 passed seed 1 gold, and failed seeds 2 and 3 at `tow` (busted, the Hookline
  wrecked). Their last runs were on MOTOR `e88f1e2`, before part 2a's fixes.
- **jobs:** the Firefighter passed seeds 1-3 (silver with two retries, gold, gold); the Moto Courier seeds 1-3 (gold);
  MAYHEM `mayhem_zap_rats` seeds 1-2; the races were still being tuned; levels 2-3 not yet run. The worker tried a
  local MOTOR patch (`wip/jobs/motor-patch.trial.mjs`: a race's checkpoints counted at their height, the GPS given
  the goal's height, a seated body not lit by the street's fire). The last of these is in part 2a; the other two
  are in `motor-patch.py` below.

## How to finish

1. **The MOTOR backlog first** (`motor-requests.md`): the H4 and Gnomes workers' requests, each checked against the
   code. `motor-patch.py` applies the ones prepared (`python3 docs/handoff/m8-a2/motor-patch.py` from the repository
   root; each edit asserts its anchor, so a stale anchor fails loudly). A dry run on part 2b's tree applied cleanly,
   and the lint, the boundary check and the missions, combat and mission-links sim suites (26 tests) passed with it;
   it has not been through the whole gate or the bot yet: apply it, run `npm test`, then every merged mission again
   (below), and fix what moves. Then port the content's workarounds (the end of `motor-requests.md`). The requests
   marked "left" are for the next session to decide.
2. **The remaining groups:** run the workflow again for `saints`, `prologue`, `extras`, and `heist-setups` and `jobs`
   starting from their work in progress (put the WIP files in the worker's brief, or finish them by hand). Workers
   check out the branch head first, own disjoint new files, return `{ files, runs, notes, motorRequests }`, and never
   write dist, PROGRESS.md or DECISIONS.md, commit or push. Merge each result as it lands (the workflow's journal
   records each one: `.../workflows/<run>/journal.jsonl`), not all at the end.
3. **Validate after every MOTOR change:** the bot runs are deterministic now (D21), so any change to the bot or the
   simulation shifts every run. Re-run all merged content: `node tools/bot.mjs --all --seeds 1,2,3 --par 3` and
   `--pad --seeds 1 --par 3` (test:full has both); keep the bot gym passing (`tools/botgym.mjs` here: copy it to
   `tools/_botgym.mjs`, git-ignored, then `node tools/_botgym.mjs [--pad] [--only kill,ram] [--trace]`).
4. **The bot campaign** (`node tools/bot-campaign.mjs --seed 1 --verbose`): it needs all 14 missions and the side
   content to reach 100%. Its mechanics are checked (a giver walked to, the JOB card, S1 played, both properties
   bought); jobs from the phone, races, MAYHEM, tokens and stunts are written but untested until their content lands.
5. **M8's acceptance** (PLAN.md M8: sections 8.15 and 8.16, every mission through the bot and the pad): the evidence
   in PROGRESS.md; the economy's completion test un-skips itself once every category has content; perf interleaved
   with M7's build (`be9066d`: `node tools/perf.mjs --dist <M7's dist>`); the shots of the new content with
   verdicts (`tools/m8shots.mjs` here is the shots probe); D21 finished; then M9.

## Tracing a bot run that fails

`tools/bot.mjs --mission <id> --seeds N --verbose` (or `--trace`), and `--stage <id>` to start at a stage. The
probes in `tools/` here show how: `r3trace.mjs` (the damage the player takes, by source), `s1trace.mjs` (the bot's
state each second in a window). Copy them into `tools/_*.mjs` to run them.
