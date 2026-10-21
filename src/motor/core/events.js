// The BUS catalogue (PLAN.md 7.4), frozen in M1: every event a system may emit, with its payload's fields. BUS.emit
// takes any name (a game adds its own), but these are the ones MOTOR's systems speak, and tests check emitters
// against this list. Ids are Actor ids; points are world units. Added since, each by a decision (docs/DECISIONS.md):
// the services' and the troupes' (D18, M5), the police's, the respawns' and the gangs' (D19, M6), the interiors' (D20,
// M7), the economy's (D21, M8).
export const EVENTS = {
  // crime and police
  crime: 'type, x, y, by, victim, severity, vehicle, lawful',   // type: def('crimes') ids; vehicle: a car theft's; lawful: the police's own doing
  witness: 'crime, by',
  report: 'crime, x, y, by, victim, witness, severity',
  wanted: 'stars, heat, prev, why',
  search: 'x, y, r',
  evaded: 'stars',
  busted: 'by, how',                            // how: 'cuffed' | 'door'
  wrecked: 'cause',
  dispatch: 'kind, x, y, unit, call, tier',     // a unit sent (the services' calls; the police's tiers: 'cruiser' | 'swat' | 'fed' | 'chopper')
  onScene: 'kind, call, unit, x, y',
  roadblock: 'x, y',
  spikes: 'x, y',
  spiked: 'vehicle',
  respray: 'vehicle, color',
  respawn: 'kind, x, y',                        // kind: 'wrecked' (the hospital) | 'nabbed' (the precinct)
  confiscated: 'weapons',
  // the city
  revived: 'target, by',
  encore: 'troupe, by',
  turfWar: 'gangs, x, y',
  turfWarEnd: 'gangs, x, y, dead',
  // interiors (M7)
  interior: 'id, door, enter',                  // in (enter: true) or out by a door (door: null: carried out, WRECKED)
  alarm: 'interior, by, x, y',                  // by: 'guard' | 'camera' | 'body'
  takedown: 'interior, guard, by',
  // combat
  hit: 'target, by, damage, kind, x, y, z',     // kind: 'bullet' | 'melee' | 'vehicle' | 'explosion' | 'fire' | 'fall'
  kill: 'target, by, kind',
  explode: 'x, y, z, r, by, power',
  fire: 'x, y, r, by',
  photo: 'by, x, y, targets, dir',              // the Snap (M3: a photo objective's shutter; dir, M8: where it pointed)
  // vehicles
  vehicleEnter: 'vehicle, actor, seat',
  vehicleExit: 'vehicle, actor, seat',
  carjack: 'vehicle, by, victim',
  vehicleDamage: 'vehicle, amount, x, y, by',
  vehicleDestroyed: 'vehicle, by',
  // rewards
  pickup: 'item, by',
  cash: 'amount, reason',
  respect: 'gang, delta, value, why',
  stunt: 'id, score',
  collectible: 'id',
  purchase: 'shop, item, price',                // (M8) a shop's item bought
  property: 'id, price',                        // (M8) a property bought
  holdup: 'shop, by, cash',                     // (M8) a Kwik-Lux's till taken
  cab: 'to, fee',                               // (M8) the cab skip
  stat: 'stat, delta',
  // missions and activities
  missionStart: 'id',
  stageStart: 'mission, stage',
  stageFail: 'mission, stage, reason',
  missionPass: 'id, medal, elapsed',
  missionFail: 'id, reason',
  activityStart: 'id, level',
  activityEnd: 'id, level, result',
  // the player
  switch: 'from, to, camera',                   // camera: the switch camera brought it (not a mission's possess)
  ability: 'who, on',
  // the world and presentation
  view: 'view, prev',
  radio: 'station',
  clock: 'hour',
  weather: 'state, prev',
  // saves, the attract mode, the UI
  save: 'slot',
  load: 'slot',
  attractBeat: 'reel, beat',
  uiOpen: 'screen',
  uiClose: 'screen',
};
