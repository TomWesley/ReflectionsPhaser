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

const CUSTOM = { snap: drawSnap };

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
