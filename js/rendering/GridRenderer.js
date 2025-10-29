import { CONFIG } from '../config.js';

/**
 * GridRenderer - Handles drawing the game grid
 */
export class GridRenderer {
    static drawGrid(ctx) {
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.15)'; // Subtle sunset orange grid
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += CONFIG.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += CONFIG.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
    }
}
