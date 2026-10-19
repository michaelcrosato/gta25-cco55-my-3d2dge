// S1 · Holy Rollers (PLAN.md 9.4): the Chrome Saints' first job, from their payphone outside Club Chrome. Father Fender
// wants three cars blessed by midnight: a Zephyr GT by Palm Park, a chrome Saint at the Fish Market (somebody's at its
// wheel), the Gnomes' Brute outside Gutterball Lanes. Each goes into the Saints' garage at Club Chrome above 60% of its
// health, or the blessing is off. Proves: several targets, parked cars and a carjack, damage, the garage drop-off.
// The reference mission for the content recipe (docs/CONTENT-GUIDE.md): each stage's setup restores what it needs
// (the car it is about, the player near enough to it), so a retry or #mission/saints_holy_rollers/<stage> starts it.
import { defMission } from '../../motor/index.js';

const GARAGE = 'saints-hq';
const CARS = [
  { tag: 'zephyr', def: 'zephyr', near: 'palm-park', color: '#e8e8ec', text: 'Steal the Zephyr GT by Palm Park' },
  { tag: 'saint', def: 'saint', near: 'fish-market', color: '#c8c8d0', driver: 'docker', text: 'Take the Saint at the Fish Market' },
  { tag: 'brute', def: 'brute', near: 'gnomes-hq', color: '#8ad02a', text: 'Steal the Gnomes\' Brute at Gutterball Lanes' },
];
// a car's stage: the car parked (or idling) where it waits, unless it is still about; then in, and to the garage
const carStage = (c, i) => ({
  id: c.tag,
  setup(m) {
    const v = m.ensure.vehicle(c.tag, c.def, m.curb(c.near), { color: c.color, driver: c.driver || null });
    if (v.damage.share < .6) v.damage.repair();   // (a retry: the car again as it was)
    if (i > 0 && m.dist(GARAGE) > 900 && m.dist(v) > 900) m.place('player', GARAGE);   // (a deep link: at the garage, where the last one was left)
  },
  *run(m) {
    yield m.enter(c.tag, { text: c.text });
    yield m.deliver({ what: c.tag, to: GARAGE, radius: 60, stopped: true, health: .6, damaged: 'the car is a wreck: no blessing', text: 'To the Saints\' garage at Club Chrome (above 60%)' });
    m.data.health = Math.min(m.data.health ?? 1, m.one(c.tag).damage.share);
    m.remove(m.one(c.tag));   // (the garage takes it)
    yield m.say(i < 2 ? ['Bless this ride.', `${2 - i} to go.`] : ['Three for three. The Lord drives a Zephyr.'], { name: 'Father Fender', color: '#5af0ff' });
  },
});

defMission('saints_holy_rollers', {
  title: 'Holy Rollers', giver: { phone: 'saints' }, gang: 'saints', tier: 1, requires: ['prologue'],
  brief: ['Father Fender needs three cars blessed by midnight.', 'Above 60%, or the blessing is off.'],
  rewards: { cash: 2500, respect: { saints: 15, rats: -5 } },
  bonus: [{ id: 'time', text: 'Under 8:00', check: m => m.elapsed < 480 }, { id: 'clean', text: 'Every car above 90%', check: m => (m.data.health ?? 0) > .9 }],
  stages: [
    { id: 'call', setup() {}, *run(m) { yield m.say(['My son. Three cars need blessing tonight.', 'Bring them to the garage. Gently.'], { name: 'Father Fender', color: '#5af0ff' }); } },
    ...CARS.map(carStage),
  ],
});
