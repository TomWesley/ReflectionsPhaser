import { TriangleGeometry } from './TriangleGeometry.js';
import { QuadrilateralGeometry } from './QuadrilateralGeometry.js';

/**
 * ShapeGeometry - Main entry point for all shape geometry calculations
 * Delegates to specialized geometry modules
 */
export class ShapeGeometry {
    // Triangle methods
    static getRightTrianglePoints(mirror) {
        return TriangleGeometry.getRightTrianglePoints(mirror);
    }

    static getIsoscelesTrianglePoints(mirror) {
        return TriangleGeometry.getIsoscelesTrianglePoints(mirror);
    }

    static pointInRightTriangle(px, py, mirror) {
        return TriangleGeometry.pointInRightTriangle(px, py, mirror);
    }

    static pointInIsoscelesTriangle(px, py, mirror) {
        return TriangleGeometry.pointInIsoscelesTriangle(px, py, mirror);
    }

    static pointInTriangle(px, py, p1, p2, p3) {
        return TriangleGeometry.pointInTriangle(px, py, p1, p2, p3);
    }

    // Quadrilateral methods
    static getTrapezoidVertices(mirror) {
        return QuadrilateralGeometry.getTrapezoidVertices(mirror);
    }

    static getParallelogramVertices(mirror) {
        return QuadrilateralGeometry.getParallelogramVertices(mirror);
    }

    static pointInTrapezoid(px, py, mirror) {
        return QuadrilateralGeometry.pointInTrapezoid(px, py, mirror);
    }

    static pointInParallelogram(px, py, mirror) {
        return QuadrilateralGeometry.pointInParallelogram(px, py, mirror);
    }

    static pointInPolygon(px, py, vertices) {
        return QuadrilateralGeometry.pointInPolygon(px, py, vertices);
    }

    // Utility methods
    static rotatePoint(px, py, centerX, centerY, angleDegrees) {
        const angleRadians = (angleDegrees * Math.PI) / 180;
        const cos = Math.cos(angleRadians);
        const sin = Math.sin(angleRadians);

        const translatedX = px - centerX;
        const translatedY = py - centerY;

        const rotatedX = translatedX * cos - translatedY * sin;
        const rotatedY = translatedX * sin + translatedY * cos;

        return {
            x: rotatedX + centerX,
            y: rotatedY + centerY
        };
    }
}
