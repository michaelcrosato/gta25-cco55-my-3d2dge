// The crew (PLAN.md 9.2): Lowtown's three protagonists. Each has three outfits (Threads sells the second and third),
// an ability, a start and a switch vignette: where the switch camera finds them, doing what, and the line they say.
import { def } from '../../motor/index.js';

const skin = { a: '#c8906a', b: '#8a5a3a', c: '#e0b090' };
def('characters', 'dex', {
  name: 'Dex Moreno', role: 'Courier and wheelman', color: '#ff5a4a', protagonist: true, ability: 'overdrive',
  bio: 'A motorcycle courier who owes everyone. Knows every alley at 90.',
  outfitNames: ['Courier', 'Night Rider', 'Beach Bum'],
  outfits: [
    { build: 'heroic', outfit: 'coat', hair: 'spiky', colors: { skin: skin.a, hair: '#1e1a22', cloth: '#d23a3a', coat: '#2a2630', pants: '#2a3048', boot: '#18161c', belt: '#3a2a22' } },
    { build: 'heroic', outfit: 'coat', hair: 'spiky', sleeves: 'long', hat: { style: 'helmet', color: '#d23a3a' }, colors: { skin: skin.a, hair: '#1e1a22', cloth: '#1e1e24', coat: '#3a3a44', pants: '#18161c', boot: '#101014', belt: '#5a5a66' } },
    { build: 'heroic', outfit: 'shirt', hair: 'spiky', colors: { skin: skin.a, hair: '#1e1a22', cloth: '#e8c040', pants: '#c8b090', boot: '#7a5a3a', belt: '#8a6a3a' } },
  ],
  start: { poi: 'safehouse', weapons: ['fists', 'snub38'], ammo: { snub38: 36 } },
  vignette: { poi: 'boom-box', pose: 'kneel', prop: 'moto', line: 'Easy, girl. Daddy just needs to bleed the brakes.' },
});
def('characters', 'viv', {
  name: 'Viv Okafor', role: 'Ex-detective', color: '#3ad0c8', protagonist: true, ability: 'deadcalm',
  bio: 'Fired from the MPD for noticing too much. Still notices.',
  outfitNames: ['Detective', 'Off Duty', 'Noir'],
  outfits: [
    { build: 'heroic', outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { skin: skin.b, hair: '#141018', cloth: '#8a9098', coat: '#2a6a6a', pants: '#3a3e48', boot: '#1e1a20', belt: '#2a2a30' } },
    { build: 'heroic', outfit: 'shirt', hair: 'long', colors: { skin: skin.b, hair: '#141018', cloth: '#e0e0e8', pants: '#2a3a5a', boot: '#e8e8ec', belt: '#3a2a22' } },
    { build: 'heroic', outfit: 'coat', hair: 'ponytail', sleeves: 'long', hat: { style: 'band', color: '#c8423a' }, colors: { skin: skin.b, hair: '#141018', cloth: '#c8423a', coat: '#1e1e24', pants: '#1e1e24', boot: '#101014', belt: '#c8423a' } },
  ],
  start: { poi: 'greasy-spoke', weapons: ['fists', 'snub38'], ammo: { snub38: 48 } },
  vignette: { poi: 'greasy-spoke', pose: 'kneel', prop: 'booth', line: 'Third coffee. The cook is lying about the pie.' },
});
def('characters', 'gus', {
  name: 'Gus Pilchard', role: 'Tow-truck philosopher', color: '#ff9a2a', protagonist: true, ability: 'redmist',
  bio: 'Tows cars, reads Seneca, loses his temper. In that order, usually.',
  outfitNames: ['Tow Man', 'League Night', 'Sunday Best'],
  outfits: [
    { build: 'bulky', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#2a4a8a' }, colors: { skin: skin.c, hair: '#6a4a2a', cloth: '#e07a2a', pants: '#2a4a8a', boot: '#3a2a22', belt: '#2a4a8a' } },
    { build: 'bulky', outfit: 'shirt', hair: 'short', colors: { skin: skin.c, hair: '#6a4a2a', cloth: '#6a3a8a', pants: '#2a2a30', boot: '#e8e8ec', belt: '#1e1e24' } },
    { build: 'bulky', outfit: 'coat', hair: 'short', sleeves: 'long', hat: { style: 'band', color: '#3a2a1a' }, colors: { skin: skin.c, hair: '#6a4a2a', cloth: '#e8e0c8', coat: '#5a4030', pants: '#3a3028', boot: '#2a1e18', belt: '#2a1e18' } },
  ],
  start: { poi: 'car-wash', weapons: ['fists', 'slugger'], ammo: {} },
  vignette: { poi: 'car-wash', pose: 'hips', prop: 'meter', line: 'You took my quarter. I took philosophy. We are not the same.' },
});
