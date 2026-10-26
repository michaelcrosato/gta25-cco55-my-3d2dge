// The gangs' members (PLAN.md 9.8): a grunt and an enforcer for each, in their gang's colours (every one
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
// Ironside's (EXPANSION.md 3): the Rust Monks in brown robes under welding masks, the bronze of their trim; the Volt Boys
// in safety-yellow coats and hard hats over black
G('monk-grunt', { name: 'Rust Monk', faction: 'monks', builds: ['heroic', 'bulky'], outfits: ['robe'], sleeves: ['long'], hairs: ['bald', 'short'], hats: [{ style: 'helmet', color: '#3a3a40' }, { style: 'helmet', color: '#5a4a3a' }, null],
  palettes: { cloth: ['#6a4028', '#7a4a2a', '#5a3a26'], coat: ['#c8642a', '#a85a2a'], pants: ['#3a2a20', '#2a2420'], belt: ['#d8b060'] }, weapons: ['fists', 'nailgun'], health: 100 });
G('monk-enforcer', { name: 'Monk enforcer', faction: 'monks', builds: ['bulky'], outfits: ['robe'], sleeves: ['long'], hairs: ['bald'], hats: [{ style: 'helmet', color: '#2a2a30' }],
  palettes: { cloth: ['#5a3420'], coat: ['#c8642a'], pants: ['#2a2420'], belt: ['#d8b060'] }, weapons: ['fists', 'slugger', 'nailgun'], health: 140, armor: 30 });
G('volt-grunt', { name: 'Volt Boy', faction: 'volts', builds: ['heroic', 'chibi'], outfits: ['coat', 'shirt'], hairs: ['short', 'spiky'], hats: [{ style: 'helmet', color: '#ffd23a' }, { style: 'cap', color: '#26262c' }],
  palettes: { cloth: ['#26262c', '#ffd23a'], coat: ['#ffd23a', '#e8c020', '#f0d840'], pants: ['#26262c', '#3a3a40'] }, weapons: ['fists', 'zapomatic'], health: 100 });
G('volt-enforcer', { name: 'Volt enforcer', faction: 'volts', builds: ['bulky'], outfits: ['coat'], sleeves: ['long'], hairs: ['short', 'bald'], hats: [{ style: 'helmet', color: '#ffd23a' }],
  palettes: { cloth: ['#26262c'], coat: ['#ffd23a'], pants: ['#1e1e24'] }, weapons: ['fists', 'zapomatic', 'teslacoil'], health: 140, armor: 30 });
