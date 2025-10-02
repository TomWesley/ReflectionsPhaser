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
        const points = this.getRectanglePoints();
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

    getRectanglePoints() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Create rectangle points
        let points = [
            { x: this.x - halfWidth, y: this.y - halfHeight }, // top-left
            { x: this.x + halfWidth, y: this.y - halfHeight }, // top-right
            { x: this.x + halfWidth, y: this.y + halfHeight }, // bottom-right
            { x: this.x - halfWidth, y: this.y + halfHeight }  // bottom-left
        ];

        // Apply rotation if needed (rectangles currently don't rotate, but keeping for consistency)
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