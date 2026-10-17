// Every gameplay number of Grand Theft Moto, as TUNE knobs (PLAN.md 7.4). MOTOR's own knobs (the footprint...) are
// declared where they are used; the game's live here, grouped by section, and docs/TUNING.md is generated from them.
import { knob } from '../motor/index.js';

knob('Attract', 'attractIdle', 'Title idle before the demo', 10, 3, 60, .5, 'Seconds without input on the title or its menus before the attract mode starts (the brief: 10)');
knob('On foot', 'walkSpeed', 'Walk speed', 50, 20, 120, 1, 'Mover walk (u/s)');
knob('On foot', 'runSpeed', 'Run speed', 85, 40, 200, 1, 'Mover run (u/s)');
knob('On foot', 'sprintSpeed', 'Sprint speed', 125, 60, 260, 1, 'Mover sprint (u/s)');
