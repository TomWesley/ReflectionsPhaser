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
    
    update(deltaTime) {
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
        
        // Move laser (frame-rate independent)
        // Base multiplier 60 (for 60fps), then * 0.4 for 60% slower (40% of original speed)
        this.x += this.vx * deltaTime * 35;
        this.y += this.vy * deltaTime * 35;
        
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
        // Draw trail with dramatic fade - bright at head, dim at tail
        if (this.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw trail segments individually for smooth gradient effect
            for (let i = 1; i < this.trail.length; i++) {
                // Progress from 0 (tail) to 1 (head)
                const progress = i / this.trail.length;
                // Use exponential curve for more dramatic fade
                const intensity = Math.pow(progress, 2);

                const prev = this.trail[i - 1];
                const curr = this.trail[i];

                // Outer glow - very faint at tail, visible near head
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.lineWidth = 6 + intensity * 6; // 6-12px width
                ctx.strokeStyle = `rgba(255, 100, 150, ${intensity * 0.3})`;
                ctx.stroke();

                // Middle glow
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.lineWidth = 3 + intensity * 4; // 3-7px width
                ctx.strokeStyle = `rgba(255, 50, 120, ${intensity * 0.6})`;
                ctx.stroke();

                // Core trail - bright pink/white gradient
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.lineWidth = 1 + intensity * 3; // 1-4px width
                // Interpolate from dim pink to bright white-pink
                const r = Math.round(255);
                const g = Math.round(50 + intensity * 200); // 50-250
                const b = Math.round(110 + intensity * 145); // 110-255
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
                ctx.stroke();
            }

            ctx.restore();
        }

        // Draw laser head with intense pulsing glow
        ctx.save();

        // Pulsing effect using time
        const pulse = 0.8 + Math.sin(Date.now() * 0.01) * 0.2; // 0.6-1.0 pulse

        // Large outer glow
        ctx.shadowColor = '#FF69B4';
        ctx.shadowBlur = 30 * pulse;
        ctx.fillStyle = `rgba(255, 105, 180, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS * 5, 0, Math.PI * 2);
        ctx.fill();

        // Medium glow
        ctx.shadowColor = '#FF1493';
        ctx.shadowBlur = 20 * pulse;
        ctx.fillStyle = `rgba(255, 20, 147, ${0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS * 3, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright glow
        ctx.shadowBlur = 15 * pulse;
        ctx.fillStyle = `rgba(255, 100, 180, ${0.8 * pulse})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core - bright white/pink center
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Hot white center
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.LASER_RADIUS * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}