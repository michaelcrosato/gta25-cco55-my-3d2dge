# Decisions

This log records every deviation, exception, and call made without an answer. It is never cleaned up. The format
follows the engine's own log (`docs/DECISIONS.md` in my-3D2dge): the call, its principle, why, whether it was answered,
and where it landed.

## D1 · 2026-10-17 · ES modules bundled by esbuild, not the engine's shared-scope join
- **Principle:** common ground (the doctrine's principle 7). The repository chose its own tech stack.
- **Call:** MOTOR and the game are ES modules. `tools/build.mjs` bundles them with esbuild into one IIFE and inlines it
  after the engine in `dist/index.html`. Content is discovered at build time, so adding content never edits an index
  file.
- **Why:**
  - explicit imports give seams that parallel workers can't collide on;
  - modules can be imported in Node tests;
  - it is standard tooling.

  The engine's own join (its D5) is grandfathered there and doesn't bind this repository.
- **Answered:** no (a reversible call). **Landed in:** M0.

## D2 · 2026-10-17 · A canvas 10-foot UI instead of E.Shell and the HTML standard menus
- **Principle:** standard features ("don't build your own").
- **Call:** `new E.Game({ menu: false, corner: false })`. MOTOR draws its own pause, settings, controls and HUD on a
  canvas UI layer at integer scales. `game.settings` and the engine's input APIs stay underneath.
- **Why:** E.Shell's CSS is fixed at 11-14 px with no UI scale (`ENG:7412-7444`), so it isn't readable at 10 ft. The
  canvas font has no ✕ ○ □ △.
- **Answered:** no. **Landed in:** M0, with the UI itself in M9. This is also engine feedback.

## D3 · 2026-10-17 · Model identifiers stay out of repository files
- **Principle:** an environment rule. Model identifiers belong in chat replies, not in pushed files.
- **Call:** the Source Information in `README.md`, `src/about.js` and the built HTML gives the AI lab and the effort
  level. Each run's chat report names the exact model.
- **Answered:** the brief asked for the model in the README and the HTML; this rule takes precedence, and the owner can
  add the line by hand. **Landed in:** planning, then M0.

## D4 · 2026-10-17 · "Side Scroll mode 7" is the engine's side scrolling with depth
- **Principle:** reading the brief.
- **Call:** the third view is my-3D2dge's own *Side scrolling with depth (Mode 7)* (`src/labs.json:37`,
  `src/stress.game.js:615-844`), generalized for a city as SIDE7. A free-turning chase camera is in the backlog.
- **Answered:** no. The owner was told and can override before or during the run. **Landed in:** PLAN.md v1.1.

## D5 · 2026-10-17 · Implementation started inside the planning session
- **Principle:** process.
- **Call:** this session's `/goal` stop hook judged the brief's "Done" clause, the full build, and kept blocking the
  session from ending once planning was done.
- **What happened instead:** rather than idle in a loop, the run started M0 at once and goes milestone by milestone,
  committing and pushing as it goes.
- **Resuming:** a later `/clear` plus the `GOAL.md` run resumes from `PROGRESS.md`.
- **Answered:** no. The owner was told and can stop the run at any time with `/goal clear`. **Landed in:** M0.

## D6 · 2026-10-17 · Playwright pinned to 1.56.1
- **Principle:** pin what agents know.
- **Call:** `playwright@1.56.1` is the release built for Chromium build 1194, the one `/opt/pw-browsers` ships. The
  engine repo's `^1.56.0` resolves to 1.64.1, which expects Chromium 156.
- **Answered:** no. **Landed in:** M0.

## D7 · 2026-10-17 · The M0 hello block draws its floor with `TileMap.drawFloor`
- **Principle:** PLAN.md section 8.4 ("never call `drawFloor` on the city map").
- **Call:** the 32×32 test block is small enough for the engine's whole-map bake. The chunked floor replaces it for
  Lowtown in M2.
- **Answered:** no. **Landed in:** M0.
