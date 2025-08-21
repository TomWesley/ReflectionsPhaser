// Laser Class - Handles laser physics and rendering
class Laser {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * GameConfig.LASER_SPEED;
        this.vy = Math.sin(angle) * GameConfig.LASER_SPEED;
        this.trail = [];
        this.reflectionCount = 0;
        
        // Track current angle for precision collision system
        this.currentAngle = angle * 180 / Math.PI;
    }
    
    update() {
        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > GameConfig.LASER_TRAIL_LENGTH) {
            this.trail.shift();
        }
        
        // Move laser
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off walls with perfect reflection
        this.bounceOffWalls();
    }
    
    bounceOffWalls() {
        let bounced = false;
        
        // Left/Right walls
        if (this.x <= 0) {
            this.x = 0;
            this.vx = -this.vx;
            bounced = true;
        } else if (this.x >= GameConfig.CANVAS_WIDTH) {
            this.x = GameConfig.CANVAS_WIDTH;
            this.vx = -this.vx;
            bounced = true;
        }
        
        // Top/Bottom walls
        if (this.y <= 0) {
            this.y = 0;
            this.vy = -this.vy;
            bounced = true;
        } else if (this.y >= GameConfig.CANVAS_HEIGHT) {
            this.y = GameConfig.CANVAS_HEIGHT;
            this.vy = -this.vy;
            bounced = true;
        }
        
        // Snap angle after wall bounce
        if (bounced) {
            this.snapAngle();
            this.reflectionCount++;
        }
    }
    
    snapAngle() {
        const currentAngle = Math.atan2(this.vy, this.vx);
        const degrees = currentAngle * 180 / Math.PI;
        const snappedDegrees = Math.round(degrees / GameConfig.ANGLE_INCREMENT) * GameConfig.ANGLE_INCREMENT;
        const snappedAngle = snappedDegrees * Math.PI / 180;
        
        this.vx = Math.cos(snappedAngle) * GameConfig.LASER_SPEED;
        this.vy = Math.sin(snappedAngle) * GameConfig.LASER_SPEED;
        
        // Update tracked angle
        this.currentAngle = snappedDegrees;
    }
    
    draw(ctx) {
        // Draw enhanced trail with multiple glow layers
        if (this.trail.length > 1) {
            // Outer glow trail
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.1;
                ctx.globalAlpha = alpha;
                ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
            
            // Middle glow trail
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.3;
                ctx.globalAlpha = alpha;
                ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
            
            // Inner bright trail
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.beginPath();
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.8;
                ctx.globalAlpha = alpha;
                ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
            
            ctx.globalAlpha = 1;
        }
        
        // Draw laser point with enhanced glow
        ctx.save();
        
        // Outer glow
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, GameConfig.LASER_RADIUS * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Middle glow
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, GameConfig.LASER_RADIUS * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core laser point
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, GameConfig.LASER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Draw direction indicator with glow
        const dirLength = 12;
        const endX = this.x + (this.vx / GameConfig.LASER_SPEED) * dirLength;
        const endY = this.y + (this.vy / GameConfig.LASER_SPEED) * dirLength;
        
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }
    
    // Check collision with target
    checkTargetCollision() {
        const centerX = GameConfig.CANVAS_WIDTH / 2;
        const centerY = GameConfig.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((this.x - centerX) ** 2 + (this.y - centerY) ** 2);
        return distance <= GameConfig.TARGET_RADIUS;
    }
    
    // Check collision with mirrors using precision system
    checkMirrorCollisions(mirrors) {
        return PrecisionCollision.checkLaserCollision(this, mirrors);
    }
    
    // Check if laser is out of bounds (for cleanup)
    isOutOfBounds() {
        return this.x < -50 || this.x > GameConfig.CANVAS_WIDTH + 50 || 
               this.y < -50 || this.y > GameConfig.CANVAS_HEIGHT + 50;
    }
}