// Fake gamepads for headless tests: a DualSense at any index, buttons by number, analog values, axes.
export const DUALSENSE = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';
export function pad(index = 0, o = {}) {
  return { index, id: o.id || DUALSENSE, connected: true, mapping: 'standard',
    buttons: Array.from({ length: 18 }, (_, i) => { const v = (o.values || {})[i] ?? ((o.pressed || []).includes(i) ? 1 : 0); return { pressed: v > .5, value: v }; }),
    axes: o.axes || [0, 0, 0, 0] };
}
