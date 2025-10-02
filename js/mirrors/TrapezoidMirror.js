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

    drawShape(ctx) {
        const points = this.getVertices();
        this.drawMirrorSurface(ctx, points);
        this.drawMirrorBorder(ctx, points);
    }

    reflectShape(laser) {
        // Get trapezoid vertices for accurate edge detection
        const vertices = this.getVertices();

        // Define the four edges of the trapezoid
        const edges = [
            { x1: vertices[0].x, y1: vertices[0].y, x2: vertices[1].x, y2: vertices[1].y }, // bottom edge
            { x1: vertices[1].x, y1: vertices[1].y, x2: vertices[2].x, y2: vertices[2].y }, // right edge
            { x1: vertices[2].x, y1: vertices[2].y, x2: vertices[3].x, y2: vertices[3].y }, // top edge
            { x1: vertices[3].x, y1: vertices[3].y, x2: vertices[0].x, y2: vertices[0].y }  // left edge
        ];

        // Find the closest edge to the laser position
        let closestEdge = null;
        let minDistance = Infinity;

        edges.forEach(edge => {
            const distance = this.distanceToLineSegmentCoords(laser.x, laser.y, edge.x1, edge.y1, edge.x2, edge.y2);
            if (distance < minDistance) {
                minDistance = distance;
                closestEdge = edge;
            }
        });

        // Reflect across the closest edge
        if (closestEdge && minDistance < 5) {
            this.reflectAcrossLine(laser, closestEdge.x1, closestEdge.y1, closestEdge.x2, closestEdge.y2);
        }
    }

    distanceToLineSegmentCoords(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}