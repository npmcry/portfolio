// Selected work as a whiteboard: draggable sticky notes + kawaii stickers.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const STORE = "board-v1";

const PROJECTS = [
  { id: "dental", name: "Paradise Dental", desc: "Dental practice website with appointment scheduling and patient resources.", url: "https://paradisedental.netlify.app/", color: "mint", pattern: "grid" },
  { id: "robotics", name: "LV Robotics", desc: "Community robotics organization platform for students and enthusiasts.", url: "https://lvrobotics.org/", color: "peach", pattern: "stripes" },
  { id: "cookies", name: "Cookies", desc: "Educational web app exploring privacy and tracking technologies.", url: "https://cookiesarebad.netlify.app/", color: "butter", pattern: "dots" },
  { id: "github", name: "GitHub", desc: "Open source contributions and personal coding projects.", url: "https://github.com/npmcry", color: "lavender", pattern: "gingham" },
];

// Original kawaii stickers, drawn in SVG.
const FACE = (cx, cy, s = 1) => `
  <circle cx="${cx - 7 * s}" cy="${cy}" r="${2.2 * s}" fill="#2b2140"/>
  <circle cx="${cx + 7 * s}" cy="${cy}" r="${2.2 * s}" fill="#2b2140"/>
  <path d="M${cx - 3.5 * s} ${cy + 4 * s} q${3.5 * s} ${3.5 * s} ${7 * s} 0" fill="none" stroke="#2b2140" stroke-width="${1.8 * s}" stroke-linecap="round"/>
  <ellipse cx="${cx - 12 * s}" cy="${cy + 5 * s}" rx="${3.4 * s}" ry="${2 * s}" fill="#ff8fab" opacity=".55"/>
  <ellipse cx="${cx + 12 * s}" cy="${cy + 5 * s}" rx="${3.4 * s}" ry="${2 * s}" fill="#ff8fab" opacity=".55"/>`;
const STICKERS = {
  star: { label: "Smiling star", svg: `<path d="M40 6l9.6 20.4 22.4 2.6-16.6 15.3 4.5 22.1L40 55.4 20.1 66.4l4.5-22.1L8 29l22.4-2.6z" fill="#ffe29a" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>${FACE(40, 37, 0.9)}` },
  cloud: { label: "Happy cloud", svg: `<path d="M20 58a14 14 0 0 1-2-27.8A18 18 0 0 1 52 22a14 14 0 0 1 10 36z" fill="#f4f6ff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>${FACE(40, 42, 0.9)}` },
  heart: { label: "Heart", svg: `<path d="M40 68S10 50 10 30a14 14 0 0 1 30-6 14 14 0 0 1 30 6c0 20-30 38-30 38z" fill="#ffb3c4" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>${FACE(40, 36, 0.9)}` },
  planet: { label: "Planet", svg: `<ellipse cx="40" cy="42" rx="34" ry="9" fill="none" stroke="#fff" stroke-width="7" transform="rotate(-14 40 42)"/><circle cx="40" cy="40" r="20" fill="#c9b6ff" stroke="#fff" stroke-width="4"/><ellipse cx="40" cy="42" rx="34" ry="9" fill="none" stroke="#9ff0d4" stroke-width="3" transform="rotate(-14 40 42)" stroke-dasharray="40 200" stroke-dashoffset="-120"/>${FACE(40, 40, 0.75)}` },
  boba: { label: "Boba tea", svg: `<path d="M22 22h36l-5 46a6 6 0 0 1-6 5H33a6 6 0 0 1-6-5z" fill="#ffd5c2" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M40 22l8-16" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M40 22l8-16" stroke="#9ff0d4" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="62" r="3" fill="#6b4a3a"/><circle cx="42" cy="64" r="3" fill="#6b4a3a"/><circle cx="48" cy="60" r="3" fill="#6b4a3a"/>${FACE(40, 40, 0.75)}` },
  moon: { label: "Sleepy moon", svg: `<path d="M50 8a30 30 0 1 0 22 50A26 26 0 0 1 50 8z" fill="#ffe29a" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M28 40q4 3 8 0M44 44q4 3 8 0" fill="none" stroke="#2b2140" stroke-width="2" stroke-linecap="round"/><ellipse cx="26" cy="47" rx="3.4" ry="2" fill="#ff8fab" opacity=".55"/><path d="M60 22h6l-6 6h6" fill="none" stroke="#c9b6ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` },
  strawberry: { label: "Strawberry", svg: `<path d="M40 72C20 60 14 40 22 30c6-7 30-7 36 0 8 10 2 30-18 42z" fill="#ff9fb0" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M28 24c4 4 8 4 12 0 4 4 8 4 12 0-2-6-8-8-12-6-4-2-10 0-12 6z" fill="#9ff0d4" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>${FACE(40, 44, 0.75)}<circle cx="30" cy="56" r="1.4" fill="#fff"/><circle cx="50" cy="56" r="1.4" fill="#fff"/><circle cx="40" cy="62" r="1.4" fill="#fff"/>` },
  sparkle: { label: "Sparkle", svg: `<path d="M40 8c3 18 8 23 26 26-18 3-23 8-26 26-3-18-8-23-26-26 18-3 23-8 26-26z" fill="#a8d8ff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M64 54c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill="#ffe29a"/>` },
};
const stickerSVG = (k) => `<svg viewBox="0 0 80 80" aria-hidden="true">${STICKERS[k].svg}</svg>`;

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch { return null; }
}
function save(state) {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
}

