// MOTOR's deterministic Math (D33): the transcendental functions the simulation uses, computed in plain IEEE-754
// arithmetic (+ - * / and sqrt, which every engine rounds exactly), so a seed plays the same game in Node and in any
// browser. Browsers' own Math.sin, cos, atan2, exp, pow... differ in the last bit between engines and versions (Node
// 22's V8 and Chromium 153's disagree on about one argument in thirty), and the simulation's hash drifted apart with
// them (D31). This is a port of the fdlibm code in V8 12.4 (src/base/ieee754.cc, Node 22's), so headless results are
// those Node always gave: tests/unit/dmath.test.mjs holds each function to Node's own, bit for bit.
//
// ====================================================
// Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
//
// Developed at SunSoft, a Sun Microsystems, Inc. business.
// Permission to use, copy, modify, and distribute this
// software is freely granted, provided that this notice
// is preserved.
// ====================================================

// the words of a double (fdlibm's EXTRACT_WORDS and friends), little- or big-endian as the machine is
const F = new Float64Array(1), U = new Uint32Array(F.buffer), LE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const HI = LE ? 1 : 0, LO = LE ? 0 : 1;
const hiWord = d => { F[0] = d; return U[HI] | 0; };
const loWord = d => { F[0] = d; return U[LO]; };   // (unsigned)
const fromWords = (hi, lo) => { U[HI] = hi; U[LO] = lo; return F[0]; };
const withLo = (d, lo) => { F[0] = d; U[LO] = lo; return F[0]; };
const withHi = (d, hi) => { F[0] = d; U[HI] = hi; return F[0]; };

/** x * 2^n, exactly rounded (C's scalbn) */
function scalbn(x, n) {
  if (n > 1023) {
    x *= 8.98846567431158e307; n -= 1023;   // 2^1023
    if (n > 1023) { x *= 8.98846567431158e307; n -= 1023; if (n > 1023) n = 1023; }
  } else if (n < -1022) {
    x *= 2.2250738585072014e-308 * 9007199254740992; n += 1022 - 53;   // 2^-1022 * 2^53: no double rounding
    if (n < -1022) { x *= 2.2250738585072014e-308 * 9007199254740992; n += 1022 - 53; if (n < -1022) n = -1022; }
  }
  return x * fromWords((0x3ff + n) << 20, 0);
}

// ---- argument reduction: x rem pi/2 into y[0] + y[1] ----

const TWO_OVER_PI = [
  0xA2F983, 0x6E4E44, 0x1529FC, 0x2757D1, 0xF534DD, 0xC0DB62, 0x95993C, 0x439041, 0xFE5163, 0xABDEBB, 0xC561B7,
  0x246E3A, 0x424DD2, 0xE00649, 0x2EEA09, 0xD1921C, 0xFE1DEB, 0x1CB129, 0xA73EE8, 0x8235F5, 0x2EBB44, 0x84E99C,
  0x7026B4, 0x5F7E41, 0x3991D6, 0x398353, 0x39F49C, 0x845F8B, 0xBDF928, 0x3B1FF8, 0x97FFDE, 0x05980F, 0xEF2F11,
  0x8B5A0A, 0x6D1F6D, 0x367ECF, 0x27CB09, 0xB74F46, 0x3F669E, 0x5FEA2D, 0x7527BA, 0xC7EBE5, 0xF17B3D, 0x0739F7,
  0x8A5292, 0xEA6BFB, 0x5FB11F, 0x8D5D08, 0x560330, 0x46FC7B, 0x6BABF0, 0xCFBC20, 0x9AF436, 0x1DA9E3, 0x91615E,
  0xE61B08, 0x659985, 0x5F14A0, 0x68408D, 0xFFD880, 0x4D7327, 0x310606, 0x1556CA, 0x73A8C9, 0x60E27B, 0xC08C6B,
];
const NPIO2_HW = [
  0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C, 0x4025FDBB, 0x402921FB, 0x402C463A,
  0x402F6A7A, 0x4031475C, 0x4032D97C, 0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
  0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C, 0x4043A28C, 0x40446B9C, 0x404534AC,
  0x4045FDBB, 0x4046C6CB, 0x40478FDB, 0x404858EB, 0x404921FB,
];
const PIO2 = [
  1.57079625129699707031e+00, 7.54978941586159635335e-08, 5.39030252995776476554e-15, 3.28200341580791294123e-22,
  1.27065575308067607349e-29, 1.22933308981111328932e-36, 2.73370053816464559624e-44, 2.16741683877804819444e-51,
];
const INIT_JK = [2, 3, 4, 6];
const two24 = 1.67772160000000000000e+07, twon24 = 5.96046447753906250000e-08;
const KX = new Float64Array(3), KF = new Float64Array(20), KFQ = new Float64Array(20), KQ = new Float64Array(20);
const KIQ = new Int32Array(20);

