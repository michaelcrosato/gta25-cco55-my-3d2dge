// Photo mode (PLAN.md 8.22): Create (or the phone's SNAP) freezes the simulation and hands the camera to a free rig. The
// stick pans it (tethered within TUNE.photoReach of the player), L2/R2 zoom, R3 cycles the three views, ✕ takes the
// photo, ○ (or Create again) puts the view, the camera and the controls back as they were. The HUD is off, but for a
// small legend on the UI layer, which is never in the picture. A photo is the Snap's BUS event 'photo' (by: the player,
// at the rig's point, targets: every body and vehicle framed, frame: how near the middle a subject must be), so a photo
// objective (m.photo) completes the same way; in a browser it is also saved as a PNG of the drawn frame (canvas.toBlob,
// a download). Nothing here steps the simulation: the scene stops stepping it while the mode is on.
//   const M = new PhotoMode({ game, stage, views, bindings, canvas: () => cv, bodies: () => [...], vehicles: () => [...] });
//   M.enter(player); each step while M.active: M.update(dt); on the UI layer: M.legend(pen)
import { BUS } from '../core/bus.js';
import { TUNE, knob } from '../core/tune.js';

knob('Photo', 'photoPan', 'Photo camera pan speed', 260, 40, 800, 10, 'World units a second the photo camera pans at a full push');
knob('Photo', 'photoReach', 'Photo camera reach', 320, 80, 1200, 20, 'How far from the player the photo camera may pan (u)');
knob('Photo', 'photoFrame', 'Photo frame', 140, 40, 400, 10, 'How near the middle of the picture (u, at zoom 1) a subject must be to be in the photo');
const ZOOM = [.5, 2.5];

export class PhotoMode {
  /** o: { game, stage, views (the ViewManager), bindings, canvas() (the drawn frame, for the PNG: null headless),
   *  bodies() and vehicles() (what a photo can frame) } */
  constructor(o) { Object.assign(this, o); this.active = false; this.rig = null; this.flash = 0; this.shots = 0; this.saved = null; this.url = null; }
  /** into photo mode with the camera on the player (false: already in it, or nobody to stand by) */
  enter(p) {
    if (this.active || !p) return false;
    const s7 = this.stage.side7;
    this.prev = { view: this.views.active, rig: this.stage.rig ? { ...this.stage.rig } : null, ctx: this.bindings.context };
    this.player = p; this.home = [p.x, p.y]; this.active = true; this.flash = 0; this.saved = null;
    this.rig = { x: p.x, y: p.y, zoom: 1, heading: s7 ? s7.heading : undefined };
    this.stage.setRig(this.rig); this.bindings.setContext('photo');
    BUS.emit('photoMode', { on: true });
    return true;
  }
  /** out: the view, the camera rig and the controls as they were */
  exit() {
    if (!this.active) return;
    this.active = false; this.stage.setRig(this.prev.rig);
    if (this.views.active !== this.prev.view) this.game.setView(this.prev.view);
    this.bindings.setContext(this.prev.ctx); this.game.cam.snap = true;
    BUS.emit('photoMode', { on: false });
  }
  /** one step (real time: the world stands still): pan, zoom, the view, the shutter, out. False once out */
  update(dt) {
    if (!this.active) return false;
    const B = this.bindings, R = this.rig; this.flash = Math.max(0, this.flash - dt);
    if (B.tap('back', 'photo')) { this.exit(); return false; }
    const [sx, sy] = B.direction('photo'), push = Math.hypot(sx, sy);
    if (push > .05) {
      const g = this.views.screenDirToGround(sx, sy), k = TUNE.photoPan * dt * Math.min(1, push) / R.zoom, l = Math.hypot(g[0], g[1]) || 1;
      R.x += g[0] / l * k; R.y += g[1] / l * k;
      const dx = R.x - this.home[0], dy = R.y - this.home[1], d = Math.hypot(dx, dy), max = TUNE.photoReach;   // (tethered)
      if (d > max) { R.x = this.home[0] + dx / d * max; R.y = this.home[1] + dy / d * max; }
    }
    const zin = B.value('zoomIn', 'photo'), zout = B.value('zoomOut', 'photo');
    if (zin > .05 || zout > .05) R.zoom = Math.max(ZOOM[0], Math.min(ZOOM[1], R.zoom * (1 + (zin - zout) * dt * 1.5)));
    if (B.tap('view', 'photo')) { this.views.next(); const s7 = this.stage.side7; if (this.views.active === 'side7' && s7) R.heading = s7.heading; }
    this.stage.setRig(R);
    if (B.tap('snap', 'photo')) this.shoot();
    return true;
  }
  /** the shutter: what is framed (near the middle of the picture), the BUS event a photo objective listens for, the
   *  PNG in a browser. Returns the event */
  shoot() {
    const R = this.rig, r = TUNE.photoFrame / R.zoom, P = this.player, framed = a => a && a !== P && !a.dead && !a.wrecked && Math.hypot(a.x - R.x, a.y - R.y) < r;
    const targets = [...(this.bodies ? this.bodies() : []), ...(this.vehicles ? this.vehicles() : [])].filter(framed).map(a => a.id);
    const e = { by: P.id, x: R.x, y: R.y, targets, dir: null, frame: r };
    BUS.emit('photo', e);
    this.flash = .3; this.shots++; this._png();
    return e;
  }
  // the drawn frame saved as a PNG (a browser's download; nothing headless)
  _png() {
    const cv = this.canvas ? this.canvas() : null;
    if (!cv || typeof cv.toBlob !== 'function' || typeof document === 'undefined' || typeof URL === 'undefined') return;
    const n = this.shots;
    cv.toBlob(b => {
      if (!b) return;
      if (this.url) URL.revokeObjectURL(this.url);   // (the last one's done with)
      this.url = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = this.url; a.download = `grand-theft-moto-photo-${String(n).padStart(3, '0')}.png`;
      document.body.appendChild(a); a.click(); a.remove(); this.saved = a.download;
    }, 'image/png');
  }
  /** the legend at the foot of the UI layer (a 10-foot Pen), and the shutter's flash over the screen */
  legend(P) {
    if (!this.active) return;
    if (this.flash > 0) P.fill(0, 0, P.W, P.H, '#ffffff', Math.min(.8, this.flash * 3));
    const y = P.safe[3] - 12;
    P.fill(P.W / 2 - 160, y - 4, 320, 15, '#05030c', .6);
    P.prompt('{photo:snap} SNAP   {photo:zoomOut}{photo:zoomIn} ZOOM   {photo:view} VIEW   {photo:back} BACK', P.W / 2, y, { align: 'center', color: '#f0ecff' });
    P.text('PHOTO MODE' + (this.shots ? `  ·  ${this.shots} TAKEN` : ''), P.W / 2, P.safe[1], '#ffe066', { align: 'center' });
  }
}
