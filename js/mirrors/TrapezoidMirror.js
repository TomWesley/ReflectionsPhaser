import { BaseMirror } from './BaseMirror.js';
import { CONFIG } from '../config.js';

export class TrapezoidMirror extends BaseMirror {
    getShapeType() {
        return 'trapezoid';
    }

    initializeProperties() {
        this.shape = 'trapezoid';
        this.size = this.getRandomSize();
        this.width = this.size;  // Bottom base
        this.height = this.getRandomSize();

        // Ensure topWidth is grid-aligned and creates symmetric trapezoid
        const gridSize = CONFIG.GRID_SIZE;
        const minTopWidth = gridSize; // At least 1 grid unit
        const maxReduction = Math.floor(this.width / gridSize) * gridSize / 2; // Half of bottom width max
        const reductions = [gridSize, gridSize * 2, gridSize * 3]; // 20, 40, 60px reductions
        const validReductions = reductions.filter(r => r <= maxReduction && this.width - r >= minTopWidth);
        const reduction = validReductions[Math.floor(Math.random() * validReductions.length)] || gridSize;
        this.topWidth = this.width - reduction;

        // Trapezoids support rotation
        this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, or 270 degrees
    }

    /**
     * Calculate vertices - CANONICAL SOURCE OF TRUTH
     */
    calculateVertices() {
        const halfHeight = this.height / 2;
        const bottomHalfWidth = this.width / 2;
        const topHalfWidth = this.topWidth / 2;

        // Create trapezoid vertices in clockwise order
        let vertices = [
            { x: this.x - bottomHalfWidth, y: this.y + halfHeight },  // bottom-left
            { x: this.x + bottomHalfWidth, y: this.y + halfHeight },  // bottom-right
            { x: this.x + topHalfWidth, y: this.y - halfHeight },     // top-right
            { x: this.x - topHalfWidth, y: this.y - halfHeight }      // top-left
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
        if (closestEdge && minDistance < 5) {
            this.reflectAcrossLine(laser, closestEdge.start.x, closestEdge.start.y, closestEdge.end.x, closestEdge.end.y);
            this.snapLaserAngle(laser);
        }
    }
}
