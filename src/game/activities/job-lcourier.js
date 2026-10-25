// L Courier (PLAN.md 19's backlog, HANDOFF L4): the seventh job, and the one that rides the L. Up the stairs at Palm
// station on Motor Avenue, Overhead Express hands over a parcel: take the L to the station on the slip and step off
// there before the clock runs out, where their runner takes it, and another is waiting. Trains run a loop, down one
// track and back up the other: the platform whose train heads for the stop gets there sooner (a train the wrong way
// still gets there, round the end of the line). Level 1 is two parcels, level 2 three, level 3 four, the clocks
// tighter. Proves: a station's stairs, boarding a stopped train, riding it, getting off at a stop.
import { defActivity, TUNE } from '../../motor/index.js';

const BOSS = { name: 'Overhead Express', color: '#7ab8ff' };
const MAX = 4;   // (level 3's parcels; level n carries n + 1)
const count = m => Math.min(MAX, 1 + m.level);
const SLACK = [0, 1.7, 1.45, 1.25], GRACE = [0, 25, 18, 10];   // (a parcel's clock: the longest wait for a train, the ride stretched, and a grace)
const RUNNERS = ['office', 'tourist', 'jogger', 'retiree'];

const transit = m => m.fleet && m.fleet.transit;
// where the player stands now: the station's platform, or the nearest station on the street
function hereStation(m) {
  const T = transit(m), at = T.sideAt(m.player); if (at) return at.station;
  let best = null, bd = Infinity; for (const st of T.stations) for (const s of st.sides) { const d = Math.hypot(s.foot[0] - m.player.x, s.foot[1] - m.player.y); if (d < bd) { bd = d; best = st; } }
  return best;
}
// the seconds to ride from station a to b on the next train the right way: the loop's distance at the L's pace, its stops
function ride(m, a, b) {
  const T = transit(m), L = m.fleet.lines[0], st = T.stations.find(s => s.name === a); if (!L || !st) return 60;
  let best = Infinity;
  for (const sd of st.sides) {
    const s0 = L.nearest(sd.platform[0], sd.platform[1]);
    for (const q of L.stations) if (q.name === b) { const d = (((q.s - s0) % L.length) + L.length) % L.length, stops = L.stations.filter(o => { const k = (((o.s - s0) % L.length) + L.length) % L.length; return k > 1 && k < d; }).length; best = Math.min(best, d / TUNE.trainTop + stops * TUNE.trainDwell); }
  }
  return best;
}
// the longest wait on a platform for the next train: the loop's time (its run at the L's pace, each stop's dwell and the
// slowing and pulling away round it) over the trains on it (the wait, not the ride, is most of a parcel's time)
function headway(m) {
  const L = m.fleet.lines[0]; if (!L) return 0;
  const n = m.fleet.trains.filter(t => t.line === L).length || 1;
  return (L.length / TUNE.trainTop + L.stations.length * (TUNE.trainDwell + 3)) / n;
}
// parcel k's stop: another station than where it's picked up, picked as its stage comes and kept for a retry
function stopFor(m, k, from) {
  const D = m.data.stops || (m.data.stops = []); if (D[k]) return D[k];
  const names = transit(m).stations.map(s => s.name).filter(n => n !== from && n !== D[k - 1]);
  return (D[k] = names[Math.floor(m.rng.next() * names.length) % names.length]);
}
const neutral = m => { for (const g of ['saints', 'rats', 'gnomes']) m.truce(g); };   // (a courier on the L: nobody's business)
const offAt = (m, name) => { const T = transit(m), at = !m.player.onTrain && T.sideAt(m.player); return !!at && at.station.name === name; };

const parcelStage = k => ({
  id: 'parcel' + (k + 1),
  setup(m) {
    if (k >= count(m) || m.data['in' + k]) return;
    neutral(m);
    const from = m.data.from || (m.data.from = []); if (!from[k]) from[k] = k ? m.data.stops[k - 1] : hereStation(m).name;
    const to = stopFor(m, k, from[k]), st = transit(m).stations.find(s => s.name === to), sd = st.sides[k % st.sides.length];
    if (!m.one('runner' + k)) { const r = m.spawn.ped(RUNNERS[k % RUNNERS.length], [sd.platform[0], sd.platform[1] + 30], { tag: 'runner' + k, role: 'idle' }); r.place(sd.platform[0], sd.platform[1] + 30, st.z); }   // (Overhead Express's runner on the platform there)
  },
  *run(m) {
    if (k >= count(m) || m.data['in' + k]) return;
    const n = count(m), from = m.data.from[k], to = m.data.stops[k], walk = transit(m).sideAt(m.player) ? 0 : 20;
    const T = m.timer(Math.round(GRACE[m.level] + walk + headway(m) + ride(m, from, to) * SLACK[m.level]), { label: 'PARCEL', reason: 'the parcel\'s late' });
    m.objective(`Parcel ${k + 1} of ${n}: take the L to ${to}`, { hint: { kind: 'rail', to } });
    yield Object.assign(m.waitUntil(mm => offAt(mm, to)), { nav: mm => { const st = transit(mm).stations.find(s => s.name === to); return st ? st.sides[0].top : null; } });
    m.data.spare = Math.min(m.data.spare ?? 1e9, T.left); T.stop(); m.data['in' + k] = true;
    if (k < n - 1) yield m.say([['Overhead Express? Ta. Here\'s the next one.', 'Right on time. This one\'s going further.', 'Signed for. Another\'s come in.'][k % 3]], BOSS);
    else yield m.say(['That\'s the round. Overhead Express thanks you.'], BOSS);
  },
});

defActivity('job_lcourier', {
  title: 'L Courier', kind: 'job', levels: 3, start: { at: 'l-palm', foot: true, radius: 20 },
  brief: ['Overhead Express: parcels across Lowtown by the L.', 'Up the stairs, aboard, off at the stop. More parcels, less time.'],
  rewardsFor: level => ({ cash: [0, 400, 850, 1400][level] || 400 }),
  bonus: [{ id: 'spare', text: 'Every parcel with 15 s to spare', check: m => (m.data.spare ?? 0) >= 15 }],
  stages: [
    { id: 'shift', setup(m) { neutral(m); }, *run(m) { yield m.say([`Overhead Express. ${count(m)} parcels on the round.`, 'Up the stairs, on the L, off at the stop.'], BOSS); } },
    ...Array.from({ length: MAX }, (_, k) => parcelStage(k)),
  ],
});
