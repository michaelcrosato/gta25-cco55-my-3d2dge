// The first-time hints (PLAN.md 8.18's onboarding, MOTOR's Onboarding): each verb the first time it becomes possible,
// in the player's own glyphs. The prologue teaches the loop; these fill in the rest as the city offers it. ctx: { board
// (a vehicle in reach on foot), v (the vehicle driven), vt (seconds at its wheel), moving, gun (a gun in hand), weapons
// (how many carried), free (no job, no card), wanted, inside (an interior), t (seconds of play) }
export const TIPS = [
  { id: 'steal', text: '{onFoot:interact} GETS YOU INTO ANY CAR', when: c => !!c.board },
  { id: 'drive', text: '{vehicle:throttle} GO   {vehicle:brake} BRAKE AND REVERSE', when: c => !!c.v },
  { id: 'handbrake', text: '{vehicle:handbrake} HANDBRAKE: SLIDE ROUND CORNERS', when: c => !!c.v && c.v.speed > 110 },
  { id: 'radio', text: '{vehicle:radioPrev} {vehicle:radioNext} CHANGE THE STATION', when: c => !!c.v && c.vt > 12 },
  { id: 'getout', text: '{vehicle:interact} GETS YOU OUT', when: c => !!c.v && c.vt > 25 },
  { id: 'sprint', text: 'HOLD {onFoot:sprint} TO SPRINT', when: c => !c.v && c.moving && c.t > 2 },
  { id: 'aim', text: 'HOLD {onFoot:aim} TO AIM   {onFoot:attack} FIRES', when: c => !c.v && c.gun },
  { id: 'wheel', text: 'HOLD {onFoot:wheel} FOR THE WEAPON WHEEL', when: c => !c.v && c.weapons >= 3 },
  { id: 'phone', text: '{onFoot:phone} THE PHONE: JOBS, CABS, CONTACTS', when: c => c.free && c.t > 25 },
  { id: 'map', text: '{onFoot:map} THE MAP', when: c => c.free && c.t > 45 },
  { id: 'view', text: '{onFoot:view} CHANGES THE VIEW', when: c => c.t > 70 },
  { id: 'switch', text: 'HOLD {onFoot:switch} TO SWITCH CHARACTER', when: c => c.free && c.t > 100 && !c.wanted },
  { id: 'crouch', text: '{onFoot:crouch} CROUCHES: QUIETER, HARDER TO SEE', when: c => !!c.inside },
];
