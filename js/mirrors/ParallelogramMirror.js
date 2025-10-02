import { BaseMirror } from './BaseMirror.js';

export class ParallelogramMirror extends BaseMirror {
    getShapeType() {
        return 'parallelogram';
    }

    initializeProperties() {
        this.shape = 'parallelogram';
        this.size = this.getRandomSize();
        this.width = this.size;  // Base
        this.height = this.getRandomSize();
        this.skew = 20; // Default horizontal skew

        // Parallelograms support rotation
        this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, or 270 degrees
    }

    drawShape(ctx) {
        const points = this.getParallelogramPoints();
        this.drawMirrorSurface(ctx, points);
        this.drawMirrorBorder(ctx, points);
    }

    reflectShape(laser) {
        // For now, use rectangle reflection as baseline
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const relX = laser.x - this.x;
        const relY = laser.y - this.y;

        // Determine which edge is closest
        const distances = {
            left: Math.abs(relX + halfWidth),
            right: Math.abs(relX - halfWidth),
            top: Math.abs(relY + halfHeight),
            bottom: Math.abs(relY - halfHeight)
        };

        const closestEdge = Object.keys(distances).reduce((a, b) =>
            distances[a] < distances[b] ? a : b
        );

        // Reflect based on edge
        if (closestEdge === 'left' || closestEdge === 'right') {
            laser.vx = -laser.vx; // Horizontal reflection
        } else {
            laser.vy = -laser.vy; // Vertical reflection
        }

        this.snapLaserAngle(laser);
    }

    getParallelogramPoints() {
        const halfHeight = this.height / 2;
        const halfWidth = this.width / 2;
        const skew = this.skew || 20;

        // Create parallelogram points - same as validation system
        let points = [
            { x: this.x - halfWidth, y: this.y + halfHeight },        // bottom-left
            { x: this.x + halfWidth, y: this.y + halfHeight },        // bottom-right
            { x: this.x + halfWidth + skew, y: this.y - halfHeight }, // top-right (skewed)
            { x: this.x - halfWidth + skew, y: this.y - halfHeight }  // top-left (skewed)
        ];

        // Apply rotation if needed
        if (this.rotation) {
            const angle = this.rotation * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            points = points.map(p => ({
                x: this.x + (p.x - this.x) * cos - (p.y - this.y) * sin,
                y: this.y + (p.x - this.x) * sin + (p.y - this.y) * cos
            }));
        }

        return points;
    }
}