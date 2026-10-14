// Well-Being Framework: a draggable wellness wheel + an inline activity for each dimension.
const NS = "http://www.w3.org/2000/svg";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

const DIMENSIONS = [
  { key: "resilience", name: "Resilience", color: "var(--mint)",
    blurb: "Bouncing back from hard days. It grows the way plants do: small, steady care.",
    prompt: "How well have you been bouncing back lately?" },
  { key: "compassion", name: "Compassion", color: "var(--pink)",
    blurb: "Warmth toward others and toward yourself, especially when things go wrong.",
    prompt: "How kind have you been to yourself and others?" },
  { key: "growth", name: "Growth", color: "var(--lavender)",
    blurb: "Learning a little each day. Progress counts even when it is slow.",
    prompt: "How much have you been learning and stretching?" },
  { key: "understanding", name: "Understanding", color: "var(--sky)",
    blurb: "Making sense of why we feel and act the way we do.",
    prompt: "How well do you understand what drives your reactions?" },
  { key: "awareness", name: "Self-Awareness", color: "var(--butter)",
    blurb: "Noticing your thoughts and body in the moment, without judging them.",
    prompt: "How often do you pause and notice how you feel?" },
  { key: "connection", name: "Connection", color: "var(--peach)",
    blurb: "Relationships that make you feel seen, supported and less alone.",
    prompt: "How connected have you felt to people you care about?" },
];


