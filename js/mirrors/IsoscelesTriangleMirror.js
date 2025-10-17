import { BaseMirror } from './BaseMirror.js';

export class IsoscelesTriangleMirror extends BaseMirror {
    getShapeType() {
        return 'isoscelesTriangle';
    }

    initializeProperties() {
        this.shape = 'isoscelesTriangle';
        this.size = this.getRandomSize();
        this.width = this.size;
        this.height = this.size;

        // Isosceles triangles support rotation
        this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, or 270 degrees
    }

    /**
     * Calculate vertices - CANONICAL SOURCE OF TRUTH
     */
    calculateVertices() {
        const halfWidth = (this.width || this.size) / 2;  // Base half-width
        const halfHeight = (this.height || this.size) / 2; // Height from center to top/bottom

        // Create isosceles triangle vertices in clockwise order
        let vertices = [
            { x: this.x, y: this.y - halfHeight },             // top apex
            { x: this.x - halfWidth, y: this.y + halfHeight }, // bottom-left
            { x: this.x + halfWidth, y: this.y + halfHeight }  // bottom-right
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
