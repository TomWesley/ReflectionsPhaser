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

        ctx.save();
        // Red "forbidden zone" — fill + a dashed hazard perimeter. Red is the
        // danger colour in the amber/red/black/gray scheme.
        ctx.fillStyle = 'rgba(232, 78, 106, 0.22)';
        ctx.strokeStyle = 'rgba(232, 78, 106, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 5]);

        // Center forbidden zone
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Edge forbidden zones (horizontals full width, verticals shortened)
        ctx.fillRect(0, 0, W, edgeMargin);
        ctx.fillRect(0, H - edgeMargin, W, edgeMargin);
        ctx.fillRect(0, edgeMargin, edgeMargin, H - edgeMargin * 2);
        ctx.fillRect(W - edgeMargin, edgeMargin, edgeMargin, H - edgeMargin * 2);

        // Hazard perimeter tracing the inner edge of the play-safe area
        ctx.beginPath();
        ctx.rect(edgeMargin, edgeMargin, W - edgeMargin * 2, H - edgeMargin * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
    }
}
