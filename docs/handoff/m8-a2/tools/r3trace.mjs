// A probe: R3 on a seed (from a stage), the player's damage by source, a timeline of the big hits and the bot's target
import { botRun } from './bot.mjs';
const seed = +(process.argv[2] || 3), stage = process.argv[3] || null;
let sub = null, now = 0; const log = [], by = {};
const r = await botRun({ id: 'rats_crane_game', seed, stage, secs: 600, onStep: (t, g) => {
  const { gtm } = g; now = t;
  if (!sub) {
    sub = gtm.BUS.on('hit', e => {
      const p = gtm.crew.ped; if (e.target !== p.id) return;
      const src = gtm.combat.bodies.find(b => b.id === e.by), C = gtm.career, B = C.bot, pk = B && B.pick && B.pick.t;
      const k = `${e.kind}:${src ? (src.missionTag || src.gang || src.faction || 'body') : (e.by || 'none')}`;
      by[k] = (by[k] || 0) + e.damage;
      if (e.damage >= 8) log.push(`${now.toFixed(1)} ${k} ${Math.round(e.damage)} -> hp ${Math.round(p.vitals.health)} ar ${Math.round(p.vitals.armor)} | at ${Math.round(p.x)},${Math.round(p.y)} src ${src ? Math.round(Math.hypot(src.x - p.x, src.y - p.y)) : '-'} u | target ${pk ? (pk.missionTag || '?') + ' ' + Math.round(Math.hypot(pk.x - p.x, pk.y - p.y)) + ' u' : '-'} gun ${p.inv.current}`);
    }, 'global');
    gtm.BUS.on('stageFail', e => log.push(`${now.toFixed(1)} FAIL ${e.stage}: ${e.reason}`), 'global');
  }
  return true;
} });
console.log(JSON.stringify(r));
console.log('damage to the player by kind:source', JSON.stringify(by));
console.log(log.slice(0, 80).join('\n'));
