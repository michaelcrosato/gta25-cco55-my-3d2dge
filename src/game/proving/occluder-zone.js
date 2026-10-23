// The occluder fixture (PLAN.md 8.5's Accept: "nothing behind a building shows through it", backed by a scene with a
// known occluder): a tall block stands between MODE 7's camera and a magenta marker the height of a body. Drawn back to
// front, the block must hide the marker whole; stepped out to one side, the marker must show. ?selftest=1 counts the
// marker's pixels in the drawn frame both ways (?side=1 starts it stepped out).
import { E, def, FloorChunks } from '../../motor/index.js';

const T = 16, N = 24;
const BEHIND = [12 * T, 4 * T], ASIDE = [21.5 * T, 4 * T];   // (the marker: right behind the block, and out past its east end)
const isMarker = (d, i) => d[i] > 200 && d[i + 1] < 80 && d[i + 2] > 200;   // (magenta, through any tint the frame puts on it)

def('provingZones', 'occluder', {
  title: 'Occluder',
  make(app) {
    const { game, links, stage } = app;
    let map, floor, focus, marker;
    const count = () => { const s = game.screen, d = s.ctx.getImageData(0, 0, s.buf.width, s.buf.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (isMarker(d, i)) n++; return n; };
    return {
      enter() {
        const cells = new Array(N * N).fill(0);
        for (let y = 9; y <= 11; y++) for (let x = 6; x <= 17; x++) cells[y * N + x] = 1;   // (the block: 12 x 3 cells, 64 high)
        map = new E.TileMap({ w: N, h: N, cells, floor: new Array(N * N).fill('#4a4a52'), types: { 1: { name: 'block', h: 64, side: '#8a7a6a', top: '#5a5060', face: 'brick' } } });
        floor = new FloorChunks({ w: N * T, h: N * T, paint: (g, x0, y0, x1, y1) => {
          for (let cy = Math.floor(y0 / T); cy < Math.ceil(y1 / T); cy++) for (let cx = Math.floor(x0 / T); cx < Math.ceil(x1 / T); cx++) { g.fillStyle = (cx + cy) & 1 ? '#4a4a52' : '#56565e'; g.fillRect(cx * T, cy * T, T, T); }
        } });
        stage.setWorld({ map, floor });
        focus = [12 * T, 19 * T]; marker = { x: (links.query.get('side') === '1' ? ASIDE : BEHIND)[0], y: BEHIND[1] };   // (the camera south of the focus, looking north at the block)
        game.cam.bounds = v => map.bounds(v);
        stage.side7.setHeading(0, focus[0], focus[1]);
        if (!game.headless) floor.warm(focus[0], focus[1], 400);
        return { map, floor };
      },
      update() { game.focus(focus[0], focus[1], 16); },
      draw(r) {
        stage.begin(r, { focus, vel: [0, 0], speed01: 0 });
        const { x, y } = marker;
        stage.shape(x, y, 0, (g, P) => {
          const a = P.proj(x - 8, y, 0), b = P.proj(x + 8, y, 40); if (!a || !b) return;
          g.fillStyle = '#ff00ff'; g.fillRect(Math.round(Math.min(a[0], b[0])), Math.round(Math.min(a[1], b[1])), Math.max(1, Math.round(Math.abs(b[0] - a[0]))), Math.max(1, Math.round(Math.abs(b[1] - a[1])))); g._c = null;
        });
        stage.end();
      },
      hud() { return [marker.x === BEHIND[0] ? 'THE MARKER BEHIND THE BLOCK' : 'THE MARKER STEPPED OUT']; },
      snapshot() { return { marker: [marker.x, marker.y] }; },
      perf() { return {}; },
      stateHash() { return [marker.x, marker.y]; },
      handle() { return { map, floor, marker }; },
      /** ?selftest=1: MODE 7, the marker behind the block (none of it drawn), then stepped out past its end (drawn) */
      selftest(st) {
        if (st.frame === 0) { game.setView('side7'); stage.side7.setHeading(0, focus[0], focus[1]); marker.x = BEHIND[0]; st.rows = {}; }
        if (st.frame === 12) { st.rows.behind = count(); marker.x = ASIDE[0]; }
        if (st.frame === 24) st.rows.aside = count();
        if (st.frame < 24) return null;
        marker.x = BEHIND[0];
        const checks = [{ check: 'MODE 7: the block hides the marker behind it whole', ok: st.rows.behind === 0, value: st.rows.behind },
          { check: 'MODE 7: stepped out, the marker shows', ok: st.rows.aside > 40, value: st.rows.aside }];
        return { zone: 'occluder', ok: checks.every(c => c.ok), checks };
      },
    };
  },
});
