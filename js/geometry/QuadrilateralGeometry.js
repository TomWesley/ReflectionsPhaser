import { CONFIG } from '../config.js';

/**
 * QuadrilateralGeometry - Calculations for trapezoids and parallelograms
 */
export class QuadrilateralGeometry {
    /**
     * Get vertices for a trapezoid
     */
    static getTrapezoidVertices(mirror) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        const topWidth = mirror.topWidth || (mirror.width * 0.6);
        const topHalfWidth = topWidth / 2;
        const rotation = mirror.rotation || 0;

        let vertices = [];

        if (rotation === 0) {
            vertices = [
                { x: mirror.x - halfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + halfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + topHalfWidth, y: mirror.y - halfHeight },
                { x: mirror.x - topHalfWidth, y: mirror.y - halfHeight }
            ];
        } else if (rotation === 90) {
            vertices = [
                { x: mirror.x + halfHeight, y: mirror.y - halfWidth },
                { x: mirror.x + halfHeight, y: mirror.y + halfWidth },
                { x: mirror.x - halfHeight, y: mirror.y + topHalfWidth },
                { x: mirror.x - halfHeight, y: mirror.y - topHalfWidth }
            ];
        } else if (rotation === 180) {
            vertices = [
                { x: mirror.x + halfWidth, y: mirror.y - halfHeight },
                { x: mirror.x - halfWidth, y: mirror.y - halfHeight },
                { x: mirror.x - topHalfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + topHalfWidth, y: mirror.y + halfHeight }
            ];
        } else if (rotation === 270) {
            vertices = [
                { x: mirror.x - halfHeight, y: mirror.y + halfWidth },
                { x: mirror.x - halfHeight, y: mirror.y - halfWidth },
                { x: mirror.x + halfHeight, y: mirror.y - topHalfWidth },
                { x: mirror.x + halfHeight, y: mirror.y + topHalfWidth }
            ];
        }

        return vertices;
    }

    /**
     * Get vertices for a parallelogram
     */
    static getParallelogramVertices(mirror) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        const skew = mirror.skew || 20;
        const rotation = mirror.rotation || 0;

        let vertices = [];

        if (rotation === 0 || rotation === 180) {
            vertices = [
                { x: mirror.x - halfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + halfWidth, y: mirror.y + halfHeight },
                { x: mirror.x + halfWidth + skew, y: mirror.y - halfHeight },
                { x: mirror.x - halfWidth + skew, y: mirror.y - halfHeight }
            ];
        } else if (rotation === 90 || rotation === 270) {
            vertices = [
                { x: mirror.x - halfHeight, y: mirror.y - halfWidth },
                { x: mirror.x - halfHeight, y: mirror.y + halfWidth },
                { x: mirror.x + halfHeight, y: mirror.y + halfWidth + skew },
                { x: mirror.x + halfHeight, y: mirror.y - halfWidth + skew }
            ];
        }

        return vertices;
    }

    /**
     * Check if point is in trapezoid
     */
    static pointInTrapezoid(px, py, mirror) {
        const vertices = this.getTrapezoidVertices(mirror);
        return this.pointInPolygon(px, py, vertices);
    }

    /**
     * Check if point is in parallelogram
     */
    static pointInParallelogram(px, py, mirror) {
        const vertices = this.getParallelogramVertices(mirror);
        return this.pointInPolygon(px, py, vertices);
    }

    /**
     * Ray casting algorithm for point in polygon
     */
    static pointInPolygon(px, py, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            const intersect = ((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
