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
        const points = this.getVertices();
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
}