// Reel: SWITCH! (PLAN.md 9.11). Dex at the safehouse; the switch camera up over Lowtown and down on Viv at her booth in
// the Greasy Spoke, then Gus at the car wash, then back to Dex: each vignette as the camera finds them. TOP for the
// switches, ISO to close.
import { defReel } from '../../motor/index.js';

defReel('switch', {
  title: 'Switch!', shows: 'Three crooks, one city', views: ['top', 'iso'], time: 70,
  stages: [
    { id: 'dex', view: 'top', caption: 'THREE OF THEM',
      setup(m) { m.as('dex'); m.time(19); m.weather('clear'); },
      *run(m) { yield m.wait(2); } },
    { id: 'viv', view: 'top', caption: 'VIV',
      setup() {},
      *run(m) { yield m.switchTo('viv', { vignette: true }); yield m.wait(3.5); } },
    { id: 'gus', view: 'top', caption: 'GUS',
      setup() {},
      *run(m) { yield m.switchTo('gus', { vignette: true }); yield m.wait(3.5); } },
    { id: 'back', view: 'iso', caption: 'DEX',
      setup() {},
      *run(m) { yield m.switchTo('dex', { vignette: true }); yield m.wait(4); } },
  ],
});
