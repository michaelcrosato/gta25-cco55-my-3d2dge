// Photo mode (PLAN.md 8.22): Create (or the phone's SNAP) freezes the simulation and hands the camera to a free rig. The
// stick pans it (tethered within TUNE.photoReach of the player), L2/R2 zoom, R3 cycles the views, ✕ takes the
// photo, R1 (or F) picks its look (a filter: noir, sepia, vapor, arcade, postcard), ○ (or Create again) puts the view,
// the camera and the controls back as they were. The HUD is off, but for a
// small legend on the UI layer, which is never in the picture. A photo is the Snap's BUS event 'photo' (by: the player,
// at the rig's point, targets: every body and vehicle framed, frame: how near the middle a subject must be), so a photo
// objective (m.photo) completes the same way; in a browser it is also saved as a PNG of the drawn frame (canvas.toBlob,
// a download). Nothing here steps the simulation: the scene stops stepping it while the mode is on.
//   const M = new PhotoMode({ game, stage, views, bindings, canvas: () => cv, bodies: () => [...], vehicles: () => [...] });
//   M.enter(player); each step while M.active: M.update(dt); on the UI layer: M.legend(pen)
import { BUS } from '../core/bus.js';
import { TUNE, knob } from '../core/tune.js';
import { flashScale } from '../ui/settings.js';
import { E } from '../engine.js';

const mkCanvas = (w, h) => E.mkCanvas(w, h);

knob('Photo', 'photoPan', 'Photo camera pan speed', 260, 40, 800, 10, 'World units a second the photo camera pans at a full push');
knob('Photo', 'photoReach', 'Photo camera reach', 320, 80, 1200, 20, 'How far from the player the photo camera may pan (u)');
knob('Photo', 'photoFrame', 'Photo frame', 140, 40, 400, 10, 'How near the middle of the picture (u, at zoom 1) a subject must be to be in the photo');
const ZOOM = [.5, 2.5];
/** the looks a photo can take (R1 / F cycles them): a CSS filter over the frame, then an overlay of its own (a vignette,
 *  scanlines, a wash of colour). Presentation only: drawn over the frame, in the picture and its PNG */
export const LOOKS = [
  { id: 'none', label: 'AS IT IS' },
  { id: 'noir', label: 'NOIR', filter: 'grayscale(1) contrast(1.3) brightness(.95)', vignette: .55 },
  { id: 'sepia', label: 'SEPIA', filter: 'sepia(.9) contrast(1.05) brightness(1.02)', vignette: .4 },
  { id: 'vapor', label: 'VAPOR', filter: 'saturate(1.5) hue-rotate(-18deg)', wash: ['rgba(255,80,200,.18)', 'rgba(40,220,255,.16)'] },
  { id: 'crt', label: 'ARCADE', filter: 'saturate(1.25) contrast(1.1)', scan: .28, vignette: .35 },
  { id: 'postcard', label: 'POSTCARD', filter: 'saturate(1.35) sepia(.22) brightness(1.06)', vignette: .3, wash: ['rgba(255,190,90,.12)', 'rgba(255,120,60,.06)'] },
];

export class PhotoMode {
  /** o: { game, stage, views (the ViewManager), bindings, canvas() (the drawn frame, for the PNG: null headless),
   *  bodies() and vehicles() (what a photo can frame) } */
  constructor(o) { Object.assign(this, o); this.active = false; this.rig = null; this.flash = 0; this.shots = 0; this.saved = null; this.url = null; this.look = 0; }
  /** the look in use ({ id, label, filter, vignette, scan, wash }) */
  get lookNow() { return LOOKS[this.look] || LOOKS[0]; }
  /** the look over the frame drawn into the buffer g (w x h), when photo mode is on and one is picked */
  drawLook(g, w, h) {
    const L = this.lookNow; if (!this.active || L.id === 'none' || !g) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if (L.filter && 'filter' in g) {
      const t = this._lookCv && this._lookCv.width === w && this._lookCv.height === h ? this._lookCv : (this._lookCv = mkCanvas(w, h)); if (t) { const tg = t.getContext('2d'); tg.clearRect(0, 0, w, h); tg.drawImage(g.canvas, 0, 0); g.filter = L.filter; g.drawImage(t, 0, 0); g.filter = 'none'; }
    }
    if (L.wash) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, L.wash[0]); gr.addColorStop(1, L.wash[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    if (L.scan) { g.fillStyle = `rgba(0,0,0,${L.scan})`; for (let y = 1; y < h; y += 2) g.fillRect(0, y, w, 1); }
    if (L.vignette) { const r = Math.hypot(w, h) / 2, gr = g.createRadialGradient(w / 2, h / 2, r * .45, w / 2, h / 2, r); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${L.vignette})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    g.restore();
  }
  /** into photo mode with the camera on the player (false: already in it, or nobody to stand by) */
  enter(p) {
    if (this.active || !p) return false;
    const s7 = this.stage.mode7 || this.stage.side7;
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
    if (B.tap('look', 'photo')) this.look = (this.look + 1) % LOOKS.length;
    if (B.tap('view', 'photo')) { this.views.next(); const s7 = this.stage.mode7; if (s7) R.heading = s7.heading; }   // (MODE 7's rail or the chase camera's heading, as it stood)
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
    const k = flashScale(this.game); if (this.flash > 0 && k > 0) P.fill(0, 0, P.W, P.H, '#ffffff', Math.min(.8, this.flash * 3) * k);   // (Settings: SCREEN FLASHES, REDUCE MOTION)
    const y = P.safe[3] - 12;
    P.fill(P.W / 2 - 160, y - 4, 320, 15, '#05030c', .6);
    P.prompt('{photo:snap} SNAP   {photo:zoomOut}{photo:zoomIn} ZOOM   {photo:view} VIEW   {photo:look} LOOK   {photo:back} BACK', P.W / 2, y, { align: 'center', color: '#f0ecff' });
    P.text('PHOTO MODE  •  ' + this.lookNow.label + (this.shots ? `  •  ${this.shots} TAKEN` : ''), P.W / 2, P.safe[1], '#ffe066', { align: 'center' });
  }
}