/** fdlibm's __kernel_rem_pio2 for prec 2 (the only one rem_pio2 asks): x[0..nx-1] (24-bit chunks of |x|) */
function kernelRemPio2(x, y, e0, nx) {
  const prec = 2, ipio2 = TWO_OVER_PI, f = KF, fq = KFQ, q = KQ, iq = KIQ;
  const jk = INIT_JK[prec], jp = jk, jx = nx - 1;
  let jv = ((e0 - 3) / 24) | 0; if (jv < 0) jv = 0;
  let q0 = e0 - 24 * (jv + 1);
  let i, j, k, m, z, fw, n, ih, carry, jz;
  j = jv - jx; m = jx + jk;
  for (i = 0; i <= m; i++, j++) f[i] = j < 0 ? 0 : ipio2[j];
  for (i = 0; i <= jk; i++) { for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j]; q[i] = fw; }
  jz = jk;
  for (;;) {   // (recompute:)
    for (i = 0, j = jz, z = q[jz]; j > 0; i++, j--) {
      fw = (twon24 * z) | 0;
      iq[i] = (z - two24 * fw) | 0;
      z = q[j - 1] + fw;
    }
    z = scalbn(z, q0);
    z -= 8.0 * Math.floor(z * 0.125);
    n = z | 0;
    z -= n;
    ih = 0;
    if (q0 > 0) {
      i = iq[jz - 1] >> (24 - q0); n += i;
      iq[jz - 1] -= i << (24 - q0);
      ih = iq[jz - 1] >> (23 - q0);
    } else if (q0 === 0) ih = iq[jz - 1] >> 23;
    else if (z >= 0.5) ih = 2;
    if (ih > 0) {
      n += 1; carry = 0;
      for (i = 0; i < jz; i++) {
        j = iq[i];
        if (carry === 0) { if (j !== 0) { carry = 1; iq[i] = 0x1000000 - j; } } else iq[i] = 0xFFFFFF - j;
      }
      if (q0 > 0) { if (q0 === 1) iq[jz - 1] &= 0x7FFFFF; else if (q0 === 2) iq[jz - 1] &= 0x3FFFFF; }
      if (ih === 2) { z = 1 - z; if (carry !== 0) z -= scalbn(1, q0); }
    }
    if (z === 0) {
      j = 0;
      for (i = jz - 1; i >= jk; i--) j |= iq[i];
      if (j === 0) {
        for (k = 1; jk >= k && iq[jk - k] === 0; k++) { /* k = the terms needed */ }
        for (i = jz + 1; i <= jz + k; i++) {
          f[jx + i] = ipio2[jv + i];
          for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j];
          q[i] = fw;
        }
        jz += k;
        continue;
      }
    }
    break;
  }
  if (z === 0.0) {
    jz -= 1; q0 -= 24;
    while (iq[jz] === 0) { jz--; q0 -= 24; }
  } else {
    z = scalbn(z, -q0);
    if (z >= two24) {
      fw = (twon24 * z) | 0;
      iq[jz] = (z - two24 * fw) | 0;
      jz += 1; q0 += 24;
      iq[jz] = fw;
    } else iq[jz] = z | 0;
  }
  fw = scalbn(1, q0);
  for (i = jz; i >= 0; i--) { q[i] = fw * iq[i]; fw *= twon24; }
  for (i = jz; i >= 0; i--) {
    for (fw = 0.0, k = 0; k <= jp && k <= jz - i; k++) fw += PIO2[k] * q[i + k];
    fq[jz - i] = fw;
  }
  fw = 0.0;
  for (i = jz; i >= 0; i--) fw += fq[i];
  y[0] = ih === 0 ? fw : -fw;
  fw = fq[0] - fw;
  for (i = 1; i <= jz; i++) fw += fq[i];
  y[1] = ih === 0 ? fw : -fw;
  return n & 7;
}

