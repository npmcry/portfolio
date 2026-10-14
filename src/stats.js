// Small, dependency-free statistics helpers for the Research Lab.

// --- Special functions -------------------------------------------------------
function lnGamma(z) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a, b)
export function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// --- Distributions -------------------------------------------------------------
export function tPdf(t, df) {
  return Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2) - 0.5 * Math.log(df * Math.PI)
    - ((df + 1) / 2) * Math.log(1 + (t * t) / df));
}
export function tCdf(t, df) {
  const x = df / (df + t * t);
  const tail = 0.5 * ibeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}
export function tTwoTailedP(t, df) {
  return ibeta(df / (df + t * t), df / 2, 0.5);
}
export function fPdf(f, d1, d2) {
  if (f <= 0) return 0;
  return Math.exp(0.5 * (d1 * Math.log(d1 * f) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * f + d2))
    - Math.log(f) - (lnGamma(d1 / 2) + lnGamma(d2 / 2) - lnGamma((d1 + d2) / 2)));
}
export function fCdf(f, d1, d2) {
  if (f <= 0) return 0;
  return ibeta((d1 * f) / (d1 * f + d2), d1 / 2, d2 / 2);
}
export function normCdf(z) {
  // Abramowitz-Stegun 7.1.26 via erf
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
    * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

// Invert a monotone CDF by bisection.
export function invert(cdf, p, lo, hi) {
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
export const tCrit = (alpha, df) => invert((t) => tCdf(t, df), 1 - alpha / 2, 0, 60);
export const fCrit = (alpha, d1, d2) => invert((f) => fCdf(f, d1, d2), 1 - alpha, 0, 200);

// --- Descriptives ----------------------------------------------------------
export const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
export function variance(a) {
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
}

// --- Tests -------------------------------------------------------------------
export function linearRegression(pts) {
  const n = pts.length;
  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pts) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const sse = pts.reduce((s, p) => s + (p.y - (intercept + slope * p.x)) ** 2, 0);
  const df = n - 2;
  const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  const s2 = df > 0 ? sse / df : 0;
  const se = sxx > 0 && df > 0 ? Math.sqrt(s2 / sxx) : Infinity;
  const t = se > 0 && isFinite(se) ? slope / se : 0;
  const p = df > 0 ? tTwoTailedP(t, df) : 1;
  return { n, slope, intercept, r, r2: r * r, df, t, p, se, s2, mx, sxx };
}

export function welchT(a, b) {
  const ma = mean(a), mb = mean(b);
  const va = variance(a), vb = variance(b);
  const se = Math.sqrt(va / a.length + vb / b.length);
  const t = (mb - ma) / se;
  const df = (va / a.length + vb / b.length) ** 2 /
    ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
  const sp = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
  return { ma, mb, t, df, p: tTwoTailedP(t, df), d: (mb - ma) / sp };
}

export function oneWayAnova(groups) {
  const all = groups.flat();
  const grand = mean(all);
  let ssb = 0, ssw = 0;
  for (const g of groups) {
    const m = mean(g);
    ssb += g.length * (m - grand) ** 2;
    for (const v of g) ssw += (v - m) ** 2;
  }
  const dfb = groups.length - 1;
  const dfw = all.length - groups.length;
  const F = (ssb / dfb) / (ssw / dfw);
  const p = 1 - fCdf(F, dfb, dfw);
  return { ssb, ssw, dfb, dfw, F, p, eta2: ssb / (ssb + ssw), grand, means: groups.map(mean) };
}

// --- Random numbers ------------------------------------------------------------
export function rng(seed = 7) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.normal = () => {
    const u = 1 - next(), v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return next;
}

export function formatP(p) {
  if (!isFinite(p)) return "—";
  if (p < 0.001) return "< .001";
  return p.toFixed(3).replace(/^0/, "");
}
