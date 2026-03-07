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

        // Draw center target with breach animation progress
        const breachProgress = this.game.breachProgress || 0;
        TargetRenderer.drawTarget(this.ctx, this.game.gameOver, breachProgress);

        // Draw game objects
        this.game.spawners.forEach(spawner => spawner.draw(this.ctx, !this.game.isPlaying));

        // Draw mirrors
        this.game.mirrors.forEach(mirror => {
            if (!this.game.isPlaying && mirror !== this.game.selectedMirror && mirror === this.game.hoveredMirror) {
                this.drawHoverGlow(mirror);
            }

            const isPlacementPhase = !this.game.isPlaying;
            mirror.draw(this.ctx, isPlacementPhase);
        });

        // Draw selection glow ON TOP of the selected mirror so it's always visible
        if (this.game.selectedMirror && !this.game.isPlaying) {
            this.drawSelectionGlow(this.game.selectedMirror);
        }

        // Draw lasers
        this.game.lasers.forEach(laser => laser.draw(this.ctx));

        // Draw zones and validation when not playing
        if (!this.game.isPlaying) {
            ZoneRenderer.drawForbiddenZones(this.ctx);
            ValidationRenderer.drawValidationViolations(this.ctx, this.game.mirrors, this.game.isPlaying);

            // Draw spawner angle tooltip on top of everything
            const activeSpawner = this.game.hoveredSpawner || this.game.selectedSpawner;
            if (activeSpawner) {
                const pathLength = 30;
                const tipX = activeSpawner.x + Math.cos(activeSpawner.angle) * pathLength;
                const tipY = activeSpawner.y + Math.sin(activeSpawner.angle) * pathLength;
                activeSpawner.drawAngleTooltip(this.ctx, tipX, tipY);
            }
        }

        // Draw full-screen breach overlay effects (glitch, flash, scanlines)
        if (breachProgress > 0) {
            this.drawBreachOverlay(breachProgress);
        }

        // Draw timer HUD on canvas - only after launch
        if (this.game.isPlaying || this.game.gameOver) {
            this.drawTimerHUD();
        }
    }

    /**
     * Full-screen glitch/distortion effects during breach
     */
    drawBreachOverlay(progress) {
        const ctx = this.ctx;
        const W = CONFIG.CANVAS_WIDTH;
        const H = CONFIG.CANVAS_HEIGHT;
        const centerX = W / 2;
        const centerY = H / 2;

        ctx.save();

        // --- Screen flash (0-0.2): Brief white-hot flash over everything ---
        if (progress < 0.25) {
            const flashAlpha = progress < 0.08
                ? progress / 0.08 * 0.6
                : (0.25 - progress) / 0.17 * 0.4;
            ctx.globalAlpha = Math.max(0, flashAlpha);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        // --- Red flash pulse (0.15-0.5) ---
        if (progress > 0.12 && progress < 0.55) {
            const rp = (progress - 0.12) / 0.43;
            const pulseAlpha = Math.sin(rp * Math.PI) * 0.2;
            ctx.globalAlpha = pulseAlpha;
            ctx.fillStyle = '#E84E6A';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        // --- CRT Scanlines (0.1-0.9): Horizontal interference lines ---
        if (progress > 0.08 && progress < 0.92) {
            const scanProgress = (progress - 0.08) / 0.84;
            const scanAlpha = Math.min(scanProgress * 3, 1) * (1 - Math.max(0, (scanProgress - 0.7) / 0.3)) * 0.4;
            ctx.globalAlpha = scanAlpha;

            // Traveling thick scanline bands
            const bandCount = 5;
            for (let i = 0; i < bandCount; i++) {
                const seed = (i * 37 + 13) % 17;
                const speed = 0.8 + seed / 17 * 1.5;
                const bandY = ((progress * speed * H + i * H / bandCount * 1.3) % (H + 40)) - 20;
                const bandHeight = 2 + (seed % 4);

                ctx.fillStyle = i % 2 === 0 ? 'rgba(232, 78, 106, 0.6)' : 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(0, bandY, W, bandHeight);
            }

            // Fine static scanlines
            ctx.globalAlpha = scanAlpha * 0.3;
            for (let y = 0; y < H; y += 4) {
                if ((y + Math.floor(progress * 100)) % 8 < 2) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.fillRect(0, y, W, 1);
                }
            }
            ctx.globalAlpha = 1;
        }

        // --- Glitch block displacement (0.1-0.7): Random rectangles shift ---
        if (progress > 0.1 && progress < 0.75) {
            const glitchIntensity = Math.min(1, (progress - 0.1) / 0.2) * (1 - Math.max(0, (progress - 0.5) / 0.25));

            if (glitchIntensity > 0.1) {
                const blockCount = 4 + Math.floor(glitchIntensity * 6);
                const seed = Math.floor(progress * 20);

                for (let i = 0; i < blockCount; i++) {
                    const pseudoRand = ((seed * 7 + i * 13) % 100) / 100;
                    const pseudoRand2 = ((seed * 11 + i * 17) % 100) / 100;
                    const pseudoRand3 = ((seed * 3 + i * 23) % 100) / 100;

                    const blockY = pseudoRand * H;
                    const blockH = 2 + pseudoRand2 * 15 * glitchIntensity;
                    const shiftX = (pseudoRand3 - 0.5) * 30 * glitchIntensity;

                    ctx.globalAlpha = glitchIntensity * 0.7;

                    // Grab a horizontal strip and redraw it shifted
                    try {
                        const imgData = ctx.getImageData(0, Math.floor(blockY), W, Math.ceil(blockH));
                        ctx.putImageData(imgData, Math.floor(shiftX), Math.floor(blockY));
                    } catch (e) {
                        // Fallback: draw colored glitch blocks
                        const gColors = ['rgba(232,78,106,0.3)', 'rgba(78,120,232,0.2)', 'rgba(255,255,255,0.2)'];
                        ctx.fillStyle = gColors[i % gColors.length];
                        ctx.fillRect(shiftX > 0 ? 0 : W + shiftX, blockY, Math.abs(shiftX), blockH);
                    }
                }
                ctx.globalAlpha = 1;
            }
        }

        // --- Chromatic aberration (0.05-0.6): RGB channel split ---
        if (progress > 0.05 && progress < 0.65) {
            const aberrationIntensity = Math.min(1, (progress - 0.05) / 0.15) * (1 - Math.max(0, (progress - 0.4) / 0.25));
            const offset = aberrationIntensity * 6;

            if (offset > 0.5) {
                // Red channel shift - draw a tinted overlay shifted left
                ctx.globalAlpha = aberrationIntensity * 0.15;
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(-offset, 0, W, H);
                ctx.fillStyle = '#0000FF';
                ctx.fillRect(offset, 0, W, H);
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1;
            }
        }

        // --- Radial energy burst lines (0.05-0.5): Lines shooting outward from center ---
        if (progress > 0.05 && progress < 0.55) {
            const burstProgress = (progress - 0.05) / 0.5;
            const burstAlpha = burstProgress < 0.3
                ? burstProgress / 0.3
                : Math.max(0, 1 - (burstProgress - 0.4) / 0.6);
            const rayCount = 24;

            ctx.globalAlpha = burstAlpha * 0.35;
            ctx.lineCap = 'round';

            for (let i = 0; i < rayCount; i++) {
                const angle = (i / rayCount) * Math.PI * 2;
                const innerR = 60 + burstProgress * 40;
                const outerR = 80 + burstProgress * Math.max(W, H) * 0.6;
                const width = 1 + ((i * 7) % 3);

                ctx.strokeStyle = i % 3 === 0 ? '#E84E6A' : (i % 3 === 1 ? '#FF8FA3' : '#FFFFFF');
                ctx.lineWidth = width * (1 - burstProgress * 0.7);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.shadowBlur = 6;

                ctx.beginPath();
                ctx.moveTo(
                    centerX + Math.cos(angle) * innerR,
                    centerY + Math.sin(angle) * innerR
                );
                ctx.lineTo(
                    centerX + Math.cos(angle) * outerR,
                    centerY + Math.sin(angle) * outerR
                );
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // --- Vignette darkening (0.4-1.0): Edges darken, focus on center ---
        if (progress > 0.35) {
            const vigProgress = (progress - 0.35) / 0.65;
            const vigAlpha = vigProgress * 0.6;

            ctx.globalAlpha = vigAlpha;
            const vigGradient = ctx.createRadialGradient(
                centerX, centerY, Math.min(W, H) * 0.25,
                centerX, centerY, Math.max(W, H) * 0.7
            );
            vigGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vigGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
            vigGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
            ctx.fillStyle = vigGradient;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        // --- Final fade to dark red/black (0.85-1.0) ---
        if (progress > 0.85) {
            const fadeProgress = (progress - 0.85) / 0.15;
            ctx.globalAlpha = fadeProgress * 0.5;
            ctx.fillStyle = '#1a0008';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    /**
     * Draw the survival timer directly on the canvas so it appears in replays and screenshots
     */
    drawTimerHUD() {
        const ctx = this.ctx;
        const gameTime = this.game.gameTime;

        const minutes = Math.floor(gameTime / 60);
        const seconds = Math.floor(gameTime % 60);
        const centiseconds = Math.floor((gameTime % 1) * 100);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;

        ctx.save();

        // Position: top center of canvas
        const x = CONFIG.CANVAS_WIDTH / 2;
        const y = 28;

        // Background pill
        const pillWidth = 160;
        const pillHeight = 38;
        const pillRadius = 10;
        const px = x - pillWidth / 2;
        const py = y - pillHeight / 2;

        ctx.fillStyle = 'rgba(6, 6, 14, 0.8)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(px, py, pillWidth, pillHeight, pillRadius);
        } else {
            ctx.rect(px, py, pillWidth, pillHeight);
        }
        ctx.fill();

        // Border with subtle glow
        const isBreach = this.game.breachProgress > 0;
        ctx.strokeStyle = isBreach ? 'rgba(232, 78, 106, 0.6)' : 'rgba(78, 120, 232, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = isBreach ? '#E84E6A' : 'rgba(78, 120, 232, 0.3)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(px, py, pillWidth, pillHeight, pillRadius);
        } else {
            ctx.rect(px, py, pillWidth, pillHeight);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Timer text
        ctx.font = '700 22px "JetBrains Mono", "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isBreach) {
            ctx.shadowColor = '#E84E6A';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#E84E6A';
        } else {
            ctx.shadowColor = 'rgba(78, 120, 232, 0.5)';
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#D4D4E8';
        }

        ctx.fillText(timeString, x, y);

        ctx.restore();
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

    /**
     * Draw a persistent selection glow around a selected mirror - flare red (#E84E6A)
     */
    drawSelectionGlow(mirror) {
        const ctx = this.ctx;
        const vertices = mirror.vertices || mirror.getVertices();
        if (!vertices || vertices.length === 0) return;

        ctx.save();

        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);

        // Outer aura glow — draw multiple passes for a wide, soft glow
        for (let pass = 0; pass < 3; pass++) {
            ctx.shadowColor = '#E84E6A';
            ctx.shadowBlur = 20 + pass * 10;
            ctx.strokeStyle = `rgba(232, 78, 106, ${(0.15 + pulse * 0.1) / (pass + 1)})`;
            ctx.lineWidth = 4 + pass * 4;

            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Sharp inner outline
        ctx.shadowColor = '#E84E6A';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = `rgba(232, 78, 106, ${0.6 + pulse * 0.4})`;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }
}
