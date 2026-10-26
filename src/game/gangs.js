// Lowtown's gangs (PLAN.md 9.3, 8.14): each with its turf, its HQ and payphone, its rival, its cars and guns, its two
// kinds of member (src/game/peds/gangs.js), and the beats its patrols walk by its borders, where rivals meet.
//   Chrome Saints: Neon Mile, cyan and silver, a diamond, diagonal stripes; the Saint and the Zephyr GT; pistols and
//   SMGs; their rivals the Harbor Rats.
//   Harbor Rats: the Harborfront, yellow and black, a triangle, dots; the Hauler and the Bilge Rat; shotguns and
//   Molotovs; their rivals the Lawn Gnomes.
//   Lawn Gnomes: Palm Terraces, pink and mint, a circle, checks; the Retiree and the Brute; bats and grenades; their
//   rivals the Chrome Saints. In Ironside (EXPANSION.md 3) the Foundry too, the Union Hall their HQ there and their
//   rivals there the Rust Monks; one respect for both districts.
// Ironside's two (EXPANSION.md 3, X3):
//   Rust Monks: Scrapyard Flats, rust and bronze, a cross, rivets; the Scrapper; the Nail Gun and the bat; their
//   rivals the Volt Boys; the Scrap Cathedral their HQ.
//   Volt Boys: Voltage Row, safety yellow and black, a bolt, chevrons; the Bucket; the Zap-O-Matic and the Tesla Coil;
//   their rivals the Lawn Gnomes; Substation 9 their HQ.
// Glass Heights' (EXPANSION.md 3, X6), and the Chrome Saints uptown (Cathedral Hill, St. Chrome's their HQ there, the
// Yacht Club their rivals there; one respect for both districts):
//   Velvet Syndicate: the Strip, plum and gold, a spade, damask; the Velvet limo; the Buzzsaw and the Persuader; their
//   rivals the Chrome Saints; the Velvet Casino their HQ.
//   Yacht Club: Marina Heights, navy and white, an anchor, bands (a sailor's stripes: the Saints' are diagonal); the
//   Regatta and the Zephyr GT; the Flare Gun and the Snub .38; their rivals the Velvet Syndicate; the Club their HQ.
import { def } from '../motor/index.js';

const THRESHOLDS = { hostile: -20, friendly: 40 };
def('gangs', 'saints', { name: 'Chrome Saints', colors: ['#5af0ff', '#c8c8d0'], icon: 'diamond', pattern: 'stripes', turf: ['neon', 'hill'], hq: 'saints-hq', phone: 'phone-saints', rival: 'rats',
  vehicles: ['saint', 'zephyr'], weapons: ['snub38', 'buzzsaw'], peds: { grunt: 'saint-grunt', enforcer: 'saint-enforcer' }, thresholds: THRESHOLDS, chain: ['s1', 's2', 's3', 'gs1', 'gs2'],
  beats: [[86, 38], [120, 70], [92, 31, 'glass-heights'], [64, 31, 'glass-heights']], hqs: { 'glass-heights': 'st-chrome' }, rivals: { 'glass-heights': 'yacht' } });
def('gangs', 'rats', { name: 'Harbor Rats', colors: ['#ffd23a', '#1e1e24'], icon: 'triangle', pattern: 'dots', turf: ['harbor'], hq: 'rats-hq', phone: 'phone-rats', rival: 'gnomes',
  vehicles: ['hauler', 'bilgerat'], weapons: ['persuader', 'partystarter'], peds: { grunt: 'rat-grunt', enforcer: 'rat-enforcer' }, thresholds: THRESHOLDS, chain: ['r1', 'r2', 'r3'],
  beats: [[120, 83], [86, 84]] });
def('gangs', 'gnomes', { name: 'Lawn Gnomes', colors: ['#ff8ac8', '#8affc8'], icon: 'circle', pattern: 'checks', hq: 'gnomes-hq', phone: 'phone-gnomes', rival: 'saints',
  vehicles: ['retiree', 'brute'], weapons: ['slugger', 'pineapple'], peds: { grunt: 'gnome-grunt', enforcer: 'gnome-enforcer' }, thresholds: THRESHOLDS, chain: ['g1', 'g2', 'g3', 'ig1', 'ig2'],
  beats: [[73, 38], [73, 70], [60, 18, 'ironside'], [36, 53, 'ironside']], turf: ['palm', 'foundry'], hqs: { ironside: 'union-hall' }, rivals: { ironside: 'monks' } });
def('gangs', 'monks', { name: 'Rust Monks', colors: ['#c8642a', '#d8b060'], icon: 'cross', pattern: 'rivets', turf: ['scrapyard'], hq: 'scrap-cathedral', phone: 'phone-monks', rival: 'volts',
  vehicles: ['scrapper'], weapons: ['nailgun', 'slugger'], peds: { grunt: 'monk-grunt', enforcer: 'monk-enforcer' }, thresholds: THRESHOLDS, chain: ['im1', 'im2'],
  beats: [[36, 60, 'ironside'], [60, 92, 'ironside']] });
def('gangs', 'volts', { name: 'Volt Boys', colors: ['#ffd23a', '#26262c'], icon: 'bolt', pattern: 'chevrons', turf: ['voltage'], hq: 'substation', phone: 'phone-volts', rival: 'gnomes',
  vehicles: ['bucket'], weapons: ['zapomatic', 'teslacoil'], peds: { grunt: 'volt-grunt', enforcer: 'volt-enforcer' }, thresholds: THRESHOLDS, chain: ['iv1', 'iv2'],
  beats: [[68, 92, 'ironside'], [68, 18, 'ironside']] });
def('gangs', 'velvet', { name: 'Velvet Syndicate', colors: ['#8a3a9a', '#d8b04a'], icon: 'spade', pattern: 'damask', turf: ['strip'], hq: 'velvet-casino', phone: 'phone-velvet', rival: 'saints',
  vehicles: ['velvetlimo'], weapons: ['buzzsaw', 'persuader'], peds: { grunt: 'velvet-grunt', enforcer: 'velvet-enforcer' }, thresholds: THRESHOLDS, chain: ['gv1', 'gv2'],
  beats: [[64, 33, 'glass-heights'], [38, 78, 'glass-heights'], [92, 78, 'glass-heights']] });   // (the Saints met at Heights Avenue and Observatory Lane: east of it, the penthouse's door had stood in their wars)
def('gangs', 'yacht', { name: 'Yacht Club', colors: ['#2a3a7a', '#f0f0f4'], icon: 'anchor', pattern: 'bands', turf: ['marina'], hq: 'yacht-club', phone: 'phone-yacht', rival: 'velvet',
  vehicles: ['regatta', 'zephyr'], weapons: ['snub38', 'flaregun'], peds: { grunt: 'yacht-grunt', enforcer: 'yacht-enforcer' }, thresholds: THRESHOLDS, chain: ['gy1', 'gy2'],
  beats: [[64, 81, 'glass-heights'], [117, 81, 'glass-heights']] });
