/**
 * render.mjs — HTML/SVG templates for the Reflections daily archive (SEO pages).
 * Pure functions: given a date + deterministic daily config, return page markup.
 * No game state, no DOM — safe to run at build time in Node.
 */
import { createMirrorFromConfig } from '../functions/js/core/Simulation.js';

export const SITE = 'https://wesleyarcade.com/reflections';
const W = 800, H = 600, CX = 400, CY = 300, CORE = 50, EXCLUeq = 108;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export function prettyDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
}
export function prettyTheme(name) {
    return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// Per-theme flavor + strategy. Kept honest and spoiler-light: guidance on how to
// think about the pieces, never a solved layout.
const THEMES = {
    'tiny-army':    { blurb: 'a swarm of small squares and rectangles', tip: 'With so many small pieces, favor redundancy over elegance — build overlapping layers so a laser that slips past one mirror meets another before it reaches the core.' },
    'all-triangles':{ blurb: 'a set of right and isosceles triangles', tip: 'Triangles give you angled faces. Aim the hypotenuses so lasers glance tangentially around the core rather than bouncing straight back through the middle.' },
    'one-wall':     { blurb: 'lasers from a single edge', tip: 'Every threat comes from one side, so you can commit almost everything to a single angled barrier that sweeps the incoming beams away along the wall.' },
    'hexagon-hive': { blurb: 'hexagons only', tip: 'Hexagons offer six reflective faces. Use them to keep lasers circulating around the outside of the core like a pinball table instead of letting any line run clean to center.' },
    'corridor':     { blurb: 'long rectangles, parallelograms and trapezoids', tip: 'Use the long edges to build lanes. Channel each laser into a corridor that carries it past the core and out, angling the channel walls tangential to the center.' },
    'big-three':    { blurb: 'three very large mirrors', tip: 'Few pieces, huge impact. Treat each mirror as a major wall and cover the most direct approach lanes to the core first — a single misplacement is costly here.' },
    'diamond-ring': { blurb: 'pre-rotated squares and hexagons', tip: 'The diamonds arrive angled. Arrange them in a loose ring just outside the core so they bat lasers away tangentially from every side.' },
    'scatter-shot': { blurb: 'many lasers from many edges', tip: 'This is a coverage problem, not a beauty contest. Identify the beams whose straight line runs closest to the core and block those first, then spread the rest for breadth.' },
};

function edgeSummary(spawners) {
    const counts = {};
    for (const s of spawners) counts[s.edge] = (counts[s.edge] || 0) + 1;
    const order = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const names = order.map(([e, n]) => `${n} from the ${e}`);
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names.slice(-1);
}

function inventorySummary(mirrors) {
    const counts = {};
    for (const m of mirrors) {
        const key = prettyShape(m.shape);
        counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([s, n]) => `${n}&times; ${s}`).join(', ');
}
function prettyShape(s) {
    return ({ square: 'square', rectangle: 'rectangle', rightTriangle: 'right triangle', isoscelesTriangle: 'triangle', trapezoid: 'trapezoid', parallelogram: 'parallelogram', hexagon: 'hexagon' })[s] || s;
}

/** SVG "threat map": the core (kill zone) + where each laser enters and its heading. */
export function boardSVG(config) {
    const parts = [];
    parts.push(`<rect x="-12" y="-12" width="${W + 24}" height="${H + 24}" fill="#100d08"/>`);
    // faint grid
    for (let x = 0; x <= W; x += 40) parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(150,156,172,0.06)" stroke-width="1"/>`);
    for (let y = 0; y <= H; y += 40) parts.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(150,156,172,0.06)" stroke-width="1"/>`);
    // exclusion + core
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${EXCLUeq}" fill="none" stroke="rgba(232,78,106,0.28)" stroke-width="2" stroke-dasharray="6 7"/>`);
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${CORE}" fill="rgba(232,78,106,0.14)" stroke="#E84E6A" stroke-width="3"/>`);
    parts.push(`<circle cx="${CX}" cy="${CY}" r="14" fill="#FFB020"/>`);
    // spawners + inbound arrows
    for (const s of config.spawners) {
        const L = 78;
        const ex = s.x + Math.cos(s.angle) * L, ey = s.y + Math.sin(s.angle) * L;
        parts.push(`<line x1="${s.x.toFixed(1)}" y1="${s.y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#FFB020" stroke-width="3" opacity="0.85"/>`);
        // arrowhead
        const a = s.angle, hl = 13, hw = 0.42;
        const p1x = ex - Math.cos(a - hw) * hl, p1y = ey - Math.sin(a - hw) * hl;
        const p2x = ex - Math.cos(a + hw) * hl, p2y = ey - Math.sin(a + hw) * hl;
        parts.push(`<polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}" fill="#FFC24D"/>`);
        parts.push(`<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="9" fill="#FFB020" stroke="#100d08" stroke-width="2"/>`);
    }
    return `<svg viewBox="-12 -12 ${W + 24} ${H + 24}" class="board" role="img" aria-label="Threat map: core with incoming laser directions" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

/** Tiny SVG icon of one mirror piece (deterministic vertices via the game engine). */
function shapeIcon(cfg) {
    try {
        const m = createMirrorFromConfig({ ...cfg, x: 0, y: 0, rotation: cfg.rotation || 0 });
        const vs = m.vertices;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const v of vs) { minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); }
        const w = maxX - minX || 1, h = maxY - minY || 1, pad = 6, box = 52;
        const scale = (box - pad * 2) / Math.max(w, h);
        const ox = pad + (box - pad * 2 - w * scale) / 2, oy = pad + (box - pad * 2 - h * scale) / 2;
        const pts = vs.map(v => `${(ox + (v.x - minX) * scale).toFixed(1)},${(oy + (v.y - minY) * scale).toFixed(1)}`).join(' ');
        return `<svg viewBox="0 0 ${box} ${box}" class="piece" xmlns="http://www.w3.org/2000/svg"><polygon points="${pts}" fill="#aebbd6" stroke="#dfe8f5" stroke-width="1.5"/></svg>`;
    } catch { return ''; }
}

export function strategyHTML(config) {
    const t = THEMES[config.theme] || { blurb: 'a mixed set of mirrors', tip: 'Block the beams whose paths run closest to the core first, then use the rest for coverage.' };
    const n = config.spawners.length;
    const diff = config.difficulty;
    const band = diff <= 3 ? 'gentle' : diff <= 5.5 ? 'moderate' : diff <= 7.5 ? 'tough' : 'brutal';
    return `
      <p>Today's board is the <strong>${prettyTheme(config.theme)}</strong> configuration &mdash; ${t.blurb}. ${n} laser${n === 1 ? '' : 's'} enter the field (${edgeSummary(config.spawners)}), and the puzzle rates <strong>${diff}/10</strong> (${band}).</p>
      <p>${t.tip}</p>
      <p>General rule: your score is <em>survival time</em>, so you don't need a permanent solution &mdash; you need the beams to take the longest possible detour before any of them reaches the center. Keep mirrors out of the red exclusion ring, and remember lasers never fire perfectly straight across the board, so there's always an angle to exploit.</p>`;
}

function head(title, desc, canonical, jsonld) {
    return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/public/og-image.png?v=3">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="${SITE}/public/favicon.svg?v=3">
<meta name="theme-color" content="#0A0906">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
<style>${CSS}</style>`;
}

const CSS = `
:root{--void:#0a0906;--panel:#16130c;--panel2:#1c1810;--line:rgba(150,156,172,.14);--amber:#ffb020;--red:#e84e6a;--ink:#ece7dd;--dim:#9aa0ac;--mono:'Rajdhani',system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1100px 620px at 50% -10%,rgba(255,176,32,.06),transparent 60%),var(--void);color:var(--ink);font-family:var(--mono);line-height:1.6}
.wrap{max-width:820px;margin:0 auto;padding:28px 20px 64px}
a{color:var(--amber);text-decoration:none}
a:hover{text-decoration:underline}
.crumb{font-size:13px;color:var(--dim);letter-spacing:.02em;margin-bottom:18px}
.brand{font-family:'Orbitron',sans-serif;font-weight:800;letter-spacing:3px;color:var(--amber);text-transform:uppercase;font-size:15px}
h1{font-family:'Orbitron',sans-serif;font-weight:800;font-size:clamp(24px,4.5vw,36px);letter-spacing:1px;margin:.2em 0 .1em;text-wrap:balance}
.sub{color:var(--dim);font-size:15px;margin-bottom:22px}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}
.stat{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:10px;padding:12px 16px;min-width:120px}
.stat .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.stat .v{font-family:'Orbitron',sans-serif;font-weight:600;font-size:22px;color:var(--amber);margin-top:4px}
.board{width:100%;height:auto;border:1px solid var(--line);border-radius:12px;display:block;margin:8px 0 6px;background:#100d08}
.caption{font-size:13px;color:var(--dim);text-align:center;margin-bottom:22px}
.pieces{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 4px}
.piece{width:52px;height:52px;background:rgba(150,156,172,.06);border:1px solid var(--line);border-radius:8px}
h2{font-family:'Orbitron',sans-serif;font-weight:600;font-size:18px;letter-spacing:.5px;margin:30px 0 8px;color:var(--amber)}
p{margin:0 0 12px}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 8px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px}
.btn-primary{background:var(--amber);color:#16130c}
.btn-primary:hover{background:#ffc24d;text-decoration:none}
.btn-ghost{background:transparent;border:1px solid var(--line);color:var(--ink)}
.btn-ghost:hover{border-color:rgba(255,176,32,.5);text-decoration:none}
footer{margin-top:44px;padding-top:20px;border-top:1px solid var(--line);color:var(--dim);font-size:13px;display:flex;gap:18px;flex-wrap:wrap}
.arch-list{list-style:none;padding:0;margin:18px 0}
.arch-list li{border-bottom:1px solid var(--line)}
.arch-list a{display:flex;justify-content:space-between;gap:12px;padding:14px 4px;color:var(--ink)}
.arch-list a:hover{color:var(--amber);text-decoration:none}
.arch-list .meta{color:var(--dim);font-size:13px;white-space:nowrap}
@media(prefers-color-scheme:light){:root{--void:#f6f3ec;--panel:#ffffff;--panel2:#fbf9f4;--line:rgba(20,18,14,.12);--ink:#211d15;--dim:#6b6656}}
`;

export function archivePage(date, config) {
    const dt = prettyDate(date);
    const themeName = prettyTheme(config.theme);
    const canonical = `${SITE}/daily/${date}/`;
    const title = `Reflections Daily &mdash; ${dt} (${themeName})`;
    const desc = `The Reflections daily puzzle for ${dt}: the ${themeName} board — ${config.mirrors.length} mirrors versus ${config.spawners.length} lasers, difficulty ${config.difficulty}/10. Strategy tips and how to play.`;
    const jsonld = {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: `Reflections Daily Challenge — ${dt}`,
        datePublished: date, description: desc.replace(/&mdash;/g, '—'),
        about: { '@type': 'VideoGame', name: 'Reflections', genre: 'Puzzle', url: SITE + '/' },
        publisher: { '@type': 'Organization', name: 'Wesley Arcade' },
        mainEntityOfPage: canonical,
    };
    const pieces = config.mirrors.map(shapeIcon).join('');
    return `<!doctype html><html lang="en"><head>${head(title, desc, canonical, jsonld)}</head><body>
<div class="wrap">
  <div class="crumb"><a href="${SITE}/">Reflections</a> &rsaquo; <a href="${SITE}/daily/">Daily Archive</a> &rsaquo; ${dt}</div>
  <div class="brand">Reflections Daily</div>
  <h1>${dt}: the ${themeName} board</h1>
  <div class="sub">Difficulty ${config.difficulty}/10 &middot; ${config.mirrors.length} mirrors &middot; ${config.spawners.length} lasers</div>

  <div class="stats">
    <div class="stat"><div class="k">Theme</div><div class="v">${themeName}</div></div>
    <div class="stat"><div class="k">Difficulty</div><div class="v">${config.difficulty}/10</div></div>
    <div class="stat"><div class="k">Mirrors</div><div class="v">${config.mirrors.length}</div></div>
    <div class="stat"><div class="k">Lasers</div><div class="v">${config.spawners.length}</div></div>
  </div>

  <h2>The threat map</h2>
  ${boardSVG(config)}
  <div class="caption">Where each laser enters the board and the direction it fires. Defend the red core in the center.</div>

  <h2>Your mirrors</h2>
  <div class="pieces">${pieces}</div>
  <p>${inventorySummary(config.mirrors)}.</p>

  <h2>Strategy</h2>
  ${strategyHTML(config)}

  <div class="cta">
    <a class="btn btn-primary" href="${SITE}/">Play Reflections</a>
    <a class="btn btn-ghost" href="${SITE}/leaderboard">Daily leaderboard</a>
  </div>

  <footer>
    <a href="${SITE}/">Play</a><a href="${SITE}/daily/">Daily archive</a><a href="${SITE}/leaderboard">Leaderboard</a><a href="${SITE}/about">About</a>
  </footer>
</div></body></html>`;
}

export function archiveIndex(entries) {
    const canonical = `${SITE}/daily/`;
    const title = 'Reflections Daily Archive &mdash; Every Past Puzzle';
    const desc = 'Browse every past Reflections daily challenge: the board, difficulty, and strategy tips for each day of the geometric laser-defense puzzle.';
    const rows = entries.map(e => `<li><a href="${SITE}/daily/${e.date}/"><span>${prettyDate(e.date)} &mdash; ${prettyTheme(e.theme)}</span><span class="meta">${e.difficulty}/10 &middot; ${e.lasers} lasers</span></a></li>`).join('');
    const jsonld = {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: 'Reflections Daily Archive', description: desc, url: canonical,
    };
    return `<!doctype html><html lang="en"><head>${head(title, desc, canonical, jsonld)}</head><body>
<div class="wrap">
  <div class="crumb"><a href="${SITE}/">Reflections</a> &rsaquo; Daily Archive</div>
  <div class="brand">Reflections</div>
  <h1>Daily Archive</h1>
  <div class="sub">Every past daily challenge &mdash; the board, difficulty, and how to think about it. A new puzzle drops every day.</div>
  <div class="cta"><a class="btn btn-primary" href="${SITE}/">Play today's puzzle</a></div>
  <ul class="arch-list">${rows}</ul>
  <footer>
    <a href="${SITE}/">Play</a><a href="${SITE}/leaderboard">Leaderboard</a><a href="${SITE}/about">About</a>
  </footer>
</div></body></html>`;
}
