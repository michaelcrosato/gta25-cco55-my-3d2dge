// The Pumper (PLAN.md 9.6): Lowtown's fire engine, the truck that comes to car and prop fires (and the Firefighter
// job's). A cab-over crew cab with a white roof and a light bar, a tall pump body behind with roll-up lockers along both
// flanks, a ground ladder on top over the hose bed, the water cannon's turret on the roof just behind the cab (where the
// Fleet's jet leaves from), beacons at the back corners, six wheels: a steering front axle and a tandem of duals.
//   Drawing: the renderer paints the core roles (wheel, body, glass, cabin) in that order and never by depth, so a box
// painted late shows wherever it lands, even where an earlier one should hide it (a long truck seen from its far end
// shows it most). So the masses and the side details are all core parts, each painted after what it covers and placed
// so that its hidden faces land under something painted later:
//   - the hubs are wheel parts below the bodies' lower edge (low), where nothing painted later reaches them;
//   - the bumpers come before the bodies they meet, so a body hides what it covers of them;
//   - the lockers, the rear locker and the cab's stripe are glass parts (in their own colours) painted before the cab's
//     windows, the top band and the roof, which cover the far flank's ones whenever the far flank is the hidden one;
//   - the top band and lid (in the paint), the roof, the hose bed, the ladder and the turret are cabin parts, each on top
//     of everything below it, so painting them last is right from every side, MODE 7 too.
// Only the lamps (light, tail), the bumpers and the bar and beacons (siren) are left to the renderer's own placement.
import { def } from '../../motor/index.js';

const L = 88, W = 31, H = 34, r = 6.5;
const hl = L / 2, hw = W / 2;
const P = (box, color, role = 'body') => ({ box, color, role });
const RED = '#ce2029', WHITE = '#ececf0', GLASS = '#2e3a4a', ALU = '#b4b8c2', CHROME = '#d0d4dc', LADDER = '#c8ccd4', BEACON = '#d02828', DARK = '#3a3a44';
const cab0 = 17.5, pump1 = cab0 - 1;   // the cab's back, the pump body's front (a seam between them)
const low = 7.5, sill = 18, roof = 28, band = 21, top = 25;   // the bodies' lower edge, the cab's window sill and roof; the pump body's top band and its top
const FRONT = 29.5, REARS = [-7.5, -22.5];   // the axles: wheelbase 44.5 to the tandem's middle, the centre of mass 2/3 of the way back (the tank's weight)
const flank = (s, a, b) => (s < 0 ? [-hw - b, -hw - a] : [hw + a, hw + b]);   // a span just outside one flank (s -1 left, 1 right)

// the wheels: a tyre each side of each axle (the tandem's duals wider), a chrome hub on each
const tyres = [], hubs = [];
for (const [x, dual] of [[FRONT, false], ...REARS.map(q => [q, true])]) for (const s of [-1, 1]) {
  const [ya, yb] = s < 0 ? [-hw - .8, -hw + (dual ? 5 : 4)] : [hw - (dual ? 5 : 4), hw + .8], [ha, hb] = flank(s, .8, 1.1);
  tyres.push(P([x - r, ya, 0, x + r, yb, r * 1.6], '#1a1a20', 'wheel'));
  hubs.push(P([x - 2.6, ha, 1.6, x + 2.6, hb, 6.8], CHROME, 'wheel'));
}
// the roll-up lockers along each flank: behind the tandem, over it (two), and two between it and the cab; the cab's stripe
const lockers = [], stripe = [];
for (const s of [-1, 1]) {
  const [ya, yb] = flank(s, 0, .4);
  for (const [x0, x1, z0, z1] of [[-43, -31, 9, band], [-30, -16.5, 12, band], [-15.5, -1.5, 12, band], [-.5, 7, 9, band], [8, 15, 9, 20]]) lockers.push(P([x0, ya, z0, x1, yb, z1], ALU, 'glass'));
  stripe.push(P([cab0, ya, 13, hl, yb, 14.5], WHITE, 'glass'));
}
stripe.push(P([hl, -hw, 13, hl + .4, hw, 14.5], WHITE, 'glass'));
// the ladder: rungs between two rails, on two brackets and the hose bed
const rungs = [];
for (let x = -40; x <= -5; x += 3.5) rungs.push(P([x - .5, -3.6, top + 1.4, x + .5, 3.6, top + 2.4], '#a8acb4', 'cabin'));

