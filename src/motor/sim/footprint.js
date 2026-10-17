// The simulation's footprint (PLAN.md 5.7, 7.6): world-unit rings around the focus (the possessed protagonist). LOD,
// spawning, despawning and roadblock placement read these rings, never the camera or the active view, so switching
// views can't change the game. Radii are TUNE knobs, sized for the farthest-seeing view (SIDE7's far fade).
import { TUNE, knob } from '../core/tune.js';

knob('Footprint', 'fpFull', 'Full-simulation radius', 400, 150, 900, 10, 'Vehicles inside it run full tyre physics; peds full brains (u)');
knob('Footprint', 'fpActivity', 'Activity radius', 700, 300, 1400, 10, 'Actors beyond it are coarse or removed (u)');
knob('Footprint', 'fpSpawnIn', 'Spawn annulus inner radius', 620, 300, 1300, 10, 'Nothing spawns nearer than this (u)');
knob('Footprint', 'fpSpawnOut', 'Spawn annulus outer radius', 760, 320, 1500, 10, 'Spawns happen inside the annulus; despawns beyond it (u)');

export class Footprint {
  constructor() { this.x = 0; this.y = 0; }
  /** centre the rings on the focus (call once per step) */
  update(x, y) { this.x = x; this.y = y; return this; }
  d(x, y) { return Math.hypot(x - this.x, y - this.y); }
  /** 0 near, 1 far, 2 outside */
  lod(x, y) { const d = this.d(x, y); return d <= TUNE.fpFull ? 0 : d <= TUNE.fpActivity ? 1 : 2; }
  /** true inside the spawn annulus */
  canSpawn(x, y) { const d = this.d(x, y); return d >= TUNE.fpSpawnIn && d <= TUNE.fpSpawnOut; }
  /** true beyond the annulus: despawn there */
  shouldDespawn(x, y) { return this.d(x, y) > TUNE.fpSpawnOut; }
}
