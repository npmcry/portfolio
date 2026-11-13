// A pastel 3D keyboard with frosted ice keys. Each key dips and lights up as the commit line types.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function createKeyboard(host) {
  const THREE = window.THREE;
  if (!THREE || !host) return null;
  let R;
  try { R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch { return null; }
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  R.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(R.domElement);
  const S = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 100);
  cam.position.set(0, 15.5, 15); cam.lookAt(0.3, -0.2, -0.1);
  S.add(new THREE.HemisphereLight(0xffffff, 0x9a8fa6, 0.56));
  const dl = new THREE.DirectionalLight(0xfff6ee, 0.62); dl.position.set(-6, 9, 3); S.add(dl);
  const keys = {};
  let kb = null;
  const white = new THREE.Color(0xffffff);

  function build() {
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
function rr(w,d,r){const s=new THREE.Shape(),x=-w/2,y=-d/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+d-r);s.quadraticCurveTo(x+w,y+d,x+w-r,y+d);s.lineTo(x+r,y+d);s.quadraticCurveTo(x,y+d,x,y+d-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
function slab(w,d,h,r,bev){const g=new THREE.ExtrudeGeometry(rr(w,d,r),{depth:h,bevelEnabled:true,bevelSize:bev,bevelThickness:bev,bevelSegments:5,curveSegments:10});g.rotateX(-Math.PI/2);return g}
// a real keycap profile: wide at the base, narrower at the top, soft edges
function cap(w,d){const h=.46,inset=.05;const g=slab(w-inset*2-.05,d-inset*2-.05,h,.05,.03);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),t=1-Math.min(1,Math.max(0,y/h));const kx=1+t*(inset*2/(w-inset*2)),kz=1+t*(inset*2/(d-inset*2));p.setX(i,p.getX(i)*kx);p.setZ(i,p.getZ(i)*kz+ t*.03);}
  g.computeVertexNormals();const col=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const t=Math.min(1,Math.max(0,p.getY(i)/h));col[i*3]=1-.34*t;col[i*3+1]=1-.14*t;col[i*3+2]=1;}g.setAttribute('color',new THREE.BufferAttribute(col,3));return g}
