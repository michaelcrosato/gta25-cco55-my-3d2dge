// CHROME RAIDERS (PLAN.md 19's backlog, HANDOFF L4): the arcade cabinet in Club Chrome's VIP lounge. It runs the
// engine's own shooter starter kit (vendor/my-3d2dge/reference/starter-30-shooter.js, the slice verbatim: a tate
// shoot-'em-up over a valley to a flying fortress) in the Saints' cabinet; the Pixel Palace's HIGH SCORE is played on
// it (activities/high-score.js). The stick flies, ✕ fires (held: autofire), ○ bombs.
import { def } from '../../motor/index.js';
import SHOOTER from 'virtual:kit/starter-30-shooter';

def('arcadeKits', 'shooter', { title: 'CHROME RAIDERS', source: SHOOTER, scene: 'shooter', res: [240, 320], color: '#5af0ff' });
