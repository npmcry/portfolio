// Footer galaxy: a soft spiral of round, glowing stars (custom point shader, additive light).
export function initGalaxy() {
  const container = document.getElementById("galaxyContainer");
  const THREE = window.THREE;
  if (!container || !THREE) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);

  const narrow = window.innerWidth < 700;
  const COUNT = narrow ? 5000 : 11000, ARMS = 3, R = 9;
  const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), size = new Float32Array(COUNT), seed = new Float32Array(COUNT);
  const inner = new THREE.Color(0xffe6c7), mid = new THREE.Color(0xff9fd0), outer = new THREE.Color(0x9f8cff), c = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const r = Math.pow(Math.random(), 1.6) * R;
    const arm = ((i % ARMS) / ARMS) * Math.PI * 2;
    const spin = r * 0.55;
    const scatter = (k) => Math.pow(Math.random(), 2.6) * (Math.random() < 0.5 ? 1 : -1) * k * (0.3 + r * 0.12);
    pos[i * 3] = Math.cos(arm + spin) * r + scatter(1);
    pos[i * 3 + 1] = scatter(0.45);
    pos[i * 3 + 2] = Math.sin(arm + spin) * r + scatter(1);
    const t = r / R;
    if (t < 0.45) c.copy(inner).lerp(mid, t / 0.45);
    else c.copy(mid).lerp(outer, (t - 0.45) / 0.55);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = (Math.random() * 1.4 + 0.5) * (1.25 - t * 0.5);
    seed[i] = Math.random() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `
      attribute float size; attribute float seed;
      uniform float uTime; uniform float uScale;
      varying vec3 vColor; varying float vTw;
      void main() {
        vColor = color;
        vTw = 0.7 + 0.3 * sin(uTime * 1.5 + seed * 3.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a;
        gl_FragColor = vec4(vColor * vTw, a * 0.9);
      }`,
  });
  const galaxy = new THREE.Points(geo, mat);
  galaxy.rotation.x = 1.05;
  galaxy.position.x = 2.5;
  scene.add(galaxy);

  // soft glowing core
  const glowTex = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const x = cv.getContext("2d");
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,236,214,0.9)"); g.addColorStop(0.3, "rgba(255,170,210,0.35)"); g.addColorStop(1, "rgba(160,140,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  })();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.scale.setScalar(6);
  core.position.x = 2.5;
  scene.add(core);

  function resize() {
    const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0, w / h < 1 ? 26 : 19);
    camera.updateProjectionMatrix();
    mat.uniforms.uScale.value = renderer.getPixelRatio() * Math.min(h, 900) / 60;
  }
  new ResizeObserver(resize).observe(container);
  resize();
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  let raf = 0, running = false, t = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduceMotion.matches) { t += dt; galaxy.rotation.y += dt * 0.05; }
    mat.uniforms.uTime.value = t;
    renderer.render(scene, camera);
  }
  const start = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(container);
  renderer.render(scene, camera);
}
