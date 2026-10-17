// The switch vignettes' props (PLAN.md 8.11): box models drawn beside a protagonist as the switch camera finds them.
// Dex's moto on its stand, Viv's diner booth (a table, two benches, the third coffee), Gus's parking meter.
const B = (box, color, role = 'body') => ({ box, color, role });
export const VIGNETTE_PROPS = {
  moto: { parts: [
    B([-14, -1.5, 0, -6, 1.5, 9], '#1a1a20', 'wheel'), B([6, -1.5, 0, 14, 1.5, 9], '#1a1a20', 'wheel'),
    B([-9, -3, 6, 9, 3, 12], '#d23a3a'), B([-10, -3.5, 12, 0, 3.5, 14], '#2a2630'), B([9, -1, 10, 11, 1, 18], '#8a8e9a'), B([8, -6, 17, 10, 6, 18], '#8a8e9a'),
    B([11, -1.5, 10, 13, 1.5, 13], '#fff4c8', 'light')] },
  booth: { parts: [
    B([-10, -14, 0, 10, -8, 9], '#8a2a3a'), B([-10, -15, 9, 10, -13, 20], '#8a2a3a'), B([-10, 8, 0, 10, 14, 9], '#8a2a3a'), B([-10, 13, 9, 10, 15, 20], '#8a2a3a'),
    B([-1, -1, 0, 1, 1, 10], '#8a8e9a'), B([-9, -6, 10, 9, 6, 11.5], '#e8e0c8'), B([2, 1, 11.5, 4, 3, 14], '#ffffff'), B([-5, -3, 11.5, -1, 0, 12.5], '#c8a040')] },
  meter: { parts: [B([-.8, -.8, 0, .8, .8, 16], '#5a5a66'), B([-2.5, -2, 16, 2.5, 2, 23], '#8a8e9a'), B([-1.6, -2.2, 18, 1.6, -2, 21.5], '#c8e8a0', 'light')] },
  dummy: { parts: [B([-1.5, -1.5, 0, 1.5, 1.5, 14], '#6a5a3a'), B([-5, -2.5, 14, 5, 2.5, 30], '#c8a060'), B([-3, -3, 30, 3, 3, 37], '#d8b878')] },
};
