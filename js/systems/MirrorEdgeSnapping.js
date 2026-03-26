/**
 * MirrorEdgeSnapping
 *
 * Two-phase edge snapping for flush mirror placement:
 *   Phase 1: Find the best matching edge pair and compute rotation delta
 *   Phase 2: After rotation is applied, compute perpendicular offset to sit flush
 *
 * Computes outward normals dynamically using polygon centers (does NOT rely
 * on consistent vertex winding order across different mirror shapes).
 *
 * Only snaps edges that are:
 *   - Nearly parallel (within ANGLE_THRESHOLD degrees)
 *   - Anti-parallel outward normals (facing each other for flush, not overlap)
 *   - Within SNAP_DISTANCE perpendicular pixels
 *   - Overlapping in the parallel direction
 */
export class MirrorEdgeSnapping {
    static SNAP_DISTANCE = 15;     // Max perpendicular distance to trigger snap (px)
    static ANGLE_THRESHOLD = 10;   // Max angle difference (degrees)

    // ── Phase 1 ──────────────────────────────────────────────────────────

    /**
     * Find the best edge pair for snapping and the rotation delta needed.
     * @returns {{ rotationDelta: number }} (degrees) or null
     */
    static findBestMatch(draggedMirror, otherMirrors) {
        const dragEdges = this.getEdges(draggedMirror);
        let best = null;
        let bestDist = Infinity;

        for (const dragEdge of dragEdges) {
            for (const other of otherMirrors) {
                if (!other.vertices || !other.vertices.length) continue;
                for (const otherEdge of this.getEdges(other)) {
                    const match = this.evaluateEdgePair(dragEdge, otherEdge);
                    if (match && Math.abs(match.perpDistance) < bestDist) {
                        bestDist = Math.abs(match.perpDistance);
                        best = match;
                    }
                }
            }
        }

        return best;
    }

    /**
     * Evaluate two edges for flush snapping potential.
     */
    static evaluateEdgePair(edgeA, edgeB) {
        const dirA = this.edgeDir(edgeA);
        const dirB = this.edgeDir(edgeB);
        const lenA = this.vecLen(dirA);
        const lenB = this.vecLen(dirB);
        if (lenA < 0.001 || lenB < 0.001) return null;

        const dAn = { x: dirA.x / lenA, y: dirA.y / lenA };
        const dBn = { x: dirB.x / lenB, y: dirB.y / lenB };

        // Check nearly parallel (|cos| close to 1)
        const dirDot = dAn.x * dBn.x + dAn.y * dBn.y;
        const angleDeg = Math.acos(Math.min(1, Math.abs(dirDot))) * 180 / Math.PI;
        if (angleDeg > this.ANGLE_THRESHOLD) return null;

        // Compute outward normals using polygon centers
        const outA = this.outwardNormal(edgeA);
        const outB = this.outwardNormal(edgeB);
        if (!outA || !outB) return null;

        // For flush contact outward normals must face each other (dot ≈ -1)
        const normalDot = outA.x * outB.x + outA.y * outB.y;
        if (normalDot > -0.3) return null;

        // Perpendicular distance from edgeA midpoint to edgeB line,
        // measured along edgeB's outward normal.
        // Positive = edgeA is outside B (correct side for flush)
        // Negative = edgeA is inside B (overlap)
        const midA = this.midpoint(edgeA);
        const diff = { x: midA.x - edgeB.start.x, y: midA.y - edgeB.start.y };
        const perpDistance = diff.x * outB.x + diff.y * outB.y;
        if (Math.abs(perpDistance) > this.SNAP_DISTANCE) return null;

        // Check overlap in the parallel direction
        if (!this.hasParallelOverlap(edgeA, edgeB, dBn, lenB)) return null;

        // Rotation delta to make edges perfectly flush.
        // For flush contact, the outward normals must face each other.
        // The actual edge DIRECTIONS can be parallel or anti-parallel depending
        // on vertex winding order — what matters is the normals.
        //
        // We want: outA after rotation aligns with -outB (faces directly at it).
        // Calculate the rotation needed to make outA = -outB.
        const outAAngle = Math.atan2(outA.y, outA.x);
        const targetAngle = Math.atan2(-outB.y, -outB.x); // direction that faces outB
        let rotationDelta = targetAngle - outAAngle;
        // Normalize to [-PI, PI]
        while (rotationDelta > Math.PI) rotationDelta -= 2 * Math.PI;
        while (rotationDelta < -Math.PI) rotationDelta += 2 * Math.PI;

        // The angle threshold was already checked above using edge directions.
        // The rotation delta should be small (within threshold) since we already
        // verified edges are nearly parallel. But verify to be safe.
        const rotDeg = rotationDelta * 180 / Math.PI;
        if (Math.abs(rotDeg) > this.ANGLE_THRESHOLD + 1) return null;

        return {
            perpDistance,
            rotationDelta: rotDeg
        };
    }

    // ── Phase 2 ──────────────────────────────────────────────────────────

