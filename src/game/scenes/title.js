// The title screen: the logo over the city at night, PRESS ✕ in the player's own glyphs, and the attract mode after
// TUNE.attractIdle seconds without input from any device (the 10-foot menu arrives in M9).
import { E, def, expose, TUNE, drawPrompt } from '../../motor/index.js';

def('scenes', 'title', {
  make(app) {
    const { game, bindings, activity } = app;
    let t = 0, bg = null;
    return {
      view: 'iso',
      enter() { t = 0; activity.reset(); bg = new E.Backdrop('city-night'); expose('snapshot', () => ({ scene: 'title', t: +t.toFixed(2), idle: +activity.idle().toFixed(2) })); },
      update(dt) {
        t += dt; bindings.setContext('menu');
        if (bindings.tap('confirm') || bindings.tap('close')) { game.input.consumeAll(); game.go('play'); return; }
        if (activity.idle() >= TUNE.attractIdle) game.go('attract');
      },
      draw(r) {
        bg.draw(r);
        r.overlay(g => {
          const cx = r.W / 2, y = Math.round(r.H * .26);
          E.font.title(g, 'GRAND THEFT', cx, y, { scale: 2, colors: ['#f4f0ff', '#b8b0d8'], align: 'center' });
          E.font.title(g, 'MOTO', cx, y + 22, { scale: 5, colors: ['#ffe066', '#ff7a2a', '#d0306a'], align: 'center', depth: 3, depthColor: '#2a0a2a' });
          E.font.text(g, 'IF IT HAS A MOTOR, IT\'S YOURS.', cx, y + 74, '#c8c0e8', { align: 'center', shadow: '#000' });
          if ((t * 1.6 | 0) % 2 === 0) drawPrompt(g, 'PRESS {menu:confirm}', cx, Math.round(r.H * .74), bindings, game.input, { align: 'center' });
          E.font.text(g, E.versionLabel().replace(' · ', ' • ') + '  •  MOTOR', 6, r.H - 11, '#7a7298', { shadow: '#000' });
        });
      },
    };
  },
});
