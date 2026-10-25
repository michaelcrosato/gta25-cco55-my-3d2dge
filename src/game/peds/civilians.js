// Lowtown's people (PLAN.md 9.8): the civilian archetypes the crowd and the traffic's drivers are made from, each in
// many colours (no two alike), and the services' uniforms. The gangs' members come with the gangs (src/game/gangs.js).
import { def } from '../../motor/index.js';

const SUITS = ['#2a3048', '#3a3a44', '#5a4a3a', '#2a2a30', '#4a4a58'];
def('peds', 'office', { name: 'Office worker', weight: 3, times: ['day'], zones: ['neon', 'palm'], builds: ['heroic', 'chibi'], outfits: ['coat', 'shirt'], sleeves: ['long'], hairs: ['short', 'bald', 'long', 'ponytail'],
  palettes: { cloth: ['#e0e0e8', '#c8d0e0', '#e8d8c0', '#a8c0d8'], coat: SUITS, pants: SUITS }, traits: { phone: .8, pace: 1.1, idles: ['phone', 'chat', 'cab'] } });
def('peds', 'tourist', { name: 'Tourist', weight: 2, times: ['day'], zones: ['palm', 'neon', 'harbor'], builds: ['chibi', 'bulky', 'heroic'], outfits: ['shirt'], hairs: ['short', 'long', 'bald'],
  hats: [null, { style: 'cap', color: '#e8c040' }, { style: 'cap', color: '#ff7a3a' }],
  palettes: { cloth: ['#ff7ad0', '#5af0ff', '#ffe066', '#7aff8a', '#ff9a5a'], pants: ['#e8d8b0', '#c8b090', '#5a8ac8'] }, traits: { phone: .4, pace: .8, idles: ['shop', 'chat', 'phone'] } });
def('peds', 'jogger', { name: 'Jogger', weight: 1, zones: ['palm', 'harbor', 'foundry'], builds: ['heroic'], outfits: ['shirt'], hairs: ['ponytail', 'short'], hats: [null, { style: 'band', color: '#ff4a4a' }],
  palettes: { cloth: ['#ff4a8a', '#4aff8a', '#4a8aff', '#ffe04a'], pants: ['#1e1e24', '#3a3a48'] }, traits: { brave: .2, phone: .3, pace: 1.6, idles: [] } });
def('peds', 'docker', { name: 'Dock worker', weight: 3, zones: ['harbor', 'brick', 'foundry', 'scrapyard', 'voltage'], builds: ['bulky', 'heroic'], outfits: ['shirt', 'coat'], sleeves: ['short', 'long'], hairs: ['short', 'bald'],
  hats: [null, { style: 'cap', color: '#e8a03a' }, { style: 'cap', color: '#5a6a7a' }],
  palettes: { cloth: ['#e8a03a', '#c8423a', '#5a6a7a', '#3a5a8a'], coat: ['#e8c040', '#ff7a3a'], pants: ['#3a4a6a', '#4a4a4a'] }, traits: { tough: .45, brave: .3, phone: .3, idles: ['smoke', 'chat'] } });
def('peds', 'retiree', { name: 'Retiree', weight: 2, times: ['day'], zones: ['palm', 'brick', 'foundry'], builds: ['chibi', 'bulky'], outfits: ['coat', 'shirt'], sleeves: ['long'], hairs: ['bald', 'short'],
  hats: [null, { style: 'cap', color: '#8a8a90' }], palettes: { hair: ['#d8d8dc', '#a8a8b0', '#e8e8ec'], cloth: ['#c8b8e0', '#e0c8b8', '#b8e0c8'], coat: ['#8a6a5a', '#6a6a7a'], pants: ['#6a6a7a', '#8a7a6a'] },
  traits: { phone: .9, pace: .6, idles: ['bench', 'chat', 'shop'] } });
def('peds', 'clubber', { name: 'Club-goer', weight: 3, times: ['night'], zones: ['neon', 'palm'], builds: ['heroic', 'chibi'], outfits: ['shirt', 'coat'], hairs: ['spiky', 'long', 'ponytail', 'short'],
  palettes: { cloth: ['#ff4ad8', '#5af0ff', '#d8ff4a', '#ff4a4a', '#ffffff'], coat: ['#1e1e24', '#4a2a6a'], pants: ['#1e1e24', '#2a2a40'] }, traits: { phone: .3, pace: .9, idles: ['dance', 'chat', 'smoke'] } });
def('peds', 'vendor', { name: 'Vendor', weight: 1, zones: ['neon', 'harbor', 'palm', 'foundry'], builds: ['bulky', 'heroic'], outfits: ['shirt'], hairs: ['short', 'bald'], hats: [{ style: 'cap', color: '#e8e8ec' }, { style: 'cap', color: '#c8423a' }],
  palettes: { cloth: ['#e8e8ec', '#e8c040'], pants: ['#3a3a44'] }, traits: { tough: .3, phone: .6, pace: .8, idles: ['shop', 'chat'] } });
def('peds', 'skater', { name: 'Skater', weight: 1, zones: ['brick', 'palm', 'neon', 'scrapyard'], builds: ['chibi', 'heroic'], outfits: ['shirt'], hairs: ['spiky', 'long'], hats: [null, { style: 'cap', color: '#3a8a5a' }, { style: 'cap', color: '#3a3a44' }],
  palettes: { cloth: ['#3a8a5a', '#c84a3a', '#8a3a8a', '#e8c040'], pants: ['#5a6a8a', '#3a3a44'] }, traits: { brave: .25, phone: .2, pace: 1.3, idles: ['chat', 'smoke'] } });
