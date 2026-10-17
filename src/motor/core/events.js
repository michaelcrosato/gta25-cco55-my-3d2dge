// The BUS catalogue (PLAN.md 7.4), frozen in M1: every event a system may emit, with its payload's fields. BUS.emit
// takes any name (a game adds its own), but these are the ones MOTOR's systems speak, and tests check emitters
// against this list. Ids are Actor ids; points are world units.
export const EVENTS = {
  // crime and police
  crime: 'type, x, y, by, victim, severity',   // type: 'assault' | 'murder' | 'carjack' | 'theft' | 'shooting' | 'explosion' | 'vandalism' | 'speeding' | ...
  witness: 'crime, by',
  report: 'crime, x, y',
  wanted: 'stars, heat, prev',
  search: 'x, y, r',
  evaded: 'stars',
  busted: 'by',
  wrecked: 'cause',
  // combat
  hit: 'target, by, damage, kind, x, y, z',     // kind: 'bullet' | 'melee' | 'vehicle' | 'explosion' | 'fire' | 'fall'
  kill: 'target, by, kind',
  explode: 'x, y, z, r, by, power',
  fire: 'x, y, r, by',
  photo: 'by, x, y, targets',                   // the Snap (M3: a photo objective's shutter)
  // vehicles
  vehicleEnter: 'vehicle, actor, seat',
  vehicleExit: 'vehicle, actor, seat',
  carjack: 'vehicle, by, victim',
  vehicleDamage: 'vehicle, amount, x, y, by',
  vehicleDestroyed: 'vehicle, by',
  // rewards
  pickup: 'item, by',
  cash: 'amount, reason',
  respect: 'gang, delta',
  stunt: 'id, score',
  collectible: 'id',
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
  switch: 'from, to',
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
