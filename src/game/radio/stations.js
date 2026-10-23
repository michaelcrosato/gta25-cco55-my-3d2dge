// Lowtown's four stations (PLAN.md 9.9): their music made by MOTOR's composer from each genre and a seed, their DJs'
// lines, their ads and their jingles; LOWDOWN TALK's call-ins over a bed. Words only (subtitles): the radio has no
// voices. All original: the ads mock Lowtown's own businesses.
import { def } from '../../motor/index.js';

const ADS = {
  kwiklux: { name: 'KWIK-LUX', lines: ['Kwik-Lux. Open twenty-five hours a day.', 'That extra hour? We don\'t ask what you do in it.', 'Kwik-Lux: the till is always full. Please don\'t check.'] },
  boombox: { name: 'BOOM BOX GARAGE', lines: ['Boom Box Garage! Armour, nitro, a roof-mounted machine gun!', 'Is it legal? Is your car? See you at Boom Box!'] },
  chapel: { name: 'SAINT MOTO\'S CHAPEL', lines: ['Saint Moto\'s Chapel of the Open Road.', 'We save. You donate.', 'Blessings by the mile. Chrome optional, faith encouraged.'] },
  gutterball: { name: 'GUTTERBALL LANES', lines: ['Gutterball Lanes: forty lanes, thirty-nine working.', 'Rent the shoes. Keep the shoes. We stopped counting.'] },
  general: { name: 'LOWTOWN GENERAL', lines: ['Lowtown General Hospital. Now with fewer waits!', 'Fewer waits. Not fewer waiting. Bring a snack.'] },
  leadfarm: { name: 'LEAD FARM', lines: ['Lead Farm: Lowtown\'s family-owned arms dealer since last Tuesday.', 'Ask about our layaway plan. Don\'t ask about anything else.'] },
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
