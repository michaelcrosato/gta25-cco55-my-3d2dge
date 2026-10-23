// The story cast (PLAN.md 9.2) and the shops' people: archetypes the missions and the hold-ups spawn by id, never the
// crowd's (weight 0). The cast wear the protagonists' detailed rig in their own fixed look; the clerks and the janitor
// are the crowd's classic rig from their palettes.
import { def } from '../../motor/index.js';

const C = (id, spec) => def('peds', id, { kind: 'cast', weight: 0, traits: { tough: 1, brave: 1, phone: 0, pace: .9, idles: ['chat'] }, ...spec });
C('fender', { name: 'Father Fender', faction: 'saints', gang: 'saints', health: 160, weapons: ['fists', 'snub38'],
  look: { build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'bald', style: 'hd', colors: { skin: '#e0b090', hair: '#d8d8dc', cloth: '#1e1e24', coat: '#1e1e24', pants: '#2a2a30', boot: '#c8c8d0', belt: '#c8c8d0' } } });
C('bilge', { name: 'Mama Bilge', faction: 'rats', gang: 'rats', health: 160, weapons: ['fists', 'persuader'],
  look: { build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'ponytail', hat: { style: 'cap', color: '#ffd23a' }, style: 'hd', colors: { skin: '#a8724e', hair: '#8a8a90', cloth: '#ffd23a', coat: '#ffd23a', pants: '#1e1e24', boot: '#1e1e24', belt: '#3a3a40' } } });
C('nana', { name: 'Nana Petunia Gnorr', faction: 'gnomes', gang: 'gnomes', health: 120, size: .8, weapons: ['fists'],
  look: { build: 'chibi', size: .85, outfit: 'shirt', sleeves: 'long', hair: 'short', hat: { style: 'pointed', color: '#ff8ac8' }, style: 'hd', colors: { skin: '#f0d0b0', hair: '#d8d8dc', cloth: '#ff8ac8', pants: '#8affc8', boot: '#e8e8ec', belt: '#ff8ac8' } } });
C('kettle', { name: 'Sgt. Dolores Kettle', faction: 'police', health: 180, armor: 50, weapons: ['fists', 'snub38', 'persuader'],
  look: { build: 'heroic', outfit: 'shirt', sleeves: 'long', hair: 'ponytail', hat: { style: 'cap', color: '#1e2a5a' }, style: 'hd', colors: { skin: '#8a5a3a', hair: '#1e1a22', cloth: '#2a3a7a', pants: '#1e2448', boot: '#101014', belt: '#e8c040' } } });
C('pennywhistle', { name: 'Mr. Pennywhistle', faction: 'civilian', health: 80, weapons: ['fists'],
  look: { build: 'chibi', outfit: 'coat', sleeves: 'long', hair: 'short', style: 'hd', colors: { skin: '#f0d0b0', hair: '#6a4a2a', cloth: '#e8e8ec', coat: '#3a3a44', pants: '#3a3a44', boot: '#18161c', belt: '#18161c' } } });
C('lefty', { name: 'Lefty', faction: 'civilian', health: 100, weapons: ['fists'],
  look: { build: 'heroic', outfit: 'shirt', hair: 'spiky', hat: { style: 'cap', color: '#c8423a' }, style: 'hd', colors: { skin: '#c8906a', hair: '#3a2a1e', cloth: '#3a6ac8', pants: '#3a6ac8', boot: '#3a2a1e', belt: '#e8c040' } } });
// the shops' and the bank's people
def('peds', 'clerk', { name: 'Clerk', kind: 'special', weight: 0, builds: ['heroic', 'chibi', 'bulky'], outfits: ['shirt'], hairs: ['short', 'ponytail', 'bald'], hats: [{ style: 'cap', color: '#3a8a5a' }],
  palettes: { cloth: ['#3a8a5a', '#5aff8a', '#2a6a4a'], pants: ['#2a2a30', '#3a3a3a'] }, traits: { tough: 0, brave: 0, phone: 0, pace: 1, idles: ['shop'] } });
def('peds', 'janitor', { name: 'Janitor', kind: 'special', weight: 0, builds: ['bulky'], outfits: ['shirt'], sleeves: ['long'], hairs: ['bald'], hats: [{ style: 'cap', color: '#5a5a62' }], uniform: true,
  palettes: { cloth: ['#7a8a6a'], pants: ['#5a6a4a'] }, traits: { tough: 0, brave: 0, phone: 0, pace: .8, idles: ['chat'] } });
