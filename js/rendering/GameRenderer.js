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
        // Clear canvas
        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Draw grid
        GridRenderer.drawGrid(this.ctx);

        // Draw center target
        TargetRenderer.drawTarget(this.ctx, this.game.gameOver);

        // Draw game objects
        this.game.spawners.forEach(spawner => spawner.draw(this.ctx));
        this.game.mirrors.forEach(mirror => mirror.draw(this.ctx));
        this.game.lasers.forEach(laser => laser.draw(this.ctx));

        // Draw zones and validation when not playing
        if (!this.game.isPlaying) {
            ZoneRenderer.drawForbiddenZones(this.ctx);
            ValidationRenderer.drawValidationViolations(this.ctx, this.game.mirrors, this.game.isPlaying);
        }
    }
}
