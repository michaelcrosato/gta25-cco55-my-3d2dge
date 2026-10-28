// The DualSense's WebHID output (L7, input/dualsense-hid.js): the report's bytes where the Linux driver puts them, by
// USB and by Bluetooth (its CRC-32 seeded 0xA2), the trigger effects in Sony's zone forms, each part sent with its own
// valid flag only, one report a frame at most, and everything let go on close. A stand-in WebHID records the reports.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const H = await import('../../src/motor/input/dualsense-hid.js');
const { DualSenseHID, triggerBytes, commonReport, crc32, usbReport, btReport, OFF } = H;
const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join(' ');

/** a stand-in navigator.hid with one device (usb: report 0x02 of 63 bytes; bt: report 0x31 of 77) */
function fakeHid(o = {}) {
  const sent = [], listeners = {};
  const rep = (reportId, n) => ({ reportId, items: [{ reportSize: 8, reportCount: n }] });
  const dev = { vendorId: 0x054c, productId: o.productId || 0x0ce6, opened: false, collections: [{ outputReports: o.bt ? [rep(0x31, 77), rep(0x32, 141)] : [rep(0x02, 63)] }],
    async open() { this.opened = true; }, async close() { this.opened = false; }, async sendReport(id, data) { sent.push({ id, data: Uint8Array.from(data) }); } };
  const other = { vendorId: 0x046d, productId: 0xc21d, collections: [] };
  return { sent, dev, granted: o.granted !== false, asked: 0,
    async getDevices() { return this.granted ? [other, dev] : [other]; },
    async requestDevice(f) { this.asked++; assert.ok(f.filters.some(x => x.vendorId === 0x054c && x.productId === 0x0ce6), 'it asks for a DualSense'); this.granted = true; return [dev]; },
    addEventListener(t, fn) { listeners[t] = fn; }, fire(t, e) { listeners[t](e); } };
}

