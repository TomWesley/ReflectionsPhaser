import { CONFIG } from '../config.js';

/**
 * Pure geometric utility functions for shape collision detection
 * All methods are static and have no dependencies on game state
 */
export class ShapeGeometry {
    /**
     * Check if point is inside right triangle
     */
    static pointInRightTriangle(px, py, mirror) {
        const points = this.getRightTrianglePoints(mirror);
        return this.pointInTriangle(px, py, points[0], points[1], points[2]);
    }

    /**
     * Check if point is inside isosceles triangle
     */
    static pointInIsoscelesTriangle(px, py, mirror) {
        const points = this.getIsoscelesTrianglePoints(mirror);
        return this.pointInTriangle(px, py, points[0], points[1], points[2]);
    }

    /**
     * Get vertices for right triangle with rotation
     */
    static getRightTrianglePoints(mirror) {
        const halfSize = mirror.size / 2;
        let points = [
            { x: mirror.x - halfSize, y: mirror.y + halfSize }, // bottom-left (right angle)
            { x: mirror.x + halfSize, y: mirror.y + halfSize }, // bottom-right
            { x: mirror.x - halfSize, y: mirror.y - halfSize }  // top-left
        ];

        if (mirror.rotation) {
            points = points.map(p => this.rotatePoint(p.x, p.y, mirror.x, mirror.y, mirror.rotation));
        }

        return points;
    }

    /**
     * Get vertices for isosceles triangle with rotation
     */
    static getIsoscelesTrianglePoints(mirror) {
        const halfWidth = (mirror.width || mirror.size) / 2;
        const halfHeight = (mirror.height || mirror.size) / 2;

        let points = [
            { x: mirror.x, y: mirror.y - halfHeight },           // top apex
            { x: mirror.x - halfWidth, y: mirror.y + halfHeight }, // bottom-left
            { x: mirror.x + halfWidth, y: mirror.y + halfHeight }  // bottom-right
        ];

        if (mirror.rotation) {
            points = points.map(p => this.rotatePoint(p.x, p.y, mirror.x, mirror.y, mirror.rotation));
        }

        return points;
    }

    /**
     * Get vertices for trapezoid with rotation
     */
    static getTrapezoidVertices(mirror) {
        const halfHeight = mirror.height / 2;
        const bottomHalfWidth = mirror.width / 2;

        let topWidth = mirror.topWidth;
        if (!topWidth) {
            const gridSize = CONFIG.GRID_SIZE;
            const minTopWidth = gridSize;
            const maxReduction = Math.floor(mirror.width / gridSize) * gridSize / 2;
            const reductions = [gridSize, gridSize * 2, gridSize * 3];
            const validReductions = reductions.filter(r => r <= maxReduction && mirror.width - r >= minTopWidth);
            const reduction = validReductions[0] || gridSize;
            topWidth = mirror.width - reduction;
        }
        const topHalfWidth = topWidth / 2;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            return [
                { x: mirror.x - bottomHalfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + bottomHalfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + topHalfWidth, y: mirror.y - halfHeight },
                { x: mirror.x - topHalfWidth, y: mirror.y - halfHeight }
            ];
        } else if (rotation === 90 || rotation === 270) {
            return [
                { x: mirror.x - halfHeight, y: mirror.y + bottomHalfWidth },
                { x: mirror.x - halfHeight, y: mirror.y - bottomHalfWidth },
                { x: mirror.x + halfHeight, y: mirror.y - topHalfWidth },
                { x: mirror.x + halfHeight, y: mirror.y + topHalfWidth }
            ];
        }

        return [];
    }

    /**
     * Get vertices for parallelogram with rotation
     */
    static getParallelogramVertices(mirror) {
        const halfHeight = mirror.height / 2;
        const halfWidth = mirror.width / 2;
        const skew = mirror.skew || 20;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            return [
                { x: mirror.x - halfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + halfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + halfWidth + skew, y: mirror.y - halfHeight },
                { x: mirror.x - halfWidth + skew, y: mirror.y - halfHeight }
            ];
        } else if (rotation === 90 || rotation === 270) {
            return [
                { x: mirror.x - halfHeight, y: mirror.y - halfWidth },
                { x: mirror.x - halfHeight, y: mirror.y + halfWidth },
                { x: mirror.x + halfHeight, y: mirror.y + halfWidth + skew },
                { x: mirror.x + halfHeight, y: mirror.y - halfWidth + skew }
            ];
        }

        return [];
    }

    /**
     * Rotate a point around a center by angleDegrees
     */
    static rotatePoint(px, py, centerX, centerY, angleDegrees) {
        const angle = angleDegrees * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = px - centerX;
        const y = py - centerY;

        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;

        return {
            x: rotatedX + centerX,
            y: rotatedY + centerY
        };
    }

    /**
     * Check if point is inside triangle using barycentric coordinates
     */
    static pointInTriangle(px, py, p1, p2, p3) {
        const denom = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
        const a = ((p2.y - p3.y) * (px - p3.x) + (p3.x - p2.x) * (py - p3.y)) / denom;
        const b = ((p3.y - p1.y) * (px - p3.x) + (p1.x - p3.x) * (py - p3.y)) / denom;
        const c = 1 - a - b;

        return a >= 0 && b >= 0 && c >= 0;
    }

    /**
     * Check if point is inside trapezoid
     */
    static pointInTrapezoid(px, py, mirror) {
        const vertices = this.getTrapezoidVertices(mirror);
        return this.pointInPolygon(px, py, vertices);
    }

    /**
     * Check if point is inside parallelogram
     */
    static pointInParallelogram(px, py, mirror) {
        const vertices = this.getParallelogramVertices(mirror);
        return this.pointInPolygon(px, py, vertices);
    }

    /**
     * Ray casting algorithm for point-in-polygon test
     */
    static pointInPolygon(px, py, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
}
