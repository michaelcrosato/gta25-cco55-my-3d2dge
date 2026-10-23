// FAN-OUT B (10-foot UI): SETTINGS, DISPLAY, SCREEN FLASHES (and REDUCE MOTION) change none of the flashes the game
// draws. The setting is the engine's ("How bright explosions and camera flashes get", applied by game.flash()), but
// MOTOR never calls game.flash(): the two full-screen flashes it draws itself ignore the setting and reduceMotion:
//   - a storm's lightning: WeatherFX.draw (src/motor/render/weather-fx.js) fills the whole frame white at
//     min(.55, sky.flash * 1.6) every 4-14 s (world/weather.js), and skyAt lifts the city's light with it;
//   - photo mode's shutter: PhotoMode.legend (src/motor/play/photo.js) fills the UI layer white at up to .8.
// A player who turns flashes off (photosensitivity) still gets both at full strength. The stage's own weather FX and
// the photo mode's legend are called here as the frame calls them (draw never runs headless), with a recording context.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('Screen flashes 0% and Reduce motion: no full-screen lightning or shutter flash', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { weather: 'storm', time: 'night', traffic: '0' } });
  game.settings.set('flashes', 0); game.settings.set('motion', true);
  let t = 0; while (!(gtm.weather.flash > 0) && t < 30) { game.advance(.25); t += .25; }
  assert.ok(gtm.weather.flash > 0, 'set-up: a lightning strike within 30 s of storm');
  // the frame's weather overlay, as Stage.begin draws it with the hour's sky (play.draw: stage.setSky(skyAt(...)))
  gtm.stage.setSky(gtm.motor.skyAt(gtm.clock.hour, gtm.weather));
  const fills = [], g = { set fillStyle(v) { this._f = v; }, get fillStyle() { return this._f; }, fillRect(x, y, w, h) { fills.push({ style: this._f, x, y, w, h }); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, ellipse() {}, strokeStyle: '', lineWidth: 1 };
  gtm.stage.wfx.draw(g, { proj: () => null }, 480, 270, gtm.stage.skyNow);
  const strike = fills.filter(f => /^rgba\(235,240,255,/.test(f.style) && f.w >= 480 && f.h >= 270).map(f => +f.style.match(/,([\d.]+)\)$/)[1]);
  // photo mode's shutter, on the UI layer
  const p = gtm.crew.ped; gtm.photo.enter(p); gtm.photo.shoot();
  const ui = []; gtm.photo.legend({ W: 480, H: 270, safe: [24, 14, 456, 256], fill: (x, y, w, h, c, a) => ui.push({ c, a, w, h }), prompt() {}, text() {} });
  const shutter = ui.filter(f => f.c === '#ffffff' && f.w >= 480 && f.h >= 270).map(f => f.a);
  const worst = Math.max(0, ...strike, ...shutter);
  assert.equal(worst, 0, `with flashes at ${game.settings.flashes} and reduce motion ${game.settings.motion}: the lightning still fills the screen white at alpha ${strike.join(', ') || '-'} (the sky's ambient lifted to ${gtm.stage.skyNow.ambient.toFixed(2)}), the photo shutter at ${shutter.join(', ') || '-'}`);
});
