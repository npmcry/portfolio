import "./styles.css";
import { initGalaxy } from "./galaxy.js";
import { initMinecraft } from "./minecraft.js";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const blob1 = document.querySelector(".blob.b1");
const blob2 = document.querySelector(".blob.b2");
const blob3 = document.querySelector(".blob.b3");
const sp1 = document.querySelector(".spark.s1");
const sp2 = document.querySelector(".spark.s2");
const sp3 = document.querySelector(".spark.s3");
const star1 = document.querySelector(".star.star1");
const star2 = document.querySelector(".star.star2");
const star3 = document.querySelector(".star.star3");
const star4 = document.querySelector(".star.star4");
const moon1 = document.querySelector(".moon.m1");
const moon2 = document.querySelector(".moon.m2");
const moon3 = document.querySelector(".moon.m3");
const hero = document.querySelector(".hero");
const hint = document.querySelector(".hint");
const aboutSection = document.querySelector(".about");

// ===== COLOR MOTION =====
function setPalette(t, scrollY){
  const base = t * 24 + scrollY * 0.02;
  const h1 = (160 + Math.sin(base * 0.02) * 40) % 360;
  const h2 = (270 + Math.sin(base * 0.018 + 1.2) * 50) % 360;
  const h3 = (330 + Math.cos(base * 0.02 + 0.6) * 40) % 360;

  document.documentElement.style.setProperty("--c1", `hsl(${h1} 95% 70%)`);
  document.documentElement.style.setProperty("--c2", `hsl(${h2} 95% 74%)`);
  document.documentElement.style.setProperty("--c3", `hsl(${h3} 95% 72%)`);
}

async function waitForFonts(){
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {}
}

// Layout letters so they form a centered word, then animate each letter sequentially
function layoutAndAnimateLetters(){
  const letters = [...document.querySelectorAll("#psyWord .letter")];
  const svg = document.querySelector(".scribble");
  if (!letters.length || !svg) return;

  // Measure each letter width
  const widths = letters.map(el => el.getComputedTextLength());

  // Small gap between letters for cursive connection
  const gap = 5;

  // Total width of the word
  const total = widths.reduce((a,b)=>a+b,0) + gap * (letters.length - 1);

  // Center within viewBox width (1400)
  const startX = (1400 - total) / 2;

  // Set each letter's x position
  let x = startX;
  letters.forEach((el, i) => {
    el.setAttribute("x", x.toFixed(2));
    x += widths[i] + gap;
  });

  // All letters start invisible
  letters.forEach(el => {
    el.style.opacity = "0";
  });

  if (prefersReduced) {
    letters.forEach(el => (el.style.opacity = "1"));
    return;
  }

  // Animate one letter at a time sequentially
  let idx = 0;

  function animateNext(){
    if (idx >= letters.length) {
      // Loop: wait a bit then restart
      setTimeout(() => {
        idx = 0;
        letters.forEach(el => el.style.opacity = "0");
        requestAnimationFrame(animateNext);
      }, 1500);
      return;
    }

    const el = letters[idx];
    const duration = 200; // Quick appearance per letter
    const start = performance.now();

    function step(now){
      const p = Math.min(1, (now - start) / duration);
      el.style.opacity = `${p}`;

      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        idx++;
        // Small delay before next letter
        setTimeout(() => requestAnimationFrame(animateNext), 50);
      }
    }

    requestAnimationFrame(step);
  }

  animateNext();
}

