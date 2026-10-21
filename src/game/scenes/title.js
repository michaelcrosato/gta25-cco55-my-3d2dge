// The title screen (PLAN.md 8.18): the GRAND THEFT MOTO logo over a live, slow fly-over of Lowtown at night (the play
// scene's own city, built once a seed, the camera riding the district's tour at a stroll), and the menu: CONTINUE (the
// newest save), NEW GAME (the prologue), LOAD (the slots), SETTINGS, EXTRAS (the Proving Ground, Credits & About, the
// field guide). The attract mode follows TUNE.attractIdle seconds without input from any device, on the title or any
// menu opened from it (not while a rebind waits for its button).
import { E, def, expose, TUNE, FloorChunks, WorldClock, Weather, skyAt, List, UI, settingsScreen, slotsScreen, guideScreen, compose } from '../../motor/index.js';
import { makeSaves } from '../save.js';
import { lowtown, citySeed } from './lowtown.js';
import { creditsScreen } from '../ui/credits.js';
import { GUIDE } from '../ui/guide.js';
import { GAME } from '../../about.js';

const FLY = 70;   // (the fly-over's speed, u/s: a stroll down the avenues)
let THEME = null;   // (the title's tune: the engine's music(), the one thing it still serves, PLAN.md 8.17; NEON DRIVE's genre)
// the logo from the safe area's top down (MOTO a size smaller on a short screen), the line under it, and where the
// menu starts below them
function logo(P, top = P.safe[1] + 4) {
  const y = top, moto = P.H >= 260 ? 5 : 4, motoY = y + 22, tagY = motoY + 7 * moto + 12;
  return { y, moto, motoY, tagY, menu: tagY + 18 };
}
/** the logo, GRAND THEFT over MOTO and the line under it, from y = top (the title's; the attract mode's title card) */
export function drawLogo(P, top) {
  const cx = P.W / 2, Lg = logo(P, top);
  P.title('GRAND THEFT', cx, Lg.y, { scale: 2, colors: ['#f4f0ff', '#b8b0d8'], align: 'center' });
  P.title('MOTO', cx, Lg.motoY, { scale: Lg.moto, colors: ['#ffe066', '#ff7a2a', '#d0306a'], align: 'center', depth: 3, depthColor: '#2a0a2a' });
  P.text(GAME.tagline.toUpperCase(), cx, Lg.tagY, UI.dim, { align: 'center' });
  return Lg;
}

