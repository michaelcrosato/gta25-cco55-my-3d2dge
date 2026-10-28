// The desktop wrapper's smoke run (L7, CI's desktop job: Electron itself, under a virtual display): the app started as
// main.cjs starts it, the page loaded from dist, then asked from inside it: the game up and in a scene, WebHID there,
// the network shut, a window.open refused. Exit 0 when all hold; each answer printed.
//   npx --prefix desktop electron desktop/smoke.cjs
'use strict';
const electron = require('electron');
const W = require('./main.cjs');

const fail = why => { console.error('desktop smoke: ' + why); electron.app.exit(1); };
setTimeout(() => fail('timed out'), 60000).unref();
W.start(electron).then(win => {
  if (!win) return fail('no window (dist/index.html missing?)');
  win.webContents.once('did-finish-load', () => setTimeout(async () => {
    try {
      const r = await win.webContents.executeJavaScript(`(async () => {
        const g = globalThis.__gtm && globalThis.__gtm.game, net = await fetch('https://example.com/').then(() => 'open', () => 'shut');
        return { scene: g ? g.sceneName : null, hid: !!navigator.hid, gamepads: typeof navigator.getGamepads === 'function', net, popup: window.open('https://example.com/') === null ? 'refused' : 'opened', url: location.protocol };
      })()`);
      const ok = !!r.scene && r.hid && r.gamepads && r.net === 'shut' && r.popup === 'refused' && r.url === 'file:';   // (full screen printed, not asked: a virtual display has no window manager to grant it)
      console.log('desktop smoke: ' + JSON.stringify({ ...r, fullscreen: win.isFullScreen() }) + (ok ? '  ok' : '  FAILED'));
      electron.app.exit(ok ? 0 : 1);
    } catch (e) { fail(String(e && e.stack || e)); }
  }, 5000));
}, e => fail(String(e && e.stack || e)));
