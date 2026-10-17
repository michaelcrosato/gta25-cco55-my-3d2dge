// The ISO driving zoom (PLAN.md 5.1): 1.0 on foot; in a vehicle .8, and .65 when it goes fast, chosen by speed with
// hysteresis and a dwell so it never flickers between levels. Three levels only: each is an engine view with its own
// wall blocks, which the Stage bakes ahead of the change (stage.zoomTo). Presentation only: nothing simulated reads it.
import { TUNE, knob } from '../core/tune.js';

knob('Camera', 'zoomFoot', 'ISO zoom on foot', 1, .8, 1.2, .05, 'The camera zoom walking (1 is the base view)');
knob('Camera', 'zoomDrive', 'ISO zoom driving', .8, .6, 1, .05, 'The camera zoom in a vehicle below the fast speed');
knob('Camera', 'zoomFast', 'ISO zoom driving fast', .65, .5, .9, .05, 'The camera zoom in a vehicle above the fast speed');
knob('Camera', 'zoomFastAbove', 'Fast above', 190, 80, 400, 5, 'Speed (u/s) past which the camera pulls out to the fast zoom');
knob('Camera', 'zoomFastBelow', 'Back below', 140, 40, 380, 5, 'Speed (u/s) under which it comes back in (lower than the first: hysteresis)');
knob('Camera', 'zoomDwell', 'Zoom dwell', .8, 0, 3, .1, 'Seconds a zoom level holds before the next change');

export class SpeedZoom {
  constructor() { this.level = TUNE.zoomFoot; this.t = 1e9; }
  /** the level for this step: driving (in a vehicle?) and speed (u/s) */
  update(dt, driving, speed) {
    this.t += dt;
    const fast = this.level === TUNE.zoomFast;
    const want = !driving ? TUNE.zoomFoot : (fast ? speed >= TUNE.zoomFastBelow : speed > TUNE.zoomFastAbove) ? TUNE.zoomFast : TUNE.zoomDrive;
    if (want !== this.level && this.t >= TUNE.zoomDwell) { this.level = want; this.t = 0; }
    return this.level;
  }
}
