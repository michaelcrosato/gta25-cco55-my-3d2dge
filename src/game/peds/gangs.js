// The gangs' members (PLAN.md 9.8): a grunt and an enforcer for each of the three, in their gang's colours (every one
// its own mix of them), carrying its weapons (src/game/gangs.js). Never picked by the crowd's civilian spawner: the
// gangs put them down themselves (gangs.js).
import { def } from '../../motor/index.js';

const G = (id, spec) => def('peds', id, { kind: 'gang', weight: 0, traits: { tough: 1, brave: .9, phone: 0, pace: .9, idles: ['chat', 'smoke'] }, ...spec });
G('saint-grunt', { name: 'Chrome Saint', faction: 'saints', builds: ['heroic', 'chibi'], outfits: ['shirt', 'coat'], hairs: ['spiky', 'short', 'ponytail'], hats: [null, { style: 'cap', color: '#c8c8d0' }],
  palettes: { cloth: ['#5af0ff', '#3ad0e8', '#8af6ff'], coat: ['#c8c8d0', '#a8a8b4'], pants: ['#2a2a34', '#3a3a48'] }, weapons: ['fists', 'snub38'], health: 100 });
G('saint-enforcer', { name: 'Saint enforcer', faction: 'saints', builds: ['bulky'], outfits: ['coat'], sleeves: ['long'], hairs: ['bald', 'short'], hats: [{ style: 'cap', color: '#5af0ff' }],
  palettes: { cloth: ['#5af0ff'], coat: ['#c8c8d0', '#d8d8e0'], pants: ['#1e1e24'] }, weapons: ['fists', 'buzzsaw'], health: 140, armor: 30 });
G('rat-grunt', { name: 'Harbor Rat', faction: 'rats', builds: ['heroic', 'bulky'], outfits: ['shirt'], hairs: ['short', 'spiky', 'bald'], hats: [{ style: 'band', color: '#ffd23a' }, { style: 'cap', color: '#1e1e24' }, null],
  palettes: { cloth: ['#ffd23a', '#e8c040', '#1e1e24'], pants: ['#1e1e24', '#2a2a30'] }, weapons: ['fists', 'partystarter'], health: 100 });
G('rat-enforcer', { name: 'Rat enforcer', faction: 'rats', builds: ['bulky'], outfits: ['coat'], sleeves: ['long'], hairs: ['bald', 'short'], hats: [{ style: 'cap', color: '#ffd23a' }],
  palettes: { cloth: ['#ffd23a'], coat: ['#1e1e24', '#2a2626'], pants: ['#1e1e24'] }, weapons: ['fists', 'persuader', 'partystarter'], health: 140, armor: 30 });
G('gnome-grunt', { name: 'Lawn Gnome', faction: 'gnomes', builds: ['chibi'], outfits: ['shirt', 'coat'], hairs: ['long', 'short'], hats: [{ style: 'pointed', color: '#ff4a8a' }, { style: 'pointed', color: '#ff8ac8' }],
  palettes: { cloth: ['#ff8ac8', '#8affc8'], coat: ['#8affc8', '#5ad8a0'], pants: ['#4a6a5a', '#5a4a6a'] }, weapons: ['slugger'], health: 100 });
G('gnome-enforcer', { name: 'Gnome enforcer', faction: 'gnomes', builds: ['bulky'], outfits: ['coat'], sleeves: ['long'], hairs: ['long'], hats: [{ style: 'pointed', color: '#ff4a8a' }],
  palettes: { cloth: ['#ff8ac8'], coat: ['#8affc8'], pants: ['#4a6a5a'], hair: ['#e8e8ec', '#d8d8dc'] }, weapons: ['slugger', 'pineapple'], health: 140, armor: 30 });
