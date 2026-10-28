// An arcade cabinet (PLAN.md 19's backlog, HANDOFF L4): one of my-3D2dge's own starter kits, run inside the game. The
// cabinet is a second engine Game that never loops: the play scene steps it with its own steps while the player stands
// at the cabinet, and draws it into the cabinet's screen. The kit is the engine's reference slice verbatim (vendored,
// read-only: vendor/my-3d2dge/reference), its scenes made by running its source with the few names the starter file
// it was cut from shares (a best score kept, the control prompts, the corner's edge, a score padded to seven figures,
// no touch screen); the cabinet adds a title (INSERT COIN) and a GAME OVER of its own. Its input is fed each step from
// the play scene's 'arcade' controls (the stick, ✕ fire, ○ bomb: a person's, the bot's or the bot's through a pad, the
// same), and in a browser it hears the keys and the pad itself as well. Deterministic: a kit's game has no clock of
// its own here, and what it reads back (the score, the end) depends on the steps it was given only.
//   const A = new Arcade({ E, kit: get('arcadeKits', 'shooter'), canvas })  ·  A.step(dt, { up, down, left, right, fire, bomb })
//   A.draw() (a browser: the kit's frame drawn; A.frame -> { img, w, h } its picture)  ·  A.state -> { scene, score, over, best, plays }  ·  A.dispose()
import { declare } from '../core/registry.js';
import { shape } from '../core/schema.js';

/** a starter kit a cabinet runs: source (the slice's text, read-only from the engine's reference), scene (the one it
 *  plays), res, title (the cabinet's marquee), input (the codes each control presses in the kit) */
declare('arcadeKits', shape({
  title: { type: 'string', req: true }, source: { type: 'string', req: true }, scene: { type: 'string', req: true },
  res: { type: 'array', def: [240, 320] }, input: { type: 'object', def: {} }, color: { type: 'string', def: '#5af0ff' },
}));
const CODES = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'KeyZ', bomb: 'KeyX' };
// a small seeded generator (mulberry32): the kit's dice (the engine's E.rand is Math.random) while it runs, so a play
// takes nothing from the game's own stream and the same steps make the same play
const dice = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

