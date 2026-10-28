// The DualSense through WebHID (L7): its adaptive triggers, its two motors, its light bar and its player lights,
// written to the controller's own output report where the page may open it (Chromium's WebHID, a click or a key
// granting it once; the desktop wrapper granting it at once). The Gamepad API's rumble stays the fallback: without a
// DualSense opened here, input/rumble.js shakes through it as before. Presentation only, like the rumble: nothing
// reads it back, and a headless game never opens a device.
//   The report (the layout the Linux driver, hid-playstation, writes): 47 bytes in common, by USB as report 0x02, by
//   Bluetooth as 0x31 behind a sequence tag, with a CRC-32 seeded with 0xA2 at its end. Each part goes out with its own
//   valid flag only, so a report for the motors leaves the triggers and the light as they were.
//   The trigger effects (Sony's zone forms: the travel in 10 zones, a strength 1-8):
//     { mode: 'off' }                                  no resistance;
//     { mode: 'feedback', from, k }                    a resistance from zone `from` to the end;
//     { mode: 'weapon', from, to, k }                  a break between two zones (2-7, to 3-8): a gun's trigger;
//     { mode: 'vibration', from, k, hz }               a buzz from zone `from` on, at hz (1-255).
//   const H = new DualSenseHID(navigator.hid); await H.connect(); H.motors(.6, .8, .2); H.trigger('right', { mode:
//   'weapon', from: 3, to: 6, k: 6 }); H.light(255, 90, 74); H.players(2); each frame H.flush(); await H.close()

export const SONY = 0x054c, PRODUCTS = [0x0ce6, 0x0df2];   // (the DualSense, the DualSense Edge)
export const FILTERS = PRODUCTS.map(productId => ({ vendorId: SONY, productId }));
export const OFF = Object.freeze({ mode: 'off' });
const USB = 0x02, BT = 0x31, PLAYERS = [0, 0x04, 0x0a, 0x15, 0x1b, 0x1f];   // (n lit of the five, from the middle out)

const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
const byte = k => int(k * 255, 0, 255);
export const isDualSense = d => !!d && d.vendorId === SONY && PRODUCTS.includes(d.productId);

/** the 11 bytes of a trigger's effect: its mode and its ten parameters (anything malformed is no resistance) */
export function triggerBytes(e = OFF) {
  const b = new Uint8Array(11), k = int(e.k, 0, 8);
  const zones = (from, f) => { let on = 0, force = 0; for (let i = int(from, 0, 9); i < 10; i++) { on |= 1 << i; force |= f << (3 * i); } return [on, force >>> 0]; };
  const put = (on, force) => { b[1] = on & 0xff; b[2] = on >> 8 & 0xff; b[3] = force & 0xff; b[4] = force >>> 8 & 0xff; b[5] = force >>> 16 & 0xff; b[6] = force >>> 24 & 0xff; };
  if (e.mode === 'feedback' && k > 0) { b[0] = 0x21; put(...zones(e.from, k - 1)); }
  else if (e.mode === 'weapon' && k > 0) {
    const from = int(e.from, 2, 7), to = int(e.to, from + 1, 8), z = 1 << from | 1 << to;
    b[0] = 0x25; b[1] = z & 0xff; b[2] = z >> 8 & 0xff; b[3] = k - 1;
  } else if (e.mode === 'vibration' && k > 0 && e.hz > 0) { b[0] = 0x26; put(...zones(e.from, k - 1)); b[9] = int(e.hz, 1, 255); }
  else b[0] = 0x05;
  return b;
}

/** the report's 47 common bytes: of the state s ({ strong, weak, right, left, light: [r, g, b], players }), the parts
 *  named in `parts` ({ init, motors, right, left, light, players }), each with its valid flag */
export function commonReport(s, parts = {}) {
  const c = new Uint8Array(47);
  if (parts.motors) { c[0] |= 0x03; c[2] = byte(s.weak); c[3] = byte(s.strong); }   // (the compatible vibration: the right motor the light one)
  if (parts.right) { c[0] |= 0x04; c.set(triggerBytes(s.right), 10); }
  if (parts.left) { c[0] |= 0x08; c.set(triggerBytes(s.left), 21); }
  if (parts.light && s.light) { c[1] |= 0x04; c[44] = int(s.light[0], 0, 255); c[45] = int(s.light[1], 0, 255); c[46] = int(s.light[2], 0, 255); }
  if (parts.players) { c[1] |= 0x10; c[43] = PLAYERS[int(s.players, 0, 5)]; }
  if (parts.init) { c[38] |= 0x02; c[41] = 0x02; }   // (the light bar let go of: the system's blue faded out, ours from now)
  return c;
}

let TABLE = null;
/** CRC-32 (the zlib one) of bytes */
export function crc32(bytes) {
  if (!TABLE) { TABLE = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; TABLE[n] = c >>> 0; } }
  let crc = 0xffffffff; for (let i = 0; i < bytes.length; i++) crc = TABLE[(crc ^ bytes[i]) & 0xff] ^ crc >>> 8;
  return (crc ^ 0xffffffff) >>> 0;
}

/** by USB: report 0x02, the common bytes padded to the device's report size */
export function usbReport(c, size = 47) { const d = new Uint8Array(Math.max(47, size)); d.set(c); return { id: USB, data: d }; }

