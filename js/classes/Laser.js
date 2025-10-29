import { CONFIG } from '../config.js';

export class Laser {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * CONFIG.LASER_SPEED;
        this.vy = Math.sin(angle) * CONFIG.LASER_SPEED;
        this.trail = [];
        this.lastReflectedMirror = null;
        this.reflectionCooldown = 0;
        this.totalReflections = 0;
        this.maxReflections = 50; // Prevent infinite bouncing
    }
    
    update() {
        // Store previous position for continuous collision detection
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Decrease reflection cooldown
        if (this.reflectionCooldown > 0) {
            this.reflectionCooldown--;
        }
        
        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 80) {
            this.trail.shift();
        }
        
        // Move laser
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off walls
        if (this.x <= 0 || this.x >= CONFIG.CANVAS_WIDTH) {
            this.vx = -this.vx;
            this.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH, this.x));
        }
        if (this.y <= 0 || this.y >= CONFIG.CANVAS_HEIGHT) {
            this.vy = -this.vy;
            this.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT, this.y));
        }
    }
    
    reflect(mirror) {
        // Check if laser has reflected too many times (infinite bouncing prevention)
        if (this.totalReflections >= this.maxReflections) {
            // Mark laser for removal by setting it out of bounds
            this.x = -100;
            this.y = -100;
            return;
        }

        // Set cooldown to prevent immediate re-reflection
        this.reflectionCooldown = 5; // Increased from 3 to 5 frames for better stability
        this.lastReflectedMirror = mirror;
        this.totalReflections++;

        // Call the mirror's reflection logic
        mirror.reflect(this);
    }
    
    draw(ctx) {
        // Draw enhanced trail with sunset pink/purple gradient
        if (this.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer glow trail
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(255, 0, 110, 0.12)';
            ctx.beginPath();
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.12;
                ctx.globalAlpha = alpha;
                ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();

            // Middle glow trail
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255, 0, 110, 0.35)';
            ctx.beginPath();
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.35;
                ctx.globalAlpha = alpha;
                ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();

            // Inner bright trail
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 0, 110, 0.85)';
            ctx.beginPath();
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.85;
                ctx.globalAlpha = alpha;
                ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();

            ctx.restore();
        }

        // Draw laser point with enhanced glow - sunset pink
        ctx.save();

        // Outer glow
        ctx.shadowColor = '#FF006E';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255, 0, 110, 0.35)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS * 3, 0, Math.PI * 2);
        ctx.fill();

        // Middle glow
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(255, 0, 110, 0.65)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core laser point - bright sunset pink
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FF006E';
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw direction indicator with glow
        const dirLength = 12;
        const endX = this.x + (this.vx / CONFIG.LASER_SPEED) * dirLength;
        const endY = this.y + (this.vy / CONFIG.LASER_SPEED) * dirLength;

        ctx.save();
        ctx.shadowColor = '#FF006E';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#FF006E';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }
}