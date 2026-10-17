# The /goal prompt for GRAND THEFT MOTO (GrandTheftMoto-5S)

To start the run:
1. Set the effort to **xhigh**.
2. Run `/clear`.
3. Paste the block below.

The prompt contains `ultracode`, which allows bounded workflows at the points that `PLAN.md` section 16 names. Delete
that word if you want the run to stay single-agent.

The block is 3,389 characters, all plain ASCII. If you edit it, keep it under the 4,000-character limit for `/goal`.

```
/goal Build GRAND THEFT MOTO (ID GrandTheftMoto-5S) in this repo (michaelcrosato/gta25-cco55-my-3d2dge, branch claude/compassionate-shannon-h7k7zk) exactly as PLAN.md specifies. Read PLAN.md fully first: it is the contract. ultracode: run bounded workflows (max 10 agents, never two on one file) only at the fan-out points in PLAN.md section 16.

The game: an original spiritual successor to Grand Theft Auto 2 (PC) with GTA V depth, in the my-3D2dge 2D pixel style, with three views: ISOMETRIC (primary), TOP-DOWN (GTA2 perspective lean, speed climb) and MODE 7 street-level chase, plus side-scroll interiors. The slice is one polished district, Lowtown. The MOTOR engine layer under it must carry the full game, so growing it means adding content, not architecture. A developer Proving Ground exercises every system.

Rules:
- Vendor my-3D2dge v0.46.1 @ cfa866a (github.com/michaelcrosato/my-3d2dge; clone if absent) into vendor/my-3d2dge. Patch it only per PLAN.md section 12 (GTM-PATCH markers, PATCHES.md, tests). MOTOR goes in src/motor, content in src/game.
- No runtime dependencies, no network, no binary assets: everything is drawn and synthesized by code. The simulation is deterministic and headless-testable (fixed step, named RNG streams, no wall clock).
- A controller-first 10-foot UI for a PS5 DualSense (code-drawn PlayStation glyphs, analog triggers, rumble). Keyboard and mouse map onto the same model. No dense web-style screens. No touch controls: phones run kiosk/attract mode with only a menu button.
- Attract mode: after 10 s without input on the title, the AI plays showcase reels indefinitely. Any input from any device returns to the title at once. The demo never saves.
- Install whatever tools you need (PLAN.md section 6).

Process: work milestone by milestone (M0-M13). Keep PROGRESS.md current with evidence (tests, screenshots, perf numbers, commits). Commit after each green step, push at least once per milestone, and keep the draft PR's CI green. Log every deviation and scope change in docs/DECISIONS.md; never cut scope silently. Read your own screenshots and filmstrips, and fix every look note.

Done only when every item of PLAN.md section 15 holds, including:
- npm test and npm run test:full pass, and CI is green;
- dist/index.html is one self-contained file that plays the whole slice from file://;
- all 14 missions, the side content, shops and properties work, and a headless bot campaign reaches 100% completion;
- ISO, TOP-DOWN, MODE 7 and the interiors work, and switching views never changes the simulation hash;
- the attract soak (30 virtual minutes x 3 seeds) and the exit-on-any-input matrix pass;
- the 10-foot UI audit and the controller-only, keyboard-only and mouse-only passes succeed;
- the determinism, replay and performance budgets pass;
- content-recipe tests prove every content type can be added from docs/CONTENT-GUIDE.md alone;
- README.md, the Credits & About screen and the HTML header carry the Source Information;
- docs/ENGINE-ANALYSIS.md is final.

End with a chat report:
1. Source Information: Initial Date, SOURCE, GAME ENGINE (version, commit, URL), Environment (CLI/app or cloud, OS, browser), Model and Effort Level (lab, model, effort; only what you can confirm).
2. Separately, the Game Engine Analysis: what you used, what you didn't, and the one thing you would change.
3. How to play, and the PR link.
```
