// The Proving Ground's UI gallery and jukebox (PLAN.md 8.23): every 10-foot screen the game shows, opened one at a time
// over the Proving Ground's town (the play scene's own, its HUD under them), in each glyph set (PlayStation, Xbox,
// Nintendo, the keyboard's keys); and the jukebox: every station, every song and every effect, to hear.
//   - the gallery is a screen of its own: SCREENS (GLYPHS picks the set; a row each opens its screen, back returns),
//     STATIONS, SONGS and EFFECTS (confirm plays one; the same again stops it);
//   - ?selftest=1 opens every screen in every glyph set and checks each drawn frame against the 10-foot rules
//     (auditRecord: tools/ui-audit.mjs's), then has every station's segments laid out, every song composed with notes
//     in it, and every effect defined and played.
import { all, get, handle, List, UI, tabbedScreen, settingsScreen, layoutScreen, rebindScreen, slotsScreen, guideScreen, confirmScreen, devScreen, knobScreen, sections, Overlays,
  REBIND, SETTING_TABS, PROMPTS, auditRecord, stationTimeline, parseSong, compose, Sequencer, SOUNDS, WEATHERS } from '../../motor/index.js';
import { labZone } from './lab-zones.js';
import { creditsScreen } from '../ui/credits.js';
import { GUIDE } from '../ui/guide.js';

const STYLES = [['playstation', 'PLAYSTATION'], ['xbox', 'XBOX'], ['nintendo', 'NINTENDO'], ['keyboard', 'KEYBOARD']];
// every screen, by name: how to open it (over the gallery: back comes home)
function stops(app, play) {
  const S = app.ui.screens, C = handle.career, p = () => handle.crew.ped;
  return [
    ['the HUD', null],
    ...SETTING_TABS.map((t, i) => ['settings: ' + t.label.toLowerCase(), () => S.open(settingsScreen(app, { tab: i }))]),
    ['button layout', () => S.open(layoutScreen(app))],
    ...REBIND.map(([ctx, name]) => ['rebind ' + name.toLowerCase(), () => S.open(rebindScreen(app, ctx))]),
    ['save slots', () => C.saveScreen()],
    ['load slots', () => S.open(slotsScreen(app, { mode: 'load', saves: C.saves, onLoad: () => S.back() }))],
    ['how to play', () => S.open(guideScreen(app, { id: 'help', title: 'HOW TO PLAY', topics: GUIDE }))],
    ['a help page', () => { S.open(guideScreen(app, { id: 'help', title: 'HOW TO PLAY', topics: GUIDE })); S.top.list.items[0].act(); }],
    ['credits & about', () => S.open(creditsScreen())],
    ['a question', () => S.open(confirmScreen(S, { title: 'QUIT TO THE TITLE?', lines: ['Anything since the last save is lost'], yes: 'QUIT', onYes: () => S.back() }))],
    ...['map', 'brief', 'stats', 'settings', 'help'].map(t => ['pause: ' + t, () => S.open(play.pauseScreen(t))]),
    ['phone', () => C.phone()], ['phone: contacts', () => C._contacts()], ['phone: cabs', () => C._cabs()], ['phone: texts', () => C._texts()], ['phone: jobs', () => C._jobs()],
    ['a job\'s card', () => C._jobCard(all('missions')[0])], ...(all('activities').length ? [['an activity\'s card', () => C._activityCard(all('activities')[0])]] : []),
    ['a shop', () => C._shopCard(get('shops', 'lead-farm') || all('shops')[0], { ped: p() })],
    ['the dev menu', () => S.open(devScreen(app, { overlays: new Overlays(), world: { hour: () => 12, setHour: () => {}, weather: () => 'clear', weathers: WEATHERS, setWeather: () => {}, stars: () => 0, setStars: () => {} }, go: { zones: all('provingZones').map(z => z.id), zone: () => {} } }))],
    ['a tuning page', () => S.open(knobScreen(app, sections()[0]))],
  ];
}
// the symbols: a pad family (shown as if a pad were in use), or the keys
function glyphs(app, style) { const I = app.game.input; PROMPTS.keys = style === 'keyboard'; if (style !== 'keyboard') { I.glyphs = style; I.lastDevice = 'gamepad'; } else I.lastDevice = 'keyboard'; }

