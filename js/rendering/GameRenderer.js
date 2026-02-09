import { CONFIG } from '../config.js';
import { GridRenderer } from './GridRenderer.js';
import { TargetRenderer } from './TargetRenderer.js';
import { ZoneRenderer } from './ZoneRenderer.js';
import { ValidationRenderer } from './ValidationRenderer.js';

/**
 * GameRenderer - Main orchestrator for all rendering operations
 * Delegates to specialized renderers
 */
export class GameRenderer {
    constructor(ctx, game) {
        this.ctx = ctx;
        this.game = game;
    }

    /**
     * Main render method - orchestrates all drawing operations
     */
    render() {
        // Clear canvas and fill with void background (#0A0A12)
        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        this.ctx.fillStyle = '#0A0A12';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Draw grid
        GridRenderer.drawGrid(this.ctx);

        // Draw center target
        TargetRenderer.drawTarget(this.ctx, this.game.gameOver);

        // Draw game objects
        this.game.spawners.forEach(spawner => spawner.draw(this.ctx));

        // Draw mirrors with hover effect
        this.game.mirrors.forEach(mirror => {
            // Draw hover glow if this mirror is being hovered (only if not playing)
            if (mirror === this.game.hoveredMirror && !this.game.isPlaying) {
                this.drawHoverGlow(mirror);
            }

            // Draw the mirror (pass placement phase state for glow effect)
            const isPlacementPhase = !this.game.isPlaying;
            mirror.draw(this.ctx, isPlacementPhase);
        });

        // Draw lasers
        this.game.lasers.forEach(laser => laser.draw(this.ctx));

        // Draw zones and validation when not playing
        if (!this.game.isPlaying) {
            ZoneRenderer.drawForbiddenZones(this.ctx);
            ValidationRenderer.drawValidationViolations(this.ctx, this.game.mirrors, this.game.isPlaying);
        }
    }

    /**
     * Draw a subtle glow around a hovered mirror - using arc blue (#4E78E8)
     */
    drawHoverGlow(mirror) {
        this.ctx.save();

        // Use arc blue glow for hover
        this.ctx.shadowColor = 'rgba(78, 120, 232, 0.6)';
        this.ctx.shadowBlur = 15;
        this.ctx.strokeStyle = 'rgba(78, 120, 232, 0.4)';
        this.ctx.lineWidth = 3;

        // Draw outline based on shape
        this.ctx.beginPath();

        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                const halfWidth = (mirror.width || mirror.size) / 2;
                const halfHeight = (mirror.height || mirror.size) / 2;
                this.ctx.rect(
                    mirror.x - halfWidth - 2,
                    mirror.y - halfHeight - 2,
                    (halfWidth * 2) + 4,
                    (halfHeight * 2) + 4
                );
                break;

            default:
                // For complex shapes, use vertices
                const vertices = mirror.vertices || mirror.getVertices();
                if (vertices && vertices.length > 0) {
                    this.ctx.moveTo(vertices[0].x, vertices[0].y);
                    for (let i = 1; i < vertices.length; i++) {
                        this.ctx.lineTo(vertices[i].x, vertices[i].y);
                    }
                    this.ctx.closePath();
                }
                break;
        }

        this.ctx.stroke();
        this.ctx.restore();
    }
}
