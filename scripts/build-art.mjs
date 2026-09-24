// Generates every static SVG on the profile, once per theme:
//   node scripts/build-art.mjs   →  assets/<name>-dark.svg, assets/<name>-light.svg
// GitHub renders these through <img>, so motion is CSS or SMIL only, and every piece
// settles to a readable still frame under prefers-reduced-motion.

import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { themes, ease, esc, SANS, MONO } from "./theme.mjs";

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

// Lucide arrow-up-right / arrow-right, stroke 2, drawn at `size` px.
function icon(kind, x, y, size, color) {
  const d = kind === "up-right" ? "M7 7h10v10M7 17 17 7" : "M5 12h14M12 5l7 7-7 7";
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
  const rings = [
    { r: 150, alpha: 0.1, dur: 90, dir: 1 },
    { r: 215, alpha: 0.13, dur: 120, dir: -1 },
    { r: 285, alpha: 0.18, dur: 150, dir: 1, satellite: 40 },
    { r: 360, alpha: 0.22, dur: 190, dir: -1, satellite: 205 },
    { r: 440, alpha: 0.26, dur: 240, dir: 1, satellite: 320 },
    { r: 525, alpha: 0.28, dur: 300, dir: -1 },
    { r: 615, alpha: 0.3, dur: 360, dir: 1, satellite: 150 },
  ];
  const ringSvg = rings.map((ring, i) => {
    const count = Math.round((2 * Math.PI * ring.r) / 30);
    const dots = [];
    for (let k = 0; k < count; k += 1) {
      const a = (k / count) * 2 * Math.PI + i * 0.37;
      const x = r2(cx + ring.r * Math.cos(a)), y = r2(cy + ring.r * Math.sin(a));
      if (y < -10 || y > H + 10) continue;
      dots.push(`<circle cx="${x}" cy="${y}" r="2.2"/>`);
    }
    const sat = ring.satellite === undefined ? "" : (() => {
      const a = ring.satellite * Math.PI / 180;
      const x = r2(cx + ring.r * Math.cos(a)), y = r2(cy + ring.r * Math.sin(a));
      return `<circle class="halo" cx="${x}" cy="${y}" r="4.5" fill="none" stroke="${t.dotEnergy}" stroke-width="1.2" style="animation-delay:${r2(i * 0.7)}s"/><circle cx="${x}" cy="${y}" r="4.5" fill="${t.dotEnergy}"/>`;
    })();
    return `<g class="orbit" style="animation-duration:${ring.dur}s;animation-direction:${ring.dir > 0 ? "normal" : "reverse"}"><g fill="${t.dotInk}" fill-opacity="${ring.alpha}">${dots.join("")}</g>${sat}</g>`;
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
<g text-anchor="middle" font-family="${SANS}" font-weight="520">
<text class="r" x="${cx}" y="208" font-size="28" fill="${t.muted}">Hi, I’m Jonah.</text>
<text x="${cx}" y="306" font-size="96" letter-spacing="-5.3" fill="${t.foregroundBright}">${kinetic(line1, "k1", 0)}</text>
<text x="${cx}" y="400" font-size="96" letter-spacing="-5.3" fill="${t.muted}">${kinetic(line2, "k2", line1.length)}</text>
</g>
<text class="r" style="animation-delay:.9s" x="${cx}" y="500" text-anchor="middle" font-family="${MONO}" font-size="13" letter-spacing=".52" fill="${t.foregroundSoft}">ROBOTICS  ·  COMPUTER VISION  ·  SYSTEMS SOFTWARE</text>`;
  return svg(W, H, "Jonah Chang. I build robots. And teach them to see.",
    "Black header with the headline in huge type over slowly orbiting rings of dots, each ring carrying a blue satellite.", style, body);
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
  const body = `<g text-anchor="middle" font-family="${SANS}" font-size="42" font-weight="520" letter-spacing="-1.3" fill="${t.foregroundBright}">
${text}
</g>`;
  return svg(W, H, lines.join(" "), "The about paragraph in large type; each word lights up in turn.", style, body);
}

// ── Chapter headings ──────────────────────────────────────────────────────────

function chapter(eyebrow, title) {
  return (t) => svg(W, 210, title, `${eyebrow}. ${title}`, RISE,
    `<g text-anchor="middle" font-family="${SANS}" font-weight="520">
<text class="r" x="${W / 2}" y="78" font-size="26" fill="${t.muted}">${esc(eyebrow)}</text>
<text class="r" style="animation-delay:.08s" x="${W / 2}" y="170" font-size="84" letter-spacing="-4.4" fill="${t.foregroundBright}">${esc(title)}</text>
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
<text x="${x0 - 4}" y="262" font-family="${SANS}" font-size="84" font-weight="520" letter-spacing="-4.4" fill="${t.foregroundBright}">${esc(name)}</text>
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

function odyssey(t) {
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
  const diagram = `<rect x="${field.x}" y="${field.y}" width="${field.s}" height="${field.s}" rx="6" fill="none" stroke="${t.lineStrong}" stroke-width="2"/>
<path d="${tiles.join("")}" stroke="${t.line}"/>
<path d="${path.d}" fill="none" stroke="${t.lineStrong}" stroke-width="1.5" stroke-dasharray="4 7"/>
<g fill="${t.surfaceSoft}" stroke="${t.muted}" stroke-width="1.5">${waypoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join("")}</g>
${label(t, 24, 474, "FIELD 144 × 144 IN")}
<g class="live">
<path class="trail" d="${path.d}" pathLength="1" fill="none" stroke="${t.accent}" stroke-width="3" stroke-linecap="round"/>
<g><circle r="46" fill="${t.accent}" fill-opacity=".06" stroke="${t.accent}" stroke-opacity=".5" stroke-dasharray="3 5"/><animateMotion dur="${loop}s" repeatCount="indefinite" path="${path.d}"/></g>
<g><circle r="5" fill="${t.accent}"/><animateMotion dur="${loop}s" begin="-0.55s" repeatCount="indefinite" path="${path.d}"/></g>
<g>${robot}<animateMotion dur="${loop}s" repeatCount="indefinite" rotate="auto" path="${path.d}"/></g>
${modes.map(([name], i) => label(t, 24, 34, name, { color: t.accent, cls: `om${i}` })).join("")}
${Array.from({ length: steps }, (_, i) => label(t, 616, 34, readout(i / steps), { anchor: "end", cls: `op${i}` })).join("")}
</g>
<g class="still">
<path d="${path.d}" fill="none" stroke="${t.accent}" stroke-width="3"/>
<g transform="translate(${r2(still.x)} ${r2(still.y)}) rotate(${r2(still.heading)})">${robot}</g>
${label(t, 24, 34, "PURE PURSUIT", { color: t.accent })}
${label(t, 616, 34, readout(0.36), { anchor: "end" })}
</g>`;
  return showcase(t, {
    id: "odyssey", flip: false, index: "01", eyebrow: "LOCALIZATION", name: "Odyssey",
    lines: ["Know where you are.", "Control where you go. Odometry", "and autonomous motion for VEX V5."],
    tags: "C++  ·  PROS  ·  PID  ·  PURE PURSUIT", cta: "Explore Odyssey", diagram, style,
    desc: "Top-down VEX field. A robot drives a loop through waypoints with its lookahead circle, drawing its trail while the controller mode and pose readout update.",
  });
}

function orbit(t) {
  const loop = 10, N = 40;
  const camL = [270, 440], camR = [370, 440], mid = [320, 440];
  const track = Array.from({ length: N + 1 }, (_, i) => {
    const a = (i / N) * 2 * Math.PI;
    return [r2(320 + 190 * Math.sin(a)), r2(210 + 70 * Math.sin(2 * a + 0.6))];
  });
  const values = (fn) => track.map(fn).join(";");
  const anim = (attr, fn) => `<animate attributeName="${attr}" dur="${loop}s" repeatCount="indefinite" values="${values(fn)}"/>`;
  const others = [[[140, 150], [160, 170], [150, 190]], [[500, 110], [482, 128], [492, 100]]];
  const stages = ["STEREO PAIR", "YOLO DETECT", "TRIANGULATE", "KALMAN TRACK"];
  const bracket = (s) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `M${sx * s} ${sy * (s - 7)}V${sy * s}H${sx * (s - 7)}`).join("");
  const cone = ([x, y]) => `M${x} ${y}L${x - 400} ${y - 560}H${x + 400}Z`;
  const [sx, sy] = track[4];
  const style = `
${stages.map((_, i) => [["t", t.muted, t.foreground], ["c", t.lineStrong, t.accent]].map(([part, off, on]) =>
    `@keyframes s${part}${i}{0%,${pct(i / 4)}{fill:${off}}${pct(i / 4 + 0.01)},${pct((i + 1) / 4)}{fill:${on}}${pct((i + 1) / 4 + 0.01)},100%{fill:${off}}}`).join("")).join("")}
${stages.map((_, i) => `.s${i} text{fill:${t.muted};animation:st${i} ${loop / 2}s linear infinite}.s${i} circle{fill:${t.lineStrong};animation:sc${i} ${loop / 2}s linear infinite}`).join("")}
.ghost{animation:ghost 3.4s ease-in-out infinite}@keyframes ghost{50%{opacity:.35}}`;
  const target = (x, y) => `<circle r="6" fill="${t.accent}"/><path d="${bracket(18)}" fill="none" stroke="${t.accent}" stroke-width="1.5"/>`;
  const diagram = `<g fill="${t.accent}" fill-opacity=".045">${[camL, camR].map((c) => `<path d="${cone(c)}"/>`).join("")}</g>
<g fill="none" stroke="${t.line}">${[120, 220, 320].map((r) => `<path d="M${mid[0] - r} ${mid[1]}A${r} ${r} 0 0 1 ${mid[0] + r} ${mid[1]}"/>`).join("")}</g>
${[120, 220, 320].map((r, i) => label(t, mid[0] + 8, mid[1] - r - 8, `${i + 1} M`)).join("")}
${others.map((pts, i) => `<g class="ghost" style="animation-delay:-${i * 1.3}s"><g transform="translate(${pts[0].join(" ")})"><circle r="4" fill="${t.dotInk}" fill-opacity=".45"/><path d="${bracket(13)}" fill="none" stroke="${t.muted}" stroke-width="1.2"/></g></g>`).join("")}
${label(t, others[0][0][0] + 18, others[0][0][1] + 4, "ID 03")}${label(t, others[1][0][0] + 18, others[1][0][1] + 4, "ID 11")}
<g class="live">
<line x1="${camL[0]}" y1="${camL[1]}" stroke="${t.accent}" stroke-opacity=".7" stroke-width="1.5">${anim("x2", ([x]) => x)}${anim("y2", ([, y]) => y)}</line>
<line x1="${camR[0]}" y1="${camR[1]}" stroke="${t.accent}" stroke-opacity=".7" stroke-width="1.5">${anim("x2", ([x]) => x)}${anim("y2", ([, y]) => y)}</line>
<line x1="${mid[0]}" y1="${mid[1]}" stroke="${t.muted}" stroke-dasharray="3 5">${anim("x2", ([x]) => x)}${anim("y2", ([, y]) => y)}</line>
<g>${target()}<animateTransform attributeName="transform" type="translate" dur="${loop}s" repeatCount="indefinite" values="${values(([x, y]) => `${x} ${y}`)}"/></g>
<text font-family="${MONO}" font-size="11" letter-spacing=".44" fill="${t.accent}">ID 07<animateTransform attributeName="transform" type="translate" dur="${loop}s" repeatCount="indefinite" values="${values(([x, y]) => `${r2(x + 26)} ${r2(y - 14)}`)}"/></text>
</g>
<g class="still">
<path d="M${camL.join(" ")}L${sx} ${sy}M${camR.join(" ")}L${sx} ${sy}" stroke="${t.accent}" stroke-opacity=".7" stroke-width="1.5"/>
<path d="M${mid.join(" ")}L${sx} ${sy}" stroke="${t.muted}" stroke-dasharray="3 5"/>
<g transform="translate(${sx} ${sy})">${target()}</g>
${label(t, r2(sx + 26), r2(sy - 14), "ID 07", { color: t.accent })}
</g>
<path d="M${camL[0]} ${camL[1]}H${camR[0]}" stroke="${t.lineStrong}" stroke-width="2"/>
${[camL, camR].map(([x, y]) => `<rect x="${x - 17}" y="${y - 11}" width="34" height="22" rx="6" fill="${t.surface}" stroke="${t.foregroundSoft}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${t.accent}" stroke-width="2"/>`).join("")}
${label(t, mid[0], 478, "BASELINE", { anchor: "middle" })}
<g font-family="${MONO}" font-size="11" letter-spacing=".44">${stages.map((name, i) => `<g class="s s${i}"><circle cx="30" cy="${30 + i * 24}" r="4"/><text x="44" y="${34 + i * 24}">${name}</text></g>`).join("")}</g>`;
  return showcase(t, {
    id: "orbit", flip: true, index: "02", eyebrow: "PERCEPTION", name: "O.R.B.I.T.",
    lines: ["Two cameras. One answer.", "Low-cost stereo perception that", "finds, ranges and tracks targets."],
    tags: "PYTHON  ·  YOLO  ·  OPENCV  ·  STEREO", cta: "Explore O.R.B.I.T.", diagram, style,
    desc: "Top-down stereo rig. Rays from two cameras triangulate a moving target while two other tracks hold their IDs and the pipeline steps through detection and tracking.",
  });
}

function iris(t) {
  const loop = 12;
  const S = [320, 290], L1 = 132, L2 = 122, GRIP = 30;
  const beltTop = 390, binFloor = 440;
  const pick = [210, beltTop - 10], binA = [448, binFloor - 12], binB = [556, binFloor - 12];
  const wrist = ([x, y], lift = 0) => [x, y - GRIP - lift];
  const norm = (a) => ((a + 180) % 360 + 360) % 360 - 180;
  const ik = ([x, y]) => {
    const dx = x - S[0], dy = y - S[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - 1);
    const cosE = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const options = [1, -1].map((sign) => {
      const e = sign * Math.acos(Math.max(-1, Math.min(1, cosE)));
      const a1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(e), L1 + L2 * Math.cos(e));
      return { a1: a1 * 180 / Math.PI, a2: e * 180 / Math.PI, elbowY: S[1] + L1 * Math.sin(a1) };
    });
    const best = options.sort((a, b) => a.elbowY - b.elbowY)[0];
    return [best.a1, best.a2, 90 - best.a1 - best.a2];
  };
  const home = [330, 150];
  const plan = [
    [0, home], [13, wrist(pick, 70)], [18, wrist(pick)], [22, wrist(pick)], [28, wrist(pick, 90)],
    [38, wrist(binA, 110)], [43, wrist(binA)], [46, wrist(binA)], [52, home],
    [59, wrist(pick, 70)], [64, wrist(pick)], [68, wrist(pick)], [74, wrist(pick, 90)],
    [84, wrist(binB, 110)], [89, wrist(binB)], [92, wrist(binB)], [100, home],
  ];
  const poses = [];
  for (const [at, target] of plan) {
    const angles = ik(target);
    const prev = poses.at(-1)?.angles;
    poses.push({ at, angles: angles.map((a, j) => (prev ? prev[j] + norm(a - prev[j]) : norm(a))) });
  }
  const [h1, h2, h3] = poses[0].angles.map(r2);
  const partA = (x, y) => `<rect x="${x - 11}" y="${y - 11}" width="22" height="22" rx="5" fill="${t.accent}"/>`;
  const partB = (x, y) => `<circle cx="${x}" cy="${y}" r="11" fill="${t.foregroundSoft}"/>`;
  const link = (length) => `<path d="M0 0H${length}" stroke="${t.foregroundSoft}" stroke-width="14" stroke-linecap="round"/><path d="M0 0H${length}" stroke="${t.surfaceSoft}" stroke-width="4" stroke-linecap="round" stroke-opacity=".5"/>`;
  const jointDot = `<circle r="8" fill="${t.surfaceSoft}" stroke="${t.accent}" stroke-width="2.5"/>`;
  const vis = (name, frames) => `@keyframes ${name}{${frames}}.${name}{animation:${name} ${loop}s linear infinite}`;
  const style = `
${[0, 1, 2].map((j) => `@keyframes j${j}{${poses.map(({ at, angles }) => `${at}%{transform:rotate(${r2(angles[j])}deg)}`).join("")}}.j${j}{animation:j${j} ${loop}s ease-in-out infinite}`).join("")}
@keyframes inA{0%{transform:translateX(-150px);opacity:0}2%{opacity:1}8%,21.99%{transform:translateX(0);opacity:1}22%,100%{transform:translateX(0);opacity:0}}.inA{animation:inA ${loop}s ${ease.row} infinite}
@keyframes inB{0%,45.99%{transform:translateX(-150px);opacity:0}46%{transform:translateX(-150px);opacity:0}48%{opacity:1}54%,67.99%{transform:translateX(0);opacity:1}68%,100%{transform:translateX(0);opacity:0}}.inB{animation:inB ${loop}s ${ease.row} infinite}
${vis("heldA", "0%,21.99%{opacity:0}22%,45.99%{opacity:1}46%,100%{opacity:0}")}
${vis("heldB", "0%,67.99%{opacity:0}68%,91.99%{opacity:1}92%,100%{opacity:0}")}
${vis("dropA", "0%,45.99%{opacity:0}46%,94%{opacity:1}100%{opacity:0}")}
${vis("dropB", "0%,91.99%{opacity:0}92%,95%{opacity:1}100%{opacity:0}")}
${vis("scan", "0%,8%{opacity:0}9%{opacity:1}13%{opacity:.2}14%,54%{opacity:0}55%{opacity:1}59%{opacity:.2}60%,100%{opacity:0}")}
${windowFrames("clsA", 0.09, 0.46)}.clsA{opacity:0;animation:clsA ${loop}s linear infinite}
${windowFrames("clsB", 0.55, 0.92)}.clsB{opacity:0;animation:clsB ${loop}s linear infinite}
.belt{stroke-dasharray:4 10;animation:belt 1.2s linear infinite}@keyframes belt{to{stroke-dashoffset:-14}}`;
  const cam = [210, 96];
  const diagram = `<path d="M0 ${binFloor}H${PANEL.w}" stroke="${t.line}"/>
<rect x="36" y="${beltTop}" width="206" height="22" rx="11" fill="none" stroke="${t.lineStrong}" stroke-width="2"/>
<path class="belt" d="M48 ${beltTop + 11}H230" stroke="${t.muted}" stroke-width="2"/>
<path d="M${binA[0] - 38} 384V${binFloor}H${binA[0] + 38}V384M${binB[0] - 38} 384V${binFloor}H${binB[0] + 38}V384" fill="none" stroke="${t.lineStrong}" stroke-width="2"/>
${label(t, binA[0], 468, "CLASS A", { anchor: "middle" })}${label(t, binB[0], 468, "CLASS B", { anchor: "middle" })}
<path class="scan" d="M${cam[0] - 8} ${cam[1] + 12}L${pick[0] - 40} ${beltTop - 2}H${pick[0] + 40}L${cam[0] + 8} ${cam[1] + 12}Z" fill="${t.accent}" fill-opacity=".14" opacity="0"/>
<rect x="${cam[0] - 20}" y="${cam[1] - 12}" width="40" height="24" rx="6" fill="${t.surface}" stroke="${t.foregroundSoft}" stroke-width="1.5"/><circle cx="${cam[0]}" cy="${cam[1]}" r="6" fill="none" stroke="${t.accent}" stroke-width="2"/>
<path d="M${cam[0]} ${cam[1] - 12}V0" stroke="${t.lineStrong}" stroke-width="2"/>
<g class="live">${label(t, cam[0] + 32, cam[1] + 4, "→ CLASS A", { color: t.accent, cls: "clsA" })}${label(t, cam[0] + 32, cam[1] + 4, "→ CLASS B", { color: t.accent, cls: "clsB" })}</g>
<g class="inA">${partA(...pick)}</g>
<g class="inB" style="opacity:0">${partB(...pick)}</g>
<g class="dropA" style="opacity:0">${partA(...binA)}</g>
<g class="dropB" style="opacity:0">${partB(...binB)}</g>
<rect x="${S[0] - 24}" y="${S[1] + 8}" width="48" height="${binFloor - S[1] - 8}" rx="8" fill="${t.foreground}" fill-opacity=".12"/>
<g transform="translate(${S[0]} ${S[1]})"><g class="j0" transform="rotate(${h1})">
${link(L1)}
<g transform="translate(${L1} 0)"><g class="j1" transform="rotate(${h2})">
${link(L2)}
<g transform="translate(${L2} 0)"><g class="j2" transform="rotate(${h3})">
<path d="M0 0H16M16 -14V14M16 -14H42M16 14H42" fill="none" stroke="${t.foregroundSoft}" stroke-width="3.5" stroke-linecap="round"/>
<g class="heldA" style="opacity:0">${partA(GRIP, 0)}</g><g class="heldB" style="opacity:0">${partB(GRIP, 0)}</g>
</g>${jointDot}</g>
</g>${jointDot}</g>
</g>${jointDot}</g>
${label(t, 24, 34, "IDENTIFY  →  PICK  →  SORT", { color: t.accent })}
${label(t, 616, 34, "6-DOF  ·  3D PRINTED", { anchor: "end" })}`;
  return showcase(t, {
    id: "iris", flip: false, index: "03", eyebrow: "MANIPULATION", name: "IRIS",
    lines: ["See it. Pick it. Sort it.", "A 3D-printed arm for autonomous", "identification and sorting."],
    tags: "3RD PLACE · ENGINEERING · MAINE STATE SCIENCE FAIR", cta: "Explore IRIS", diagram, style,
    desc: "Parts arrive on a conveyor, a camera classifies each one, and the arm lifts it into the matching bin.",
  });
}

function calmlist(t) {
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
<text x="${main}" y="${win.y + 94}" font-family="${SANS}" font-size="30" font-weight="520" letter-spacing="-1" fill="${t.foregroundBright}">Today</text>
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
  ["odyssey-sim", "Odyssey Simulator", ["Plan autonomous routines on a virtual", "VEX field, then export the C++."], "TYPESCRIPT · SIMULATION"],
  ["sourcesight", "SourceSight", ["Linux-native real-time visualization", "with a custom Dear ImGui interface."], "C++20 · OPENGL · IMGUI"],
  ["handwave", "Handwave", ["Control a Mac with hand gestures", "through the webcam."], "PYTHON · MEDIAPIPE"],
  ["override", "Team 56S / Override", ["Competition code for VEX team 56S,", "with Odyssey-powered autonomous."], "C++ · PROS · VEX V5"],
  ["harbor", "Harbor", ["Local media download and conversion", "built on YoutubeExplode and ffmpeg."], "C# · .NET"],
  ["desktops", "Omarchy desktops", ["Four Hyprland themes with their own", "bars, motion and screensavers."], "QML · CSS · SHELL"],
];

function tile(i) {
  const [, name, lines, tags] = TILES[i];
  return (t) => {
    const TW = 590, TH = 240;
    const style = `${RISE}.dot{animation:pulse 4s ease-in-out infinite}@keyframes pulse{50%{fill-opacity:.25}}`;
    const body = `<rect width="${TW}" height="${TH}" rx="24" fill="${t.surface}"/>
<g class="r" style="animation-delay:${r2(i * 0.06)}s">
<circle class="dot" cx="44" cy="50" r="4" fill="${t.accent}" style="animation-delay:-${i * 0.6}s"/>
<text x="58" y="54" font-family="${MONO}" font-size="12" letter-spacing=".5" fill="${t.muted}">${String(i + 1).padStart(2, "0")}</text>
<circle cx="${TW - 52}" cy="52" r="22" fill="none" stroke="${t.lineControl}" stroke-width="1.5"/>
${icon("up-right", TW - 61, 43, 18, t.foreground)}
<text x="38" y="118" font-family="${SANS}" font-size="36" font-weight="520" letter-spacing="-1.3" fill="${t.foregroundBright}">${esc(name)}</text>
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
  const H = 480, gap = 36, loop = 14, frames = 28;
  const cursor = (f) => {
    const a = f * 2 * Math.PI;
    return [W / 2 + 450 * Math.cos(a), H / 2 + 170 * Math.sin(a) + 30 * Math.sin(3 * a)];
  };
  const cursorPath = Array.from({ length: frames + 1 }, (_, k) => cursor(k / frames).map(r2));
  const still = [];
  const live = [];
  for (let y = 24; y < H; y += gap) {
    for (let x = 24; x < W; x += gap) {
      const d = Math.hypot((x - W / 2) / 1.7, y - H / 2 + 6);
      const alpha = r2(0.05 + 0.3 * Math.min(1, Math.max(0, (d - 140) / 240)));
      if (alpha < 0.07) continue;
      const circle = `<circle cx="${x}" cy="${y}" r="2.2" fill-opacity="${alpha}"`;
      still.push(`${circle}/>`);
      const offsets = cursorPath.map(([qx, qy]) => {
        const dx = qx - x, dy = qy - y, dist = Math.hypot(dx, dy) || 1;
        const pull = 14 * Math.exp(-((dist / 130) ** 2));
        return [r2(dx / dist * pull), r2(dy / dist * pull)];
      });
      if (Math.max(...offsets.map(([ox, oy]) => Math.hypot(ox, oy))) < 0.8) { live.push(`${circle}/>`); continue; }
      live.push(`${circle}><animateTransform attributeName="transform" type="translate" dur="${loop}s" repeatCount="indefinite" values="${offsets.map((o) => o.join(" ")).join(";")}"/></circle>`);
    }
  }
  const link = "JONAHCHANG207.VERCEL.APP";
  const linkHalf = (link.length * (14 * 0.6 + 0.56)) / 2;
  const d = `M${cursorPath.map((p) => p.join(" ")).join("L")}Z`;
  const body = `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="28" fill="${t.background}" stroke="${t.lineStrong}" stroke-width="1.5"/>
<clipPath id="closing-frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
<g clip-path="url(#closing-frame)" fill="${t.dotInk}">
<g class="live">${live.join("")}
<g><circle r="16" fill="${t.dotEnergy}" fill-opacity=".12"/><circle r="5" fill="${t.dotEnergy}"/><animateMotion dur="${loop}s" repeatCount="indefinite" path="${d}" calcMode="linear" keyPoints="${cursorPath.map((_, k) => r2(k / frames)).join(";")}" keyTimes="${cursorPath.map((_, k) => r2(k / frames)).join(";")}"/></g>
</g>
<g class="still">${still.join("")}</g>
</g>
<g text-anchor="middle" font-family="${SANS}" font-weight="520">
<text class="r" x="${W / 2}" y="180" font-size="28" fill="${t.muted}">Have a project question?</text>
<text class="r" style="animation-delay:.08s" x="${W / 2}" y="286" font-size="104" letter-spacing="-6" fill="${t.foregroundBright}">Let’s build it.</text>
</g>
<g class="r" style="animation-delay:.16s">
<text x="${W / 2 - 12}" y="352" text-anchor="middle" font-family="${MONO}" font-size="14" letter-spacing=".56" fill="${t.accent}">${link}</text>
${icon("up-right", r2(W / 2 - 12 + linkHalf + 6), 340, 16, t.accent)}
</g>`;
  return svg(W, H, "Have a project question? Let’s build it.", "Closing chapter over a dot field that leans toward a softly gliding blue cursor, with a link to jonahchang207.vercel.app.", RISE, body);
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
