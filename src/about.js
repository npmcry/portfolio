// About Me: a constellation. Each star is a fact; tapping one lights it and
// draws the line from the last star. Light them all to finish the constellation.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

// x/y in % of the map. Edit the text freely: these are the facts visitors discover.
const STARS = [
  { x: 14, y: 30, title: "Doctor of Clinical Psychology", text: "PsyD student at the University of the Pacific." },
  { x: 33, y: 14, title: "Psychology roots", text: "B.A. in Psychology from UNLV." },
  { x: 52, y: 34, title: "Writes code", text: "Builds websites and tools, like Paradise Dental and LV Robotics." },
  { x: 72, y: 18, title: "Games, studied seriously", text: "Dissertation research on video games and the mind." },
  { x: 86, y: 52, title: "Clinical work", text: "Sees clients as part of clinical training." },
  { x: 60, y: 76, title: "Bilingual", text: "Speaks English and Vietnamese." },
];

export function initAbout() {
  const root = document.getElementById("about");
  const map = root?.querySelector(".const-map");
  if (!map) return;
  const lines = map.querySelector(".const-lines");
  const caption = root.querySelector(".const-caption");
  const count = root.querySelector(".const-count");
  const reset = root.querySelector(".const-reset");
  const lit = [];

  map.insertAdjacentHTML("beforeend", STARS.map((s, i) => `
    <button type="button" class="const-star" data-i="${i}" style="left:${s.x}%;top:${s.y}%"
      aria-label="Star ${i + 1}: ${s.title}" aria-pressed="false">
      <span class="const-core" aria-hidden="true"></span>
      <span class="const-tag" aria-hidden="true">${s.title}</span>
    </button>`).join(""));
  const stars = [...map.querySelectorAll(".const-star")];

  function show(i) {
    const s = STARS[i];
    caption.innerHTML = `<strong>${s.title}</strong><span>${s.text}</span>`;
    if (!reduceMotion.matches) {
      caption.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: EASE });
    }
  }

  // Lines are drawn in real pixels so they stay crisp and solid at any size.
  const segs = [];
  function sizeLines() {
    const w = map.clientWidth, h = map.clientHeight;
    lines.setAttribute("viewBox", `0 0 ${w} ${h}`);
    [...lines.children].forEach((l, k) => {
      const [a, b] = segs[k];
      l.setAttribute("x1", (STARS[a].x / 100) * w); l.setAttribute("y1", (STARS[a].y / 100) * h);
      l.setAttribute("x2", (STARS[b].x / 100) * w); l.setAttribute("y2", (STARS[b].y / 100) * h);
    });
  }
  function drawLine(a, b) {
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lines.appendChild(l);
    segs.push([a, b]);
    sizeLines();
    if (!reduceMotion.matches) {
      const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value);
      l.style.strokeDasharray = len;
      l.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 520, easing: EASE })
        .finished.then(() => { l.style.strokeDasharray = "none"; });
    }
  }
  window.addEventListener("resize", sizeLines);

  function light(i) {
    show(i);
    if (lit.includes(i)) return;
    stars[i].classList.add("is-lit");
    stars[i].setAttribute("aria-pressed", "true");
    if (lit.length) drawLine(lit.at(-1), i);
    lit.push(i);
    count.textContent = `${lit.length} of ${STARS.length} stars`;
    if (lit.length === STARS.length) {
      setTimeout(() => {
        drawLine(i, lit[0]);
        map.classList.add("is-complete");
        caption.innerHTML = `<strong>Constellation complete</strong><span>That's me: part clinician, part coder, all curious.</span>`;
        reset.hidden = false;
      }, reduceMotion.matches ? 0 : 420);
    }
  }

  stars.forEach((b, i) => {
    b.addEventListener("click", () => light(i));
    b.addEventListener("mouseenter", () => { if (lit.includes(i)) show(i); });
  });
  reset.addEventListener("click", () => {
    lit.length = 0;
    segs.length = 0;
    lines.replaceChildren();
    stars.forEach((b) => { b.classList.remove("is-lit"); b.setAttribute("aria-pressed", "false"); });
    map.classList.remove("is-complete");
    count.textContent = `0 of ${STARS.length} stars`;
    caption.innerHTML = `<span>Tap a star to start.</span>`;
    reset.hidden = true;
  });
}
