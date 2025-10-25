import { CONFIG } from '../config.js';
import { IronCladValidator } from '../utils/IronCladValidator.js';
import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';

/**
 * GameRenderer - Handles all rendering operations for the game
 * Responsibilities:
 * - Drawing grid
 * - Drawing target
 * - Drawing spawners
 * - Drawing mirrors
 * - Drawing lasers
 * - Drawing forbidden zones
 * - Drawing validation violations
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
        this.drawGrid();

        // Draw center target
        this.drawTarget();

        // Draw spawners
        this.game.spawners.forEach(spawner => spawner.draw(this.ctx));

        // Draw mirrors
        this.game.mirrors.forEach(mirror => mirror.draw(this.ctx));

        // Draw lasers
        this.game.lasers.forEach(laser => laser.draw(this.ctx));

        // Draw forbidden zones and validation violations when not playing
        if (!this.game.isPlaying) {
            this.drawForbiddenZones();
            this.drawValidationViolations();
        }
    }

    /**
     * Draw the grid lines
     */
    drawGrid() {
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw the center target
     */
    drawTarget() {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const radius = CONFIG.TARGET_RADIUS;

        this.ctx.save();

        // Outer protective aura - pulsing effect
        const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() / 300);
        this.ctx.globalAlpha = pulseIntensity * 0.3;
        this.ctx.shadowColor = this.game.gameOver ? '#ff0000' : '#00ff88';
        this.ctx.shadowBlur = 40;
        this.ctx.fillStyle = this.game.gameOver ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 136, 0.1)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Middle aura ring
        this.ctx.globalAlpha = pulseIntensity * 0.5;
        this.ctx.shadowBlur = 25;
        this.ctx.fillStyle = this.game.gameOver ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 136, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner aura
        this.ctx.globalAlpha = pulseIntensity * 0.7;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = this.game.gameOver ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 136, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;

        // Main computer chip body - hexagonal with rounded corners
        const chipSize = radius * 0.9;
        this.ctx.fillStyle = this.game.gameOver ? '#660000' : '#003322';
        this.ctx.strokeStyle = this.game.gameOver ? '#ff3366' : '#00ff88';
        this.ctx.lineWidth = 3;

        // Draw hexagonal chip outline
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize;
            const y = centerY + Math.sin(angle) * chipSize;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Inner chip core - smaller circle with glow
        this.ctx.shadowColor = this.game.gameOver ? '#ff3366' : '#00ff88';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = this.game.gameOver ? '#ff1144' : '#00ff66';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, chipSize * 0.4, 0, Math.PI * 2);
        this.ctx.fill();

        // Circuit pattern lines radiating from center
        this.ctx.shadowBlur = 5;
        this.ctx.strokeStyle = this.game.gameOver ? '#ff6699' : '#66ffaa';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';

        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const innerRadius = chipSize * 0.5;
            const outerRadius = chipSize * 0.8;

            this.ctx.beginPath();
            this.ctx.moveTo(
                centerX + Math.cos(angle) * innerRadius,
                centerY + Math.sin(angle) * innerRadius
            );
            this.ctx.lineTo(
                centerX + Math.cos(angle) * outerRadius,
                centerY + Math.sin(angle) * outerRadius
            );
            this.ctx.stroke();
        }

        // Corner connection points (like chip pins)
        this.ctx.shadowBlur = 3;
        this.ctx.fillStyle = this.game.gameOver ? '#ff4477' : '#44ff77';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize * 0.9;
            const y = centerY + Math.sin(angle) * chipSize * 0.9;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Central processing indicator - pulsing dot
        this.ctx.shadowBlur = 8;
        this.ctx.fillStyle = this.game.gameOver ? '#ffffff' : '#ffffff';
        const centralPulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
        this.ctx.globalAlpha = centralPulse;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * Draw forbidden zones overlay
     */
    drawForbiddenZones() {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';

        // Center forbidden zone (8x8 grid square)
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenSquareSize = 8 * CONFIG.GRID_SIZE;
        const halfForbiddenSize = forbiddenSquareSize / 2;

        this.ctx.fillRect(
            centerX - halfForbiddenSize,
            centerY - halfForbiddenSize,
            forbiddenSquareSize,
            forbiddenSquareSize
        );

        // Edge forbidden zones
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.EDGE_MARGIN);
        this.ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - CONFIG.EDGE_MARGIN, CONFIG.CANVAS_WIDTH, CONFIG.EDGE_MARGIN);
        this.ctx.fillRect(0, 0, CONFIG.EDGE_MARGIN, CONFIG.CANVAS_HEIGHT);
        this.ctx.fillRect(CONFIG.CANVAS_WIDTH - CONFIG.EDGE_MARGIN, 0, CONFIG.EDGE_MARGIN, CONFIG.CANVAS_HEIGHT);
    }

    /**
     * Draw validation violations for invalid mirror placements
     */
    drawValidationViolations() {
        // Only show violations when not playing
        if (this.game.isPlaying) return;

        this.ctx.save();

        for (let mirror of this.game.mirrors) {
            // Skip mirrors being dragged
            if (mirror.isDragging) continue;

            const validation = IronCladValidator.validateMirror(mirror, this.game.mirrors);

            if (!validation.valid) {
                // Draw violations
                const vertices = MirrorPlacementValidation.getMirrorVertices(mirror);

                // Highlight the invalid mirror with red outline
                this.ctx.strokeStyle = '#ff0000';
                this.ctx.lineWidth = 4;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                vertices.forEach((vertex, i) => {
                    if (i === 0) this.ctx.moveTo(vertex.x, vertex.y);
                    else this.ctx.lineTo(vertex.x, vertex.y);
                });
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                // Draw violation markers on vertices that are not on grid
                validation.rule1.violations.forEach(violation => {
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.arc(violation.vertex.x, violation.vertex.y, 5, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Draw X marker
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(violation.vertex.x - 3, violation.vertex.y - 3);
                    this.ctx.lineTo(violation.vertex.x + 3, violation.vertex.y + 3);
                    this.ctx.moveTo(violation.vertex.x + 3, violation.vertex.y - 3);
                    this.ctx.lineTo(violation.vertex.x - 3, violation.vertex.y + 3);
                    this.ctx.stroke();
                });

                // Draw warning icon near mirror center
                this.ctx.fillStyle = '#ff0000';
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('⚠', mirror.x, mirror.y - 40);
            } else {
                // Draw green checkmark for valid mirrors
                const vertices = MirrorPlacementValidation.getMirrorVertices(mirror);

                // Draw green dots on vertices to show they're correctly aligned
                this.ctx.fillStyle = '#00ff00';
                vertices.forEach(vertex => {
                    this.ctx.beginPath();
                    this.ctx.arc(vertex.x, vertex.y, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                });
            }
        }

        this.ctx.restore();
    }
}
