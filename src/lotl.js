// Lotl the axolotl: a plush buddy that coaches everyday coping skills.
import { createBuddy, createFallbackBuddy } from "./lotl-buddy.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const STORE = "lotl-skills-v1";

const POKES = [
  "Hehe, that tickles!",
  "Hi, I'm Lotl! Pick a skill and let's practice together.",
  "Squish! I'm extra soft today.",
  "Fun fact: axolotls can regrow limbs, and even parts of their heart.",
  "Hold me down to try squeeze and release.",
  "I'm a plush, so you can't hurt me. Poke away!",
];

const SKILLS = [
  { id: "breathe", name: "Belly breathing", color: "var(--lavender)", mood: "breathe" },
  { id: "ground", name: "5-4-3-2-1 grounding", color: "var(--mint)", mood: "ground" },
  { id: "squeeze", name: "Squeeze & release", color: "var(--peach)", mood: "squeeze" },
  { id: "reframe", name: "Reframe a thought", color: "var(--sky)", mood: "reframe" },
  { id: "kind", name: "Kind words", color: "var(--butter)", mood: "kind" },
];

export function initLotl() {
  const root = document.getElementById("lotl");
  if (!root) return;
  const stage = root.querySelector(".lotl-stage");
  const canvasHost = root.querySelector(".lotl-canvas");
  const fallbackSvg = root.querySelector(".lotl-fallback");
  const bubble = root.querySelector(".lotl-bubble");
  const chips = root.querySelector(".lotl-skills");
  const panel = root.querySelector(".lotl-skill");
  const coach = root.querySelector(".lotl-coach");
  const progress = root.querySelector(".lotl-progress");

  let buddy = createBuddy(canvasHost);
  if (!buddy) {
    stage.classList.add("no-3d");
    buddy = createFallbackBuddy(fallbackSvg);
  }

  // ---------- speech ----------
  let sayTimer = 0;
  function say(text, ms = 3600) {
    bubble.textContent = text;
    bubble.classList.add("is-on");
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => bubble.classList.remove("is-on"), ms);
  }

  // ---------- progress ----------
  let done = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } })();
  function markDone(id) {
    if (done.includes(id)) return;
    done.push(id);
    try { localStorage.setItem(STORE, JSON.stringify(done)); } catch {}
    renderProgress();
    buddy.sparkle();
    if (done.length === SKILLS.length) say("You tried every skill. I'm so proud of you!", 5000);
  }
  function renderProgress() {
    progress.innerHTML = `<span>Skills practiced: ${done.length} of ${SKILLS.length}</span>
      <span class="lotl-dots" aria-hidden="true">${SKILLS.map((s) => `<i class="${done.includes(s.id) ? "is-done" : ""}" style="--c:${s.color}"></i>`).join("")}</span>`;
  }

  // ---------- direct play with the plush ----------
  let press = null;
  let holdHandlers = null; // set by the squeeze skill
  const rect = () => stage.getBoundingClientRect();
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), mode: "tap", holdTimer: 0 };
    press.holdTimer = setTimeout(() => {
      if (press && press.mode === "tap") { press.mode = "hold"; buddy.press(true); holdHandlers?.start(); }
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
    const held = performance.now() - press.t;
    if (press.mode === "tap") { buddy.poke(); say(POKES[Math.floor(Math.random() * POKES.length)]); }
    else if (press.mode === "hold") { buddy.press(false); holdHandlers ? holdHandlers.end(held) : say("Ahh, that was a good squeeze."); }
    else buddy.spinEnd();
    press = null;
  }
  stage.addEventListener("pointerup", endPress);
  stage.addEventListener("pointercancel", (e) => { if (press?.mode === "hold") buddy.press(false); if (press) buddy.spinEnd(); endPress(e); });
  stage.addEventListener("pointerleave", () => { if (!press) buddy.look(0, 0); });

  // keyboard: Enter pets, holding Space squeezes
  let keyHold = 0;
  stage.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); buddy.poke(); say(POKES[Math.floor(Math.random() * POKES.length)]); }
    if (e.key === " " && !e.repeat) { e.preventDefault(); keyHold = performance.now(); buddy.press(true); holdHandlers?.start(); }
  });
  stage.addEventListener("keyup", (e) => {
    if (e.key === " " && keyHold) {
      e.preventDefault();
      buddy.press(false);
      const held = performance.now() - keyHold;
      keyHold = 0;
      holdHandlers ? holdHandlers.end(held) : say("Ahh, that was a good squeeze.");
    }
  });

  // ---------- skills ----------
  let cleanup = () => {};
  chips.innerHTML = SKILLS.map((s, i) => `<button type="button" class="wb-chip" data-i="${i}" style="--c:${s.color}" aria-pressed="false">${s.name}</button>`).join("");
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".wb-chip");
    if (b) select(+b.dataset.i, true);
  });

  function select(i, animate) {
    cleanup();
    cleanup = () => {};
    holdHandlers = null;
    buddy.relax(false);
    buddy.breathe(0, 0.6);
    const s = SKILLS[i];
    [...chips.children].forEach((c, j) => c.setAttribute("aria-pressed", j === i ? "true" : "false"));
    coach.style.setProperty("--c", s.color);
    buddy.mood(s.mood);
    RENDER[s.id](panel);
    if (animate && !reduceMotion.matches) {
      panel.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: EASE });
    }
  }

  const RENDER = {
    breathe(box) {
      box.innerHTML = `
        <h3>Belly breathing</h3>
        <p>Slow breaths with a longer exhale tell your body it's safe. Breathe in for 4, out for 6, with Lotl.</p>
        <p class="skill-big" aria-live="polite">Ready when you are</p>
        <div class="act-meter" style="--p:0"><span></span></div>
        <p class="skill-sub">4 breaths · about 40 seconds</p>
        <button type="button" class="act-btn">Start breathing</button>`;
      const big = box.querySelector(".skill-big"), meter = box.querySelector(".act-meter"), btn = box.querySelector(".act-btn"), sub = box.querySelector(".skill-sub");
      let timers = [], running = false;
      const stopAll = () => { timers.forEach(clearTimeout); timers = []; running = false; buddy.breathe(0, 1); btn.textContent = "Start breathing"; };
      cleanup = stopAll;
      btn.addEventListener("click", () => {
        if (running) { stopAll(); big.textContent = "Paused"; return; }
        running = true;
        btn.textContent = "Stop";
        const rounds = 4;
        let at = 0;
        for (let r = 0; r < rounds; r++) {
          timers.push(setTimeout(() => { big.textContent = "Breathe in…"; sub.textContent = `Breath ${r + 1} of ${rounds}`; buddy.breathe(1, 4); if (r === 0) say("Breathe in with me… and slowly out."); }, at));
          at += 4000;
          timers.push(setTimeout(() => { big.textContent = "And out…"; buddy.breathe(0, 6); meter.style.setProperty("--p", (r + 1) / rounds); }, at));
          at += 6000;
        }
        timers.push(setTimeout(() => {
          running = false;
          big.textContent = "Nice and slow.";
          sub.textContent = "Notice how your body feels now.";
          btn.textContent = "Again";
          say("Four calm breaths. Longer exhales help your body settle.");
          markDone("breathe");
        }, at));
      });
    },

    ground(box) {
      const steps = [
        [5, "things you can see"], [4, "things you can touch"], [3, "things you can hear"], [2, "things you can smell"], [1, "thing you can taste"],
      ];
      let s = 0;
      box.innerHTML = `
        <h3>5-4-3-2-1 grounding</h3>
        <p>When your mind is racing, your senses bring you back to right now. Notice each one, then tap a dot.</p>
        <p class="skill-big" aria-live="polite"></p>
        <div class="ground-dots" role="group"></div>`;
      const big = box.querySelector(".skill-big"), dots = box.querySelector(".ground-dots");
      const render = () => {
        const [n, what] = steps[s];
        big.textContent = `Name ${n} ${what}`;
        dots.setAttribute("aria-label", `${n} ${what}`);
        dots.innerHTML = Array.from({ length: n }, (_, k) => `<button type="button" class="ground-dot" aria-pressed="false" aria-label="Noticed ${k + 1}"></button>`).join("");
      };
      dots.addEventListener("click", (e) => {
        const d = e.target.closest(".ground-dot");
        if (!d || d.getAttribute("aria-pressed") === "true") return;
        d.setAttribute("aria-pressed", "true");
        buddy.look(Math.random() < 0.5 ? -0.9 : 0.9, Math.random() * 0.6 - 0.2);
        setTimeout(() => buddy.look(0, 0), 900);
        if ([...dots.children].every((x) => x.getAttribute("aria-pressed") === "true")) {
          s++;
          if (s < steps.length) setTimeout(render, 380);
          else {
            big.textContent = "You're here, right now.";
            dots.innerHTML = `<button type="button" class="act-btn">Do it again</button>`;
            dots.querySelector(".act-btn").addEventListener("click", () => { s = 0; render(); });
            say("Back in the present moment. Nicely done.");
            markDone("ground");
          }
        }
      });
      render();
      say("Let's look around together. What do you notice?");
    },

    squeeze(box) {
      let rounds = 0, raf = 0, startT = 0;
      const GOAL = 5000, ROUNDS = 3;
      box.innerHTML = `
        <h3>Squeeze & release</h3>
        <p>Muscle tension and release: squeeze Lotl (press and hold it) while you clench your fists for about 5 seconds. Then let go and notice the difference.</p>
        <p class="skill-big" aria-live="polite">Round 1 of ${ROUNDS}</p>
        <div class="act-meter" style="--p:0"><span></span></div>
        <button type="button" class="act-btn hold-btn">Hold to squeeze</button>
        <p class="skill-sub">Or press and hold Lotl, or hold Space with Lotl focused.</p>`;
      const big = box.querySelector(".skill-big"), meter = box.querySelector(".act-meter"), btn = box.querySelector(".hold-btn");
      const tick = () => {
        const p = Math.min(1, (performance.now() - startT) / GOAL);
        meter.style.setProperty("--p", p);
        big.textContent = p < 1 ? `Squeeze… ${Math.ceil((GOAL - (performance.now() - startT)) / 1000)}` : "Now let go";
        raf = requestAnimationFrame(tick);
      };
      holdHandlers = {
        start() { startT = performance.now(); buddy.relax(false); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); },
        end(held) {
          cancelAnimationFrame(raf);
          if (held >= GOAL - 400) {
            rounds++;
            buddy.relax(true);
            setTimeout(() => buddy.relax(false), 2500);
            meter.style.setProperty("--p", 0);
            if (rounds >= ROUNDS) {
              big.textContent = "All loose and floppy.";
              say("Your muscles just practiced letting go. Try it with your shoulders and jaw too.", 5000);
              markDone("squeeze");
              rounds = 0;
            } else {
              big.textContent = `Round ${rounds + 1} of ${ROUNDS}`;
              say("Feel the warmth as your hands let go.");
            }
          } else {
            meter.style.setProperty("--p", 0);
            big.textContent = `Round ${rounds + 1} of ${ROUNDS}`;
            say("A little longer next time. Aim for about 5 seconds.");
          }
        },
      };
      const down = (e) => {
        e.preventDefault();
        if (e.pointerId !== undefined) btn.setPointerCapture(e.pointerId);
        btn.dataset.t = performance.now(); buddy.press(true); holdHandlers.start();
      };
      const up = () => { if (!btn.dataset.t) return; const held = performance.now() - +btn.dataset.t; btn.dataset.t = ""; buddy.press(false); holdHandlers.end(held); };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) down(e); });
      btn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") up(); });
      cleanup = () => cancelAnimationFrame(raf);
    },

    reframe(box) {
      const thoughts = [
        { t: "I always mess everything up.", trap: "Overgeneralizing", re: "I messed this one thing up. I've also gotten plenty of things right.", q: "What's one thing that went okay this week?" },
        { t: "Everyone thinks I'm weird.", trap: "Mind reading", re: "I can't know what everyone thinks. Most people are busy thinking about themselves.", q: "What evidence do I actually have?" },
        { t: "This is going to be a disaster.", trap: "Catastrophizing", re: "This might be hard, but I've gotten through hard things before.", q: "What's the most likely outcome, not the worst one?" },
        { t: "If it isn't perfect, it's a failure.", trap: "All-or-nothing thinking", re: "Good enough is still good. Progress counts.", q: "What would I tell a friend who did this?" },
      ];
      box.innerHTML = `
        <h3>Reframe a thought</h3>
        <p>Thoughts aren't facts. Pick one that sounds familiar and Lotl will help you look at it differently.</p>
        <div class="thought-list">${thoughts.map((x, i) => `<button type="button" class="thought" data-i="${i}" aria-pressed="false">“${x.t}”</button>`).join("")}</div>
        <div class="reframe-out" aria-live="polite"></div>`;
      const out = box.querySelector(".reframe-out");
      box.querySelector(".thought-list").addEventListener("click", (e) => {
        const b = e.target.closest(".thought");
        if (!b) return;
        box.querySelectorAll(".thought").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
        const x = thoughts[+b.dataset.i];
        out.innerHTML = `<p class="trap">Thinking trap: <strong>${x.trap}</strong></p><p class="skill-big">“${x.re}”</p><p class="skill-sub">Ask yourself: ${x.q}</p>`;
        if (!reduceMotion.matches) out.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: EASE });
        buddy.nod();
        say("Let's look at that thought together.");
        markDone("reframe");
      });
    },

    kind(box) {
      const words = [
        "This is a hard moment, and it makes sense that it feels hard.",
        "You don't have to earn rest.",
        "Mistakes are how everyone learns, including you.",
        "Axolotls regrow what they lose. You can heal and grow too.",
        "Talk to yourself the way you'd talk to a good friend.",
        "You're doing better than you think.",
      ];
      let i = Math.floor(Math.random() * words.length);
      box.innerHTML = `
        <h3>Kind words</h3>
        <p>Self-compassion means treating yourself with the same warmth you'd give someone you care about.</p>
        <p class="skill-big kind-line" aria-live="polite">Tap below for a kind word.</p>
        <button type="button" class="act-btn">Ask Lotl for a kind word</button>`;
      const line = box.querySelector(".kind-line");
      box.querySelector(".act-btn").addEventListener("click", () => {
        i = (i + 1) % words.length;
        line.textContent = `“${words[i]}”`;
        if (!reduceMotion.matches) line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        buddy.sparkle();
        say("I mean it!", 1800);
        markDone("kind");
      });
    },
  };

  renderProgress();
  select(0, false);
  return { say, buddy };
}
