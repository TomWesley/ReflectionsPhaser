import { CONFIG } from '../config.js';

/**
 * ZoneRenderer - Handles drawing forbidden zones
 */
export class ZoneRenderer {
    static drawForbiddenZones(ctx) {
        const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;
        const centerX = W / 2, centerY = H / 2;
        const centerRadius = CONFIG.TARGET_RADIUS + 40; // Matches validation logic
        const edgeMargin = CONFIG.EDGE_MARGIN;

        // Solid red forbidden zones (no dashed perimeter). Higher opacity so the
        // fill reads as the same bright red (#E84E6A) used for Start/breach, not a
        // dark maroon — safe since mirrors can never be placed inside these zones.
        ctx.fillStyle = 'rgba(232, 78, 106, 0.5)';

        // Center forbidden zone
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Edge forbidden zones (horizontals full width, verticals shortened)
        ctx.fillRect(0, 0, W, edgeMargin);
        ctx.fillRect(0, H - edgeMargin, W, edgeMargin);
        ctx.fillRect(0, edgeMargin, edgeMargin, H - edgeMargin * 2);
        ctx.fillRect(W - edgeMargin, edgeMargin, edgeMargin, H - edgeMargin * 2);
    }
}
