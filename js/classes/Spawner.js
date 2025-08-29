export class Spawner {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
    
    draw(ctx, showPreview = true) {
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
        
        // Draw laser preview path only during setup phase
        if (showPreview) {
            const pathLength = 30; // Shorter preview path
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
        }
        
        ctx.restore();
    }
}