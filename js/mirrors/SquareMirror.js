import { BaseMirror } from './BaseMirror.js';

export class SquareMirror extends BaseMirror {
    getShapeType() {
        return 'square';
    }

    initializeProperties() {
        this.shape = 'square';
        this.size = this.getRandomSize();
        this.width = this.size;
        this.height = this.size;
        // Squares don't rotate
    }

    drawShape(ctx) {
        const points = this.getSquarePoints();
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

    getSquarePoints() {
        const halfSize = this.size / 2;

        // Create square points
        let points = [
            { x: this.x - halfSize, y: this.y - halfSize }, // top-left
            { x: this.x + halfSize, y: this.y - halfSize }, // top-right
            { x: this.x + halfSize, y: this.y + halfSize }, // bottom-right
            { x: this.x - halfSize, y: this.y + halfSize }  // bottom-left
        ];

        // Apply rotation if needed (squares currently don't rotate, but keeping for consistency)
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