const invpio2 = 6.36619772367581382433e-01, pio2_1 = 1.57079632673412561417e+00, pio2_1t = 6.07710050650619224932e-11,
  pio2_2 = 6.07710050630396597660e-11, pio2_2t = 2.02226624879595063154e-21, pio2_3 = 2.02226624871116645580e-21,
  pio2_3t = 8.47842766036889956997e-32;

/** fdlibm's __ieee754_rem_pio2: x rem pi/2 into y[0] + y[1]; returns n (the quadrant's count) */
function remPio2(x, y) {
  let z, w, t, r, fn, n, i, j;
  const hx = hiWord(x), ix = hx & 0x7FFFFFFF;
  if (ix <= 0x3FE921FB) { y[0] = x; y[1] = 0; return 0; }
  if (ix < 0x4002D97C) {   // |x| < 3pi/4: n = +-1
    if (hx > 0) {
      z = x - pio2_1;
      if (ix !== 0x3FF921FB) { y[0] = z - pio2_1t; y[1] = (z - y[0]) - pio2_1t; } else { z -= pio2_2; y[0] = z - pio2_2t; y[1] = (z - y[0]) - pio2_2t; }
      return 1;
    }
    z = x + pio2_1;
    if (ix !== 0x3FF921FB) { y[0] = z + pio2_1t; y[1] = (z - y[0]) + pio2_1t; } else { z += pio2_2; y[0] = z + pio2_2t; y[1] = (z - y[0]) + pio2_2t; }
    return -1;
  }
  if (ix <= 0x413921FB) {   // |x| ~<= 2^19 (pi/2): medium
    t = Math.abs(x);
    n = (t * invpio2 + 0.5) | 0;
    fn = n;
    r = t - fn * pio2_1;
    w = fn * pio2_1t;
    if (n < 32 && ix !== NPIO2_HW[n - 1]) {
      y[0] = r - w;
    } else {
      j = ix >> 20;
      y[0] = r - w;
      i = j - ((hiWord(y[0]) >>> 20) & 0x7FF);
      if (i > 16) {
        t = r; w = fn * pio2_2; r = t - w; w = fn * pio2_2t - ((t - r) - w);
        y[0] = r - w;
        i = j - ((hiWord(y[0]) >>> 20) & 0x7FF);
        if (i > 49) { t = r; w = fn * pio2_3; r = t - w; w = fn * pio2_3t - ((t - r) - w); y[0] = r - w; }
      }
    }
    y[1] = (r - y[0]) - w;
    if (hx < 0) { y[0] = -y[0]; y[1] = -y[1]; return -n; }
    return n;
  }
  if (ix >= 0x7FF00000) { y[0] = y[1] = x - x; return 0; }
  // large: z = scalbn(|x|, ilogb(x) - 23), cut into 24-bit chunks
  const e0 = (ix >> 20) - 1046;
  z = fromWords(ix - (e0 << 20), loWord(x));
  for (i = 0; i < 2; i++) { KX[i] = z | 0; z = (z - KX[i]) * two24; }
  KX[2] = z;
  let nx = 3;
  while (KX[nx - 1] === 0) nx--;
  n = kernelRemPio2(KX, y, e0, nx);
  if (hx < 0) { y[0] = -y[0]; y[1] = -y[1]; return -n; }
  return n;
}

