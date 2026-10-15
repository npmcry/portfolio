// Lotl the axolotl: a plush buddy that talks you through a few coping skills in its speech bubble.
import { createBuddy, createFallbackBuddy } from "./lotl-buddy.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

const HELLO = "Hi, I'm Lotl! Pick something below, or press and hold me for a squeeze.";
const POKES = [
  "Hehe, that tickles!",
  "Squish! I'm extra soft today.",
  "Fun fact: axolotls can regrow limbs, and even parts of their heart.",
  "I'm a plush, so you can't hurt me. Poke away!",
  "Hold me down for a big squeeze.",
];
const KIND = [
  "This is a hard moment, and it makes sense that it feels hard.",
  "You don't have to earn rest.",
  "Mistakes are how everyone learns, including you.",
  "Axolotls regrow what they lose. You can heal and grow too.",
  "Talk to yourself the way you'd talk to a good friend.",
  "You're doing better than you think.",
  "Small steps still count as steps.",
];
const GROUND = [
  "Look around. Find 5 things you can see.",
  "Now 4 things you can touch. Notice how they feel.",
  "3 things you can hear, near or far.",
  "2 things you can smell.",
  "And 1 thing you can taste.",
];
const SQUEEZE_MS = 5000;

export function initLotl() {
  const root = document.getElementById("lotl");
  if (!root) return;
  const stage = root.querySelector(".lotl-stage");
  const canvasHost = root.querySelector(".lotl-canvas");
  const fallbackSvg = root.querySelector(".lotl-fallback");
  const bubble = root.querySelector(".lotl-bubble");
  const actions = root.querySelector(".lotl-actions");

  let buddy = createBuddy(canvasHost);
  if (!buddy) {
    stage.classList.add("no-3d");
    buddy = createFallbackBuddy(fallbackSvg);
  }

  // ---------- speech: everything Lotl says lives in its bubble ----------
  let line = HELLO;       // what the bubble settles back to
  let flashTimer = 0;
  function show(text) {
    if (bubble.textContent === text) return;
    bubble.textContent = text;
    if (!reduceMotion.matches) bubble.animate([{ opacity: 0.4, transform: "translate(-50%, 4px) scale(0.98)" }, { opacity: 1, transform: "translate(-50%, 0) scale(1)" }], { duration: 220, easing: EASE });
  }
  function say(text) { clearTimeout(flashTimer); line = text; show(text); }
  function flash(text, ms = 2600) {
    clearTimeout(flashTimer);
    show(text);
    flashTimer = setTimeout(() => show(line), ms);
  }
  bubble.textContent = HELLO;
  bubble.classList.add("is-on");

  // ---------- the three activities ----------
  const buttons = [...actions.querySelectorAll("[data-act]")];
  const LABELS = Object.fromEntries(buttons.map((b) => [b.dataset.act, b.textContent.trim()]));
  let current = null;   // "breathe" | "ground" | null
  let stopCurrent = () => {};

  function setActive(name, label) {
    buttons.forEach((b) => {
      const on = b.dataset.act === name;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on && label ? label : LABELS[b.dataset.act];
    });
  }
  function finish(text) {
    stopCurrent();
    stopCurrent = () => {};
    current = null;
    setActive(null);
    buddy.mood("rest");
    if (text) say(text);
  }

  function startBreathing() {
    current = "breathe";
    setActive("breathe", "Stop");
    buddy.mood("breathe");
    const BREATHS = 4, IN = 4, OUT = 6;
    let n = 0, phase = "in", left = IN, timer = 0;
    const step = () => {
      say(`${phase === "in" ? "Breathe in" : "And slowly out"}… ${left}`);
      left--;
      if (left < 0) {
        if (phase === "in") { phase = "out"; left = OUT; buddy.breathe(0, OUT); }
        else {
          n++;
          if (n >= BREATHS) { finish("Four slow breaths. Longer exhales help your body settle."); buddy.sparkle(); return; }
          phase = "in"; left = IN; buddy.breathe(1, IN);
        }
      }
    };
    buddy.breathe(1, IN);
    step();
    timer = setInterval(step, 1000);
    stopCurrent = () => { clearInterval(timer); buddy.breathe(0, 1); };
  }

  let groundStep = 0;
  function startGrounding() {
    current = "ground";
    groundStep = 0;
    setActive("ground", "Next");
    buddy.mood("ground");
    say(GROUND[0]);
  }
  function nextGround() {
    groundStep++;
    buddy.look(Math.random() < 0.5 ? -0.9 : 0.9, Math.random() * 0.6 - 0.2);
    setTimeout(() => buddy.look(0, 0), 900);
    if (groundStep >= GROUND.length) { finish("You're here, right now. Nicely done."); buddy.sparkle(); return; }
    if (groundStep === GROUND.length - 1) setActive("ground", "Done");
    say(GROUND[groundStep]);
  }

  let kindI = Math.floor(Math.random() * KIND.length);
  function kindWord() {
    if (current) finish();
    kindI = (kindI + 1) % KIND.length;
    buddy.mood("kind");
    buddy.sparkle();
    say(`“${KIND[kindI]}”`);
  }

  actions.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "kind") return kindWord();
    if (act === current) {
      if (act === "breathe") finish("Paused. We can breathe again anytime.");
      else nextGround();
      return;
    }
    if (current) finish();
    if (act === "breathe") startBreathing();
    else startGrounding();
  });

  // ---------- squeeze: press and hold Lotl ----------
  let squeezeTimer = 0, squeezeT = 0;
  function squeezeStart() {
    if (current === "breathe") finish();
    squeezeT = performance.now();
    buddy.press(true);
    buddy.relax(false);
    const tick = () => {
      const left = Math.ceil((SQUEEZE_MS - (performance.now() - squeezeT)) / 1000);
      show(left > 0 ? `Squeeze me and clench your fists… ${left}` : "Now let go!");
    };
    clearInterval(squeezeTimer);
    tick();
    squeezeTimer = setInterval(tick, 200);
  }
  function squeezeEnd() {
    clearInterval(squeezeTimer);
    buddy.press(false);
    const held = performance.now() - squeezeT;
    if (held >= SQUEEZE_MS - 400) {
      buddy.relax(true);
      setTimeout(() => buddy.relax(false), 2500);
      flash("Feel the difference? That's your muscles letting go.", 4200);
    } else {
      flash("Ahh, good squeeze. Hold me for 5 seconds to really let go.", 3200);
    }
  }

  // ---------- direct play with the plush ----------
  let press = null;
  const rect = () => stage.getBoundingClientRect();
  const poke = () => {
    buddy.poke();
    if (current) return;
    if (line !== HELLO && !line.startsWith("“")) line = HELLO;
    flash(POKES[Math.floor(Math.random() * POKES.length)]);
  };
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, mode: "tap", holdTimer: 0 };
    press.holdTimer = setTimeout(() => {
      if (press && press.mode === "tap") { press.mode = "hold"; squeezeStart(); }
    }, 220);
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    const r = rect();
    if (!press) {
      buddy.look(((e.clientX - r.left) / r.width - 0.5) * 2, -((e.clientY - r.top) / r.height - 0.45) * 2);
      return;
    }
    if (e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    if (press.mode === "tap" && Math.abs(dx) > 8) { press.mode = "spin"; clearTimeout(press.holdTimer); }
    if (press.mode === "spin") { buddy.spinBy(dx); press.x = e.clientX; }
  });
  function endPress(e) {
    if (!press || e.pointerId !== press.id) return;
    clearTimeout(press.holdTimer);
    if (press.mode === "tap") poke();
    else if (press.mode === "hold") squeezeEnd();
    else buddy.spinEnd();
    press = null;
  }
  stage.addEventListener("pointerup", endPress);
  stage.addEventListener("pointercancel", endPress);
  stage.addEventListener("pointerleave", () => { if (!press) buddy.look(0, 0); });

  // keyboard: Enter pets, holding Space squeezes
  let keyHold = false;
  stage.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); poke(); }
    if (e.key === " " && !e.repeat) { e.preventDefault(); keyHold = true; squeezeStart(); }
  });
  stage.addEventListener("keyup", (e) => {
    if (e.key === " " && keyHold) { e.preventDefault(); keyHold = false; squeezeEnd(); }
  });

  return { say, buddy };
}
