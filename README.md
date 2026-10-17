# GRAND THEFT MOTO

**ID `GrandTheftMoto-5S`** · *If it has a motor, it's yours.*

Grand Theft Moto is an original spiritual successor to *Grand Theft Auto 2* (PC), with *Grand Theft Auto V*-depth
systems, in the my-3D2dge 2D pixel style.

The vertical slice is one district, **Lowtown**, plus an enterable bank. It has three views:
- **ISOMETRIC** (primary);
- **TOP-DOWN**: GTA2's perspective lean, and a camera that climbs with speed;
- **SIDE-SCROLL MODE 7**: the engine's side scrolling with depth, a perspective rail camera that follows you sideways
  while the avenues recede into the distance.

It also includes:
- three switchable protagonists;
- three gangs whose respect you win and lose;
- police you can search out of and evade;
- a heist with LOUD and QUIET approaches;
- a radio dial, a phone, shops and properties;
- a controller-first 10-foot UI;
- an attract mode that plays the game by itself.

Under it sits **MOTOR**, an open-city engine layer on top of my-3D2dge, built to carry the full game.

> **Status: implementation in progress (M4 of M13 done: the core and input, the three views' renderers, Lowtown,
> on foot and combat, and the vehicles: 13 models, 19 definitions).** `PROGRESS.md` has each milestone's evidence.
> `PLAN.md` is the full plan, `GOAL.md` is the `/goal` prompt that started the run, and `docs/HANDOFF.md` is where the
> next session picks it up (M5).

## Source Information

| Item | Value |
|---|---|
| **Initial Date** | 2026-10-17 (UTC): the first prompt of the planning session. The repository was created on 2026-10-16 at 19:29 UTC-7. |
| **SOURCE** | *Grand Theft Auto 2* (PC, 1999; DMA Design / Rockstar Games), with depth, features and gameplay drawn from *Grand Theft Auto V* (2013; Rockstar North). In the my-3D2dge 2D pixel style, with the views isometric (primary), top-down (secondary), and the engine's side scrolling with depth (Mode 7). |
| **GAME ENGINE** | **my-3D2dge v0.46.1**, commit `cfa866a` (`cfa866aa45474868350cad1a7fc015e612f9305f`, 2026-10-15), <https://github.com/michaelcrosato/my-3d2dge> (MIT). It is vendored at `vendor/my-3d2dge/` and extended by MOTOR (`src/motor/`). |
| **Environment** | Claude Code (container build 2.1.302) in Anthropic's managed cloud environment: a claude.ai/code remote session, started from the Claude desktop app. Linux: Ubuntu 24.04.5 LTS, x86_64. Node.js 22.22.0. Headless Chromium 141 (Playwright build 1194) for tests. The game targets desktop browsers and runs from one HTML file. |
| **Model and Effort Level** | AI lab: **Anthropic**. *Planning* effort: **max**, confirmed from the session's metadata. *Implementation* effort: recommended **xhigh** with `ultracode` (`PLAN.md` section 16); the owner ran M0-M4 at
**max**, with `ultracode`. The exact model is given in each session's chat report: this environment keeps model identifiers out of files pushed to the repository. |

## Game engine analysis

This is kept separate from the Source Information above.
- **Now:** a preliminary analysis, written from planning research, is in `PLAN.md` section 18. It covers what the game
  will use, what it won't use, and the one thing to change.
- **After the build:** the final analysis goes in `docs/ENGINE-ANALYSIS.md`, with a summary here.

## Playing it

- **Play:** open `dist/index.html` in a browser. It is one self-contained file, with no network and no installs.
- **Build:** `npm ci` (Node 22 or later), then `npm run build`.
- **Develop:** `npm run dev` serves it on `localhost:5173` and rebuilds on every change.
- **Test:** `npm test` (the fast gate) or `npm run test:full`. In a Claude Code cloud session the SessionStart hook
  installs everything; elsewhere, run `npx playwright install chromium` once.
- **Deep links:** `#title`, `#play` (or `#play/<spawn>`, such as `#play/precinct`), `#attract`; the Proving Ground's
  `#proving/scale` (a 160×160 city), `#proving/views` (the view lab), `#proving/pad` (the handling track),
  `#proving/range` (the combat range) and `#proving/garage` (every vehicle, with its handling bench). Options:
  `?view=iso|top|side7`, `?time=day|dusk|night`, `?weather=`, `?seed=`, `?mode=walk|auto`, `?wet=1`, `?zoom=.65`,
  `?record=1`, `?perf=1`, `?selftest=1`; in the garage `?only=<ids>`, `?night=1`, `?siren=1`, `?bench=1`. More arrive
  with each milestone.
- **Views:** R3 (keyboard `V`) cycles ISO → TOP-DOWN → MODE 7.

The controls are in `PLAN.md` section 11. A PS5 DualSense is the primary controller; keyboard and mouse map onto the
same model.

## Repository

| Path | What it is |
|---|---|
| `PLAN.md` | the master plan: vision, perspectives, architecture, systems, content, milestones, verification, the Definition of Done, the execution recommendation, the preliminary engine analysis, and the 50 candidate titles |
| `GOAL.md` | the `/goal` prompt for the implementation run |
| `PROGRESS.md` | milestone status and evidence |
| `src/motor/`, `src/game/`, `src/main.js` | MOTOR (the engine layer) and the game's content |
| `vendor/my-3d2dge/` | the pinned engine, its tools and docs (`VERSION.json`, `PATCHES.md`) |
| `tools/`, `tests/` | build, dev server, the checks, and the test suites |
| `docs/` | `ARCHITECTURE.md`, `DECISIONS.md`, `CONTENT-GUIDE.md`, `HANDOFF.md` (where the next session starts), `media/` (each milestone's evidence), and later the engine analysis |
