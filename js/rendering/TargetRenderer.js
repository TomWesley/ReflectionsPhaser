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

        // Outer protective aura - pulsing effect
        const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() / 300);
        this.drawAuras(ctx, centerX, centerY, radius, pulseIntensity, gameOver);

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Main computer chip body
        const chipSize = radius * 0.9;
        this.drawChipBody(ctx, centerX, centerY, chipSize, gameOver);

        // Circuit details
        this.drawCircuitPattern(ctx, centerX, centerY, chipSize, gameOver);
        this.drawChipPins(ctx, centerX, centerY, chipSize, gameOver);
        this.drawCentralIndicator(ctx, centerX, centerY, gameOver);

        ctx.restore();
    }

    static drawAuras(ctx, centerX, centerY, radius, pulseIntensity, gameOver) {
        // Outer aura - sunset gold when safe, danger red when hit
        ctx.globalAlpha = pulseIntensity * 0.3;
        ctx.shadowColor = gameOver ? '#E63946' : '#FFB627';
        ctx.shadowBlur = 40;
        ctx.fillStyle = gameOver ? 'rgba(230, 57, 70, 0.15)' : 'rgba(255, 182, 39, 0.15)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Middle aura
        ctx.globalAlpha = pulseIntensity * 0.5;
        ctx.shadowBlur = 25;
        ctx.fillStyle = gameOver ? 'rgba(230, 57, 70, 0.25)' : 'rgba(255, 182, 39, 0.25)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Inner aura
        ctx.globalAlpha = pulseIntensity * 0.7;
        ctx.shadowBlur = 15;
        ctx.fillStyle = gameOver ? 'rgba(230, 57, 70, 0.35)' : 'rgba(255, 182, 39, 0.35)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
        ctx.fill();
    }

    static drawChipBody(ctx, centerX, centerY, chipSize, gameOver) {
        // Dark base with sunset/danger colors
        ctx.fillStyle = gameOver ? '#2a0a0a' : '#1a0a00';
        ctx.strokeStyle = gameOver ? '#E63946' : '#FFB627';
        ctx.lineWidth = 3;

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

        // Inner chip core - bright sunset colors
        ctx.shadowColor = gameOver ? '#E63946' : '#FFB627';
        ctx.shadowBlur = 15;
        ctx.fillStyle = gameOver ? '#E63946' : '#FF6B35';
        ctx.beginPath();
        ctx.arc(centerX, centerY, chipSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    static drawCircuitPattern(ctx, centerX, centerY, chipSize, gameOver) {
        ctx.shadowBlur = 8;
        ctx.strokeStyle = gameOver ? '#FF8FA3' : '#FFB627';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const innerRadius = chipSize * 0.5;
            const outerRadius = chipSize * 0.8;

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
        ctx.shadowBlur = 5;
        ctx.fillStyle = gameOver ? '#FF006E' : '#FF6B35';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize * 0.9;
            const y = centerY + Math.sin(angle) * chipSize * 0.9;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static drawCentralIndicator(ctx, centerX, centerY, gameOver) {
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        const centralPulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
        ctx.globalAlpha = centralPulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
