// The weather (PLAN.md 8.6): clear, overcast, rain, storm (lightning) and fog, each lasting 1-3 game hours, the next
// drawn from the 'weather' RNG stream. The ground wets while it rains and dries after; vehicles read wet (traction
// x 0.8 when soaked), peds read rain. It is simulation state, stepped with the clock (fixed dt), so a replay keeps the
// same skies; render/sky.js and render/weather-fx.js only draw it.
//   ?weather=clear | overcast | rain | storm | fog holds one state.
import { RNG } from '../core/rng.js';
import { TUNE, knob } from '../core/tune.js';

export const WEATHERS = ['clear', 'overcast', 'rain', 'storm', 'fog'];
const ODDS = [['clear', 4], ['overcast', 2.5], ['rain', 2], ['storm', .8], ['fog', 1]];
/** each state's sky: cloud (0..1, dims the day and greys the sky), rain (0..1), fog (0..1) */
const LOOK = { clear: [0, 0, 0], overcast: [.55, 0, 0], rain: [.75, .6, 0], storm: [.9, 1, 0], fog: [.4, 0, 1] };

knob('World', 'weatherHoursMin', 'Weather lasts at least', 1, .25, 12, .25, 'Game hours before the weather may change');
knob('World', 'weatherHoursMax', 'Weather lasts at most', 3, .5, 24, .25, 'Game hours before it changes for sure');
knob('World', 'wetMinutes', 'Soaked after', 20, 1, 120, 1, 'Game minutes of rain to soak the streets');
knob('World', 'dryMinutes', 'Dry after', 120, 5, 600, 5, 'Game minutes for soaked streets to dry once the rain stops');

export class Weather {
  /** o: { state (a WEATHERS name; held if fixed), fixed } */
  constructor(o = {}) {
    this.rs = RNG.stream('weather');
    this.fixed = !!o.fixed && WEATHERS.includes(o.state);
    this.state = WEATHERS.includes(o.state) ? o.state : this.rs.pickW(ODDS);
    this.left = this.rs.range(TUNE.weatherHoursMin, TUNE.weatherHoursMax);
    const [c, r, f] = LOOK[this.state];
    /** how cloudy, how hard it rains, how thick the fog (0..1, eased toward the state's); wet: the streets, 0..1 */
    this.cloud = c; this.rain = r; this.fog = f; this.wet = r > 0 ? 1 : 0;
    /** lightning: seconds of flash left, and seconds to the next strike */
    this.flash = 0; this.nextStrike = this.rs.range(3, 9);
  }
  /** step: dt seconds of game time, hours of game time on the clock */
  update(dt, hours) {
    if (!this.fixed && !this.held && (this.left -= hours) <= 0) { this.state = this.rs.pickW(ODDS); this.left = this.rs.range(TUNE.weatherHoursMin, TUNE.weatherHoursMax); }
    const [c, r, f] = LOOK[this.state], k = Math.min(1, dt / 5);   // (about five seconds to change over)
    this.cloud += (c - this.cloud) * k; this.rain += (r - this.rain) * k; this.fog += (f - this.fog) * k;
    const mins = hours * 60;
    this.wet = this.rain > .1 ? Math.min(1, this.wet + mins / TUNE.wetMinutes * this.rain) : Math.max(0, this.wet - mins / TUNE.dryMinutes);
    this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'storm' && (this.nextStrike -= dt) <= 0) { this.flash = .35; this.nextStrike = this.rs.range(4, 14); }
  }
  /** a job's weather (m.weather): that state at once (its sky, its rain, the streets soaked with it), held until
   *  release() */
  set(state) {
    if (!WEATHERS.includes(state)) return;
    const [c, r, f] = LOOK[state]; this.state = state; this.held = true; this.cloud = c; this.rain = r; this.fog = f; this.wet = r > 0 ? 1 : 0;
  }
  /** the job's hold let go: the weather changes again when its time is up */
  release() { this.held = false; }
  /** is it raining (for peds, the radio's weather lines)? */
  get raining() { return this.rain > .15; }
  /** the traction factor for tyres: 1 dry, 0.8 soaked (PLAN.md 8.6) */
  get grip() { return 1 - .2 * this.wet; }
  /** for state hashes */
  get index() { return WEATHERS.indexOf(this.state); }
}