def('peds', 'busker', { name: 'Busker', weight: .6, zones: ['neon', 'palm'], builds: ['heroic'], outfits: ['coat'], sleeves: ['long'], hairs: ['long', 'spiky'], hats: [{ style: 'cap', color: '#c8423a' }],
  palettes: { cloth: ['#e8c040'], coat: ['#5a3a6a', '#3a5a3a'], pants: ['#3a3a44'] }, traits: { phone: .2, pace: .7, idles: ['dance'] } });
def('peds', 'nightowl', { name: 'Night owl', weight: 2, times: ['night'], zones: ['brick', 'harbor', 'foundry', 'scrapyard', 'voltage'], builds: ['heroic', 'bulky'], outfits: ['coat'], sleeves: ['long'], hairs: ['short', 'bald', 'spiky'],
  hats: [null, { style: 'cap', color: '#2a2a30' }], palettes: { cloth: ['#5a5a66', '#3a3a44'], coat: ['#2a2630', '#3a2a22'], pants: ['#1e1e24'] }, traits: { tough: .4, brave: .3, phone: .2, idles: ['smoke'] } });
// the services (in uniform: dispatched, never wandering by weight)
def('peds', 'paramedic', { name: 'Paramedic', kind: 'service', faction: 'medic', weight: 0, builds: ['heroic'], outfits: ['shirt'], hairs: ['short', 'ponytail'], uniform: true,
  palettes: { cloth: ['#e8e8ec'], pants: ['#2a6ac8'], boot: ['#18161c'] }, traits: { brave: .6, phone: 0 } });
def('peds', 'firefighter', { name: 'Firefighter', kind: 'service', faction: 'fire', weight: 0, builds: ['bulky'], outfits: ['coat'], sleeves: ['long'], hats: [{ style: 'helmet', color: '#e8c040' }], uniform: true,
  palettes: { cloth: ['#c8423a'], coat: ['#3a3a30'], pants: ['#3a3a30'], boot: ['#18161c'] }, traits: { brave: .8, phone: 0 } });
def('peds', 'mpd', { name: 'MPD officer', kind: 'service', faction: 'police', weight: 0, builds: ['heroic'], outfits: ['shirt'], hats: [{ style: 'cap', color: '#1e2a4a' }], uniform: true,
  palettes: { cloth: ['#3a5a9a'], pants: ['#1e2a4a'], boot: ['#101014'], belt: ['#101014'] }, traits: { tough: 1, brave: 1, phone: 0 }, weapons: ['fists', 'snub38'] });
// the bank's guards (PLAN.md 8.21): grey shirts and caps, a revolver; their eyes, mind and rounds are the interior's
def('peds', 'guard', { name: 'Bank guard', kind: 'service', faction: 'security', weight: 0, builds: ['heroic', 'bulky'], outfits: ['shirt'], hats: [{ style: 'cap', color: '#3a3a44' }], uniform: true,
  palettes: { cloth: ['#7a7e88'], pants: ['#2a2a32'], boot: ['#101014'], belt: ['#101014'] }, traits: { tough: 1, brave: 1, phone: 0 }, weapons: ['fists', 'snub38'], health: 100 });
// SWAT (4 stars: in the Rhino, three to a van) and the Feds (5 stars: two to a black sedan); D19: the Feds' long gun is
// the Buzzsaw (the slice's arsenal has no rifle)
def('peds', 'swat', { name: 'SWAT trooper', kind: 'service', faction: 'police', weight: 0, builds: ['bulky'], outfits: ['coat'], sleeves: ['long'], hats: [{ style: 'helmet', color: '#1e1e24' }], uniform: true,
  palettes: { cloth: ['#2a2a30'], coat: ['#1e1e24'], pants: ['#1e1e24'], boot: ['#101014'], belt: ['#3a3a44'] }, traits: { tough: 1, brave: 1, phone: 0 }, weapons: ['fists', 'persuader'], health: 120, armor: 60 });
def('peds', 'fed', { name: 'Fed', kind: 'service', faction: 'police', weight: 0, builds: ['heroic'], outfits: ['coat'], sleeves: ['long'], hairs: ['short'], uniform: true,
  palettes: { cloth: ['#e8e8ec'], coat: ['#202026'], pants: ['#202026'], boot: ['#101014'], hair: ['#1e1a22'] }, traits: { tough: 1, brave: 1, phone: 0 }, weapons: ['fists', 'buzzsaw'], health: 110, armor: 40 });
// the Marching Mimes (PLAN.md 8.10): six in single file, striped and white-faced
def('peds', 'mime', { name: 'Marching Mime', kind: 'special', faction: 'mimes', weight: 0, builds: ['chibi'], outfits: ['shirt'], sleeves: ['long'], hairs: ['bald'], hats: [{ style: 'cap', color: '#1e1e24' }], uniform: true,
  palettes: { skin: ['#f4f0f0'], cloth: ['#f0f0f0'], pants: ['#1e1e24'], boot: ['#1e1e24'], belt: ['#c8423a'] }, traits: { tough: 1, brave: 1, phone: 0, pace: .7 } });
