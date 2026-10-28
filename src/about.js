// The Source Information block and the engine-analysis summary: one source for the built page's header comment, the
// in-game Credits & About screen and the docs. Plain data with no imports, so tools/build.mjs can read it in Node.
// Model identifiers stay out of repository files (an environment rule); each run's chat report names the model.

/** [label, value] rows, in the order the brief lists them */
export const SOURCE_INFO = [
  ['Initial Date', '2026-10-17 (UTC): the first prompt of the planning session'],
  ['SOURCE', 'Grand Theft Auto 2 (PC, 1999; DMA Design / Rockstar Games), with depth, features and gameplay drawn from Grand Theft Auto V (2013; Rockstar North); my-3D2dge 2D pixel style; views isometric (primary), top-down (secondary) and side scrolling with depth (Mode 7)'],
  ['GAME ENGINE', 'my-3D2dge v0.46.1, commit cfa866aa45474868350cad1a7fc015e612f9305f (2026-10-15), https://github.com/michaelcrosato/my-3d2dge (MIT), vendored and extended by MOTOR'],
  ['Environment', 'Claude Code (2.1.302 when the run began, 2.1.309 at the slice\'s end, 2.1.311 at L1-L8\'s) in Anthropic\'s managed cloud environment (claude.ai/code remote sessions, started from the Claude desktop app); Linux (Ubuntu 24.04.5 LTS, x86_64); Node.js 22.22.0; headless Chromium (Playwright 1.56.1) for the tests: 141 for the slice, 153 from L1 on; Electron 44.7.0 for the desktop wrapper, run and packed by CI; the game targets desktop browsers'],
  ['Model and Effort Level', 'AI lab: Anthropic. Effort: max, for the planning and every implementation session of the slice (M0-M13), with ultracode for the fan-outs; xhigh for the run after it (L1-L8, one session), confirmed from its metadata. The exact model is named in each session\'s chat report (this environment keeps model identifiers out of repository files)'],
];

/** the engine analysis in a few lines (docs/ENGINE-ANALYSIS.md has it all); kept separate from SOURCE_INFO */
export const ENGINE_SUMMARY = [
  'Used: the exact fixed-step loop and headless stepping (every test runs the real game in Node); scenes and fades; the pixel primitives, colours, textures and font; TileMap for the buildings; the depth-sorted renderer and the iso view; canvas lighting; particles; Humanoid rigs with mocap, Mover and ACTIONS; sees, hears and Suspicion; Bullets, Attack and Combo; the input with DualSense detection and rumble; ChipAudio; store and settings; the session recorder and the checker. The stress test\'s side scrolling with depth became MODE 7, and the shooter kit\'s one-point lean became TOP-DOWN.',
  'Not used: the agent edition, the 3D engine, the platformer kit, the whole-map floor bake, E.Shell and the HTML menus (not readable at 10 feet), the orthographic top-down view, circle bodies for cars, music() for the radio, GPU lighting. Seven patches, each recorded with its upstream issue text.',
  'One change: make the world scale - a chunked, streamed TileMap (floors baked per chunk on demand, walls found within the view, bounded caches, solids indexed by place, cells with space under bridges). Four of the seven patches exist only because the map is a city.',
];

/** the engine's credit and its licence, as the Credits & About screen shows them */
export const ENGINE_CREDIT = [
  'my-3D2dge v0.46.1 by Michael Crosato: https://github.com/michaelcrosato/my-3d2dge. Vendored in vendor/my-3d2dge, patched only where vendor/my-3d2dge/PATCHES.md says, and extended by MOTOR, this game\'s own layer.',
  'MIT License. Copyright (c) 2026 Michael Crosato.',
  'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:',
  'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
];
/** the game's own credit */
export const GAME_CREDIT = [
  'An original game in the spirit of Grand Theft Auto 2, with depth drawn from Grand Theft Auto V. Lowtown, Ironside and Glass Heights, their people, their gangs, the vehicles, the radio and every line are made up for it: no names, logos, music or text from those games.',
  'Every picture and sound is drawn and played by code at run time: no image or audio files.',
];

/** the game's identity */
export const GAME = { title: 'GRAND THEFT MOTO', id: 'GrandTheftMoto-5S', tagline: 'If it has a motor, it\'s yours.' };
