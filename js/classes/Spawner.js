// Spawner Class - Handles laser spawn points and direction indicators
class Spawner {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw glowing spawner body
        ctx.shadowColor = '#ff0080';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff0080';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ff66cc';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw laser preview path - bright and visible
        const pathLength = 150;
        const endX = this.x + Math.cos(this.angle) * pathLength;
        const endY = this.y + Math.sin(this.angle) * pathLength;
        
        // Outer glow for path
        ctx.shadowColor = '#ff0080';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255, 0, 128, 0.4)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Bright inner path
        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#ff0080';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Bright arrowhead
        const arrowSize = 12;
        const arrowAngle1 = this.angle + Math.PI * 0.8;
        const arrowAngle2 = this.angle - Math.PI * 0.8;
        
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ff0080';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX + Math.cos(arrowAngle1) * arrowSize, endY + Math.sin(arrowAngle1) * arrowSize);
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX + Math.cos(arrowAngle2) * arrowSize, endY + Math.sin(arrowAngle2) * arrowSize);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Create a laser from this spawner
    createLaser() {
        return new Laser(this.x, this.y, this.angle);
    }
    
    // Generate random positions anywhere along the perimeter
    static getRandomEdgePositions(count) {
        const positions = [];
        const perimeter = 2 * (GameConfig.CANVAS_WIDTH + GameConfig.CANVAS_HEIGHT);
        
        // Generate random positions along perimeter
        for (let i = 0; i < count; i++) {
            const t = Math.random() * perimeter;
            let x, y;
            
            if (t < GameConfig.CANVAS_WIDTH) {
                // Top edge
                x = t;
                y = 0;
            } else if (t < GameConfig.CANVAS_WIDTH + GameConfig.CANVAS_HEIGHT) {
                // Right edge
                x = GameConfig.CANVAS_WIDTH;
                y = t - GameConfig.CANVAS_WIDTH;
            } else if (t < 2 * GameConfig.CANVAS_WIDTH + GameConfig.CANVAS_HEIGHT) {
                // Bottom edge
                x = GameConfig.CANVAS_WIDTH - (t - GameConfig.CANVAS_WIDTH - GameConfig.CANVAS_HEIGHT);
                y = GameConfig.CANVAS_HEIGHT;
            } else {
                // Left edge
                x = 0;
                y = GameConfig.CANVAS_HEIGHT - (t - 2 * GameConfig.CANVAS_WIDTH - GameConfig.CANVAS_HEIGHT);
            }
            
            positions.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        return positions;
    }
    
    // Generate random angle towards center with variation
    static generateRandomAngleToCenter(x, y) {
        const centerX = GameConfig.CANVAS_WIDTH / 2;
        const centerY = GameConfig.CANVAS_HEIGHT / 2;
        
        // Get the direct angle to center
        const directAngle = Math.atan2(centerY - y, centerX - x);
        const directDegrees = directAngle * 180 / Math.PI;
        
        // Add random variation
        const maxVariation = GameConfig.LASER_ANGLE_VARIATION / 2; // ±60 degrees default
        const variation = (Math.random() - 0.5) * GameConfig.LASER_ANGLE_VARIATION;
        const randomDegrees = directDegrees + variation;
        
        // Snap to angle increments
        const snappedDegrees = Math.round(randomDegrees / GameConfig.ANGLE_INCREMENT) * GameConfig.ANGLE_INCREMENT;
        return snappedDegrees * Math.PI / 180;
    }
}