// EngineIcons.js — render Arcade-Graphics-Engine icons (and custom icons drawn in
// the same instrument style) into <canvas> elements in the DOM.
//
// Built-in engine icons are drawn via the engine's drawIcon; concepts the engine
// doesn't ship (snap/align, ...) are hand-drawn here following the engine's icon
// recipe: angular geometry, a bold glowing outline, one SEMANTIC highlight.
//
// Usage in HTML:
//   <canvas class="btn-eng-icon" data-eng-icon="snap"
//           data-eng-color="168,174,189" width="36" height="36"></canvas>
import { drawIcon as engineDrawIcon } from '../vendor/arcade-graphics-engine/index.js';

// --- Custom icons (engine style). Each: (ctx, cx, cy, size, [r,g,b]) ---

// snap / align-to-grid: two instrument panels snapping to a bright centre line.
function drawSnap(ctx, cx, cy, size, [r, g, b]) {
    const u = (n) => (n * size) / 100;
    const stroke = (op, w) => { ctx.strokeStyle = `rgba(${r},${g},${b},${op})`; ctx.lineWidth = u(w); };
    const fillA = (op) => { ctx.fillStyle = `rgba(${r},${g},${b},${op})`; };
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Left + right panels sliding together
    for (const sx of [-1, 1]) {
        const x = cx + sx * u(22) - u(12);
        fillA(0.16); ctx.fillRect(x, cy - u(20), u(24), u(40));
        stroke(0.8, 2.2); ctx.strokeRect(x, cy - u(20), u(24), u(40));
    }
    // Bright centre alignment line — the "snap" (semantic highlight)
    ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
    ctx.shadowBlur = u(6);
    stroke(0.95, 2.6);
    ctx.beginPath(); ctx.moveTo(cx, cy - u(30)); ctx.lineTo(cx, cy + u(30)); ctx.stroke();
    ctx.shadowBlur = 0;
    // Alignment guide ticks, top + bottom
    stroke(0.45, 1.4);
    ctx.beginPath(); ctx.moveTo(cx - u(7), cy - u(30)); ctx.lineTo(cx + u(7), cy - u(30)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - u(7), cy + u(30)); ctx.lineTo(cx + u(7), cy + u(30)); ctx.stroke();
    ctx.restore();
}

// launch: upward thrust chevron firing (the "engage" action).
function drawLaunch(ctx, cx, cy, size, [r, g, b]) {
    const u = (n) => (n * size) / 100;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
    ctx.shadowColor = `rgba(${r},${g},${b},0.5)`;
    ctx.shadowBlur = u(6);
    ctx.beginPath();
    ctx.moveTo(cx, cy - u(30));
    ctx.lineTo(cx + u(22), cy + u(4));
    ctx.lineTo(cx + u(9), cy + u(4));
    ctx.lineTo(cx + u(9), cy + u(16));
    ctx.lineTo(cx - u(9), cy + u(16));
    ctx.lineTo(cx - u(9), cy + u(4));
    ctx.lineTo(cx - u(22), cy + u(4));
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // thrust lines (semantic: firing)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
    ctx.lineWidth = u(2.2);
    for (const dx of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.moveTo(cx + u(dx), cy + u(22));
        ctx.lineTo(cx + u(dx), cy + u(30));
        ctx.stroke();
    }
    ctx.restore();
}

// shuffle: two crossing arrows (swap for a new board).
function drawShuffle(ctx, cx, cy, size, [r, g, b]) {
    const u = (n) => (n * size) / 100;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
    ctx.lineWidth = u(3);
    ctx.shadowColor = `rgba(${r},${g},${b},0.4)`;
    ctx.shadowBlur = u(4);
    ctx.beginPath(); ctx.moveTo(cx - u(26), cy - u(18)); ctx.lineTo(cx + u(26), cy + u(18)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - u(26), cy + u(18)); ctx.lineTo(cx + u(26), cy - u(18)); ctx.stroke();
    ctx.shadowBlur = 0;
    const head = (x, y, dir) => {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - u(9), y + dir * u(2));
        ctx.moveTo(x, y); ctx.lineTo(x - u(2), y + dir * u(9)); ctx.stroke();
    };
    head(cx + u(26), cy - u(18), 1);
    head(cx + u(26), cy + u(18), -1);
    ctx.restore();
}