kb=new THREE.Group();kb.rotation.y=-.16;
const U=.72, W=15*U, D=5*U;
// case: cream-pink tray with a raised rim
const caseM=new THREE.MeshStandardMaterial({color:lin(0xf7eadf),roughness:.55});
const base=new THREE.Mesh(slab(W+1.1,D+2.0,.55,.42,.08),caseM);base.position.set(0,-.72,-.4);kb.add(base);
const chan=new THREE.Mesh(slab(W+.3,.62,.05,.08,.01),new THREE.MeshStandardMaterial({color:lin(0xe7d3c6),roughness:.7}));chan.position.set(0,-.14,-D/2-.72);kb.add(chan);
const barGlow=new THREE.Mesh(new THREE.PlaneGeometry(W+.1,.2),new THREE.MeshBasicMaterial({color:0xffffff}));barGlow.rotation.x=-Math.PI/2;barGlow.position.set(0,-.07,-D/2-.72);kb.add(barGlow);
const rose=new THREE.Mesh(slab(W+.3,.07,.3,.02,.01),new THREE.MeshStandardMaterial({color:lin(0xf6b0ac),roughness:.3,metalness:.2,emissive:lin(0xf7a9a6),emissiveIntensity:.2}));rose.position.set(0,-.12,-D/2-1.0);kb.add(rose);
const clearBar=new THREE.Mesh(slab(W+.3,.5,.26,.04,.02),new THREE.MeshPhysicalMaterial({color:lin(0xffffff),transparent:true,opacity:.14,roughness:0,clearcoat:1,clearcoatRoughness:0,depthWrite:false}));clearBar.position.set(0,-.1,-D/2-.72);clearBar.renderOrder=5;kb.add(clearBar);
[-.25,.25].forEach(dz=>{const e=new THREE.Mesh(new THREE.BoxGeometry(W+.3,.012,.02),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9}));e.position.set(0,.19,-D/2-.72+dz);kb.add(e)});
const sheen=new THREE.Mesh(new THREE.PlaneGeometry(W*.5,.1),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35}));sheen.rotation.x=-Math.PI/2;sheen.position.set(-W*.12,.2,-D/2-.74);kb.add(sheen);
const plate=new THREE.Mesh(slab(W+.16,D+.16,.06,.06,.015),new THREE.MeshStandardMaterial({color:lin(0xe9dccf),roughness:.7}));plate.position.y=-.1;kb.add(plate);
const glow=new THREE.Mesh(new THREE.PlaneGeometry(W+.1,D+.1),new THREE.MeshBasicMaterial({color:0xcdd6e6}));glow.rotation.x=-Math.PI/2;glow.position.y=-.005;kb.add(glow);
function legend(txt,col){const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.fillStyle=col;x.font=(txt.length>1?'600 58px':'700 92px')+' "IBM Plex Sans", sans-serif';x.textAlign='left';x.textBaseline='top';x.fillText(txt,30,26);return new THREE.CanvasTexture(c)}
// little original doodles that sit inside the clear keys
function doodle(kind){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.translate(128,128);x.lineJoin='round';
  const P=['#ffc2d4','#ffe29a','#b9a5ff','#9ff0d4','#a8d8ff'];
  if(kind==0){x.fillStyle=P[1];x.beginPath();for(let i=0;i<10;i++){const r=i%2?34:78,a=-Math.PI/2+i*Math.PI/5;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.closePath();x.fill()}
  if(kind==1){x.fillStyle=P[0];x.beginPath();x.moveTo(0,60);x.bezierCurveTo(-110,-20,-50,-100,0,-36);x.bezierCurveTo(50,-100,110,-20,0,60);x.fill()}
  if(kind==2){x.fillStyle=P[1];x.beginPath();x.arc(0,0,70,0,7);x.fill();x.globalCompositeOperation='destination-out';x.beginPath();x.arc(30,-16,58,0,7);x.fill()}
  if(kind==3){x.fillStyle='#ffffff';[[ -40,14,36],[0,-14,46],[44,12,34],[0,24,40]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,7);x.fill()})}
  if(kind==4){x.fillStyle=P[2];x.beginPath();x.moveTo(0,-80);x.quadraticCurveTo(12,-12,80,0);x.quadraticCurveTo(12,12,0,80);x.quadraticCurveTo(-12,12,-80,0);x.quadraticCurveTo(-12,-12,0,-80);x.fill()}
  if(kind==5){x.fillStyle=P[3];x.beginPath();x.arc(0,10,52,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=12;x.beginPath();x.ellipse(0,10,88,24,-.3,0,7);x.stroke()}
  return new THREE.CanvasTexture(c)}
