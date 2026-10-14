import "./styles.css";
import { initGalaxy } from "./galaxy.js";
import { initMinecraft } from "./minecraft.js";
import { initWellbeing } from "./wellbeing.js";
import { initResearchLab } from "./research-lab.js";
import { initAbout } from "./about.js";
import { initWhiteboard } from "./whiteboard.js";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const $ = (s) => document.querySelector(s);
const floaters = {
  blob1: $(".blob.b1"), blob2: $(".blob.b2"), blob3: $(".blob.b3"),
  sp1: $(".spark.s1"), sp2: $(".spark.s2"), sp3: $(".spark.s3"),
  star1: $(".star.star1"), star2: $(".star.star2"), star3: $(".star.star3"), star4: $(".star.star4"),
  moon1: $(".moon.m1"), moon2: $(".moon.m2"), moon3: $(".moon.m3"),
};
const hero = $(".hero");
const hint = $(".hint");
const aboutSection = $(".about");

// ===== Soft colour drift for the name =====
function setPalette(t) {
  const h1 = (160 + Math.sin(t * 0.35) * 30 + 360) % 360;
  const h2 = (265 + Math.sin(t * 0.3 + 1.2) * 30 + 360) % 360;
  const h3 = (335 + Math.cos(t * 0.33 + 0.6) * 25 + 360) % 360;
  const root = document.documentElement.style;
  root.setProperty("--c1", `hsl(${h1} 80% 78%)`);
  root.setProperty("--c2", `hsl(${h2} 85% 82%)`);
  root.setProperty("--c3", `hsl(${h3} 90% 82%)`);
}

