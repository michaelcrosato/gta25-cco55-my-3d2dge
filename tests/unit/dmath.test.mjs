// MOTOR's deterministic Math (D33, src/motor/core/dmath.js): each function is Node 22's own, bit for bit (a port of
// V8 12.4's fdlibm and its hypot builtin), install() puts them on a Math, and every Math function the page's scripts
// call is either one of them or exact everywhere (so nothing in the page is left to the browser's own libm).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DMath, install } from '../../src/motor/core/dmath.js';
import { ENGINE, MOCAP, prelude } from '../../tools/build.mjs';

const NATIVE = vm.runInNewContext('Math');   // (a fresh realm's: no prelude has touched it)
const F64 = new Float64Array(1), U32 = new Uint32Array(F64.buffer);
let s = 2463534242;
const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const bits = () => { U32[0] = (r() * 4294967296) >>> 0; U32[1] = (r() * 4294967296) >>> 0; return F64[0]; };
const SPECIALS = [0, -0, Infinity, -Infinity, NaN, 1, -1, 0.5, -0.5, 2, Math.PI, -Math.PI, Math.PI / 2, Math.PI / 4,
  1e-300, 5e-324, 2.2250738585072014e-308, 1e300, 1.7976931348623157e308, 2 ** 19 * Math.PI / 2, 2 ** 20 * Math.PI / 2, 1e22,
  709.78, 709.79, -745.13, -745.14];
const RANGES = [1e-8, 0.5, 1, 1.6, 3.2, 7, 50, 1e3, 1e6, 1e12];
const same = (f, args) => {
  const a = NATIVE[f](...args), b = DMath[f](...args);
  if (!Object.is(a, b)) assert.fail(`${f}(${args.join(', ')}): Node ${a}, DMath ${b}`);
};

test('each of DMath\'s functions is Node\'s own, bit for bit (specials, 120,000 drawn arguments, random bit patterns)', () => {
  const N = 120000;
  for (const f of ['sin', 'cos', 'tan', 'atan', 'exp']) {
    for (const x of SPECIALS) same(f, [x]);
    for (let i = 0; i < N; i++) {
      same(f, [f === 'exp' ? (r() * 2 - 1) * [1e-9, 0.3, 1, 5, 50, 700, 750][i % 7] : (r() * 2 - 1) * RANGES[i % RANGES.length]]);
      if (i % 8 === 0) same(f, [bits()]);
    }
  }
  for (const f of ['asin', 'acos']) {
    for (const x of SPECIALS) same(f, [x]);
    for (let i = 0; i < N; i++) same(f, [(r() * 2 - 1) * (i % 2 ? 1 : 0.5)]);
  }
  for (const f of ['atan2', 'pow', 'hypot']) {
    for (const x of SPECIALS) for (const y of SPECIALS) same(f, [x, y]);
    for (let i = 0; i < N; i++) {
      if (f === 'pow') { same(f, [r() * [0.01, 1, 2, 10, 1e3][i % 5], (r() * 2 - 1) * [0.5, 2, 10, 100][i % 4]]); same(f, [-(r() * 10), Math.round((r() * 2 - 1) * 40)]); }
      else same(f, [(r() * 2 - 1) * RANGES[i % RANGES.length], (r() * 2 - 1) * RANGES[(i * 7) % RANGES.length]]);
      if (i % 8 === 0) same(f, [bits(), bits()]);
    }
  }
  for (let i = 0; i < 20000; i++) { const a = r() * 100 - 50, b = r() * 100 - 50, c = r() * 100 - 50; same('hypot', [a, b, c]); same('hypot', [a]); same('hypot', [a, b, c, a - b]); }
  same('hypot', []);
});

test('install() puts DMath\'s functions on a Math, and the prelude does it first in the page and headless', () => {
  const M = vm.runInNewContext('Math');
  install(M);
  for (const [k, f] of Object.entries(DMath)) assert.equal(M[k], f, k);
  const ctx = vm.createContext({});
  vm.runInContext(prelude(), ctx);
  assert.equal(vm.runInContext('Math.sin(1e5) === ' + DMath.sin(1e5) + ' && Math.sin.name === "sin" && Math.sin !== Math.cos', ctx), true);
  assert.notEqual(vm.runInContext('Math.sin', ctx), NATIVE.sin, 'the prelude\'s own, not the realm\'s');
  const html = readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('src/motor/core/dmath.js') < html.indexOf('Procedural pixel-puppet engine'), 'the prelude comes before the engine in the page');
});

test('every Math function the page\'s scripts call is DMath\'s or exact in every runtime (D33)', () => {
  const EXACT = new Set(['abs', 'floor', 'ceil', 'round', 'trunc', 'sign', 'min', 'max', 'sqrt', 'fround', 'imul', 'clz32', 'random',
    'PI', 'E', 'SQRT2', 'SQRT1_2', 'LN2', 'LN10', 'LOG2E', 'LOG10E']);
  const files = [ENGINE, ...MOCAP, ...execFileSync('git', ['ls-files', 'src/*.js'], { encoding: 'utf8' }).trim().split('\n')];
  const used = new Map();
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bMath\.([A-Za-z0-9_]+)/g)) if (!used.has(m[1])) used.set(m[1], f);
  for (const [k, f] of used) assert.ok(EXACT.has(k) || k in DMath, `Math.${k} (in ${f}) differs between runtimes: port it to src/motor/core/dmath.js first (D33)`);
  // ** is pow too, but not Math.pow: MOTOR and the content write Math.pow (the engine's one ** is in a light pool's drawing)
  for (const f of files.filter(f => f.startsWith('src/'))) assert.doesNotMatch(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /[\w)\]]\s*\*\*\s*[\w(.-]/, `${f}: ** bypasses DMath.pow: write Math.pow (D33)`);
});
