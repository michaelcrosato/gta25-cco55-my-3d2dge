// The pause (PLAN.md 8.18): MAP, BRIEF, STATS, SETTINGS and HELP in tabs over the game, which stands still under it
// (MOTOR's own pause: the screens hold the scene in the step). ○ resumes, Options closes everything, and QUIT asks
// first. The MAP is the first tab, and the map button (the touchpad, M, Tab) opens the pause on it.
import { all, List, Cards, UI, tabbedScreen, mapPage, settingsScreen, guideScreen, confirmScreen, SETTING_TABS, completion } from '../../motor/index.js';
import { GUIDE } from './guide.js';

/** where the map's blips come from, by kind (the □ filter's order) */
export const MAP_FILTERS = [['all', 'ALL'], ['jobs', 'JOBS'], ['activities', 'ACTIVITIES'], ['shops', 'SHOPS'], ['property', 'PROPERTY'], ['services', 'SERVICES']];
const SERVICES = { safehouse: ['square', '#7af0ff'], hospital: ['circle', '#ff5a5a'], police: ['triangle', '#5a9aff'] };
const clock = s => { s = Math.floor(s || 0); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`; };

/** every blip on the big map: the career's (jobs, activities, a running job's markers), the shops, the properties, the
 *  safehouse, the hospital and the precinct; each with its kind for the filter */
export function mapBlips(city, career) {
  const out = [];
  for (const b of career.blips({ waypoint: false })) out.push({ ...b, cat: b.shape === 'flag' ? 'activities' : 'jobs' });
  for (const s of all('shops')) { const q = city.poi(s.poi); if (q) out.push({ x: q.x, y: q.y, shape: 'square', color: s.color, cat: 'shops', label: s.name }); }
  for (const p of all('properties')) { const q = city.poi(p.poi); if (q) out.push({ x: q.x, y: q.y, shape: 'diamond', color: career.econ.owned(p.id) ? '#5aff8a' : '#2a8a4a', cat: 'property', label: p.name }); }
  for (const q of city.pois) { const s = SERVICES[q.kind]; if (s) out.push({ x: q.x, y: q.y, shape: s[0], color: s[1], cat: 'services', label: q.label }); }
  return out;
}
/** the map's legend: each kind of blip as it looks */
export function mapLegend() {
  return [{ shape: 'diamond', color: '#5af0ff', label: 'Saints job' }, { shape: 'triangle', color: '#ffd23a', label: 'Rats job' }, { shape: 'circle', color: '#ff8ac8', label: 'Gnomes job' },
    { shape: 'square', color: '#ffe066', label: 'Crew job' }, { shape: 'flag', color: '#5af0ff', label: 'Activity' }, { shape: 'square', color: '#ffa23a', label: 'Shop' },
    { shape: 'diamond', color: '#5aff8a', label: 'Property' }, { shape: 'square', color: '#7af0ff', label: 'Safehouse' }];
}

/** w: the play scene's game, as the pause reads it: { city, turf, career, crew, save, player() ({ x, y, facing }),
 *  quitToTitle() }; o: { tab ('map' ...), reason (the engine's: 'controller' when one was unplugged) } */
export function pauseScreen(app, w, o = {}) {
  const S = app.ui.screens, C = w.career;
  const map = mapPage(app, { city: w.city, turf: w.turf, blips: () => mapBlips(w.city, C), player: w.player, waypoint: () => C.waypoint, onWaypoint: at => { C.waypoint = at; }, filters: MAP_FILTERS, legend: mapLegend() });
  const briefItems = () => [
    { label: 'RESUME', act: () => S.closeAll() },
    ...(C.R.active ? [{ label: 'QUIT THE JOB', act: () => S.open(confirmScreen(S, { title: 'QUIT THE JOB?', lines: ['It can be started again from its ring'], yes: 'QUIT IT', onYes: () => { S.closeAll(); C.R.quit('player'); } })) }] : []),
    { label: 'QUIT TO TITLE', act: () => S.open(confirmScreen(S, { title: 'QUIT TO THE TITLE?', lines: ['Anything since the last save is lost'], yes: 'QUIT', onYes: () => w.quitToTitle() })) },
  ];
  const brief = {
    w: 380, list: new List({ id: 'brief', items: briefItems() }), enter() { brief.list.set(briefItems()); },
    get info() {
      const R = C.R;
      if (R.active && R.spec) return [{ text: String(R.spec.title || '').toUpperCase(), color: UI.accent }, ...(R.spec.brief || []).slice(0, 4), { text: 'NOW: ' + (R.objective ? R.objective.text : '...'), color: UI.cyan }];
      const n = C.available().length;
      return [{ text: 'FREE ROAM', color: UI.accent }, `${n} job${n === 1 ? '' : 's'} on offer: the rings on the map`, `Completion ${completion(w.save).pct.toFixed(1)}%`];
    },
  };
  const statCards = () => {
    const c = completion(w.save);
    return [{ title: 'COMPLETION', value: c.pct.toFixed(1) + '%', color: UI.accent }, { title: 'CASH', value: '$' + w.crew.fund.toLocaleString('en-US'), color: UI.green }, { title: 'PLAY TIME', value: clock(w.save.playtime) },
      ...c.items.map(q => ({ title: q.label.toUpperCase(), value: `${q.done}/${q.of}`, color: q.of && q.done >= q.of ? UI.green : UI.ink, sub: q.of && q.done >= q.of ? 'ALL DONE' : '' }))];
  };
  const stats = { w: 400, cards: new Cards({ id: 'stats', cols: 3 }), cardH: 52, cardsH: 2 * 52 + 8, legend: '{menu:left}{menu:right} MORE', enter() { stats.cards.cards = statCards(); } };
  const settings = { w: 300, list: new List({ id: 'pause-settings', items: SETTING_TABS.map((t, i) => ({ label: t.label, act: () => S.open(settingsScreen(app, { tab: i })) })) }) };
  const help = { w: 300, list: guideScreen(app, { topics: GUIDE }).list };
  const scr = tabbedScreen({ id: 'pause', title: o.reason === 'controller' ? 'CONTROLLER UNPLUGGED' : 'PAUSED', pause: true, legend: '{menu:back} RESUME',
    tabs: [{ id: 'map', label: 'MAP', page: map }, { id: 'brief', label: 'BRIEF', page: brief }, { id: 'stats', label: 'STATS', page: stats }, { id: 'settings', label: 'SETTINGS', page: settings }, { id: 'help', label: 'HELP', page: help }] });
  return o.tab ? scr.show(o.tab) : scr;
}
