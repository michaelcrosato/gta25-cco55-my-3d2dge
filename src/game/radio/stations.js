// Lowtown's six stations (PLAN.md 9.9, 19): their music made by MOTOR's composer from each genre and a seed, their DJs'
// lines, their ads and their jingles; LOWDOWN TALK's call-ins over a bed. Words only (subtitles): the radio has no
// voices. All original: the ads mock Lowtown's own businesses. SURF CITY and VELVET (HANDOFF L4) bring genres of their
// own (def('genres')): surf rock's twang and drive, and a lounge's brushed swing.
import { def } from '../../motor/index.js';

const ADS = {
  kwiklux: { name: 'KWIK-LUX', lines: ['Kwik-Lux. Open twenty-five hours a day.', 'That extra hour? We don\'t ask what you do in it.', 'Kwik-Lux: the till is always full. Please don\'t check.'] },
  boombox: { name: 'BOOM BOX GARAGE', lines: ['Boom Box Garage! Armour, nitro, a roof-mounted machine gun!', 'Is it legal? Is your car? See you at Boom Box!'] },
  chapel: { name: 'SAINT MOTO\'S CHAPEL', lines: ['Saint Moto\'s Chapel of the Open Road.', 'We save. You donate.', 'Blessings by the mile. Chrome optional, faith encouraged.'] },
  gutterball: { name: 'GUTTERBALL LANES', lines: ['Gutterball Lanes: forty lanes, thirty-nine working.', 'Rent the shoes. Keep the shoes. We stopped counting.'] },
  general: { name: 'LOWTOWN GENERAL', lines: ['Lowtown General Hospital. Now with fewer waits!', 'Fewer waits. Not fewer waiting. Bring a snack.'] },
  leadfarm: { name: 'LEAD FARM', lines: ['Lead Farm: Lowtown\'s family-owned arms dealer since last Tuesday.', 'Ask about our layaway plan. Don\'t ask about anything else.'] },
  marina: { name: 'SALTY DOG MARINA', lines: ['Salty Dog Marina: slips by the hour, by the night, by the alibi.', 'Our boats float. Mostly. Ask for the dry ones.'] },
  burger: { name: 'BURGER BARON', lines: ['Burger Baron. Crowned the best burger on Neon Mile by Burger Baron.', 'The Baron Stack: four patties, one napkin. Good luck.'] },
};
for (const [id, ad] of Object.entries(ADS)) def('radioAds', id, ad);

def('stations', 'crash', { name: 'CRASH FM', freq: '101.1', dj: 'Captain Static', genre: 'synth-punk', color: '#ff5a3a', seed: 101,
  songs: [{ title: 'Ignition Riot', artist: 'The Spark Plugs' }, { title: 'Redline Heart', artist: 'Nitro Nuns' }, { title: 'Sirens in Stereo', artist: 'Brake Fail' }],
  djLines: ['Captain Static on CRASH FM. If your speakers aren\'t smoking, turn it up.', 'That was loud. This next one is louder. Static out.', 'Traffic report: there\'s traffic. Drive through it.', 'CRASH FM: music to total your car to.'],
  ads: ['boombox', 'leadfarm'], jingle: 'CRASH FM! One-oh-one point one!' });
def('stations', 'wheelz', { name: 'WHEELZ', freq: '88.8', dj: 'MC Lugnut', genre: 'boom-bap', color: '#ffd23a', seed: 888,
  songs: [{ title: 'Hubcap Hustle', artist: 'Lil Torque' }, { title: 'Four Wheel Flow', artist: 'Axle Grease' }, { title: 'Low and Slow', artist: 'DJ Differential' }],
  djLines: ['MC Lugnut on WHEELZ, eighty-eight point eight. Keep it rolling.', 'Shout out to everybody stuck on the Loop. Lean back.', 'WHEELZ: we bring the bass, you bring the trunk.', 'That beat came out of a tyre shop. True story.'],
  ads: ['gutterball', 'kwiklux'], jingle: 'Eighty-eight point eight. WHEELZ.' });
def('stations', 'neon', { name: 'NEON DRIVE', freq: '85.0', dj: 'Nova', genre: 'synthwave', color: '#ff6ad8', seed: 850,
  songs: [{ title: 'Midnight on Neon Mile', artist: 'Vector Rose' }, { title: 'Chrome Horizon', artist: 'Palm Static' }, { title: 'Overpass Lovers', artist: 'The Night Shift' }],
  djLines: ['Nova here, on NEON DRIVE. The city glows. So do you.', 'Somewhere a palm tree is lit up purple. That\'s us.', 'Windows down. Volume up. Nowhere to be.', 'NEON DRIVE: the long way home.'],
  ads: ['chapel', 'general'], jingle: 'NEON DRIVE. Eighty-five point oh.' });
