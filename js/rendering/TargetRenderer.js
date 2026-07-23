import { CONFIG } from '../config.js';
import { drawIcon } from '../vendor/arcade-graphics-engine/index.js';
import { PALETTE, rgba } from '../theme/palette.js';

/**
 * TargetRenderer - Handles drawing the center target chip and breach animation
 */
export class TargetRenderer {
    static drawTarget(ctx, gameOver, breachProgress = 0) {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const radius = CONFIG.TARGET_RADIUS;

        ctx.save();

        // If breach animation is active, draw the breach effects
        if (breachProgress > 0) {
            this.drawBreachEffects(ctx, centerX, centerY, radius, breachProgress);
        }

        this.drawCore(ctx, centerX, centerY, radius, gameOver, breachProgress);
        this.drawCentralIndicator(ctx, centerX, centerY, radius, gameOver, breachProgress);

        ctx.restore();
    }

    /**
     * The power core: a faceted amber orb feeding energy out through radial
     * conduits ("cords") to a segmented containment ring at the exact hit
     * boundary, with pulses flowing outward. Geometric, slowly breathing;
     * amber / black / light-gray only. Breach & game-over flare red.
     */
    static drawCore(ctx, centerX, centerY, radius, gameOver, breachProgress = 0) {
        // Breach shake
        let ox = 0, oy = 0;
        if (breachProgress > 0 && breachProgress < 0.7) {
            const s = Math.min(breachProgress * 12, 5) * (1 - breachProgress / 0.7);
            ox = Math.sin(breachProgress * 120) * s;
            oy = Math.cos(breachProgress * 130) * s;
        }
        const cx = centerX + ox, cy = centerY + oy;
        const isBreach = breachProgress > 0;
        const flare = isBreach ? Math.min(1, breachProgress * 4) : 0;
        const t = Date.now();
        const b1 = 0.5 + 0.5 * Math.sin(t / 1500); // slow breathe
        const TAU = Math.PI * 2;

        const P = PALETTE.secondary;
        const amber = (a) => isBreach ? `rgba(232, 78, 106, ${a})` : `rgba(${P[0]}, ${P[1]}, ${P[2]}, ${a})`;
        const gray = (a) => `rgba(190, 196, 210, ${a})`;

        const N = 8;
        const orbR = radius * 0.3 * (0.92 + 0.12 * b1);
        const nodeR = radius * 0.9;

        // 1. Black disc — masks the grid/zone beneath the core.
        ctx.fillStyle = gameOver ? '#1a0608' : '#050403';
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.fill();

        // 2. Segmented containment ring at exactly TARGET_RADIUS (the honest hit edge).
        ctx.lineCap = 'round';
        ctx.strokeStyle = amber(0.55 + 0.35 * b1);
        ctx.lineWidth = 2;
        ctx.shadowColor = amber(0.6);
        ctx.shadowBlur = 6 + flare * 20;
        const gapA = 0.1;
        for (let i = 0; i < N; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, (i / N) * TAU + gapA / 2, ((i + 1) / N) * TAU - gapA / 2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // 3. Radial energy conduits (the "cords") with a pulse flowing outward.
        for (let i = 0; i < N; i++) {
            const ang = (i / N) * TAU;
            const ix = cx + Math.cos(ang) * orbR, iy = cy + Math.sin(ang) * orbR;
            const nx = cx + Math.cos(ang) * nodeR, ny = cy + Math.sin(ang) * nodeR;
            ctx.strokeStyle = amber(0.28);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(nx, ny); ctx.stroke();
            // node "plug" where the conduit meets the ring
            ctx.fillStyle = amber(0.8);
            ctx.beginPath(); ctx.arc(nx, ny, 2.2, 0, TAU); ctx.fill();
            // travelling power pulse (core -> ring), staggered per conduit
            const p = ((t / 1100) + i * 0.13) % 1;
            ctx.shadowColor = amber(0.9); ctx.shadowBlur = 6;
            ctx.fillStyle = amber(0.95);
            ctx.beginPath();
            ctx.arc(ix + (nx - ix) * p, iy + (ny - iy) * p, 1.8, 0, TAU);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // 4. Central faceted power orb (octagon) — glowing, breathing.
        const octagon = () => {
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * TAU + TAU / 16;
                const x = cx + Math.cos(a) * orbR, y = cy + Math.sin(a) * orbR;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
        };
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
        if (isBreach) {
            grad.addColorStop(0, '#FFD0D8'); grad.addColorStop(0.5, '#FF6080'); grad.addColorStop(1, 'rgba(232, 78, 106, 0.5)');
        } else {
            grad.addColorStop(0, '#FFE6B0'); grad.addColorStop(0.5, amber(1)); grad.addColorStop(1, amber(0.35));
        }
        ctx.shadowColor = isBreach ? '#E84E6A' : amber(1);
        ctx.shadowBlur = orbR * (1.4 + flare * 4);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.9 + 0.1 * b1;
        octagon(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        // gray facet edges
        ctx.strokeStyle = gray(0.4);
        ctx.lineWidth = 0.8;
        octagon(); ctx.stroke();
    }

    static drawBreachEffects(ctx, centerX, centerY, radius, progress) {
        ctx.save();

        // Phase 1 (0-0.3): Massive initial impact flash - white-hot burst
        if (progress < 0.4) {
            const flashIntensity = progress < 0.1
                ? progress / 0.1
                : (0.4 - progress) / 0.3;
            ctx.globalAlpha = flashIntensity * 0.9;
            const flashRadius = radius * (0.5 + progress * 5);
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, flashRadius
            );
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.15, '#FFECC0');
            gradient.addColorStop(0.35, '#E84E6A');
            gradient.addColorStop(0.6, 'rgba(232, 78, 106, 0.4)');
            gradient.addColorStop(1, 'rgba(232, 78, 106, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, flashRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Phase 2 (0.05-0.8): Triple expanding shockwave rings
        if (progress > 0.05 && progress < 0.85) {
            const rings = [
                { start: 0.05, speed: 5, width: 4, alpha: 0.8 },
                { start: 0.12, speed: 4, width: 2.5, alpha: 0.5 },
                { start: 0.2, speed: 6, width: 1.5, alpha: 0.35 },
            ];
            for (const ring of rings) {
                if (progress > ring.start) {
                    const rp = (progress - ring.start) / (0.85 - ring.start);
                    const rr = radius * (0.8 + rp * ring.speed);
                    const ra = (1 - rp) * ring.alpha;
                    ctx.globalAlpha = ra;
                    ctx.strokeStyle = '#E84E6A';
                    ctx.lineWidth = ring.width * (1 - rp * 0.7);
                    ctx.shadowColor = '#E84E6A';
                    ctx.shadowBlur = 25 * (1 - rp);
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, rr, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Phase 3 (0.05-1.0): Massive spark/debris shower - 32 particles
        if (progress > 0.05) {
            const particleProgress = (progress - 0.05) / 0.95;
            const particleCount = 32;
            const seed = 42;

            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2 + (((i * seed) % 7) * 0.3);
                const speed = 0.5 + ((i * 13 + seed) % 10) / 10 * 1.2;
                const dist = radius * (0.2 + particleProgress * speed * 5);
                const baseSize = i < 8 ? 4.5 : (i < 16 ? 3 : 2);
                const size = (baseSize - particleProgress * baseSize * 0.8) * (0.5 + ((i * 7) % 5) / 5);
                const alpha = Math.max(0, 1 - particleProgress * 1.1);

                if (size > 0.3 && alpha > 0) {
                    const px = centerX + Math.cos(angle) * dist;
                    const py = centerY + Math.sin(angle) * dist;

                    ctx.globalAlpha = alpha;
                    const colors = ['#E84E6A', '#FFFFFF', '#FFB020', '#FFD07A', '#FF6080', '#FF3366'];
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 12 * alpha;

                    // Elongated sparks for first 8 particles (streaks)
                    if (i < 8 && particleProgress < 0.6) {
                        ctx.save();
                        ctx.translate(px, py);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.ellipse(0, 0, Math.max(0.5, size * 2.5), Math.max(0.3, size * 0.5), 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    } else {
                        ctx.beginPath();
                        ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Phase 4 (0.1-0.8): Lightning/energy tendrils from core
        if (progress > 0.08 && progress < 0.85) {
            const tendrilProgress = (progress - 0.08) / 0.77;
            const tendrilAlpha = tendrilProgress < 0.3
                ? tendrilProgress / 0.3
                : Math.max(0, 1 - (tendrilProgress - 0.5) / 0.5);
            const tendrilCount = 12;

            ctx.globalAlpha = tendrilAlpha * 0.9;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < tendrilCount; i++) {
                const baseAngle = (i / tendrilCount) * Math.PI * 2 + 0.15;
                const maxLen = radius * (0.8 + tendrilProgress * 2.5);
                const segments = 5 + (i % 3);

                // Alternate colors between hot white, red, and pink
                const tColors = ['rgba(255,255,255,0.9)', 'rgba(232,78,106,0.8)', 'rgba(255,176,32,0.7)'];
                ctx.strokeStyle = tColors[i % tColors.length];
                ctx.lineWidth = (2.5 - tendrilProgress * 1.5) * (i < 6 ? 1 : 0.6);
                ctx.shadowColor = '#E84E6A';
                ctx.shadowBlur = 8;

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);

                let cx = centerX, cy = centerY;
                for (let s = 1; s <= segments; s++) {
                    const t = s / segments;
                    const jitter = ((i * 7 + s * 13) % 11 - 5) * 3 * (1 - t * 0.5);
                    const segAngle = baseAngle + jitter * 0.02;
                    cx = centerX + Math.cos(segAngle) * maxLen * t + Math.sin(segAngle + s) * jitter;
                    cy = centerY + Math.sin(segAngle) * maxLen * t - Math.cos(segAngle + s) * jitter;
                    ctx.lineTo(cx, cy);
                }
                ctx.stroke();

                // Spark at tendril tip
                if (tendrilProgress > 0.2 && tendrilProgress < 0.7) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.shadowColor = '#FFFFFF';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 1.5 + Math.sin(i + progress * 30) * 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Phase 5 (0.15-0.9): Fracture lines radiating outward - more jagged
        if (progress > 0.15) {
            const fractureProgress = Math.min(1, (progress - 0.15) / 0.5);
            const fractureAlpha = Math.min(fractureProgress, 1 - Math.max(0, (progress - 0.7) / 0.3));
            const lineCount = 12;

            ctx.globalAlpha = Math.max(0, fractureAlpha) * 0.85;
            ctx.strokeStyle = '#E84E6A';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#E84E6A';
            ctx.shadowBlur = 10;
            ctx.lineCap = 'round';

            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2 + 0.2;
                const len = radius * (0.3 + fractureProgress * 1.8);

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                // Multi-segment jagged fracture
                const segs = 3;
                for (let s = 1; s <= segs; s++) {
                    const t = s / segs;
                    const jag = ((i * 3 + s * 7) % 5 - 2) * 5;
                    const fx = centerX + Math.cos(angle) * len * t + Math.sin(angle) * jag;
                    const fy = centerY + Math.sin(angle) * len * t - Math.cos(angle) * jag;
                    ctx.lineTo(fx, fy);
                }
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Phase 6 (0.3-1.0): Pulsing energy glow around core - much larger
        if (progress > 0.25) {
            const glowProgress = (progress - 0.25) / 0.75;
            const pulseRate = progress * 40;
            const glowPulse = 0.5 + 0.4 * Math.sin(pulseRate);
            const glowRadius = radius * (1.8 + glowProgress * 1.5);

            ctx.globalAlpha = glowPulse * Math.min(1, glowProgress * 3);
            const warnGradient = ctx.createRadialGradient(
                centerX, centerY, radius * 0.2,
                centerX, centerY, glowRadius
            );
            warnGradient.addColorStop(0, 'rgba(232, 78, 106, 0.6)');
            warnGradient.addColorStop(0.3, 'rgba(232, 78, 106, 0.25)');
            warnGradient.addColorStop(0.6, 'rgba(255, 176, 32, 0.12)');
            warnGradient.addColorStop(1, 'rgba(232, 78, 106, 0)');
            ctx.fillStyle = warnGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    /**
     * Instrument range-ring framing the core: a thin bearing dial with cardinal
     * ticks and a slow amber sweep marker — makes the core read as a live
     * defense instrument rather than a bare shape. Pure visual.
     */
    static drawReactorRing(ctx, centerX, centerY, radius, gameOver, breachProgress = 0) {
        const isBreach = breachProgress > 0;
        const primary = isBreach ? '#E84E6A' : rgba(PALETTE.primary, 0.7);
        const accent = isBreach ? '#FF6080' : rgba(PALETTE.secondary, 0.9);
        // INVARIANT: ringR is EXACTLY TARGET_RADIUS — the core's collision boundary.
        // checkLaserTargetCollision() triggers a loss when a laser's centre is within
        // TARGET_RADIUS of centre, so this crisp ring is the honest hit edge and every
        // other core element (hexagon, ticks, sweep, reticle) stays inside it. Do not
        // scale ringR past `radius` or the target will look larger than it plays.
        const ringR = radius;

        ctx.save();

        // Hull boundary ring — the honest hit edge, at exactly TARGET_RADIUS
        ctx.strokeStyle = primary;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = isBreach ? '#E84E6A' : rgba(PALETTE.primary, 0.5);
        ctx.shadowBlur = isBreach ? 8 * Math.min(1, breachProgress * 3) : 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Bearing ticks (12), longer + amber at the cardinals
        for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI * 2) / 12;
            const cardinal = i % 3 === 0;
            const tickLen = cardinal ? 6 : 3;
            ctx.strokeStyle = cardinal ? accent : primary;
            ctx.lineWidth = cardinal ? 1.4 : 1;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(a) * (ringR - tickLen), centerY + Math.sin(a) * (ringR - tickLen));
            ctx.lineTo(centerX + Math.cos(a) * ringR, centerY + Math.sin(a) * ringR);
            ctx.stroke();
        }

        // Slow amber sweep marker — an active instrument, not a static ring
        if (!isBreach) {
            const sweep = (Date.now() / 2600) % (Math.PI * 2);
            ctx.strokeStyle = rgba(PALETTE.secondary, 0.8);
            ctx.lineWidth = 1.6;
            ctx.shadowColor = rgba(PALETTE.secondary, 0.6);
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(sweep) * (ringR - 8), centerY + Math.sin(sweep) * (ringR - 8));
            ctx.lineTo(centerX + Math.cos(sweep) * ringR, centerY + Math.sin(sweep) * ringR);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    static drawChipBody(ctx, centerX, centerY, chipSize, gameOver, breachProgress = 0) {
        // Shake effect during breach - more intense
        let offsetX = 0, offsetY = 0;
        if (breachProgress > 0 && breachProgress < 0.7) {
            const shakeIntensity = Math.min(breachProgress * 12, 5) * (1 - breachProgress / 0.7);
            offsetX = Math.sin(breachProgress * 120) * shakeIntensity;
            offsetY = Math.cos(breachProgress * 130) * shakeIntensity;
        }

        const cx = centerX + offsetX;
        const cy = centerY + offsetY;

        // Black interior
        ctx.fillStyle = gameOver ? '#1a0608' : '#050403';
        // Amber outline with bloom (breach / game-over flares red)
        ctx.strokeStyle = gameOver ? '#E84E6A' : rgba(PALETTE.primary, 0.95);
        ctx.lineWidth = 3;
        ctx.shadowColor = rgba(PALETTE.primary, 0.5);
        ctx.shadowBlur = gameOver ? 0 : 8;

        // During breach, chip outline glows hot
        if (breachProgress > 0) {
            ctx.shadowColor = '#E84E6A';
            ctx.shadowBlur = 15 * Math.min(1, breachProgress * 3);
            ctx.strokeStyle = '#E84E6A';
        }

        // Hexagonal chip outline
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = cx + Math.cos(angle) * chipSize;
            const y = cy + Math.sin(angle) * chipSize;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Amber glowing core ball
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 300);
        const coreRadius = chipSize * 0.4;

        // During breach, the core flares massively bright
        const breachFlare = breachProgress > 0 ? Math.min(1, breachProgress * 4) : 0;

        ctx.shadowColor = breachProgress > 0 ? '#E84E6A' : rgba(PALETTE.secondary, 1);
        ctx.shadowBlur = coreRadius * (0.9 + breachFlare * 4);
        ctx.fillStyle = gameOver ? '#E84E6A' : (breachFlare > 0.5 ? '#FF6080' : rgba(PALETTE.secondary, 1));
        ctx.globalAlpha = Math.min(1, pulseIntensity + breachFlare * 0.6);
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * (1 + breachFlare * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    static drawCircuitPattern(ctx, centerX, centerY, chipSize, gameOver, breachProgress = 0) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = gameOver ? '#E84E6A' : rgba(PALETTE.primary, 0.7);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // During breach, circuits flicker rapidly
        if (breachProgress > 0.15) {
            const flicker = Math.sin(breachProgress * 80) > 0 ? 1 : 0.15;
            ctx.globalAlpha = flicker;
            // Circuits go red during breach
            ctx.strokeStyle = '#E84E6A';
            ctx.shadowColor = '#E84E6A';
            ctx.shadowBlur = 4 * flicker;
        }

        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const innerRadius = chipSize * 0.5;
            const outerRadius = chipSize * 0.75;

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
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    static drawChipPins(ctx, centerX, centerY, chipSize, gameOver, breachProgress = 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = gameOver ? '#E84E6A' : rgba(PALETTE.primary, 0.85);

        if (breachProgress > 0.2) {
            ctx.globalAlpha = Math.sin(breachProgress * 60) > 0 ? 1 : 0.1;
            ctx.shadowColor = '#FF3366';
            ctx.shadowBlur = 6;
        }

        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize * 0.85;
            const y = centerY + Math.sin(angle) * chipSize * 0.85;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    static drawCentralIndicator(ctx, centerX, centerY, chipSize, gameOver, breachProgress = 0) {
        if (breachProgress > 0) {
            // Breach: hot pulsing core dot (unchanged behaviour).
            const intensity = Math.min(1, breachProgress * 5);
            ctx.shadowBlur = 20 + intensity * 30;
            ctx.shadowColor = breachProgress > 0.3 ? '#FF3366' : '#FFFFFF';
            ctx.fillStyle = breachProgress > 0.4 ? '#FF3366' : '#ffffff';
            ctx.globalAlpha = Math.max(0.6, intensity);
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3 + intensity * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        // Normal core needs no central mark — the amber glowing ball drawn by
        // drawChipBody is the centre.
    }
}
