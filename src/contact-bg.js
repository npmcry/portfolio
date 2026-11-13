// Contact background: soft gel blobs with paper planes, envelopes, hearts and bubbles drifting through.
const heart = (c) => `<svg viewBox="-20 -22 40 34"><path d="M0 8C-18-6-8-20 0-8 8-20 18-6 0 8Z" fill="${c}"/></svg>`;
const envelope = (c) => `<svg viewBox="-34 -24 68 48"><rect x="-30" y="-20" width="60" height="40" rx="6" fill="${c}"/><path d="M-30-18 0 6l30-24" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity=".9"/><path d="M0 12c-5-8-14-2 0 9 14-11 5-17 0-9Z" fill="#ff7fa5"/></svg>`;
const plane = (c) => `<svg viewBox="-38 -28 78 62"><path d="M-34-4 36-24 6 30-2 6Z" fill="${c}"/><path d="M-2 6 36-24-10 20Z" fill="#fff" opacity=".55"/></svg>`;
const spark = () => `<svg viewBox="-10 -10 20 20"><path d="M0-10Q1.5-1.5 10 0 1.5 1.5 0 10-1.5 1.5-10 0-1.5-1.5 0-10Z" fill="#ffe29a"/></svg>`;

// kind, left %, top %, size px, tilt deg, colour, drift seconds
const ITEMS = [
  ["plane", 52, 44, 76, -12, "#c9b6ff", 15], ["plane", 90, 14, 56, -30, "#9ff0d4", 19], ["plane", 18, 18, 44, 8, "#a8d8ff", 22],
  ["envelope", 9, 76, 76, -10, "#ffcad6", 17], ["envelope", 82, 84, 62, 12, "#fff1c2", 21], ["envelope", 38, 12, 46, 6, "#c9f7e6", 24], ["envelope", 68, 70, 38, -8, "#e3d9ff", 18],
  ["heart", 29, 46, 30, 0, "#ff9fb0", 13], ["heart", 63, 20, 22, 0, "#ffcad6", 16], ["heart", 88, 54, 28, 0, "#ff9fb0", 14], ["heart", 6, 38, 20, 0, "#ffcad6", 20], ["heart", 48, 88, 24, 0, "#ffb39a", 15],
  ["spark", 44, 32, 14, 0, "", 5], ["spark", 73, 12, 16, 0, "", 6], ["spark", 16, 62, 12, 0, "", 7], ["spark", 94, 78, 14, 0, "", 5.5],
];
const DRAW = { plane, envelope, heart, spark };

export function initContactBg() {
  const host = document.querySelector(".contact-bg");
  if (!host) return;
  const narrow = window.innerWidth < 700;
  const blobs = ["#b9a5ff", "#ff9fd0", "#9ff0d4", "#a8d8ff", "#ffe29a"].map((c, i) => `<span class="gel g${i + 1}" style="--c:${c}"></span>`).join("");
  const mail = ITEMS.filter((_, i) => !narrow || i % 2 === 0).map(([kind, x, y, size, tilt, c, dur], i) =>
    `<span class="mail-item m-${kind}" style="left:${x}%;top:${y}%;width:${narrow ? size * 0.7 : size}px;--tilt:${tilt}deg;--dur:${dur}s;--delay:${-(i * 1.7).toFixed(1)}s">${DRAW[kind](c)}</span>`).join("");
  const bubbles = Array.from({ length: narrow ? 7 : 12 }, (_, i) => {
    const s = 8 + ((i * 37) % 22);
    return `<span class="gel-bubble" style="left:${(i * 53 + 7) % 96}%;width:${s}px;height:${s}px;--dur:${11 + (i % 5) * 3}s;--delay:${-(i * 2.3).toFixed(1)}s"></span>`;
  }).join("");
  host.innerHTML = `<div class="gel-layer">${blobs}</div><div class="mail-layer">${bubbles}${mail}</div>`;

  // only animate while the section is on screen
  new IntersectionObserver(([e]) => host.classList.toggle("is-live", e.isIntersecting), { rootMargin: "100px" }).observe(host);

  // the mail drifts a little away from the pointer, so the scene feels alive
  const layer = host.querySelector(".mail-layer");
  const section = host.closest("section");
  section?.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = section.getBoundingClientRect();
    layer.style.setProperty("--px", `${(((e.clientX - r.left) / r.width - 0.5) * -22).toFixed(1)}px`);
    layer.style.setProperty("--py", `${(((e.clientY - r.top) / r.height - 0.5) * -16).toFixed(1)}px`);
  }, { passive: true });
}

// A paper plane takes off from the Send button when a message goes out.
export function flyPlane(fromEl) {
  if (!fromEl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = fromEl.getBoundingClientRect();
  const p = document.createElement("span");
  p.className = "sent-plane";
  p.innerHTML = plane("#c9b6ff");
  p.style.left = `${r.left + r.width / 2}px`;
  p.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(p);
  p.addEventListener("animationend", () => p.remove());
}