    /**
     * Calculate perpendicular snap offset.
     * Call AFTER rotation has been applied so edges are exactly anti-parallel.
     * @returns {{ offsetX, offsetY, snappedEdges }} or null
     */
    static calculatePerpendicularSnap(draggedMirror, otherMirrors) {
        const dragEdges = this.getEdges(draggedMirror);
        let best = null;
        let bestDist = Infinity;

        for (const dragEdge of dragEdges) {
            for (const other of otherMirrors) {
                if (!other.vertices || !other.vertices.length) continue;
                for (const otherEdge of this.getEdges(other)) {
                    const result = this.computePerpOffset(dragEdge, otherEdge);
                    if (result && Math.abs(result.perpDistance) < bestDist) {
                        bestDist = Math.abs(result.perpDistance);
                        best = result;
                    }
                }
            }
        }

        if (!best) return null;

        // Find snapped-edge highlight segments for rendering
        const snappedEdges = this.findSnappedEdges(draggedMirror, otherMirrors, best);

        return {
            offsetX: best.offsetX,
            offsetY: best.offsetY,
            snappedEdges
        };
    }

    /**
     * Perpendicular offset for a single edge pair.
     * Places the dragged mirror on the OUTSIDE of the target polygon.
     */
    static computePerpOffset(edgeA, edgeB) {
        const dirA = this.edgeDir(edgeA);
        const dirB = this.edgeDir(edgeB);
        const lenA = this.vecLen(dirA);
        const lenB = this.vecLen(dirB);
        if (lenA < 0.001 || lenB < 0.001) return null;

        const dAn = { x: dirA.x / lenA, y: dirA.y / lenA };
        const dBn = { x: dirB.x / lenB, y: dirB.y / lenB };

        // Must be nearly parallel
        const dirDot = dAn.x * dBn.x + dAn.y * dBn.y;
        const angleDeg = Math.acos(Math.min(1, Math.abs(dirDot))) * 180 / Math.PI;
        if (angleDeg > this.ANGLE_THRESHOLD) return null;

        // Anti-parallel outward normals
        const outA = this.outwardNormal(edgeA);
        const outB = this.outwardNormal(edgeB);
        if (!outA || !outB) return null;
        const normalDot = outA.x * outB.x + outA.y * outB.y;
        if (normalDot > -0.3) return null;

        // Perpendicular distance along outB
        const midA = this.midpoint(edgeA);
        const diff = { x: midA.x - edgeB.start.x, y: midA.y - edgeB.start.y };
        const perpDistance = diff.x * outB.x + diff.y * outB.y;
        if (Math.abs(perpDistance) > this.SNAP_DISTANCE) return null;

        // Check parallel overlap
        if (!this.hasParallelOverlap(edgeA, edgeB, dBn, lenB)) return null;

        // Offset so perpDistance becomes +gap (slightly outside B)
        const gap = 0.5;
        const offsetMag = gap - perpDistance;

        return {
            offsetX: offsetMag * outB.x,
            offsetY: offsetMag * outB.y,
            perpDistance
        };
    }

    // ── Snapped-edge rendering helpers ───────────────────────────────────

    /**
     * After offset is applied, find all flush edge segments for rendering.
     */
    static findSnappedEdges(draggedMirror, otherMirrors, offset) {
        const result = [];

        const dragEdges = this.getEdges(draggedMirror).map(e => ({
            start: { x: e.start.x + offset.offsetX, y: e.start.y + offset.offsetY },
            end: { x: e.end.x + offset.offsetX, y: e.end.y + offset.offsetY },
            center: { x: e.center.x + offset.offsetX, y: e.center.y + offset.offsetY },
            oppositeVertex: e.oppositeVertex ? {
                x: e.oppositeVertex.x + offset.offsetX,
                y: e.oppositeVertex.y + offset.offsetY
            } : null
        }));

        for (const dragEdge of dragEdges) {
            for (const other of otherMirrors) {
                if (!other.vertices || !other.vertices.length) continue;
                for (const otherEdge of this.getEdges(other)) {
                    const seg = this.getFlushOverlap(dragEdge, otherEdge, 3);
                    if (seg) result.push({ segment: seg });
                }
            }
        }

        return result;
    }

