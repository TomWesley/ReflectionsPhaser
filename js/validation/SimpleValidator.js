import { CONFIG } from '../config.js';
import { MirrorPlacementValidation } from './MirrorPlacementValidation.js';

/**
 * SimpleValidator - Only enforces TWO rules:
 * 1. No forbidden zone placement (spawner zones and center target)
 * 2. No mirror overlap
 *
 * NO grid alignment requirements!
 */
export class SimpleValidator {
    static initialized = false;

    /**
     * Ensure forbidden zones are initialized
     */
    static ensureInitialized() {
        if (!this.initialized) {
            MirrorPlacementValidation.initialize();
            this.initialized = true;
        }
    }
    /**
     * Validate a mirror against the two core rules
     * @param {Object} mirror - The mirror to validate
     * @param {Array} otherMirrors - Other mirrors to check overlap against
     * @returns {Object} - { valid: boolean, reason: string }
     */
    static validateMirror(mirror, otherMirrors = []) {
        // Ensure forbidden zones are initialized
        this.ensureInitialized();

        // Ensure mirror has vertices
        if (!mirror.vertices || mirror.vertices.length === 0) {
            return { valid: false, reason: 'Mirror has no vertices' };
        }

        // Rule 1: Check forbidden zones
        const forbiddenCheck = this.checkForbiddenZones(mirror);
        if (!forbiddenCheck.valid) {
            return forbiddenCheck;
        }

        // Rule 2: Check overlap with other mirrors
        const overlapCheck = this.checkMirrorOverlap(mirror, otherMirrors);
        if (!overlapCheck.valid) {
            return overlapCheck;
        }

        return { valid: true, reason: 'All checks passed' };
    }

    /**
     * Check if mirror overlaps with any forbidden zones
     * Checks both vertices AND edges for comprehensive coverage
     */
    static checkForbiddenZones(mirror) {
        // Check A: Are any vertices in forbidden zones?
        for (let vertex of mirror.vertices) {
            if (MirrorPlacementValidation.isPointInForbiddenZone(vertex)) {
                return { valid: false, reason: 'Mirror vertex in forbidden zone' };
            }
        }

        // Check B: Do any edges cross forbidden zones?
        const vertices = mirror.vertices;
        for (let i = 0; i < vertices.length; i++) {
            const next = (i + 1) % vertices.length;
            const edgeStart = vertices[i];
            const edgeEnd = vertices[next];

            if (MirrorPlacementValidation.doesLineIntersectForbiddenZone(edgeStart, edgeEnd)) {
                return { valid: false, reason: 'Mirror edge crosses forbidden zone' };
            }
        }

        return { valid: true };
    }

    /**
     * Check if mirror overlaps with any other mirrors
     */
    static checkMirrorOverlap(mirror, otherMirrors) {
        for (let other of otherMirrors) {
            if (!other.vertices || other.vertices.length === 0) continue;

            // Quick check: Are the centers nearly identical? (same position = definite overlap)
            const centerDist = Math.sqrt((mirror.x - other.x) ** 2 + (mirror.y - other.y) ** 2);
            if (centerDist < 5) { // Within 5 pixels = same position
                return { valid: false, reason: 'Mirror is at same position as another mirror' };
            }

            if (this.polygonsOverlap(mirror.vertices, other.vertices)) {
                return { valid: false, reason: 'Overlaps with another mirror' };
            }
        }

        return { valid: true };
    }

    /**
     * Check if two polygons overlap using Separating Axis Theorem
     */
    static polygonsOverlap(points1, points2) {
        // Quick bounding box check first
        const bounds1 = this.getBounds(points1);
        const bounds2 = this.getBounds(points2);

        if (bounds1.right < bounds2.left || bounds2.right < bounds1.left ||
            bounds1.bottom < bounds2.top || bounds2.bottom < bounds1.top) {
            return false;
        }

        // SAT test
        return this.separatingAxisTheorem(points1, points2);
    }

    static getBounds(points) {
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        return {
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys)
        };
    }

    static separatingAxisTheorem(points1, points2) {
        const polygons = [points1, points2];

        for (let p = 0; p < 2; p++) {
            const polygon = polygons[p];

            for (let i = 0; i < polygon.length; i++) {
                const p1 = polygon[i];
                const p2 = polygon[(i + 1) % polygon.length];

                // Calculate normal (perpendicular) to the edge
                const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

                // Project both polygons onto this axis
                const proj1 = this.projectPolygon(points1, normal);
                const proj2 = this.projectPolygon(points2, normal);

                // Check for separation
                if (proj1.max < proj2.min || proj2.max < proj1.min) {
                    return false; // Separating axis found
                }
            }
        }

        return true; // No separating axis found, polygons overlap
    }

    static projectPolygon(points, axis) {
        let min = Infinity;
        let max = -Infinity;

        for (const point of points) {
            const dot = point.x * axis.x + point.y * axis.y;
            min = Math.min(min, dot);
            max = Math.max(max, dot);
        }

        return { min, max };
    }
}
