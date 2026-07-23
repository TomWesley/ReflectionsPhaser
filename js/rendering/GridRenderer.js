import { CONFIG } from '../config.js';

/**
 * GridRenderer - Handles drawing the game grid
 */
export class GridRenderer {
    static drawGrid(ctx) {
        const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT, g = CONFIG.GRID_SIZE;

        // Light-gray gridlines — pure utility, not a thematic element.
        ctx.strokeStyle = 'rgba(160, 166, 182, 0.22)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Playable-area border — the one accent: a subtle amber frame.
        ctx.strokeStyle = 'rgba(255, 176, 32, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(1, 1, W - 2, H - 2);
    }
}
