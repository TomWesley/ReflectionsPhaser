import { CONFIG } from '../config.js';

/**
 * GridRenderer - Handles drawing the game grid
 */
export class GridRenderer {
    static drawGrid(ctx) {
        const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT, g = CONFIG.GRID_SIZE;

        // Minor gridlines — dim blue instrument grid
        ctx.strokeStyle = 'rgba(78, 120, 232, 0.08)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Major gridlines every 100px — brighter, for readability/scale
        ctx.strokeStyle = 'rgba(78, 120, 232, 0.16)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += g * 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += g * 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Playable-area border — glowing arc blue
        ctx.strokeStyle = 'rgba(78, 120, 232, 0.7)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(78, 120, 232, 0.5)';
        ctx.shadowBlur = 8;
        ctx.strokeRect(1, 1, W - 2, H - 2);
        ctx.shadowBlur = 0;
    }
}
