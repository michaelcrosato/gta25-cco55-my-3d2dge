// The attract mode (PLAN.md 8.20, 9.11): after TUNE.attractIdle seconds without input on the title or a menu opened from
// it (and at once on a kiosk), the game plays itself. Each reel in a fresh Lowtown: the play scene in its demo mode (the
// attract seed plus the reel's count, its own state objects, a blank save never written, no stats or records kept), the
// rumble off, sound only if the browser already let it play. MOTOR's Director runs the show: the five reels
// (src/game/reels/) played by the mission bot, a card every two or three (the title card, HOW TO PLAY, LOWTOWN'S MOST
// WANTED: src/game/ui/attract-cards.js), the camera plan and its captions, the watchdog. Over it: the logo's bug with
// its DEMO badge, PRESS ANY BUTTON blinking.
//   Out: any input from any device (a key, bound or not; the mouse moved, a click, the wheel; a pad's button, stick or
// trigger) is consumed, and the title follows in the same step (a .15 s fade); what woke it does nothing there, and
// the title's idle clock starts again. On a kiosk (?kiosk=1, or a phone or tablet: a coarse pointer and nothing else) a
// tap stays in the demo: the menu button (top right) opens a small overlay (sound, volume, the view, About), anywhere
// else says BEST WITH A CONTROLLER (at most every TUNE.attractTapNote s); a key or a controller (pressed, or newly
// connected) opens the title and normal play. #attract starts here; #attract/<reel> plays that one reel over and over
// (no cards: the reels' tests and tools/record-attract.mjs).
import { E, def, all, expose, TUNE, knob, RNG, Director, wokeBy, List, UI, settingRows, hudLayout } from '../../motor/index.js';
import { PLAY } from './play.js';
import { drawCard } from '../ui/attract-cards.js';
import { creditsScreen } from '../ui/credits.js';
import { makeSaves } from '../save.js';

knob('Attract', 'attractSeed', 'The demo\'s first seed', 2600, 1, 999999, 1, 'The first reel\'s world (each after it: plus one; ?seed= gives another)');
knob('Attract', 'attractTapNote', 'A kiosk\'s note at most every', 30, 5, 120, 1, 'Seconds between BEST WITH A CONTROLLER notes when the screen is tapped');
const CARDS = ['title', 'howto', 'wanted'], FADE = .35, VIEWS = [['auto', 'THE SHOW\'S'], ['iso', 'ISO'], ['top', 'TOP'], ['side7', 'MODE 7']];

