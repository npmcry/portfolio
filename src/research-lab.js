// Research Lab: hands-on regression, t-test and one-way ANOVA.
// Charts are drawn as thin glowing curves with particle dots on the night-sky background.
import {
  linearRegression, welchT, oneWayAnova, tPdf, fPdf, tCrit, fCrit,
  normCdf, rng, formatP, mean, variance,
} from "./stats.js";

const NS = "http://www.w3.org/2000/svg";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
// Charts lay out at phone width on small screens so labels stay readable.
const NARROW = window.innerWidth < 600;

// Pastel marks on the dark ground. Every series is also labelled by name on the chart.
const COLORS = { g1: "#9ff0d4", g2: "#b9a5ff", g3: "#ffb39a", ink: "#f4f1fb", reject: "#ff9fb0" };

let uid = 0;
function svgEl(tag, attrs = {}, parent) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 5); // ≈ cubic-bezier(0.23, 1, 0.32, 1)
const fmt = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);
const npdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

function toSvgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// Glow filter + soft vertical fills for each colour; returns ids to reference.
function defs(svg) {
  const id = `lab${++uid}`;
  const d = svgEl("defs", {}, svg);
  const f = svgEl("filter", { id: `${id}-glow`, x: "-50%", y: "-50%", width: "200%", height: "200%" }, d);
  svgEl("feGaussianBlur", { stdDeviation: 3.2, result: "b" }, f);
  const m = svgEl("feMerge", {}, f);
  svgEl("feMergeNode", { in: "b" }, m);
  svgEl("feMergeNode", { in: "SourceGraphic" }, m);
  const fs = svgEl("filter", { id: `${id}-soft`, x: "-100%", y: "-100%", width: "300%", height: "300%" }, d);
  svgEl("feGaussianBlur", { stdDeviation: 2, result: "b" }, fs);
  const ms = svgEl("feMerge", {}, fs);
  svgEl("feMergeNode", { in: "b" }, ms);
  svgEl("feMergeNode", { in: "SourceGraphic" }, ms);
  for (const [k, c] of Object.entries(COLORS)) {
    const g = svgEl("linearGradient", { id: `${id}-fill-${k}`, x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    svgEl("stop", { offset: "0%", "stop-color": c, "stop-opacity": k === "reject" ? 0.45 : 0.26 }, g);
    svgEl("stop", { offset: "100%", "stop-color": c, "stop-opacity": 0.02 }, g);
  }
  return { glow: `url(#${id}-glow)`, soft: `url(#${id}-soft)`, fill: (k) => `url(#${id}-fill-${k})` };
}

// Tween any numeric array/object snapshot -> render each frame.
function tween(from, to, render, ms = 380) {
  if (reduceMotion.matches || ms === 0) { render(to); return () => {}; }
  let raf, start;
  const lerp = (a, b, t) => {
    if (typeof a === "number") return a + (b - a) * t;
    if (Array.isArray(a)) return b.map((v, i) => lerp(a[i] ?? v, v, t));
    const o = {}; for (const k in b) o[k] = lerp(a?.[k] ?? b[k], b[k], t); return o;
  };
  const step = (now) => {
    start ??= now;
    const t = Math.min(1, (now - start) / ms);
    render(lerp(from, to, easeOut(t)));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

function text(parent, x, y, str, cls, anchor = "middle") {
  const t = svgEl("text", { x, y, class: cls, "text-anchor": anchor }, parent);
  t.textContent = str;
  return t;
}

function verdictHTML(p, alpha, h0) {
  const sig = p < alpha;
  const a = String(alpha).replace(/^0/, "");
  return `
    <p class="verdict ${sig ? "is-sig" : "is-ns"}" data-sig="${sig}">
      <span class="verdict-mark" aria-hidden="true"></span>
      <span><strong>${sig ? "Significant" : "Not significant"}</strong>
      ${sig ? `p ${p < 0.001 ? "< .001" : "= " + formatP(p)} is below α = ${a}, so we reject H₀.` : `p = ${formatP(p)} is not below α = ${a}, so we fail to reject H₀.`}</span>
    </p>
    <p class="lab-h0">H₀ says ${h0}</p>`;
}

function popVerdict(root, prevSig) {
  const v = root.querySelector(".verdict");
  if (!v || reduceMotion.matches) return;
  if (String(prevSig) !== v.dataset.sig) {
    v.animate([{ opacity: 0.4, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
      { duration: 240, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
  }
}

function numbersHTML(rows) {
  return `<dl class="lab-numbers">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}

// A test-statistic distribution: glowing curve, faint rejection tails, a "comet" where your result lands.
function drawNull(g, ui, { W, H, m, xmin, xmax, pdf, crit, rejectRanges, observed, label }) {
  g.replaceChildren();
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const sx = (v) => x0 + ((v - xmin) / (xmax - xmin)) * (x1 - x0);
  const N = 180;
  const pts = [];
  let ymax = 0;
  for (let i = 0; i <= N; i++) {
    const x = xmin + ((xmax - xmin) * i) / N;
    const y = pdf(x);
    const v = isFinite(y) ? y : 0;
    ymax = Math.max(ymax, v);
    pts.push([x, v]);
  }
  ymax = Math.min(ymax, 2.5) || 1;
  const sy = (v) => y0 - (Math.min(v, ymax) / ymax) * (y0 - y1);
  const yAt = (x) => sy(pdf(clamp(x, xmin, xmax)) || 0);
  const area = (a, b) => {
    const seg = pts.filter(([x]) => x >= a && x <= b);
    if (seg.length < 2) return "";
    return `M${sx(seg[0][0])},${y0} ` + seg.map(([x, y]) => `L${sx(x)},${sy(y)}`).join(" ") + ` L${sx(seg.at(-1)[0])},${y0} Z`;
  };
  svgEl("line", { x1: x0 - 8, x2: x1 + 8, y1: y0, y2: y0, class: "lab-axis" }, g);
  svgEl("path", { d: area(xmin, xmax), fill: ui.fill("ink") }, g);
  for (const [a, b] of rejectRanges) svgEl("path", { d: area(a, b), fill: ui.fill("reject") }, g);
  svgEl("path", { d: pts.map(([x, y], i) => `${i ? "L" : "M"}${sx(x)},${sy(y)}`).join(" "), class: "null-curve", filter: ui.glow }, g);
  for (const c of crit) {
    svgEl("line", { x1: sx(c), x2: sx(c), y1: y0, y2: yAt(c) - 10, class: "null-crit" }, g);
  }
  const step = (xmax - xmin) > 12 ? 4 : (xmax - xmin) > 6 ? 2 : 1;
  for (let v = Math.ceil(xmin / step) * step; v <= xmax; v += step) text(g, sx(v), y0 + 20, v, "lab-tick");

  // comet
  const ox = clamp(observed, xmin, xmax);
  const cx = sx(ox), cy = yAt(ox);
  const comet = svgEl("g", { class: "null-comet" }, g);
  const r = rng(Math.round(observed * 100) + 3);
  const dir = observed >= 0 ? -1 : 1;
  for (let i = 0; i < 14; i++) {
    const back = r() * 46;
    const px = clamp(cx + dir * back, x0, x1);
    svgEl("circle", { cx: px, cy: yAt(xmin + ((px - x0) / (x1 - x0)) * (xmax - xmin)) + (r() - 0.5) * 14, r: 0.8 + r() * 1.6, class: "comet-spark", "fill-opacity": (1 - back / 50) * 0.9 }, comet);
  }
  svgEl("circle", { cx, cy, r: 9, class: "comet-halo", filter: ui.soft }, comet);
  svgEl("circle", { cx, cy, r: 4.5, class: "comet-core" }, comet);
  const right = cx > W * 0.62;
  text(comet, cx + (right ? -14 : 14), Math.max(cy - 12, y1 + 12), label + (observed > xmax ? " →" : observed < xmin ? " ←" : ""), "null-label", right ? "end" : "start");
}

// Bell curve + particle cloud for one group on a shared horizontal axis.
function drawGroup(g, ui, { key, vals, mu, sd, sx, y0, peakH, label, seed, maxPdf, labelRow = 0, handle = false }) {
  const gr = svgEl("g", { class: `grp ${key}` }, g);
  const xs = [];
  for (let i = 0; i <= 80; i++) xs.push(mu - 3.4 * sd + (6.8 * sd * i) / 80);
  const yv = (x) => y0 - (npdf(x, mu, sd) / maxPdf) * peakH;
  const d = xs.map((x, i) => `${i ? "L" : "M"}${sx(x)},${yv(x)}`).join(" ");
  svgEl("path", { d: `${d} L${sx(xs.at(-1))},${y0} L${sx(xs[0])},${y0} Z`, fill: ui.fill(key) }, gr);
  svgEl("path", { d, class: "grp-curve", stroke: COLORS[key], filter: ui.glow }, gr);
  const top = yv(mu);
  svgEl("line", { x1: sx(mu), x2: sx(mu), y1: y0 + 6, y2: top - 18, class: "grp-mean", stroke: COLORS[key] }, gr);
  const r = rng(seed);
  for (const v of vals) {
    const h = (npdf(v, mu, sd) / maxPdf) * peakH;
    const y = y0 - h * (0.12 + r() * 0.62);
    svgEl("circle", { cx: sx(v), cy: y, r: vals.length > 40 ? 1.8 : 2.6, class: "grp-dot", fill: COLORS[key] }, gr);
  }
  text(gr, sx(mu), y0 + 26 + labelRow * 20, label, "grp-label");
  if (handle) {
    const h = svgEl("g", { class: "grp-handle-knob" }, gr);
    svgEl("circle", { cx: sx(mu), cy: top - 18, r: 7, fill: COLORS[key], filter: ui.soft }, h);
    text(h, sx(mu), top - 32, fmt(mu, 0), "grp-value");
  }
  return gr;
}

// ============================================================================
// Regression
// ============================================================================
function initRegression(root, getAlpha) {
  const W = NARROW ? 340 : 600, H = NARROW ? 310 : 370, m = { l: NARROW ? 34 : 40, r: 12, t: 32, b: 48 };
  const X = [3, 11], Y = [0, 100];
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const sx = (v) => x0 + ((v - X[0]) / (X[1] - X[0])) * (x1 - x0);
  const sy = (v) => y0 - ((v - Y[0]) / (Y[1] - Y[0])) * (y0 - y1);
  const ix = (px) => X[0] + ((px - x0) / (x1 - x0)) * (X[1] - X[0]);
  const iy = (py) => Y[0] + ((y0 - py) / (y0 - y1)) * (Y[1] - Y[0]);

  const svg = root.querySelector("svg.reg-chart");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const ui = defs(svg);
  const hit = svgEl("rect", { x: x0, y: y1, width: x1 - x0, height: y0 - y1, class: "lab-hit" }, svg);
  svgEl("line", { x1: x0 - 8, x2: x1 + 8, y1: y0, y2: y0, class: "lab-axis" }, svg);
  for (const v of [0, 50, 100]) text(svg, x0 - 10, sy(v) + 4, v, "lab-tick", "end");
  for (const v of NARROW ? [4, 6, 8, 10] : [4, 5, 6, 7, 8, 9, 10]) text(svg, sx(v), y0 + 20, v, "lab-tick");
  text(svg, (x0 + x1) / 2, y0 + 42, "Hours of sleep", "lab-axis-label");
  text(svg, x0 - 34, y1 - 18, "Mood score", "lab-axis-label", "start");
  const band = svgEl("path", { fill: ui.fill("g2") }, svg);
  const resG = svgEl("g", { class: "reg-residuals" }, svg);
  const line = svgEl("line", { class: "reg-line", filter: ui.glow }, svg);
  const ptsG = svgEl("g", { class: "reg-points" }, svg);
  const stats = root.querySelector(".reg-stats");
  const showBand = root.querySelector("[name=reg-band]");
  const showRes = root.querySelector("[name=reg-res]");

  let seed = 11, preset = { slope: 6, noise: 10 };
  let data = [];
  let stop = () => {};
  let prevSig = null;

  function generate() {
    const r = rng(seed++);
    const n = 16;
    return Array.from({ length: n }, (_, i) => {
      const x = 4 + (6 * (i + r())) / n;
      const y = clamp(22 + preset.slope * (x - 4) + preset.noise * r.normal(), 3, 97);
      return { x, y };
    });
  }

  function render(d) {
    const res = linearRegression(d);
    const alpha = getAlpha();
    const tc = res.df > 0 ? tCrit(alpha, res.df) : 0;
    const xs = [X[0] + 0.5, X[1] - 0.5];
    const yl = (x) => sy(clamp(res.intercept + res.slope * x, -40, 140));
    line.setAttribute("x1", sx(xs[0])); line.setAttribute("y1", yl(xs[0]));
    line.setAttribute("x2", sx(xs[1])); line.setAttribute("y2", yl(xs[1]));
    if (showBand.checked && res.df > 0 && res.sxx > 0) {
      const top = [], bot = [];
      for (let i = 0; i <= 40; i++) {
        const x = xs[0] + ((xs[1] - xs[0]) * i) / 40;
        const yhat = res.intercept + res.slope * x;
        const half = tc * Math.sqrt(res.s2 * (1 / res.n + (x - res.mx) ** 2 / res.sxx));
        top.push(`${sx(x)},${sy(clamp(yhat + half, -40, 140))}`);
        bot.unshift(`${sx(x)},${sy(clamp(yhat - half, -40, 140))}`);
      }
      band.setAttribute("d", `M${top.join(" L")} L${bot.join(" L")} Z`);
    } else band.setAttribute("d", "");
    resG.replaceChildren();
    if (showRes.checked) {
      for (const p of d) svgEl("line", { x1: sx(p.x), x2: sx(p.x), y1: sy(p.y), y2: yl(p.x) }, resG);
    }
    while (ptsG.children.length > d.length) ptsG.lastChild.remove();
    d.forEach((p, i) => {
      let gp = ptsG.children[i];
      if (!gp) {
        gp = svgEl("g", { class: "reg-pt" }, ptsG);
        svgEl("circle", { r: 22, class: "reg-pt-hit" }, gp);
        svgEl("circle", { r: 9, class: "reg-pt-halo", filter: ui.soft }, gp);
        svgEl("circle", { r: 4.2, class: "reg-pt-dot" }, gp);
      }
      gp.dataset.i = i;
      gp.setAttribute("transform", `translate(${sx(p.x)},${sy(p.y)})`);
    });

    const dir = res.slope >= 0 ? "more" : "fewer";
    stats.innerHTML = `
      <p class="lab-lede">Each extra hour of sleep goes with <em>${fmt(Math.abs(res.slope), 1)} ${dir}</em> mood points. Sleep explains <em>${Math.round(res.r2 * 100)}%</em> of the differences in mood.</p>
      ${numbersHTML([["b", fmt(res.slope)], ["r", fmt(res.r)], ["R²", fmt(res.r2)], [`t(${res.df})`, fmt(res.t)], ["p", formatP(res.p)], ["n", res.n]])}
      ${verdictHTML(res.p, alpha, "sleep and mood are unrelated (the slope is 0).")}`;
    popVerdict(stats, prevSig);
    prevSig = res.p < alpha;
    svg.setAttribute("aria-label", `Scatter plot of ${res.n} people, sleep against mood. Slope ${fmt(res.slope)}, p ${formatP(res.p)}.`);
  }

  function setData(next, animate = true) {
    stop();
    const from = data.length === next.length ? data : next;
    data = next;
    stop = tween(from, next, render, animate ? 420 : 0);
  }

  let drag = null;
  ptsG.addEventListener("pointerdown", (e) => {
    const gp = e.target.closest(".reg-pt");
    if (!gp) return;
    e.preventDefault();
    stop();
    drag = { i: +gp.dataset.i, id: e.pointerId, moved: false, t: performance.now() };
    gp.classList.add("is-dragging");
    gp.setPointerCapture(e.pointerId);
  });
  ptsG.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = toSvgPoint(svg, e);
    data[drag.i] = { x: clamp(ix(p.x), X[0] + 0.2, X[1] - 0.2), y: clamp(iy(p.y), Y[0] + 1, Y[1] - 1) };
    drag.moved = true;
    render(data);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    ptsG.querySelector(".is-dragging")?.classList.remove("is-dragging");
    if (!drag.moved && performance.now() - drag.t < 300 && data.length > 3) {
      data.splice(drag.i, 1);
      render(data);
    }
    drag = null;
  };
  ptsG.addEventListener("pointerup", endDrag);
  ptsG.addEventListener("pointercancel", endDrag);

  hit.addEventListener("click", (e) => {
    if (data.length >= 40) return;
    const p = toSvgPoint(svg, e);
    data.push({ x: clamp(ix(p.x), X[0] + 0.2, X[1] - 0.2), y: clamp(iy(p.y), 1, 99) });
    render(data);
    const last = ptsG.lastChild;
    if (last && !reduceMotion.matches) {
      last.querySelector(".reg-pt-dot").animate(
        [{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
        { duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    }
  });

  root.querySelectorAll("[data-reg-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.regPreset;
      if (k === "strong") preset = { slope: 9, noise: 7 };
      if (k === "weak") preset = { slope: 2.5, noise: 15 };
      if (k === "none") preset = { slope: 0, noise: 15 };
      root.querySelectorAll("[data-reg-preset]").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      setData(generate());
    });
  });
  root.querySelector("[data-reg-shuffle]").addEventListener("click", () => setData(generate()));
  showBand.addEventListener("change", () => render(data));
  showRes.addEventListener("change", () => render(data));

  data = generate();
  render(data);
  return { refresh: () => render(data) };
}

// ============================================================================
// t-test
// ============================================================================
function initTTest(root, getAlpha) {
  const curves = root.querySelector("svg.t-strip");
  const dist = root.querySelector("svg.t-dist");
  const SW = NARROW ? 340 : 600, SH = NARROW ? 250 : 280, sm = { l: 16, r: 16, t: 28, b: 64 };
  const DW = NARROW ? 340 : 600, DH = 210, dm = { l: 16, r: 16, t: 24, b: 30 };
  curves.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
  dist.setAttribute("viewBox", `0 0 ${DW} ${DH}`);
  const ui1 = defs(curves);
  const layer1 = svgEl("g", {}, curves);
  const ui2 = defs(dist);
  const layer2 = svgEl("g", {}, dist);
  const dSlider = root.querySelector("[name=t-d]");
  const nSlider = root.querySelector("[name=t-n]");
  const dOut = root.querySelector("[data-out=t-d]");
  const nOut = root.querySelector("[data-out=t-n]");
  const stats = root.querySelector(".t-stats");
  const sim = root.querySelector(".t-sim");
  let seed = 3;
  let prevSig = null;
  let current = null;
  let stop = () => {};

  const SD = 10, BASE = 50;
  function sample(d, n, s) {
    const r = rng(s);
    const a = Array.from({ length: n }, () => BASE + SD * r.normal());
    const b = Array.from({ length: n }, () => BASE + d * SD + SD * r.normal());
    return { a, b };
  }

  function render(state) {
    const { a, b } = state;
    const alpha = getAlpha();
    const res = welchT(a, b);

    // group curves on a shared axis
    layer1.replaceChildren();
    const X = [15, 95];
    const x0 = sm.l, x1 = SW - sm.r, y0 = SH - sm.b;
    const sx = (v) => x0 + ((clamp(v, X[0], X[1]) - X[0]) / (X[1] - X[0])) * (x1 - x0);
    svgEl("line", { x1: x0, x2: x1, y1: y0, y2: y0, class: "lab-axis" }, layer1);
    const groups = [
      { key: "g1", vals: a, label: "Control" },
      { key: "g2", vals: b, label: "Mindfulness" },
    ].map((g) => ({ ...g, mu: mean(g.vals), sd: Math.sqrt(variance(g.vals)) || 1 }));
    const maxPdf = Math.max(...groups.map((g) => npdf(g.mu, g.mu, g.sd)));
    const close = Math.abs(sx(groups[0].mu) - sx(groups[1].mu)) < (NARROW ? 96 : 120);
    groups.forEach((g, i) => drawGroup(layer1, ui1, {
      ...g, sx, y0, peakH: y0 - sm.t - 24, seed: 40 + i, maxPdf, labelRow: close ? i : 0,
      label: `${g.label} · M ${fmt(g.mu, 1)}`,
    }));
    curves.setAttribute("aria-label", `Distributions of the two groups. Control mean ${fmt(res.ma, 1)}, mindfulness mean ${fmt(res.mb, 1)}.`);

    // null distribution of t
    const df = res.df, tc = tCrit(alpha, df), lim = 5;
    drawNull(layer2, ui2, {
      W: DW, H: DH, m: dm, xmin: -lim, xmax: lim, pdf: (x) => tPdf(x, df),
      crit: [-tc, tc], rejectRanges: [[-lim, -tc], [tc, lim]],
      observed: res.t, label: `your t = ${fmt(res.t)}`,
    });
    dist.setAttribute("aria-label", `t distribution if the null hypothesis were true. Your t is ${fmt(res.t)}; the critical values are ±${fmt(tc)}.`);

    const n = a.length, d = +dSlider.value;
    const power = normCdf(Math.abs(d) * Math.sqrt(n / 2) - tc) + normCdf(-Math.abs(d) * Math.sqrt(n / 2) - tc);
    stats.innerHTML = `
      <p class="lab-lede">The mindfulness group scored <em>${fmt(Math.abs(res.mb - res.ma), 1)} points ${res.mb >= res.ma ? "higher" : "lower"}</em> on average. With this many people, a real effect of this size would be detected <em>${Math.round(clamp(power, 0, 1) * 100)}%</em> of the time.</p>
      ${numbersHTML([["Control M", fmt(res.ma, 1)], ["Mindful M", fmt(res.mb, 1)], [`t(${fmt(df, 1)})`, fmt(res.t)], ["p", formatP(res.p)], ["Cohen's d", fmt(res.d)], ["Power", `${Math.round(clamp(power, 0, 1) * 100)}%`]])}
      ${verdictHTML(res.p, alpha, "both groups have the same average well-being.")}`;
    popVerdict(stats, prevSig);
    prevSig = res.p < alpha;
  }

  function update(animate) {
    const d = +dSlider.value, n = +nSlider.value;
    dOut.textContent = d.toFixed(1);
    nOut.textContent = n;
    const next = sample(d, n, seed);
    stop();
    if (animate && current && current.a.length === next.a.length) stop = tween(current, next, render, 360);
    else render(next);
    current = next;
  }

  dSlider.addEventListener("input", () => update(false));
  nSlider.addEventListener("input", () => { sim.innerHTML = ""; update(false); });
  root.querySelector("[data-t-run]").addEventListener("click", () => { seed++; update(true); });
  root.querySelector("[data-t-many]").addEventListener("click", () => {
    const alpha = getAlpha();
    const d = +dSlider.value, n = +nSlider.value;
    const studies = 50;
    let sig = 0;
    const dots = [];
    for (let i = 0; i < studies; i++) {
      const s = sample(d, n, 1000 + seed * 97 + i);
      const p = welchT(s.a, s.b).p;
      if (p < alpha) sig++;
      dots.push(p < alpha);
    }
    seed++;
    sim.innerHTML = `
      <p><strong>${sig} of ${studies}</strong> studies found p &lt; α. ${d === 0
        ? "There is no real effect here, so every one of those is a <em>false positive</em> (Type I error). Expect about " + Math.round(alpha * 100) + "%."
        : "The effect is real, so the misses are <em>Type II errors</em>. More participants means more power."}</p>
      <div class="sim-dots" role="img" aria-label="${sig} significant studies out of ${studies}">
        ${dots.map((s, i) => `<span class="${s ? "is-sig" : ""}" style="--i:${i}"></span>`).join("")}
      </div>
      <p class="sim-key"><span class="sim-key-dot is-sig"></span> significant <span class="sim-key-dot"></span> not significant</p>`;
  });

  update(false);
  return { refresh: () => update(false) };
}

// ============================================================================
// ANOVA
// ============================================================================
function initAnova(root, getAlpha) {
  const svg = root.querySelector("svg.a-chart");
  const dist = root.querySelector("svg.a-dist");
  const W = NARROW ? 340 : 600, H = NARROW ? 310 : 340, m = { l: 16, r: 16, t: 40, b: 92 };
  const DW = NARROW ? 340 : 600, DH = 210, dm = { l: 16, r: 16, t: 24, b: 30 };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  dist.setAttribute("viewBox", `0 0 ${DW} ${DH}`);
  const ui = defs(svg);
  const layer = svgEl("g", {}, svg);
  const ui2 = defs(dist);
  const layer2 = svgEl("g", {}, dist);
  const sdSlider = root.querySelector("[name=a-sd]");
  const nSlider = root.querySelector("[name=a-n]");
  const sdOut = root.querySelector("[data-out=a-sd]");
  const nOut = root.querySelector("[data-out=a-n]");
  const stats = root.querySelector(".a-stats");
  const split = root.querySelector(".ss-split");
  const groupsMeta = [
    { name: "Therapy A", key: "g1" },
    { name: "Therapy B", key: "g2" },
    { name: "Waitlist", key: "g3" },
  ];
  let means = [55, 72, 36];
  let seed = 5;
  let z = [];
  let prevSig = null;
  let stop = () => {};

  const X = [0, 100];
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b;
  const sx = (v) => x0 + ((clamp(v, X[0], X[1]) - X[0]) / (X[1] - X[0])) * (x1 - x0);
  const ix = (px) => X[0] + ((px - x0) / (x1 - x0)) * (X[1] - X[0]);

  function makeZ() {
    const r = rng(seed);
    const n = +nSlider.value;
    z = groupsMeta.map(() => {
      const raw = Array.from({ length: n }, () => r.normal());
      const mu = mean(raw);
      const sd = Math.sqrt(raw.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1)) || 1;
      return raw.map((v) => (v - mu) / sd);
    });
  }

  // Keyboard/pointer handles live in their own layer above the drawing.
  const handles = svgEl("g", { class: "a-handles" }, svg);
  groupsMeta.forEach((g, i) => {
    const h = svgEl("g", {
      class: `a-handle ${g.key}`, tabindex: 0, role: "slider", "aria-label": `${g.name} average`,
      "aria-valuemin": 5, "aria-valuemax": 95, "data-i": i,
    }, handles);
    svgEl("rect", { x: -26, y: 0, width: 52, height: 10, rx: 12, class: "a-handle-hit" }, h);
  });

  function render(ms) {
    const sd = +sdSlider.value;
    const groups = ms.map((mu, i) => z[i].map((v) => mu + sd * v));
    const res = oneWayAnova(groups);
    const alpha = getAlpha();
    layer.replaceChildren();
    svgEl("line", { x1: x0, x2: x1, y1: y0, y2: y0, class: "lab-axis" }, layer);
    for (const v of [0, 50, 100]) text(layer, sx(v), y0 + 84, v, "lab-tick");
    // grand mean
    svgEl("line", { x1: sx(res.grand), x2: sx(res.grand), y1: y0, y2: m.t - 10, class: "a-grand" }, layer);
    text(layer, sx(res.grand) + 6, y0 - 8, "grand mean", "a-grand-label", "start");
    const maxPdf = npdf(0, 0, sd);
    // stagger labels onto separate rows when curves sit close together
    const gap = NARROW ? 74 : 88;
    const rows = [0, 0, 0];
    const placed = [];
    ms.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]).forEach(([v, i]) => {
      let row = 0;
      while (placed.some((pl) => pl.row === row && Math.abs(sx(pl.v) - sx(v)) < gap)) row++;
      rows[i] = row;
      placed.push({ v, row });
    });
    groups.forEach((vals, i) => drawGroup(layer, ui, {
      key: groupsMeta[i].key, vals, mu: ms[i], sd, sx, y0, peakH: y0 - m.t - 16,
      label: groupsMeta[i].name, seed: 31 + i, maxPdf, labelRow: rows[i], handle: true,
    }));
    // position the hit areas over each mean line
    const peakTop = y0 - (y0 - m.t - 16) - 26;
    [...handles.children].forEach((h, i) => {
      h.setAttribute("transform", `translate(${sx(ms[i])},${peakTop})`);
      const rect = h.querySelector("rect");
      rect.setAttribute("height", y0 - peakTop + 4);
      h.setAttribute("aria-valuenow", Math.round(ms[i]));
    });
    svg.setAttribute("aria-label", `Three groups on one scale. Averages ${ms.map((v) => Math.round(v)).join(", ")}. F ${fmt(res.F)}, p ${formatP(res.p)}.`);

    const fc = fCrit(alpha, res.dfb, res.dfw);
    const xmax = Math.max(8, Math.min(30, Math.ceil(Math.max(res.F, fc) * 1.25)));
    drawNull(layer2, ui2, {
      W: DW, H: DH, m: dm, xmin: 0.02, xmax, pdf: (x) => fPdf(x, res.dfb, res.dfw),
      crit: [fc], rejectRanges: [[fc, xmax]], observed: res.F, label: `your F = ${fmt(res.F)}`,
    });

    split.style.setProperty("--between", res.eta2.toFixed(4));
    split.querySelector("[data-ss=between]").textContent = `Between groups ${Math.round(res.eta2 * 100)}%`;
    split.querySelector("[data-ss=within]").textContent = `Within groups ${100 - Math.round(res.eta2 * 100)}%`;

    stats.innerHTML = `
      <p class="lab-lede">F compares how far apart the group averages are with how spread out people are inside each group. Right now <em>${Math.round(res.eta2 * 100)}%</em> of all the variation comes from which group someone is in.</p>
      ${numbersHTML([[`F(${res.dfb}, ${res.dfw})`, fmt(res.F)], ["p", formatP(res.p)], ["η²", fmt(res.eta2)], ["SS between", Math.round(res.ssb)], ["SS within", Math.round(res.ssw)], ["n / group", z[0].length]])}
      ${verdictHTML(res.p, alpha, "all three groups have the same average relief.")}`;
    popVerdict(stats, prevSig);
    prevSig = res.p < alpha;
  }

  let drag = null;
  handles.addEventListener("pointerdown", (e) => {
    const h = e.target.closest(".a-handle");
    if (!h) return;
    e.preventDefault();
    stop();
    drag = { i: +h.dataset.i, id: e.pointerId, dx: ix(toSvgPoint(svg, e).x) - means[+h.dataset.i] };
    h.classList.add("is-dragging");
    h.setPointerCapture(e.pointerId);
  });
  handles.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    means[drag.i] = clamp(ix(toSvgPoint(svg, e).x) - drag.dx, 5, 95);
    render(means);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    handles.querySelector(".is-dragging")?.classList.remove("is-dragging");
    drag = null;
  };
  handles.addEventListener("pointerup", end);
  handles.addEventListener("pointercancel", end);
  handles.addEventListener("keydown", (e) => {
    const h = e.target.closest(".a-handle");
    if (!h) return;
    const i = +h.dataset.i;
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") means[i] = clamp(means[i] + step, 5, 95);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") means[i] = clamp(means[i] - step, 5, 95);
    else return;
    e.preventDefault();
    render(means);
  });

  sdSlider.addEventListener("input", () => { sdOut.textContent = sdSlider.value; render(means); });
  nSlider.addEventListener("input", () => { nOut.textContent = nSlider.value; makeZ(); render(means); });
  root.querySelector("[data-a-resample]").addEventListener("click", () => { seed++; makeZ(); render(means); });
  root.querySelector("[data-a-same]").addEventListener("click", () => {
    const from = [...means]; means = [54, 54, 54];
    stop(); stop = tween(from, means, render, 420);
  });
  root.querySelector("[data-a-apart]").addEventListener("click", () => {
    const from = [...means]; means = [52, 76, 28];
    stop(); stop = tween(from, means, render, 420);
  });

  sdOut.textContent = sdSlider.value;
  nOut.textContent = nSlider.value;
  makeZ();
  render(means);
  return { refresh: () => render(means) };
}

// ============================================================================
export function initResearchLab() {
  const root = document.getElementById("research");
  if (!root) return;
  let alpha = 0.05;
  const getAlpha = () => alpha;
  const panels = {};

  const tabs = [...root.querySelectorAll("[data-lab-tab]")];
  const tabList = root.querySelector(".lab-tabs");
  function placeIndicator(tab) {
    tabList.style.setProperty("--tab-x", `${tab.offsetLeft}px`);
    tabList.style.setProperty("--tab-w", `${tab.offsetWidth}px`);
  }
  window.addEventListener("resize", () => placeIndicator(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]));
  document.fonts?.ready.then(() => placeIndicator(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]));
  function select(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      root.querySelector(`#${t.getAttribute("aria-controls")}`).hidden = !on;
    });
    placeIndicator(tab);
    if (focus) tab.focus();
    panels[tab.dataset.labTab]?.refresh();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      let j = null;
      if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
      if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") j = 0;
      if (e.key === "End") j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); select(tabs[j], true); }
    });
  });

  root.querySelectorAll("[name=alpha]").forEach((r) => {
    r.addEventListener("change", () => {
      alpha = +r.value;
      Object.values(panels).forEach((p) => p.refresh());
    });
  });

  panels.regression = initRegression(root.querySelector("#lab-regression"), getAlpha);
  panels.ttest = initTTest(root.querySelector("#lab-ttest"), getAlpha);
  panels.anova = initAnova(root.querySelector("#lab-anova"), getAlpha);
  select(tabs[0]);
}