test('the CRC-32 is zlib\'s', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('the trigger effects: off, feedback, weapon and vibration in Sony\'s zone forms; anything malformed is free', () => {
  assert.equal(hex(triggerBytes(OFF)), '05 00 00 00 00 00 00 00 00 00 00');
  assert.equal(hex(triggerBytes({ mode: 'feedback', from: 0, k: 8 })), '21 ff 03 ff ff ff 3f 00 00 00 00', 'feedback all the way, at 8: every zone, force 7');
  assert.equal(hex(triggerBytes({ mode: 'feedback', from: 5, k: 3 })), '21 e0 03 00 00 49 12 00 00 00 00', 'from zone 5, at 3 (force 2)');
  assert.equal(hex(triggerBytes({ mode: 'weapon', from: 3, to: 6, k: 6 })), '25 48 00 05 00 00 00 00 00 00 00', 'a break between zones 3 and 6, at 6');
  assert.equal(hex(triggerBytes({ mode: 'weapon', from: 7, to: 8, k: 8 })), '25 80 01 07 00 00 00 00 00 00 00');
  assert.equal(hex(triggerBytes({ mode: 'vibration', from: 2, k: 4, hz: 30 })), '26 fc 03 c0 b6 6d 1b 00 00 1e 00', 'a buzz from zone 2, at 4, 30 Hz');
  for (const e of [{ mode: 'feedback', from: 2, k: 0 }, { mode: 'vibration', from: 0, k: 5, hz: 0 }, { mode: 'nonsense' }, {}]) assert.equal(triggerBytes(e)[0], 0x05, JSON.stringify(e));
  assert.equal(hex(triggerBytes({ mode: 'weapon', from: 0, to: 99, k: 99 })), '25 04 01 07 00 00 00 00 00 00 00', 'out of range: kept in it (zones 2 and 8, at 8)');
});

test('the common report: each part where the driver puts it, behind its own valid flag', () => {
  const s = { strong: 1, weak: .5, right: { mode: 'weapon', from: 3, to: 6, k: 6 }, left: { mode: 'feedback', from: 0, k: 8 }, light: [255, 90, 74], players: 3 };
  assert.equal(hex(commonReport(s, {})), hex(new Uint8Array(47)), 'nothing named, nothing set');
  const m = commonReport(s, { motors: true });
  assert.equal(m.length, 47); assert.equal(m[0], 0x03); assert.equal(m[1], 0); assert.equal(m[2], 128, 'the right motor, the light one'); assert.equal(m[3], 255, 'the left, the heavy one');
  assert.ok(m.slice(4).every(x => x === 0), 'the motors alone: the triggers and the light untouched');
  const t = commonReport(s, { right: true, left: true });
  assert.equal(t[0], 0x0c); assert.equal(hex(t.slice(10, 21)), hex(triggerBytes(s.right))); assert.equal(hex(t.slice(21, 32)), hex(triggerBytes(s.left)));
  const l = commonReport(s, { light: true, players: true, init: true });
  assert.equal(l[0], 0); assert.equal(l[1], 0x14); assert.deepEqual([l[44], l[45], l[46]], [255, 90, 74]); assert.equal(l[43], 0x15, 'three player lights, from the middle out');
  assert.equal(l[38], 0x02); assert.equal(l[41], 0x02, 'the light bar let go of by the system');
});

test('by USB and by Bluetooth: the report ids, the sizes, the sequence and the CRC', () => {
  const c = commonReport({ strong: 1, weak: 1 }, { motors: true });
  const u = usbReport(c, 63); assert.equal(u.id, 0x02); assert.equal(u.data.length, 63); assert.equal(hex(u.data.slice(0, 47)), hex(c));
  assert.equal(usbReport(c).data.length, 47, 'a device that says no size: the common bytes');
  const b = btReport(c, 5); assert.equal(b.id, 0x31); assert.equal(b.data.length, 77, '78 with its id');
  assert.equal(b.data[0], 0x50, 'the sequence in the high nibble'); assert.equal(b.data[1], 0x10, 'the tag'); assert.equal(hex(b.data.slice(2, 49)), hex(c));
  const whole = new Uint8Array(78); whole[0] = 0x31; whole.set(b.data, 1);
  const crc = crc32(Uint8Array.from([0xa2, ...whole.slice(0, 74)]));
  assert.equal(whole[74] | whole[75] << 8 | whole[76] << 16 | (whole[77] << 24 >>> 0), crc | 0, 'the CRC-32 of 0xA2 and the 74 bytes before it, little-endian');
  assert.equal(btReport(c, 17).data[0], 0x10, 'the sequence wraps at 16');
});

test('the device: opened when granted (asked only on request), one report a frame of what changed, let go on close', async () => {
  let now = 0; const hid = fakeHid({ granted: false }), D = new DualSenseHID(hid, { now: () => now });
  assert.equal(await D.connect(), false, 'not granted: nothing opened, nothing asked'); assert.equal(hid.asked, 0);
  assert.equal(await D.connect(true), true, 'asked for (a click or a key)'); assert.equal(hid.asked, 1); assert.ok(hid.dev.opened); assert.equal(D.bt, false); assert.equal(D.size, 63);
  assert.equal(D.flush(), true); await D.busy;
  assert.equal(hid.sent.length, 1); const first = hid.sent[0]; assert.equal(first.id, 0x02); assert.equal(first.data.length, 63);
  assert.equal(first.data[0], 0x0f, 'the first report: the motors still and both triggers free'); assert.equal(first.data[38], 0x02, 'and the light bar let go of');
  assert.equal(D.flush(), false, 'nothing changed: nothing sent'); D.trigger('right', { mode: 'weapon', from: 3, to: 6, k: 6 }); D.trigger('right', { mode: 'weapon', from: 3, to: 6, k: 6 });
  D.light(255, 90, 74); D.motors(.8, .4, .2);
  assert.equal(D.flush(), true); assert.equal(D.flush(), false, 'one in flight: the next waits'); await D.busy;
  const r = hid.sent[1].data; assert.equal(r[0], 0x07); assert.equal(r[1], 0x04); assert.equal(r[10], 0x25); assert.equal(r[3], 204); assert.equal(r[44], 255);
  now = .1; assert.equal(D.flush(), false, 'the motors run their time'); now = .25; assert.equal(D.flush(), true, 'then stop'); await D.busy;
  assert.equal(hid.sent[2].data[0], 0x03); assert.equal(hid.sent[2].data[2] + hid.sent[2].data[3], 0);
  await D.close(); const last = hid.sent[hid.sent.length - 1].data;
  assert.equal(last[0], 0x0f); assert.equal(last[10], 0x05); assert.equal(last[21], 0x05); assert.deepEqual([last[44], last[45], last[46], last[43]], [0, 0, 0, 0], 'closed: all let go');
  assert.equal(hid.dev.opened, false); assert.equal(D.connected, false);
});

test('by Bluetooth: report 0x31, its sequence counting; unplugged: no more reports', async () => {
  const hid = fakeHid({ bt: true, productId: 0x0df2 }), D = new DualSenseHID(hid, { now: () => 0 });
  assert.equal(await D.connect(), true, 'the Edge too, granted before: no prompt'); assert.equal(D.bt, true);
  D.flush(); await D.busy; D.players(2); D.flush(); await D.busy;
  assert.deepEqual(hid.sent.map(s => [s.id, s.data.length, s.data[0] >> 4]), [[0x31, 77, 0], [0x31, 77, 1]]);
  hid.fire('disconnect', { device: hid.dev }); assert.equal(D.connected, false); D.players(4); assert.equal(D.flush(), false);
  hid.fire('connect', { device: hid.dev }); await new Promise(r => setTimeout(r, 0)); assert.equal(D.connected, true, 'plugged in again: open again, no prompt');
  D.flush(); await D.busy; const again = hid.sent[hid.sent.length - 1].data;
  assert.equal(again[2 + 43], 0x1b, 'its state sent again: the four player lights set while it was away'); assert.equal(again[2 + 38], 0x02, 'and the light bar let go of again');
  assert.equal(DualSenseHID.supported({}), false); assert.equal(DualSenseHID.supported({ hid }), true);
});