def('scenes', 'attract', {
  make(app) {
    const { game, activity, links, views } = app, U = app.ui.screens, L = app.ui.layer;
    let seed = 1, D = null, t = 0, t0 = 0, pads0 = 0, rumble = .6, leaving = null, built = false, card = null, fade = 0;
    let note = null, noteT = -1e9, viewStyle = 'auto', records = [];
    const play = PLAY.make(app, { seed: () => seed });
    const host = {
      startReel(id, s) {
        seed = s; if (built) play.exit();
        play.enter({}); built = true; card = null; fade = FADE; exposeAll();
        if (viewStyle !== 'auto') game.setView(viewStyle);
        play.career.startReel(id);
      },
      stopReel() { if (built && play.career) play.career.stopReel(); },
      card(id) { card = id; if (id === 'wanted') records = mostWanted(); },
      runtime: () => play.career.R,
      focus: () => play.focus(),
      view: v => { if (viewStyle === 'auto' && game.views.includes(v)) game.setView(v); },
      viewNow: () => views.active,
      inside: () => play.inside(),
      stars: () => play.stars(),
    };
    // the local records: each save slot's completion and cash (its label, or its slot)
    function mostWanted() {
      try { return makeSaves().list().map(r => ({ name: (r.label || (r.slot === 'auto' ? 'AUTOSAVE' : 'SLOT ' + r.slot)).toUpperCase().slice(0, 18), completion: r.completion || 0, cash: r.cash || 0 })); } catch { return []; }
    }
    // the kiosk's overlay: sound, volume, the view, About (over the demo, which goes on)
    function kioskMenu() {
      const list = new List({ id: 'kiosk', items: [...settingRows(game, ['sound', 'volume']),
        { kind: 'choice', key: 'view', label: 'VIEW', help: 'The show\'s camera, or one view throughout', get: () => viewStyle, set: v => { viewStyle = v; if (v !== 'auto') game.setView(v); }, options: VIEWS },
        { label: 'ABOUT', help: 'The game, its engine and its sources', act: () => U.open(creditsScreen()) },
        { label: 'BACK TO THE DEMO', act: () => U.back() }] });
      return { id: 'kiosk', title: 'MENU', w: 260, list, tips: true, legend: 'TAP A ROW  •  A CONTROLLER PLAYS' };
    }
    // the kiosk's menu button, top right in the margin over the safe area (the HUD's weapon below it): [x, y, w, h] in
    // UI pixels (its hit box a little larger)
    function menuRect() { const w = E.font.width('MENU') + 18, s = L.safe; return [L.W - s[0] - w, Math.max(2, s[1] - 15), w, 13]; }
    function leave(by) { leaving = by; U.closeAll(); game.input.consumeAll(); game.go('title', null, { fade: .15 }); }
    function exposeAll() {
      expose('snapshot', () => ({ scene: 'attract', t: +t.toFixed(2), kiosk: !!app.kiosk, leaving, card, reel: D && D.now && D.now.kind === 'reel' ? D.now.id : null, seed, view: views.active,
        stage: built && play.career && play.career.R.stage ? play.career.R.stage.id : null, caption: D && D.caption ? D.caption.text : null, note: note ? note.text : null, menu: U.top ? U.top.id : null }));
      expose('director', D); expose('kioskButton', menuRect);
    }
    return {
      view: 'iso',
      get pausable() { return false; },   // (never paused: any input leaves it)
      enter(data) {
        const only = data && data.route && data.route[0] === 'attract' ? data.route[1] : null;
        t = 0; leaving = null; built = false; card = null; fade = 0; note = null; noteT = -1e9; viewStyle = 'auto'; records = [];
        activity.reset(); t0 = game.input.clock; pads0 = null;   // (the pads counted at the first step: the engine polls them in its tick)
        rumble = game.input.rumbleScale; game.input.rumbleScale = 0;   // (the rumble off)
        seed = links.query.get('seed') ? app.seed : TUNE.attractSeed;
        D = new Director({ reels: only ? [only] : all('reels').map(r => r.id), cards: only ? [] : CARDS, seed, host });
        exposeAll();
      },
      exit() {
        if (built) play.exit(); built = false;
        if (D) { D.dispose(); D = null; }
        game.input.rumbleScale = rumble; game.timeScale = 1;
        RNG.seed(app.seed);   // (the streams as a boot leaves them: the demo's draws never shape a game)
      },
      update(dt) {
        t += dt; if (leaving) return;
        if (pads0 === null) pads0 = game.input.raw ? game.input.raw.pads.length : 0;
        const by = wokeBy(game.input, t0, pads0);
        if (by && (!app.kiosk || by === 'key' || by === 'pad')) { leave(by); return; }   // (a kiosk's taps stay in the demo)
        if (app.kiosk && !app.ui.took) {
          const p = L.poll(), b = menuRect();
          if (p.click && p.x !== null) {
            if (p.x >= b[0] - 4 && p.x <= b[0] + b[2] + 4 && p.y >= b[1] - 4 && p.y <= b[1] + b[3] + 4) U.open(kioskMenu());
            else if (t - noteT >= TUNE.attractTapNote) { note = { text: 'BEST WITH A CONTROLLER', t: 0 }; noteT = t; }
          }
        }
        if (note) { note.t += dt; if (note.t > 3) note = null; }
        if (fade > 0) fade = Math.max(0, fade - dt);
        D.update(dt);
        if (built && !card) play.update(dt);   // (a card holds the city still under it)
      },
      draw(r) { if (built) play.draw(r); },
      hud(P) {
        if (built && !card) play.hud(P);
        if (card) drawCard(P, card, { app, records });
        const cx = Math.round(P.W / 2), x0 = P.safe[0], y0 = P.safe[1], y1 = P.safe[3], g = P.g;
        if (fade > 0) P.fill(0, 0, P.W, P.H, '#05030c', fade / FADE);
        // the bug: the logo small and the DEMO badge, top left where the HUD's place and time would be (a card has its own)
        if (!card) {
          const tw = P.width('GRAND THEFT MOTO'), bw = tw + 44;
          P.fill(x0 - 3, y0 - 3, bw, 14, '#05030c', .6);
          P.text('GRAND THEFT MOTO', x0, y0, '#ffe066'); P.fill(x0 + tw + 6, y0 - 2, 31, 12, '#ff3a30'); P.text('DEMO', x0 + tw + 22, y0, '#ffffff', { align: 'center' });
        }
        // the caption: a reel's title (and what it shows), then each stage's
        const C = D && D.caption;
        if (C && !card) {   // (on a band of its own: over a lit sign it had blurred into the scene)
          const a = Math.min(1, C.t * 3, Math.max(0, (C.title ? 3.2 : 3.6) - C.t) * 2), y = Math.round(P.H * .3), sc = C.title ? 3 : 2, sub = C.sub ? C.sub.toUpperCase() : '';
          if (a > 0) {
            const w = Math.max(P.width(C.text, sc), sub ? P.width(sub) : 0) + 20, h = 7 * sc + (sub ? 20 : 0) + 10;
            P.fill(cx - w / 2, y - 5, w, h, '#05030c', .55 * a);
            g.globalAlpha = a; P.text(C.text, cx, y, C.title ? '#ffe066' : UI.ink, { align: 'center', scale: sc }); if (sub) P.text(sub, cx, y + 7 * sc + 6, UI.dim, { align: 'center' }); g.globalAlpha = 1;
          }
        }
        // PRESS ANY BUTTON at the foot of the screen, between the HUD's bars and a car's panel; on one too narrow for
        // it there (a phone held upright), over the radar instead
        const press = app.kiosk ? 'PRESS ANY BUTTON ON A CONTROLLER' : 'PRESS ANY BUTTON', H = hudLayout(P), half = P.width(press) / 2;
        const py = cx - half >= H.sx0 + 100 && cx + half <= H.sx1 - 152 ? y1 - 10 : H.radar[1] - H.R - 16;
        if (Math.floor(t * 1.4) % 2 === 0) P.text(press, cx, py, '#ffffff', { align: 'center' });
        if (note) P.text(note.text, cx, py - 16, UI.cyan, { align: 'center' });
        if (app.kiosk) {   // (the menu button, top right)
          const [x, y, w, h] = menuRect();
          P.fill(x, y, w, h, '#1c1a34', .9); P.fill(x + 3, y + 3, 7, 1, UI.ink); P.fill(x + 3, y + 6, 7, 1, UI.ink); P.fill(x + 3, y + 9, 7, 1, UI.ink); P.text('MENU', x + 13, y + 3, UI.ink);
        }
      },
    };
  },
});