// ---- the kernels on [-pi/4, pi/4] ----

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
function kernelSin(x, y, iy) {
  const ix = hiWord(x) & 0x7FFFFFFF;
  if (ix < 0x3E400000 && (x | 0) === 0) return x;   // |x| < 2^-27
  const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return iy === 0 ? x + v * (S1 + z * r) : x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
function kernelCos(x, y) {
  const ix = hiWord(x) & 0x7FFFFFFF;
  if (ix < 0x3E400000 && (x | 0) === 0) return 1;
  const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3FD33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3FE90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
  return (1 - qx) - ((0.5 * z - qx) - (z * r - x * y));
}

const T = [
  3.33333333333334091986e-01, 1.33333333333201242699e-01, 5.39682539762260521377e-02, 2.18694882948595424599e-02,
  8.86323982359930005737e-03, 3.59207910759131235356e-03, 1.45620945432529025516e-03, 5.88041240820264096874e-04,
  2.46463134818469906812e-04, 7.81794442939557092300e-05, 7.14072491382608190305e-05, -1.85586374855275456654e-05,
  2.59073051863633712884e-05,
];
const pio4 = 7.85398163397448278999e-01, pio4lo = 3.06161699786838301793e-17;
function kernelTan(x, y, iy) {
  let z, r, v, w, s, a, t;
  const hx = hiWord(x), ix = hx & 0x7FFFFFFF;
  if (ix < 0x3E300000 && (x | 0) === 0) {   // |x| < 2^-28
    if (((ix | loWord(x)) | (iy + 1)) === 0) return 1 / Math.abs(x);
    if (iy === 1) return x;
    z = w = x + y; z = withLo(z, 0);
    v = y - (z - x);
    t = a = -1 / w; t = withLo(t, 0);
    s = 1 + t * z;
    return t + a * (s + t * v);
  }
  if (ix >= 0x3FE59428) {   // |x| >= 0.6744
    if (hx < 0) { x = -x; y = -y; }
    z = pio4 - x; w = pio4lo - y; x = z + w; y = 0.0;
  }
  z = x * x; w = z * z;
  r = T[1] + w * (T[3] + w * (T[5] + w * (T[7] + w * (T[9] + w * T[11]))));
  v = z * (T[2] + w * (T[4] + w * (T[6] + w * (T[8] + w * (T[10] + w * T[12])))));
  s = z * x;
  r = y + z * (s * (r + v) + y);
  r += T[0] * s;
  w = x + r;
  if (ix >= 0x3FE59428) {
    v = iy;
    return (1 - ((hx >> 30) & 2)) * (v - 2.0 * (x - (w * w / (w + v) - r)));
  }
  if (iy === 1) return w;
  z = withLo(w, 0);
  v = r - (z - x);
  t = a = -1.0 / w; t = withLo(t, 0);
  s = 1.0 + t * z;
  return t + a * (s + t * v);
}

const Y = new Float64Array(2);

export function sin(x) {
  const ix = hiWord(x) & 0x7FFFFFFF;
  if (ix <= 0x3FE921FB) return kernelSin(x, 0, 0);
  if (ix >= 0x7FF00000) return x - x;
  const n = remPio2(x, Y);
  switch (n & 3) {
    case 0: return kernelSin(Y[0], Y[1], 1);
    case 1: return kernelCos(Y[0], Y[1]);
    case 2: return -kernelSin(Y[0], Y[1], 1);
    default: return -kernelCos(Y[0], Y[1]);
  }
}

export function cos(x) {
  const ix = hiWord(x) & 0x7FFFFFFF;
  if (ix <= 0x3FE921FB) return kernelCos(x, 0);
  if (ix >= 0x7FF00000) return x - x;
  const n = remPio2(x, Y);
  switch (n & 3) {
    case 0: return kernelCos(Y[0], Y[1]);
    case 1: return -kernelSin(Y[0], Y[1], 1);
    case 2: return -kernelCos(Y[0], Y[1]);
    default: return kernelSin(Y[0], Y[1], 1);
  }
}

export function tan(x) {
  const ix = hiWord(x) & 0x7FFFFFFF;
  if (ix <= 0x3FE921FB) return kernelTan(x, 0, 1);
  if (ix >= 0x7FF00000) return x - x;
  const n = remPio2(x, Y);
  return kernelTan(Y[0], Y[1], 1 - ((n & 1) << 1));
}

// ---- inverse trigonometry ----

const pi = 3.14159265358979311600e+00, pio2_hi = 1.57079632679489655800e+00, pio2_lo = 6.12323399573676603587e-17,
  pio4_hi = 7.85398163397448278999e-01,
  pS0 = 1.66666666666666657415e-01, pS1 = -3.25565818622400915405e-01, pS2 = 2.01212532134862925881e-01,
  pS3 = -4.00555345006794114027e-02, pS4 = 7.91534994289814532176e-04, pS5 = 3.47933107596021167570e-05,
  qS1 = -2.40339491173441421878e+00, qS2 = 2.02094576023350569471e+00, qS3 = -6.88283971605453293030e-01,
  qS4 = 7.70381505559019352791e-02;
const rP = z => z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))));
const rQ = z => 1 + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)));

