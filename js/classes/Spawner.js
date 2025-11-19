export class Spawner {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
    
    draw(ctx, showPreview = true) {
        ctx.save();

        // Choose colors based on daily challenge mode
        const outerColor = this.isDailyChallenge ? '#32FFB4' : '#8338EC';  // Mint green or sunset purple
        const innerColor = this.isDailyChallenge ? '#7FFFD4' : '#FF8FA3';  // Aquamarine or sunset coral/pink

        // Draw glowing spawner body
        ctx.shadowColor = outerColor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = outerColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.shadowBlur = 10;
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw laser preview path only during setup phase
        if (showPreview) {
            const pathLength = 30; // Shorter preview path
            const endX = this.x + Math.cos(this.angle) * pathLength;
            const endY = this.y + Math.sin(this.angle) * pathLength;

            // Colors for preview path
            const pathOuterColor = this.isDailyChallenge ? 'rgba(50, 255, 180, 0.4)' : 'rgba(131, 56, 236, 0.4)';

            // Outer glow for path
            ctx.shadowColor = outerColor;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = pathOuterColor;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Bright inner path
            ctx.shadowBlur = 8;
            ctx.strokeStyle = outerColor;
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
            ctx.strokeStyle = outerColor;
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