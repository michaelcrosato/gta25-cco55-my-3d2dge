// IM1 · Holy Scrap (EXPANSION.md 4, X3): the Rust Monks' first job, from their payphone by the Scrap Cathedral.
// Brother Ferrous has blessed three wrecks about Ironside (dumped at the kerb where they died: on Forge Street, River
// Road and Ironside Avenue), and blessed scrap belongs in the Cathedral's crusher. He lends the Monks' Hookline: hook
// each wreck and tow it to the Cathedral yard's gate on Loop Avenue, one at a time. Proves: the tow (the Hookline's
// hook), several targets.
//   Each wreck's stage puts what it needs back (the truck, the wreck where it was dumped at the kerb: the truck backs in
//   on it at a slant from the lane beside it); one already in is passed over.
import { defMission } from '../../motor/index.js';

const FERROUS = { name: 'Brother Ferrous', color: '#d8903a' };
// the Cathedral's yard gate on Loop Avenue (two-way: reached from either way; the crusher's own gate, on Crusher Lane
// one way east, had a truck from the east tow round the whole map to it); in: the wreck within a truck's length of it,
// on the hook behind the truck pulled up there, in either carriageway
const GATE = [752, 904], IN = 130;
const WRECKS = [
  { at: [512, 1120], def: 'cortez', color: '#6a5a4a', where: 'on Forge Street' },
  { at: [800, 1600], def: 'brute', color: '#4a4a52', where: 'on River Road' },
  { at: [1024, 1488], def: 'cruiser', color: '#3a4458', where: 'on Ironside Avenue, south of the Flyover' },
];
const truckSpot = m => (m.data.truckAt ||= (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb('phone-monks')));
const inTruck = m => !!m.vehicle && m.vehicle === m.one('truck');
// the Hookline: where it was left, or at its curb by the payphone (a deep link, a wreck of a truck)
function truck(m) {
  const t = m.one('truck'); if (t && t.damage.share > .3) { if (!inTruck(m) && m.dist(t) > 400) m.place('player', { in: t }); return t; }
  if (t) m.remove(t);
  const q = truckSpot(m), v = m.spawn.vehicle('hookline', q, { tag: 'truck', heading: q.heading, color: '#c8642a' });
  m.place('player', { in: v }); return v;
}
// wreck k: hooked and towed to the gate
const wreckStage = (w, k) => ({
  id: 'wreck' + (k + 1),
  setup(m) {
    if (m.data['in' + k]) return;
    truck(m);
    if (!m.one('wreck' + k)) { const q = m.data['at' + k] ||= (c => ({ x: Math.round(c.x), y: Math.round(c.y), heading: +c.heading.toFixed(3) }))(m.curb(w.at)); m.spawn.vehicle(w.def, q, { tag: 'wreck' + k, heading: q.heading, color: w.color, health: .45 }); }   // (smoking, dented: past driving, short of burning; at the kerb, where it died: left in the lane, the traffic shoved it down the street into a junction and wrecked it for good)
    const v = m.one('wreck' + k); if (v && v.damage) v.damage.toughness = 0;   // (while it's the job's, nothing more can happen to it: a wreck that burnt out on the hook would be a job no one could finish)
    m.failIf(mm => !inTruck(mm) && !mm.one('truck'), 'the Hookline\'s a wreck');
    m.failIf(mm => !mm.data['in' + k] && !mm.one('wreck' + k), 'that wreck is past even a blessing');
  },
  *run(m) {
    if (m.data['in' + k]) return;
    const tag = 'wreck' + k;
    m.objective(`Hook the blessed wreck ${w.where} and tow it to the Scrap Cathedral's gate on Loop Avenue (${k + 1} of ${WRECKS.length})`, { hint: { kind: 'deliver', what: tag, to: GATE, tow: 'truck' } });
    m.marker(GATE, { color: '#d8903a', r: 28 });
    yield Object.assign(m.waitUntil(mm => { const c = mm.one(tag); return !!c && !!c.towedBy && Math.hypot(c.x - GATE[0], c.y - GATE[1]) < IN; }), { nav: mm => { const c = mm.one(tag); return c && !c.towedBy ? c : GATE; } });
    m.data['in' + k] = true; m.remove(m.one(tag));   // (the crusher's: off the hook)
    yield m.say([['Into the crusher with it. Rest in pieces.', 'Bless this scrap. Next.', 'Three for the crusher. The Lord compacts.'][k]], FERROUS);
  },
});

defMission('monks_holy_scrap', {
  title: 'Holy Scrap', giver: { phone: 'monks' }, gang: 'monks', tier: 1, requires: ['heist_big_withdrawal'], district: 'ironside',
  brief: ['Brother Ferrous has blessed three wrecks about Ironside.', 'Tow each to the Scrap Cathedral\'s crusher in the Monks\' Hookline.'],
  rewards: { cash: 3000, respect: { monks: 15, volts: -5 } },
  bonus: [{ id: 'time', text: 'Under 7:00', check: m => m.elapsed < 420 }, { id: 'truck', text: 'The Hookline above 80%', check: m => { const t = m.one('truck'); return !!t && t.damage.share > .8; } }],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['Brother Ferrous of the Rust Monks. Peace be upon your bumpers.', 'Three wrecks lie about Ironside, blessed and waiting.', 'Take our Hookline. The crusher hungers.'], FERROUS);
    } },
    ...WRECKS.map(wreckStage),
    { id: 'amen', setup() {}, *run(m) { yield m.say(['The Nail Gun is yours to buy at Lead Farm, brother. Tell them the Monks sent you.'], FERROUS); } },
  ],
});
