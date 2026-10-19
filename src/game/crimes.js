// Lowtown's crimes (PLAN.md 8.13), from mild to severe, with the heat each earns when the police hear of it (a cop's
// own sight earns half again: TUNE.copSeenMul). The stars come at 20 / 60 / 150 / 300 / 600 heat, so a car stolen in
// front of a cop or a murder phoned in is one star, a murder a cop saw or an assault on a cop two, a dead cop three,
// and a rampage climbs from there. Traffic offences only count when a cop sees them (report: false).
import { def } from '../motor/index.js';

const C = (id, spec) => def('crimes', id, spec);
C('speeding', { name: 'Speeding', heat: 4, report: false });
C('redLight', { name: 'Running a red light', heat: 4, report: false });
C('trespass', { name: 'Trespass', heat: 10 });
C('vandalism', { name: 'Property damage', heat: 4 });
C('breakIn', { name: 'Breaking into a car', heat: 10 });
C('carjack', { name: 'Car theft', heat: 15, severity: 2 });
C('shooting', { name: 'Shots fired', heat: 15, violent: true });
C('assault', { name: 'Assault', heat: 15 });
C('robbery', { name: 'Robbery', heat: 30, severity: 2 });
C('runOver', { name: 'Running someone down', heat: 25, violent: true, severity: 2 });
C('explosion', { name: 'An explosion', heat: 30, violent: true, severity: 2 });
C('murder', { name: 'Murder', heat: 45, violent: true, severity: 3 });
C('copAssault', { name: 'Assaulting an officer', heat: 60, severity: 2 });
C('policeCarTheft', { name: 'Stealing a police car', heat: 60, severity: 2 });
C('copMurder', { name: 'Killing an officer', heat: 160, violent: true, severity: 3 });