def('scenes', 'title', {
  make(app) {
    const { game, activity, stage, links } = app, U = app.ui.screens;
    let t = 0, city = null, cityR = null, clock = null, weather = null, fly = null, menu = null;
    const saves = makeSaves(), latest = () => saves.list().sort((a, b) => b.savedAt - a.savedAt)[0] || null;
    const play = data => { U.closeAll(); game.input.consumeAll(); game.go('play', data); };
    function extras() {
      const list = new List({ id: 'extras', items: [
        { label: 'PROVING GROUND', act: () => { U.closeAll(); game.go('proving'); } },
        { label: 'CREDITS & ABOUT', act: () => U.open(creditsScreen()) },
        { label: 'HOW TO PLAY', act: () => U.open(guideScreen(app, { id: 'help', title: 'HOW TO PLAY', topics: GUIDE })) },
      ] });
      return { id: 'extras', title: 'EXTRAS', w: 240, list };
    }
    function titleMenu() {
      const items = () => {
        const last = latest();
        return [
          { label: 'CONTINUE', sub: last ? (last.slot === 'auto' ? 'AUTOSAVE' : 'SLOT ' + last.slot) : 'NO SAVE YET', disabled: !last, act: () => play({ load: last.slot }) },
          { label: 'NEW GAME', act: () => play({ newGame: true }) },
          { label: 'LOAD', disabled: !last, act: () => U.open(slotsScreen(app, { mode: 'load', saves, onLoad: slot => play({ load: slot }) })) },
          { label: 'SETTINGS', act: () => U.open(settingsScreen(app)) },
          { label: 'EXTRAS', act: () => U.open(extras()) },
        ];
      };
      const list = new List({ id: 'title', items: items(), sel: latest() ? 0 : 1 });
      return { id: 'title', w: 220, list, sticky: true, shade: false, legend: '{menu:confirm} SELECT', top: P => logo(P).menu, back: () => true, enter() { list.set(items()); } };
    }
    return {
      view: 'iso',
      enter() {
        t = 0; activity.reset();
        ({ city, render: cityR } = lowtown(citySeed(links)));
        const map = city.map, floor = new FloorChunks({ w: map.w * map.T, h: map.h * map.T, paint: (g, x0, y0, x1, y1) => city.painter.paint(g, x0, y0, x1, y1) });
        stage.setWorld({ map, city, floor }); game.cam.bounds = v => map.bounds(v);
        clock = new WorldClock('night'); weather = new Weather({ state: 'clear', fixed: true });
        const tour = city.tour.length ? city.tour : [[map.w * map.T / 2, map.h * map.T / 2]];
        fly = { tour, leg: 0, at: [...tour[0]] }; game.focus(fly.at[0], fly.at[1], 16); game.cam.snap = true;
        U.closeAll(); menu = U.open(titleMenu());
        if (!game.headless && game.audio && game.audio.music) game.audio.music(THEME ||= compose('synthwave', 1999, 'title'));   // (heard after the first key or tap: the browser's rule)
        expose('snapshot', () => ({ scene: 'title', t: +t.toFixed(2), idle: +activity.idle().toFixed(2), screen: U.top ? U.top.id : null, item: U.top && U.top.list ? U.top.list.current && U.top.list.current.label : null }));
      },
      exit() { if (game.audio && game.audio.music) game.audio.music(null); },
      update(dt) {
        t += dt;
        if (activity.idle() >= TUNE.attractIdle && !(U.top && U.top.capturing)) { game.go('attract'); return; }   // (a rebind waiting for its button keeps the title)
        // the fly-over: straight legs between the tour's corners (presentation: nothing in it is simulated)
        const A = fly.at, to = fly.tour[(fly.leg + 1) % fly.tour.length], dx = to[0] - A[0], dy = to[1] - A[1], d = Math.hypot(dx, dy), step = FLY * dt;
        if (d <= step) { A[0] = to[0]; A[1] = to[1]; fly.leg = (fly.leg + 1) % fly.tour.length; } else { A[0] += dx / d * step; A[1] += dy / d * step; }
        game.focus(A[0], A[1], 16);
      },
      draw(r) {
        stage.setSky(skyAt(clock.hour, weather));
        stage.begin(r, { focus: [fly.at[0], fly.at[1]], vel: [0, 0], speed01: 0, vehicle: false, player: [fly.at[0], fly.at[1], 0] });
        cityR.queue(stage, fly.at[0], fly.at[1], 520, stage.world.lamps, [fly.at[0], fly.at[1], 0]);
        stage.end();
      },
      // the logo and the line under it while the menu is the screen; the version at the foot
      hud(P) {
        if (U.top !== menu) return;
        const cx = P.W / 2, Lg = logo(P), g = P.g, band = g.createLinearGradient(0, 0, 0, Lg.menu);
        P.shade(.25); band.addColorStop(0, 'rgba(5,3,12,.6)'); band.addColorStop(1, 'rgba(5,3,12,0)'); g.fillStyle = band; g.fillRect(0, 0, P.W, Lg.menu); g._c = null;   // (the city quieter behind the logo)
        drawLogo(P, Lg.y);
        const ver = E.versionLabel().replace(' · ', ' • ');
        if (P.safe[0] + P.width(ver) + 8 < cx - P.width('GRAND THEFT', 2) / 2) P.text(ver, P.safe[0], P.safe[1], UI.mute);   // (where it clears the logo: not at the largest HUD sizes)
      },
    };
  },
});
