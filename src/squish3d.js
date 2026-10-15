// Squish corner in 3D: a glossy gel cube branded "Psych", a bear-shaped pancake
// stack with melting butter, and a soft butter stick. All geometry is built in code.
// Press to dent, drag while pressing to stretch, tap to boing, drag the background to spin.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const CUBE_COLORS = [
  { label: "Lavender glitter", hex: 0xc7a3ec, core: 0xf6eaff, glitter: true, css: ["#ead9fb", "#b98ce6"] },
  { label: "Aqua", hex: 0x7ccdf0, core: 0xe9f9ff, glitter: false, css: ["#d4f1fd", "#5bbfe9"] },
  { label: "Pink glitter", hex: 0xf48ab6, core: 0xffe6f1, glitter: true, css: ["#ffd3e6", "#ef6fa5"] },
  { label: "Mint", hex: 0x8ee2c3, core: 0xeafff6, glitter: false, css: ["#d9fbee", "#5fd3a7"] },
  { label: "Clear glitter", hex: 0xe4e2f6, core: 0xffffff, glitter: true, css: ["#ffffff", "#cfcbe8"] },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

export function initSquish3D() {
  const THREE = window.THREE;
  const root = document.getElementById("squish");
  if (!root || !THREE) return false;
  const stage = root.querySelector(".squish-stage");
  const host = root.querySelector(".squish-3d");
  const picker = root.querySelector(".squish-pick");
  const swatches = root.querySelector(".squish-swatches");
  const meterBar = root.querySelector(".stress-meter");
  const meterText = root.querySelector(".stress-value");
  const msg = root.querySelector(".squish-msg");
  const resetBtn = root.querySelector("[data-stress-reset]");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    if (!renderer.getContext()) return false;
  } catch {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.className = "squish-gl";
  renderer.domElement.setAttribute("role", "img");
  host.appendChild(renderer.domElement);

  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d72ad, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(3, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffeef6, 0.35);
  fill.position.set(-4, 2, 3);
  scene.add(fill);
  const rimLight = new THREE.DirectionalLight(0xc9b6ff, 0.45);
  rimLight.position.set(0, 3, -5);
  scene.add(rimLight);

  // ---------- geometry helpers ----------
  function mergeVertices(g) {
    const p = g.attributes.position;
    const map = new Map(), pos = [], remap = new Uint32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
      let id = map.get(k);
      if (id === undefined) { id = pos.length / 3; map.set(k, id); pos.push(x, y, z); }
      remap[i] = id;
    }
    const src = g.index ? g.index.array : Array.from({ length: p.count }, (_, i) => i);
    const idx = [];
    for (let i = 0; i < src.length; i += 3) {
      const a = remap[src[i]], b = remap[src[i + 1]], c = remap[src[i + 2]];
      if (a !== b && b !== c && a !== c) idx.push(a, b, c);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    out.setIndex(idx);
    return out;
  }
  function roundedBox(w, h, d, r, sx, sy, sz) {
    const g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
    const p = g.attributes.position;
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ix = clamp(x, -hx, hx), iy = clamp(y, -hy, hy), iz = clamp(z, -hz, hz);
      const dx = x - ix, dy = y - iy, dz = z - iz, L = Math.hypot(dx, dy, dz);
      if (L > 1e-6) p.setXYZ(i, ix + (dx / L) * r, iy + (dy / L) * r, iz + (dz / L) * r);
    }
    return mergeVertices(g);
  }
  function setUV(geo, fn) {
    const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const [u, v] = fn(p.getX(i), p.getY(i), p.getZ(i));
      uv[i * 2] = u; uv[i * 2 + 1] = v;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }
  function bake(mesh) {
    mesh.updateMatrix();
    mesh.geometry = mesh.geometry.clone();
    mesh.geometry.applyMatrix4(mesh.matrix);
    mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.set(1, 1, 1);
    mesh.updateMatrix();
    return mesh;
  }
  function canvasTex(w, h, draw, color = true) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c);
    if (color) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    const redraw = () => { draw(c.getContext("2d"), w, h); tex.needsUpdate = true; };
    redraw();
    return { tex, redraw };
  }
  function blobShadow(sx, sz) {
    const { tex } = canvasTex(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0, "rgba(6,3,20,0.6)");
      g.addColorStop(1, "rgba(6,3,20,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    }, false);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(sx, sz, 1);
    m.position.y = 0.002;
    return m;
  }

  // Each toy keeps its undeformed vertex positions so squishes can spring back exactly.
  function makeToy(opts) {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    const toy = { ...opts, group, deformables: [], hit: [] };
    toy.add = (obj, { hit = false, normals = true, rigid = false } = {}) => {
      group.add(obj);
      const geo = obj.geometry;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      geo.boundingSphere.radius *= 1.5;
      const base = Float32Array.from(geo.attributes.position.array);
      let nBase = null;
      if (normals) {
        if (!geo.attributes.normal) geo.computeVertexNormals();
        nBase = Float32Array.from(geo.attributes.normal.array);
      }
      let center = null;
      if (rigid) {
        // small decorations ride along with the surface under them instead of being crushed
        center = new THREE.Vector3();
        for (let i = 0; i < base.length; i += 3) center.x += base[i], center.y += base[i + 1], center.z += base[i + 2];
        center.multiplyScalar(3 / base.length);
      }
      toy.deformables.push({ geo, base, nBase, normals: normals && !!geo.index && !rigid, center });
      if (hit) toy.hit.push(obj);
      return obj;
    };
    return toy;
  }

  // ===================== Psych gel cube =====================
  const cube = makeToy({
    name: "Psych cube", H: 1.6, depth: 0.55, sigma: 0.38, squashMax: 0.3, k: 9, pull: 0.9,
    angle: -0.55, dist: 7.0, top: 1.5, boing: 6,
  });
  {
    const S = 1.75, H = 1.6;
    const geo = roundedBox(S, H, S, 0.46, 30, 28, 30);
    const p = geo.attributes.position;
    // puffy, slightly dented top like a well-loved gel cube
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const top = smooth(H / 2 - 0.45, H / 2, y);
      const dimple = 0.11 * Math.exp(-((x - 0.12) ** 2 + (z + 0.05) ** 2) / (2 * 0.42 ** 2));
      const waves = 0.025 * Math.sin(x * 3.1 + 0.7) * Math.cos(z * 2.7);
      p.setY(i, y + H / 2 - top * (dimple + waves));
    }
    geo.computeVertexNormals();
    // fake light scattering inside the gel: brighter up top and in the middle
    {
      const pp = geo.attributes.position, cols = new Float32Array(pp.count * 3);
      for (let i = 0; i < pp.count; i++) {
        const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
        const up = smooth(0, H, y), mid = 1 - smooth(0.25, 0.95, Math.max(Math.abs(x), Math.abs(z)) / (S / 2));
        const v = 0.86 + 0.1 * up + 0.06 * mid;
        cols[i * 3] = cols[i * 3 + 1] = cols[i * 3 + 2] = Math.min(1, v);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    }

    // A soft studio reflection map, used only by the gel so it reads glossy and wet.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    {
      const { tex: sky } = canvasTex(64, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#b9aee0"); g.addColorStop(0.5, "#6b6194"); g.addColorStop(1, "#1d1638");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
      envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide })));
      const box = (w, h, x, y, z, c = 0xffffff, k = 4) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
      };
      box(5, 2.2, 3, 6, 4);           // big key softbox above-right
      box(1.2, 5, -6, 1.5, 3);         // tall strip on the left
      box(4, 0.8, 0, 2, -7, 0xd9ccff, 2); // lavender rim behind
      box(2.4, 1.2, -3, 5, 5, 0xffffff, 3); // small window up-left for a second sparkle
    }
    const envMap = pmrem.fromScene(envScene, 0.05).texture;
    pmrem.dispose();

    const c0 = CUBE_COLORS[0];
    // the gel skin: tinted, clear and glossy, so you can see into it
    cube.shell = new THREE.MeshPhysicalMaterial({
      color: lin(c0.hex), vertexColors: true, envMap, envMapIntensity: 1.35,
      roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, reflectivity: 0.7,
      transparent: true, opacity: 0.24, emissive: lin(c0.hex), emissiveIntensity: 0.2,
    });
    // the far walls seen through the front: a soft glow that gives the gel body and depth
    cube.inner = new THREE.MeshPhysicalMaterial({
      color: lin(c0.core), emissive: lin(c0.hex), emissiveIntensity: 0.6, roughness: 0.2, envMap, envMapIntensity: 0.6,
      side: THREE.BackSide, transparent: true, opacity: 0.18, depthWrite: false,
    });
    const inside = new THREE.Mesh(geo, cube.inner);
    inside.renderOrder = 1;
    cube.group.add(inside);
    const shell = new THREE.Mesh(geo, cube.shell);
    shell.renderOrder = 3;
    cube.add(shell, { hit: true });

    // "Psych" sits on the front as a decal made from the shell's own front triangles.
    // It shares the shell's vertices, so it squishes with the gel and leaves no seam.
    {
      const pos = geo.attributes.position, src = geo.index.array, idx = [];
      const front = (i) => pos.getZ(i) > 0.05;
      for (let i = 0; i < src.length; i += 3) if (front(src[i]) && front(src[i + 1]) && front(src[i + 2])) idx.push(src[i], src[i + 1], src[i + 2]);
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) + S / 2) / S; uv[i * 2 + 1] = pos.getY(i) / H; }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute("position", pos);
      dg.setAttribute("normal", geo.attributes.normal);
      dg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      dg.setIndex(idx);
      const label = canvasTex(1024, 1024, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w * 0.56, h * 0.5); ctx.rotate(-0.12);
        ctx.font = `${Math.round(w * 0.19)}px Pacifico, "Brush Script MT", cursive`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(60, 30, 90, 0.18)"; ctx.fillText("Psych", 6, 9);
        ctx.fillStyle = "rgba(255, 255, 255, 0.94)"; ctx.fillText("Psych", 0, 0);
        ctx.restore();
      });
      cube.textures = [label];
      const decal = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({
        map: label.tex, transparent: true, depthWrite: false, roughness: 0.35,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }));
      decal.renderOrder = 4;
      decal.frustumCulled = false;
      cube.group.add(decal);
    }

    // glitter floating in the gel, drawn before the skin so it shows through it
    const n = 220, gp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      gp[i * 3] = (Math.random() - 0.5) * S * 0.8;
      gp[i * 3 + 1] = 0.12 + Math.random() * (H - 0.32);
      gp[i * 3 + 2] = (Math.random() - 0.5) * S * 0.8;
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.BufferAttribute(gp, 3));
    const glitter = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.032, transparent: true, opacity: 0.85, depthWrite: false }));
    glitter.renderOrder = 2;
    cube.glitter = glitter;
    cube.add(glitter, { normals: false });
    cube.group.add(blobShadow(2.9, 2.9));
  }
  function setCubeColor(c) {
    cube.glitter.visible = c.glitter;
    cube.shell.color.copy(lin(c.hex));
    cube.shell.emissive.copy(lin(c.hex));
    cube.inner.color.copy(lin(c.core));
    cube.inner.emissive.copy(lin(c.hex));
  }

  // ===================== Bear pancake stack =====================
  const pancake = makeToy({
    name: "Pancake stack", H: 1.24, depth: 0.38, sigma: 0.48, squashMax: 0.34, k: 28, pull: 0.6,
    angle: 0.12, dist: 8.4, top: 1.24, boing: 7, elev: 0.95,
  });
  {
    // bear-head outline in polar form: a round head with two ears
    const N = 128, R = 1.2, ears = [[0.86, 0.92], [-0.86, 0.92]], re = 0.43;
    let rs = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, ux = Math.cos(th), uy = Math.sin(th);
      let best = R;
      for (const [cx, cy] of ears) {
        const b = ux * cx + uy * cy, c = cx * cx + cy * cy - re * re, disc = b * b - c;
        if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc));
      }
      rs[i] = best;
    }
    for (let pass = 0; pass < 4; pass++) {
      const prev = rs.slice();
      for (let i = 0; i < N; i++) {
        let s = 0;
        for (let o = -2; o <= 2; o++) s += prev[(i + o + N) % N];
        rs[i] = s / 5;
      }
    }

    const C = {
      cream: lin(0xf2deba), toast: lin(0xdfa05a), brown: lin(0xb9763c), deep: lin(0xa15c28),
    };
    function slab(T, y0, scale, ox, oz, isTop) {
      const M = 10, K = 7, pos = [], col = [], idx = [], ring = [];
      const e = T / 2;
      const push = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
      const sideColor = (s) => {
        const c = C.cream.clone();
        if (isTop && s > 0) return c.lerp(C.brown, smooth(0.35, 0.95, s));
        return c.lerp(C.toast, smooth(0.55, 1, Math.abs(s)));
      };
      const capColor = (f, top) => (top && isTop ? C.brown.clone().lerp(C.deep, (1 - f) * 0.45) : C.toast.clone());
      for (let j = 0; j <= M; j++) {
        const phi = -Math.PI / 2 + (Math.PI * j) / M;
        const inset = e * (1 - Math.cos(phi)), y = y0 + T / 2 + (T / 2) * Math.sin(phi);
        ring[j] = pos.length / 3;
        const c = sideColor(Math.sin(phi));
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2, rr = rs[i] * scale - inset;
          push(ox + rr * Math.cos(th), y, oz - rr * Math.sin(th), c);
        }
      }
      for (let j = 0; j < M; j++) {
        for (let i = 0; i < N; i++) {
          const a = ring[j] + i, b = ring[j] + ((i + 1) % N), c = ring[j + 1] + ((i + 1) % N), d = ring[j + 1] + i;
          idx.push(a, b, c, a, c, d);
        }
      }
      for (const top of [true, false]) {
        let prev = ring[top ? M : 0];
        const y = top ? y0 + T : y0;
        for (let k = 1; k < K; k++) {
          const f = 1 - k / K, start = pos.length / 3, c = capColor(f, top);
          for (let i = 0; i < N; i++) {
            const th = (i / N) * Math.PI * 2, rr = (rs[i] * scale - e) * f;
            push(ox + rr * Math.cos(th), y, oz - rr * Math.sin(th), c);
          }
          for (let i = 0; i < N; i++) {
            const o0 = prev + i, o1 = prev + ((i + 1) % N), n0 = start + i, n1 = start + ((i + 1) % N);
            if (top) idx.push(o0, o1, n1, o0, n1, n0);
            else idx.push(o0, n1, o1, o0, n0, n1);
          }
          prev = start;
        }
        const ctr = push(ox, y, oz, capColor(0, top));
        for (let i = 0; i < N; i++) {
          const a = prev + i, b = prev + ((i + 1) % N);
          if (top) idx.push(a, b, ctr); else idx.push(a, ctr, b);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    const doughMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    const T = 0.3, step = 0.235;
    const layers = [[1.0, 0.0, 0.0], [1.015, 0.02, -0.01], [0.995, -0.015, 0.02], [1.01, 0.01, 0.0], [0.99, 0.0, 0.01]];
    layers.forEach(([s, ox, oz], k) => {
      pancake.add(new THREE.Mesh(slab(T, k * step, s, ox, oz, k === layers.length - 1), doughMat), { hit: true });
    });
    const topY = (layers.length - 1) * step + T;

    // melting butter pat near the right ear
    const butterMat = new THREE.MeshStandardMaterial({ color: lin(0xfff1a8), roughness: 0.35 });
    const meltMat = new THREE.MeshStandardMaterial({ color: lin(0xffde6e), roughness: 0.18, transparent: true, opacity: 0.94 });
    const melt = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10), meltMat);
    melt.scale.set(0.4, 0.028, 0.33); melt.position.set(0.62, topY + 0.004, -0.5); melt.rotation.y = 0.4;
    pancake.add(bake(melt), { rigid: true });
    const pat = new THREE.Mesh(roundedBox(0.4, 0.13, 0.34, 0.05, 8, 4, 8), butterMat);
    pat.geometry.computeVertexNormals();
    pat.position.set(0.6, topY + 0.07, -0.52); pat.rotation.y = 0.45;
    pancake.add(bake(pat), { rigid: true });

    // an original sleepy-happy face on the top pancake
    const ink = new THREE.MeshStandardMaterial({ color: lin(0x3b2416), roughness: 0.35 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const blushMat = new THREE.MeshBasicMaterial({ color: lin(0xff8fab), transparent: true, opacity: 0.55, depthWrite: false });
    const dot = new THREE.SphereGeometry(1, 16, 10);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(dot, ink);
      eye.scale.set(0.095, 0.03, 0.115); eye.position.set(s * 0.42, topY + 0.008, 0.1);
      pancake.add(bake(eye), { rigid: true });
      const hl = new THREE.Mesh(dot, shine);
      hl.scale.set(0.028, 0.012, 0.028); hl.position.set(s * 0.42 + 0.03, topY + 0.035, 0.07);
      pancake.add(bake(hl), { rigid: true });
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), blushMat);
      blush.rotation.x = -Math.PI / 2; blush.scale.set(1, 0.62, 1); blush.position.set(s * 0.7, topY + 0.006, 0.36);
      pancake.add(bake(blush), { rigid: true });
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.015, 6, 16, Math.PI), ink);
      arc.rotation.x = Math.PI / 2; arc.position.set(s * 0.058, topY + 0.008, 0.3);
      pancake.add(bake(arc), { rigid: true });
    }
    pancake.group.add(blobShadow(3.6, 3.6));
    pancake.top = topY;
  }

  // ===================== Butter stick =====================
  const butter = makeToy({
    name: "Butter stick", H: 0.8, depth: 0.32, sigma: 0.42, squashMax: 0.22, k: 14, pull: 0.6,
    angle: -0.4, dist: 8.4, top: 0.8, boing: 5,
  });
  {
    const W = 3.1, H = 0.8, D = 1.0;
    const geo = roundedBox(W, H, D, 0.2, 44, 10, 14);
    geo.translate(0, H / 2, 0);
    geo.computeVertexNormals();
    setUV(geo, (x, y, z) => [(x + W / 2) / W, (D / 2 - z) / D]);
    const wrap = canvasTex(1024, 330, (ctx, w, h) => {
      ctx.fillStyle = "#f7e391"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1b5aa6";
      ctx.textBaseline = "alphabetic";
      ctx.font = `800 128px "Bricolage Grotesque", "Arial Black", sans-serif`;
      ctx.fillText("4", 178, 205);
      ctx.font = `700 74px "Bricolage Grotesque", "Arial Black", sans-serif`;
      ctx.fillText("oz.", 254, 205);
      ctx.font = `600 34px "Bricolage Grotesque", Arial, sans-serif`;
      ctx.fillText("NET WT. (113 G)", 178, 252);
      ctx.font = `700 40px "Bricolage Grotesque", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("SALTED", 680, 118);
      ctx.font = `800 150px "Bricolage Grotesque", "Arial Black", sans-serif`;
      ctx.fillText("BUTTER", 680, 252);
    });
    butter.textures = [wrap];
    const mat = new THREE.MeshStandardMaterial({ map: wrap.tex, roughness: 0.72, metalness: 0 });
    butter.add(new THREE.Mesh(geo, mat), { hit: true });
    butter.group.add(blobShadow(4.2, 1.9));
  }

  const TOYS = { cube, pancake, butter };
  let toy = cube;

  // ---------- state ----------
  const S = {
    a: 0, aV: 0, s: 0, sV: 0, j: 0, jV: 0,
    D: new THREE.Vector3(), DV: new THREE.Vector3(), Dt: new THREE.Vector3(), pulling: false,
    P: new THREE.Vector3(0, 1.5, 0), nP: new THREE.Vector3(0, 1, 0), P0: new THREE.Vector3(),
    pressing: false, pressT: 0,
    rotY: cube.angle, rotV: 0, angle: cube.angle, spinning: false,
    dirty: true,
  };
  let stress = 100, squishes = 0, t = 0;

  function frameCamera() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = toy.dist * (camera.aspect < 1 ? 1.45 : camera.aspect < 1.4 ? 1.12 : 1);
    const dir = new THREE.Vector3(0, toy.elev || 0.62, 1).normalize();
    const target = new THREE.Vector3(0, toy.H * 0.42, 0);
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }

  function deform() {
    const { a, s, j, P, nP, D } = S;
    const pull = D.lengthSq() > 1e-6;
    const sig2 = 2 * toy.sigma ** 2, sig2b = 2 * (toy.sigma * 1.4) ** 2, H = toy.H, depth = toy.depth;
    const sy = 1 - toy.squashMax * s + 0.07 * j, sxz = 1 + toy.squashMax * s * 0.5 - 0.035 * j;
    for (const d of toy.deformables) {
      const pos = d.geo.attributes.position.array, base = d.base, nb = d.nBase;
      if (d.center) {
        // move the whole decoration by the displacement of the surface at its center
        const c = d.center;
        let x = c.x, y = c.y, z = c.z;
        const dx = x - P.x, dy = y - P.y, dz = z - P.z, d2 = dx * dx + dy * dy + dz * dz;
        if (a > 1e-4) {
          const push = depth * a * Math.exp(-d2 / sig2) * clamp(nP.y + 0.45, 0, 1);
          x -= nP.x * push; y -= nP.y * push; z -= nP.z * push;
        }
        if (pull) {
          const w2 = Math.exp(-((c.x - S.P0.x) ** 2 + (c.y - S.P0.y) ** 2 + (c.z - S.P0.z) ** 2) / sig2b);
          x += D.x * w2; y += D.y * w2; z += D.z * w2;
        }
        const ox = x - c.x, oy = y - c.y, oz = z - c.z;
        for (let i = 0; i < base.length; i += 3) {
          pos[i] = (base[i] + ox) * sxz; pos[i + 1] = Math.max(0, base[i + 1] + oy) * sy; pos[i + 2] = (base[i + 2] + oz) * sxz;
        }
        d.geo.attributes.position.needsUpdate = true;
        continue;
      }
      for (let i = 0; i < base.length; i += 3) {
        let x = base[i], y = base[i + 1], z = base[i + 2];
        const dx = x - P.x, dy = y - P.y, dz = z - P.z, d2 = dx * dx + dy * dy + dz * dz;
        if (a > 1e-4) {
          const w = Math.exp(-d2 / sig2);
          const facing = nb ? clamp(nb[i] * nP.x + nb[i + 1] * nP.y + nb[i + 2] * nP.z + 0.45, 0, 1) : 1;
          const push = depth * a * w * facing;
          x -= nP.x * push; y -= nP.y * push; z -= nP.z * push;
          const rr = Math.hypot(x, z) || 1, bulge = depth * a * 0.22 * (1 - w) * Math.min(1, (y / H) * 1.6);
          x += (x / rr) * bulge; z += (z / rr) * bulge;
        }
        if (pull) {
          const w2 = Math.exp(-((x - S.P0.x) ** 2 + (y - S.P0.y) ** 2 + (z - S.P0.z) ** 2) / sig2b);
          x += D.x * w2; y += D.y * w2; z += D.z * w2;
        }
        pos[i] = x * sxz; pos[i + 1] = Math.max(0, y) * sy; pos[i + 2] = z * sxz;
      }
      d.geo.attributes.position.needsUpdate = true;
      if (d.normals) d.geo.computeVertexNormals();
    }
  }

  function setStress(v) {
    const before = stress;
    stress = clamp(v, 0, 100);
    meterBar.style.setProperty("--p", stress / 100);
    meterBar.setAttribute("aria-valuenow", Math.round(stress));
    meterText.textContent = `${Math.round(stress)}%`;
    if (before > 0 && stress === 0) {
      msg.textContent = `All squished out after ${squishes} squishes. Feel a little lighter?`;
      resetBtn.hidden = false;
    }
  }

  const DT = 1 / 60;
  function step() {
    t += DT;
    const rm = reduceMotion.matches;
    // dent: quick to press in, slow to ooze back (each toy has its own rebound)
    const aT = S.pressing && !S.pulling ? 1 : 0;
    const ka = aT > S.a ? 70 : toy.k;
    S.aV += (-ka * (S.a - aT) - 2 * Math.sqrt(ka) * 1.05 * S.aV) * DT;
    S.a = clamp(S.a + S.aV * DT, 0, 1.1);
    const sT = S.pressing ? Math.min(1, (performance.now() - S.pressT) / 1600) : 0;
    const ks = sT > S.s ? 30 : toy.k;
    S.sV += (-ks * (S.s - sT) - 2 * Math.sqrt(ks) * 1.05 * S.sV) * DT;
    S.s = clamp(S.s + S.sV * DT, -0.2, 1.1);
    const kd = S.pulling ? 60 : toy.k * 1.4;
    S.DV.addScaledVector(S.D.clone().sub(S.pulling ? S.Dt : new THREE.Vector3()), -kd * DT);
    S.DV.multiplyScalar(1 - Math.min(0.5, 2 * Math.sqrt(kd) * 0.6 * DT));
    S.D.addScaledVector(S.DV, DT);
    if (!S.pulling && S.D.lengthSq() < 1e-6 && S.DV.lengthSq() < 1e-6) S.D.set(0, 0, 0);
    S.jV += (-130 * S.j - 5 * S.jV) * DT;
    S.j += S.jV * DT;
    if (rm) { S.j = 0; S.jV = 0; }
    if (!S.spinning) {
      const target = S.angle + (rm ? 0 : Math.sin(t * 0.45) * 0.1);
      S.rotV += (-10 * (S.rotY - target) - 5 * S.rotV) * DT;
      S.rotY += S.rotV * DT;
    }
    if (S.pressing) {
      const relief = S.a * 0.05 + Math.min(1, S.D.length() / toy.pull) * 0.06 + S.s * 0.02;
      if (stress > 0) setStress(stress - relief);
    }
    const active = Math.abs(S.a) + Math.abs(S.aV) + Math.abs(S.s) + Math.abs(S.sV) + Math.abs(S.j) + Math.abs(S.jV) + S.D.length() + S.DV.length();
    if (active > 1e-4) { S.dirty = true; return true; }
    if (S.dirty) { S.a = S.s = S.j = 0; S.D.set(0, 0, 0); return true; }
    return false;
  }

  let running = false, raf = 0, last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let acc = Math.min(0.1, (now - last) / 1000 || DT);
    last = now;
    let changed = false;
    while (acc > 0.0001) { changed = step() || changed; acc -= DT; }
    if (changed) { deform(); if (S.a + S.s + Math.abs(S.j) + S.D.length() < 1e-4) S.dirty = false; }
    toy.group.rotation.y = S.rotY;
    renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(stage);
  new ResizeObserver(() => { frameCamera(); renderer.render(scene, camera); }).observe(host);

  function show(name) {
    // settle the old toy before switching
    S.a = S.aV = S.s = S.sV = S.j = S.jV = 0;
    S.D.set(0, 0, 0); S.DV.set(0, 0, 0); S.pulling = false; S.pressing = false;
    deform();
    toy.group.visible = false;
    toy = TOYS[name];
    toy.group.visible = true;
    S.angle = S.rotY = toy.angle;
    S.dirty = true;
    renderer.domElement.setAttribute("aria-label", `${toy.name}, a 3D squishy stress toy. Press, stretch and spin it.`);
    frameCamera();
    if (!reduceMotion.matches) S.jV = 4;
    renderer.render(scene, camera);
  }

  // ---------- input ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const tmp = new THREE.Vector3();
  function aim(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function hitToy(e) {
    aim(e);
    const hits = ray.intersectObjects(toy.hit, false);
    if (!hits.length) return null;
    const h = hits[0];
    return { local: toy.group.worldToLocal(h.point.clone()), normal: h.face ? h.face.normal.clone() : new THREE.Vector3(0, 1, 0), world: h.point.clone() };
  }

  let ptr = null;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const h = hitToy(e);
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, onToy: !!h };
    if (h) {
      S.P.copy(h.local); S.nP.copy(h.normal).normalize(); S.P0.copy(h.local);
      ptr.world = h.world;
      S.pressing = true; S.pressT = performance.now(); S.pulling = false;
      stage.classList.add("is-pressing");
    } else {
      S.spinning = true;
    }
  });
  el.addEventListener("pointermove", (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    if (Math.hypot(dx, dy) > 6) ptr.moved = true;
    if (!ptr.onToy) {
      S.rotY += (e.clientX - (ptr.lx ?? ptr.x)) * 0.011;
      S.rotV = (e.clientX - (ptr.lx ?? ptr.x)) * 0.6;
      ptr.lx = e.clientX;
      return;
    }
    if (Math.hypot(dx, dy) > 26) {
      // stretch: pull the pinched spot toward the pointer
      S.pulling = true;
      aim(e);
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(tmp).negate(), ptr.world);
      const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
      if (hit) {
        const local = toy.group.worldToLocal(hit);
        S.Dt.copy(local.sub(S.P0));
        if (S.Dt.length() > toy.pull) S.Dt.setLength(toy.pull);
      }
    }
  });
  function release(e) {
    if (!ptr || (e && e.pointerId !== ptr.id)) return;
    const quick = performance.now() - ptr.t < 220 && !ptr.moved;
    if (ptr.onToy) {
      S.pressing = false; S.pulling = false;
      stage.classList.remove("is-pressing");
      if (quick) boing();
      else countSquish();
    } else {
      S.spinning = false;
      S.angle = S.rotY;
    }
    ptr = null;
  }
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);

  function boing() {
    if (!reduceMotion.matches) S.jV = toy.boing;
    S.aV += 3;
    squishes++;
    setStress(stress - 0.8);
  }
  function countSquish() {
    squishes++;
    if (stress > 0 && squishes % 3 === 1) {
      const lines = ["So squishy.", "Mmm, satisfying.", "Let it all out.", "Squeeze, then let go.", "Breathe out as you squish."];
      msg.textContent = lines[Math.floor(squishes / 3) % lines.length];
    }
  }

  // keyboard: hold Space to squish from the top, Enter to boing, arrows to turn
  stage.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); boing(); }
    else if (e.key === " " && !e.repeat) {
      e.preventDefault();
      S.P.set(0, toy.top, 0); S.nP.set(0, 1, 0);
      S.pressing = true; S.pressT = performance.now();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      S.angle += e.key === "ArrowLeft" ? -0.3 : 0.3;
    }
  });
  stage.addEventListener("keyup", (e) => {
    if (e.key === " " && S.pressing) { e.preventDefault(); S.pressing = false; countSquish(); }
  });

  // ---------- picker ----------
  picker.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-squish]");
    if (!btn) return;
    picker.querySelectorAll("[data-squish]").forEach((x) => x.setAttribute("aria-pressed", x === btn ? "true" : "false"));
    swatches.hidden = btn.dataset.squish !== "cube";
    show(btn.dataset.squish);
  });
  swatches.innerHTML = CUBE_COLORS.map((c, i) => `
    <button type="button" class="squish-swatch" data-c="${i}" aria-pressed="${i === 0}" aria-label="${c.label}"${c.glitter ? " data-glitter" : ""} style="--a:${c.css[0]};--b:${c.css[1]}"></button>`).join("");
  swatches.addEventListener("click", (e) => {
    const s = e.target.closest(".squish-swatch");
    if (!s) return;
    setCubeColor(CUBE_COLORS[+s.dataset.c]);
    swatches.querySelectorAll(".squish-swatch").forEach((x) => x.setAttribute("aria-pressed", x === s ? "true" : "false"));
    renderer.render(scene, camera);
  });
  resetBtn.addEventListener("click", () => {
    squishes = 0;
    setStress(100);
    resetBtn.hidden = true;
    msg.textContent = "Fresh stress meter. Squish away.";
  });

  // redraw printed textures once the brand fonts arrive
  Promise.all([
    document.fonts?.load('120px "Pacifico"'),
    document.fonts?.load('800 120px "Bricolage Grotesque"'),
  ]).catch(() => {}).then(() => {
    for (const ty of Object.values(TOYS)) (ty.textures || []).forEach((x) => x.redraw());
    renderer.render(scene, camera);
  });

  stage.classList.add("is-3d");
  setStress(100);
  show("cube");
  return true;
}