// Line icons (Lucide-style, 24px grid, drawn with currentColor).
const ICONS = {
  resilience: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  compassion: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  growth: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  understanding: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  awareness: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  connection: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
};
const icon = (key, size = 20, cls = "") =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key]}</svg>`;

const STORE = "wb-wheel-v1";
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE));
    if (Array.isArray(v) && v.length === DIMENSIONS.length) return v.map((n) => Math.min(10, Math.max(1, +n || 5)));
  } catch {}
  return [7, 6, 5, 6, 4, 7];
}
function save(values) {
  try { localStorage.setItem(STORE, JSON.stringify(values)); } catch {}
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export function initWellbeing() {
  const root = document.getElementById("psychology");
  if (!root) return;
  const svg = root.querySelector(".wb-wheel");
  const chips = root.querySelector(".wb-chips");
  const panel = root.querySelector(".wb-panel");
  const insight = root.querySelector(".wb-insight");
  let values = load();
  let active = 0;
  const wrap = root.querySelector(".wb-wheel-wrap");
  const progress = root.querySelector(".wb-progress");
  const DONE_KEY = "wb-done-v1";
  let done = (() => { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || []; } catch { return []; } })();
  const MOODS = ["", "rough", "rough", "wobbly", "wobbly", "okay", "okay", "good", "good", "thriving", "thriving"];

  // ---------------- Wheel ----------------
  const S = 440, C = S / 2, R = 150, MAX = 10;
  const narrow = window.innerWidth < 600;
  svg.setAttribute("viewBox", narrow ? `0 0 ${S} ${S}` : `-100 0 ${S + 200} ${S}`);
  svg.classList.toggle("is-narrow", narrow);
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length;
  const pt = (i, v) => [C + Math.cos(angle(i)) * (R * v) / MAX, C + Math.sin(angle(i)) * (R * v) / MAX];

  const rings = el("g", { class: "wb-rings" }, svg);
  for (const v of [2, 4, 6, 8, 10]) {
    el("polygon", { points: DIMENSIONS.map((_, i) => pt(i, v).join(",")).join(" ") }, rings);
  }
  DIMENSIONS.forEach((_, i) => {
    const [x, y] = pt(i, MAX);
    el("line", { x1: C, y1: C, x2: x, y2: y }, rings);
  });
  const shape = el("polygon", { class: "wb-shape" }, svg);
  const center = el("g", { class: "wb-center" }, svg);
  el("circle", { cx: C, cy: C, r: 34 }, center);
  const centerNum = el("text", { x: C, y: C + 3, "text-anchor": "middle", class: "wb-center-num" }, center);
  const centerLbl = el("text", { x: C, y: C + 19, "text-anchor": "middle", class: "wb-center-lbl" }, center);
  centerLbl.textContent = "balance";

  const labels = el("g", {}, svg);
  const knobs = el("g", {}, svg);
  const moodTag = el("g", { class: "wb-mood", "aria-hidden": "true" }, svg);
  const moodText = el("text", { "text-anchor": "middle" }, moodTag);
  DIMENSIONS.forEach((d, i) => {
    const [lx, ly] = pt(i, MAX + 2.4);
    const a = Math.cos(angle(i));
    let lbl;
    if (narrow) {
      const [ix, iy] = pt(i, MAX + 2.1);
      lbl = el("g", { class: "wb-label wb-label-icon", "data-i": i, transform: `translate(${ix - 14},${iy - 14}) scale(1.17)`, style: `color:${d.color}` }, labels);
      lbl.innerHTML = ICONS[d.key];
      el("title", {}, lbl).textContent = d.name;
    } else {
      lbl = el("text", {
        x: lx, y: ly + 5, class: "wb-label", "data-i": i,
        "text-anchor": Math.abs(a) < 0.2 ? "middle" : a > 0 ? "start" : "end",
      }, labels);
      lbl.textContent = d.name;
    }
    lbl.addEventListener("click", () => select(i, true));

    const k = el("g", {
      class: "wb-knob", tabindex: 0, role: "slider", "data-i": i,
      "aria-label": d.name, "aria-valuemin": 1, "aria-valuemax": 10,
      style: `--c:${d.color}`,
    }, knobs);
    el("circle", { r: 24, class: "wb-knob-hit" }, k);
    el("circle", { r: 11, class: "wb-knob-dot" }, k);
  });

  function drawWheel() {
    shape.setAttribute("points", values.map((v, i) => pt(i, v).join(",")).join(" "));
    [...knobs.children].forEach((k, i) => {
      const [x, y] = pt(i, values[i]);
      k.setAttribute("transform", `translate(${x},${y})`);
      k.setAttribute("aria-valuenow", Math.round(values[i]));
      k.setAttribute("aria-valuetext", `${Math.round(values[i])} out of 10`);
      k.classList.toggle("is-active", i === active);
    });
    [...labels.children].forEach((l, i) => l.classList.toggle("is-active", i === active));
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    centerNum.textContent = avg.toFixed(1);
    // mood word beside the active point, and a glow that brightens with balance
    const [mx, my] = pt(active, values[active] + 2.3);
    moodText.setAttribute("x", mx);
    moodText.setAttribute("y", my + 4);
    moodText.textContent = `${Math.round(values[active])} · ${MOODS[Math.round(values[active])]}`;
    wrap.style.setProperty("--balance", ((avg - 1) / 9).toFixed(3));
    updateInsight();
  }

  function updateInsight() {
    const rounded = values.map(Math.round);
    const lo = rounded.indexOf(Math.min(...rounded));
    const hi = rounded.indexOf(Math.max(...rounded));
    const d = DIMENSIONS[lo];
    insight.innerHTML = rounded[lo] === rounded[hi]
      ? `<p>Your wheel is perfectly even. Pick any area to play.</p>`
      : `<p>Your strongest area is <strong>${DIMENSIONS[hi].name}</strong>. <strong>${d.name}</strong> could use a little care.</p>
         <button type="button" class="pill-btn" data-go="${lo}">Try the ${d.name} activity</button>`;
    insight.querySelector("[data-go]")?.addEventListener("click", (e) => {
      select(+e.currentTarget.dataset.go, true);
      panel.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest" });
    });
  }

  // Drag knobs along their spoke
  let drag = null;
  function valueFromPointer(i, e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    const ux = Math.cos(angle(i)), uy = Math.sin(angle(i));
    const proj = (q.x - C) * ux + (q.y - C) * uy;
    return Math.min(MAX, Math.max(1, (proj / R) * MAX));
  }
  knobs.addEventListener("pointerdown", (e) => {
    const k = e.target.closest(".wb-knob");
    if (!k) return;
    e.preventDefault();
    const i = +k.dataset.i;
    drag = { i, id: e.pointerId };
    k.classList.add("is-dragging");
    k.setPointerCapture(e.pointerId);
    if (i !== active) select(i, false);
  });
  knobs.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    values[drag.i] = valueFromPointer(drag.i, e);
    drawWheel();
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    values[drag.i] = Math.round(values[drag.i]);
    knobs.querySelector(".is-dragging")?.classList.remove("is-dragging");
    drag = null;
    drawWheel();
    save(values);
  };
  knobs.addEventListener("pointerup", endDrag);
  knobs.addEventListener("pointercancel", endDrag);
  knobs.addEventListener("keydown", (e) => {
    const k = e.target.closest(".wb-knob");
    if (!k) return;
    const i = +k.dataset.i;
    if (["ArrowUp", "ArrowRight"].includes(e.key)) values[i] = Math.min(10, Math.round(values[i]) + 1);
    else if (["ArrowDown", "ArrowLeft"].includes(e.key)) values[i] = Math.max(1, Math.round(values[i]) - 1);
    else if (e.key === "Enter" || e.key === " ") { select(i, true); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    if (i !== active) select(i, false);
    drawWheel();
    save(values);
  });
  knobs.addEventListener("focusin", (e) => {
    const k = e.target.closest(".wb-knob");
    if (k && +k.dataset.i !== active) select(+k.dataset.i, false);
  });

  // ---------------- Chips ----------------
  chips.innerHTML = DIMENSIONS.map((d, i) => `
    <button type="button" class="wb-chip" data-i="${i}" style="--c:${d.color}" aria-pressed="false">
      ${icon(d.key, 18)}${d.name}
    </button>`).join("");
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".wb-chip");
    if (b) select(+b.dataset.i, true);
  });

  // ---------------- Panel ----------------
  function select(i, animate) {
    active = i;
    [...chips.children].forEach((c, j) => c.setAttribute("aria-pressed", j === i ? "true" : "false"));
    const activeChip = chips.children[i];
    if (activeChip && chips.scrollWidth > chips.clientWidth) {
      chips.scrollTo({ left: activeChip.offsetLeft - 16, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
    drawWheel();
    renderPanel(animate);
  }

  function renderProgress(celebrate) {
    progress.innerHTML = `
      <p class="wb-progress-label">${done.length === DIMENSIONS.length ? "Every area visited. Take that care with you today." : `Activities finished: ${done.length} of ${DIMENSIONS.length}`}</p>
      <ol class="wb-stars">${DIMENSIONS.map((d) => `
        <li class="${done.includes(d.key) ? "is-done" : ""}" style="--c:${d.color}" title="${d.name}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>
          <span class="sr-only">${d.name}${done.includes(d.key) ? " finished" : ""}</span>
        </li>`).join("")}</ol>`;
    if (celebrate && !reduceMotion.matches) {
      for (let i = 0; i < 6; i++) {
        const s = document.createElement("span");
        s.className = "shooting-star";
        s.style.setProperty("--top", `${10 + Math.random() * 50}%`);
        s.style.setProperty("--delay", `${i * 140}ms`);
        root.appendChild(s);
        s.addEventListener("animationend", () => s.remove());
      }
    }
  }

  function bump() {
    const key = DIMENSIONS[active].key;
    if (!done.includes(key)) {
      done.push(key);
      try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch {}
      renderProgress(done.length === DIMENSIONS.length);
      const star = progress.querySelectorAll(".wb-stars li")[active];
      if (star && !reduceMotion.matches) star.animate([{ transform: "scale(0.6) rotate(-30deg)" }, { transform: "scale(1.25) rotate(8deg)" }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    }
    values[active] = Math.min(10, Math.round(values[active]) + 1);
    save(values);
    drawWheel();
    const k = knobs.children[active];
    if (k && !reduceMotion.matches) {
      k.querySelector(".wb-knob-dot").animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }],
        { duration: 420, easing: EASE });
    }
  }

  function renderPanel(animate) {
    const d = DIMENSIONS[active];
    panel.style.setProperty("--c", d.color);
    panel.innerHTML = `
      <div class="wb-panel-head">
        <span class="wb-panel-icon">${icon(d.key, 28)}</span>
        <div>
          <h3>${d.name}</h3>
          <p>${d.blurb}</p>
        </div>
      </div>
      <p class="wb-prompt">${d.prompt} <span>Drag its dot on the wheel.</span></p>
      <div class="wb-activity" aria-live="polite"></div>`;
    ACTIVITIES[d.key](panel.querySelector(".wb-activity"), bump);
    if (animate && !reduceMotion.matches) {
      panel.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 240, easing: EASE });
    }
  }

  renderProgress(false);
  select(0, false);
}

// ---------------- Activities ----------------
const ACTIVITIES = {
  resilience(box, done) {
    let s = 0;
    const max = 4;
    const msgs = ["A seed. It needs a little water.", "A sprout! Keep going.", "Growing steadily.", "Look at those leaves.", "In full bloom. Small care, big result."];
    box.innerHTML = `
      <div class="act act-plant">
        <svg class="plant" viewBox="0 0 120 120" aria-hidden="true">
          <path class="plant-ground" d="M20 104h80"/>
          <path class="plant-stem" d="M60 104 C60 88 58 74 60 56 C61 46 60 40 60 34" pathLength="1"/>
          <path class="plant-leaf l1" d="M60 86 C48 84 40 76 38 66 C50 66 58 74 60 86z"/>
          <path class="plant-leaf l2" d="M60 72 C72 70 80 62 82 52 C70 52 62 60 60 72z"/>
          <path class="plant-leaf l3" d="M60 58 C50 56 44 50 42 42 C52 42 58 48 60 58z"/>
          <g class="plant-flower"><circle cx="60" cy="28" r="5"/><circle cx="60" cy="19" r="5"/><circle cx="68" cy="25" r="5"/><circle cx="52" cy="25" r="5"/><circle cx="65" cy="33" r="5"/><circle cx="55" cy="33" r="5"/><circle class="plant-core" cx="60" cy="27" r="3.5"/></g>
          <ellipse class="plant-seed" cx="60" cy="100" rx="5" ry="3.5"/>
        </svg>
        <div class="act-meter" style="--p:0"><span></span></div>
        <p class="act-status">${msgs[0]}</p>
        <button type="button" class="act-btn">Water it</button>
      </div>`;
    const plant = box.querySelector(".plant");
    const meter = box.querySelector(".act-meter");
    const status = box.querySelector(".act-status");
    const btn = box.querySelector(".act-btn");
    plant.dataset.stage = 0;
    btn.addEventListener("click", () => {
      if (s >= max) { s = 0; btn.textContent = "Water it"; }
      else s++;
      plant.dataset.stage = s;
      meter.style.setProperty("--p", s / max);
      status.textContent = msgs[s];
      if (s === max) { btn.textContent = "Plant another"; done(); }
    });
  },

  compassion(box, done) {
    let n = 0;
    const kind = ["You're doing better than you think.", "It's okay to rest.", "Thank you for trying.", "You matter.", "Mistakes mean you're learning."];
    box.innerHTML = `
      <div class="act act-hearts">
        <div class="hearts-stage" aria-hidden="true"></div>
        <p class="act-status">Tap to send a kind note into the world.</p>
        <button type="button" class="act-btn">Send kindness</button>
        <p class="act-count"><span>0</span> sent</p>
      </div>`;
    const stage = box.querySelector(".hearts-stage");
    const status = box.querySelector(".act-status");
    const count = box.querySelector(".act-count span");
    box.querySelector(".act-btn").addEventListener("click", () => {
      n++;
      count.textContent = n;
      status.textContent = `“${kind[(n - 1) % kind.length]}”`;
      if (!reduceMotion.matches) {
        const h = document.createElement("span");
        h.className = "float-heart";
        h.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">${ICONS.compassion}</svg>`;
        h.style.left = `${20 + Math.random() * 60}%`;
        stage.appendChild(h);
        h.addEventListener("animationend", () => h.remove());
      }
      if (n === 5) done();
    });
  },

  growth(box, done) {
    let xp = 0, level = 1;
    const tasks = ["Read a page", "Ask a question", "Try something new", "Reflect on a mistake", "Teach someone"];
    box.innerHTML = `
      <div class="act act-level">
        <p class="level-badge">Level <strong>1</strong></p>
        <div class="act-meter" style="--p:0"><span></span></div>
        <div class="task-grid">${tasks.map((t) => `<button type="button" class="task-btn">${t}</button>`).join("")}</div>
      </div>`;
    const badge = box.querySelector(".level-badge strong");
    const meter = box.querySelector(".act-meter");
    box.querySelectorAll(".task-btn").forEach((b) => b.addEventListener("click", () => {
      xp += 35;
      b.classList.add("is-done");
      if (xp >= 100) {
        xp -= 100; level++;
        badge.textContent = level;
        if (!reduceMotion.matches) badge.parentElement.animate([{ transform: "scale(1.15)" }, { transform: "none" }], { duration: 300, easing: EASE });
        done();
      }
      meter.style.setProperty("--p", xp / 100);
      setTimeout(() => b.classList.remove("is-done"), 700);
    }));
  },

  understanding(box, done) {
    const steps = [
      ["Notice", "Something shifted. My chest feels tight."],
      ["Name", "This feels like worry."],
      ["Wonder", "What is the worry trying to protect?"],
      ["Respond", "I can take one small step that helps."],
    ];
    let open = 0;
    box.innerHTML = `
      <div class="act act-steps">
        <p class="act-status">Flip each card to move from feeling to understanding.</p>
        <ol class="flip-grid">${steps.map(([t, d], i) => `
          <li><button type="button" class="flip" aria-expanded="false">
            <span class="flip-front">${t}</span><span class="flip-back">${d}</span>
          </button></li>`).join("")}</ol>
      </div>`;
    box.querySelectorAll(".flip").forEach((b) => b.addEventListener("click", () => {
      if (b.getAttribute("aria-expanded") === "true") return;
      b.setAttribute("aria-expanded", "true");
      open++;
      if (open === steps.length) {
        box.querySelector(".act-status").textContent = "That's the loop therapists use every day. Nicely done.";
        done();
      }
    }));
  },

  awareness(box, done) {
    const phases = [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]];
    let timer = null, phase = 0, rounds = 0, left = 0;
    box.innerHTML = `
      <div class="act act-breathe">
        <div class="breath" data-phase="idle"><span class="breath-word">Ready?</span><span class="breath-count"></span></div>
        <p class="act-status">Box breathing: four slow counts per side. Two rounds calms the body.</p>
        <button type="button" class="act-btn">Start breathing</button>
      </div>`;
    const ball = box.querySelector(".breath");
    const word = box.querySelector(".breath-word");
    const cnt = box.querySelector(".breath-count");
    const btn = box.querySelector(".act-btn");
    const stop = () => {
      clearInterval(timer); timer = null;
      ball.dataset.phase = "idle"; word.textContent = rounds ? "Nice work" : "Ready?"; cnt.textContent = "";
      btn.textContent = "Start breathing";
    };
    const tick = () => {
      if (left <= 0) {
        if (phase === phases.length) {
          phase = 0; rounds++;
          if (rounds === 2) { done(); stop(); box.querySelector(".act-status").textContent = "Two rounds done. Notice how your shoulders feel now."; return; }
        }
        const [w, s] = phases[phase];
        word.textContent = w;
        ball.dataset.phase = ["in", "hold-in", "out", "hold-out"][phase];
        left = s; phase++;
      }
      cnt.textContent = left;
      left--;
    };
    btn.addEventListener("click", () => {
      if (timer) return stop();
      phase = 0; rounds = 0; left = 0;
      btn.textContent = "Stop";
      tick();
      timer = setInterval(tick, 1000);
    });
    // stop if the panel is replaced
    new MutationObserver((_, obs) => { if (!box.isConnected) { clearInterval(timer); obs.disconnect(); } })
      .observe(document.body, { childList: true, subtree: true });
  },

  connection(box, done) {
    const people = [[60, 40], [150, 24], [228, 64], [196, 132], [96, 124]];
    const order = [];
    box.innerHTML = `
      <div class="act act-connect">
        <p class="act-status">Tap the stars to link your people into a constellation.</p>
        <svg class="connect-svg" viewBox="0 0 280 160" role="group" aria-label="Constellation of five people">
          <g class="connect-lines"></g>
          ${people.map(([x, y], i) => `
            <g class="connect-star" tabindex="0" role="button" aria-label="Person ${i + 1}" data-i="${i}" transform="translate(${x},${y})">
              <circle r="20" class="connect-hit"></circle>
              <circle r="8" class="connect-dot"></circle>
            </g>`).join("")}
        </svg>
        <p class="act-count"><span>0</span> of 5 connected</p>
      </div>`;
    const lines = box.querySelector(".connect-lines");
    const count = box.querySelector(".act-count span");
    const hit = (g) => {
      const i = +g.dataset.i;
      if (order.includes(i)) return;
      g.classList.add("is-on");
      if (order.length) {
        const [ax, ay] = people[order.at(-1)], [bx, by] = people[i];
        const l = el("line", { x1: ax, y1: ay, x2: bx, y2: by, pathLength: 1 }, lines);
        if (!reduceMotion.matches) l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 300, easing: EASE, fill: "both" });
      }
      order.push(i);
      count.textContent = order.length;
      if (order.length === people.length) {
        const [ax, ay] = people[i], [bx, by] = people[order[0]];
        el("line", { x1: ax, y1: ay, x2: bx, y2: by, pathLength: 1 }, lines);
        box.querySelector(".act-status").textContent = "Everyone's connected. You don't have to do it alone.";
        done();
      }
    };
    box.querySelectorAll(".connect-star").forEach((g) => {
      g.addEventListener("click", () => hit(g));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(g); } });
    });
  },
};
