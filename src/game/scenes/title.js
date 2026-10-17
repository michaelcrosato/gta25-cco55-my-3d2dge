// The title screen (M0: the logo and PRESS START; the 10-foot menu, the idle timer and the attract mode arrive in M1,
// M9 and M11).
import { E, def, expose } from '../../motor/index.js';

def('scenes', 'title', {
  make({ game }) {
    let t = 0, bg = null;
    return {
      view: 'iso',
      enter() { t = 0; bg = new E.Backdrop('city-night'); expose('snapshot', () => ({ scene: 'title', t: +t.toFixed(2) })); },
      update(dt) { t += dt; if (game.input.pressed('start') || game.input.pressed('confirm')) game.go('play'); },
      draw(r) {
        bg.draw(r);
        r.overlay(g => {
          const cx = r.W / 2, y = Math.round(r.H * .26);
          E.font.title(g, 'GRAND THEFT', cx, y, { scale: 2, colors: ['#f4f0ff', '#b8b0d8'], align: 'center' });
          E.font.title(g, 'MOTO', cx, y + 22, { scale: 5, colors: ['#ffe066', '#ff7a2a', '#d0306a'], align: 'center', depth: 3, depthColor: '#2a0a2a' });
          E.font.text(g, 'IF IT HAS A MOTOR, IT\'S YOURS.', cx, y + 74, '#c8c0e8', { align: 'center', shadow: '#000' });
          if ((t * 1.6 | 0) % 2 === 0) E.font.text(g, 'PRESS START', cx, Math.round(r.H * .74), '#ffffff', { align: 'center', shadow: '#000' });
          E.font.text(g, E.versionLabel().replace(' · ', ' • ') + '  •  MOTOR', 6, r.H - 11, '#7a7298', { shadow: '#000' });
        });
      },
    };
  },
});
