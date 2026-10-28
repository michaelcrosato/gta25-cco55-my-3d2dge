// The desktop wrapper (L7, desktop/main.cjs) against a stand-in Electron: the page found (beside the script packaged,
// dist in the tree), its window full screen and sandboxed with no Node in it, a DualSense's HID granted without the
// chooser and nothing else, no network, no other window, no navigation away, a photo saved into Pictures, F11 in and
// out of full screen; macOS keeps a menu for ⌘Q. Electron itself runs in CI's desktop job (desktop/smoke.cjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const W = require('../../desktop/main.cjs');

/** a stand-in electron: records what the wrapper asks of it */
function fakeElectron() {
  const rec = { windows: [], menu: undefined, quit: 0, errors: [] }, on = () => { const h = {}; return { h, on(ev, fn) { h[ev] = fn; }, once(ev, fn) { h[ev] = fn; } }; };
  const ses = { ...on(), webRequest: { onBeforeRequest(filter, fn) { ses.filter = filter; ses.request = fn; } },
    setPermissionCheckHandler(fn) { ses.check = fn; }, setPermissionRequestHandler(fn) { ses.ask = fn; }, setDevicePermissionHandler(fn) { ses.device = fn; } };
  class BrowserWindow {
    constructor(o) { this.o = o; this.full = !!o.fullscreen; this.shown = false; const e = on(); this.h = e.h; this.once = e.once; const wc = on(); this.webContents = { ...wc, setWindowOpenHandler: fn => { this.webContents.open = fn; } }; rec.windows.push(this); }
    loadFile(p) { this.file = p; }
    show() { this.shown = true; } isFullScreen() { return this.full; } setFullScreen(v) { this.full = v; }
  }
  const app = { ...on(), name: '', setName(n) { app.name = n; }, whenReady: () => Promise.resolve(), quit() { rec.quit++; }, getPath: k => (k === 'pictures' ? '/home/me/Pictures' : '/tmp') };
  const Menu = { setApplicationMenu(m) { rec.menu = m; }, buildFromTemplate: t => ({ template: t }) };
  return { rec, ses, electron: { app, BrowserWindow, Menu, session: { defaultSession: ses }, dialog: { showErrorBox: (t, m) => rec.errors.push(m) } } };
}

