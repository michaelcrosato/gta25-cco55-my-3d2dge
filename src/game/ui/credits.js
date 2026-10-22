// Credits & About (PLAN.md 8.18): the Source Information block, then, apart, the engine analysis in brief, then the
// engine's credit with its MIT notice, then the game's own. One source for these words: src/about.js (the page's header
// comment and README.md carry the same).
import { docScreen } from '../../motor/index.js';
import { SOURCE_INFO, ENGINE_SUMMARY, ENGINE_CREDIT, GAME_CREDIT, GAME } from '../../about.js';

export function creditsScreen(o = {}) {
  return docScreen({ id: 'credits', title: 'CREDITS & ABOUT', full: !!o.full, tapBack: o.tapBack, sections: [
    { title: 'Source Information', rows: SOURCE_INFO },
    { title: 'Game Engine Analysis', lines: ENGINE_SUMMARY },
    { title: 'The engine', lines: ENGINE_CREDIT },
    { title: GAME.title, lines: GAME_CREDIT },
  ] });
}
