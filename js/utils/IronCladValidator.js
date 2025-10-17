import { CONFIG } from '../config.js';
import { MirrorPlacementValidation } from './MirrorPlacementValidation.js';

/**
 * Iron-clad validation system that enforces the 3 core rules:
 * 1. Every vertex must be at a grid intersection
 * 2. No mirrors can overlap (they can touch edges but not overlap areas)
 * 3. No mirrors can overlap forbidden zones
 */
export class IronCladValidator {
    static TOLERANCE = 0.01; // Floating point tolerance

    /**
     * RULE 1: Validate that ALL vertices are exactly at grid intersections
     */
    static validateVerticesOnGrid(mirror) {
        const vertices = MirrorPlacementValidation.getMirrorVertices(mirror);
        const violations = [];

        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];

            // Check if vertex X is on a grid line
            const xRemainder = Math.abs(vertex.x % CONFIG.GRID_SIZE);
            const xOnGrid = xRemainder < this.TOLERANCE || xRemainder > (CONFIG.GRID_SIZE - this.TOLERANCE);

            // Check if vertex Y is on a grid line
            const yRemainder = Math.abs(vertex.y % CONFIG.GRID_SIZE);
            const yOnGrid = yRemainder < this.TOLERANCE || yRemainder > (CONFIG.GRID_SIZE - this.TOLERANCE);

