import { CONFIG } from '../config.js';

/**
 * ZoneRenderer - Handles drawing forbidden zones
 */
export class ZoneRenderer {
    static drawForbiddenZones(ctx) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';

        // Center forbidden zone (8x8 grid square)
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenSquareSize = 8 * CONFIG.GRID_SIZE;
        const halfForbiddenSize = forbiddenSquareSize / 2;

        ctx.fillRect(
            centerX - halfForbiddenSize,
            centerY - halfForbiddenSize,
            forbiddenSquareSize,
            forbiddenSquareSize
        );

        // Edge forbidden zones
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.EDGE_MARGIN);
        ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - CONFIG.EDGE_MARGIN, CONFIG.CANVAS_WIDTH, CONFIG.EDGE_MARGIN);
        ctx.fillRect(0, 0, CONFIG.EDGE_MARGIN, CONFIG.CANVAS_HEIGHT);
        ctx.fillRect(CONFIG.CANVAS_WIDTH - CONFIG.EDGE_MARGIN, 0, CONFIG.EDGE_MARGIN, CONFIG.CANVAS_HEIGHT);
    }
}