def('stations', 'lowdown', { name: 'LOWDOWN TALK', freq: '1210 AM', dj: 'Phil Buster', genre: 'talk', color: '#8ad0ff', seed: 1210,
  talk: [
    ['PHIL: You\'re on LOWDOWN TALK. Go ahead, caller.', 'CALLER: The Lawn Gnomes moved my mailbox. Again.', 'PHIL: Did you move it back?', 'CALLER: It moved back by itself. Phil, I\'m scared.'],
    ['PHIL: Today\'s topic: are the Chrome Saints a gang or a car club?', 'CALLER: They blessed my hubcaps, Phil.', 'PHIL: Then they\'re a church. Next caller.'],
    ['CALLER: Why does the drawbridge go up every three hours?', 'PHIL: So the boats feel included. Next.'],
    ['PHIL: A listener asks: is the bank safe? Folks, it\'s a bank. Nothing is safe.', 'CALLER: My cousin works there. He says the vault hums.', 'PHIL: Your cousin should see a doctor.'],
    ['CALLER: There\'s a man in a mime suit on Dock Road.', 'PHIL: Is he doing anything?', 'CALLER: He\'s doing everything, Phil. Silently.'],
    ['PHIL: The Harbor Rats say the docks are theirs. The docks say nothing. Docks never do.', 'PHIL: Stay low, Lowtown. Back after this.'],
  ],
  djLines: ['Phil Buster, LOWDOWN TALK, twelve-ten AM. The lines are open, unfortunately.'], ads: ['general', 'chapel', 'kwiklux'], jingle: 'LOWDOWN TALK. Twelve-ten AM.' });

def('genres', 'surf-rock', { bpm: [154, 170], scale: 'mixo', roots: ['E', 'A', 'D'], progs: [[0, 3, 4, 3], [0, 6, 3, 4], [0, 0, 3, 4]],
  bass: { wave: 'triangle', rhythm: 'x.x.x.x.x.x.x.x.', vol: .2 },
  drums: { intro: 'k.......s.......', verse: 'k.h.s.h.k.k.s.h.', chorus: 'k.hks.hsk.hks.hh', bridge: 'k...s...k...s.s.' },
  lead: { wave: 'square', lo: 64, hi: 83, rhythm: ['xxxxx.x.', 'x.xxx.xx', 'xx.xxx..'], leap: 2, vol: .09 },
  keys: { wave: 'pulse', kind: 'stab', vol: .05 }, form: [['intro', 2], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['bridge', 4], ['chorus', 8], ['outro', 2]] });
def('genres', 'lounge', { bpm: [112, 124], scale: 'dorian', roots: ['F', 'C', 'G', 'D'], progs: [[1, 4, 0, 0], [0, 5, 1, 4], [3, 2, 1, 4]],
  bass: { wave: 'triangle', rhythm: 'x..x..x.x..x..x.', vol: .24, low: true },
  drums: { intro: 'h...h...h...h...', verse: 'k..h.hk.s..h.h..', chorus: 'k..h.hk.s.hh.hk.', bridge: 'h.h.h.h.h.h.h.h.' },
  lead: { wave: 'sine', lo: 65, hi: 79, rhythm: ['x...x.x.', '.x..x...', 'x.x...x.'], leap: 2, vol: .11 },
  keys: { wave: 'triangle', kind: 'chord', vol: .05 }, swing: true, form: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['bridge', 4], ['chorus', 8], ['outro', 4]] });

def('stations', 'surf', { name: 'SURF CITY', freq: '97.3', dj: 'Wipeout Wendy', genre: 'surf-rock', color: '#3ad8c8', seed: 973,
  songs: [{ title: 'Pier Pressure', artist: 'The Riptides' }, { title: 'Hang Ten on Dock Road', artist: 'Barnacle Bill & the Hulls' }, { title: 'Undertow', artist: 'Salt Spray Six' }],
  djLines: ['Wipeout Wendy, SURF CITY ninety-seven three. The tide\'s in and so are you.', 'No waves in Lowtown. We make our own.', 'If you can hear the gulls, you\'re near the harbour. If you can hear me, you\'re near greatness.', 'That one was reverb with a guitar on it. Love it.'],
  ads: ['marina', 'burger'], jingle: 'SURF CITY! Ninety-seven point three!' });
def('stations', 'velvet', { name: 'VELVET', freq: '92.1', dj: 'Sterling Lark', genre: 'lounge', color: '#c89aff', seed: 921,
  songs: [{ title: 'Cocktails at the Vault', artist: 'The Vanderbilt Trio' }, { title: 'Martini in the Rain', artist: 'Lola Velour' }, { title: 'Penthouse, Ground Floor', artist: 'Dewey Smooth' }],
  djLines: ['Good evening. This is Sterling Lark, and this is VELVET, ninety-two one.', 'Lowtown after dark: a little jazz, a little crime, a lot of neon.', 'Loosen the tie. Keep the hands on the wheel.', 'VELVET: smooth enough to drive to, slow enough to get away with.'],
  ads: ['chapel', 'burger', 'marina'], jingle: 'VELVET. Ninety-two point one.' });

