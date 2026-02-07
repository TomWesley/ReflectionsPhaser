import { CONFIG } from '../config.js';

/**
 * TargetRenderer - Handles drawing the center target chip
 */
export class TargetRenderer {
    static drawTarget(ctx, gameOver) {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const radius = CONFIG.TARGET_RADIUS;

        ctx.save();

        // Main computer chip body
        const chipSize = radius * 0.9;
        this.drawChipBody(ctx, centerX, centerY, chipSize, gameOver);

        // Circuit details
        this.drawCircuitPattern(ctx, centerX, centerY, chipSize, gameOver);
        this.drawChipPins(ctx, centerX, centerY, chipSize, gameOver);
        this.drawCentralIndicator(ctx, centerX, centerY, chipSize, gameOver);

        ctx.restore();
    }

    static drawChipBody(ctx, centerX, centerY, chipSize, gameOver) {
        // Dark base with sunset/danger colors
        ctx.fillStyle = gameOver ? '#2a0a0a' : '#1a0a00';
        ctx.strokeStyle = gameOver ? '#E63946' : '#FFB627';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 0;

        // Hexagonal chip outline
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize;
            const y = centerY + Math.sin(angle) * chipSize;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner chip core - bright sunset colors with contained glow
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 300);
        const coreRadius = chipSize * 0.4;

        // Subtle inner glow that stays within the core area
        ctx.shadowColor = gameOver ? '#E63946' : '#FFB627';
        ctx.shadowBlur = coreRadius * 0.5; // Glow contained to roughly core size
        ctx.fillStyle = gameOver ? '#E63946' : '#FF6B35';
        ctx.globalAlpha = pulseIntensity;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    static drawCircuitPattern(ctx, centerX, centerY, chipSize, gameOver) {
        ctx.shadowBlur = 0; // No glow on circuits
        ctx.strokeStyle = gameOver ? '#FF8FA3' : '#FFB627';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const innerRadius = chipSize * 0.5;
            const outerRadius = chipSize * 0.75; // Slightly shorter to stay within hexagon

            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(angle) * innerRadius,
                centerY + Math.sin(angle) * innerRadius
            );
            ctx.lineTo(
                centerX + Math.cos(angle) * outerRadius,
                centerY + Math.sin(angle) * outerRadius
            );
            ctx.stroke();
        }
    }

    static drawChipPins(ctx, centerX, centerY, chipSize, gameOver) {
        ctx.shadowBlur = 0; // No glow on pins
        ctx.fillStyle = gameOver ? '#FF006E' : '#FF6B35';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize * 0.85; // Slightly inward
            const y = centerY + Math.sin(angle) * chipSize * 0.85;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static drawCentralIndicator(ctx, centerX, centerY, chipSize, gameOver) {
        ctx.shadowBlur = 4; // Smaller glow
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        const centralPulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
        ctx.globalAlpha = centralPulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}
