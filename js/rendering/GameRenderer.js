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
        // Clear canvas and fill with dark background
        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Fill with dark background (ensures visibility on all devices)
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Add subtle mint green tint for daily challenge mode
        if (this.game.modeManager && this.game.modeManager.isDailyChallenge()) {
            this.ctx.fillStyle = 'rgba(50, 255, 180, 0.02)';
            this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }

        // Draw grid
        GridRenderer.drawGrid(this.ctx);

        // Draw center target
        TargetRenderer.drawTarget(this.ctx, this.game.gameOver);

        // Draw game objects
        this.game.spawners.forEach(spawner => spawner.draw(this.ctx));

        // Draw mirrors with hover effect and daily challenge glow
        this.game.mirrors.forEach(mirror => {
            // Draw daily challenge mint green glow (check mirror property)
            if (mirror.isDailyChallenge) {
                this.drawDailyChallengeGlow(mirror);
            }

            // Draw hover glow if this mirror is being hovered (only if not playing)
            if (mirror === this.game.hoveredMirror && !this.game.isPlaying) {
                this.drawHoverGlow(mirror);
            }

            // Draw the mirror
            mirror.draw(this.ctx);
        });

        // Draw lasers (handle both real and frozen lasers)
        this.game.lasers.forEach(laser => {
            if (laser.isFrozen) {
                this.drawFrozenLaser(laser);
            } else {
                laser.draw(this.ctx);
            }
        });

        // Draw zones and validation when not playing
        if (!this.game.isPlaying) {
            ZoneRenderer.drawForbiddenZones(this.ctx);
            ValidationRenderer.drawValidationViolations(this.ctx, this.game.mirrors, this.game.isPlaying);
        }

        // Draw daily challenge indicator
        if (this.game.modeManager && this.game.modeManager.isDailyChallenge()) {
            this.drawDailyChallengeIndicator();
        }
    }

    /**
     * Draw a subtle "DAILY CHALLENGE" indicator on the canvas
     */
    drawDailyChallengeIndicator() {
        this.ctx.save();

        // Draw in top-right corner
        this.ctx.font = '12px "Space Grotesk", sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';

        // Pulsing text
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 0.2 + 0.8;

        // Text with mint green glow
        this.ctx.fillStyle = `rgba(50, 255, 180, ${0.6 * pulse})`;
        this.ctx.shadowColor = `rgba(50, 255, 180, ${0.8 * pulse})`;
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('DAILY CHALLENGE', CONFIG.CANVAS_WIDTH - 10, 10);

        this.ctx.restore();
    }

    /**
     * Draw a subtle glow around a hovered mirror
     */
    drawHoverGlow(mirror) {
        this.ctx.save();

        // Use a subtle orange glow
        this.ctx.shadowColor = 'rgba(255, 107, 53, 0.6)';
        this.ctx.shadowBlur = 15;
        this.ctx.strokeStyle = 'rgba(255, 107, 53, 0.4)';
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

    /**
     * Draw a mint green animated glow for daily challenge mirrors
     */
    drawDailyChallengeGlow(mirror) {
        this.ctx.save();

        // Create pulsing animation based on current time
        const time = Date.now() / 1000; // Convert to seconds
        const pulse = Math.sin(time * 2) * 0.2 + 0.8; // Oscillate between 0.6 and 1.0

        // Mint green glow with pulsing opacity
        const mintGreen = `rgba(50, 255, 180, ${0.5 * pulse})`;
        this.ctx.shadowColor = mintGreen;
        this.ctx.shadowBlur = 20 * pulse; // Pulsing blur
        this.ctx.strokeStyle = `rgba(50, 255, 180, ${0.3 * pulse})`;
        this.ctx.lineWidth = 4;

        // Draw outline using vertices
        this.ctx.beginPath();
        const vertices = mirror.vertices || mirror.getVertices();
        if (vertices && vertices.length > 0) {
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                this.ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            this.ctx.closePath();
        }

        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Draw a frozen laser (from saved daily challenge state)
     */
    drawFrozenLaser(laser) {
        const ctx = this.ctx;

        // Draw trail (same as regular laser)
        if (laser.trail && laser.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer glow trail
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(255, 0, 110, 0.12)';
            ctx.beginPath();
            for (let i = 1; i < laser.trail.length; i++) {
                const alpha = (i / laser.trail.length) * 0.12;
                ctx.globalAlpha = alpha;
                ctx.moveTo(laser.trail[i-1].x, laser.trail[i-1].y);
                ctx.lineTo(laser.trail[i].x, laser.trail[i].y);
            }
            ctx.stroke();

            // Middle glow trail
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255, 0, 110, 0.35)';
            ctx.beginPath();
            for (let i = 1; i < laser.trail.length; i++) {
                const alpha = (i / laser.trail.length) * 0.35;
                ctx.globalAlpha = alpha;
                ctx.moveTo(laser.trail[i-1].x, laser.trail[i-1].y);
                ctx.lineTo(laser.trail[i].x, laser.trail[i].y);
            }
            ctx.stroke();

            // Inner bright trail
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 0, 110, 0.85)';
            ctx.beginPath();
            for (let i = 1; i < laser.trail.length; i++) {
                const alpha = (i / laser.trail.length) * 0.85;
                ctx.globalAlpha = alpha;
                ctx.moveTo(laser.trail[i-1].x, laser.trail[i-1].y);
                ctx.lineTo(laser.trail[i].x, laser.trail[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Draw laser head
        ctx.save();
        ctx.shadowColor = 'rgba(255, 0, 110, 0.9)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#FF006E';
        ctx.beginPath();
        ctx.arc(laser.x, laser.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#FF8FA3';
        ctx.beginPath();
        ctx.arc(laser.x, laser.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
