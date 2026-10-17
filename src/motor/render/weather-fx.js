// Rain, wet streets, lightning and fog on screen (PLAN.md 8.6), the same in every view. Drops fall in the world round
// the focus (so a moving camera reads against them) and are drawn as short streaks through the view's projector; each
// lands as a splash ring. Wet streets darken (the Stage draws that over the floor, before anything stands on it) and
// take smears of light under the lamps (the Stage's glows). Cosmetic only: Math.random is fine here, nothing is
// simulated.
const BOX = 300, TOP = 220, FALL = 520, WIND = 70;

export class WeatherFX {
  constructor() { this.drops = []; this.splashes = []; this.cx = 0; this.cy = 0; }
  _drop(d, fresh) {
    d.x = this.cx + (Math.random() * 2 - 1) * BOX; d.y = this.cy + (Math.random() * 2 - 1) * BOX;
    d.z = fresh ? Math.random() * TOP : TOP * (.75 + Math.random() * .25); d.v = FALL * (.85 + Math.random() * .3);
    return d;
  }
  /** step the drops round the focus [x, y] by dt seconds, as hard as the sky's rain (0..1) */
  update(dt, sky, focus) {
    if (focus) { this.cx = focus[0]; this.cy = focus[1]; }
    const want = Math.round(340 * (sky.rain || 0)), D = this.drops;
    while (D.length < want) D.push(this._drop({}, true));
    if (D.length > want) D.length = want;
    for (const d of D) {
      d.z -= d.v * dt; d.x += WIND * dt;
      if (d.z <= 0) { if (this.splashes.length < 90 && Math.random() < .6) this.splashes.push({ x: d.x, y: d.y, t: 0 }); this._drop(d, false); continue; }
      // keep the box round the focus as it moves (a drop that falls behind wraps to the far side)
      if (d.x < this.cx - BOX) d.x += 2 * BOX; else if (d.x > this.cx + BOX) d.x -= 2 * BOX;
      if (d.y < this.cy - BOX) d.y += 2 * BOX; else if (d.y > this.cy + BOX) d.y -= 2 * BOX;
    }
    for (const s of this.splashes) s.t += dt;
    this.splashes = this.splashes.filter(s => s.t < .2);
  }
  /** over the lit frame: the streaks, the splashes, a lightning flash and the haze. P: the view's projector
   *  ({ proj(x, y, z) -> [sx, sy, k] }), W x H: the buffer */
  draw(g, P, W, H, sky) {
    if (this.drops.length) {
      const night = sky.ambient < .66;
      g.strokeStyle = night ? 'rgba(160,180,215,.42)' : 'rgba(205,215,235,.5)'; g.lineWidth = 1; g.beginPath();
      for (const d of this.drops) {
        const a = P.proj(d.x, d.y, d.z), b = P.proj(d.x - WIND * .03, d.y, d.z + 15); if (!a || !b) continue;
        if (a[0] < -4 || a[0] > W + 4 || a[1] < -20 || a[1] > H + 4) continue;
        g.moveTo(Math.round(a[0]) + .5, Math.round(a[1])); g.lineTo(Math.round(b[0]) + .5, Math.round(b[1]));
      }
      g.stroke();
    }
    if (this.splashes.length) {
      g.strokeStyle = sky.ambient < .66 ? 'rgba(170,190,225,.5)' : 'rgba(220,230,245,.55)'; g.beginPath();
      for (const s of this.splashes) {
        const q = P.proj(s.x, s.y, 0); if (!q || q[0] < -6 || q[0] > W + 6 || q[1] < -6 || q[1] > H + 6) continue;
        const r = (.6 + s.t * 9) * Math.max(.6, q[2] * .6); g.moveTo(q[0] + r, q[1]); g.ellipse(q[0], q[1], r, r * .45, 0, 0, Math.PI * 2);
      }
      g.stroke();
    }
    if (sky.haze > .02) { g.fillStyle = hazeColor(sky); g.fillRect(0, 0, W, H); }
    if (sky.flash > 0) { g.fillStyle = `rgba(235,240,255,${Math.min(.55, sky.flash * 1.6).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  }
  /** over the floor, before what stands on it: the wet street's darker tint */
  floor(g, W, H, sky) {
    if (sky.wet > .02) { g.fillStyle = `rgba(6,12,30,${(.2 * sky.wet).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  }
}
function hazeColor(sky) {
  const c = sky.fog.match(/[0-9a-f]{2}/gi).map(h => parseInt(h, 16));
  return `rgba(${c[0]},${c[1]},${c[2]},${(.34 * sky.haze).toFixed(3)})`;
}