// daily: a calendar with today's cell lit (the day's challenge).
function drawDaily(ctx, cx, cy, size, [r, g, b]) {
    const u = (n) => (n * size) / 100;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
    ctx.lineWidth = u(2.4);
    ctx.beginPath(); ctx.rect(cx - u(26), cy - u(22), u(52), u(46)); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
    ctx.lineWidth = u(1.6);
    ctx.beginPath(); ctx.moveTo(cx - u(26), cy - u(10)); ctx.lineTo(cx + u(26), cy - u(10)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - u(14), cy - u(28)); ctx.lineTo(cx - u(14), cy - u(18)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + u(14), cy - u(28)); ctx.lineTo(cx + u(14), cy - u(18)); ctx.stroke();
    // today's lit cell (semantic highlight)
    ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
    ctx.shadowBlur = u(6);
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.fillRect(cx - u(4), cy + u(2), u(12), u(12));
    ctx.restore();
}

// about: a manual/briefing document with a clipped corner and text lines.
function drawManual(ctx, cx, cy, size, [r, g, b]) {
    const u = (n) => (n * size) / 100;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
    ctx.lineWidth = u(2.4);
    const L = cx - u(20), R = cx + u(20), T = cy - u(26), B = cy + u(26), c = u(10);
    ctx.beginPath();
    ctx.moveTo(L, T); ctx.lineTo(R - c, T); ctx.lineTo(R, T + c); ctx.lineTo(R, B); ctx.lineTo(L, B); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
    ctx.lineWidth = u(1.6);
    ctx.beginPath(); ctx.moveTo(R - c, T); ctx.lineTo(R - c, T + c); ctx.lineTo(R, T + c); ctx.stroke();
    ctx.lineWidth = u(2);
    for (const dy of [-6, 2, 10]) {
        ctx.beginPath(); ctx.moveTo(L + u(7), cy + u(dy)); ctx.lineTo(R - u(7), cy + u(dy)); ctx.stroke();
    }
    ctx.restore();
}

// leaderboard: podium ranking bars, the winner lit.
function drawLeaderboard(ctx, cx, cy, size, [r, g, b]) {
    const u = (n) => (n * size) / 100;
    ctx.save();
    ctx.lineJoin = 'round';
    const base = cy + u(26);
    const bw = u(15);
    const bars = [
        { c: cx - u(20), h: u(30), win: false }, // 2nd
        { c: cx,          h: u(46), win: true },  // 1st (centre, tallest)
        { c: cx + u(20), h: u(20), win: false }, // 3rd
    ];
    for (const bar of bars) {
        const x = bar.c - bw / 2, y = base - bar.h;
        ctx.fillStyle = `rgba(${r},${g},${b},${bar.win ? 0.28 : 0.16})`;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.lineWidth = u(2.2);
        ctx.beginPath(); ctx.rect(x, y, bw, bar.h); ctx.fill(); ctx.stroke();
        if (bar.win) {
            // lit winner cap (semantic highlight)
            ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
            ctx.shadowBlur = u(6);
            ctx.strokeStyle = `rgba(${r},${g},${b},0.98)`;
            ctx.lineWidth = u(3);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bw, y); ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
    ctx.restore();
}

const CUSTOM = {
    snap: drawSnap, launch: drawLaunch, shuffle: drawShuffle,
    daily: drawDaily, about: drawManual, leaderboard: drawLeaderboard,
};

/** Draw any game icon (custom, or an engine built-in) at (cx,cy) sized `size`. */
export function drawGameIcon(ctx, name, cx, cy, size, rgb) {
    if (CUSTOM[name]) {
        CUSTOM[name](ctx, cx, cy, size, rgb);
    } else {
        engineDrawIcon(ctx, name, cx, cy, size, [rgb[0], rgb[1], rgb[2], 1]);
    }
}

/** Render an icon into a <canvas> element (no-op safe). */
export function renderEngIcon(canvas, name, rgb) {
    if (!canvas || !canvas.getContext) return;
    try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGameIcon(ctx, name, canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height), rgb);
    } catch (e) { /* leave blank — button text labels still carry meaning */ }
}

/** Find and render every <canvas data-eng-icon> under root. */
export function hydrateIcons(root = document) {
    if (typeof document === 'undefined') return;
    root.querySelectorAll('canvas[data-eng-icon]').forEach((cv) => {
        const name = cv.dataset.engIcon;
        const rgb = cv.dataset.engColor ? cv.dataset.engColor.split(',').map(Number) : [168, 174, 189];
        renderEngIcon(cv, name, rgb);
    });
}

// Expose for inline handlers (e.g. recolouring the snap icon on toggle).
if (typeof window !== 'undefined') {
    window.renderEngIcon = renderEngIcon;
    window.hydrateArcadeIcons = hydrateIcons;
}
