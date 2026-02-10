import { CONFIG } from '../config.js';

/**
 * ZoneRenderer - Handles drawing forbidden zones
 */
export class ZoneRenderer {
    static drawForbiddenZones(ctx) {
        // Use flare color (#E84E6A) with transparency for forbidden zones
        ctx.fillStyle = 'rgba(232, 78, 106, 0.3)';

        // Center forbidden zone - circle matching validation
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const centerRadius = CONFIG.TARGET_RADIUS + 40; // Matches validation logic

        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Edge forbidden zones - rectangles matching validation
        // Horizontals go full width, verticals are shortened to avoid corner overlap
        const edgeMargin = CONFIG.EDGE_MARGIN;

        // Top edge (full width)
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, edgeMargin);

        // Bottom edge (full width)
        ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - edgeMargin, CONFIG.CANVAS_WIDTH, edgeMargin);

        // Left edge (shortened to avoid corners)
        ctx.fillRect(0, edgeMargin, edgeMargin, CONFIG.CANVAS_HEIGHT - edgeMargin * 2);

        // Right edge (shortened to avoid corners)
        ctx.fillRect(CONFIG.CANVAS_WIDTH - edgeMargin, edgeMargin, edgeMargin, CONFIG.CANVAS_HEIGHT - edgeMargin * 2);
    }
}