    /**
     * Get the overlapping segment of two flush edges.
     * Returns [point1, point2] or null.
     */
    static getFlushOverlap(edgeA, edgeB, tolerance) {
        const dirB = this.edgeDir(edgeB);
        const lenB = this.vecLen(dirB);
        if (lenB < 0.001) return null;
        const dBn = { x: dirB.x / lenB, y: dirB.y / lenB };

        const dirA = this.edgeDir(edgeA);
        const lenA = this.vecLen(dirA);
        if (lenA < 0.001) return null;

        // Must be nearly parallel
        const dot = (dirA.x * dirB.x + dirA.y * dirB.y) / (lenA * lenB);
        if (Math.acos(Math.min(1, Math.abs(dot))) * 180 / Math.PI > this.ANGLE_THRESHOLD + 5) return null;

        // Must be close perpendicularly
        const outB = this.outwardNormal(edgeB);
        if (!outB) return null;
        const midA = this.midpoint(edgeA);
        const diff = { x: midA.x - edgeB.start.x, y: midA.y - edgeB.start.y };
        const perpDist = Math.abs(diff.x * outB.x + diff.y * outB.y);
        if (perpDist > tolerance) return null;

        // Project edgeA onto edgeB's direction to find overlap interval
        const projAStart = (edgeA.start.x - edgeB.start.x) * dBn.x + (edgeA.start.y - edgeB.start.y) * dBn.y;
        const projAEnd = (edgeA.end.x - edgeB.start.x) * dBn.x + (edgeA.end.y - edgeB.start.y) * dBn.y;
        const aMin = Math.min(projAStart, projAEnd);
        const aMax = Math.max(projAStart, projAEnd);

        const overlapStart = Math.max(aMin, 0);
        const overlapEnd = Math.min(aMax, lenB);
        if (overlapEnd - overlapStart < 1) return null;

        // Render at the midpoint between the two edges
        const halfPerp = (diff.x * outB.x + diff.y * outB.y) / 2;
        return [
            {
                x: edgeB.start.x + dBn.x * overlapStart + outB.x * halfPerp,
                y: edgeB.start.y + dBn.y * overlapStart + outB.y * halfPerp
            },
            {
                x: edgeB.start.x + dBn.x * overlapEnd + outB.x * halfPerp,
                y: edgeB.start.y + dBn.y * overlapEnd + outB.y * halfPerp
            }
        ];
    }

    // ── Geometry helpers ─────────────────────────────────────────────────

    /**
     * Extract edges from a mirror's vertices.
     * Each edge carries its polygon center and an opposite vertex
     * for robust outward-normal computation.
     */
    static getEdges(mirror) {
        const verts = mirror.vertices;
        const center = { x: mirror.x, y: mirror.y };
        const edges = [];
        for (let i = 0; i < verts.length; i++) {
            const next = (i + 1) % verts.length;
            // Pick a vertex NOT on this edge as an interior reference.
            // For a polygon with N vertices, the vertex opposite the edge
            // is a reasonable choice. Use the vertex at index (i + 2) % N
            // or any vertex that isn't start/end.
            const oppIdx = (i + 2) % verts.length;
            edges.push({
                start: verts[i],
                end: verts[next],
                center,
                oppositeVertex: verts[oppIdx]
            });
        }
        return edges;
    }

    /**
     * Compute the unit outward normal for an edge, using the polygon center
     * to determine which direction is "out". Works regardless of vertex
     * winding order.
     *
     * For degenerate cases (edge passes through center), uses the opposite
     * vertex as an interior reference point.
     */
    static outwardNormal(edge) {
        const dir = this.edgeDir(edge);
        const len = this.vecLen(dir);
        if (len < 0.001) return null;

        // Candidate normal: left normal (-dy, dx)
        const candidate = { x: -dir.y / len, y: dir.x / len };

        // Check if candidate points away from the polygon center
        const mid = this.midpoint(edge);
        const toCenter = { x: edge.center.x - mid.x, y: edge.center.y - mid.y };
        const dot = candidate.x * toCenter.x + candidate.y * toCenter.y;

        // Clear result: use standard center-based check
        if (Math.abs(dot) > 0.1) {
            return dot > 0
                ? { x: -candidate.x, y: -candidate.y }
                : candidate;
        }

        // Degenerate: edge line passes through (or very near) center.
        // Use the opposite vertex as the "inside" reference instead.
        // The opposite vertex is stored in edge.oppositeVertex if available.
        if (edge.oppositeVertex) {
            const toOpp = {
                x: edge.oppositeVertex.x - mid.x,
                y: edge.oppositeVertex.y - mid.y
            };
            const dotOpp = candidate.x * toOpp.x + candidate.y * toOpp.y;
            return dotOpp > 0
                ? { x: -candidate.x, y: -candidate.y }
                : candidate;
        }

        // Final fallback: return the candidate as-is
        return candidate;
    }

    static edgeDir(edge) {
        return { x: edge.end.x - edge.start.x, y: edge.end.y - edge.start.y };
    }

    static midpoint(edge) {
        return {
            x: (edge.start.x + edge.end.x) / 2,
            y: (edge.start.y + edge.end.y) / 2
        };
    }

    static vecLen(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    /**
     * Check whether two edges overlap when projected onto edgeB's direction.
     */
    static hasParallelOverlap(edgeA, edgeB, dBn, lenB) {
        const projAStart = (edgeA.start.x - edgeB.start.x) * dBn.x + (edgeA.start.y - edgeB.start.y) * dBn.y;
        const projAEnd = (edgeA.end.x - edgeB.start.x) * dBn.x + (edgeA.end.y - edgeB.start.y) * dBn.y;
        const aMin = Math.min(projAStart, projAEnd);
        const aMax = Math.max(projAStart, projAEnd);
        return aMax >= -5 && aMin <= lenB + 5;
    }
}
