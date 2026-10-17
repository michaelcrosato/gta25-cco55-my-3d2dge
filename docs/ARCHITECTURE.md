# Architecture: MOTOR on my-3D2dge

This is the living architecture document. `PLAN.md` sections 7-8 are the design. This file records what is built and
the **frozen contracts**, which are frozen in M1.

## Layers

```
src/game     content (maps, scenes, vehicles, missions...): data and scripts. Imports only src/motor/index.js.
src/motor    MOTOR: generic open-city systems over my-3D2dge's public API (plus the patches in vendor/my-3d2dge/PATCHES.md).
vendor/      my-3D2dge v0.46.1 @ cfa866a, vendored with checksums (VERSION.json); patched minimally.
src/about.js the Source Information and the engine summary: one source for the page header and Credits & About.
```

`tools/boundary-check.mjs` enforces the layers.

## Build

`tools/build.mjs`:
1. bundles `src/main.js`, plus every `src/game/**/*.js` (found at build time and sorted), into one IIFE with esbuild;
2. inlines the engine and the bundle into `src/index.template.html`;
3. writes `dist/index.html`.

A rebuild of an unchanged tree is byte-identical: the build checks this, and so does `tests/unit/build.test.mjs`.

## Running

- **Browser:** the page's first script is the engine, which defines `My3D2dge`; the second is the bundle.
- **Headless:** `tests/harness.mjs` runs the same two scripts in one `node:vm` context, with no DOM.
- **Options:** `globalThis.__GTM_OPTIONS__ = { hash, query }` stands in for the page's `#hash` and `?query`.

## What is built (updated per milestone)

| Piece | Where | Since |
|---|---|---|
| Engine handle | `src/motor/engine.js` | M0 |
| Registries (`def` / `get` / `all` / `declare`) | `src/motor/core/registry.js` | M0 (schemas: M1) |
| Deep links | `src/motor/debug/deeplinks.js` | M0 |
| Console handle `__gtm` and `game.debug.snapshot` | `src/motor/debug/handle.js` | M0 |
| View manager (wraps `setView`; `game.views`) | `src/motor/render/view-manager.js` | M0 |

## Frozen contracts (M1)

To be written in M1:
- Intent;
- Projector;
- the registry schemas;
- the BUS catalogue;
- the staged mission API and hint data.
