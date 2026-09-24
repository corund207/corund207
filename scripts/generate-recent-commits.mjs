import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { themes, ease, esc, SANS, MONO } from "./theme.mjs";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const WEEK_COUNT = 13;
const dateLabel = (date) => new Date(date).toISOString().slice(0, 10);

// Thirteen seven-day buckets, including the current (partial) UTC day.
export function activityWindow(now = new Date()) {
  const end = new Date(now);
  const today = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return { start: new Date(today - (WEEK_COUNT * 7 - 1) * DAY), end };
}

export function summarizeCommits(commits, repo, owner, { start, end }) {
  const weeks = Array(WEEK_COUNT).fill(0);
  const seen = new Set();
  let excludedRefreshes = 0;
  for (const item of commits) {
    if (seen.has(item.sha)) continue;
    seen.add(item.sha);
    const date = new Date(item.commit.author?.date).getTime();
    if (!Number.isFinite(date) || date < +start || date > +end) continue;
    // The old workflow authored these under the owner's identity.
    const legacyRefresh = repo.name.toLowerCase() === owner.toLowerCase()
      && item.commit.message.trim() === "Update recent commit activity";
    if (legacyRefresh) {
      excludedRefreshes += 1;
      continue;
    }
    if (item.author?.type === "Bot" || item.author?.login?.toLowerCase() !== owner.toLowerCase()) continue;
    const week = Math.floor((date - start) / WEEK);
    if (week >= 0 && week < WEEK_COUNT) weeks[week] += 1;
  }
  return { name: repo.name, count: weeks.reduce((sum, count) => sum + count, 0), weeks, excludedRefreshes };
}