labZone('ui', 'UI gallery and jukebox', {
  hold: { trafficCars: 8, crowdDensity: .5 },
  enter: (app, play) => {
    const S = app.ui.screens, I = app.game.input, Z = { style: 'playstation', kept: { keys: PROMPTS.keys, glyphs: I.glyphs, dev: I.lastDevice }, seq: null, playing: null, results: [], self: app.links.query.get('selftest') === '1' };
    const list = stops(app, play);
    const songs = all('stations').flatMap(st => (st.songs || []).map((q, i) => ({ st, i, title: q.title, artist: q.artist })));
    const A = () => { const a = app.game.audio; if (a && a.bus && !a.ctx && !a.failed) a.bus('sfx'); return a && a.ready && a.ctx ? a : null; };   // (the context made at a key or a tap)
    const stop = () => { if (Z.playing) { Z.playing.q.stop(); Z.playing = null; } };
    const playSong = (key, song) => { const a = A(); if (!a) return; if (Z.playing && Z.playing.key === key) return stop(); stop(); Z.seq ||= new Sequencer(a.ctx, a.bus('music')); Z.playing = { key, q: Z.seq.play(song, { loop: true }) }; };
    const sfx = name => { const a = A(); if (!a) return; for (const [k, v] of Object.entries(SOUNDS)) if (!a.presets || !a.presets[k]) a.define(k, v); a.sfx(name); };
    const effects = [...Object.keys(app.game.audio && app.game.audio.presets || {}), ...Object.keys(SOUNDS)].filter((k, i, a) => a.indexOf(k) === i);
    Z.stops = list; Z.effects = effects; Z.songs = songs;
    const screens = new List({ id: 'gallery', color: UI.pink, items: [
      { kind: 'choice', label: 'GLYPHS', help: 'Every prompt in these symbols', get: () => Z.style, set: v => { Z.style = v; glyphs(app, v); }, options: STYLES },
      ...list.map(([name, open]) => ({ label: name.toUpperCase(), act: () => { if (open) open(); else { Z.hudT = 5; S.closeAll(); } } }))] });   // (the HUD: five seconds with nothing over it)
    const stations = new List({ id: 'jukebox-stations', color: UI.pink, items: all('stations').map(st => ({ label: st.name, right: st.freq || '', help: st.about || st.genre, act: () => { const tl = stationTimeline(st); playSong('station:' + st.id, tl.segs[0].song); } })) });
    const songList = new List({ id: 'jukebox-songs', color: UI.pink, items: songs.map(q => ({ label: q.title.toUpperCase(), right: q.st.name, help: q.artist || '', act: () => playSong('song:' + q.st.id + q.i, parseSong(compose(q.st.genre, (q.st.seed || 1) * 7919 + 104729 + q.i * 31, q.title))) })) });
    const fx = new List({ id: 'jukebox-effects', color: UI.pink, items: effects.map(k => ({ label: k.replace(/([A-Z])/g, ' $1').toUpperCase(), act: () => sfx(k) })) });
    Z.gallery = () => Object.assign(tabbedScreen({ id: 'gallery', title: 'UI GALLERY AND JUKEBOX', color: UI.pink, w: 400, back: () => true,
      tabs: [{ id: 'screens', label: 'SCREENS', page: { list: screens, tips: true } }, { id: 'stations', label: 'STATIONS', page: { list: stations } }, { id: 'songs', label: 'SONGS', page: { list: songList } }, { id: 'effects', label: 'EFFECTS', page: { list: fx } }] }), { sticky: true });   // (the zone is the gallery: back and Options leave it up)
    Z.home = () => { S.closeAll(); if (handle.career) handle.career.card = null; if (!Z.self) S.open(Z.gallery()); };
    Z.stopMusic = stop;
    glyphs(app, Z.style); Z.home();
    return Z;
  },
  update: (dt, app, play, Z) => {
    if (Z.style !== 'keyboard') app.game.input.lastDevice = 'gamepad';   // (the pad's symbols while the gallery shows them, whatever was pressed)
    if (Z.seq) Z.seq.tick();
    if (Z.hudT > 0) Z.hudT -= dt; else if (!Z.self && !app.ui.screens.isOpen) Z.home();   // (the gallery is always under what it opened)
  },
  exit: (app, play, Z) => { Z.stopMusic(); const I = app.game.input; PROMPTS.keys = Z.kept.keys; I.glyphs = Z.kept.glyphs; I.lastDevice = Z.kept.dev; },
  hud: (app, play, Z) => [`GLYPHS ${Z.style.toUpperCase()}  ${Z.stops.length} SCREENS  ${all('stations').length} STATIONS  ${Z.songs.length} SONGS  ${Z.effects.length} EFFECTS`, ...(Z.playing ? ['PLAYING ' + Z.playing.key.toUpperCase()] : [])],
  snapshot: (app, play, Z) => ({ ui: Z.results.length, failed: Z.results.filter(r => r.bad.length).map(r => r.name) }),
  // ?selftest=1: each screen opened in each glyph set, its frame audited three frames on; then the jukebox's songs and
  // effects
  selftest: (st, app, play, Z) => {
    const S = app.ui.screens, T = Z.T || (Z.T = { k: -1, wait: 0, order: STYLES.flatMap(([style]) => Z.stops.map(([name, open]) => ({ style, name, open }))) });
    if (T.k >= 0 && T.k < T.order.length) {
      if (++T.wait < 4) return null;
      const s = T.order[T.k], R = app.ui.record(), bad = s.threw ? ['it threw: ' + s.threw] : auditRecord(R);
      if (s.open && !R.screen && !s.threw) bad.unshift('nothing open');
      Z.results.push({ name: `${s.style} ${s.name}`, screen: R.screen, bad });
    }
    if (++T.k < T.order.length) {
      const s = T.order[T.k]; S.closeAll(); if (handle.career) handle.career.card = null; glyphs(app, s.style); Z.style = s.style;
      try { if (s.open) s.open(); } catch (e) { s.threw = e.message; }
      T.wait = 0; return null;
    }
    S.closeAll();
    // the jukebox: every station laid out (a segment at least, every song with notes), every effect defined and played
    let segs = 0, empty = [], fx = 0, fxBad = [];
    for (const stn of all('stations')) { const tl = stationTimeline(stn); segs += tl.segs.length; for (const q of tl.segs) if (!q.song || !q.song.length) empty.push(`${stn.id}: ${q.kind}`); }
    const a = app.game.audio;
    for (const k of Z.effects) { try { if (SOUNDS[k] && a && a.define) a.define(k, SOUNDS[k]); if (a && a.sfx) a.sfx(k, { vol: 0 }); fx++; } catch (e) { fxBad.push(k); } }
    const failed = Z.results.filter(r => r.bad.length);
    const checks = [{ check: `${Z.stops.length} screens x ${STYLES.length} glyph sets audited`, value: `${Z.results.length - failed.length}/${Z.results.length} clean`, ok: !failed.length && Z.results.length === T.order.length },
      ...failed.map(r => ({ check: r.name, value: r.bad.slice(0, 2).join('; '), ok: false })),
      { check: 'stations laid out, every segment with music', value: `${all('stations').length} stations, ${segs} segments`, ok: !empty.length && segs > 0 },
      { check: 'songs composed', value: Z.songs.length, ok: Z.songs.every(q => parseSong(compose(q.st.genre, 1, q.title)).length > 0) },
      { check: 'effects played', value: `${fx}/${Z.effects.length}`, ok: !fxBad.length }];
    return { ok: checks.every(c => c.ok), checks };
  },
});