export function initWhiteboard() {
  const board = document.querySelector(".board");
  if (!board) return;
  const tray = document.querySelector(".sticker-tray");
  const tidy = document.querySelector("[data-board-tidy]");
  const narrow = () => board.clientWidth < 640;
  let z = 10;
  let state = load() || { notes: {}, stickers: [] };

  // --- notes ---
  board.insertAdjacentHTML("beforeend", PROJECTS.map((p) => `
    <article class="note note--${p.color} note--${p.pattern}" data-id="${p.id}" tabindex="0"
      aria-label="${p.name}. Drag to move, or use arrow keys.">
      <span class="note-tape" aria-hidden="true"></span>
      <h3 class="note-title">${p.name}</h3>
      <p class="note-desc">${p.desc}</p>
      <a class="note-link" href="${p.url}" target="_blank" rel="noopener noreferrer">Visit <span aria-hidden="true">↗</span></a>
    </article>`).join(""));
  const notes = [...board.querySelectorAll(".note")];

  function place(el, fx, fy, rot) {
    const maxX = board.clientWidth - el.offsetWidth;
    const maxY = board.clientHeight - el.offsetHeight;
    const x = Math.max(0, Math.min(maxX, fx * board.clientWidth));
    const y = Math.max(0, Math.min(maxY, fy * board.clientHeight));
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
    if (rot !== undefined) el.style.setProperty("--r", `${rot}deg`);
    el.dataset.fx = x / board.clientWidth;
    el.dataset.fy = y / board.clientHeight;
  }
  // Default scatter: a loose grid that fits the board's width, so notes never cover each other.
  const ROT = { dental: -4, robotics: 3, cookies: -2, github: 5 };
  function defaultSpots() {
    const W = board.clientWidth, H = board.clientHeight - (narrow() ? 96 : 0);
    const nw = notes[0].offsetWidth, nh = Math.max(...notes.map((n) => n.offsetHeight));
    let cols = Math.max(1, Math.min(notes.length, Math.floor((W - 16) / (nw + 14))));
    if (cols === 3 || narrow()) cols = 2;
    const rows = Math.ceil(notes.length / cols);
    const cw = W / cols, ch = H / rows;
    const lift = [0.25, 0.6, 0.1, 0.7];
    return notes.map((n, k) => {
      const c = k % cols, r = Math.floor(k / cols);
      const freeX = Math.max(0, cw - nw), freeY = Math.max(0, ch - nh);
      const pad = 10;
      const x = Math.max(pad, Math.min(W - nw - pad, c * cw + freeX * (rows > 1 ? (c % 2 ? 0.7 : 0.3) : 0.5)));
      const y = r * ch + Math.min(freeY * lift[k % 4], 48 + (rows > 1 ? 0 : 60));
      return [x / board.clientWidth, y / board.clientHeight, ROT[n.dataset.id] ?? 0];
    });
  }
  function layout(reset) {
    const spots = defaultSpots();
    notes.forEach((n, k) => {
      const saved = !reset && state.notes[n.dataset.id];
      const [fx, fy, r] = saved || spots[k];
      place(n, fx, fy, saved ? saved[2] : r);
    });
  }

  // --- stickers ---
  function addSticker(kind, host, fx, fy, rot = (Math.random() - 0.5) * 30, record = true) {
    const s = document.createElement("div");
    s.className = "sticker";
    s.dataset.kind = kind;
    s.innerHTML = stickerSVG(kind);
    s.style.setProperty("--r", `${rot}deg`);
    host.appendChild(s);
    const w = host.clientWidth, h = host.clientHeight;
    s.style.setProperty("--x", `${fx * w}px`);
    s.style.setProperty("--y", `${fy * h}px`);
    s.dataset.fx = fx; s.dataset.fy = fy; s.dataset.rot = rot;
    if (!reduceMotion.matches) {
      s.firstElementChild.animate([{ transform: "scale(0.5)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
        { duration: 260, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" });
    }
    if (record) persist();
    return s;
  }
  function persist() {
    state.notes = {};
    notes.forEach((n) => {
      state.notes[n.dataset.id] = [+n.dataset.fx, +n.dataset.fy, parseFloat(n.style.getPropertyValue("--r")) || 0];
    });
    state.stickers = [...board.querySelectorAll(".sticker")].map((s) => ({
      kind: s.dataset.kind, on: s.parentElement.classList.contains("note") ? s.parentElement.dataset.id : null,
      fx: +s.dataset.fx, fy: +s.dataset.fy, rot: +s.dataset.rot,
    }));
    save(state);
  }

  tray.innerHTML = Object.entries(STICKERS).map(([k, v]) => `
    <button type="button" class="tray-sticker" data-kind="${k}" aria-label="Add ${v.label} sticker">${stickerSVG(k)}</button>`).join("");

  // --- dragging (notes, placed stickers, and stickers pulled from the tray) ---
  let drag = null;
  const boardRect = () => board.getBoundingClientRect();

  function startDrag(e, el, kind) {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    drag = { el, kind, id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    el.classList.add("is-dragging");
    el.style.zIndex = ++z;
    el.setPointerCapture(e.pointerId);
  }

  board.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest(".note-link")) return;
    const sticker = e.target.closest(".sticker");
    if (sticker) {
      // lift the sticker onto the board layer so it can travel between notes
      const br = boardRect(), r = sticker.getBoundingClientRect();
      board.appendChild(sticker);
      sticker.style.setProperty("--x", `${r.left - br.left}px`);
      sticker.style.setProperty("--y", `${r.top - br.top}px`);
      return startDrag(e, sticker, "sticker");
    }
    const note = e.target.closest(".note");
    if (note) startDrag(e, note, "note");
  });

  tray.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".tray-sticker");
    if (!b || (e.button !== undefined && e.button !== 0)) return;
    const br = boardRect(), r = b.getBoundingClientRect();
    const s = addSticker(b.dataset.kind, board, 0, 0, (Math.random() - 0.5) * 30, false);
    s.style.setProperty("--x", `${r.left - br.left}px`);
    s.style.setProperty("--y", `${r.top - br.top}px`);
    drag = null;
    startDrag(e, s, "sticker");
    drag.fromTray = b;
  });
  // keyboard / tap without drag: drop the sticker somewhere on the board
  tray.addEventListener("click", (e) => {
    const b = e.target.closest(".tray-sticker");
    if (!b || e.detail > 0) return; // pointer clicks are handled by the drag
    addSticker(b.dataset.kind, board, 0.1 + Math.random() * 0.75, 0.55 + Math.random() * 0.3);
  });

  window.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const br = boardRect();
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 3) drag.moved = true;
    const x = e.clientX - br.left - drag.dx;
    const y = e.clientY - br.top - drag.dy;
    drag.el.style.setProperty("--x", `${x}px`);
    drag.el.style.setProperty("--y", `${y}px`);
    if (drag.kind === "sticker") {
      const t = tray.getBoundingClientRect();
      tray.classList.toggle("is-drop-target", e.clientY > t.top && e.clientY < t.bottom && e.clientX > t.left && e.clientX < t.right);
    }
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { el, kind } = drag;
    el.classList.remove("is-dragging");
    const br = boardRect();
    if (kind === "note") {
      const x = parseFloat(el.style.getPropertyValue("--x")), y = parseFloat(el.style.getPropertyValue("--y"));
      const r = (Math.random() - 0.5) * 8;
      place(el, x / board.clientWidth, y / board.clientHeight, drag.moved ? r : parseFloat(el.style.getPropertyValue("--r")));
    } else {
      // dropped on the tray: remove; tapped from tray without moving: drop it nearby
      if (tray.classList.contains("is-drop-target")) {
        tray.classList.remove("is-drop-target");
        el.remove();
      } else if (drag.fromTray && !drag.moved) {
        el.remove();
        addSticker(drag.fromTray.dataset.kind, board, 0.1 + Math.random() * 0.75, 0.55 + Math.random() * 0.3);
      } else {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const host = notes.filter((n) => {
          const nr = n.getBoundingClientRect();
          return cx > nr.left && cx < nr.right && cy > nr.top && cy < nr.bottom;
        }).sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0];
        if (host) {
          const hr = host.getBoundingClientRect();
          host.appendChild(el);
          const fx = (r.left - hr.left) / host.clientWidth, fy = (r.top - hr.top) / host.clientHeight;
          el.style.setProperty("--x", `${fx * host.clientWidth}px`);
          el.style.setProperty("--y", `${fy * host.clientHeight}px`);
          el.dataset.fx = fx; el.dataset.fy = fy;
          el.classList.add("is-stuck");
          if (!reduceMotion.matches) el.firstElementChild.animate([{ transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 220, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" });
        } else {
          const x = parseFloat(el.style.getPropertyValue("--x")), y = parseFloat(el.style.getPropertyValue("--y"));
          const cx2 = Math.max(0, Math.min(board.clientWidth - r.width, x)), cy2 = Math.max(0, Math.min(board.clientHeight - r.height, y));
          el.style.setProperty("--x", `${cx2}px`); el.style.setProperty("--y", `${cy2}px`);
          el.dataset.fx = cx2 / board.clientWidth; el.dataset.fy = cy2 / board.clientHeight;
          el.classList.remove("is-stuck");
        }
      }
    }
    drag = null;
    persist();
  }
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // keyboard: arrow keys move a focused note
  board.addEventListener("keydown", (e) => {
    const n = e.target.closest(".note");
    if (!n || e.target !== n) return;
    const step = e.shiftKey ? 40 : 12;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const x = parseFloat(n.style.getPropertyValue("--x")) + d[0];
    const y = parseFloat(n.style.getPropertyValue("--y")) + d[1];
    n.style.zIndex = ++z;
    place(n, x / board.clientWidth, y / board.clientHeight);
    persist();
  });

  tidy?.addEventListener("click", () => {
    board.querySelectorAll(".sticker").forEach((s) => s.remove());
    state = { notes: {}, stickers: [] };
    layout(true);
    persist();
  });

  // restore
  layout(false);
  for (const s of state.stickers || []) {
    const host = s.on ? notes.find((n) => n.dataset.id === s.on) : board;
    if (host && STICKERS[s.kind]) {
      const el = addSticker(s.kind, host, s.fx, s.fy, s.rot, false);
      if (s.on) el.classList.add("is-stuck");
    }
  }
  if (!state.stickers?.length && !load()) {
    // a couple of starter stickers so visitors see what's possible
    const dental = notes[0], github = notes[3];
    addSticker("star", dental, 0.78, -0.12, 14, false).classList.add("is-stuck");
    addSticker("planet", github, 0.78, 0.74, -10, false).classList.add("is-stuck");
  }
  let lastNarrow = narrow();
  window.addEventListener("resize", () => {
    const now = narrow();
    if (now !== lastNarrow) { lastNarrow = now; layout(!load()); }
    else notes.forEach((n) => place(n, +n.dataset.fx, +n.dataset.fy));
  });
}
