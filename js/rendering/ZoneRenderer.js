import { CONFIG } from '../config.js';

/**
 * ZoneRenderer - Handles drawing forbidden zones
 */
export class ZoneRenderer {
    static drawForbiddenZones(ctx) {
        // Use sunset red with transparency for forbidden zones
        ctx.fillStyle = 'rgba(230, 57, 70, 0.2)';

        // Center forbidden zone - circle matching validation
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const centerRadius = CONFIG.TARGET_RADIUS + 40; // Matches validation logic

        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Edge forbidden zones - rectangles matching validation
        const edgeMargin = CONFIG.EDGE_MARGIN;

        // Top edge
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, edgeMargin);

        // Bottom edge
        ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - edgeMargin, CONFIG.CANVAS_WIDTH, edgeMargin);

        // Left edge
        ctx.fillRect(0, 0, edgeMargin, CONFIG.CANVAS_HEIGHT);

        // Right edge
        ctx.fillRect(CONFIG.CANVAS_WIDTH - edgeMargin, 0, edgeMargin, CONFIG.CANVAS_HEIGHT);
    }
}
