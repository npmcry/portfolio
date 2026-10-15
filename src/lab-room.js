// A little isometric lab that switches its lights on as you walk in.
// Pure SVG + CSS: floor tiles, glowing specimen tube, consoles, hanging vials, wall panels.
const O = [200, 110];                      // back corner of the room on screen
const P = (u, v, z = 0) => [O[0] + u - v, O[1] + 0.5 * u + 0.5 * v - z];
const pts = (list) => list.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");

function box(u, v, w, d, h, cls) {
  const top = [P(u, v, h), P(u + w, v, h), P(u + w, v + d, h), P(u, v + d, h)];
  const left = [P(u, v + d, 0), P(u + w, v + d, 0), P(u + w, v + d, h), P(u, v + d, h)];
  const right = [P(u + w, v, 0), P(u + w, v + d, 0), P(u + w, v + d, h), P(u + w, v, h)];
  return `<g class="${cls}"><polygon class="f-top" points="${pts(top)}"/><polygon class="f-left" points="${pts(left)}"/><polygon class="f-right" points="${pts(right)}"/></g>`;
}
// a quad on the front-left face (v + d) of a box, between u0..u1 and z0..z1
const faceL = (v, u0, u1, z0, z1, cls) => `<polygon class="${cls}" points="${pts([P(u0, v, z0), P(u1, v, z0), P(u1, v, z1), P(u0, v, z1)])}"/>`;
// quads on the back walls
const wallL = (v0, v1, z0, z1, cls) => `<polygon class="${cls}" points="${pts([P(0, v0, z0), P(0, v1, z0), P(0, v1, z1), P(0, v0, z1)])}"/>`;
const wallR = (u0, u1, z0, z1, cls) => `<polygon class="${cls}" points="${pts([P(u0, 0, z0), P(u1, 0, z0), P(u1, 0, z1), P(u0, 0, z1)])}"/>`;

