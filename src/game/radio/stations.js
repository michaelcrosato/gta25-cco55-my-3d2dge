// Lowtown's four stations (PLAN.md 9.9). M4 tunes them in by name; M10 gives them their music, ads and DJs.
import { def } from '../../motor/index.js';

def('stations', 'crash', { name: 'CRASH FM', freq: '101.1', dj: 'Captain Static', genre: 'synth-punk', color: '#ff5a3a' });
def('stations', 'wheelz', { name: 'WHEELZ', freq: '88.8', dj: 'MC Lugnut', genre: 'boom-bap chip beats', color: '#ffd23a' });
def('stations', 'neon', { name: 'NEON DRIVE', freq: '85.0', dj: 'Nova', genre: 'synthwave', color: '#ff6ad8' });
def('stations', 'lowdown', { name: 'LOWDOWN TALK', freq: '1210 AM', dj: 'Phil Buster', genre: 'talk radio', color: '#8ad0ff' });
