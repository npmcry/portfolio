// Research Lab: hands-on regression, t-test and one-way ANOVA with live SVG charts.
import {
  linearRegression, welchT, oneWayAnova, tPdf, fPdf, tCrit, fCrit, tCdf,
  normCdf, rng, formatP, mean,
} from "./stats.js";

const NS = "http://www.w3.org/2000/svg";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
// Charts lay out at phone width on small screens so labels stay readable.
const NARROW = window.innerWidth < 600;

function svgEl(tag, attrs = {}, parent) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 5); // close to cubic-bezier(0.23, 1, 0.32, 1)
const fmt = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);

function toSvgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
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

function axes(g, { x0, x1, y0, y1, xTicks, yTicks, sx, sy, xLabel, yLabel }) {
  const ax = svgEl("g", { class: "lab-axes" }, g);
  for (const v of yTicks) {
    svgEl("line", { x1: x0, x2: x1, y1: sy(v), y2: sy(v), class: "lab-gridline" }, ax);
    const t = svgEl("text", { x: x0 - 8, y: sy(v) + 4, class: "lab-tick", "text-anchor": "end" }, ax);
    t.textContent = v;
  }
  for (const v of xTicks) {
    const t = svgEl("text", { x: sx(v), y: y0 + 20, class: "lab-tick", "text-anchor": "middle" }, ax);
    t.textContent = v;
  }
  svgEl("line", { x1: x0, x2: x1, y1: y0, y2: y0, class: "lab-baseline" }, ax);
  if (xLabel) {
    const t = svgEl("text", { x: (x0 + x1) / 2, y: y0 + 40, class: "lab-axis-label", "text-anchor": "middle" }, ax);
    t.textContent = xLabel;
  }
  if (yLabel) {
    const t = svgEl("text", { x: -(y0 + y1) / 2, y: 14, class: "lab-axis-label", "text-anchor": "middle", transform: "rotate(-90)" }, ax);
    t.textContent = yLabel;
  }
  return ax;
}

function verdictHTML(p, alpha, h0) {
  const sig = p < alpha;
  return `
    <div class="verdict ${sig ? "is-sig" : "is-ns"}" data-sig="${sig}">
      <span class="verdict-icon" aria-hidden="true">${sig ? "<i class='fas fa-star'></i>" : "<i class='far fa-circle'></i>"}</span>
      <span>
        <strong>${sig ? "Significant" : "Not significant"}</strong>
        <small>${sig ? `p ${p < 0.001 ? "< .001" : "= " + formatP(p)} < α = ${String(alpha).replace(/^0/, "")}, so we reject H₀` : `p = ${formatP(p)} ≥ α = ${String(alpha).replace(/^0/, "")}, so we fail to reject H₀`}</small>
      </span>
    </div>
    <p class="lab-h0"><span>H₀</span> ${h0}</p>`;
}