/** by Bluetooth: report 0x31, its sequence tag, the common bytes, and the CRC-32 (seeded 0xA2) over all before it */
export function btReport(c, seq = 0) {
  const r = new Uint8Array(78); r[0] = BT; r[1] = (seq & 15) << 4; r[2] = 0x10; r.set(c, 3);
  const u = new Uint8Array(75); u[0] = 0xa2; u.set(r.subarray(0, 74), 1);
  const crc = crc32(u); r[74] = crc & 0xff; r[75] = crc >>> 8 & 0xff; r[76] = crc >>> 16 & 0xff; r[77] = crc >>> 24 & 0xff;
  return { id: BT, data: r.subarray(1) };
}

const outputs = d => (d.collections || []).flatMap(c => c.outputReports || []);
const sizeOf = (d, id) => { const r = outputs(d).find(o => o.reportId === id); return r ? (r.items || []).reduce((n, i) => n + (i.reportSize || 0) * (i.reportCount || 0), 0) / 8 : 0; };
const same = (a, b) => a === b || (!!a && !!b && a.mode === b.mode && a.from === b.from && a.to === b.to && a.k === b.k && a.hz === b.hz);

export class DualSenseHID {
  /** hid: navigator.hid (or a stand-in); o.now(): seconds, for the motors' stop */
  constructor(hid, o = {}) {
    this.hid = hid || null; this.dev = null; this.bt = false; this.size = 47; this.seq = 0; this.busy = null; this.until = 0;
    this.now = o.now || (() => performance.now() / 1000);
    this.s = { strong: 0, weak: 0, right: OFF, left: OFF, light: null, players: 0 }; this.dirty = {}; this.sent = 0;
  }
  static supported(nav = globalThis.navigator) { return !!(nav && nav.hid && nav.hid.getDevices); }
  get connected() { return !!this.dev; }
  /** open a DualSense already granted to the page (no prompt); ask: prompt for one (it needs a click or a key) */
  async connect(ask = false) {
    this.want = true; if (this.dev) return true; if (!this.hid) return false;
    if (!this._back && this.hid.addEventListener) { this._back = e => { if (this.want && !this.dev && isDualSense(e.device)) this.connect(); }; this.hid.addEventListener('connect', this._back); }   // (plugged in again: opened again, no prompt)
    let list; try { list = (await this.hid.getDevices()).filter(isDualSense); if (!list.length && ask) list = (await this.hid.requestDevice({ filters: FILTERS })).filter(isDualSense); } catch (e) { return false; }   // (asked without a key or a click, the browser refuses: nothing opened)
    const d = list[0]; if (!d) return false;
    try { if (!d.opened) await d.open(); } catch (e) { return false; }
    this.dev = d; this.bt = outputs(d).some(r => r.reportId === BT) && !outputs(d).some(r => r.reportId === USB); this.size = sizeOf(d, USB) || 47;
    if (!this._gone) { this._gone = e => { if (e.device === this.dev) { this.dev = null; this.busy = null; } }; if (this.hid.addEventListener) this.hid.addEventListener('disconnect', this._gone); }
    this.dirty = { init: true, motors: true, right: true, left: true, light: !!this.s.light, players: true };
    return true;
  }
  /** the motors: strong (the left, the heavy one) and weak (the right) 0..1, for secs */
  motors(strong, weak, secs = .15) {
    this.s.strong = Math.max(0, Math.min(1, +strong || 0)); this.s.weak = Math.max(0, Math.min(1, +weak || 0)); this.dirty.motors = true;
    this.until = this.s.strong > 0 || this.s.weak > 0 ? this.now() + Math.max(.02, secs) : 0;
    return !!this.dev;
  }
  /** a trigger's effect ('right' or 'left'; see above); a change only when it is another */
  trigger(side, e = OFF) { if (side !== 'right' && side !== 'left') return; if (same(this.s[side], e)) return; this.s[side] = e; this.dirty[side] = true; }
  /** the light bar, r g b 0..255 */
  light(r, g, b) { const L = this.s.light; if (L && L[0] === r && L[1] === g && L[2] === b) return; this.s.light = [r, g, b]; this.dirty.light = true; }
  /** the player lights: n of the five lit (0..5) */
  players(n) { n = int(n, 0, 5); if (n === this.s.players) return; this.s.players = n; this.dirty.players = true; }
  /** each frame: one report of what changed (none when nothing did; while the last is still going, after it) */
  flush() {
    if (!this.dev || this.busy) return false;
    if (this.until && this.now() >= this.until) { this.until = 0; this.s.strong = this.s.weak = 0; this.dirty.motors = true; }
    const parts = this.dirty; if (!Object.keys(parts).some(k => parts[k])) return false;
    this.dirty = {}; const c = commonReport(this.s, parts), r = this.bt ? btReport(c, this.seq++) : usbReport(c, this.size);
    let p; try { p = this.dev.sendReport(r.id, r.data); } catch (e) { p = null; }
    this.sent++; this.busy = p && p.then ? p.then(() => {}, () => {}).then(() => { this.busy = null; this.flush(); }) : null;   // (what changed meanwhile goes after it)
    return true;
  }
  /** the triggers free (a menu over the game) */
  rest() { this.trigger('right', OFF); this.trigger('left', OFF); return this.flush(); }
  /** everything let go: the triggers free, the motors still, the light and the player lights off; the device closed */
  async close() {
    this.want = false; const d = this.dev; if (!d) return;
    if (this.busy) await this.busy;
    this.s = { strong: 0, weak: 0, right: OFF, left: OFF, light: [0, 0, 0], players: 0 }; this.until = 0;
    const c = commonReport(this.s, { motors: true, right: true, left: true, light: true, players: true }), r = this.bt ? btReport(c, this.seq++) : usbReport(c, this.size);
    try { await d.sendReport(r.id, r.data); } catch (e) { /* (unplugged) */ }
    try { await d.close(); } catch (e) { /* (gone) */ }
    this.dev = null;
  }
}
