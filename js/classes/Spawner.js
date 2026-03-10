export class Spawner {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    }

    draw(ctx, showPreview = true) {
        ctx.save();

        // Colors: arc blue outer, pink/mint inner based on mode
        const outerColor = '#4E78E8';  // Arc blue
        const innerColor = this.isDailyChallenge ? '#32FFB4' : '#E87ADC';

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
            const pathLength = 30;
            const endX = this.x + Math.cos(this.angle) * pathLength;
            const endY = this.y + Math.sin(this.angle) * pathLength;

            // Arc blue for preview path
            const pathOuterColor = 'rgba(78, 120, 232, 0.4)';

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

            // Bright arrowhead - Arc blue
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

    drawAngleTooltip(ctx, arrowTipX, arrowTipY) {
        // Convert radians to degrees (0-360), where 0 = right, 90 = down
        let degrees = (this.angle * 180 / Math.PI) % 360;
        if (degrees < 0) degrees += 360;
        const angleStr = `${degrees.toFixed(1)}°`;

        ctx.save();
        ctx.shadowBlur = 0;

        // Position tooltip along the arrow direction, past the tip
        const tooltipDist = 22;
        let tx = arrowTipX + Math.cos(this.angle) * tooltipDist;
        let ty = arrowTipY + Math.sin(this.angle) * tooltipDist;

        // Measure text for pill background
        ctx.font = '700 15px "JetBrains Mono", "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(angleStr).width;

        const pillW = textWidth + 16;
        const pillH = 26;
        const px = tx - pillW / 2;
        const py = ty - pillH / 2;

        // Clamp to canvas bounds
        const margin = 4;
        if (px < margin) tx += (margin - px);
        if (px + pillW > 800 - margin) tx -= (px + pillW - 800 + margin);
        if (py < margin) ty += (margin - py);
        if (py + pillH > 600 - margin) ty -= (py + pillH - 600 + margin);

        const finalPx = tx - pillW / 2;
        const finalPy = ty - pillH / 2;

        // Background pill
        ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(finalPx, finalPy, pillW, pillH, 5);
        } else {
            ctx.rect(finalPx, finalPy, pillW, pillH);
        }
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(78, 120, 232, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(finalPx, finalPy, pillW, pillH, 5);
        } else {
            ctx.rect(finalPx, finalPy, pillW, pillH);
        }
        ctx.stroke();

        // Text
        ctx.fillStyle = '#4E78E8';
        ctx.shadowColor = '#4E78E8';
        ctx.shadowBlur = 4;
        ctx.fillText(angleStr, tx, ty);

        ctx.restore();
    }
}
