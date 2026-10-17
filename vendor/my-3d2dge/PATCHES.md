# Patches to the vendored my-3D2dge

The engine here is my-3D2dge v0.46.1 @ `cfa866aa45474868350cad1a7fc015e612f9305f` (see `VERSION.json`).

**Policy** (PLAN.md section 12):
- Extend first.
- Patch only where an extension would have to reach into private state.
- Mark each patch `// GTM-PATCH(n): <why>` in the code, and test it in `tests/unit/engine-patches.test.js`.
- Each patch is written so it could be offered upstream. Record it here and in `PATCHES.json`; `tools/vendor-check.mjs`
  checks both.

| # | File | What | Why | Test | Upstream issue text |
|---|---|---|---|---|---|

None yet. GTM-PATCHes 1-5 land in M1 and M10 (PLAN.md section 12).
