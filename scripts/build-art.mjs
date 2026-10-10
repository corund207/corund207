// Generates every static SVG on the profile, once per theme:
//   node scripts/build-art.mjs   →  assets/<name>-dark.svg, assets/<name>-light.svg
// GitHub renders these through <img>, so motion is CSS or SMIL only, and every piece
// settles to a readable still frame under prefers-reduced-motion.

import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { themes, ease, esc, tinted, SANS, MONO } from "./theme.mjs";

const r2 = (n) => Math.round(n * 100) / 100;
const pct = (n) => `${r2(n * 100)}%`;
const W = 1200;

// Holds a still frame when the reader asks for less motion.
const REDUCED = ".still{display:none}@media (prefers-reduced-motion:reduce){*{animation:none!important}.live{display:none}.still{display:inline}}";

function svg(width, height, title, desc, style, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<style>${style}${REDUCED}</style>
${body}
</svg>
`;
}

// Opacity keyframes that show an element only during [from, to) of the loop.
function windowFrames(name, from, to) {
  const e = 0.0001;
  const end = Math.min(to, 1);
  const tail = to >= 1 ? 1 : 0;
  const frames = from <= 0
    ? [`0%{opacity:1}`, `${pct(end - e)}{opacity:1}`, `${pct(end)}{opacity:${tail}}`, `100%{opacity:${tail}}`]
    : [`0%{opacity:0}`, `${pct(from - e)}{opacity:0}`, `${pct(from)}{opacity:1}`, `${pct(end - e)}{opacity:1}`, `${pct(end)}{opacity:${tail}}`, `100%{opacity:${tail}}`];
  return `@keyframes ${name}{${frames.join("")}}`;
}

// Lucide arrow-up-right / arrow-right / mail, stroke 2, drawn at `size` px.
const ICONS = {
  "up-right": "M7 7h10v10M7 17 17 7",
  right: "M5 12h14M12 5l7 7-7 7",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",
};

function icon(kind, x, y, size, color) {
  const d = ICONS[kind];
  return `<path transform="translate(${x} ${y}) scale(${r2(size / 24)})" d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const RISE = `.r{animation:rise .85s ${ease.reveal} backwards}@keyframes rise{from{opacity:0;transform:translateY(22px)}}`;

// ── Hero: KineticText over orbiting HeroDots ──────────────────────────────────

function kinetic(text, cls, start) {
  const chars = [];
  for (const char of text) {
    if (char === " " && chars.length) chars[chars.length - 1] += " ";
    else chars.push(char);
  }
  return chars.map((chunk, i) => {
    const n = start + i;
    return `<tspan class="${cls}" style="animation-delay:${r2(0.2 + n * 0.028)}s,${r2(2.6 + n * 0.035)}s">${esc(chunk)}</tspan>`;
  }).join("");
}

function hero(t) {
  const H = 580, cx = W / 2, cy = 300;
  const satelliteColors = [t.tints.iris, t.tints.odyssey, t.tints.orbit, t.tints.sourcesight];
  // Each ring is a circle of dots spun in its own plane, then tilted and foreshortened
  // so the set reads as a gyroscope in 3D around the headline.
  const rings = [
    { r: 285, alpha: 0.2, dur: 150, dir: 1, satellite: 40, tilt: -14, squash: 0.3 },
    { r: 360, alpha: 0.24, dur: 190, dir: -1, satellite: 205, tilt: 9, squash: 0.42 },
    { r: 440, alpha: 0.27, dur: 240, dir: 1, satellite: 320, tilt: -5, squash: 0.55 },
    { r: 525, alpha: 0.3, dur: 300, dir: -1, tilt: 16, squash: 0.36 },
    { r: 615, alpha: 0.32, dur: 360, dir: 1, satellite: 150, tilt: -10, squash: 0.48 },
  ];
  let satellites = 0;
  const ringSvg = rings.map((ring, i) => {
    const count = Math.round((2 * Math.PI * ring.r) / 30);
    const dots = [];
    for (let k = 0; k < count; k += 1) {
      const a = (k / count) * 2 * Math.PI + i * 0.37;
      const x = r2(cx + ring.r * Math.cos(a)), y = r2(cy + ring.r * Math.sin(a));
      dots.push(`<circle cx="${x}" cy="${y}" r="2.2"/>`);
    }
    const sat = ring.satellite === undefined ? "" : (() => {
      const a = ring.satellite * Math.PI / 180;
      const x = r2(cx + ring.r * Math.cos(a)), y = r2(cy + ring.r * Math.sin(a));
      const color = satelliteColors[satellites++ % satelliteColors.length];
      return `<circle class="halo" cx="${x}" cy="${y}" r="4.5" fill="none" stroke="${color}" stroke-width="1.2" style="animation-delay:${r2(i * 0.7)}s"/><circle cx="${x}" cy="${y}" r="4.5" fill="${color}"/>`;
    })();
    return `<g transform="translate(${cx} ${cy}) rotate(${ring.tilt}) scale(1 ${ring.squash}) translate(${-cx} ${-cy})"><circle cx="${cx}" cy="${cy}" r="${ring.r}" fill="none" stroke="${t.dotInk}" stroke-opacity="${r2(ring.alpha * 0.3)}" vector-effect="non-scaling-stroke"/><g class="orbit" style="animation-duration:${ring.dur}s;animation-direction:${ring.dir > 0 ? "normal" : "reverse"}"><g fill="${t.dotInk}" fill-opacity="${ring.alpha}">${dots.join("")}</g>${sat}</g></g>`;
  }).join("\n");
  const line1 = "I build robots.";
  const line2 = "And teach them to see.";
  const style = `
.orbit{transform-origin:${cx}px ${cy}px;animation:spin linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.halo{transform-box:fill-box;transform-origin:center;opacity:0;animation:halo 4.8s ${ease.reveal} infinite}
@keyframes halo{0%{transform:scale(1);opacity:.8}70%,100%{transform:scale(4.5);opacity:0}}
.k1{animation:kin .7s ${ease.reveal} backwards,shim1 9s ease-in-out infinite}
.k2{animation:kin .7s ${ease.reveal} backwards,shim2 9s ease-in-out infinite}
@keyframes kin{from{opacity:0;fill:${t.dotEnergy}}}
@keyframes shim1{0%,100%{fill:${t.foregroundBright}}3%{fill:${t.dotEnergy}}9%{fill:${t.foregroundBright}}}
@keyframes shim2{0%,100%{fill:${t.muted}}3%{fill:${t.dotEnergy}}9%{fill:${t.muted}}}
${RISE}`;
  const body = `<clipPath id="hero-frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="28" fill="${t.background}" stroke="${t.lineStrong}" stroke-width="1.5"/>
<g clip-path="url(#hero-frame)">${ringSvg}</g>
<text class="r" x="44" y="58" font-family="${SANS}" font-size="15" font-weight="640" letter-spacing="-.375" fill="${t.foregroundBright}">Jonah Chang</text>
<text class="r" x="${W - 44}" y="58" text-anchor="end" font-family="${MONO}" font-size="12" letter-spacing=".5" fill="${t.muted}">VEX V5 · TEAM 56S · MAINE</text>
<g text-anchor="middle" font-family="${SANS}" font-weight="600">
<text class="r" x="${cx}" y="208" font-size="28" fill="${t.muted}">Hi, I’m Jonah.</text>
<text x="${cx}" y="306" font-size="96" letter-spacing="-3.6" fill="${t.foregroundBright}">${kinetic(line1, "k1", 0)}</text>
<text x="${cx}" y="400" font-size="96" letter-spacing="-3.6" fill="${t.muted}">${kinetic(line2, "k2", line1.length)}</text>
</g>
<text class="r" style="animation-delay:.9s" x="${cx}" y="500" text-anchor="middle" font-family="${MONO}" font-size="13" letter-spacing=".52" fill="${t.foregroundSoft}">ROBOTICS  ·  COMPUTER VISION  ·  SYSTEMS SOFTWARE</text>`;
  return svg(W, H, "Jonah Chang. I build robots. And teach them to see.",
    "Black header with the headline in huge type inside a 3D gyroscope of tilted, slowly orbiting dot rings, with satellites in each project's color.", style, body);
}

// ── Statement: the about paragraph, lit word by word ──────────────────────────

function statement(t) {
  const lines = [
    "I’m a high school student in Maine who builds",
    "robots and the software behind them. I write",
    "competition code for VEX V5 team 56S, handle",
    "most of the robot’s CAD, and spend the rest of",
    "my time on computer vision and Linux tools.",
  ];
  const H = 70 + lines.length * 56;
  let n = 0;
  const text = lines.map((line, i) => `<text x="${W / 2}" y="${64 + i * 56}">${line.split(" ").map((word, j, all) => {
    n += 1;
    return `<tspan class="w" style="animation-delay:${r2(0.25 + n * 0.055)}s">${esc(word)}${j < all.length - 1 ? " " : ""}</tspan>`;
  }).join("")}</text>`).join("\n");
  const style = `.w{animation:lit .9s ease backwards}@keyframes lit{from{fill:${t.muted};opacity:.28}}`;
  const body = `<g text-anchor="middle" font-family="${SANS}" font-size="42" font-weight="600" letter-spacing="-.9" fill="${t.foregroundBright}">
${text}
</g>`;
  return svg(W, H, lines.join(" "), "The about paragraph in large type; each word lights up in turn.", style, body);
}

// ── Chapter headings ──────────────────────────────────────────────────────────

function chapter(eyebrow, title) {
  return (t) => svg(W, 210, title, `${eyebrow}. ${title}`, RISE,
    `<g text-anchor="middle" font-family="${SANS}" font-weight="600">
<text class="r" x="${W / 2}" y="78" font-size="26" fill="${t.muted}">${esc(eyebrow)}</text>
<text class="r" style="animation-delay:.08s" x="${W / 2}" y="170" font-size="84" letter-spacing="-3.2" fill="${t.foregroundBright}">${esc(title)}</text>
</g>`);
}

// ── Showcases: one graphite chapter per project, text on one side, a live diagram on the other ──

const SHOW_H = 580;
const PANEL = { w: 640, h: 500 };

function showcase(t, { id, flip, index, eyebrow, name, lines, tags, cta, diagram, style, desc }) {
  const px = flip ? 40 : W - 40 - PANEL.w, py = 40;
  const x0 = flip ? 744 : 64;
  const body = `<rect width="${W}" height="${SHOW_H}" rx="28" fill="${t.surface}"/>
<g class="r">
<text x="${x0}" y="168" font-family="${MONO}" font-size="13" letter-spacing=".52" fill="${t.accent}">${index}  ·  ${esc(eyebrow)}</text>
<text x="${x0 - 4}" y="262" font-family="${SANS}" font-size="84" font-weight="600" letter-spacing="-3.2" fill="${t.foregroundBright}">${esc(name)}</text>
</g>
<g class="r" style="animation-delay:.08s">
<g font-family="${SANS}" font-size="24" fill="${t.muted}">${lines.map((line, i) => `<text x="${x0}" y="${318 + i * 34}">${esc(line)}</text>`).join("")}</g>
<text x="${x0}" y="${318 + lines.length * 34 + 16}" font-family="${MONO}" font-size="12" letter-spacing=".5" fill="${t.muted}">${esc(tags)}</text>
</g>
<g class="r" style="animation-delay:.16s">
<circle cx="${x0 + 24}" cy="496" r="23" fill="none" stroke="${t.lineControl}" stroke-width="1.5"/>
${icon("right", x0 + 14, 486, 20, t.foreground)}
<text x="${x0 + 62}" y="502" font-family="${SANS}" font-size="18" font-weight="500" fill="${t.foreground}">${esc(cta)}</text>
</g>
<g transform="translate(${px} ${py})">
<clipPath id="${id}-panel"><rect width="${PANEL.w}" height="${PANEL.h}" rx="20"/></clipPath>
<rect x=".5" y=".5" width="${PANEL.w - 1}" height="${PANEL.h - 1}" rx="20" fill="${t.surfaceSoft}" stroke="${t.line}"/>
<g clip-path="url(#${id}-panel)">${diagram}</g>
</g>`;
  return svg(W, SHOW_H, `${name}. ${lines.join(" ")}`, desc, `${RISE}${style}`, body);
}

const label = (t, x, y, text, { color = t.muted, anchor = "start", cls = "" } = {}) =>
  `<text${cls ? ` class="${cls}"` : ""} x="${x}" y="${y}" font-family="${MONO}" font-size="11" letter-spacing=".44" fill="${color}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""} xml:space="preserve">${esc(text)}</text>`;

// Closed Catmull-Rom loop through waypoints, as cubic Bézier segments.
function loopThrough(points) {
  const n = points.length;
  return points.map((p1, i) => {
    const p0 = points[(i - 1 + n) % n], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const c1 = [r2(p1[0] + (p2[0] - p0[0]) / 6), r2(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [r2(p2[0] - (p3[0] - p1[0]) / 6), r2(p2[1] - (p3[1] - p1[1]) / 6)];
    return [p1, c1, c2, p2];
  });
}

// Arc-length lookup over cubic segments, so labels and readouts match paced motion.
function bezierPath(segments) {
  const at = ([p0, p1, p2, p3], s) => {
    const u = 1 - s;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * s * p1[k] + 3 * u * s * s * p2[k] + s * s * s * p3[k]);
  };
  const samples = [];
  let length = 0;
  segments.forEach((seg, index) => {
    let prev = at(seg, 0);
    for (let i = 1; i <= 300; i += 1) {
      const point = at(seg, i / 300);
      length += Math.hypot(point[0] - prev[0], point[1] - prev[1]);
      samples.push({ length, point, prev, index });
      prev = point;
    }
  });
  const d = `M${segments[0][0].join(" ")}` + segments.map(([, a, b, c]) => `C${a.join(" ")} ${b.join(" ")} ${c.join(" ")}`).join("") + "Z";
  const sample = (f) => samples.find((s) => s.length >= f * length) ?? samples[samples.length - 1];
  const pose = (f) => {
    const { point, prev } = sample(f);
    return { x: point[0], y: point[1], heading: Math.atan2(point[1] - prev[1], point[0] - prev[0]) * 180 / Math.PI };
  };
  const segmentEnd = (index) => samples.filter((s) => s.index === index).at(-1).length / length;
  return { d, pose, segmentEnd };
}

// ── 3D: one orthographic camera shared by the 3D pieces ───────────────────────
// World units, z up. The camera looks down at PITCH from YAW around the vertical axis;
// orthographic so a projected capsule stays a capsule and transforms stay affine.

const YAW = 25 * Math.PI / 180, PITCH = 30 * Math.PI / 180;

function project([x, y, z]) {
  const u = x * Math.cos(YAW) - y * Math.sin(YAW);
  const v = x * Math.sin(YAW) + y * Math.cos(YAW);
  return [u, -(z * Math.cos(PITCH) + v * Math.sin(PITCH))];
}

// The same camera applied to a flat map (x right, y down), as an SVG matrix.
function planeMatrix(scale, [e, f]) {
  const [a, b] = project([scale, 0, 0]);
  const [c, d] = project([0, -scale, 0]);
  return `matrix(${[a, b, c, d, e, f].map(r2).join(" ")})`;
}

const add = (p, q) => p.map((v, i) => v + q[i]);
const scl = (p, k) => p.map((v) => v * k);

// ── IRIS: a six-axis arm in 3D, picking parts off a belt and sorting them ─────

function iris(base) {
  const t = tinted(base, "iris");
  const loop = 12, F = 96, steps = 16;
  const D1 = 0.78, A2 = 1.2, D4 = 1.12, D6 = 0.36, FINGER = 0.2, CUBE = 0.24;
  const belt = { x0: -3, x1: -0.62, y: -1.2, w: 0.52, h: 0.4 };
  const pick = [-1.3, belt.y, belt.h];
  const trays = [[1.35, -0.95], [1.6, 0.35]].map(([x, y]) => ({ x, y, w: 0.66, d: 0.58, h: 0.16 }));
  const camera = [-2.05, -0.55, 1.75];

  // Tool-flange targets: fingertips straddle the cube's middle.
  const grip = ([x, y, z]) => [x, y, z + CUBE / 2 + FINGER];
  const lift = (p, h) => [p[0], p[1], p[2] + h];
  const atPick = grip(pick);
  const atTray = trays.map(({ x, y }) => grip([x, y, 0.02]));
  const home = [0.55, -0.75, 1.55];
  const plan = [
    [0, home], [13, lift(atPick, 0.6)], [18, atPick], [22, atPick], [28, lift(atPick, 0.6)],
    [38, lift(atTray[0], 0.65)], [43, atTray[0]], [46, atTray[0]], [52, home],
    [59, lift(atPick, 0.6)], [64, atPick], [68, atPick], [74, lift(atPick, 0.6)],
    [84, lift(atTray[1], 0.65)], [89, atTray[1]], [92, atTray[1]], [100, home],
  ];

  // Move in cylindrical coordinates so the base swings in arcs, eased per segment.
  const cyl = ([x, y, z]) => [Math.atan2(y, x), Math.hypot(x, y), z];
  const smooth = (u) => u * u * (3 - 2 * u);
  const flangeAt = (time) => {
    const k = plan.findIndex(([at], i) => i < plan.length - 1 && time <= plan[i + 1][0]);
    const [t0, p0] = plan[k], [t1, p1] = plan[k + 1];
    const u = smooth(t1 === t0 ? 0 : (time - t0) / (t1 - t0));
    const [a0, r0, z0] = cyl(p0), [a1, r1, z1] = cyl(p1);
    const da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    const a = a0 + da * u, r = r0 + (r1 - r0) * u, z = z0 + (z1 - z0) * u;
    return [r * Math.cos(a), r * Math.sin(a), z];
  };
  // Fingers close just after arriving and open just after the drop.
  const held = [[19, 45.5], [65, 91.5]];
  const closed = (time) => held.some(([a, b]) => time >= a && time < b);

  // Analytic IK: spherical wrist, tool pointing straight down, fingers squared to the belt.
  const pose = (time) => {
    const T = flangeAt(time);
    const Wc = [T[0], T[1], T[2] + D6];
    const j1 = Math.atan2(Wc[1], Wc[0]);
    const r = Math.hypot(Wc[0], Wc[1]), h = Wc[2] - D1;
    const L = Math.min(Math.hypot(r, h), A2 + D4 - 1e-3);
    const shoulder = Math.atan2(h, r) + Math.acos((A2 * A2 + L * L - D4 * D4) / (2 * A2 * L));
    const S = [0, 0, D1];
    const radial = [Math.cos(j1), Math.sin(j1), 0];
    const E = add(S, add(scl(radial, A2 * Math.cos(shoulder)), [0, 0, A2 * Math.sin(shoulder)]));
    const fore = Math.atan2(Wc[2] - E[2], Math.hypot(Wc[0], Wc[1]) - Math.hypot(E[0], E[1]));
    const deg = (a) => a * 180 / Math.PI;
    const spread = closed(time) ? CUBE / 2 + 0.015 : CUBE / 2 + 0.11;
    const side = [1, 0, 0];
    const fingers = [-1, 1].map((sgn) => {
      const root = add(T, scl(side, sgn * spread));
      return [root, add(root, [0, 0, -FINGER])];
    });
    const joints = [deg(j1), deg(shoulder), deg(fore - shoulder), 0, -90 - deg(fore), deg(-j1)];
    return { S, E, W: Wc, T, fingers, joints, part: add(T, [0, 0, -FINGER]) };
  };

  // Fit everything the scene ever shows into the panel, below the labels.
  const frames = Array.from({ length: F + 1 }, (_, f) => pose((f / F) * 100));
  const scenery = [
    [belt.x0, belt.y - belt.w / 2, 0], [belt.x1, belt.y + belt.w / 2, belt.h], camera, [0, 0, 0],
    ...trays.flatMap(({ x, y, w, d }) => [[x - w / 2, y - d / 2, 0], [x + w / 2, y + d / 2, 0]]),
  ];
  const all = [...scenery, ...frames.flatMap(({ S, E, W, T, fingers }) => [S, E, W, T, ...fingers.flat()])].map(project);
  const box = { top: 76, bottom: 452, left: 30, right: 610 };
  const minU = Math.min(...all.map((p) => p[0])), maxU = Math.max(...all.map((p) => p[0]));
  const minV = Math.min(...all.map((p) => p[1])), maxV = Math.max(...all.map((p) => p[1]));
  const k = Math.min((box.right - box.left) / (maxU - minU), (box.bottom - box.top) / (maxV - minV));
  const ox = (box.left + box.right) / 2 - k * (minU + maxU) / 2, oy = (box.top + box.bottom) / 2 - k * (minV + maxV) / 2;
  const P = (p) => { const [u, v] = project(p); return [r2(ox + k * u), r2(oy + k * v)]; };
  const V = (p) => { const [u, v] = project(p); return [r2(k * u), r2(k * v)]; };
  const poly = (pts, attrs) => `<path d="M${pts.map((p) => P(p).join(" ")).join("L")}Z" ${attrs}/>`;

  // Shaded solids: the camera sees the top, the -y face and the -x face.
  const shades = (color, levels = [1, 0.72, 0.5]) => levels.map((o) => `fill="${color}" fill-opacity="${o}"`);
  const solid = (pts, shade, stroke = "") => poly(pts, `fill="${t.surfaceSoft}"`) + poly(pts, `${shade} ${stroke}`);
  const block = ([x0, y0, z0], [x1, y1, z1], color, levels, stroke = "") => {
    const [top, front, side] = shades(color, levels);
    return solid([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top, stroke)
      + solid([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], front, stroke)
      + solid([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], side, stroke);
  };
  // A cube drawn around the origin, placed later with a screen-space translate.
  const cube = (color) => {
    const h = CUBE / 2;
    const [top, front, side] = shades(color);
    const face = (pts, fill) => { const d = `M${pts.map((p) => V(p).join(" ")).join("L")}Z`; return `<path d="${d}" fill="${t.surfaceSoft}"/><path d="${d}" ${fill}/>`; };
    return face([[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]], top)
      + face([[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]], front)
      + face([[-h, -h, -h], [-h, h, -h], [-h, h, h], [-h, -h, h]], side);
  };
  const cubeA = cube(t.accent), cubeB = cube(t.foregroundSoft);
  const placed = (shape, p) => `<g transform="translate(${P(p).join(" ")})">${shape}</g>`;

  // Floor grid, fading toward the back.
  const grid = [];
  for (let x = -3.4; x <= 2.61; x += 0.4) grid.push(`<path d="M${P([x, -2.2, 0]).join(" ")}L${P([x, 1.4, 0]).join(" ")}"/>`);
  for (let y = -2.2; y <= 1.41; y += 0.4) grid.push(`<path d="M${P([-3.4, y, 0]).join(" ")}L${P([2.6, y, 0]).join(" ")}"/>`);

  // Belt: a slab with a moving tread line along its top.
  const beltSolid = block([belt.x0, belt.y - belt.w / 2, 0], [belt.x1, belt.y + belt.w / 2, belt.h], t.foreground, [0.12, 0.07, 0.04], `stroke="${t.lineStrong}" stroke-width="1.2" stroke-linejoin="round"`);
  const tread = [-0.13, 0.13].map((dy) => `<path class="belt" d="M${P([belt.x0 + 0.1, belt.y + dy, belt.h]).join(" ")}L${P([belt.x1 - 0.1, belt.y + dy, belt.h]).join(" ")}" stroke="${t.muted}" stroke-width="1.5"/>`).join("");

  // Trays: back walls and floor, then contents, then translucent front walls.
  const trayBack = ({ x, y, w, d, h }) => {
    const [x0, x1, y0, y1] = [x - w / 2, x + w / 2, y - d / 2, y + d / 2];
    return poly([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], `fill="${t.surface}" stroke="${t.lineStrong}"`)
      + poly([[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]], `fill="${t.foreground}" fill-opacity=".08" stroke="${t.lineStrong}"`)
      + poly([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], `fill="${t.foreground}" fill-opacity=".08" stroke="${t.lineStrong}"`);
  };
  const trayFront = ({ x, y, w, d, h }) => {
    const [x0, x1, y0, y1] = [x - w / 2, x + w / 2, y - d / 2, y + d / 2];
    return poly([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], `fill="${t.surfaceSoft}" fill-opacity=".55" stroke="${t.lineStrong}"`)
      + poly([[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]], `fill="${t.surfaceSoft}" fill-opacity=".55" stroke="${t.lineStrong}"`);
  };
  const trayPart = (i) => [trays[i].x, trays[i].y, 0.02 + CUBE / 2];

  // Pedestal (J1), drawn as a short cylinder.
  const pedR = 0.34, pedH = 0.3;
  const [pcx, pcyTop] = P([0, 0, pedH]), [, pcyBot] = P([0, 0, 0]);
  const rx = r2(k * pedR), ry = r2(k * pedR * Math.sin(PITCH));
  const pedestal = `<path d="M${pcx - rx} ${pcyTop}V${pcyBot}A${rx} ${ry} 0 0 0 ${pcx + rx} ${pcyBot}V${pcyTop}Z" fill="${t.surface}" stroke="${t.lineStrong}" stroke-width="1.2"/>
<ellipse cx="${pcx}" cy="${pcyTop}" rx="${rx}" ry="${ry}" fill="${t.surfaceSoft}" stroke="${t.accent}" stroke-width="2"/>`;

  // Animated primitives: SMIL values, one per frame.
  const seq = (fn) => frames.map(fn).join(";");
  const anim = (attr, fn) => `<animate attributeName="${attr}" dur="${loop}s" repeatCount="indefinite" values="${seq(fn)}"/>`;
  const seg = (a, b, attrs) => `<line ${attrs}>${anim("x1", (f) => P(a(f))[0])}${anim("y1", (f) => P(a(f))[1])}${anim("x2", (f) => P(b(f))[0])}${anim("y2", (f) => P(b(f))[1])}</line>`;
  const dot = (p, attrs) => `<circle ${attrs}>${anim("cx", (f) => P(p(f))[0])}${anim("cy", (f) => P(p(f))[1])}</circle>`;
  const link = (a, b, width) => seg(a, b, `stroke="${t.foregroundSoft}" stroke-width="${width}" stroke-linecap="round"`)
    + seg(a, b, `stroke="${t.surfaceSoft}" stroke-width="${Math.round(width / 4)}" stroke-linecap="round" stroke-opacity=".5"`);
  const joint = (p, rr) => dot(p, `r="${rr}" fill="${t.surfaceSoft}" stroke="${t.accent}" stroke-width="2.5"`);
  const along = (a, b, u) => (f) => add(a(f), scl(add(b(f), scl(a(f), -1)), u));
  const S = (f) => f.S, E = (f) => f.E, Wr = (f) => f.W, T = (f) => f.T;
  const rim = (f) => [pedR * Math.cos(f.joints[0] * Math.PI / 180), pedR * Math.sin(f.joints[0] * Math.PI / 180), pedH];
  const liveArm = `${dot(rim, `r="4" fill="${t.accent}"`)}
${seg(() => [0, 0, pedH], S, `stroke="${t.foregroundSoft}" stroke-width="22" stroke-linecap="round"`)}
${link(S, E, 20)}
${link(E, Wr, 16)}
${seg(along(E, Wr, 0.2), along(E, Wr, 0.32), `stroke="${t.accent}" stroke-width="20" stroke-linecap="butt"`)}
${link(Wr, T, 11)}
${seg((f) => f.fingers[0][0], (f) => f.fingers[1][0], `stroke="${t.foregroundSoft}" stroke-width="6" stroke-linecap="round"`)}
${[0, 1].map((i) => seg((f) => f.fingers[i][0], (f) => f.fingers[i][1], `stroke="${t.foregroundSoft}" stroke-width="4.5" stroke-linecap="round"`)).join("")}
${joint(S, 11)}${joint(E, 10)}${joint(Wr, 8)}${dot(T, `r="5" fill="${t.accent}"`)}`;

  // Still frame for reduced motion: part A held over its tray.
  const still = pose(38);
  const stillSeg = (a, b, attrs) => `<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" ${attrs}/>`;
  const stillLink = (a, b, width) => stillSeg(a, b, `stroke="${t.foregroundSoft}" stroke-width="${width}" stroke-linecap="round"`)
    + stillSeg(a, b, `stroke="${t.surfaceSoft}" stroke-width="${Math.round(width / 4)}" stroke-linecap="round" stroke-opacity=".5"`);
  const stillJoint = (p, rr) => `<circle cx="${P(p)[0]}" cy="${P(p)[1]}" r="${rr}" fill="${t.surfaceSoft}" stroke="${t.accent}" stroke-width="2.5"/>`;
  const stillArm = `${stillSeg([0, 0, pedH], still.S, `stroke="${t.foregroundSoft}" stroke-width="22" stroke-linecap="round"`)}
${stillLink(still.S, still.E, 20)}${stillLink(still.E, still.W, 16)}
${stillSeg(add(still.E, scl(add(still.W, scl(still.E, -1)), 0.2)), add(still.E, scl(add(still.W, scl(still.E, -1)), 0.32)), `stroke="${t.accent}" stroke-width="20"`)}
${stillLink(still.W, still.T, 11)}
${stillSeg(still.fingers[0][0], still.fingers[1][0], `stroke="${t.foregroundSoft}" stroke-width="6" stroke-linecap="round"`)}
${still.fingers.map(([a, b]) => stillSeg(a, b, `stroke="${t.foregroundSoft}" stroke-width="4.5" stroke-linecap="round"`)).join("")}
${placed(cubeA, add(still.part, [0, 0, CUBE / 2 - 0.02]))}
${stillJoint(still.S, 11)}${stillJoint(still.E, 10)}${stillJoint(still.W, 8)}`;

  // Held parts ride the fingertips; screen-space translate per frame.
  const ride = (shape, cls) => `<g class="${cls}" style="opacity:0"><g>${shape}<animateTransform attributeName="transform" type="translate" dur="${loop}s" repeatCount="indefinite" values="${seq((f) => P(add(f.part, [0, 0, CUBE / 2 - 0.02])).join(" "))}"/></g></g>`;

  // Joint readout, stepped like Odyssey's pose readout.
  const sign = (a) => `${a < 0 ? "−" : "+"}${String(Math.round(Math.abs(a))).padStart(3, "0")}°`;
  const readout = (f, row) => [0, 1, 2].map((j) => `J${row * 3 + j + 1} ${sign(f.joints[row * 3 + j])}`).join("  ");
  const stepFrames = Array.from({ length: steps }, (_, i) => pose((i / steps) * 100));

  // Parts arrive along the belt.
  const [bdx, bdy] = V([-1.1, 0, 0]);
  const [cx, cy] = P(camera), [px, py] = P(pick);
  const style = `
@keyframes inA{0%{transform:translate(${bdx}px,${bdy}px);opacity:0}2%{opacity:1}8%,21.99%{transform:translate(0,0);opacity:1}22%,100%{transform:translate(0,0);opacity:0}}.inA{animation:inA ${loop}s ${ease.row} infinite}
@keyframes inB{0%,45.99%{transform:translate(${bdx}px,${bdy}px);opacity:0}48%{opacity:1}54%,67.99%{transform:translate(0,0);opacity:1}68%,100%{transform:translate(0,0);opacity:0}}.inB{animation:inB ${loop}s ${ease.row} infinite}
${[["heldA", "0%,21.99%{opacity:0}22%,45.99%{opacity:1}46%,100%{opacity:0}"], ["heldB", "0%,67.99%{opacity:0}68%,91.99%{opacity:1}92%,100%{opacity:0}"],
    ["dropA", "0%,45.99%{opacity:0}46%,94%{opacity:1}100%{opacity:0}"], ["dropB", "0%,91.99%{opacity:0}92%,95%{opacity:1}100%{opacity:0}"],
    ["scan", "0%,8%{opacity:0}9%{opacity:1}13%{opacity:.2}14%,54%{opacity:0}55%{opacity:1}59%{opacity:.2}60%,100%{opacity:0}"]]
    .map(([name, frames]) => `@keyframes ${name}{${frames}}.${name}{animation:${name} ${loop}s linear infinite}`).join("\n")}
${windowFrames("clsA", 0.09, 0.46)}.clsA{opacity:0;animation:clsA ${loop}s linear infinite}
${windowFrames("clsB", 0.55, 0.92)}.clsB{opacity:0;animation:clsB ${loop}s linear infinite}
.belt{stroke-dasharray:5 9;animation:belt 1.2s linear infinite}@keyframes belt{to{stroke-dashoffset:-14}}
${Array.from({ length: steps }, (_, i) => `${windowFrames(`ij${i}`, i / steps, (i + 1) / steps)}.ij${i}{opacity:0;animation:ij${i} ${loop}s linear infinite}`).join("")}`;

  const [postX, postTop] = P(camera), [, postBot] = P([camera[0], camera[1], 0]);
  const partOnBelt = add(pick, [0, 0, CUBE / 2]);
  const diagram = `<g stroke="${t.line}" stroke-opacity=".8">${grid.join("")}</g>
${trays.map(trayBack).join("")}
<g class="dropA" style="opacity:0">${placed(cubeA, trayPart(0))}</g>
<g class="dropB" style="opacity:0">${placed(cubeB, trayPart(1))}</g>
${trays.map(trayFront).join("")}
${trays.map((tray, i) => { const [lx, ly] = P([tray.x, tray.y - tray.d / 2, 0]); return label(t, lx, r2(ly + 22), `CLASS ${"AB"[i]}`, { anchor: "middle" }); }).join("")}
${beltSolid}${tread}
<path d="M${postX} ${postBot}V${postTop}" stroke="${t.lineStrong}" stroke-width="3"/>
<path class="scan" d="M${cx} ${cy}L${r2(px - k * 0.3)} ${r2(py)}L${r2(px + k * 0.3)} ${r2(py)}Z" fill="${t.accent}" fill-opacity=".16" opacity="0"/>
<rect x="${cx - 18}" y="${cy - 11}" width="36" height="22" rx="6" fill="${t.surface}" stroke="${t.foregroundSoft}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="5.5" fill="none" stroke="${t.accent}" stroke-width="2"/>
<g class="live">
${label(t, r2(cx - 26), r2(cy + 4), "→ CLASS A", { color: t.accent, cls: "clsA", anchor: "end" })}${label(t, r2(cx - 26), r2(cy + 4), "→ CLASS B", { color: t.accent, cls: "clsB", anchor: "end" })}
<g class="inA">${placed(cubeA, partOnBelt)}</g>
<g class="inB" style="opacity:0">${placed(cubeB, partOnBelt)}</g>
</g>
${pedestal}
<g class="live">
${liveArm}
${ride(cubeA, "heldA")}${ride(cubeB, "heldB")}
${stepFrames.map((f, i) => label(t, 616, 34, readout(f, 0), { anchor: "end", cls: `ij${i}` }) + label(t, 616, 54, readout(f, 1), { anchor: "end", cls: `ij${i}` })).join("")}
</g>
<g class="still">
${stillArm}
${label(t, 616, 34, readout(still, 0), { anchor: "end" })}${label(t, 616, 54, readout(still, 1), { anchor: "end" })}
</g>
${label(t, 24, 34, "IDENTIFY  →  PICK  →  SORT", { color: t.accent })}
${label(t, 24, 54, "6-AXIS  ·  3D PRINTED")}`;
  return showcase(t, {
    id: "iris", flip: false, index: "03", eyebrow: "MANIPULATION", name: "IRIS",
    lines: ["See it. Pick it. Sort it.", "A 3D-printed six-axis arm that", "identifies and sorts parts."],
    tags: "3RD PLACE · ENGINEERING · MAINE STATE SCIENCE FAIR", cta: "Explore IRIS", diagram, style,
    desc: "A six-axis arm in 3D on a floor grid. Cubes ride a conveyor, an overhead camera classifies each one, and the arm lifts it into the matching tray while a readout tracks all six joint angles.",
  });
}

function odyssey(base) {
  const t = tinted(base, "odyssey");
  const loop = 12, steps = 16;
  const field = { x: 120, y: 50, s: 400 };
  const waypoints = [[170, 400], [330, 392], [462, 330], [446, 196], [334, 228], [262, 128], [150, 170], [138, 300]];
  const path = bezierPath(loopThrough(waypoints));
  const modes = [["PID DRIVE", 0, path.segmentEnd(0)], ["PURE PURSUIT", path.segmentEnd(0), path.segmentEnd(5)], ["MOVE TO POSE", path.segmentEnd(5), 1]];
  const inches = (px) => (px * 144 / field.s).toFixed(1).padStart(5, " ");
  const readout = (f) => {
    const p = path.pose(f);
    const theta = Math.round(((-p.heading % 360) + 360) % 360);
    return `X ${inches(p.x - field.x)}  Y ${inches(field.y + field.s - p.y)}  θ ${String(theta).padStart(3, "0")}°`;
  };
  const tiles = [];
  for (let k = 1; k < 6; k += 1) {
    const o = r2(field.s * k / 6);
    tiles.push(`M${field.x + o} ${field.y}V${field.y + field.s}M${field.x} ${field.y + o}H${field.x + field.s}`);
  }
  const robot = `<g><rect x="-18" y="-16" width="36" height="32" rx="6" fill="${t.surface}" stroke="${t.accent}" stroke-width="2"/>
<g fill="${t.foregroundSoft}"><rect x="-14" y="-21" width="12" height="5" rx="2"/><rect x="2" y="-21" width="12" height="5" rx="2"/><rect x="-14" y="16" width="12" height="5" rx="2"/><rect x="2" y="16" width="12" height="5" rx="2"/></g>
<path d="M-4 -7 6 0-4 7" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const still = path.pose(0.36);
  const style = `
.trail{stroke-dasharray:1;animation:trail ${loop}s linear infinite}
@keyframes trail{0%{stroke-dashoffset:1;opacity:1}90%{stroke-dashoffset:.1;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
${modes.map(([, from, to], i) => `${windowFrames(`om${i}`, from, to)}.om${i}{opacity:0;animation:om${i} ${loop}s linear infinite}`).join("")}
${Array.from({ length: steps }, (_, i) => `${windowFrames(`op${i}`, i / steps, (i + 1) / steps)}.op${i}{opacity:0;animation:op${i} ${loop}s linear infinite}`).join("")}`;
  // Lay the field flat under the shared 3D camera and stand walls on its two near edges.
  const fc = [field.x + field.s / 2, field.y + field.s / 2], center = [320, 262], FIELD_SCALE = 1.1;
  const toScreen = ([x, y]) => { const [u, v] = project([(x - fc[0]) * FIELD_SCALE, (fc[1] - y) * FIELD_SCALE, 0]); return [r2(center[0] + u), r2(center[1] + v)]; };
  const corners = [[field.x, field.y], [field.x + field.s, field.y], [field.x + field.s, field.y + field.s], [field.x, field.y + field.s]].map(toScreen);
  const near = corners.reduce((best, c, i) => (c[1] > corners[best][1] ? i : best), 0);
  const WALL = 16;
  const wall = (a, b, opacity) => `<path d="M${a.join(" ")}L${b.join(" ")}L${b[0]} ${r2(b[1] + WALL)}L${a[0]} ${r2(a[1] + WALL)}Z" fill="${t.foreground}" fill-opacity="${opacity}"/>`;
  const diagram = `<g stroke="${t.lineStrong}" stroke-width="1.2" stroke-linejoin="round">${wall(corners[(near + 3) % 4], corners[near], ".12")}${wall(corners[near], corners[(near + 1) % 4], ".2")}</g>
<g transform="${planeMatrix(FIELD_SCALE, center)}"><g transform="translate(${-fc[0]} ${-fc[1]})">
<rect x="${field.x}" y="${field.y}" width="${field.s}" height="${field.s}" rx="6" fill="${t.surface}" stroke="${t.lineStrong}" stroke-width="2.5"/>
<path d="${tiles.join("")}" stroke="${t.line}" stroke-width="1.3"/>
<path d="${path.d}" fill="none" stroke="${t.lineStrong}" stroke-width="2" stroke-dasharray="4 7"/>
<g fill="${t.surfaceSoft}" stroke="${t.muted}" stroke-width="2">${waypoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join("")}</g>
<g class="live">
<path class="trail" d="${path.d}" pathLength="1" fill="none" stroke="${t.accent}" stroke-width="4.5" stroke-linecap="round"/>
<g><circle r="46" fill="${t.accent}" fill-opacity=".08" stroke="${t.accent}" stroke-opacity=".5" stroke-dasharray="3 5"/><animateMotion dur="${loop}s" repeatCount="indefinite" path="${path.d}"/></g>
<g><circle r="6" fill="${t.accent}"/><animateMotion dur="${loop}s" begin="-0.55s" repeatCount="indefinite" path="${path.d}"/></g>
<g>${robot}<animateMotion dur="${loop}s" repeatCount="indefinite" rotate="auto" path="${path.d}"/></g>
</g>
<g class="still">
<path d="${path.d}" fill="none" stroke="${t.accent}" stroke-width="4.5"/>
<g transform="translate(${r2(still.x)} ${r2(still.y)}) rotate(${r2(still.heading)})">${robot}</g>
</g>
</g></g>
${label(t, 24, 474, "FIELD 144 × 144 IN")}
<g class="live">
${modes.map(([name], i) => label(t, 24, 34, name, { color: t.accent, cls: `om${i}` })).join("")}
${Array.from({ length: steps }, (_, i) => label(t, 616, 34, readout(i / steps), { anchor: "end", cls: `op${i}` })).join("")}
</g>
<g class="still">
${label(t, 24, 34, "PURE PURSUIT", { color: t.accent })}
${label(t, 616, 34, readout(0.36), { anchor: "end" })}
</g>`;
  return showcase(t, {
    id: "odyssey", flip: false, index: "01", eyebrow: "LOCALIZATION", name: "Odyssey",
    lines: ["Know where you are.", "Control where you go. Odometry", "and autonomous motion for VEX V5."],
    tags: "C++  ·  PROS  ·  PID  ·  PURE PURSUIT", cta: "Explore Odyssey", diagram, style,
    desc: "A VEX field in 3D with walls on its near edges. A robot drives a loop through waypoints with its lookahead circle, drawing its trail while the controller mode and pose readout update.",
  });
}

function orbit(base) {
  const t = tinted(base, "orbit");
  const loop = 10, N = 40;
  // Map coordinates (x right, y toward the cameras) laid on the 3D floor; heights in px.
  const camL = [270, 440], camR = [370, 440], mid = [320, 440];
  const HC = 56, HT = 34, origin = [338, 384];
  const track = Array.from({ length: N + 1 }, (_, i) => {
    const a = (i / N) * 2 * Math.PI;
    return [r2(320 + 190 * Math.sin(a)), r2(210 + 70 * Math.sin(2 * a + 0.6))];
  });
  const S = ([x, y], z = 0) => { const [u, v] = project([x - mid[0], mid[1] - y, z]); return [r2(origin[0] + u), r2(origin[1] + v)]; };
  const values = (fn) => track.map(fn).join(";");
  const anim = (attr, fn) => `<animate attributeName="${attr}" dur="${loop}s" repeatCount="indefinite" values="${values(fn)}"/>`;
  const slide = (fn) => `<animateTransform attributeName="transform" type="translate" dur="${loop}s" repeatCount="indefinite" values="${values(fn)}"/>`;
  const ray = (from, attrs) => `<line x1="${from[0]}" y1="${from[1]}" ${attrs}>${anim("x2", (p) => S(p, HT)[0])}${anim("y2", (p) => S(p, HT)[1])}</line>`;
  const others = [[140, 150], [500, 110]];
  const stages = ["STEREO PAIR", "YOLO DETECT", "TRIANGULATE", "KALMAN TRACK"];
  const bracket = (s) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `M${sx * s} ${sy * (s - 7)}V${sy * s}H${sx * (s - 7)}`).join("");
  const cone = ([x, y]) => `M${x} ${y}L${x - 230} ${y - 350}H${x + 230}Z`;
  const lensL = S(camL, HC), lensR = S(camR, HC), still = track[4];
  const style = `
${stages.map((_, i) => [["t", t.muted, t.foreground], ["c", t.lineStrong, t.accent]].map(([part, off, on]) =>
    `@keyframes s${part}${i}{0%,${pct(i / 4)}{fill:${off}}${pct(i / 4 + 0.01)},${pct((i + 1) / 4)}{fill:${on}}${pct((i + 1) / 4 + 0.01)},100%{fill:${off}}}`).join("")).join("")}
${stages.map((_, i) => `.s${i} text{fill:${t.muted};animation:st${i} ${loop / 2}s linear infinite}.s${i} circle{fill:${t.lineStrong};animation:sc${i} ${loop / 2}s linear infinite}`).join("")}
.ghost{animation:ghost 3.4s ease-in-out infinite}@keyframes ghost{50%{opacity:.35}}`;

  // Floor: grid, field-of-view cones, range rings, the baseline foot, and target shadows.
  const grid = [];
  for (let x = mid[0] - 360; x <= mid[0] + 360; x += 40) grid.push(`M${x} ${mid[1] + 60}V${mid[1] - 420}`);
  for (let y = mid[1] + 60; y >= mid[1] - 420; y -= 40) grid.push(`M${mid[0] - 360} ${y}H${mid[0] + 360}`);
  const shadow = (r, opacity) => `<ellipse rx="${r}" ry="${r}" fill="${t.accent}" fill-opacity="${opacity}"/>`;
  const floor = `<g transform="${planeMatrix(1, S(mid))}"><g transform="translate(${-mid[0]} ${-mid[1]})">
<path d="${grid.join("")}" stroke="${t.line}" stroke-opacity=".7"/>
<g fill="${t.accent}" fill-opacity=".04">${[camL, camR].map((c) => `<path d="${cone(c)}"/>`).join("")}</g>
<g fill="none" stroke="${t.lineStrong}" stroke-width="1.4">${[120, 220, 320].map((r) => `<path d="M${mid[0] - r} ${mid[1]}A${r} ${r} 0 0 1 ${mid[0] + r} ${mid[1]}"/>`).join("")}</g>
<rect x="${camL[0] - 24}" y="${mid[1] - 12}" width="${camR[0] - camL[0] + 48}" height="24" rx="8" fill="${t.foreground}" fill-opacity=".08" stroke="${t.lineStrong}"/>
${others.map((p, i) => `<g class="ghost" style="animation-delay:-${i * 1.3}s"><g transform="translate(${p.join(" ")})">${shadow(10, 0.12)}</g></g>`).join("")}
<g class="live">
<line x1="${mid[0]}" y1="${mid[1]}" stroke="${t.muted}" stroke-dasharray="3 5" stroke-width="1.4">${anim("x2", ([x]) => x)}${anim("y2", ([, y]) => y)}</line>
<g>${shadow(12, 0.22)}${slide(([x, y]) => `${x} ${y}`)}</g>
</g>
<g class="still">
<path d="M${mid.join(" ")}L${still.join(" ")}" stroke="${t.muted}" stroke-dasharray="3 5" stroke-width="1.4"/>
<g transform="translate(${still.join(" ")})">${shadow(12, 0.22)}</g>
</g>
</g></g>`;

  // Above the floor: the camera mast, floating targets on drop lines, and the rays between them.
  const marker = (size, color, dotR) => `<circle r="${dotR}" fill="${color}"/><path d="${bracket(size)}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
  const camera = ([x, y]) => `<rect x="${x - 16}" y="${y - 11}" width="32" height="22" rx="6" fill="${t.surface}" stroke="${t.foregroundSoft}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${t.accent}" stroke-width="2"/>`;
  const ghosts = others.map((p, i) => {
    const [fx, fy] = S(p), [gx, gy] = S(p, HT);
    return `<g class="ghost" style="animation-delay:-${i * 1.3}s"><path d="M${fx} ${fy}V${gy}" stroke="${t.muted}" stroke-dasharray="2 4"/><g transform="translate(${gx} ${gy})">${marker(13, t.muted, 4)}</g></g>${label(t, r2(gx + 18), r2(gy + 4), `ID ${["03", "11"][i]}`)}`;
  }).join("");
  const [mx0, my0] = S(mid), [, myTop] = S(mid, HC);
  const [sx, sy] = S(still, HT), [sfx, sfy] = S(still);
  const diagram = `${floor}
${[120, 220, 320].map((r, i) => { const [lx, ly] = S([mid[0] + r * 0.94, mid[1] - r * 0.34]); return label(t, r2(lx + 8), r2(ly + 4), `${i + 1} M`); }).join("")}
${ghosts}
<path d="M${mx0} ${my0}V${myTop}" stroke="${t.foregroundSoft}" stroke-width="3" stroke-linecap="round"/>
<path d="M${lensL.join(" ")}L${lensR.join(" ")}" stroke="${t.foregroundSoft}" stroke-width="3" stroke-linecap="round"/>
<g class="live">
${ray(lensL, `stroke="${t.accent}" stroke-opacity=".75" stroke-width="1.5"`)}${ray(lensR, `stroke="${t.accent}" stroke-opacity=".75" stroke-width="1.5"`)}
<line stroke="${t.accent}" stroke-opacity=".5" stroke-dasharray="2 4">${anim("x1", (p) => S(p)[0])}${anim("y1", (p) => S(p)[1])}${anim("x2", (p) => S(p, HT)[0])}${anim("y2", (p) => S(p, HT)[1])}</line>
<g>${marker(18, t.accent, 6)}${slide((p) => S(p, HT).join(" "))}</g>
<text font-family="${MONO}" font-size="11" letter-spacing=".44" fill="${t.accent}">ID 07${slide((p) => { const [x, y] = S(p, HT); return `${r2(x + 26)} ${r2(y - 14)}`; })}</text>
</g>
<g class="still">
<path d="M${lensL.join(" ")}L${sx} ${sy}M${lensR.join(" ")}L${sx} ${sy}" stroke="${t.accent}" stroke-opacity=".75" stroke-width="1.5"/>
<path d="M${sfx} ${sfy}L${sx} ${sy}" stroke="${t.accent}" stroke-opacity=".5" stroke-dasharray="2 4"/>
<g transform="translate(${sx} ${sy})">${marker(18, t.accent, 6)}</g>
${label(t, r2(sx + 26), r2(sy - 14), "ID 07", { color: t.accent })}
</g>
${camera(lensL)}${camera(lensR)}
${label(t, mx0, r2(my0 + 30), "BASELINE", { anchor: "middle" })}
<g font-family="${MONO}" font-size="11" letter-spacing=".44">${stages.map((name, i) => `<g class="s s${i}"><circle cx="30" cy="${30 + i * 24}" r="4"/><text x="44" y="${34 + i * 24}">${name}</text></g>`).join("")}</g>`;
  return showcase(t, {
    id: "orbit", flip: true, index: "02", eyebrow: "PERCEPTION", name: "O.R.B.I.T.",
    lines: ["Two cameras. One answer.", "Low-cost stereo perception that", "finds, ranges and tracks targets."],
    tags: "PYTHON  ·  YOLO  ·  OPENCV  ·  STEREO", cta: "Explore O.R.B.I.T.", diagram, style,
    desc: "A stereo rig on a mast over a 3D floor. Rays from both cameras triangulate a floating target above its shadow while two other tracks hold their IDs and the pipeline steps through detection and tracking.",
  });
}

function calmlist(base) {
  const t = tinted(base, "calmlist");
  const loop = 11;
  const win = { x: 30, y: 30, w: 580, h: 440 };
  const side = 160;
  const main = win.x + side + 28;
  const rowY = (i) => 214 + i * 50;
  const typed = "Order new drive bearings";
  const tasks = ["Tune pure pursuit lookahead", "Print a new intake roller", "Recalibrate the stereo pair"];
  const typeEnd = 0.3, drop = 0.32;
  const checks = [0.46, 0.6, 0.74];
  const reset = 0.92;
  const counts = [[0, drop, 3], [drop, checks[0], 4], [checks[0], checks[1], 3], [checks[1], checks[2], 2], [checks[2], reset, 1], [reset, 1, 3]];
  const flip = (name, at, off, on, prop) => `@keyframes ${name}{0%,${pct(at)}{${prop}:${off}}${pct(at + 0.025)},${pct(reset)}{${prop}:${on}}100%{${prop}:${off}}}`;
  const charW = 7.6;
  const typeW = r2(typed.length * 7.7);
  const stepsIn = `steps(${typed.length})`;
  const row = (text, y, i, cls) => `<g class="${cls}">
<circle cx="${main + 12}" cy="${y}" r="10" fill="none" stroke="${t.lineControl}" stroke-width="1.5"/>
<circle class="fill f${i}" cx="${main + 12}" cy="${y}" r="10.75" fill="${t.accent}"/>
<path class="tick k${i}" pathLength="1" d="M${main + 7} ${y}l3.5 3.5 6.5-6.5" fill="none" stroke="${t.onAction}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<text class="x${i}" x="${main + 38}" y="${y + 6}" font-family="${SANS}" font-size="17" fill="${t.foreground}">${esc(text)}</text>
<path class="strike k${i}" pathLength="1" d="M${main + 38} ${y}h${r2(text.length * charW)}" stroke="${t.muted}" stroke-width="1.5"/>
</g>`;
  const all = [typed, ...tasks];
  const style = `
.cover,.caret{animation:type ${loop}s linear infinite}
@keyframes type{0%,4%{transform:translateX(0);animation-timing-function:${stepsIn}}${pct(typeEnd)},100%{transform:translateX(${typeW}px)}}
.fill{transform-box:fill-box;transform-origin:center}
.typed{animation:typed ${loop}s linear infinite}@keyframes typed{0%,${pct(drop - 0.001)}{opacity:1}${pct(drop)},100%{opacity:0}}
.push{animation:push ${loop}s ${ease.reveal} infinite}@keyframes push{0%,${pct(drop)}{transform:translateY(0)}${pct(drop + 0.04)},${pct(reset)}{transform:translateY(50px)}100%{transform:translateY(0)}}
.new{opacity:0;animation:new ${loop}s ${ease.reveal} infinite}@keyframes new{0%,${pct(drop)}{opacity:0;transform:translateY(-10px)}${pct(drop + 0.04)},${pct(reset)}{opacity:1;transform:translateY(0)}100%{opacity:0}}
.tick,.strike{stroke-dasharray:1}
${all.map((_, i) => {
    const at = checks[i];
    if (at === undefined) return `.f${i}{transform:scale(0)}.k${i}{stroke-dashoffset:1}`;
    return `${flip(`fa${i}`, at, "scale(0)", "scale(1)", "transform")}${flip(`ka${i}`, at, "1", "0", "stroke-dashoffset")}${flip(`xa${i}`, at, t.foreground, t.muted, "fill")}
.f${i}{transform:scale(0);animation:fa${i} ${loop}s ${ease.reveal} infinite}.k${i}{stroke-dashoffset:1;animation:ka${i} ${loop}s ${ease.reveal} infinite}.x${i}{animation:xa${i} ${loop}s linear infinite}`;
  }).join("\n")}
.count{opacity:0}
${counts.map(([from, to], k) => `${windowFrames(`c${k}`, from, to)}.c${k}{animation:c${k} ${loop}s linear infinite}`).join("")}`;
  const nav = ["Inbox", "Today", "Upcoming", "Projects"];
  const diagram = `<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="14" fill="${t.background}" stroke="${t.line}"/>
<path d="M${win.x} ${win.y + 40}H${win.x + win.w}M${win.x + side} ${win.y + 40}V${win.y + win.h}" stroke="${t.line}"/>
<g fill="${t.lineStrong}">${[0, 1, 2].map((i) => `<circle cx="${win.x + 22 + i * 18}" cy="${win.y + 20}" r="5.5"/>`).join("")}</g>
${label(t, win.x + win.w / 2, win.y + 24, "CALMLIST", { anchor: "middle" })}
<g font-family="${SANS}" font-size="15">${nav.map((item, i) => i === 1
    ? `<rect x="${win.x + 10}" y="${win.y + 58 + i * 36}" width="${side - 20}" height="30" rx="8" fill="${t.hoverWash}"/><text x="${win.x + 24}" y="${win.y + 78 + i * 36}" fill="${t.accent}" font-weight="500">${item}</text>`
    : `<text x="${win.x + 24}" y="${win.y + 78 + i * 36}" fill="${t.foregroundSoft}">${item}</text>`).join("")}</g>
${label(t, win.x + 24, win.y + win.h - 22, "LOCAL-FIRST")}
<text x="${main}" y="${win.y + 94}" font-family="${SANS}" font-size="30" font-weight="600" letter-spacing="-.8" fill="${t.foregroundBright}">Today</text>
<g class="live">${counts.map(([, , open], k) => label(t, win.x + win.w - 24, win.y + 92, `${open} OPEN`, { anchor: "end", cls: `count c${k}` })).join("")}</g>
<rect x="${main - 6}" y="${win.y + 116}" width="${win.x + win.w - main - 18}" height="40" rx="10" fill="none" stroke="${t.lineControl}" stroke-width="1.2"/>
<rect x="${win.x + win.w - 70}" y="${win.y + 126}" width="40" height="20" rx="5" fill="none" stroke="${t.line}"/>${label(t, win.x + win.w - 50, win.y + 140, "⌘K", { anchor: "middle" })}
<g class="live typed"><text x="${main + 8}" y="${win.y + 142}" font-family="${SANS}" font-size="16" fill="${t.foreground}">${esc(typed)}</text>
<rect class="cover" x="${main + 7}" y="${win.y + 122}" width="${typeW + 4}" height="28" fill="${t.background}"/>
<rect class="caret" x="${main + 8}" y="${win.y + 127}" width="1.5" height="19" fill="${t.accent}"/></g>
<g class="new live">${row(typed, rowY(0), 0, "")}</g>
<g class="push">${tasks.map((task, i) => row(task, rowY(i), i + 1, "")).join("")}</g>`;
  return showcase(t, {
    id: "calmlist", flip: true, index: "04", eyebrow: "PRODUCT", name: "CalmList",
    lines: ["Less noise. More done.", "A keyboard-first task manager", "with self-hostable sync."],
    tags: "REACT  ·  TYPESCRIPT  ·  SQLITE", cta: "Explore CalmList", diagram, style,
    desc: "A CalmList window: a task is typed into quick add, drops into Today, and the list is checked off one by one.",
  });
}

// ── Tiles: the rest of the lab ────────────────────────────────────────────────

const TILES = [
  ["odyssey-sim", "Odyssey Simulator", ["Plan autonomous routines on a virtual", "VEX field, then export the C++."], "TYPESCRIPT · SIMULATION", "odyssey"],
  ["sourcesight", "SourceSight", ["Linux-native real-time visualization", "with a custom Dear ImGui interface."], "C++20 · OPENGL · IMGUI", "sourcesight"],
  ["handwave", "Handwave", ["Control a Mac with hand gestures", "through the webcam."], "PYTHON · MEDIAPIPE"],
  ["override", "Team 56S / Override", ["Competition code for VEX team 56S,", "with Odyssey-powered autonomous."], "C++ · PROS · VEX V5"],
  ["harbor", "Harbor", ["Local media download and conversion", "built on YoutubeExplode and ffmpeg."], "C# · .NET"],
  ["desktops", "Omarchy desktops", ["Four Hyprland themes with their own", "bars, motion and screensavers."], "QML · CSS · SHELL"],
  ["vexvortex", "VEXVortex", ["Competition data and analytics for", "VEX events, from the RobotEvents API."], "SWIFT · ROBOTEVENTS API", "vortex"],
  ["reticly", "Reticly", ["A free, open-source crosshair overlay", "for Windows with recoil tracking."], "C# · WINDOWS"],
];

function tile(i) {
  const [, name, lines, tags, project] = TILES[i];
  return (base) => {
    const t = project ? tinted(base, project) : base;
    const TW = 590, TH = 240;
    const style = `${RISE}.dot{animation:pulse 4s ease-in-out infinite}@keyframes pulse{50%{fill-opacity:.25}}`;
    const body = `<rect width="${TW}" height="${TH}" rx="24" fill="${t.surface}"/>
<g class="r" style="animation-delay:${r2(i * 0.06)}s">
<circle class="dot" cx="44" cy="50" r="4" fill="${t.accent}" style="animation-delay:-${i * 0.6}s"/>
<text x="58" y="54" font-family="${MONO}" font-size="12" letter-spacing=".5" fill="${t.muted}">${String(i + 1).padStart(2, "0")}</text>
<circle cx="${TW - 52}" cy="52" r="22" fill="none" stroke="${t.lineControl}" stroke-width="1.5"/>
${icon("up-right", TW - 61, 43, 18, t.foreground)}
<text x="38" y="118" font-family="${SANS}" font-size="36" font-weight="600" letter-spacing="-1" fill="${t.foregroundBright}">${esc(name)}</text>
<g font-family="${SANS}" font-size="18" fill="${t.muted}">${lines.map((line, j) => `<text x="40" y="${156 + j * 26}">${esc(line)}</text>`).join("")}</g>
<text x="40" y="${TH - 26}" font-family="${MONO}" font-size="11" letter-spacing=".44" fill="${t.muted}">${esc(tags)}</text>
</g>`;
    return svg(TW, TH, `${name}. ${lines.join(" ")}`, `${name}: ${lines.join(" ")} ${tags}`, style, body);
  };
}

// ── Toolkit: three rows of pills drifting in opposite directions ──────────────

function toolkit(t) {
  const H = 250;
  const rows = [
    ["C++", "Python", "TypeScript", "Swift", "JavaScript", "C#", "QML", "Shell"],
    ["OpenCV", "YOLO", "PyTorch", "MediaPipe", "VEX V5", "PROS", "ROS 2", "Odometry", "PID"],
    ["Linux", "Hyprland", "CMake", "Docker", "React", "SQLite", "Fusion 360", "3D printing", "Git"],
  ];
  const pill = (text, x, y) => {
    const w = r2(text.length * 10 + 44);
    return { w, svg: `<g transform="translate(${r2(x)} ${y})"><rect width="${w}" height="50" rx="25" fill="none" stroke="${t.lineControl}" stroke-width="1.2"/><text x="${r2(w / 2)}" y="32" text-anchor="middle" font-family="${SANS}" font-size="18" fill="${t.foreground}">${esc(text)}</text></g>` };
  };
  const spans = [];
  const rowSvg = rows.map((items, r) => {
    const y = 12 + r * 80;
    let x = 0;
    const parts = [];
    for (let copy = 0; copy < 2; copy += 1) {
      for (const item of items) {
        const p = pill(item, x, y);
        parts.push(p.svg);
        x += p.w + 12;
      }
      if (copy === 0) spans.push(r2(x));
    }
    return `<g class="row${r}">${parts.join("")}</g>`;
  }).join("\n");
  const style = spans.map((span, r) => {
    const [from, to] = r % 2 ? [-span, 0] : [0, -span];
    return `.row${r}{animation:row${r} ${r2(span / 34)}s linear infinite}@keyframes row${r}{from{transform:translateX(${from}px)}to{transform:translateX(${to}px)}}`;
  }).join("");
  const body = `<defs><linearGradient id="edge"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff"/><stop offset=".9" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask></defs>
<g mask="url(#fade)">${rowSvg}</g>`;
  return svg(W, H, "Toolkit", rows.flat().join(", "), style, body);
}

// ── Closing: a DotField that leans toward a gliding cursor ────────────────────

function closing(t) {
  const H = 480, loop = 14, frames = 28;
  // A floor of dots in true perspective, receding to a horizon behind the headline.
  const HORIZON = 118, FOCAL = 620, EYE = 1;
  const view = ([x, z]) => [W / 2 + FOCAL * x / z, HORIZON + FOCAL * EYE / z];
  const cursorWorld = (f) => {
    const a = f * 2 * Math.PI;
    return [3.4 * Math.cos(a), 5.2 + 2.6 * Math.sin(a) + 0.4 * Math.sin(3 * a)];
  };
  const cursorFloor = Array.from({ length: frames + 1 }, (_, k) => cursorWorld(k / frames));
  const cursorPath = cursorFloor.map((p) => view(p).map(r2));
  const still = [];
  const live = [];
  const SPAN = 0.62, rows = [];
  for (let z = 1.65; z < 15; z *= 1.17) rows.push(z);
  const reach = (z) => (W / 2 + 40) * z / FOCAL;
  const far = rows.at(-1), near = rows[0];
  const lines = [];
  for (let i = -Math.floor(reach(far) / SPAN); i * SPAN <= reach(far); i += 1) {
    const [x0, y0] = view([i * SPAN, near]), [x1, y1] = view([i * SPAN, far]);
    lines.push(`M${r2(x0)} ${r2(y0)}L${r2(x1)} ${r2(y1)}`);
  }
  for (const z of rows) {
    const [x0, y0] = view([-reach(z), z]), [x1] = view([reach(z), z]);
    lines.push(`M${r2(x0)} ${r2(y0)}H${r2(x1)}`);
  }
  for (const z of rows) {
    for (let i = -Math.floor(reach(z) / SPAN); i * SPAN <= reach(z); i += 1) {
      const x = i * SPAN;
      const [sx, sy] = view([x, z]);
      if (sy > H + 4) continue;
      // Fade toward the horizon and behind the copy, so the type stays clear.
      const depth = Math.min(1, Math.max(0, (15 - z) / 11));
      const copy = Math.hypot((sx - W / 2) / 2.2, sy - 268);
      const clear = Math.min(1, Math.max(0, (copy - 60) / 160));
      const alpha = r2((0.08 + 0.42 * depth) * (0.3 + 0.7 * clear));
      if (alpha < 0.05) continue;
      const radius = r2(Math.min(3.2, Math.max(0.8, 4.6 / z)));
      const circle = `<circle cx="${r2(sx)}" cy="${r2(sy)}" r="${radius}" fill-opacity="${alpha}"`;
      still.push(`${circle}/>`);
      const offsets = cursorFloor.map(([qx, qz]) => {
        const dx = qx - x, dz = qz - z, dist = Math.hypot(dx, dz) || 1;
        const pull = 0.3 * Math.exp(-((dist / 1.2) ** 2));
        const [px, py] = view([x + dx / dist * pull, z + dz / dist * pull]);
        return [r2(px - sx), r2(py - sy)];
      });
      if (Math.max(...offsets.map(([ox, oy]) => Math.hypot(ox, oy))) < 0.8) { live.push(`${circle}/>`); continue; }
      live.push(`${circle}><animateTransform attributeName="transform" type="translate" dur="${loop}s" repeatCount="indefinite" values="${offsets.map((o) => o.join(" ")).join(";")}"/></circle>`);
    }
  }
  const d = `M${cursorPath.map((p) => p.join(" ")).join("L")}Z`;
  const link = "CORUND207@GMAIL.COM";
  const linkHalf = (link.length * (14 * 0.6 + 0.56)) / 2;
  const body = `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="28" fill="${t.background}" stroke="${t.lineStrong}" stroke-width="1.5"/>
<clipPath id="closing-frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
<defs><linearGradient id="horizon"><stop offset="0" stop-color="${t.dotEnergy}" stop-opacity="0"/><stop offset=".5" stop-color="${t.dotEnergy}" stop-opacity=".55"/><stop offset="1" stop-color="${t.dotEnergy}" stop-opacity="0"/></linearGradient></defs>
<linearGradient id="floor-fade" gradientUnits="userSpaceOnUse" x1="0" y1="${HORIZON}" x2="0" y2="${H}"><stop offset="0" stop-color="${t.dotInk}" stop-opacity="0"/><stop offset="1" stop-color="${t.dotInk}" stop-opacity=".14"/></linearGradient>
<g clip-path="url(#closing-frame)"><path d="${lines.join("")}" fill="none" stroke="url(#floor-fade)"/></g>
<path d="M60 ${HORIZON}H${W - 60}" stroke="url(#horizon)" stroke-width="1.2"/>
<g clip-path="url(#closing-frame)" fill="${t.dotInk}">
<g class="live">${live.join("")}
<g><ellipse rx="22" ry="7" fill="${t.dotEnergy}" fill-opacity=".16"/><circle r="5" fill="${t.dotEnergy}"/><animateMotion dur="${loop}s" repeatCount="indefinite" path="${d}" calcMode="linear" keyPoints="${cursorPath.map((_, k) => r2(k / frames)).join(";")}" keyTimes="${cursorPath.map((_, k) => r2(k / frames)).join(";")}"/></g>
</g>
<g class="still">${still.join("")}</g>
</g>
<g text-anchor="middle" font-family="${SANS}" font-weight="600">
<text class="r" x="${W / 2}" y="180" font-size="28" fill="${t.muted}">Have a project question?</text>
<text class="r" style="animation-delay:.08s" x="${W / 2}" y="286" font-size="104" letter-spacing="-4" fill="${t.foregroundBright}">Let’s build it.</text>
</g>
<g class="r" style="animation-delay:.16s">
<text x="${W / 2 - 12}" y="352" text-anchor="middle" font-family="${MONO}" font-size="14" letter-spacing=".56" fill="${t.accent}">${link}</text>
${icon("mail", r2(W / 2 - 12 + linkHalf + 8), 340, 16, t.accent)}
</g>`;
  return svg(W, H, "Have a project question? Let’s build it.", "Closing chapter over a floor of dots in perspective that ripples around a gliding blue cursor, with an email link to corund207@gmail.com.", RISE, body);
}

// ── Pill buttons ──────────────────────────────────────────────────────────────

function button(t, { label: text, kind, primary }) {
  const H = 48;
  const w = Math.round(text.length * 6.6 + 72);
  const ink = primary ? t.onAction : t.foreground;
  const body = `<rect x=".75" y=".75" width="${w - 1.5}" height="${H - 1.5}" rx="${(H - 1.5) / 2}" fill="${primary ? t.action : "none"}" stroke="${primary ? t.action : t.lineControl}" stroke-width="1.5"/>
<text x="${w - 48}" y="29" text-anchor="end" font-family="${SANS}" font-size="15" font-weight="500" fill="${ink}">${esc(text)}</text>
${icon(kind, w - 40, 16, 16, ink)}`;
  return svg(w, H, text, `${text} button`, "", body);
}

export const pieces = {
  hero,
  statement,
  "chapter-work": chapter("What I’m building", "Selected work."),
  "chapter-lab": chapter("Smaller tools and experiments", "More from the lab."),
  "chapter-toolkit": chapter("What I build with", "Toolkit."),
  "chapter-activity": chapter("Refreshed every day", "Activity."),
  "showcase-odyssey": odyssey,
  "showcase-orbit": orbit,
  "showcase-iris": iris,
  "showcase-calmlist": calmlist,
  ...Object.fromEntries(TILES.map(([id], i) => [`tile-${id}`, tile(i)])),
  toolkit,
  closing,
  "button-portfolio": (t) => button(t, { label: "Visit Portfolio", kind: "up-right", primary: true }),
  "button-email": (t) => button(t, { label: "Email Me", kind: "mail", primary: false }),
  "button-repositories": (t) => button(t, { label: "View Repositories", kind: "right", primary: false }),
};

export async function buildArt(dir = "assets") {
  await mkdir(dir, { recursive: true });
  const written = [];
  for (const [name, render] of Object.entries(pieces)) {
    for (const theme of Object.values(themes)) {
      const file = `${dir}/${name}-${theme.id}.svg`;
      await writeFile(file, render(theme), "utf8");
      written.push(file);
    }
  }
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log((await buildArt()).join("\n"));
}