function buildAstroOverlay(){
  if (!aboutSection) return;

  const overlay = document.createElement("div");
  overlay.className = "about-astro-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
      <!-- Constellation A: Orion (Hunter) -->
      <g class="astro-constellation const-a">
        <path d="M80 20 L100 60 L80 100 L60 60 Z" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <path d="M40 70 L80 20 L120 70" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <circle class="astro-star" cx="80" cy="20" r="2.4" />
        <circle class="astro-star" cx="100" cy="60" r="2.5" />
        <circle class="astro-star" cx="80" cy="100" r="2.3" />
        <circle class="astro-star" cx="60" cy="60" r="2.2" />
        <circle class="astro-star" cx="40" cy="70" r="2.2" />
        <circle class="astro-star" cx="120" cy="70" r="2.3" />
      </g>

      <!-- Constellation B: Ursa Major (Big Dipper) -->
      <g class="astro-constellation const-b">
        <path d="M20 80 L50 50 L80 60 L100 40 L120 50 L100 80 L70 75" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <circle class="astro-star" cx="20" cy="80" r="2.3" />
        <circle class="astro-star" cx="50" cy="50" r="2.4" />
        <circle class="astro-star" cx="80" cy="60" r="2.2" />
        <circle class="astro-star" cx="100" cy="40" r="2.5" />
        <circle class="astro-star" cx="120" cy="50" r="2.3" />
        <circle class="astro-star" cx="100" cy="80" r="2.2" />
        <circle class="astro-star" cx="70" cy="75" r="2.3" />
      </g>

      <!-- Constellation C: Cassiopeia (W shape) -->
      <g class="astro-constellation const-c">
        <path d="M20 30 L40 50 L60 20 L80 50 L100 30" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" />
        <circle class="astro-star" cx="20" cy="30" r="2.2" />
        <circle class="astro-star" cx="40" cy="50" r="2.4" />
        <circle class="astro-star" cx="60" cy="20" r="2.3" />
        <circle class="astro-star" cx="80" cy="50" r="2.5" />
        <circle class="astro-star" cx="100" cy="30" r="2.2" />
      </g>

      <foreignObject x="80" y="680" width="80" height="50" class="astro-plane plane-a">
        <img src="/src/japan.png" alt="japan-airline" style="width:100%;height:100%;object-fit:contain;" />
      </foreignObject>
      <foreignObject x="1200" y="150" width="80" height="50" class="astro-plane plane-b">
        <img src="/src/korean.png" alt="korean-airline" style="width:100%;height:100%;object-fit:contain;" />
      </foreignObject>
      <foreignObject x="600" y="400" width="80" height="50" class="astro-plane plane-c">
        <img src="/src/united.png" alt="united-airline" style="width:100%;height:100%;object-fit:contain;" />
      </foreignObject>
    </svg>
  `;

  if (prefersReduced) {
    overlay.classList.add("reduce-motion");
  }

  aboutSection.insertBefore(overlay, aboutSection.firstChild);

  if (prefersReduced) return;

  const bounds = { w: window.innerWidth || 1, h: window.innerHeight || 1 };
  const applyParallax = (x, y) => {
    overlay.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const onMove = (e) => {
    const nx = (e.clientX / bounds.w - 0.5) * 8;
    const ny = (e.clientY / bounds.h - 0.5) * 5;
    applyParallax(nx, ny);
    overlay._parallaxX = nx;
  };

  const onScroll = () => {
    const rect = aboutSection.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, 1 - rect.top / (rect.height || 1)));
    const yShift = (progress - 0.5) * 4;
    overlay.style.opacity = 0.55 + progress * 0.2;
    applyParallax(overlay._parallaxX || 0, yShift);
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("scroll", onScroll, { passive: true });
}

function tick(ms){
  const t = (ms || 0) * 0.001;
  const s = window.scrollY || 0;

  if (hero && hint) {
    const heroRect = hero.getBoundingClientRect();
    const visible = heroRect.bottom > 160; // fade out once past hero
    hint.style.opacity = visible ? "0.65" : "0";
    hint.style.pointerEvents = visible ? "auto" : "none";
  }

  if (!prefersReduced) {
    if (blob1) blob1.style.transform =
      `translate(${Math.sin(t)*12}px, ${Math.cos(t*0.9)*10}px) rotate(${t*6}deg)`;
    if (blob2) blob2.style.transform =
      `translate(${Math.cos(t)*10}px, ${Math.sin(t*0.8)*9}px) rotate(${-t*5}deg)`;
    if (blob3) blob3.style.transform =
      `translate(${Math.sin(t*0.7)*11}px, ${Math.cos(t*0.75)*8}px) rotate(${t*4}deg)`;

    if (sp1) sp1.style.transform = `translate(${Math.sin(t*1.2)*8}px, ${Math.cos(t*1.1)*6}px)`;
    if (sp2) sp2.style.transform = `translate(${Math.cos(t*1.4)*6}px, ${Math.sin(t*1.3)*5}px)`;
    if (sp3) sp3.style.transform = `translate(${Math.sin(t*1.6)*5}px, ${Math.cos(t*1.5)*4}px)`;
    
    // Slow floating stars
    if (star1) star1.style.transform = `translate(${Math.sin(t*0.5)*10}px, ${Math.cos(t*0.4)*8}px) rotate(${Math.sin(t*0.3)*15}deg)`;
    if (star2) star2.style.transform = `translate(${Math.cos(t*0.6)*8}px, ${Math.sin(t*0.5)*10}px) rotate(${Math.cos(t*0.4)*20}deg)`;
    if (star3) star3.style.transform = `translate(${Math.sin(t*0.55)*9}px, ${Math.cos(t*0.45)*7}px) rotate(${Math.sin(t*0.35)*18}deg)`;
    if (star4) star4.style.transform = `translate(${Math.cos(t*0.65)*7}px, ${Math.sin(t*0.55)*9}px) rotate(${Math.cos(t*0.45)*22}deg)`;
    
    // Floating moons with gentle rotation
    if (moon1) moon1.style.transform = `translate(${Math.sin(t*0.4)*12}px, ${Math.cos(t*0.35)*10}px) rotate(${Math.sin(t*0.25)*30}deg)`;
    if (moon2) moon2.style.transform = `translate(${Math.cos(t*0.45)*10}px, ${Math.sin(t*0.4)*13}px) rotate(${Math.cos(t*0.3)*25}deg)`;
    if (moon3) moon3.style.transform = `translate(${Math.sin(t*0.42)*11}px, ${Math.cos(t*0.38)*11}px) rotate(${Math.sin(t*0.28)*28}deg)`;
  }

  setPalette(t, s);
  requestAnimationFrame(tick);
}

(async function start(){
  await waitForFonts();
  layoutAndAnimateLetters();
  buildAstroOverlay();
  setupScrollAnimations();
  initGalaxy();
  initMinecraft();
  requestAnimationFrame(tick);
})();

function setupScrollAnimations(){
  const sections = document.querySelectorAll('.projects, .contact');
  
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px'
  });

  sections.forEach(section => observer.observe(section));
}
