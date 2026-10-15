// Well-Being Framework: a quick 1-5 check-in for six areas + an inline activity for each.
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

const STORE = "wb-check-v1";
const LEVELS = ["", "Rough", "Low", "Okay", "Good", "Great"];
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE));
    if (Array.isArray(v) && v.length === DIMENSIONS.length) return v.map((n) => Math.min(5, Math.max(1, Math.round(+n) || 3)));
  } catch {}
  return [4, 4, 3, 4, 2, 4];
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
  const list = root.querySelector(".wb-list");
  const panel = root.querySelector(".wb-panel");
  const insight = root.querySelector(".wb-insight");
  const progress = root.querySelector(".wb-progress");
  let values = load();
  let active = 0;
  const DONE_KEY = "wb-done-v1";
  let done = (() => { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || []; } catch { return []; } })();

  // ---------------- Check-in list ----------------
  list.innerHTML = DIMENSIONS.map((d, i) => `
    <li class="wb-row" data-i="${i}" style="--c:${d.color}">
      <button type="button" class="wb-name" aria-pressed="false" aria-controls="wb-panel">
        ${icon(d.key, 20)}<span>${d.name}</span>
      </button>
      <div class="wb-rate" role="radiogroup" aria-label="${d.name}: ${d.prompt} Rate 1 to 5">
        ${[1, 2, 3, 4, 5].map((v) => `<button type="button" role="radio" data-v="${v}" aria-label="${v} of 5, ${LEVELS[v]}" aria-checked="false" tabindex="-1"><i></i></button>`).join("")}
      </div>
      <span class="wb-level" aria-hidden="true"></span>
    </li>`).join("");
  const rows = [...list.children];

  function drawRows() {
    rows.forEach((row, i) => {
      const v = values[i];
      row.classList.toggle("is-active", i === active);
      row.querySelector(".wb-name").setAttribute("aria-pressed", i === active ? "true" : "false");
      row.querySelector(".wb-level").textContent = LEVELS[v];
      row.querySelectorAll("[role=radio]").forEach((b) => {
        const n = +b.dataset.v;
        b.classList.toggle("is-on", n <= v);
        b.setAttribute("aria-checked", n === v ? "true" : "false");
        b.tabIndex = n === v ? 0 : -1;
      });
    });
    updateInsight();
  }

  function updateInsight() {
    const lo = values.indexOf(Math.min(...values));
    const even = values.every((v) => v === values[0]);
    const d = DIMENSIONS[lo];
    insight.innerHTML = even
      ? `<p>Everything feels even. Pick any area to try its activity.</p>`
      : `<p><strong>${d.name}</strong> could use a little care today.</p>
         ${lo === active ? "" : `<button type="button" class="wb-go" data-go="${lo}" style="--c:${d.color}">Try its activity <span aria-hidden="true">→</span></button>`}`;
    insight.querySelector("[data-go]")?.addEventListener("click", (e) => {
      select(+e.currentTarget.dataset.go, true);
      if (window.innerWidth < 900) panel.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    });
  }

  function rate(i, v, focus) {
    values[i] = v;
    save(values);
    if (i !== active) select(i, true); else drawRows();
    const b = rows[i].querySelector(`[data-v="${v}"]`);
    if (focus) b.focus();
    if (!reduceMotion.matches) b.querySelector("i").animate([{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 320, easing: EASE });
  }

  list.addEventListener("click", (e) => {
    const row = e.target.closest(".wb-row");
    if (!row) return;
    const i = +row.dataset.i;
    const r = e.target.closest("[role=radio]");
    if (r) rate(i, +r.dataset.v, false);
    else if (e.target.closest(".wb-name")) select(i, true);
  });
  list.addEventListener("keydown", (e) => {
    const r = e.target.closest("[role=radio]");
    if (!r) return;
    const i = +r.closest(".wb-row").dataset.i;
    let v = values[i];
    if (e.key === "ArrowRight" || e.key === "ArrowUp") v = Math.min(5, v + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v = Math.max(1, v - 1);
    else return;
    e.preventDefault();
    rate(i, v, true);
  });

  // ---------------- Panel ----------------
  function select(i, animate) {
    active = i;
    drawRows();
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
    const i = active;
    const key = DIMENSIONS[i].key;
    if (!done.includes(key)) {
      done.push(key);
      try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch {}
      renderProgress(done.length === DIMENSIONS.length);
      const star = progress.querySelectorAll(".wb-stars li")[i];
      if (star && !reduceMotion.matches) star.animate([{ transform: "scale(0.6) rotate(-30deg)" }, { transform: "scale(1.25) rotate(8deg)" }, { transform: "none" }], { duration: 520, easing: EASE });
    }
    // a finished activity nudges that area up one step
    if (values[i] < 5) {
      values[i] += 1;
      save(values);
      drawRows();
      const dot = rows[i].querySelector(`[data-v="${values[i]}"] i`);
      if (dot && !reduceMotion.matches) dot.animate([{ transform: "scale(1)" }, { transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 480, easing: EASE });
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
      <div class="wb-activity" aria-live="polite"></div>`;
    ACTIVITIES[d.key](panel.querySelector(".wb-activity"), bump);
    if (animate && !reduceMotion.matches) {
      panel.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 240, easing: EASE });
    }
  }

  renderProgress(false);
  select(values.indexOf(Math.min(...values)), false);
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
    const SIDE = 4, ROUNDS = 3, LOOP = SIDE * 4;
    const WORDS = ["Breathe in", "Hold", "Breathe out", "Hold"];
    const PHASES = ["in", "hold-in", "out", "hold-out"];
    box.innerHTML = `
      <div class="act act-breathe">
        <div class="bbox" data-phase="idle">
          <svg class="bbox-svg" viewBox="0 0 240 240" aria-hidden="true">
            <path class="bbox-track" d="M40 40 H200 V200 H40 Z"/>
            <path class="bbox-trail" d="M40 40 H200 V200 H40 Z" pathLength="1"/>
            <text class="bbox-side" data-s="0" x="120" y="27" text-anchor="middle">In</text>
            <text class="bbox-side" data-s="1" x="0" y="0" text-anchor="middle" transform="translate(216 120) rotate(90)">Hold</text>
            <text class="bbox-side" data-s="2" x="120" y="222" text-anchor="middle">Out</text>
            <text class="bbox-side" data-s="3" x="0" y="0" text-anchor="middle" transform="translate(24 120) rotate(-90)">Hold</text>
            <ellipse class="bbox-shadow" cx="120" cy="180" rx="50" ry="6"/>
            <g class="bbox-toy">
              <path class="bbox-flap bbox-flap-l" d="M74 108 L120 108 L114 96 L66 98 Z"/>
              <path class="bbox-flap bbox-flap-r" d="M166 108 L120 108 L126 96 L174 98 Z"/>
              <rect class="bbox-body" x="72" y="106" width="96" height="72" rx="7"/>
              <rect class="bbox-lip" x="72" y="106" width="96" height="9" rx="4"/>
              <rect class="bbox-tape" x="112" y="106" width="16" height="22" rx="1.5"/>
              <g class="bbox-eyes-open"><ellipse cx="103" cy="146" rx="3" ry="3.8"/><ellipse cx="137" cy="146" rx="3" ry="3.8"/></g>
              <g class="bbox-eyes-shut"><path d="M98 147 q5 -5 10 0"/><path d="M132 147 q5 -5 10 0"/></g>
              <path class="bbox-mouth" d="M114 155 q6 6 12 0"/>
              <circle class="bbox-blush" cx="93" cy="155" r="5"/><circle class="bbox-blush" cx="147" cy="155" r="5"/>
            </g>
            <circle class="bbox-dot" cx="40" cy="40" r="7"/>
          </svg>
        </div>
        <p class="bbox-word"><strong>Ready?</strong><span class="bbox-count"></span></p>
        <p class="act-status">Box breathing: follow the light around the box. Four counts per side, ${ROUNDS} rounds.</p>
        <button type="button" class="act-btn">Start breathing</button>
      </div>`;
    const bb = box.querySelector(".bbox");
    const track = box.querySelector(".bbox-track");
    const trail = box.querySelector(".bbox-trail");
    const dot = box.querySelector(".bbox-dot");
    const word = box.querySelector(".bbox-word strong");
    const cnt = box.querySelector(".bbox-count");
    const status = box.querySelector(".act-status");
    const btn = box.querySelector(".act-btn");
    const sides = [...box.querySelectorAll(".bbox-side")];
    const total = track.getTotalLength();
    let raf = 0, t0 = 0, lastSide = -1, lastCount = -1;

    const place = (p) => {
      const pt = track.getPointAtLength(p * total);
      dot.setAttribute("cx", pt.x.toFixed(2));
      dot.setAttribute("cy", pt.y.toFixed(2));
      trail.style.strokeDashoffset = 1 - p;
    };
    const reset = (msg) => {
      cancelAnimationFrame(raf); raf = 0;
      bb.dataset.phase = msg ? "done" : "idle";
      sides.forEach((s) => s.classList.remove("is-on"));
      place(0);
      lastSide = lastCount = -1;
      cnt.textContent = "";
      btn.textContent = msg ? "Breathe again" : "Start breathing";
    };
    const frame = (now) => {
      const e = (now - t0) / 1000;
      if (e >= ROUNDS * LOOP) {
        reset(true);
        word.textContent = "All done";
        status.textContent = "Three calm boxes. Notice how your shoulders feel now.";
        done();
        return;
      }
      const inLoop = e % LOOP;
      const side = Math.floor(inLoop / SIDE);
      const count = SIDE - Math.floor(inLoop % SIDE);
      place(inLoop / LOOP);
      if (side !== lastSide) {
        lastSide = side;
        bb.dataset.phase = PHASES[side];
        word.textContent = WORDS[side];
        sides.forEach((s, k) => s.classList.toggle("is-on", k === side));
        status.textContent = `Round ${Math.floor(e / LOOP) + 1} of ${ROUNDS}`;
      }
      if (count !== lastCount) { lastCount = count; cnt.textContent = count; }
      raf = requestAnimationFrame(frame);
    };
    btn.addEventListener("click", () => {
      if (raf) {
        reset(false);
        word.textContent = "Paused";
        status.textContent = "Start again whenever you like.";
        return;
      }
      btn.textContent = "Stop";
      t0 = performance.now();
      lastSide = lastCount = -1;
      raf = requestAnimationFrame(frame);
    });
    place(0);
    // stop if the panel is replaced
    new MutationObserver((_, obs) => { if (!box.isConnected) { cancelAnimationFrame(raf); obs.disconnect(); } })
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