def('vehicleModels', 'pumper', {
  name: 'Pumper', class: 'truck', length: L, width: W, height: H,
  parts: [
    ...tyres, ...hubs,
    P([hl - .5, -hw + 1, 4, hl + 2, hw - 1, 8.5], CHROME, 'bumper'),
    P([cab0, -hw, low, hl, hw, sill], RED),   // the cab, up to its window sill
    P([-hl - 2, -hw + 1, 4, -hl + .5, hw - 1, 6.5], '#5a5a62', 'bumper'),   // the rear step
    P([-hl, -hw, low, pump1, hw, band], RED),   // the pump body, up to its top band
    ...lockers, ...stripe,
    P([-hl - .4, -9, 9, -hl, 9, band], ALU, 'glass'),   // the rear locker
    P([cab0 + 1.5, -hw + 1.5, sill, hl - .5, hw - 1.5, roof], GLASS, 'glass'),   // the cab's windows all round
    { ...P([-hl, -hw, band, pump1, hw, top], RED, 'cabin'), paint: true },   // the pump body's top band and lid
    P([cab0 + 1, -hw + 1, roof, hl - .5, hw - 1, roof + 2], WHITE, 'cabin'),   // the cab's roof
    P([-43.5, -13, top, -25, 13, top + .8], '#2a2c34', 'cabin'),   // the hose bed
    P([-20, -5.5, top, -18.5, 5.5, top + .8], DARK, 'cabin'), P([-8, -5.5, top, -6.5, 5.5, top + .8], DARK, 'cabin'),   // the ladder's brackets
    ...rungs,
    P([-42, -5, top + .8, -3, -3.6, top + 2.8], LADDER, 'cabin'), P([-42, 3.6, top + .8, -3, 5, top + 2.8], LADDER, 'cabin'),   // the ladder's rails
    P([1, -3.5, top, 8, 3.5, top + 2.5], DARK, 'cabin'), P([2, -2.5, top + 2.5, 7, 2.5, top + 5.5], '#4a4a54', 'cabin'),   // the turret: its base and head
    P([6, -1.2, top + 3.5, 13, 1.2, top + 5.5], '#d8a838', 'cabin'), P([13, -1.6, top + 3.2, 14.5, 1.6, top + 5.8], '#b88a28', 'cabin'),   // the cannon's barrel and nozzle, aimed ahead
    P([hl - .2, -13.5, 9, hl + .4, -10, 12], '#fff4c8', 'light'), P([hl - .2, 10, 9, hl + .4, 13.5, 12], '#fff4c8', 'light'),
    P([-hl - .5, -hw + .5, 16, -hl, -hw + 3.5, 21], '#8a1a1a', 'tail'), P([-hl - .5, hw - 3.5, 16, -hl, hw - .5, 21], '#8a1a1a', 'tail'),   // (high in the corners: lamps are painted last, and from ahead what shows of these falls on the dark hose bed)
    P([36, -12, roof + 2, 40, -.5, roof + 4.5], BEACON, 'siren'), P([36, .5, roof + 2, 40, 12, roof + 4.5], BEACON, 'siren'),   // the light bar
    P([-44, -hw + .5, top, -41.5, -hw + 3, top + 2.2], BEACON, 'siren'), P([-44, hw - 3, top, -41.5, hw - .5, top + 2.2], BEACON, 'siren'),   // the beacons
  ],
  wheels: [FRONT, ...REARS].flatMap(x => [-1, 1].map(s => ({ x, y: s * (hw - 1.5), r, steer: x === FRONT }))),
  seats: [{ x: 30, y: -5 }, { x: 30, y: 5 }],
  doors: [{ id: 'fl', x: 30, y: -hw - 6, side: -1, seat: 0 }, { id: 'fr', x: 30, y: hw + 6, side: 1, seat: 1 }],
  lights: { head: [[hl, -11.75, 10.5], [hl, 11.75, 10.5]], tail: [[-hl, -hw + 2, 18.5], [-hl, hw - 2, 18.5]], siren: [[38, 0, roof + 3]] },
  nozzle: [14.5, 0, top + 4.5],   // (the cannon's mouth: the jet leaves from here)
  about: 'A cab-over fire engine: a crew cab with a light bar, a pump body with lockers down both sides, a ladder on top and the water cannon behind the cab.',
});

// Heavy, slow off the line and slow to turn in (the wheel takes half a second to full lock). The brakes out-pull the
// tyres, so it stops on its grip (about 280 u/s²) and a quarter longer in the wet. All-wheel drive (a 6x6) and the
// tank's weight on the tandem keep it planted at full lock; the lock fades hard with speed, so its turning circle is
// about a Cortez's at a crawl and more than twice one at 150 u/s.
def('vehicles', 'pumper', {
  name: 'Pumper', model: 'pumper', class: 'truck', role: 'fire', seats: 2, radio: 'off', health: 220, toughness: .8,
  siren: true, horn: 'truck', tool: 'cannon',
  palette: ['#ce2029', '#c2df2a'],
  handling: { mass: 4200, top: 181, accel: 44, brake: 460, grip: 276, drift: .25, steer: .66, steerFade: .8, steerRate: 1.2, drive: 'awd',
    wheelbase: 44.5, cg: .663, cgHeight: .35, rolling: 0 },   // (wheelbase and cg: the model's axles)
  spec: { t100: 2.8, top: 180, brake100: 17 },
  tags: ['fire', 'service', 'emergency'],
  about: 'Lowtown FD\'s pumper: 4.2 tonnes of water and ladder on six wheels, a siren and a water cannon that knocks people flat.',
});
