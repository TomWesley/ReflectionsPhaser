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
        this.skew = 20; // Default horizontal skew (equals grid size)

        // Parallelograms support rotation
        this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, or 270 degrees
    }

    /**
     * Calculate vertices - CANONICAL SOURCE OF TRUTH
     */
    calculateVertices() {
        const halfHeight = this.height / 2;
        const halfWidth = this.width / 2;
        const skew = this.skew || 20;

        // Create parallelogram vertices in clockwise order
        let vertices = [
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

            vertices = vertices.map(v => ({
                x: this.x + (v.x - this.x) * cos - (v.y - this.y) * sin,
                y: this.y + (v.x - this.x) * sin + (v.y - this.y) * cos
            }));
        }

        return vertices;
    }

    reflectShape(laser) {
        // Get edges from canonical vertices
        const edges = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const next = (i + 1) % this.vertices.length;
            edges.push({
                start: this.vertices[i],
                end: this.vertices[next]
            });
        }

        // Find closest edge
        let closestEdge = edges[0];
        let minDistance = Infinity;

        for (let edge of edges) {
            const dist = this.distanceToLineSegment(laser.x, laser.y, edge.start, edge.end);
            if (dist < minDistance) {
                minDistance = dist;
                closestEdge = edge;
            }
        }

        // Reflect across closest edge
        this.reflectAcrossLine(laser, closestEdge.start.x, closestEdge.start.y, closestEdge.end.x, closestEdge.end.y);
        this.snapLaserAngle(laser);
    }
}