test('the page: beside the script once packaged, else the tree\'s dist; none, null', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gtm-desktop-')), app = path.join(tmp, 'app');
  fs.mkdirSync(path.join(app, 'dist'), { recursive: true }); assert.equal(W.pagePath(app), null);
  fs.mkdirSync(path.join(tmp, 'dist')); fs.writeFileSync(path.join(tmp, 'dist', 'index.html'), '<!doctype html>');
  assert.equal(W.pagePath(app), path.join(app, '..', 'dist', 'index.html'), 'in the tree: ../dist');
  fs.writeFileSync(path.join(app, 'dist', 'index.html'), '<!doctype html>'); assert.equal(W.pagePath(app), path.join(app, 'dist', 'index.html'), 'packaged: beside it');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('the session: a DualSense\'s HID granted with no chooser, nothing else; no network; photos into Pictures', () => {
  const { ses, electron } = fakeElectron(); W.harden(ses, electron.app);
  const ds = { vendorId: 0x054c, productId: 0x0ce6 }, edge = { vendorId: 0x054c, productId: 0x0df2 }, kb = { vendorId: 0x046d, productId: 0xc31c };
  assert.equal(ses.device({ deviceType: 'hid', origin: 'file://', device: ds }), true, 'the DualSense');
  assert.equal(ses.device({ deviceType: 'hid', origin: 'file://', device: edge }), true, 'the DualSense Edge');
  assert.equal(ses.device({ deviceType: 'hid', origin: 'file://', device: kb }), false, 'not another HID device');
  assert.equal(ses.device({ deviceType: 'usb', origin: 'file://', device: ds }), false, 'not by WebUSB');
  assert.equal(ses.device({ deviceType: 'hid', origin: 'https://example.com', device: ds }), false, 'not to another origin');
  assert.equal(ses.check(null, 'hid', 'file:///', { securityOrigin: 'file:///' }), true); assert.equal(ses.check(null, 'fullscreen', 'file:///', {}), true);
  for (const p of ['geolocation', 'media', 'notifications', 'clipboard-read']) assert.equal(ses.check(null, p, 'file:///', {}), false, p);
  const asked = []; for (const p of ['fullscreen', 'media', 'geolocation']) ses.ask(null, p, v => asked.push([p, v])); assert.deepEqual(asked, [['fullscreen', true], ['media', false], ['geolocation', false]]);
  let chose = null, stopped = false; ses.h['select-hid-device']({ preventDefault: () => { stopped = true; } }, { deviceList: [{ ...kb, deviceId: 'k' }, { ...ds, deviceId: 'd' }] }, id => { chose = id; });
  assert.equal(stopped, true, 'no chooser'); assert.equal(chose, 'd', 'the DualSense picked');
  ses.h['select-hid-device']({ preventDefault() {} }, { deviceList: [{ ...kb, deviceId: 'k' }] }, id => { chose = id; }); assert.equal(chose, '', 'none: nothing picked');
  assert.deepEqual(ses.filter.urls.sort(), ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*']); let cancel = null; ses.request({ url: 'https://example.com/' }, r => { cancel = r.cancel; }); assert.equal(cancel, true, 'the network shut');
  let saved = null; ses.h['will-download']({}, { getFilename: () => 'gtm-photo-1.png', setSavePath: p => { saved = p; } }); assert.equal(saved, path.join('/home/me/Pictures', 'gtm-photo-1.png'));
  ses.h['will-download']({}, { getFilename: () => '../../evil.png', setSavePath: p => { saved = p; } }); assert.equal(saved, path.join('/home/me/Pictures', 'evil.png'), 'its name only, in Pictures');
});

test('the window: full screen, sandboxed, no Node; no other window, no navigation away; F11', () => {
  const { rec, electron } = fakeElectron(), page = path.join(os.tmpdir(), 'gtm', 'dist', 'index.html'), win = W.createWindow(electron, page), o = win.o.webPreferences;
  assert.equal(win.file, page); assert.equal(win.o.fullscreen, true); assert.equal(win.o.backgroundColor, '#000000'); assert.equal(rec.windows.length, 1);
  assert.deepEqual([o.contextIsolation, o.sandbox, o.nodeIntegration, o.webviewTag], [true, true, false, false]);
  assert.equal(win.shown, false); win.h['ready-to-show'](); assert.equal(win.shown, true, 'shown once drawn');
  assert.deepEqual(win.webContents.open({ url: 'https://example.com' }), { action: 'deny' });
  const url = pathToFileURL(page).href, nav = u => { let stopped = false; win.webContents.h['will-navigate']({ preventDefault: () => { stopped = true; } }, u); return stopped; };
  assert.equal(nav(url + '?seed=2#play'), false, 'the page itself, another query: let be');
  assert.equal(nav('https://example.com/'), true); assert.equal(nav(pathToFileURL(path.join(os.tmpdir(), 'other.html')).href), true); assert.equal(nav('not a url'), true);
  let held = false; win.webContents.h['before-input-event']({ preventDefault: () => { held = true; } }, { type: 'keyDown', key: 'F11' });
  assert.equal(held, true); assert.equal(win.isFullScreen(), false, 'F11: out'); win.webContents.h['before-input-event']({ preventDefault() {} }, { type: 'keyDown', key: 'F11' }); assert.equal(win.isFullScreen(), true, 'and in');
  held = false; win.webContents.h['before-input-event']({ preventDefault: () => { held = true; } }, { type: 'keyDown', key: 'Escape' }); assert.equal(held, false, 'Esc is the game\'s (its pause)');
});

test('the app: ready, the rules set, the window open; no page, an error and out; quits with its window', async () => {
  const { rec, ses, electron } = fakeElectron(), page = path.join(os.tmpdir(), 'index.html');
  const win = await W.start(electron, { page }); assert.ok(win && win.file === page); assert.ok(ses.device, 'the session hardened'); assert.equal(electron.app.name, 'GRAND THEFT MOTO');
  assert.equal(rec.menu, process.platform === 'darwin' ? rec.menu : null, 'no menu bar (macOS: its app menu)');
  electron.app.h['window-all-closed'](); assert.equal(rec.quit, 1);
  const B = fakeElectron(), empty = fs.mkdtempSync(path.join(os.tmpdir(), 'gtm-none-'));
  assert.equal(await W.start(B.electron, { dir: path.join(empty, 'app') }), null); assert.equal(B.rec.windows.length, 0, 'no page: no window');
  assert.match(B.rec.errors[0], /npm run build/, 'it says how to make one'); assert.equal(B.rec.quit, 1);
  fs.rmSync(empty, { recursive: true, force: true });
});
