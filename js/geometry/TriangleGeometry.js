import { CONFIG } from '../config.js';

/**
 * TriangleGeometry - Calculations specific to triangle shapes
 */
export class TriangleGeometry {
    /**
     * Get vertices for a right triangle
     */
    static getRightTrianglePoints(mirror) {
        const halfSize = mirror.size / 2;
        const rotation = mirror.rotation || 0;

        let p1, p2, p3;

        switch (rotation) {
            case 0:
                p1 = { x: mirror.x - halfSize, y: mirror.y + halfSize };
                p2 = { x: mirror.x + halfSize, y: mirror.y + halfSize };
                p3 = { x: mirror.x + halfSize, y: mirror.y - halfSize };
                break;
            case 90:
                p1 = { x: mirror.x + halfSize, y: mirror.y + halfSize };
                p2 = { x: mirror.x + halfSize, y: mirror.y - halfSize };
                p3 = { x: mirror.x - halfSize, y: mirror.y - halfSize };
                break;
            case 180:
                p1 = { x: mirror.x + halfSize, y: mirror.y - halfSize };
                p2 = { x: mirror.x - halfSize, y: mirror.y - halfSize };
                p3 = { x: mirror.x - halfSize, y: mirror.y + halfSize };
                break;
            case 270:
                p1 = { x: mirror.x - halfSize, y: mirror.y - halfSize };
                p2 = { x: mirror.x - halfSize, y: mirror.y + halfSize };
                p3 = { x: mirror.x + halfSize, y: mirror.y + halfSize };
                break;
            default:
                p1 = { x: mirror.x - halfSize, y: mirror.y + halfSize };
                p2 = { x: mirror.x + halfSize, y: mirror.y + halfSize };
                p3 = { x: mirror.x + halfSize, y: mirror.y - halfSize };
        }

        return [p1, p2, p3];
    }

    /**
     * Get vertices for an isosceles triangle
     */
    static getIsoscelesTrianglePoints(mirror) {
        const halfWidth = (mirror.width || mirror.size) / 2;
        const halfHeight = (mirror.height || mirror.size) / 2;
        const rotation = mirror.rotation || 0;

        let apex, baseLeft, baseRight;

        switch (rotation) {
            case 0:
                apex = { x: mirror.x, y: mirror.y - halfHeight };
                baseLeft = { x: mirror.x - halfWidth, y: mirror.y + halfHeight };
                baseRight = { x: mirror.x + halfWidth, y: mirror.y + halfHeight };
                break;
            case 90:
                apex = { x: mirror.x + halfHeight, y: mirror.y };
                baseLeft = { x: mirror.x - halfHeight, y: mirror.y - halfWidth };
                baseRight = { x: mirror.x - halfHeight, y: mirror.y + halfWidth };
                break;
            case 180:
                apex = { x: mirror.x, y: mirror.y + halfHeight };
                baseLeft = { x: mirror.x + halfWidth, y: mirror.y - halfHeight };
                baseRight = { x: mirror.x - halfWidth, y: mirror.y - halfHeight };
                break;
            case 270:
                apex = { x: mirror.x - halfHeight, y: mirror.y };
                baseLeft = { x: mirror.x + halfHeight, y: mirror.y + halfWidth };
                baseRight = { x: mirror.x + halfHeight, y: mirror.y - halfWidth };
                break;
            default:
                apex = { x: mirror.x, y: mirror.y - halfHeight };
                baseLeft = { x: mirror.x - halfWidth, y: mirror.y + halfHeight };
                baseRight = { x: mirror.x + halfWidth, y: mirror.y + halfHeight };
        }

        return [apex, baseLeft, baseRight];
    }

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
     * Check if point is in triangle using barycentric coordinates
     */
    static pointInTriangle(px, py, p1, p2, p3) {
        const area = 0.5 * (-p2.y * p3.x + p1.y * (-p2.x + p3.x) + p1.x * (p2.y - p3.y) + p2.x * p3.y);
        const s = 1 / (2 * area) * (p1.y * p3.x - p1.x * p3.y + (p3.y - p1.y) * px + (p1.x - p3.x) * py);
        const t = 1 / (2 * area) * (p1.x * p2.y - p1.y * p2.x + (p1.y - p2.y) * px + (p2.x - p1.x) * py);
        return s >= 0 && t >= 0 && (1 - s - t) >= 0;
    }
}
