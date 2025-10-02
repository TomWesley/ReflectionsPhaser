import { BaseMirror } from './BaseMirror.js';

export class RectangleMirror extends BaseMirror {
    getShapeType() {
        return 'rectangle';
    }

    initializeProperties() {
        this.shape = 'rectangle';
        this.size = this.getRandomSize();
        this.width = this.size;
        this.height = this.getRandomSize();

        // Ensure rectangle is actually rectangular
        while (this.height === this.width) {
            this.height = this.getRandomSize();
        }
        // Rectangles don't rotate
    }

    drawShape(ctx) {
        const points = this.getVertices();
        this.drawMirrorSurface(ctx, points);
        this.drawMirrorBorder(ctx, points);
    }

    reflectShape(laser) {
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