// The Source Information block and the engine-analysis summary: one source for the built page's header comment, the
// in-game Credits & About screen and the docs. Plain data with no imports, so tools/build.mjs can read it in Node.
// Model identifiers stay out of repository files (an environment rule); each run's chat report names the model.

/** [label, value] rows, in the order the brief lists them */
export const SOURCE_INFO = [
  ['Initial Date', '2026-10-17 (UTC): the first prompt of the planning session'],
  ['SOURCE', 'Grand Theft Auto 2 (PC, 1999; DMA Design / Rockstar Games), with depth, features and gameplay drawn from Grand Theft Auto V (2013; Rockstar North); my-3D2dge 2D pixel style; views isometric (primary), top-down (secondary) and side scrolling with depth (Mode 7)'],
  ['GAME ENGINE', 'my-3D2dge v0.46.1, commit cfa866aa45474868350cad1a7fc015e612f9305f (2026-10-15), https://github.com/michaelcrosato/my-3d2dge (MIT), vendored and extended by MOTOR'],
  ['Environment', 'Claude Code in Anthropic\'s managed cloud environment (claude.ai/code remote session, started from the Claude desktop app); Linux (Ubuntu 24.04.5 LTS, x86_64); Node.js 22; headless Chromium 141 (Playwright) for tests; the game targets desktop browsers'],
  ['Model and Effort Level', 'AI lab: Anthropic. Planning effort: max. Implementation effort: recorded in each run\'s chat report, which also names the exact model (this environment keeps model identifiers out of repository files)'],
];

/** the engine analysis in a few lines (docs/ENGINE-ANALYSIS.md has it all); kept separate from SOURCE_INFO */
export const ENGINE_SUMMARY = [
  'Used: the fixed-step loop, scenes and boot; the isometric view and TileMap walls, facades and heights; the depth-sorted renderer; Humanoid rigs and mocap; Mover, actions and perception; bullets, particles and lighting; the chip synth; saves and settings; session replay and the check, filmstrip and replay tools; the stress test\'s side scrolling with depth (Mode 7) and the shooter kit\'s one-point lean, generalized by MOTOR.',
  'Not used: the agent edition, the 3D engine, the side-scroller kit, the whole-map floor bake, the HTML menus (not TV-scaled), the orthographic top-down view, circle bodies for cars, music() for the radio.',
  'One change: make the world scale - a chunked, streamed TileMap (floors baked per chunk on demand, walls culled to the view, cells with space under bridges).',
];

/** the game's identity */
export const GAME = { title: 'GRAND THEFT MOTO', id: 'GrandTheftMoto-5S', tagline: 'If it has a motor, it\'s yours.' };