export function acos(x) {
  const hx = hiWord(x), ix = hx & 0x7FFFFFFF;
  if (ix >= 0x3FF00000) {
    if (((ix - 0x3FF00000) | loWord(x)) === 0) return hx > 0 ? 0.0 : pi + 2.0 * pio2_lo;
    return NaN;
  }
  if (ix < 0x3FE00000) {
    if (ix <= 0x3C600000) return pio2_hi + pio2_lo;
    const z = x * x;
    return pio2_hi - (x - (pio2_lo - x * (rP(z) / rQ(z))));
  }
  if (hx < 0) {
    const z = (1 + x) * 0.5, s = Math.sqrt(z), w = (rP(z) / rQ(z)) * s - pio2_lo;
    return pi - 2.0 * (s + w);
  }
  const z = (1 - x) * 0.5, s = Math.sqrt(z), df = withLo(s, 0), c = (z - df * df) / (s + df);
  return 2.0 * (df + ((rP(z) / rQ(z)) * s + c));
}

export function asin(x) {
  let t = 0, w, p, q, c, r, s;
  const hx = hiWord(x), ix = hx & 0x7FFFFFFF;
  if (ix >= 0x3FF00000) {
    if (((ix - 0x3FF00000) | loWord(x)) === 0) return x * pio2_hi + x * pio2_lo;
    return NaN;
  } else if (ix < 0x3FE00000) {
    if (ix < 0x3E400000) { if (1.0e300 + x > 1) return x; } else t = x * x;
    return x + x * (rP(t) / rQ(t));
  }
  w = 1 - Math.abs(x);
  t = w * 0.5;
  p = rP(t); q = rQ(t);
  s = Math.sqrt(t);
  if (ix >= 0x3FEF3333) {
    w = p / q;
    t = pio2_hi - (2.0 * (s + s * w) - pio2_lo);
  } else {
    w = withLo(s, 0);
    c = (t - w * w) / (s + w);
    r = p / q;
    p = 2.0 * s * r - (pio2_lo - 2.0 * c);
    q = pio4_hi - 2.0 * w;
    t = pio4_hi - (p - q);
  }
  return hx > 0 ? t : -t;
}

const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [
  3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
  9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
  4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02,
];

export function atan(x) {
  let id;
  const hx = hiWord(x), ix = hx & 0x7FFFFFFF;
  if (ix >= 0x44100000) {   // |x| >= 2^66
    if (ix > 0x7FF00000 || (ix === 0x7FF00000 && loWord(x) !== 0)) return x + x;
    return hx > 0 ? ATANHI[3] + ATANLO[3] : -ATANHI[3] - ATANLO[3];
  }
  if (ix < 0x3FDC0000) {   // |x| < 0.4375
    if (ix < 0x3E400000 && 1.0e300 + x > 1) return x;
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3FF30000) {
      if (ix < 0x3FE60000) { id = 0; x = (2.0 * x - 1) / (2.0 + x); } else { id = 1; x = (x - 1) / (x + 1); }
    } else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); } else { id = 3; x = -1.0 / x; }
  }
  const z = x * x, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATANHI[id] - ((x * (s1 + s2) - ATANLO[id]) - x);
  return hx < 0 ? -r : r;
}

const pi_o_4 = 7.8539816339744827900E-01, pi_o_2 = 1.5707963267948965580E+00, pi_lo = 1.2246467991473532e-16,
  tiny = 1.0e-300;

export function atan2(y, x) {
  const hx = hiWord(x), lx = loWord(x), ix = hx & 0x7FFFFFFF, hy = hiWord(y), ly = loWord(y), iy = hy & 0x7FFFFFFF;
  if ((ix | ((lx | -lx) >>> 31)) > 0x7FF00000 || (iy | ((ly | -ly) >>> 31)) > 0x7FF00000) return x + y;   // NaN
  if (((hx - 0x3FF00000) | lx) === 0) return atan(y);   // x = 1
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2), z;
  if ((iy | ly) === 0) {   // y = 0
    switch (m) { case 0: case 1: return y; case 2: return pi + tiny; default: return -pi - tiny; }
  }
  if ((ix | lx) === 0) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;   // x = 0
  if (ix === 0x7FF00000) {
    if (iy === 0x7FF00000) {
      switch (m) { case 0: return pi_o_4 + tiny; case 1: return -pi_o_4 - tiny; case 2: return 3.0 * pi_o_4 + tiny; default: return -3.0 * pi_o_4 - tiny; }
    }
    switch (m) { case 0: return 0; case 1: return -0; case 2: return pi + tiny; default: return -pi - tiny; }
  }
  if (iy === 0x7FF00000) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
  const k = (iy - ix) >> 20;
  if (k > 60) { z = pi_o_2 + 0.5 * pi_lo; m &= 1; } else if (hx < 0 && k < -60) z = 0.0; else z = atan(Math.abs(y / x));
  switch (m) {
    case 0: return z;
    case 1: return -z;
    case 2: return pi - (z - pi_lo);
    default: return (z - pi_lo) - pi;
  }
}

