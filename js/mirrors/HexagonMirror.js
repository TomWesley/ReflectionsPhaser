import { BaseMirror } from './BaseMirror.js';

export class HexagonMirror extends BaseMirror {
    getShapeType() {
        return 'hexagon';
    }

    initializeProperties() {
        this.shape = 'hexagon';
        this.size = this.getRandomSize();
        // For hexagon, size is the radius (center to vertex distance)
        // This gives us side length = size (for regular hexagon)

        // Hexagons support rotation
        this.rotation = Math.floor(Math.random() * 6) * 60; // 0, 60, 120, 180, 240, or 300 degrees
    }

    /**
     * Calculate vertices - CANONICAL SOURCE OF TRUTH
     * Regular hexagon with 6 equal sides
     */
    calculateVertices() {
        const radius = this.size / 2;
        const vertices = [];

        // Create 6 vertices, starting from top and going clockwise
        for (let i = 0; i < 6; i++) {
            // Start at -90 degrees (top) and go clockwise
            const angle = (i * 60 - 90) * Math.PI / 180;
            vertices.push({
                x: this.x + radius * Math.cos(angle),
                y: this.y + radius * Math.sin(angle)
            });
        }

        // Apply rotation if needed
        if (this.rotation) {
            const rotAngle = this.rotation * Math.PI / 180;
            const cos = Math.cos(rotAngle);
            const sin = Math.sin(rotAngle);

            return vertices.map(v => ({
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