function popVerdict(root, prevSig) {
  const v = root.querySelector(".verdict");
  if (!v || reduceMotion.matches) return;
  if (String(prevSig) !== v.dataset.sig) {
    v.animate([{ transform: "scale(0.96)", opacity: 0.6 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
  }
}

// Density curve with shaded regions.
function drawDistribution(g, { W, H, m, xmin, xmax, pdf, critLines, rejectRanges, pRanges, observed, obsLabel }) {
  g.replaceChildren();
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const sx = (v) => x0 + ((v - xmin) / (xmax - xmin)) * (x1 - x0);
  const N = 160;
  let ymax = 0;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = xmin + ((xmax - xmin) * i) / N;
    const y = pdf(x);
    if (isFinite(y)) ymax = Math.max(ymax, y);
    pts.push([x, isFinite(y) ? y : 0]);
  }
  ymax = Math.min(ymax, 2.5) || 1;
  const sy = (v) => y0 - (Math.min(v, ymax) / ymax) * (y0 - y1);
  const area = (a, b) => {
    const seg = pts.filter(([x]) => x >= a && x <= b);
    if (seg.length < 2) return "";
    return `M${sx(seg[0][0])},${y0} ` + seg.map(([x, y]) => `L${sx(x)},${sy(y)}`).join(" ") + ` L${sx(seg.at(-1)[0])},${y0} Z`;
  };
  svgEl("path", { d: area(xmin, xmax), class: "dist-fill" }, g);
  for (const [a, b] of pRanges) svgEl("path", { d: area(a, b), class: "dist-p" }, g);
  for (const [a, b] of rejectRanges) svgEl("path", { d: area(a, b), class: "dist-reject" }, g);
  svgEl("path", { d: pts.map(([x, y], i) => `${i ? "L" : "M"}${sx(x)},${sy(y)}`).join(" "), class: "dist-line" }, g);
  svgEl("line", { x1: x0, x2: x1, y1: y0, y2: y0, class: "lab-baseline" }, g);
  for (const c of critLines) {
    svgEl("line", { x1: sx(c), x2: sx(c), y1: y0, y2: y1 + 14, class: "dist-crit" }, g);
  }
  if (critLines.length) {
    const c = critLines.at(-1);
    const t = svgEl("text", { x: sx(c) + 6, y: y1 + 40, class: "lab-tick dist-crit-label" }, g);
    t.textContent = "critical";
  }
  const ox = clamp(observed, xmin, xmax);
  const obs = svgEl("g", { class: "dist-obs", transform: `translate(${sx(ox)},0)` }, g);
  svgEl("line", { x1: 0, x2: 0, y1: y0, y2: y1, class: "dist-obs-line" }, obs);
  svgEl("circle", { cx: 0, cy: y1, r: 5, class: "dist-obs-dot" }, obs);
  const lbl = svgEl("text", { x: sx(ox) > W * 0.62 ? -8 : 8, y: y1 + 4, class: "dist-obs-label", "text-anchor": sx(ox) > W * 0.62 ? "end" : "start" }, obs);
  lbl.textContent = obsLabel + (observed > xmax ? " →" : observed < xmin ? " ←" : "");
  const tickVals = [];
  const step = (xmax - xmin) > 12 ? 4 : (xmax - xmin) > 6 ? 2 : 1;
  for (let v = Math.ceil(xmin / step) * step; v <= xmax; v += step) tickVals.push(v);
  for (const v of tickVals) {
    const t = svgEl("text", { x: sx(v), y: y0 + 18, class: "lab-tick", "text-anchor": "middle" }, g);
    t.textContent = v;
  }
}

// ============================================================================
// Regression
// ============================================================================
function initRegression(root, getAlpha) {
  const W = NARROW ? 340 : 560, H = NARROW ? 300 : 360, m = { l: NARROW ? 44 : 52, r: 12, t: 16, b: 52 };
  const X = [3, 11], Y = [0, 100];
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const sx = (v) => x0 + ((v - X[0]) / (X[1] - X[0])) * (x1 - x0);
  const sy = (v) => y0 - ((v - Y[0]) / (Y[1] - Y[0])) * (y0 - y1);
  const ix = (px) => X[0] + ((px - x0) / (x1 - x0)) * (X[1] - X[0]);
  const iy = (py) => Y[0] + ((y0 - py) / (y0 - y1)) * (Y[1] - Y[0]);

  const svg = root.querySelector("svg.reg-chart");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const hit = svgEl("rect", { x: x0, y: y1, width: x1 - x0, height: y0 - y1, class: "lab-hit" }, svg);
  axes(svg, { x0, x1, y0, y1, xTicks: NARROW ? [4, 6, 8, 10] : [4, 5, 6, 7, 8, 9, 10], yTicks: [0, 25, 50, 75, 100], sx, sy,
    xLabel: "Hours of sleep", yLabel: "Mood score" });
  const band = svgEl("path", { class: "reg-band" }, svg);
  const resG = svgEl("g", { class: "reg-residuals" }, svg);
  const line = svgEl("line", { class: "reg-line" }, svg);
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
    const n = 14;
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
    line.setAttribute("x1", sx(xs[0])); line.setAttribute("y1", sy(clamp(res.intercept + res.slope * xs[0], -40, 140)));
    line.setAttribute("x2", sx(xs[1])); line.setAttribute("y2", sy(clamp(res.intercept + res.slope * xs[1], -40, 140)));
    // 95% (or 1-alpha) confidence band for the mean response
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
      for (const p of d) {
        svgEl("line", { x1: sx(p.x), x2: sx(p.x), y1: sy(p.y), y2: sy(clamp(res.intercept + res.slope * p.x, -40, 140)) }, resG);
      }
    }
    // points (reuse nodes)
    while (ptsG.children.length > d.length) ptsG.lastChild.remove();
    d.forEach((p, i) => {
      let gp = ptsG.children[i];
      if (!gp) {
        gp = svgEl("g", { class: "reg-pt", "data-i": i }, ptsG);
        svgEl("circle", { r: 22, class: "reg-pt-hit" }, gp);
        svgEl("circle", { r: 7, class: "reg-pt-dot" }, gp);
      }
      gp.dataset.i = i;
      gp.setAttribute("transform", `translate(${sx(p.x)},${sy(p.y)})`);
    });

    const dir = res.slope >= 0 ? "more" : "less";
    stats.innerHTML = `
      <dl class="lab-numbers">
        <div><dt>Slope (b)</dt><dd>${fmt(res.slope)}</dd></div>
        <div><dt>r</dt><dd>${fmt(res.r)}</dd></div>
        <div><dt>R²</dt><dd>${fmt(res.r2)}</dd></div>
        <div><dt>t(${res.df})</dt><dd>${fmt(res.t)}</dd></div>
        <div><dt>p</dt><dd>${formatP(res.p)}</dd></div>
        <div><dt>n</dt><dd>${res.n}</dd></div>
      </dl>
      <p class="lab-explain">Each extra hour of sleep goes with <strong>${fmt(Math.abs(res.slope), 1)} ${dir}</strong> mood points.
      Sleep explains <strong>${Math.round(res.r2 * 100)}%</strong> of the differences in mood.</p>
      ${verdictHTML(res.p, alpha, "Sleep has no relationship with mood (slope = 0).")}`;
    popVerdict(stats, prevSig);
    prevSig = res.p < alpha;
    svg.setAttribute("aria-label", `Scatter plot of ${res.n} people, sleep against mood. Regression slope ${fmt(res.slope)}, p ${formatP(res.p)}.`);
  }

  function setData(next, animate = true) {
    stop();
    const from = data.length === next.length ? data : next;
    data = next;
    stop = tween(from, next, render, animate ? 420 : 0);
  }

  // Dragging points
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
    // A quick tap without movement removes the point (keep at least 3).
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
  const strip = root.querySelector("svg.t-strip");
  const dist = root.querySelector("svg.t-dist");
  const SW = NARROW ? 340 : 560, SH = 210, sm = { l: NARROW ? 96 : 110, r: 14, t: 20, b: 40 };
  const DW = NARROW ? 340 : 560, DH = 190, dm = { l: 14, r: 14, t: 16, b: 30 };
  strip.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
  dist.setAttribute("viewBox", `0 0 ${DW} ${DH}`);
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
    // strip plot
    strip.replaceChildren();
    const X = [10, 90];
    const x0 = sm.l, x1 = SW - sm.r;
    const sx = (v) => x0 + ((clamp(v, X[0], X[1]) - X[0]) / (X[1] - X[0])) * (x1 - x0);
    for (const v of NARROW ? [30, 50, 70] : [20, 40, 60, 80]) {
      svgEl("line", { x1: sx(v), x2: sx(v), y1: sm.t, y2: SH - sm.b, class: "lab-gridline" }, strip);
      const t = svgEl("text", { x: sx(v), y: SH - sm.b + 20, class: "lab-tick", "text-anchor": "middle" }, strip);
      t.textContent = v;
    }
    const lab = svgEl("text", { x: (x0 + x1) / 2, y: SH - 4, class: "lab-axis-label", "text-anchor": "middle" }, strip);
    lab.textContent = "Well-being score";
    const rows = [
      { name: "Control", vals: a, cls: "g1", y: 62 },
      { name: "Mindfulness", vals: b, cls: "g2", y: 128 },
    ];
    for (const row of rows) {
      const t = svgEl("text", { x: sm.l - 14, y: row.y + 5, class: "lab-row-label", "text-anchor": "end" }, strip);
      t.textContent = row.name;
      const rr = rng(row.y);
      const g = svgEl("g", { class: `strip ${row.cls}` }, strip);
      for (const v of row.vals) {
        svgEl("circle", { cx: sx(v), cy: row.y + (rr() - 0.5) * 30, r: row.vals.length > 50 ? 3.5 : 5 }, g);
      }
      const mx = sx(mean(row.vals));
      svgEl("line", { x1: mx, x2: mx, y1: row.y - 26, y2: row.y + 26, class: `strip-mean ${row.cls}` }, g);
      const ml = svgEl("text", { x: mx, y: row.y - 32, class: "strip-mean-label", "text-anchor": "middle" }, g);
      ml.textContent = `M = ${fmt(mean(row.vals), 1)}`;
    }
    strip.setAttribute("aria-label", `Dot plot. Control mean ${fmt(res.ma, 1)}, mindfulness mean ${fmt(res.mb, 1)}.`);

    // null distribution
    const df = res.df;
    const tc = tCrit(alpha, df);
    const at = Math.abs(res.t);
    const lim = 5;
    drawDistribution(dist, {
      W: DW, H: DH, m: dm, xmin: -lim, xmax: lim, pdf: (x) => tPdf(x, df),
      critLines: [-tc, tc],
      rejectRanges: [[-lim, -tc], [tc, lim]],
      pRanges: at < lim ? [[-lim, -at], [at, lim]] : [],
      observed: res.t, obsLabel: `your t = ${fmt(res.t)}`,
    });
    dist.setAttribute("aria-label", `t distribution if the null hypothesis were true. Observed t ${fmt(res.t)}, critical values ±${fmt(tc)}.`);

    const n = a.length, d = +dSlider.value;
    const power = normCdf(Math.abs(d) * Math.sqrt(n / 2) - (tc)) + normCdf(-Math.abs(d) * Math.sqrt(n / 2) - tc);
    stats.innerHTML = `
      <dl class="lab-numbers">
        <div><dt>Control M</dt><dd>${fmt(res.ma, 1)}</dd></div>
        <div><dt>Mindful M</dt><dd>${fmt(res.mb, 1)}</dd></div>
        <div><dt>t(${fmt(df, 1)})</dt><dd>${fmt(res.t)}</dd></div>
        <div><dt>p</dt><dd>${formatP(res.p)}</dd></div>
        <div><dt>Cohen's d</dt><dd>${fmt(res.d)}</dd></div>
        <div><dt>Power</dt><dd>${Math.round(clamp(power, 0, 1) * 100)}%</dd></div>
      </dl>
      <p class="lab-explain">The <span class="key-swatch"></span> pink tails hold the most extreme ${Math.round(alpha * 100 * 10) / 10}% of t values we'd expect if mindfulness did nothing.
      If your <strong>t</strong> lands there, the result is significant. The <span class="key-swatch p"></span> shaded area beyond your t is the p-value.</p>
      ${verdictHTML(res.p, alpha, "Mindfulness and control groups have the same average well-being.")}`;
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
  const W = NARROW ? 340 : 560, H = 320, m = { l: NARROW ? 44 : 52, r: 12, t: 28, b: 46 };
  const DW = NARROW ? 340 : 560, DH = 170, dm = { l: 14, r: 14, t: 16, b: 30 };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  dist.setAttribute("viewBox", `0 0 ${DW} ${DH}`);
  const sdSlider = root.querySelector("[name=a-sd]");
  const nSlider = root.querySelector("[name=a-n]");
  const sdOut = root.querySelector("[data-out=a-sd]");
  const nOut = root.querySelector("[data-out=a-n]");
  const stats = root.querySelector(".a-stats");
  const split = root.querySelector(".ss-split");
  const groupsMeta = [
    { name: "Therapy A", cls: "g1" },
    { name: "Therapy B", cls: "g2" },
    { name: "Waitlist", cls: "g3" },
  ];
  let means = [58, 64, 47];
  let seed = 5;
  let z = [];
  let prevSig = null;
  let stop = () => {};

  const Y = [0, 100];
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const sy = (v) => y0 - ((clamp(v, Y[0], Y[1]) - Y[0]) / (Y[1] - Y[0])) * (y0 - y1);
  const iy = (py) => Y[0] + ((y0 - py) / (y0 - y1)) * (Y[1] - Y[0]);
  const colX = (i) => x0 + ((x1 - x0) * (i + 0.5)) / 3;

  // Standardised noise (exact mean 0, sd 1 per group) so a group's mean is exactly its handle.
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

  const layer = svgEl("g", {}, svg);
  axes(svg, { x0, x1, y0, y1, xTicks: [], yTicks: [0, 25, 50, 75, 100], sx: () => 0, sy, yLabel: "Symptom relief" });
  const grandLine = svgEl("line", { class: "a-grand" }, svg);
  const grandLabel = svgEl("text", { class: "lab-tick a-grand-label", "text-anchor": "end" }, svg);
  grandLabel.textContent = "grand mean";
  const dotsG = svgEl("g", {}, svg);
  const handlesG = svgEl("g", {}, svg);
  groupsMeta.forEach((g, i) => {
    const t = svgEl("text", { x: colX(i), y: y0 + 26, class: "lab-row-label", "text-anchor": "middle" }, layer);
    t.textContent = g.name;
    const h = svgEl("g", {
      class: `a-handle ${g.cls}`, tabindex: 0, role: "slider", "aria-label": `${g.name} average`,
      "aria-valuemin": 5, "aria-valuemax": 95, "data-i": i,
    }, handlesG);
    const hw = NARROW ? 40 : 56, lw = NARROW ? 32 : 46;
    svgEl("rect", { x: -hw, y: -22, width: hw * 2, height: 44, rx: 22, class: "a-handle-hit" }, h);
    svgEl("line", { x1: -lw, x2: lw, y1: 0, y2: 0, class: "a-handle-line" }, h);
    svgEl("circle", { r: 9, class: "a-handle-knob" }, h);
    svgEl("text", NARROW ? { x: 0, y: -16, "text-anchor": "middle", class: "a-handle-label" } : { x: 54, y: 4, class: "a-handle-label" }, h);
  });

  function render(ms) {
    const sd = +sdSlider.value;
    const groups = ms.map((mu, i) => z[i].map((v) => mu + sd * v));
    const res = oneWayAnova(groups);
    const alpha = getAlpha();

    grandLine.setAttribute("x1", x0); grandLine.setAttribute("x2", x1);
    grandLine.setAttribute("y1", sy(res.grand)); grandLine.setAttribute("y2", sy(res.grand));
    grandLabel.setAttribute("x", x1); grandLabel.setAttribute("y", sy(res.grand) - 6);

    dotsG.replaceChildren();
    groups.forEach((vals, i) => {
      const g = svgEl("g", { class: `strip ${groupsMeta[i].cls}` }, dotsG);
      const r = rng(31 + i);
      for (const v of vals) svgEl("circle", { cx: colX(i) + (r() - 0.5) * (NARROW ? 46 : 70), cy: sy(v), r: vals.length > 30 ? 3.5 : 4.5 }, g);
    });
    [...handlesG.children].forEach((h, i) => {
      h.setAttribute("transform", `translate(${colX(i)},${sy(ms[i])})`);
      h.setAttribute("aria-valuenow", Math.round(ms[i]));
      h.querySelector(".a-handle-label").textContent = fmt(ms[i], 0);
    });
    svg.setAttribute("aria-label", `Three groups. Averages ${ms.map((v) => Math.round(v)).join(", ")}. F ${fmt(res.F)}, p ${formatP(res.p)}.`);

    const fc = fCrit(alpha, res.dfb, res.dfw);
    const xmax = Math.max(8, Math.min(30, Math.ceil(Math.max(res.F, fc) * 1.25)));
    drawDistribution(dist, {
      W: DW, H: DH, m: dm, xmin: 0.02, xmax, pdf: (x) => fPdf(x, res.dfb, res.dfw),
      critLines: [fc], rejectRanges: [[fc, xmax]],
      pRanges: res.F < xmax ? [[res.F, xmax]] : [],
      observed: res.F, obsLabel: `your F = ${fmt(res.F)}`,
    });

    split.style.setProperty("--between", res.eta2.toFixed(4));
    split.querySelector("[data-ss=between]").textContent = `Between groups ${Math.round(res.eta2 * 100)}%`;
    split.querySelector("[data-ss=within]").textContent = `Within groups ${100 - Math.round(res.eta2 * 100)}%`;

    stats.innerHTML = `
      <dl class="lab-numbers">
        <div><dt>F(${res.dfb}, ${res.dfw})</dt><dd>${fmt(res.F)}</dd></div>
        <div><dt>p</dt><dd>${formatP(res.p)}</dd></div>
        <div><dt>η²</dt><dd>${fmt(res.eta2)}</dd></div>
        <div><dt>SS between</dt><dd>${Math.round(res.ssb)}</dd></div>
        <div><dt>SS within</dt><dd>${Math.round(res.ssw)}</dd></div>
        <div><dt>n / group</dt><dd>${z[0].length}</dd></div>
      </dl>
      <p class="lab-explain">F compares how far the group averages sit from each other with how spread out people are inside each group.
      Pull the averages apart or tighten the spread to raise F.</p>
      ${verdictHTML(res.p, alpha, "All three groups have the same average relief.")}`;
    popVerdict(stats, prevSig);
    prevSig = res.p < alpha;
  }

  // drag handles
  let drag = null;
  handlesG.addEventListener("pointerdown", (e) => {
    const h = e.target.closest(".a-handle");
    if (!h) return;
    e.preventDefault();
    stop();
    drag = { i: +h.dataset.i, id: e.pointerId };
    h.classList.add("is-dragging");
    h.setPointerCapture(e.pointerId);
  });
  handlesG.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    means[drag.i] = clamp(iy(toSvgPoint(svg, e).y), 5, 95);
    render(means);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    handlesG.querySelector(".is-dragging")?.classList.remove("is-dragging");
    drag = null;
  };
  handlesG.addEventListener("pointerup", end);
  handlesG.addEventListener("pointercancel", end);
  handlesG.addEventListener("keydown", (e) => {
    const h = e.target.closest(".a-handle");
    if (!h) return;
    const i = +h.dataset.i;
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") means[i] = clamp(means[i] + step, 5, 95);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") means[i] = clamp(means[i] - step, 5, 95);
    else return;
    e.preventDefault();
    render(means);
  });

  sdSlider.addEventListener("input", () => { sdOut.textContent = sdSlider.value; render(means); });
  nSlider.addEventListener("input", () => { nOut.textContent = nSlider.value; makeZ(); render(means); });
  root.querySelector("[data-a-resample]").addEventListener("click", () => { seed++; makeZ(); render(means); });
  root.querySelector("[data-a-same]").addEventListener("click", () => {
    const from = [...means]; means = [55, 55, 55];
    stop(); stop = tween(from, means, render, 420);
  });
  root.querySelector("[data-a-apart]").addEventListener("click", () => {
    const from = [...means]; means = [62, 74, 40];
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

  // Tabs (WAI-ARIA tabs pattern)
  const tabs = [...root.querySelectorAll("[data-lab-tab]")];
  function select(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      const panel = root.querySelector(`#${t.getAttribute("aria-controls")}`);
      panel.hidden = !on;
    });
    root.querySelector(".lab-tabs").style.setProperty("--tab-index", tabs.indexOf(tab));
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

  // Panels must be visible to measure nothing — charts use viewBox units, so init all now.
  panels.regression = initRegression(root.querySelector("#lab-regression"), getAlpha);
  panels.ttest = initTTest(root.querySelector("#lab-ttest"), getAlpha);
  panels.anova = initAnova(root.querySelector("#lab-anova"), getAlpha);
  select(tabs[0]);
}