const doodles=[0,1,2,3,4,5].map(doodle);
// soft round light for the LEDs
const ledC=document.createElement('canvas');ledC.width=ledC.height=128;{const x=ledC.getContext('2d');const g=x.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.45,'rgba(170,218,255,.55)');g.addColorStop(1,'rgba(120,185,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}
const ledT=new THREE.CanvasTexture(ledC);
const rows=[
 [['esc',1,'c'],['1',1],['2',1],['3',1],['4',1,'c'],['5',1],['6',1],['7',1],['8',1,'c'],['9',1],['0',1],['-',1],['=',1],['back',2,'c']],
 [['tab',1.5,'c'],['Q',1],['W',1,'c'],['E',1],['R',1],['T',1],['Y',1],['U',1],['I',1],['O',1],['P',1],['[',1],[']',1,'c'],['\\',1.5,'c']],
 [['caps',1.75,'c'],['A',1],['S',1],['D',1],['F',1],['G',1,'c'],['H',1],['J',1],['K',1,'c'],['L',1],[';',1],["'",1],['enter',2.25,'c']],
 [['shift',2.25,'c'],['Z',1],['X',1],['C',1],['V',1,'c'],['B',1],['N',1],['M',1],[',',1],['.',1,'c'],['/',1],['shift',2.75,'c']],
 [['ctrl',1.25,'c'],['alt',1.25,'c'],['cmd',1.25,'c'],['',6.25],['cmd',1.25,'c'],['alt',1.25,'c'],['ctrl',1.25,'c']]];
const pressed=new Set();
const tints=[0xfdfbf9,0xfdfbf9,0xfbe3e8,0xfdfbf9,0xfdfbf9,0xfdf6da,0xfdfbf9,0xfbe3e8,0xfdfbf9,0xfdfbf9,0xfbe3e8].map(lin);
const frost=()=>new THREE.MeshPhysicalMaterial({color:lin(0xf4faff),vertexColors:true,transparent:true,opacity:.7,roughness:.32,clearcoat:1,clearcoatRoughness:.18,emissive:lin(0x8ec8ff),emissiveIntensity:.42,depthWrite:false});
const housingM=new THREE.MeshPhysicalMaterial({color:lin(0xffffff),transparent:true,opacity:.75,roughness:.3});
const stemCols=[0xff9fbb,0x8fc8ff,0xb9a5ff].map(c=>new THREE.MeshStandardMaterial({color:lin(c),roughness:.4}));
let n=0;
rows.forEach((row,ri)=>{let x=-W/2;row.forEach(([lab,w,kind],ci)=>{const kw=w*U;const isP=pressed.has(lab);const clear=kind==='c';n++;
  const g=new THREE.Group();g.position.set(x+kw/2,.02,(ri-2)*U);kb.add(g);const keyRec={g,clear,down:0};(keys[lab===''?' ':lab.toUpperCase()] ||= []).push(keyRec);
  if(clear){
    // the switch you can see through the frosted cap: LED, housing and a cross stem
    const led=new THREE.Mesh(new THREE.PlaneGeometry(kw*1.12,U*1.2),new THREE.MeshBasicMaterial({map:ledT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));led.rotation.x=-Math.PI/2;led.position.y=.012;g.add(led);
    const lit=new THREE.Mesh(new THREE.BoxGeometry(kw*.78,.3,U*.66),new THREE.MeshBasicMaterial({color:0xd9efff,transparent:true,opacity:.5,depthWrite:false}));lit.position.y=.17;
    const core=new THREE.Mesh(new THREE.BoxGeometry(kw*.5,.06,U*.4),new THREE.MeshBasicMaterial({color:0xffffff}));core.position.y=.03;g.add(core);g.add(lit);
    const hs=new THREE.Mesh(new THREE.BoxGeometry(.4,.16,.4),housingM);hs.position.y=.09;g.add(hs);
    const sm=stemCols[n%3];const s1=new THREE.Mesh(new THREE.BoxGeometry(.2,.14,.06),sm);s1.position.y=.22;g.add(s1);
    const s2=new THREE.Mesh(new THREE.BoxGeometry(.06,.14,.2),sm);s2.position.y=.22;g.add(s2);
    if(kw>1.2){[-1,1].forEach(d=>{const st=new THREE.Mesh(new THREE.BoxGeometry(.12,.14,.24),housingM);st.position.set(d*kw*.34,.08,0);g.add(st)})}
  }
  const m=clear?frost():new THREE.MeshStandardMaterial({color:lab===''?lin(0xfdfbf9):tints[(ri*7+ci*3)%tints.length],roughness:.5,emissive:lin(0xffe6ef),emissiveIntensity:0});
  const k=new THREE.Mesh(cap(kw-.025,U-.025),m);keyRec.m=m;keyRec.e0=m.emissiveIntensity||0;keyRec.ec=m.emissive?m.emissive.clone():null;k.renderOrder=clear?2:1;g.add(k);
  if(clear){const dz=Math.min(kw*.5,U*.5);const d=new THREE.Mesh(new THREE.PlaneGeometry(dz,dz),new THREE.MeshBasicMaterial({map:doodles[n%6],transparent:true,depthWrite:false,opacity:.95}));d.rotation.x=-Math.PI/2;d.position.set(kw>1.2?kw*.18:.04,.492,.04);d.renderOrder=3;g.add(d)}
  if(lab===''){ // spacebar gets a row of tiny doodles
    [-2,-1,0,1,2].forEach((i,j)=>{const d=new THREE.Mesh(new THREE.PlaneGeometry(.26,.26),new THREE.MeshBasicMaterial({map:doodles[[4,0,1,0,4][j]],transparent:true,depthWrite:false}));d.rotation.x=-Math.PI/2;d.position.set(i*.62,.492,0);d.renderOrder=3;g.add(d)})}
  if(lab){const lw=U*.66;const lp=new THREE.Mesh(new THREE.PlaneGeometry(lw,lw),new THREE.MeshBasicMaterial({map:legend(lab,clear?'#5b6f8c':'#3f3a45'),transparent:true,depthWrite:false}));lp.rotation.x=-Math.PI/2;lp.position.set(-kw/2+lw/2+.1,.494,-.0);lp.renderOrder=4;g.add(lp)}
  
  x+=kw})});
// case details: corner screws and a small badge
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const sc2=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.03,16),new THREE.MeshStandardMaterial({color:lin(0xd8c6b8),roughness:.3,metalness:.4}));sc2.position.set(a*(W/2+.22),-.1,b*(D/2+.2)-(b<0?.5:0));kb.add(sc2)});
const sc=document.createElement('canvas');sc.width=sc.height=256;const sx=sc.getContext('2d');const sg=sx.createRadialGradient(128,128,10,128,128,128);sg.addColorStop(0,'rgba(0,0,0,.6)');sg.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=sg;sx.fillRect(0,0,256,256);
const sh=new THREE.Mesh(new THREE.PlaneGeometry(17,9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=-1.0;kb.add(sh);

    return kb;
  }

  function resize() {
    const w = host.clientWidth || 600, h = host.clientHeight || 450;
    R.setSize(w, h, false);
    cam.aspect = w / h;
    const k = w / h < 1.2 ? 1.2 : 0.92;
    cam.position.set(0, 15.5 * k, 15 * k);
    cam.lookAt(-0.35, -0.5, 0.4);
    cam.updateProjectionMatrix();
    render();
  }

  // pointer tilt
  let tx = 0, ty = 0, rx = 0, ry = 0;
  host.parentElement?.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = host.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5); ty = ((e.clientY - r.top) / r.height - 0.5);
  }, { passive: true });

  let active = false, raf = 0, last = performance.now();
  const anim = [];
  function render() { if (kb) R.render(S, cam); }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    rx += (tx - rx) * 0.06; ry += (ty - ry) * 0.06;
    if (kb) { kb.rotation.y = -0.16 + rx * 0.18; kb.rotation.x = ry * 0.08; }
    for (let i = anim.length - 1; i >= 0; i--) {
      const k = anim[i];
      k.t += dt;
      const p = k.t < 0.06 ? k.t / 0.06 : Math.max(0, 1 - (k.t - 0.06) / 0.28);
      k.g.position.y = 0.02 - 0.12 * p;
      if (k.m.emissive) { k.m.emissive.copy(k.ec || white).lerp(white, p * 0.9); k.m.emissiveIntensity = k.e0 + (k.clear ? 0.6 : 0.45) * p; }
      if (k.t > 0.36) { k.g.position.y = 0.02; if (k.m.emissive) { k.m.emissive.copy(k.ec || white); k.m.emissiveIntensity = k.e0; } anim.splice(i, 1); }
    }
    render();
    if (active) raf = requestAnimationFrame(frame);
  }

  document.fonts.ready.then(() => {
    build();
    // solid caps need an emissive channel so they can light up when pressed
    Object.values(keys).flat().forEach((k) => { if (!k.m.emissive) return; if (!k.ec) k.ec = k.m.emissive.clone(); });
    S.add(kb);
    new ResizeObserver(resize).observe(host);
    resize();
  });

  return {
    press(ch) {
      if (!kb || reduceMotion.matches) return;
      const list = keys[ch === " " ? " " : String(ch).toUpperCase()] || (ch === ":" ? keys[";"] : null);
      if (!list) return;
      const k = list[0];
      const existing = anim.find((a) => a === k);
      k.t = 0;
      if (!existing) anim.push(k);
    },
    setActive(on) {
      active = on;
      if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
  };
}
