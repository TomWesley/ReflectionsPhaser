import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join, resolve } from 'path';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const ROOT = resolve('.');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.ico':  'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
    '.map':  'application/json; charset=utf-8',
};

async function tryFile(p) {
    try {
        const s = await stat(p);
        if (s.isFile()) return p;
    } catch {}
    return null;
}

async function resolveRequest(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    const safe = join(ROOT, decoded).replace(/\\/g, '/');
    if (!safe.startsWith(ROOT)) return null;

    if (decoded === '/' || decoded === '') {
        return tryFile(join(ROOT, 'index.html'));
    }

    const direct = await tryFile(safe);
    if (direct) return direct;

    if (!extname(decoded)) {
        const html = await tryFile(safe + '.html');
        if (html) return html;
        const idx = await tryFile(join(safe, 'index.html'));
        if (idx) return idx;
        if (safe.endsWith('/')) {
            const stripped = safe.replace(/\/+$/, '');
            const htmlAlt = await tryFile(stripped + '.html');
            if (htmlAlt) return htmlAlt;
        }
    }
    return null;
}

createServer(async (req, res) => {
    const filePath = await resolveRequest(req.url);
    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found: ' + req.url);
        return;
    }
    try {
        const data = await readFile(filePath);
        const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': type,
            'Cache-Control': 'no-store',
        });
        res.end(data);
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server Error: ' + err.message);
    }
}).listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
    console.log('Clean URLs enabled: /about → about.html, /leaderboard → leaderboard.html');
});