export function labRoomSVG() {
  const S = 160, H = 140;
  let tiles = "";
  for (let k = 1; k < 5; k++) {
    tiles += `<polyline points="${pts([P(k * 32, 0), P(k * 32, S)])}"/><polyline points="${pts([P(0, k * 32), P(S, k * 32)])}"/>`;
  }
  let panels = "";
  for (let k = 0; k < 4; k++) panels += wallR(14 + k * 36, 42 + k * 36, 60, 122, "panel");
  for (let k = 0; k < 4; k++) panels += wallR(18 + k * 36, 38 + k * 36, 66, 72, "panel-slot");
  for (let k = 0; k < 2; k++) panels += wallL(70 + k * 40, 100 + k * 40, 8, 48, "vent");
  // the specimen tube in the middle of the floor
  const [tx, ty] = P(92, 86);
  const tube = `
    <g class="tube" transform="translate(${tx},${ty})">
      <ellipse class="tube-base" cx="0" cy="0" rx="30" ry="15"/>
      <rect class="tube-base" x="-30" y="-16" width="60" height="16"/>
      <ellipse class="tube-base-top" cx="0" cy="-16" rx="30" ry="15"/>
      <clipPath id="tubeClip"><rect x="-24" y="-112" width="48" height="98"/></clipPath>
      <g clip-path="url(#tubeClip)">
        <rect class="tube-liquid" x="-24" y="-112" width="48" height="98"/>
        <circle class="tube-bub b1" cx="-8" cy="-20" r="3"/><circle class="tube-bub b2" cx="6" cy="-24" r="2.4"/>
        <circle class="tube-bub b3" cx="12" cy="-18" r="2"/><circle class="tube-bub b4" cx="-2" cy="-22" r="2.6"/>
      </g>
      <rect class="tube-glass" x="-24" y="-112" width="48" height="96" rx="4"/>
      <ellipse class="tube-cap" cx="0" cy="-112" rx="27" ry="12"/>
      <rect class="tube-cap" x="-27" y="-130" width="54" height="18" rx="3"/>
      <ellipse class="tube-cap-top" cx="0" cy="-130" rx="27" ry="12"/>
      <path class="tube-shine" d="M-16 -100 V-30"/>
    </g>`;
  // consoles against the walls
  const consoles = box(10, 18, 34, 26, 38, "console") + faceL(44, 14, 40, 22, 34, "screen s-green") +
    box(52, 10, 30, 24, 34, "console") + faceL(34, 56, 78, 18, 30, "screen s-green s2");
  const frontConsole = box(122, 108, 26, 30, 36, "console") + `<polygon class="screen s-pink" points="${pts([P(148, 112, 20), P(148, 132, 20), P(148, 132, 32), P(148, 112, 32)])}"/>`;
  // hanging vials over the consoles
  const vial = (u, v, liq) => {
    const [x, y] = P(u, v, 118);
    return `<g class="vial"><line x1="${x}" y1="${y - 26}" x2="${x}" y2="${y - 6}"/><rect class="vial-glass" x="${x - 6}" y="${y - 6}" width="12" height="34" rx="4"/><rect class="vial-liq ${liq}" x="${x - 5}" y="${y + 10}" width="10" height="17" rx="3"/></g>`;
  };
  // cables snaking from consoles to the tube
  const c1a = P(40, 44), c1b = P(92, 86), c2a = P(136, 108);
  const cables = `<path class="cable" d="M${c1a} C${c1a[0] + 30},${c1a[1] + 30} ${c1b[0] - 50},${c1b[1] + 10} ${c1b[0] - 26},${c1b[1] + 4}"/>
    <path class="cable" d="M${c2a} C${c2a[0] - 20},${c2a[1] + 18} ${c1b[0] + 40},${c1b[1] + 16} ${c1b[0] + 26},${c1b[1] + 4}"/>`;
  const grate = `<polygon class="grate" points="${pts([P(110, 140), P(140, 140), P(140, 156), P(110, 156)])}"/>`;
  return `
  <svg class="lab-room" viewBox="20 -50 360 340" role="img" aria-label="An isometric lab room switching its lights on">
    <defs>
      <radialGradient id="glowPink"><stop offset="0" stop-color="#ff9fd0" stop-opacity=".75"/><stop offset="1" stop-color="#ff9fd0" stop-opacity="0"/></radialGradient>
      <radialGradient id="glowMint"><stop offset="0" stop-color="#9ff0d4" stop-opacity=".8"/><stop offset="1" stop-color="#9ff0d4" stop-opacity="0"/></radialGradient>
    </defs>
    <polygon class="floor" points="${pts([P(0, 0), P(S, 0), P(S, S), P(0, S)])}"/>
    <polygon class="floor-edge-l" points="${pts([P(0, S), P(S, S), P(S, S, -10), P(0, S, -10)])}"/>
    <polygon class="floor-edge-r" points="${pts([P(S, 0), P(S, S), P(S, S, -10), P(S, 0, -10)])}"/>
    <g class="tiles">${tiles}</g>
    <polygon class="wall-l" points="${pts([P(0, 0), P(0, S), P(0, S, H), P(0, 0, H)])}"/>
    <polygon class="wall-r" points="${pts([P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)])}"/>
    <polygon class="wall-cap" points="${pts([P(0, 0, H), P(S, 0, H), P(S, -6, H), P(-6, -6, H), P(-6, S, H), P(0, S, H)])}"/>
    <g class="pipes"><line x1="${P(0, 10, 128)[0]}" y1="${P(0, 10, 128)[1]}" x2="${P(0, S, 128)[0]}" y2="${P(0, S, 128)[1]}"/><line x1="${P(0, 22, 136)[0]}" y1="${P(0, 22, 136)[1]}" x2="${P(0, S, 136)[0]}" y2="${P(0, S, 136)[1]}"/></g>
    <g class="panels">${panels}</g>
    <g class="lights">
      ${wallR(30, 46, 128, 134, "lamp")}${wallR(110, 126, 128, 134, "lamp")}${wallL(110, 126, 128, 134, "lamp")}
      <ellipse class="glow glow-pink" cx="${P(70, 0, 110)[0]}" cy="${P(70, 0, 110)[1]}" rx="110" ry="80" fill="url(#glowPink)"/>
      <ellipse class="glow glow-mint" cx="${P(92, 86)[0]}" cy="${P(92, 86)[1] - 50}" rx="120" ry="90" fill="url(#glowMint)"/>
    </g>
    ${grate}${cables}${consoles}${vial(26, 34, "l-green")}${vial(66, 22, "l-blue")}${tube}${frontConsole}
  </svg>`;
}