// ---- exp and pow ----

const o_threshold = 7.09782712893383973096e+02, u_threshold = -7.45133219101941108420e+02,
  ln2HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01],
  ln2LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10], invln2 = 1.44269504088896338700e+00,
  P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05,
  P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08, E_ = 2.718281828459045,
  huge = 1.0e+300, twom1000 = 9.33263618503218878990e-302, two1023 = 8.988465674311579539e307;

export function exp(x) {
  let y, hi = 0.0, lo = 0.0, c, t, twopk, k = 0;
  let hx = hiWord(x);
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7FFFFFFF;
  if (hx >= 0x40862E42) {   // |x| >= 709.78
    if (hx >= 0x7FF00000) {
      if (((hx & 0xFFFFF) | loWord(x)) !== 0) return x + x;
      return xsb === 0 ? x : 0.0;
    }
    if (x > o_threshold) return huge * huge;
    if (x < u_threshold) return twom1000 * twom1000;
  }
  if (hx > 0x3FD62E42) {   // |x| > 0.5 ln2
    if (hx < 0x3FF0A2B2) {   // and < 1.5 ln2
      if (x === 1.0) return E_;
      hi = x - ln2HI[xsb]; lo = ln2LO[xsb]; k = 1 - xsb - xsb;
    } else {
      k = (invln2 * x + (xsb ? -0.5 : 0.5)) | 0;
      t = k;
      hi = x - t * ln2HI[0]; lo = t * ln2LO[0];
    }
    x = hi - lo;
  } else if (hx < 0x3E300000) {
    if (huge + x > 1) return 1 + x;
  } else k = 0;
  t = x * x;
  twopk = k >= -1021 ? fromWords(0x3FF00000 + (k << 20), 0) : fromWords(0x3FF00000 + ((k + 1000) << 20), 0);
  c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2.0) - x);
  y = 1 - ((lo - (x * c) / (2.0 - c)) - hi);
  if (k >= -1021) return k === 1024 ? y * 2.0 * two1023 : y * twopk;
  return y * twopk * twom1000;
}

const bp = [1.0, 1.5], dp_h = [0.0, 5.84962487220764160156e-01], dp_l = [0.0, 1.35003920212974897128e-08],
  two53 = 9007199254740992.0,
  L1 = 5.99999999999994648725e-01, L2 = 4.28571428578550184252e-01, L3 = 3.33333329818377432918e-01,
  L4 = 2.72728123808534006489e-01, L5 = 2.30660745775561754067e-01, L6 = 2.06975017800338417784e-01,
  lg2 = 6.93147180559945286227e-01, lg2_h = 6.93147182464599609375e-01, lg2_l = -1.90465429995776804525e-09,
  ovt = 8.008566259537294e-17, cp = 9.61796693925975554329e-01, cp_h = 9.61796700954437255859e-01,
  cp_l = -7.02846165095275826516e-09, ivln2 = 1.44269504088896338700e+00, ivln2_h = 1.44269502162933349609e+00,
  ivln2_l = 1.92596299112661746887e-08;