            if (!xOnGrid || !yOnGrid) {
                violations.push({
                    vertexIndex: i,
                    vertex: vertex,
                    xOnGrid,
                    yOnGrid,
                    xRemainder,
                    yRemainder,
                    message: `Vertex ${i} at (${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)}) is NOT on grid intersection`
                });
            }
        }

        return {
            valid: violations.length === 0,
            rule: 'RULE 1: Vertices on grid intersections',
            violations
        };
    }

    /**
     * RULE 2: Validate that mirror does not overlap with any other mirror
     * Mirrors can touch edges (share boundary) but cannot overlap areas
     */
    static validateNoMirrorOverlap(mirror, allMirrors) {
        const violations = [];
        const thisVertices = MirrorPlacementValidation.getMirrorVertices(mirror);

        for (let otherMirror of allMirrors) {
            // Skip self
            if (otherMirror === mirror) continue;

            // Skip mirrors being dragged
            if (otherMirror.isDragging) continue;

            const otherVertices = MirrorPlacementValidation.getMirrorVertices(otherMirror);

            // Check A: Do any edges intersect? (crossing through each other)
            for (let i = 0; i < thisVertices.length; i++) {
                const next = (i + 1) % thisVertices.length;
                const thisEdge = { start: thisVertices[i], end: thisVertices[next] };

                for (let j = 0; j < otherVertices.length; j++) {
                    const otherNext = (j + 1) % otherVertices.length;
                    const otherEdge = { start: otherVertices[j], end: otherVertices[otherNext] };

                    if (this.doEdgesIntersect(thisEdge.start, thisEdge.end, otherEdge.start, otherEdge.end)) {
                        violations.push({
                            type: 'edge_intersection',
                            otherMirror,
                            thisEdge,
                            otherEdge,
                            message: `Mirror edge intersects with another mirror's edge`
                        });
                    }
                }
            }

            // Check B: Is any vertex of this mirror INSIDE the other mirror?
            for (let i = 0; i < thisVertices.length; i++) {
                if (this.isPointStrictlyInsidePolygon(thisVertices[i], otherVertices)) {
                    violations.push({
                        type: 'vertex_inside_other',
                        otherMirror,
                        vertex: thisVertices[i],
                        vertexIndex: i,
                        message: `Vertex ${i} is inside another mirror`
                    });
                }
            }

            // Check C: Is any vertex of other mirror INSIDE this mirror?
            for (let i = 0; i < otherVertices.length; i++) {
                if (this.isPointStrictlyInsidePolygon(otherVertices[i], thisVertices)) {
                    violations.push({
                        type: 'other_vertex_inside',
                        otherMirror,
                        vertex: otherVertices[i],
                        vertexIndex: i,
                        message: `Another mirror's vertex is inside this mirror`
                    });
                }
            }
        }

        return {
            valid: violations.length === 0,
            rule: 'RULE 2: No mirror overlap',
            violations
        };
    }

    /**
     * RULE 3: Validate that mirror does not overlap forbidden zones
     */
    static validateNoForbiddenZoneOverlap(mirror) {
        const violations = [];
        const vertices = MirrorPlacementValidation.getMirrorVertices(mirror);

        // Check A: Are any vertices in forbidden zones?
        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];

            if (MirrorPlacementValidation.isPointInForbiddenZone(vertex)) {
                violations.push({
                    type: 'vertex_in_forbidden',
                    vertex,
                    vertexIndex: i,
                    message: `Vertex ${i} at (${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)}) is in forbidden zone`
                });
            }
        }

        // Check B: Do any edges cross forbidden zones?
        for (let i = 0; i < vertices.length; i++) {
            const next = (i + 1) % vertices.length;
            const edge = { start: vertices[i], end: vertices[next] };

            if (MirrorPlacementValidation.doesLineIntersectForbiddenZone(edge.start, edge.end)) {
                violations.push({
                    type: 'edge_in_forbidden',
                    edge,
                    edgeIndex: i,
                    message: `Edge ${i} crosses forbidden zone`
                });
            }
        }

        // Check C: Is the entire mirror area in a forbidden zone? (polygon containment)
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenRadius = CONFIG.TARGET_RADIUS + 40;

        // Check if center of mirror is too close to target
        const distToCenter = Math.sqrt((mirror.x - centerX) ** 2 + (mirror.y - centerY) ** 2);

        // Get bounding box of mirror
        const xs = vertices.map(v => v.x);
        const ys = vertices.map(v => v.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const mirrorRadius = Math.max(maxX - minX, maxY - minY) / 2;

        if (distToCenter < forbiddenRadius + mirrorRadius) {
            // Check if any part of mirror overlaps with forbidden circle
            const overlap = this.polygonCircleOverlap(vertices, centerX, centerY, forbiddenRadius);
            if (overlap) {
                violations.push({
                    type: 'area_in_forbidden',
                    message: `Mirror area overlaps with center forbidden zone`
                });
            }
        }

        return {
            valid: violations.length === 0,
            rule: 'RULE 3: No forbidden zone overlap',
            violations
        };
    }

    /**
     * Master validation function - checks all 3 rules
     */
    static validateMirror(mirror, allMirrors = []) {
        const results = {
            valid: true,
            rule1: this.validateVerticesOnGrid(mirror),
            rule2: this.validateNoMirrorOverlap(mirror, allMirrors),
            rule3: this.validateNoForbiddenZoneOverlap(mirror)
        };

        results.valid = results.rule1.valid && results.rule2.valid && results.rule3.valid;

        // Collect all violations
        results.allViolations = [
            ...results.rule1.violations,
            ...results.rule2.violations,
            ...results.rule3.violations
        ];

        return results;
    }

    /**
     * Validate all mirrors in the game
     */
    static validateAllMirrors(mirrors) {
        const results = [];
        const violations = [];

        for (let i = 0; i < mirrors.length; i++) {
            const mirror = mirrors[i];

            // Skip mirrors being dragged
            if (mirror.isDragging) continue;

            const result = this.validateMirror(mirror, mirrors);
            results.push({
                mirrorIndex: i,
                mirror,
                ...result
            });

            if (!result.valid) {
                violations.push({
                    mirrorIndex: i,
                    mirror,
                    ...result
                });
            }
        }

        return {
            allValid: violations.length === 0,
            totalMirrors: mirrors.length,
            validMirrors: results.filter(r => r.valid).length,
            invalidMirrors: violations.length,
            results,
            violations
        };
    }

    /**
     * Helper: Check if two edges intersect (true intersection, not touching at endpoints)
     */
    static doEdgesIntersect(p1, p2, p3, p4) {
        const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);

        if (Math.abs(det) < this.TOLERANCE) {
            return false; // Lines are parallel or coincident
        }

        const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;

        // True intersection (not at endpoints)
        return (lambda > this.TOLERANCE && lambda < 1 - this.TOLERANCE) &&
               (gamma > this.TOLERANCE && gamma < 1 - this.TOLERANCE);
    }

    /**
     * Helper: Check if point is STRICTLY inside polygon (not on boundary)
     */
    static isPointStrictlyInsidePolygon(point, polygonVertices) {
        let inside = false;
        const x = point.x;
        const y = point.y;

        for (let i = 0, j = polygonVertices.length - 1; i < polygonVertices.length; j = i++) {
            const xi = polygonVertices[i].x;
            const yi = polygonVertices[i].y;
            const xj = polygonVertices[j].x;
            const yj = polygonVertices[j].y;

            // Check if point is on the edge (not strictly inside)
            const onEdge = this.isPointOnLineSegment(point, {x: xi, y: yi}, {x: xj, y: yj});
            if (onEdge) {
                return false; // On boundary, not strictly inside
            }

            // Ray casting for interior check
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * Helper: Check if point is on line segment
     */
    static isPointOnLineSegment(point, lineStart, lineEnd) {
        const crossProduct = (point.y - lineStart.y) * (lineEnd.x - lineStart.x) -
                            (point.x - lineStart.x) * (lineEnd.y - lineStart.y);

        if (Math.abs(crossProduct) > this.TOLERANCE) {
            return false; // Not on line
        }

        // Check if point is between endpoints
        const dotProduct = (point.x - lineStart.x) * (lineEnd.x - lineStart.x) +
                          (point.y - lineStart.y) * (lineEnd.y - lineStart.y);
        const squaredLength = (lineEnd.x - lineStart.x) ** 2 + (lineEnd.y - lineStart.y) ** 2;

        return dotProduct >= -this.TOLERANCE && dotProduct <= squaredLength + this.TOLERANCE;
    }

    /**
     * Helper: Check if polygon overlaps with circle
     */
    static polygonCircleOverlap(polygonVertices, circleX, circleY, circleRadius) {
        // Check if any vertex is inside circle
        for (let vertex of polygonVertices) {
            const dist = Math.sqrt((vertex.x - circleX) ** 2 + (vertex.y - circleY) ** 2);
            if (dist < circleRadius) {
                return true;
            }
        }

        // Check if circle center is inside polygon
        if (this.isPointStrictlyInsidePolygon({x: circleX, y: circleY}, polygonVertices)) {
            return true;
        }

        // Check if any edge intersects circle
        for (let i = 0; i < polygonVertices.length; i++) {
            const next = (i + 1) % polygonVertices.length;
            const edge = { start: polygonVertices[i], end: polygonVertices[next] };

            if (this.lineSegmentCircleIntersect(edge.start, edge.end, circleX, circleY, circleRadius)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Helper: Check if line segment intersects circle
     */
    static lineSegmentCircleIntersect(lineStart, lineEnd, circleX, circleY, circleRadius) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const fx = lineStart.x - circleX;
        const fy = lineStart.y - circleY;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - circleRadius * circleRadius;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return false; // No intersection
        }

        const discriminantSqrt = Math.sqrt(discriminant);
        const t1 = (-b - discriminantSqrt) / (2 * a);
        const t2 = (-b + discriminantSqrt) / (2 * a);

        // Check if intersection is within line segment
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) ||
               (t1 < 0 && t2 > 1); // Line segment completely crosses circle
    }

    /**
     * Generate detailed validation report for debugging
     */
    static generateReport(mirrors) {
        const validation = this.validateAllMirrors(mirrors);

        console.log('='.repeat(80));
        console.log('IRON-CLAD VALIDATION REPORT');
        console.log('='.repeat(80));
        console.log(`Total Mirrors: ${validation.totalMirrors}`);
        console.log(`Valid Mirrors: ${validation.validMirrors}`);
        console.log(`Invalid Mirrors: ${validation.invalidMirrors}`);
        console.log(`Overall Status: ${validation.allValid ? '✓ ALL VALID' : '✗ VIOLATIONS DETECTED'}`);
        console.log('='.repeat(80));

        if (validation.violations.length > 0) {
            console.log('\nVIOLATIONS DETECTED:');
            validation.violations.forEach((violation, idx) => {
                console.log(`\nMirror ${violation.mirrorIndex} (${violation.mirror.shape}):`);

                if (!violation.rule1.valid) {
                    console.log(`  ✗ RULE 1 VIOLATION: ${violation.rule1.violations.length} vertices not on grid`);
                    violation.rule1.violations.forEach(v => {
                        console.log(`    - ${v.message}`);
                    });
                }

                if (!violation.rule2.valid) {
                    console.log(`  ✗ RULE 2 VIOLATION: ${violation.rule2.violations.length} overlap issues`);
                    violation.rule2.violations.forEach(v => {
                        console.log(`    - ${v.message}`);
                    });
                }

                if (!violation.rule3.valid) {
                    console.log(`  ✗ RULE 3 VIOLATION: ${violation.rule3.violations.length} forbidden zone issues`);
                    violation.rule3.violations.forEach(v => {
                        console.log(`    - ${v.message}`);
                    });
                }
            });
        } else {
            console.log('\n✓ No violations detected - all mirrors are valid!');
        }

        console.log('='.repeat(80));

        return validation;
    }
}
