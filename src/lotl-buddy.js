// Lotl: a procedural plush axolotl drawn with three.js (no model files).
// Exposes a small API the coping-skills coach drives. Falls back to an SVG
// drawing when WebGL isn't available.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const MOODS = {
  rest: 0xff86a8, breathe: 0xb9a5ff, ground: 0x7fe3c0, squeeze: 0xffa98c, reframe: 0x8fc8ff, kind: 0xffd36e,
};

export function createBuddy(host) {
  const THREE = window.THREE;
  if (!THREE) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    if (!renderer.getContext()) return null;
  } catch {
    return null;
  }
  const narrow = window.innerWidth < 600;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xfff4fb, 0x5b4a9e, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9a5ff, 0.7);
  rim.position.set(-4, 2, -5);
  scene.add(rim);

  // Plush fabric: a fuzz texture used as a felt bump map and as the fur-shell pattern.
  const noise = document.createElement("canvas");
  noise.width = noise.height = 128;
  const nctx = noise.getContext("2d");
  const img = nctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  const furTex = new THREE.CanvasTexture(noise);
  furTex.wrapS = furTex.wrapT = THREE.RepeatWrapping;
  furTex.repeat.set(14, 9);
  furTex.generateMipmaps = false;
  furTex.minFilter = THREE.LinearFilter;

  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, bumpMap: furTex, bumpScale: 0.02, ...o });
  const pink = mat(0xff9fbe);
  const belly = mat(0xffd6e2);
  const fin = mat(0xffcbd8, { bumpMap: null });
  const gillMat = mat(MOODS.rest, { emissive: new THREE.Color(MOODS.rest), emissiveIntensity: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x241a38, roughness: 0.3, metalness: 0 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff7fa0, transparent: true, opacity: 0.5, depthWrite: false });
  const sphere = new THREE.SphereGeometry(1, 48, 32);
  const shellSphere = new THREE.SphereGeometry(1, 36, 24);
  const mesh = (g, m, s, p) => {
    const o = new THREE.Mesh(g, m);
    o.scale.set(s[0], s[1], s[2]);
    o.position.set(p[0], p[1], p[2]);
    return o;
  };

  // Fur shells: stacked, slightly larger copies whose pixels are cut away by the
  // fuzz pattern, more on each outer layer, so short soft hairs stand up.
  const SHELLS = narrow ? 6 : 10;
  const shellMats = (hex) => Array.from({ length: SHELLS }, (_, i) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex).multiplyScalar(0.86 + 0.16 * ((i + 1) / SHELLS)),
    roughness: 1, metalness: 0, alphaMap: furTex, alphaTest: 0.3 + 0.62 * (i / SHELLS),
  }));
  const pinkFur = shellMats(0xff9fbe);
  const bellyFur = shellMats(0xffd6e2);
  const HAIR = 0.055;
  function fuzzy(parent, base, fur, s, p) {
    const g = new THREE.Group();
    g.scale.set(s[0], s[1], s[2]);
    g.position.set(p[0], p[1], p[2]);
    g.add(new THREE.Mesh(sphere, base));
    const avg = (s[0] + s[1] + s[2]) / 3;
    fur.forEach((m, i) => {
      const sh = new THREE.Mesh(shellSphere, m);
      sh.scale.setScalar(1 + ((i + 1) / SHELLS) * (HAIR / avg));
      g.add(sh);
    });
    parent.add(g);
    return g;
  }

  // pivot sits on the floor so squashing happens from the base
  const pivot = new THREE.Group();
  pivot.position.y = -1.15;
  scene.add(pivot);
  const body = new THREE.Group();
  body.position.y = 1.15;
  pivot.add(body);

  fuzzy(body, pink, pinkFur, [0.95, 0.78, 1.3], [0, -0.38, -0.8]);
  fuzzy(body, belly, bellyFur, [0.78, 0.45, 1.05], [0, -0.66, -0.7]);
  const tail = new THREE.Group();
  tail.position.set(0, -0.35, -1.85);
  body.add(tail);
  fuzzy(tail, pink, pinkFur, [0.42, 0.46, 0.9], [0, 0, -0.45]);
  tail.add(mesh(sphere, fin, [0.07, 0.6, 1.0], [0, 0.12, -0.7]));
  for (const [x, z] of [[0.78, -0.2], [-0.78, -0.2], [0.72, -1.3], [-0.72, -1.3]]) {
    fuzzy(body, pink, pinkFur, [0.27, 0.2, 0.32], [x, -0.98, z]);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.22);
  body.add(head);
  fuzzy(head, pink, pinkFur, [1.35, 1.0, 1.1], [0, 0, 0]);
  const eyes = [];
  const cheeks = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.5, 0.12, 1.06);
    eye.add(mesh(sphere, dark, [0.11, 0.13, 0.08], [0, 0, 0]));
    eye.add(mesh(sphere, white, [0.035, 0.035, 0.03], [0.03, 0.05, 0.08]));
    head.add(eye);
    eyes.push(eye);
    const c = mesh(sphere, cheekMat, [0.17, 0.1, 0.05], [s * 0.78, -0.12, 0.93]);
    head.add(c);
    cheeks.push(c);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 24, Math.PI), dark);
  smile.position.set(0, -0.1, 1.14);
  smile.rotation.set(-0.12, 0, Math.PI);
  head.add(smile);

  // three fluffy gill stalks per side
  const gills = [];
  const stalkGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.42, -0.05), new THREE.Vector3(0, 0.82, -0.2),
  ]), 16, 0.085, 10);
  const tipGeo = new THREE.SphereGeometry(0.11, 16, 12);
  const frondGeo = new THREE.SphereGeometry(0.075, 12, 10);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group();
      g.position.set(s * 1.0, 0.42 - k * 0.3, -0.2);
      const baseZ = -s * (0.45 + k * 0.48);
      g.rotation.set(-0.25, 0, baseZ);
      g.add(new THREE.Mesh(stalkGeo, gillMat));
      const tip = new THREE.Mesh(tipGeo, gillMat);
      tip.position.set(0, 0.82, -0.2);
      g.add(tip);
      for (const t of [0.3, 0.52, 0.72]) {
        for (const side of [-1, 1]) {
          const f = new THREE.Mesh(frondGeo, gillMat);
          f.position.set(side * 0.1, t, -0.05 - t * 0.15);
          f.scale.set(1, 0.8, 1.3);
          g.add(f);
        }
      }
      head.add(g);
      gills.push({ g, baseZ, phase: k * 0.9 + (s > 0 ? 0 : 1.7), side: s });
    }
  }

  // soft floor shadow
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext("2d");
  const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, "rgba(6,3,20,0.55)");
  grad.addColorStop(1, "rgba(6,3,20,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.16, -0.4);
  shadow.scale.set(1, 1.15, 1);
  scene.add(shadow);

  // ---------- Lotl's tank: sand, plush plants, moss balls and bubbles ----------
  const tank = new THREE.Group();
  scene.add(tank);
  const FLOOR = -1.17;
  {
    // sand that fades out at the edges so the tank blends into the page
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, "rgba(206,178,146,0.85)");
    g.addColorStop(0.45, "rgba(186,160,140,0.6)");
    g.addColorStop(0.8, "rgba(150,130,150,0.15)");
    g.addColorStop(1, "rgba(150,130,150,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 100;
      x.fillStyle = `rgba(${Math.random() < 0.5 ? "160,130,110" : "235,220,200"},${0.25 + Math.random() * 0.3})`;
      x.fillRect(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 1.6, 1.6);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    const sand = new THREE.Mesh(new THREE.CircleGeometry(3.3, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, FLOOR - 0.01, -0.9);
    sand.scale.set(1.0, 0.8, 1);
    sand.renderOrder = -1;
    tank.add(sand);
  }
  // little pastel pebbles
  const pebbleCols = [0xc9b6ff, 0xffc2d4, 0xa8d8ff, 0xfff1c2, 0xc9f7e6];
  [[-1.9, 0.9], [-1.55, 1.15], [1.7, 1.0], [2.05, 0.7], [1.4, 1.3], [-2.4, -0.3], [2.6, -0.6], [-0.9, 1.5], [0.9, 1.55]].forEach(([x, z], i) => {
    const r = 0.1 + (i % 3) * 0.035;
    tank.add(mesh(sphere, mat(pebbleCols[i % pebbleCols.length], { bumpMap: null, roughness: 0.6 }), [r * 1.3, r * 0.7, r], [x, FLOOR + r * 0.5, z]));
  });
  // cute leafy plush plants: a short stem with round, puffy leaves fanning up and out
  const plants = [];
  const greens = [0x6fd27a, 0x58c46a, 0x8ee08a, 0x4fb862];
  const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
  const leafMats = greens.map((c) => mat(lin(c), { bumpScale: 0.006, roughness: 0.85 }));
  const veinMat = mat(lin(0x3f9a50), { bumpMap: null });
  function leafyPlant(x, z, size, m) {
    const root = new THREE.Group();
    root.position.set(x, FLOOR, z);
    root.scale.setScalar(size);
    tank.add(root);
    const sway = new THREE.Group();
    root.add(sway);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const h = 0.18 + (i % 3) * 0.16;
      const tilt = 0.55 + (i % 3) * 0.25;           // inner leaves stand taller
      const stem = new THREE.Group();
      stem.position.y = 0.05;
      stem.rotation.set(0, a, 0);
      sway.add(stem);
      const arm = new THREE.Group();
      arm.rotation.z = -(Math.PI / 2 - tilt);
      stem.add(arm);
      arm.add(mesh(sphere, veinMat, [0.025, h * 0.5, 0.025], [0, h * 0.5, 0]));
      const leaf = mesh(sphere, m, [0.15, 0.26, 0.07], [0, h + 0.2, 0]);
      arm.add(leaf);
    }
    plants.push({ sway, phase: Math.random() * 6 });
  }
  leafyPlant(-2.3, -1.3, 1.45, leafMats[0]);
  leafyPlant(-2.75, -0.35, 0.95, leafMats[2]);
  leafyPlant(2.35, -1.4, 1.4, leafMats[1]);
  leafyPlant(2.75, -0.45, 0.9, leafMats[3]);
  leafyPlant(-1.15, -2.7, 1.0, leafMats[1]);
  leafyPlant(1.25, -2.8, 1.1, leafMats[0]);
  // a few tall grass blades in the back corners
  for (const [x, z, k] of [[-1.85, -2.2, 0], [1.9, -2.3, 2], [-2.0, -1.9, 3]]) {
    const tuft = new THREE.Group();
    tuft.position.set(x, FLOOR, z);
    tank.add(tuft);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Group();
      blade.rotation.set(0, i * 1.5, (i - 1.5) * 0.18);
      blade.add(mesh(sphere, leafMats[(k + i) % 4], [0.06, 0.7 + (i % 2) * 0.25, 0.03], [0, 0.6, 0]));
      tuft.add(blade);
    }
    plants.push({ sway: tuft, phase: Math.random() * 6 });
  }
  // fuzzy moss balls (marimo), a classic axolotl-tank friend
  const mossFur = shellMats(0x4aa86c);
  const moss = mat(0x3e9660);
  fuzzy(tank, moss, mossFur, [0.36, 0.33, 0.36], [-1.75, FLOOR + 0.32, 0.35]);
  fuzzy(tank, moss, mossFur, [0.22, 0.2, 0.22], [-1.25, FLOOR + 0.2, 0.75]);
  fuzzy(tank, moss, mossFur, [0.28, 0.26, 0.28], [1.85, FLOOR + 0.26, 0.2]);

  // bubbles: soft rings that drift up and wobble; Lotl blows a few when breathing out
  const bubbleTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 18, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,0.05)");
    g.addColorStop(0.8, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill();
    x.fillStyle = "rgba(255,255,255,0.9)"; x.beginPath(); x.ellipse(23, 21, 6, 4, -0.6, 0, Math.PI * 2); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const bubbles = [];
  const NB = narrow ? 10 : 18;
  const sources = [[-2.3, -1.3], [2.35, -1.4], [-1.75, 0.35], [1.85, 0.2], [1.25, -2.8]];
  function newBubble(b, fromMouth) {
    if (fromMouth) {
      const p = new THREE.Vector3();
      smile.getWorldPosition(p);
      b.sprite.position.set(p.x + (Math.random() - 0.5) * 0.2, p.y + 0.1, p.z + 0.2);
    } else {
      const [sx, sz] = sources[Math.floor(Math.random() * sources.length)];
      b.sprite.position.set(sx + (Math.random() - 0.5) * 0.3, FLOOR + 0.3 + Math.random() * 0.4, sz);
    }
    b.size = 0.07 + Math.random() * (fromMouth ? 0.08 : 0.1);
    b.speed = 0.35 + Math.random() * 0.35;
    b.phase = Math.random() * 6;
    b.x0 = b.sprite.position.x;
    b.sprite.scale.setScalar(b.size);
  }
  for (let i = 0; i < NB; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    const b = { sprite, mouth: false };
    newBubble(b, false);
    sprite.position.y += Math.random() * 3.5;
    tank.add(sprite);
    bubbles.push(b);
  }
  let mouthBubbles = 0;   // bubbles queued from Lotl's mouth
  const TOP = 3.4;

  // ---------- state (simple springs) ----------
  const st = {
    squash: 1, squashV: 0, squashT: 1,
    y: 0, vy: 0,
    wig: 0, wigV: 0,
    rotY: 0.35, rotV: 0, rotT: 0.35, dragging: false,
    lookX: 0, lookY: 0, lookTX: 0, lookTY: 0,
    sway: 0.12, blush: 0, blushT: 0, glow: 0,
    breath: 0, breathFrom: 0, breathTo: 0, breathStart: 0, breathDur: 1,
    droop: 0, droopT: 0,
    mood: new THREE.Color(MOODS.rest), moodT: new THREE.Color(MOODS.rest),
    nextBlink: 2.5, blink: 0,
  };
  const RM = () => reduceMotion.matches;

  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = camera.aspect < 1.1 ? 12.6 : 10.8;
    camera.position.set(0, 1.2, dist);
    camera.lookAt(0, 0.4, -0.3);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  let t = 0, last = 0, running = false, raf = 0;
  const DT = 1 / 60;
  function step() {
    t += DT;
    const k = 120, c = 9;
    st.squashV += (-k * (st.squash - st.squashT) - c * st.squashV) * DT;
    st.squash += st.squashV * DT;
    if (st.y > 0 || st.vy > 0) {
      st.vy -= 18 * DT;
      st.y = Math.max(0, st.y + st.vy * DT);
      if (st.y === 0 && st.vy < 0) { st.squashV -= Math.min(3, -st.vy * 0.6); st.vy = 0; }
    }
    st.wigV += (-80 * st.wig - 6 * st.wigV) * DT;
    st.wig += st.wigV * DT;
    if (!st.dragging) {
      st.rotV += (-14 * (st.rotY - st.rotT) - 5 * st.rotV) * DT;
      st.rotY += st.rotV * DT;
    }
    st.lookX += (st.lookTX - st.lookX) * 0.08;
    st.lookY += (st.lookTY - st.lookY) * 0.08;
    st.sway += (0.12 - st.sway) * 0.02;
    st.blush += (st.blushT - st.blush) * 0.06;
    st.blushT *= 0.985;
    st.glow *= 0.97;
    st.droop += (st.droopT - st.droop) * 0.03;
    st.mood.lerp(st.moodT, 0.05);
    const bp = Math.min(1, (performance.now() - st.breathStart) / (st.breathDur * 1000));
    const be = bp < 0.5 ? 2 * bp * bp : 1 - Math.pow(-2 * bp + 2, 2) / 2;
    st.breath = st.breathFrom + (st.breathTo - st.breathFrom) * be;
    st.nextBlink -= DT;
    if (st.nextBlink <= 0) { st.blink = 0.14; st.nextBlink = 2.5 + Math.random() * 3; }
    st.blink = Math.max(0, st.blink - DT);
    // breathing out blows a few bubbles
    if (st.breathTo === 0 && st.breathFrom > 0.5 && st.breath > 0.15 && Math.random() < 0.05) mouthBubbles = Math.min(mouthBubbles + 1, 4);
    if (RM()) return;
    for (const b of bubbles) {
      const p = b.sprite.position;
      p.y += b.speed * DT;
      p.x = b.x0 + Math.sin(t * 2.2 + b.phase) * 0.06;
      if (p.y > TOP) newBubble(b, false);
    }
    if (mouthBubbles > 0) {
      mouthBubbles--;
      newBubble(bubbles.reduce((a, b) => (b.sprite.position.y > a.sprite.position.y ? b : a)), true);
    }
  }

  function apply() {
    const rm = RM();
    const inflate = 1 + st.breath * 0.1;
    const sy = st.squash * inflate * (1 - st.droop * 0.05);
    const sxz = inflate / Math.sqrt(Math.max(0.5, st.squash));
    pivot.scale.set(sxz, sy, sxz);
    const bob = rm ? 0 : Math.sin(t * 1.3) * 0.04;
    pivot.position.y = -1.15 + st.y + bob;
    pivot.rotation.z = st.wig * 0.25;
    body.rotation.y = st.rotY;
    head.rotation.y = st.lookX * 0.45;
    head.rotation.x = -st.lookY * 0.22 + st.droop * 0.12;
    head.rotation.z = st.wig * 0.15;
    tail.rotation.y = rm ? 0 : Math.sin(t * 1.7) * 0.18 + st.wig * 0.4;
    const amp = rm ? Math.min(st.sway, 0.05) : st.sway;
    for (const gl of gills) {
      gl.g.rotation.z = gl.baseZ + gl.side * (Math.sin(t * 1.8 + gl.phase) * amp * 0.5 - st.breath * 0.18 + st.droop * 0.35);
      gl.g.rotation.x = -0.25 + Math.sin(t * 1.4 + gl.phase) * amp * 0.3 - st.droop * 0.3;
    }
    for (const pl of plants) {
      pl.sway.rotation.z = rm ? 0 : Math.sin(t * 1.1 + pl.phase) * 0.05;
      pl.sway.rotation.x = rm ? 0 : Math.sin(t * 0.8 + pl.phase) * 0.03;
    }
    for (const e of eyes) e.scale.y = st.blink > 0 ? 0.12 : 1;
    cheekMat.opacity = 0.42 + st.blush * 0.5;
    for (const ch of cheeks) ch.scale.set(0.17 * (1 + st.blush * 0.3), 0.1 * (1 + st.blush * 0.3), 0.05);
    gillMat.color.copy(st.mood);
    gillMat.emissive.copy(st.mood);
    gillMat.emissiveIntensity = 0.08 + st.glow * 0.55 + st.breath * 0.15;
    shadow.scale.set(sxz * (1 - st.y * 0.2), 1.15 * sxz * (1 - st.y * 0.2), 1);
    shadow.material.opacity = 1 - Math.min(0.7, st.y * 0.5);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const elapsed = Math.min(0.1, (now - last) / 1000 || DT);
    last = now;
    let acc = elapsed;
    while (acc > 0.0001) { step(); acc -= DT; }
    apply();
    renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(host);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : host.getBoundingClientRect().top < innerHeight && start()));
  apply();
  renderer.render(scene, camera);

  return {
    poke() {
      st.squashV -= 2.6;
      if (!RM()) st.vy = 3.4;
      st.wigV += (Math.random() < 0.5 ? -1 : 1) * 2.2;
      st.blushT = 1;
      st.sway = 0.55;
    },
    press(on) {
      st.squashT = on ? 0.8 : 1;
      if (!on) { st.squashV += 1.8; st.sway = 0.45; }
    },
    spinBy(dx) { st.dragging = true; st.rotY += dx * 0.012; st.rotV = dx * 0.6; },
    spinEnd() { st.dragging = false; },
    look(x, y) { st.lookTX = Math.max(-1, Math.min(1, x)); st.lookTY = Math.max(-1, Math.min(1, y)); },
    breathe(to, seconds) {
      st.breathFrom = st.breath; st.breathTo = to; st.breathStart = performance.now(); st.breathDur = Math.max(0.2, seconds);
    },
    relax(on) { st.droopT = on ? 1 : 0; },
    mood(name) { st.moodT.setHex(MOODS[name] ?? MOODS.rest); },
    sparkle() { st.glow = 1; st.blushT = 0.8; st.sway = 0.5; },
    nod() { st.wigV += 1.4; },
  };
}

// SVG stand-in when WebGL isn't available: same API, CSS-driven.
export function createFallbackBuddy(svg) {
  const pulse = (cls, ms = 500) => { svg.classList.remove(cls); void svg.getBoundingClientRect(); svg.classList.add(cls); setTimeout(() => svg.classList.remove(cls), ms); };
  return {
    poke: () => pulse("is-boing"),
    press: (on) => svg.classList.toggle("is-squeezed", on),
    spinBy() {}, spinEnd() {}, look() {}, nod: () => pulse("is-boing"),
    breathe: (to, s) => { svg.style.transition = `transform ${s}s ease-in-out`; svg.style.transform = `scale(${1 + to * 0.08})`; },
    relax: (on) => svg.classList.toggle("is-relaxed", on),
    mood: (name) => svg.style.setProperty("--gill", `#${(MOODS[name] ?? MOODS.rest).toString(16).padStart(6, "0")}`),
    sparkle: () => pulse("is-boing"),
  };
}
