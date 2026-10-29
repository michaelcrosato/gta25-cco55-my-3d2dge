// The Intent (PLAN.md 7.5): what a controller wants one actor to do this step, in WORLD space. The HumanController fills
// it from the player's bindings (turning screen-relative sticks through the active view), the AutoPlayer and the brains
// fill it themselves, and ped and vehicle code read only this, never game.input: the attract AI drives the same code a
// player does, and hash tests drive Intents directly.
/** every button an intent carries: down[name] while held, tap[name] in the step it was pressed */
export const BUTTONS = ['sprint', 'jump', 'roll', 'crouch', 'attack', 'aim', 'interact', 'reload', 'ability', 'wheel',
  'phone', 'map', 'pause', 'view', 'turnLeft', 'turnRight', 'switch', 'horn', 'fire', 'nitro', 'handbrake', 'photo',
  'weaponPrev', 'weaponNext', 'radioPrev', 'radioNext'];

export function makeIntent() {
  const down = {}, tap = {};
  for (const b of BUTTONS) { down[b] = false; tap[b] = false; }
  return {
    /** on foot: world direction, length <= 1 */ move: [0, 0],
    /** aim direction (world, unit) or null; aimTarget: an actor the aim is locked on, or null; aimPoint: the mouse's
     *  ground point [x, y, z] (aims down from a roof), or null; aimStick: how far the aim stick is pushed (0..1: flicks) */
    aim: null, aimTarget: null, aimPoint: null, aimStick: 0,
    /** in a vehicle: 0..1, 0..1, -1..1 */ throttle: 0, brake: 0, steer: 0,
    /** the camera stick's push on screen, [x right, y down] (-1..1 each): the free camera's (D50); presentation only,
     *  never read by the simulation */ look: [0, 0],
    down, tap,
  };
}
/** reset an intent to rest (a controller writes a fresh one every step) */
export function clearIntent(i) {
  i.move[0] = 0; i.move[1] = 0; i.look[0] = 0; i.look[1] = 0; i.aim = null; i.aimTarget = null; i.aimPoint = null; i.aimStick = 0; i.throttle = 0; i.brake = 0; i.steer = 0;
  for (const b of BUTTONS) { i.down[b] = false; i.tap[b] = false; }
  return i;
}
/** press a button for one step (AI and tests) */
export function tapButton(i, b) { i.down[b] = true; i.tap[b] = true; return i; }