export class Arcade {
  /** o: { E (the engine), kit (an arcadeKits entry), canvas (a canvas element to draw into; none headless) } */
  constructor(o) {
    const E = this.E = o.E, kit = this.kit = o.kit, prev = E.current;
    this.best = 0; this.last = null; this.plays = 0; this.ended = false; this.held = new Set(); this.rand = dice(1);
    this.codes = { ...CODES, ...kit.input };
    this.game = new E.Game({ canvas: o.canvas || null, headless: !o.canvas, res: kit.res, expand: false, view: 'overhead', input: 'SHMUP', menu: false, corner: false, loop: false, id: 'cabinet-' + kit.id });
    E.current = prev;   // (the cabinet is never "the" game: the tools and tests read E.current as GTM's)
    const game = this.game, me = this;
    // the names the kit's starter file shares with its slices
    const shared = {
      window: typeof window !== 'undefined' ? window : globalThis, E, game, px: E.px, TAU: Math.PI * 2, scenes: {},
      A: game.audio, P: game.particles, L: game.lights, gpu: null, approach: E.approach, clamp: E.clamp, lerp: E.lerp,
      best: (key, score) => { me.last = score; me.best = Math.max(me.best, score); me.ended = true; return me.best; },
      prompt: (action, label) => ({ fire: '✕', bomb: '○', shot: '✕' }[action] || action.toUpperCase()) + ' ' + label.toUpperCase(),
      cornerX: () => game.W, pad: n => String(Math.floor(n)).padStart(7, '0'), touch: () => false,
    };
    const names = Object.keys(shared), make = new Function(...names, kit.source + '\nreturn scenes;');   // (the kit's own source, as the starter file holds it)
    const scenes = this._kit(() => make(...names.map(k => shared[k])));
    // the cabinet's own: a title and a GAME OVER (the kit's ending goes to them)
    const big = (g, s, y, c) => E.font.title(g, s, game.W / 2, y, { align: 'center', scale: 2, colors: ['#ffffff', c, '#3a2a8a'] });
    const line = (g, s, y, c = '#c8d0f0') => E.font.text(g, s, game.W / 2, y, c, { align: 'center', shadow: '#05060c', outline: false });
    scenes.title = { view: 'overhead', input: 'SHMUP', res: kit.res, update() { if (game.input.pressed('fire') || game.input.pressed('confirm')) { me.ended = false; me.plays++; me.rand = dice(me.plays); game.go(kit.scene, null, { fade: 0 }); } },
      draw(r) { r.overlay(g => { g.fillStyle = '#07061a'; g.fillRect(0, 0, game.W, game.H); big(g, kit.title, game.H * .3, kit.color); line(g, 'HI ' + shared.pad(me.best), game.H * .5); if ((game.time * 2 | 0) % 2) line(g, 'INSERT COIN: ✕', game.H * .65, '#ffe066'); }); } };
    scenes.over = { view: 'overhead', input: 'SHMUP', res: kit.res, update() { if (game.input.pressed('fire') || game.input.pressed('confirm')) game.go('title', null, { fade: 0 }); },
      draw(r) { r.overlay(g => { g.fillStyle = '#07061a'; g.fillRect(0, 0, game.W, game.H); big(g, 'GAME OVER', game.H * .3, '#ff5a5a'); line(g, 'SCORE ' + shared.pad(me.last || 0), game.H * .5); line(g, 'HI ' + shared.pad(me.best), game.H * .58); line(g, '✕: AGAIN', game.H * .72, '#ffe066'); }); } };
    game.start({ scenes, scene: 'title' });
    this.scenes = scenes;
  }
  // fn run with the kit's dice in Math.random's place (restored after, whatever happens)
  _kit(fn) {
    // (the kit's own dice swapped in and out: its E.rand reads Math.random, and this keeps it off the game's stream)
    const R = Math.random; Math.random = this.rand; try { return fn(); } finally { Math.random = R; }   // eslint-disable-line no-restricted-properties
  }
  /** one step of the cabinet: the controls held this step (each pressed into the kit's input, let go when released) */
  step(dt, b = {}) {
    const inp = this.game.input;
    for (const k in this.codes) { const code = this.codes[k], on = !!b[k]; if (on && !this.held.has(code)) { inp.press(code); this.held.add(code); } else if (!on && this.held.has(code)) { inp.release(code); this.held.delete(code); } }
    this._kit(() => this.game.advance(dt));
  }
  /** the kit's frame drawn (a browser; nothing headless) */
  draw() { this._kit(() => this.game.advance(0, { draw: true })); }
  /** the kit's last frame: its screen's buffer, w x h at the kit's resolution (null headless). The buffer, not the
   *  canvas: the engine sizes a canvas to where it sits on the page, and the cabinet's sits nowhere */
  get frame() { const s = this.game.screen; return s && s.buf ? { img: s.buf, w: s.W, h: s.H } : null; }
  /** what the play scene reads: the kit's scene, the score of the play under way (or the last one's), whether that play
   *  ended (the ship lost, or the fortress down), the best, how many plays were started */
  get state() {
    const sc = this.game.scene && this.game.sceneName, live = this.scenes[this.kit.scene] && this.scenes[this.kit.scene].state ? this.scenes[this.kit.scene].state() : null;
    return { scene: sc || null, score: sc === this.kit.scene && live && !this.ended ? live.score : this.last ?? 0, over: this.ended, best: this.best, plays: this.plays, ship: live && live.ship ? { x: live.ship.x, y: live.ship.y } : null };
  }
  dispose() { const E = this.E, prev = E.current; for (const c of this.held) this.game.input.release(c); this.game.dispose(); E.current = prev === this.game ? null : prev; }
}
