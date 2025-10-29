export class Spawner {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
    
    draw(ctx, showPreview = true) {
        ctx.save();

        // Draw glowing spawner body - sunset purple
        ctx.shadowColor = '#8338EC';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#8338EC';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core - sunset coral/pink
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FF8FA3';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw laser preview path only during setup phase
        if (showPreview) {
            const pathLength = 30; // Shorter preview path
            const endX = this.x + Math.cos(this.angle) * pathLength;
            const endY = this.y + Math.sin(this.angle) * pathLength;

            // Outer glow for path
            ctx.shadowColor = '#8338EC';
            ctx.shadowBlur = 14;
            ctx.strokeStyle = 'rgba(131, 56, 236, 0.4)';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Bright inner path
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#8338EC';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Bright arrowhead
            const arrowSize = 12;
            const arrowAngle1 = this.angle + Math.PI * 0.8;
            const arrowAngle2 = this.angle - Math.PI * 0.8;

            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#8338EC';
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