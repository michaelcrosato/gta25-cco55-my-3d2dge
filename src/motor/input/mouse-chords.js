// Chorded mouse buttons (PLAN.md 8.1, 11: hold the right button to aim, click the left to fire). The engine presses a
// mouse button on pointerdown and lets it go on pointerup, but a pointer event fires those for the first button down and
// the last one up only: a second button pressed while one is held comes as a pointermove with new e.buttons, and the
// engine never sees it. This keeps the engine's held buttons in step with e.buttons on every mouse pointer event,
// through its public press and release (both ignore a button already in that state). Browser only.
const BITS = [[1, 'Mouse0'], [2, 'Mouse2'], [4, 'Mouse1'], [8, 'Mouse3'], [16, 'Mouse4']];

export function syncMouseButtons(game) {
  if (typeof window === 'undefined' || !window.addEventListener || game.headless) return null;
  let last = 0;
  const sync = e => {
    if (e.pointerType !== 'mouse' || typeof e.buttons !== 'number') return;
    for (const [bit, code] of BITS) { const on = (e.buttons & bit) !== 0; if (on !== ((last & bit) !== 0)) { if (on) game.input.press(code); else game.input.release(code); } }
    last = e.buttons;
  };
  for (const ev of ['pointermove', 'pointerdown', 'pointerup']) window.addEventListener(ev, sync, { passive: true });
  return sync;
}
