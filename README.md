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

> **Status: planning complete. Implementation has not started.** `PLAN.md` is the full plan and `GOAL.md` is the
> `/goal` prompt that runs it.

## Source Information

| Item | Value |
|---|---|
| **Initial Date** | 2026-10-17 (UTC): the first prompt of the planning session. The repository was created on 2026-10-16 at 19:29 UTC-7. |
| **SOURCE** | *Grand Theft Auto 2* (PC, 1999; DMA Design / Rockstar Games), with depth, features and gameplay drawn from *Grand Theft Auto V* (2013; Rockstar North). In the my-3D2dge 2D pixel style, with the views isometric (primary), top-down (secondary), and the engine's side scrolling with depth (Mode 7). |
| **GAME ENGINE** | **my-3D2dge v0.46.1**, commit `cfa866a` (`cfa866aa45474868350cad1a7fc015e612f9305f`, 2026-10-15), <https://github.com/michaelcrosato/my-3d2dge> (MIT). It will be vendored at `vendor/my-3d2dge/` and extended by MOTOR (`src/motor/`). |
| **Environment** | Claude Code (container build 2.1.302) in Anthropic's managed cloud environment: a claude.ai/code remote session, started from the Claude desktop app. Linux: Ubuntu 24.04.5 LTS, x86_64. Node.js 22.22.0. Headless Chromium 141 (Playwright build 1194) for tests. The game targets desktop browsers and runs from one HTML file. |
| **Model and Effort Level** | AI lab: **Anthropic**. *Planning* effort: **max**, confirmed from the session's metadata. *Implementation* effort: recommended **xhigh** with `ultracode` (`PLAN.md` section 16). The exact model is given in each session's chat report: this environment keeps model identifiers out of files pushed to the repository. |

## Game engine analysis

This is kept separate from the Source Information above.
- **Now:** a preliminary analysis, written from planning research, is in `PLAN.md` section 18. It covers what the game
  will use, what it won't use, and the one thing to change.
- **After the build:** the final analysis goes in `docs/ENGINE-ANALYSIS.md`, with a summary here.

## Playing it

Available once milestone M0 lands.

- **Build:** `npm ci`, then `npm run build`.
- **Play:** open `dist/index.html` (one self-contained file, no network).
- **Develop:** `npm run dev`.
- **Test:** `npm test` (fast) or `npm run test:full`.

The controls are in `PLAN.md` section 11. A PS5 DualSense is the primary controller; keyboard and mouse map onto the
same model.

## Repository

| Path | What it is |
|---|---|
| `PLAN.md` | the master plan: vision, perspectives, architecture, systems, content, milestones, verification, the Definition of Done, the execution recommendation, the preliminary engine analysis, and the 50 candidate titles |
| `GOAL.md` | the `/goal` prompt for the implementation run |
| `PROGRESS.md`, `src/`, `vendor/`, `tools/`, `tests/`, `docs/` | created from milestone M0 on (see `PLAN.md` section 6.2) |
