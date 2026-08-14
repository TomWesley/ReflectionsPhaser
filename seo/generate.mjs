/**
 * generate.mjs — build the Reflections daily-archive SEO pages.
 *
 * For every past daily date (START_DATE .. yesterday, spoiler-safe) writes a
 * static, indexable archive page from the deterministic daily generator, plus an
 * archive index, sitemap.xml and robots.txt. Idempotent: re-run any time; the
 * daily GitHub Action just re-runs it to append the newly-finished day.
 *
 *   node seo/generate.mjs            # START_DATE default below
 *   START_DATE=2026-04-01 node seo/generate.mjs
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { DailyChallenge } from '../functions/js/validation/DailyChallenge.js';
import { archivePage, archiveIndex, SITE } from './render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const START = process.env.START_DATE || '2026-06-01';

// Local "today" the same way the game computes it, so we never publish today's
// (or a future) puzzle — only days that are genuinely finished.
const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

function dateList(startIso, endExclusiveIso) {
    const out = [];
    let cur = new Date(startIso + 'T12:00:00Z');
    const end = new Date(endExclusiveIso + 'T12:00:00Z');
    while (cur < end) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
    return out;
}

const dates = dateList(START, todayIso);
const entries = [];
let written = 0;

for (const date of dates) {
    const config = DailyChallenge.generateDailyConfig(date);
    const dir = join(ROOT, 'daily', date);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), archivePage(date, config));
    entries.push({ date, theme: config.theme, difficulty: config.difficulty, lasers: config.spawners.length });
    written++;
}

// Newest first for the index.
entries.sort((a, b) => (a.date < b.date ? 1 : -1));
mkdirSync(join(ROOT, 'daily'), { recursive: true });
writeFileSync(join(ROOT, 'daily', 'index.html'), archiveIndex(entries));

// sitemap.xml — main pages + the archive.
const staticUrls = [
    { loc: `${SITE}/`, changefreq: 'daily', priority: '1.0', lastmod: todayIso },
    { loc: `${SITE}/daily/`, changefreq: 'daily', priority: '0.8', lastmod: todayIso },
    { loc: `${SITE}/leaderboard`, changefreq: 'daily', priority: '0.7', lastmod: todayIso },
    { loc: `${SITE}/about`, changefreq: 'monthly', priority: '0.5', lastmod: todayIso },
];
const urls = [
    ...staticUrls,
    ...entries.map(e => ({ loc: `${SITE}/daily/${e.date}/`, changefreq: 'yearly', priority: '0.6', lastmod: e.date })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap);

writeFileSync(join(ROOT, 'robots.txt'),
`User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);

console.log(`Archive built: ${written} daily pages (${dates[0]} .. ${dates[dates.length - 1]}), index + sitemap (${urls.length} urls) + robots.txt`);
