// Spawner Class - Handles laser spawn points and direction indicators
class Spawner {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
    
    draw(ctx) {
        // Draw spawner body
        ctx.fillStyle = GameConfig.COLORS.SPAWNER_BODY;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction indicator
        const directionLength = 20;
        const endX = this.x + Math.cos(this.angle) * directionLength;
        const endY = this.y + Math.sin(this.angle) * directionLength;
        
        ctx.strokeStyle = GameConfig.COLORS.SPAWNER_ARROW;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw arrowhead
        const arrowSize = 6;
        const arrowAngle1 = this.angle + Math.PI * 0.8;
        const arrowAngle2 = this.angle - Math.PI * 0.8;
        
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX + Math.cos(arrowAngle1) * arrowSize, endY + Math.sin(arrowAngle1) * arrowSize);
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX + Math.cos(arrowAngle2) * arrowSize, endY + Math.sin(arrowAngle2) * arrowSize);
        ctx.stroke();
        
        // Draw angle indicator text (for debugging/clarity)
        if (GameConfig.SHOW_DEBUG_INFO) {
            const degrees = Math.round(this.angle * 180 / Math.PI);
            ctx.fillStyle = GameConfig.COLORS.SPAWNER_BODY;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${degrees}°`, this.x, this.y - 15);
        }
    }
    
    // Create a laser from this spawner
    createLaser() {
        return new Laser(this.x, this.y, this.angle);
    }
    
    // Get position for placing spawner on edge
    static getEdgePositions() {
        return [
            { x: 0, y: GameConfig.CANVAS_HEIGHT / 2 }, // Left edge
            { x: GameConfig.CANVAS_WIDTH, y: GameConfig.CANVAS_HEIGHT / 2 }, // Right edge
            { x: GameConfig.CANVAS_WIDTH / 2, y: 0 }, // Top edge
            { x: GameConfig.CANVAS_WIDTH / 2, y: GameConfig.CANVAS_HEIGHT } // Bottom edge
        ];
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