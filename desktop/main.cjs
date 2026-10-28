// The desktop wrapper (L7): the one-file page in a window of its own, for desktops and the Steam Deck. The page is
// dist/index.html unchanged, loaded from the file it is (beside this script once packaged, ../dist in the tree); the
// wrapper adds what a browser tab can't: full screen from the start with no browser around it (F11 out of it and back),
// and a DualSense granted to the page's WebHID without the browser's chooser (Sony's DualSense and DualSense Edge
// alone), so its triggers and light bar answer at once. The page needs no network, so none is let out; nothing opens
// another window or leaves the page; a photo saved (photo mode's ✕) goes to the Pictures folder.
//   npm run desktop (in the tree, after npm run build)  ·  npm run desktop:build (the packaged app, in desktop/out)
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const SONY = 0x054c, DUALSENSE = [0x0ce6, 0x0df2];   // (the DualSense, the DualSense Edge)
const TITLE = 'GRAND THEFT MOTO';
const isDualSense = d => !!d && d.vendorId === SONY && DUALSENSE.includes(d.productId);

/** the page: beside this script (packaged), else the tree's build; null when neither is there */
function pagePath(dir = __dirname) {
  for (const p of [path.join(dir, 'dist', 'index.html'), path.join(dir, '..', 'dist', 'index.html')]) if (fs.existsSync(p)) return p;
  return null;
}

/** the session's rules: a DualSense's HID granted (no chooser), full screen, nothing else asked; nothing off the
 *  machine; downloads into Pictures */
function harden(ses, app) {
  const fileOrigin = o => !o || o === 'file://' || o === 'file:///' || String(o).startsWith('file:');
  ses.setPermissionCheckHandler((wc, permission, origin, details) => (permission === 'hid' || permission === 'fullscreen') && fileOrigin((details && details.securityOrigin) || origin));
  ses.setPermissionRequestHandler((wc, permission, done) => done(permission === 'fullscreen'));
  ses.setDevicePermissionHandler(d => d.deviceType === 'hid' && fileOrigin(d.origin) && isDualSense(d.device));
  ses.on('select-hid-device', (e, details, choose) => { e.preventDefault(); const d = (details.deviceList || []).find(isDualSense); choose(d ? d.deviceId : ''); });
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (d, done) => done({ cancel: true }));
  ses.on('will-download', (e, item) => item.setSavePath(path.join(app.getPath('pictures'), path.basename(item.getFilename() || 'grand-theft-moto.png'))));
}

/** the window: full screen, black behind the page, the page's own process sandboxed with no Node in it */
function createWindow(electron, page) {
  const win = new electron.BrowserWindow({ width: 1280, height: 720, minWidth: 640, minHeight: 360, fullscreen: true, show: false, backgroundColor: '#000000', title: TITLE, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, webviewTag: false, spellcheck: false, autoplayPolicy: 'no-user-gesture-required', backgroundThrottling: false } });
  const W = win.webContents, at = pathToFileURL(page).pathname;
  W.setWindowOpenHandler(() => ({ action: 'deny' }));
  W.on('will-navigate', (e, url) => { let u = null; try { u = new URL(url); } catch (_) { /* (not a URL) */ } if (!u || u.protocol !== 'file:' || u.pathname !== at) e.preventDefault(); });   // (the page itself, any query or hash: never away)
  W.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); } });
  win.once('ready-to-show', () => win.show());
  win.loadFile(page);
  return win;
}

/** the app: ready, the rules set, the window open; gone when it closes (o.page, o.dir: the tests') */
function start(electron, o = {}) {
  const { app, Menu, session, dialog } = electron;
  app.setName(TITLE);
  app.on('window-all-closed', () => app.quit());
  return app.whenReady().then(() => {
    Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }]) : null);   // (macOS: its menu for ⌘Q)
    harden(session.defaultSession, app);
    const page = o.page || pagePath(o.dir);
    if (!page) { dialog.showErrorBox(TITLE, 'dist/index.html is missing: npm run build first.'); app.quit(); return null; }
    return createWindow(electron, page);
  });
}

module.exports = { start, harden, createWindow, pagePath, isDualSense, DUALSENSE, SONY };
if (require.main === module) start(require('electron'));   // (Electron's main script; required (the tests, the smoke run), it waits to be started)
