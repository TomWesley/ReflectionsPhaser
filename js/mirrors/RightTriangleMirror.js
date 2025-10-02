import { BaseMirror } from './BaseMirror.js';

export class RightTriangleMirror extends BaseMirror {
    getShapeType() {
        return 'rightTriangle';
    }

    initializeProperties() {
        this.shape = 'rightTriangle';
        this.size = this.getRandomSize();
        this.width = this.size;
        this.height = this.size;

        // Right triangles support rotation
        this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, or 270 degrees
    }

    drawShape(ctx) {
        const points = this.getVertices();
        this.drawMirrorSurface(ctx, points);
        this.drawMirrorBorder(ctx, points);
    }

    reflectShape(laser) {
        const edges = this.getRightTriangleEdges();

        // Find which edge the laser is closest to
        let closestEdge = null;
        let minDistance = Infinity;

        for (const edge of edges) {
            const distance = this.distanceToLineSegment(laser.x, laser.y, edge.start, edge.end);
            if (distance < minDistance) {
                minDistance = distance;
                closestEdge = edge;
            }
        }

        if (closestEdge) {
            // Calculate reflection based on edge normal
            const edgeVector = {
                x: closestEdge.end.x - closestEdge.start.x,
                y: closestEdge.end.y - closestEdge.start.y
            };

            // Calculate normal vector (perpendicular to edge)
            const normal = {
                x: -edgeVector.y,
                y: edgeVector.x
            };

            // Normalize the normal vector
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
            normal.x /= length;
            normal.y /= length;

            // Reflect velocity vector
            const dot = laser.vx * normal.x + laser.vy * normal.y;
            laser.vx = laser.vx - 2 * dot * normal.x;
            laser.vy = laser.vy - 2 * dot * normal.y;

            this.snapLaserAngle(laser);
        }
    }

    getRightTriangleEdges() {
        const points = this.getRightTrianglePoints();
        return [
            { start: points[0], end: points[1] }, // bottom edge
            { start: points[1], end: points[2] }, // hypotenuse
            { start: points[2], end: points[0] }  // left edge
        ];
    }

    getRightTrianglePoints() {
        const halfSize = this.size / 2;
        let points = [
            { x: this.x - halfSize, y: this.y + halfSize }, // bottom-left (right angle)
            { x: this.x + halfSize, y: this.y + halfSize }, // bottom-right
            { x: this.x - halfSize, y: this.y - halfSize }  // top-left
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