async function waitForFonts() {
  try {
    await Promise.race([
      document.fonts.load('120px "Pacifico"'),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    await document.fonts.ready;
  } catch {}
}

// Lay the script letters out, fit the SVG to the word, then write it letter by letter.
function layoutAndAnimateLetters() {
  const letters = [...document.querySelectorAll("#psyWord .letter")];
  const svg = $(".scribble");
  if (!letters.length || !svg) return;
  const gap = 4;
  const widths = letters.map((el) => el.getComputedTextLength());
  let x = 0;
  letters.forEach((el, i) => { el.setAttribute("x", x.toFixed(2)); el.setAttribute("y", "140"); x += widths[i] + gap; });
  const total = x - gap;
  // tight viewBox around the word so it reads at every width
  svg.setAttribute("viewBox", `-20 0 ${total + 40} 230`);
  document.getElementById("psyWord")?.removeAttribute("style");

  if (prefersReduced) { letters.forEach((el) => (el.style.opacity = "1")); return; }

  letters.forEach((el) => {
    el.style.opacity = "0";
    el.style.transition = "opacity 220ms ease-out, transform 320ms cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.transformBox = "fill-box";
    el.style.transformOrigin = "bottom center";
    el.style.transform = "translateY(10px)";
  });
  let idx = 0;
  const next = () => {
    if (idx >= letters.length) {
      setTimeout(() => {
        letters.forEach((el) => { el.style.opacity = "0"; el.style.transform = "translateY(10px)"; });
        idx = 0;
        setTimeout(next, 500);
      }, 2600);
      return;
    }
    const el = letters[idx++];
    el.style.opacity = "1";
    el.style.transform = "none";
    setTimeout(next, 110);
  };
  next();
}

function buildAstroOverlay() {
  if (!aboutSection) return;
  const overlay = document.createElement("div");
  overlay.className = "about-astro-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
      <g class="astro-constellation const-a">
        <path d="M80 20 L100 60 L80 100 L60 60 Z" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <path d="M40 70 L80 20 L120 70" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <circle class="astro-star" cx="80" cy="20" r="2.4" /><circle class="astro-star" cx="100" cy="60" r="2.5" />
        <circle class="astro-star" cx="80" cy="100" r="2.3" /><circle class="astro-star" cx="60" cy="60" r="2.2" />
        <circle class="astro-star" cx="40" cy="70" r="2.2" /><circle class="astro-star" cx="120" cy="70" r="2.3" />
      </g>
      <g class="astro-constellation const-b">
        <path d="M20 80 L50 50 L80 60 L100 40 L120 50 L100 80 L70 75" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <circle class="astro-star" cx="20" cy="80" r="2.3" /><circle class="astro-star" cx="50" cy="50" r="2.4" />
        <circle class="astro-star" cx="80" cy="60" r="2.2" /><circle class="astro-star" cx="100" cy="40" r="2.5" />
        <circle class="astro-star" cx="120" cy="50" r="2.3" /><circle class="astro-star" cx="100" cy="80" r="2.2" />
        <circle class="astro-star" cx="70" cy="75" r="2.3" />
      </g>
      <g class="astro-constellation const-c">
        <path d="M20 30 L40 50 L60 20 L80 50 L100 30" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <circle class="astro-star" cx="20" cy="30" r="2.2" /><circle class="astro-star" cx="40" cy="50" r="2.4" />
        <circle class="astro-star" cx="60" cy="20" r="2.3" /><circle class="astro-star" cx="80" cy="50" r="2.5" />
        <circle class="astro-star" cx="100" cy="30" r="2.2" />
      </g>
      <foreignObject x="80" y="680" width="80" height="50" class="astro-plane plane-a">
        <img src="/japan.png" alt="" style="width:100%;height:100%;object-fit:contain;" />
      </foreignObject>
      <foreignObject x="1200" y="150" width="80" height="50" class="astro-plane plane-b">
        <img src="/korean.png" alt="" style="width:100%;height:100%;object-fit:contain;" />
      </foreignObject>
      <foreignObject x="600" y="400" width="80" height="50" class="astro-plane plane-c">
        <img src="/united.png" alt="" style="width:100%;height:100%;object-fit:contain;" />
      </foreignObject>
    </svg>`;
  aboutSection.insertBefore(overlay, aboutSection.firstChild);
}

// ===== Background float loop (runs only while the hero is on screen) =====
let heroVisible = true;
function tick(ms) {
  const t = (ms || 0) * 0.001;
  if (heroVisible && !prefersReduced) {
    const f = floaters;
    const tr = (el, s) => { if (el) el.style.transform = s; };
    tr(f.blob1, `translate(${Math.sin(t) * 12}px, ${Math.cos(t * 0.9) * 10}px) rotate(${t * 6}deg)`);
    tr(f.blob2, `translate(${Math.cos(t) * 10}px, ${Math.sin(t * 0.8) * 9}px) rotate(${-t * 5}deg)`);
    tr(f.blob3, `translate(${Math.sin(t * 0.7) * 11}px, ${Math.cos(t * 0.75) * 8}px) rotate(${t * 4}deg)`);
    tr(f.sp1, `translate(${Math.sin(t * 1.2) * 8}px, ${Math.cos(t * 1.1) * 6}px)`);
    tr(f.sp2, `translate(${Math.cos(t * 1.4) * 6}px, ${Math.sin(t * 1.3) * 5}px)`);
    tr(f.sp3, `translate(${Math.sin(t * 1.6) * 5}px, ${Math.cos(t * 1.5) * 4}px)`);
    tr(f.star1, `translate(${Math.sin(t * 0.5) * 10}px, ${Math.cos(t * 0.4) * 8}px) rotate(${Math.sin(t * 0.3) * 15}deg)`);
    tr(f.star2, `translate(${Math.cos(t * 0.6) * 8}px, ${Math.sin(t * 0.5) * 10}px) rotate(${Math.cos(t * 0.4) * 20}deg)`);
    tr(f.star3, `translate(${Math.sin(t * 0.55) * 9}px, ${Math.cos(t * 0.45) * 7}px) rotate(${Math.sin(t * 0.35) * 18}deg)`);
    tr(f.star4, `translate(${Math.cos(t * 0.65) * 7}px, ${Math.sin(t * 0.55) * 9}px) rotate(${Math.cos(t * 0.45) * 22}deg)`);
    tr(f.moon1, `translate(${Math.sin(t * 0.4) * 12}px, ${Math.cos(t * 0.35) * 10}px) rotate(${Math.sin(t * 0.25) * 30}deg)`);
    tr(f.moon2, `translate(${Math.cos(t * 0.45) * 10}px, ${Math.sin(t * 0.4) * 13}px) rotate(${Math.cos(t * 0.3) * 25}deg)`);
    tr(f.moon3, `translate(${Math.sin(t * 0.42) * 11}px, ${Math.cos(t * 0.38) * 11}px) rotate(${Math.sin(t * 0.28) * 28}deg)`);
    setPalette(t);
  }
  requestAnimationFrame(tick);
}

function setupHeroObserver() {
  if (!hero) return;
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (hint) hint.style.opacity = e.intersectionRatio > 0.6 ? "0.8" : "0";
  }, { threshold: [0, 0.6] }).observe(hero);
}

// ===== Navbar: background after scrolling + current section =====
function setupNav() {
  const nav = $(".navbar");
  const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const links = [...document.querySelectorAll(".nav-link")];
  const map = new Map(links.map((l) => [l.getAttribute("href").slice(1), l]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.removeAttribute("aria-current"));
      map.get(e.target.id)?.setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

// ===== Scroll reveals =====
function setupScrollAnimations() {
  const items = document.querySelectorAll(".reveal");
  document.querySelectorAll(".stagger").forEach((list) =>
    [...list.children].forEach((c, i) => c.style.setProperty("--i", i)));
  if (!("IntersectionObserver" in window)) { items.forEach((i) => i.classList.add("visible")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  items.forEach((i) => io.observe(i));
}

// ===== Spotlight project cards (pointer-follow glow) =====
function setupSpotlight() {
  if (!finePointer) return;
  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

// ===== Footer email link -> contact form =====
function setupEmailHandler() {
  const emailLink = document.querySelector('a[href="mailto:t_ho22@u.pacific.edu"]');
  emailLink?.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    $("#contact")?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    setTimeout(() => $("#name")?.focus({ preventScroll: true }), 600);
  });
}

// ===== Contact form =====
function setupContactForm() {
  const form = $("#contactForm");
  if (!form) return;
  const btn = form.querySelector(".form-submit");
  const label = form.querySelector(".form-submit-label");
  const status = form.querySelector(".form-status");
  const fields = ["name", "email", "message"].map((id) => form.querySelector(`#${id}`));
  const messages = {
    name: "Add your name so I know who's writing.",
    email: "Add an email like name@example.com so I can reply.",
    message: "Write a short message before sending.",
  };

  const showError = (input, msg) => {
    let err = input.parentElement.querySelector(".form-error");
    if (!msg) { input.removeAttribute("aria-invalid"); err?.remove(); return; }
    if (!err) {
      err = document.createElement("p");
      err.className = "form-error";
      err.id = `${input.id}-error`;
      input.insertAdjacentElement("afterend", err);
    }
    err.textContent = msg;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", err.id);
  };
  fields.forEach((f) => f.addEventListener("input", () => { if (f.checkValidity()) showError(f, ""); }));

  // Cmd/Ctrl + Enter submits from the textarea
  form.querySelector("#message").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.requestSubmit();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let firstBad = null;
    fields.forEach((f) => {
      f.value = f.value.trim() === "" ? "" : f.value;
      const ok = f.checkValidity() && f.value.trim() !== "";
      showError(f, ok ? "" : messages[f.id]);
      if (!ok && !firstBad) firstBad = f;
    });
    if (firstBad) { firstBad.focus(); return; }

    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    label.textContent = "Sending…";
    status.className = "form-status";
    status.textContent = "";
    try {
      const data = new FormData(form);
      const res = await fetch("https://formsubmit.co/ajax/t_ho22@u.pacific.edu", {
        method: "POST", body: data, headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Failed to send");
      form.reset();
      status.classList.add("is-ok");
      status.textContent = "Message sent. Thank you! I'll reply soon.";
    } catch (err) {
      console.error("Error sending message:", err);
      status.classList.add("is-error");
      status.textContent = "That didn't send. Check your connection and try again, or email t_ho22@u.pacific.edu.";
    } finally {
      btn.removeAttribute("aria-busy");
      btn.disabled = false;
      label.textContent = "Send Message";
    }
  });
}

function safe(fn, name) {
  try { fn(); } catch (err) { console.error(`${name} failed to start:`, err); }
}

(async function start() {
  document.documentElement.classList.add("js");
  safe(setupScrollAnimations, "reveals");
  safe(setupNav, "nav");
  safe(initAbout, "about");
  safe(setupEmailHandler, "email link");
  safe(setupContactForm, "contact form");
  safe(initWellbeing, "well-being");
  safe(initResearchLab, "research lab");
  safe(setupHeroObserver, "hero observer");
  await waitForFonts();
  safe(layoutAndAnimateLetters, "hero letters");
  safe(buildAstroOverlay, "astro overlay");
  safe(initWhiteboard, "whiteboard");
  if (window.THREE) {
    safe(initGalaxy, "galaxy");
    safe(initMinecraft, "minecraft");
  }
  requestAnimationFrame(tick);
})();