export async function collectActivity(owner, window, request) {
  async function paged(path) {
    const items = [];
    for (let page = 1; ; page += 1) {
      const batch = await request(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw new Error("Expected a GitHub API list");
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  }
  const repos = (await paged(`/users/${encodeURIComponent(owner)}/repos?type=owner&sort=full_name`))
    .filter((repo) => !repo.fork && !repo.private && !repo.archived);
  const projects = [];
  let excludedRefreshes = 0;
  for (const repo of repos) {
    // Read the full author-filtered history. Git's query date and author date can
    // differ after rebases, so filtering "since" before bucketing can lose commits.
    const query = new URLSearchParams({ author: owner, sha: repo.default_branch });
    let commits;
    try {
      commits = await paged(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/commits?${query}`);
    } catch (error) {
      if (error.status === 409 && /Git Repository is empty/i.test(error.message)) continue;
      throw error; // Never replace the graph with partial data after an API failure.
    }
    const project = summarizeCommits(commits, repo, owner, window);
    excludedRefreshes += project.excludedRefreshes;
    if (project.count) projects.push(project);
  }
  projects.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { projects, excludedRefreshes, total: projects.reduce((sum, p) => sum + p.count, 0) };
}

export function renderActivity({ projects, total }, { start, end }, t = themes.dark) {
  const top = 330;
  const height = top + 96 + Math.max(projects.length, 1) * 44;
  const maxCount = Math.max(1, ...projects.map((p) => p.count));
  const maxWeek = Math.max(1, ...projects.flatMap((p) => p.weeks));
  const weekly = Array.from({ length: WEEK_COUNT }, (_, week) => projects.reduce((sum, p) => sum + p.weeks[week], 0));
  const peak = Math.max(1, ...weekly);
  const month = (date) => new Date(date).toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const columns = weekly.map((count, week) => {
    const from = +start + week * WEEK;
    const through = Math.min(from + WEEK - 1, +end);
    const x = 560 + week * 46, h = Math.max(4, count / peak * 140);
    const partial = week === WEEK_COUNT - 1;
    const tick = week === 0 || month(from) !== month(from - WEEK) ? `<text x="${x}" y="266">${month(from)}</text>` : "";
    return `<g><title>${dateLabel(from)} to ${dateLabel(through)}: ${count} commits</title>
      <rect class="col" style="animation-delay:${(0.1 + week * 0.05).toFixed(2)}s" x="${x}" y="${(236 - h).toFixed(2)}" width="34" height="${h.toFixed(2)}" rx="6" fill="${count ? t.accent : t.well}" fill-opacity="${partial ? ".4" : "1"}"${partial ? ` stroke="${t.accent}" stroke-dasharray="3 3"` : ""}/>
      ${tick}</g>`;
  }).join("");
  const rows = projects.map((project, row) => {
    const y = top + 60 + row * 44;
    const name = project.name.length > 26 ? project.name.slice(0, 25) + "…" : project.name;
    const cells = project.weeks.map((count, week) => {
      const from = +start + week * WEEK;
      const through = Math.min(from + WEEK - 1, +end);
      return `<rect x="${776 + week * 22}" y="${y - 13}" width="16" height="16" rx="4" fill="${count ? t.accent : t.well}" opacity="${count ? (.25 + .75 * count / maxWeek).toFixed(3) : 1}"><title>${dateLabel(from)} to ${dateLabel(through)}: ${count} commits</title></rect>`;
    }).join("");
    return `<g class="row" style="animation-delay:${(0.2 + row * 0.05).toFixed(2)}s">
      <title>${esc(project.name)}: ${project.count} commits</title>
      ${row ? `<path d="M44 ${y - 27}H1156" stroke="${t.line}"/>` : ""}
      <text x="44" y="${y}" fill="${t.foreground}" font-size="17">${esc(name)}</text>
      <rect x="342" y="${y - 10}" width="364" height="8" rx="4" fill="${t.well}"/>
      <rect class="bar" style="animation-delay:${(0.3 + row * 0.05).toFixed(2)}s" x="342" y="${y - 10}" width="${(project.count / maxCount * 364).toFixed(2)}" height="8" rx="4" fill="${t.accent}"/>
      ${cells}
      <text x="1156" y="${y}" fill="${t.foregroundBright}" font-size="18" font-weight="520" text-anchor="end">${project.count}</text>
    </g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Public code activity — last 13 weeks</title>
  <desc id="desc">${total} authored commits across ${projects.length} repositories, ${dateLabel(start)} through ${dateLabel(end)} UTC. Weekly totals: ${weekly.join(", ")}. Owned public non-fork, non-archived repositories, default branches only. Generated profile refreshes excluded. ${esc(projects.map((p) => p.name + ": " + p.count).join("; "))}</desc>
  <style>
    .row{animation:rise .65s ${ease.row} backwards}
    .bar{transform-box:fill-box;transform-origin:left;animation:grow .85s ${ease.reveal} backwards}
    .col{transform-box:fill-box;transform-origin:bottom;animation:up .85s ${ease.reveal} backwards}
    .num{animation:rise .85s ${ease.reveal} backwards}
    @keyframes rise{from{opacity:0;transform:translateY(16px)}}
    @keyframes grow{from{transform:scaleX(0)}}
    @keyframes up{from{transform:scaleY(0)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
  <rect width="1200" height="${height}" rx="28" fill="${t.surface}"/>
  <g font-family="${SANS}">
    <text x="44" y="68" fill="${t.accent}" font-family="${MONO}" font-size="12" letter-spacing=".5">PUBLIC CODE ACTIVITY  ·  ${dateLabel(start)} — ${dateLabel(end)}</text>
    <g class="num">
      <text x="36" y="206" fill="${t.foregroundBright}" font-size="150" font-weight="520" letter-spacing="-9.7">${total}<tspan dx="18" fill="${t.muted}" font-size="28" letter-spacing="-.5">commits</tspan></text>
      <text x="44" y="252" fill="${t.muted}" font-size="20">across ${projects.length} repositories in 13 weeks.</text>
    </g>
    <path d="M560 236H1156" stroke="${t.lineStrong}"/>
    <g fill="${t.muted}" font-family="${MONO}" font-size="10" letter-spacing=".45">${columns}</g>
    <text x="1156" y="68" fill="${t.muted}" font-size="13" text-anchor="end">Updated ${end.toISOString().slice(0, 16).replace("T", " ")} UTC</text>
    <path d="M44 ${top - 22}H1156" stroke="${t.lineStrong}"/>
    <g fill="${t.muted}" font-size="10" font-family="${MONO}" letter-spacing=".45"><text x="44" y="${top + 8}">REPOSITORY</text><text x="342" y="${top + 8}">COMMITS · SHARED SCALE</text><text x="776" y="${top + 8}">WEEKLY →</text><text x="1156" y="${top + 8}" text-anchor="end">TOTAL</text></g>
    ${rows || `<text x="600" y="${top + 60}" fill="${t.muted}" font-size="19" text-anchor="middle">No matching commits in this window.</text>`}
    <path d="M44 ${height - 56}H1156" stroke="${t.line}"/>
    <text x="44" y="${height - 26}" fill="${t.muted}" font-size="13">Default branches · author dates in UTC · dashed column is the current, partial week</text>
    <text x="1156" y="${height - 26}" fill="${t.muted}" font-size="13" text-anchor="end">Weekly shade: 0 → ${maxWeek} commits</text>
  </g>
</svg>\n`;
}

async function main() {
  const owner = process.env.GITHUB_OWNER || "corund207";
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": `${owner}-profile-activity`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const request = async (path) => {
    const response = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      const error = new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  };
  const window = activityWindow();
  const activity = await collectActivity(owner, window, request);
  const dir = process.env.OUTPUT_DIR || "assets";
  const outputs = [];
  for (const theme of Object.values(themes)) {
    const output = `${dir}/activity-${theme.id}.svg`;
    await writeFile(output, renderActivity(activity, window, theme), "utf8");
    outputs.push(output);
  }
  console.log(JSON.stringify({ outputs, start: window.start, end: window.end, ...activity }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