export function pow(x, y) {
  let z, ax, z_h, z_l, p_h, p_l, y1, t1, t2, r, s, t, u, v, w, i, j, k, yisint, n;
  const hx = hiWord(x), lx = loWord(x), hy = hiWord(y), ly = loWord(y);
  let ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;
  if ((iy | ly) === 0) return 1;
  if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lx !== 0) || iy > 0x7ff00000 || (iy === 0x7ff00000 && ly !== 0)) return x + y;
  yisint = 0;   // 0: y not an integer, 1: odd, 2: even
  if (hx < 0) {
    if (iy >= 0x43400000) yisint = 2;
    else if (iy >= 0x3ff00000) {
      k = (iy >> 20) - 0x3ff;
      if (k > 20) { j = ly >>> (52 - k); if (((j << (52 - k)) >>> 0) === ly) yisint = 2 - (j & 1); } else if (ly === 0) { j = iy >> (20 - k); if ((j << (20 - k)) === iy) yisint = 2 - (j & 1); }
    }
  }
  if (ly === 0) {
    if (iy === 0x7ff00000) {   // y = +-inf
      if (((ix - 0x3ff00000) | lx) === 0) return y - y;
      if (ix >= 0x3ff00000) return hy >= 0 ? y : 0;
      return hy < 0 ? -y : 0;
    }
    if (iy === 0x3ff00000) return hy < 0 ? 1 / x : x;
    if (hy === 0x40000000) return x * x;
    if (hy === 0x3fe00000 && hx >= 0) return Math.sqrt(x);
  }
  ax = Math.abs(x);
  if (lx === 0 && (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000)) {
    z = ax;
    if (hy < 0) z = 1 / z;
    if (hx < 0) { if (((ix - 0x3ff00000) | yisint) === 0) z = NaN; else if (yisint === 1) z = -z; }
    return z;
  }
  n = (hx >> 31) + 1;
  if ((n | yisint) === 0) return NaN;   // (x<0)**(non-int)
  s = 1;
  if ((n | (yisint - 1)) === 0) s = -1;   // (-ve)**(odd int)
  if (iy > 0x41e00000) {   // |y| > 2^31
    if (iy > 0x43f00000) {   // |y| > 2^64
      if (ix <= 0x3fefffff) return hy < 0 ? huge * huge : tiny * tiny;
      if (ix >= 0x3ff00000) return hy > 0 ? huge * huge : tiny * tiny;
    }
    if (ix < 0x3fefffff) return hy < 0 ? s * huge * huge : s * tiny * tiny;
    if (ix > 0x3ff00000) return hy > 0 ? s * huge * huge : s * tiny * tiny;
    t = ax - 1;
    w = (t * t) * (0.5 - t * (0.3333333333333333 - t * 0.25));
    u = ivln2_h * t;
    v = t * ivln2_l - w * ivln2;
    t1 = withLo(u + v, 0);
    t2 = v - (t1 - u);
  } else {
    let ss, s2, s_h, s_l, t_h, t_l;
    n = 0;
    if (ix < 0x00100000) { ax *= two53; n -= 53; ix = hiWord(ax); }
    n += (ix >> 20) - 0x3ff;
    j = ix & 0x000fffff;
    ix = j | 0x3ff00000;
    if (j <= 0x3988E) k = 0; else if (j < 0xBB67A) k = 1; else { k = 0; n += 1; ix -= 0x00100000; }
    ax = withHi(ax, ix);
    u = ax - bp[k];
    v = 1 / (ax + bp[k]);
    ss = u * v;
    s_h = withLo(ss, 0);
    t_h = fromWords(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18), 0);
    t_l = ax - (t_h - bp[k]);
    s_l = v * ((u - s_h * t_h) - s_h * t_l);
    s2 = ss * ss;
    r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
    r += s_l * (s_h + ss);
    s2 = s_h * s_h;
    t_h = withLo(3.0 + s2 + r, 0);
    t_l = r - ((t_h - 3.0) - s2);
    u = s_h * t_h;
    v = s_l * t_h + t_l * ss;
    p_h = withLo(u + v, 0);
    p_l = v - (p_h - u);
    z_h = cp_h * p_h;
    z_l = cp_l * p_h + p_l * cp + dp_l[k];
    t = n;
    t1 = withLo(((z_h + z_l) + dp_h[k]) + t, 0);
    t2 = z_l - (((t1 - t) - dp_h[k]) - z_h);
  }
  y1 = withLo(y, 0);
  p_l = (y - y1) * t1 + y * t2;
  p_h = y1 * t1;
  z = p_l + p_h;
  j = hiWord(z); i = loWord(z);
  if (j >= 0x40900000) {   // z >= 1024
    if (((j - 0x40900000) | i) !== 0) return s * huge * huge;
    if (p_l + ovt > z - p_h) return s * huge * huge;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {   // z <= -1075
    if (((j - 0xc090cc00) | i) !== 0) return s * tiny * tiny;
    if (p_l <= z - p_h) return s * tiny * tiny;
  }
  i = j & 0x7fffffff;
  k = (i >> 20) - 0x3ff;
  n = 0;
  if (i > 0x3fe00000) {
    n = j + (0x00100000 >> (k + 1));
    k = ((n & 0x7fffffff) >> 20) - 0x3ff;
    t = fromWords(n & ~(0x000fffff >> k), 0);
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    p_h -= t;
  }
  t = withLo(p_l + p_h, 0);
  u = t * lg2_h;
  v = (p_l - (t - p_h)) * lg2 + t * lg2_l;
  z = u + v;
  w = v - (z - u);
  t = z * z;
  t1 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  r = (z * t1) / ((t1 - 2) - (w + z * w));
  z = 1 - (r - z);
  j = hiWord(z);
  j += n << 20;
  if ((j >> 20) <= 0) z = scalbn(z, n);
  else z = withHi(z, hiWord(z) + (n << 20));
  return s * z;
}

