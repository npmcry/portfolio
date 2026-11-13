// About me: a commit line that types my story, a slim timeline to jump through it,
// and a 3D keyboard that presses each key as the line is typed.
import { createKeyboard } from "./about-keyboard.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const STEPS = [
  { label: "B.A. Psychology", type: "init:", side: "psych", msg: "B.A. in Psychology at UNLV" },
  { label: "Cookies", type: "ship:", side: "code", msg: "Cookies, a web app that explains online tracking" },
  { label: "Pet MD", type: "ship:", side: "code", msg: "Pet MD, a mobile app for pet medications" },
  { label: "PsyD", type: "study:", side: "psych", msg: "Doctor of Clinical Psychology student, University of the Pacific" },
  { label: "Now", type: "now:", side: "code", msg: "studying minds, building for fun" },
];

export function initAbout() {
  const root = document.getElementById("about");
  if (!root) return;
  const typeEl = root.querySelector(".log-type");
  const msgEl = root.querySelector(".log-msg");
  const list = root.querySelector(".about-timeline");
  const kbHost = root.querySelector(".about-kb");
  const kb = kbHost ? createKeyboard(kbHost) : null;

  list.innerHTML = STEPS.map((s, i) => `
    <li class="tl-${s.side}"><button type="button" data-i="${i}" aria-label="${s.label}: ${s.type} ${s.msg}"><span class="tl-dot"></span><span class="tl-label">${s.label}</span></button></li>`).join("");
  const items = [...list.querySelectorAll("li")];

  let step = 0, timer = 0, visible = false, paused = false;
  const show = (i) => items.forEach((li, k) => li.classList.toggle("is-on", k === i));

  function type(i, instant) {
    clearTimeout(timer);
    step = i;
    show(i);
    const s = STEPS[i];
    typeEl.textContent = s.type;
    typeEl.className = `log-type ${s.side}`;
    if (instant || reduceMotion.matches) { msgEl.textContent = s.msg; schedule(); return; }
    let n = 0;
    msgEl.textContent = "";
    const tick = () => {
      if (n >= s.msg.length) { schedule(); return; }
      const ch = s.msg[n++];
      msgEl.textContent = s.msg.slice(0, n);
      kb?.press(ch);
      timer = setTimeout(tick, ch === " " ? 70 : 38 + Math.random() * 55);
    };
    tick();
  }
  function schedule() {
    clearTimeout(timer);
    if (!visible || paused) return;
    timer = setTimeout(() => type((step + 1) % STEPS.length), 2600);
  }

  list.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) type(+b.dataset.i);
  });
  list.addEventListener("pointerover", (e) => {
    const b = e.target.closest("button");
    if (b && e.pointerType !== "touch" && +b.dataset.i !== step) type(+b.dataset.i);
  });
  list.addEventListener("pointerenter", () => { paused = true; clearTimeout(timer); });
  list.addEventListener("pointerleave", () => { paused = false; schedule(); });

  new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    kb?.setActive(visible);
    if (visible && !was) type(step);
    if (!visible) clearTimeout(timer);
  }, { threshold: 0.2 }).observe(root);

  // first paint: show the opening step fully so nothing looks empty
  typeEl.textContent = STEPS[0].type;
  typeEl.className = `log-type ${STEPS[0].side}`;
  msgEl.textContent = STEPS[0].msg;
  show(0);
}
