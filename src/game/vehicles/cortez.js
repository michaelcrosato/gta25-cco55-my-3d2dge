// The Cortez: Lowtown's everyday sedan, the car a player steals most (PLAN.md 9.6). Its handling is the baseline the
// other cars are tuned against; the spec numbers are what the handling suite holds it to.
import { def } from '../../motor/index.js';

def('vehicles', 'cortez', {
  name: 'Cortez', class: 'car', role: 'civilian', seats: 4, radio: 'neon', health: 100,
  model: { length: 58, width: 26, height: 22, cabin: .45, cabinAt: -.08 },
  palette: ['#c8423a', '#3a6ac8', '#d8c8a0', '#3a8a5a', '#2a2a30', '#e0e0e4', '#c88a2a'],
  handling: { mass: 1200, top: 260, accel: 150, brake: 640, grip: 460, drift: .32, steer: .55, drive: 'rwd' },
  spec: { t200: 2.4, top: 260, brake200: 41 },
});