// ---- hypot: V8's own builtin (src/builtins/math.tq): each value over the largest, squared and Kahan-summed ----

const hyp = (sum, comp, v) => {   // one step of the sum: [sum, compensation]
  const s = v * v - comp, p = sum + s;
  HC = (p - sum) - s;
  return p;
};
let HC = 0;
export function hypot(a, b, c) {
  const n = arguments.length;
  if (n === 2) {
    const x = +a, y = +b;
    let nan = false, max = 0, ax = 0, ay = 0;
    if (x !== x) nan = true; else { ax = Math.abs(x); if (ax > max) max = ax; }
    if (y !== y) nan = true; else { ay = Math.abs(y); if (ay > max) max = ay; }
    if (max === Infinity) return Infinity;
    if (nan) return NaN;
    if (max === 0) return 0;
    HC = 0;
    let sum = hyp(0, 0, ax / max);
    sum = hyp(sum, HC, ay / max);
    return Math.sqrt(sum) * max;
  }
  if (n === 3) {
    const x = +a, y = +b, z = +c;
    let nan = false, max = 0, ax = 0, ay = 0, az = 0;
    if (x !== x) nan = true; else { ax = Math.abs(x); if (ax > max) max = ax; }
    if (y !== y) nan = true; else { ay = Math.abs(y); if (ay > max) max = ay; }
    if (z !== z) nan = true; else { az = Math.abs(z); if (az > max) max = az; }
    if (max === Infinity) return Infinity;
    if (nan) return NaN;
    if (max === 0) return 0;
    HC = 0;
    let sum = hyp(0, 0, ax / max);
    sum = hyp(sum, HC, ay / max);
    sum = hyp(sum, HC, az / max);
    return Math.sqrt(sum) * max;
  }
  if (n === 0) return 0;
  const abs = new Array(n);
  let nan = false, max = 0;
  for (let i = 0; i < n; i++) {
    const v = +arguments[i];
    abs[i] = 0;
    if (v !== v) nan = true; else { abs[i] = Math.abs(v); if (abs[i] > max) max = abs[i]; }
  }
  if (max === Infinity) return Infinity;
  if (nan) return NaN;
  if (max === 0) return 0;
  let sum = 0;
  HC = 0;
  for (let i = 0; i < n; i++) sum = hyp(sum, HC, abs[i] / max);
  return Math.sqrt(sum) * max;
}

/** x squared: fdlibm's pow(x, 2) is x * x, so this is Math.pow(x, 2) and x ** 2 exactly (MOTOR writes no **: it is pow
 *  without Math.pow, and a test holds src to that) */
export const sq = x => x * x;

/** the functions computed here in place of the browser's (sqrt and the rest of Math are exact everywhere) */
export const DMath = Object.freeze({ sin, cos, tan, asin, acos, atan, atan2, exp, pow, hypot });

/** puts DMath's functions on a Math object (the page's own, before any other script runs: src/motor/core/prelude.js),
 *  so the engine, MOTOR and the content all compute alike in every runtime; returns that Math */
export function install(M = globalThis.Math) {
  for (const [k, f] of Object.entries(DMath)) Object.defineProperty(M, k, { value: f, writable: true, configurable: true, enumerable: false });
  return M;
}
