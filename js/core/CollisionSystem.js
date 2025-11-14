import { CONFIG } from '../config.js';

/**
 * Centralized collision system for the game
 * Handles all collision detection with clearly defined boundaries
 */
export class CollisionSystem {
    constructor() {
        this.collisionBoundaries = new Map(); // Mirror ID -> collision boundary
        this.laserCollisionBoundaries = new Map(); // Mirror ID -> laser collision boundary
    }

    /**
     * Pre-calculate all collision boundaries when lasers are launched
     * This ensures consistent collision detection throughout the game
     */
    initializeCollisionBoundaries(mirrors) {
        console.log('Initializing collision boundaries for', mirrors.length, 'mirrors');

        this.collisionBoundaries.clear();
        this.laserCollisionBoundaries.clear();

        mirrors.forEach((mirror, index) => {
            const mirrorId = `mirror_${index}`;

            // For mirror placement: exclude borders (interior only)
            const placementBoundary = this.calculateMirrorPlacementBoundary(mirror);

            // For laser collision: include borders (full area including edges)
            const laserBoundary = this.calculateLaserCollisionBoundary(mirror);

            this.collisionBoundaries.set(mirrorId, placementBoundary);
            this.laserCollisionBoundaries.set(mirrorId, laserBoundary);
        });

        console.log('Collision boundaries initialized');
    }

    /**
     * Calculate boundary for mirror placement (excludes borders)
     * CRITICAL: Use the mirror's canonical vertices - single source of truth!
     */
    calculateMirrorPlacementBoundary(mirror) {
        const boundary = {
            type: mirror.shape,
            center: { x: mirror.x, y: mirror.y },
            rotation: mirror.rotation || 0
        };

        // USE THE CANONICAL VERTICES FROM THE MIRROR
        // This is the ONLY source of truth - what you see is what you get
        if (mirror.vertices && mirror.vertices.length > 0) {
            // Deep copy the vertices to avoid mutations
            boundary.points = mirror.vertices.map(v => ({ x: v.x, y: v.y }));
        } else if (typeof mirror.getVertices === 'function') {
            const vertices = mirror.getVertices();
            boundary.points = vertices.map(v => ({ x: v.x, y: v.y }));
        } else {
            console.error('Mirror has no vertices!', mirror);
            boundary.points = [];
        }

        return boundary;
    }

    /**
     * Calculate boundary for laser collision (includes borders)
     * Uses slightly expanded boundaries to ensure lasers can't slip through
     */
    calculateLaserCollisionBoundary(mirror) {
        const boundary = this.calculateMirrorPlacementBoundary(mirror);

        // For laser collision, we use the same boundaries but with edge detection
        boundary.edges = this.calculateEdges(boundary.points);

        return boundary;
    }

    /**
     * Calculate edges from points for laser collision
     */
    calculateEdges(points) {
        const edges = [];
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = points[(i + 1) % points.length];
            edges.push({ start, end });
        }
        return edges;
    }

    /**
     * Check if two mirrors overlap (for placement)
     */
    mirrorsOverlap(mirror1Id, mirror2Id) {
        const boundary1 = this.collisionBoundaries.get(mirror1Id);
        const boundary2 = this.collisionBoundaries.get(mirror2Id);

        if (!boundary1 || !boundary2) return false;

        // Use Separating Axis Theorem for polygon collision
        return this.polygonsOverlap(boundary1.points, boundary2.points);
    }

    /**
     * Check if laser collides with mirror
     */
    checkLaserMirrorCollision(laser, mirrorId) {
        const boundary = this.laserCollisionBoundaries.get(mirrorId);
        if (!boundary) return false;

        // Point in polygon test
        return this.pointInPolygon(laser.x, laser.y, boundary.points);
    }

    /**
     * Check if a line segment (laser path) crosses any edge of the mirror
     * This catches fast-moving lasers that might skip over thin mirrors
     */
    checkLineSegmentCrossesEdge(x1, y1, x2, y2, mirrorId) {
        const boundary = this.laserCollisionBoundaries.get(mirrorId);
        if (!boundary || !boundary.edges) return false;

        // Check if laser path intersects any mirror edge
        for (const edge of boundary.edges) {
            if (this.lineSegmentsIntersect(
                x1, y1, x2, y2,
                edge.start.x, edge.start.y, edge.end.x, edge.end.y
            )) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if two line segments intersect
     * Returns true if segments cross each other
     */
    lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        // Calculate direction of line segments
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

        // Lines are parallel if denom is 0
        if (Math.abs(denom) < 0.0001) {
            return false;
        }

        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

        // Intersection occurs if both parameters are between 0 and 1
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    /**
     * Find the exact intersection point between laser path and mirror edge
     * Returns { x, y, edge } if found, null otherwise
     */
    findExactIntersection(prevX, prevY, currentX, currentY, mirrorId) {
        const boundary = this.laserCollisionBoundaries.get(mirrorId);
        if (!boundary || !boundary.edges) return null;

        let closestIntersection = null;
        let minDistanceFromStart = Infinity;

        // Check each edge for intersection
        for (const edge of boundary.edges) {
            const intersection = this.lineSegmentIntersectionPoint(
                prevX, prevY, currentX, currentY,
                edge.start.x, edge.start.y, edge.end.x, edge.end.y
            );

            if (intersection) {
                // Calculate distance from laser's previous position
                const distSq = (intersection.x - prevX) ** 2 + (intersection.y - prevY) ** 2;

                if (distSq < minDistanceFromStart) {
                    minDistanceFromStart = distSq;
                    closestIntersection = {
                        x: intersection.x,
                        y: intersection.y,
                        edge: edge
                    };
                }
            }
        }

        return closestIntersection;
    }

    /**
     * Find intersection point of two line segments
     * Returns {x, y} if they intersect, null otherwise
     */
    lineSegmentIntersectionPoint(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

        // Lines are parallel
        if (Math.abs(denom) < 0.0001) {
            return null;
        }

        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

        // Check if intersection occurs within both line segments
        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            // Calculate intersection point
            return {
                x: x1 + ua * (x2 - x1),
                y: y1 + ua * (y2 - y1)
            };
        }

        return null;
    }

    /**
     * Find the closest edge that the laser collides with
     */
    findCollisionEdge(laser, mirrorId) {
        const boundary = this.laserCollisionBoundaries.get(mirrorId);
        if (!boundary || !boundary.edges) return null;

        let closestEdge = null;
        let minDistance = Infinity;

        for (const edge of boundary.edges) {
            const distance = this.distancePointToLineSegment(laser.x, laser.y, edge.start, edge.end);
            if (distance < minDistance) {
                minDistance = distance;
                closestEdge = edge;
            }
        }

        return closestEdge;
    }

    /**
     * Reflect laser off an edge
     * Uses proper vector reflection with correct normal orientation
     */
    reflectLaserOffEdge(laser, edge) {
        // Calculate edge vector (from start to end)
        const edgeVector = {
            x: edge.end.x - edge.start.x,
            y: edge.end.y - edge.start.y
        };

        // Normalize edge vector
        const edgeLength = Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y);
        if (edgeLength === 0) {
            console.error('Zero-length edge detected!');
            return;
        }

        const edgeNormalized = {
            x: edgeVector.x / edgeLength,
            y: edgeVector.y / edgeLength
        };

        // Calculate perpendicular normal (rotate edge 90 degrees counterclockwise)
        // We have two possible normals - need to pick the one the laser is coming FROM
        let normal = {
            x: -edgeNormalized.y,
            y: edgeNormalized.x
        };

        // Check if normal points toward the incoming laser
        // The normal should point in the direction the laser came from
        // If dot product of (incoming direction) and normal is negative, flip the normal
        const incomingDot = laser.vx * normal.x + laser.vy * normal.y;

        // If incoming velocity and normal point in same direction, flip normal
        // We want the normal to point TOWARD the incoming laser (opposite of velocity)
        if (incomingDot > 0) {
            normal.x = -normal.x;
            normal.y = -normal.y;
        }

        // Apply reflection formula: v' = v - 2(v·n)n
        const dotProduct = laser.vx * normal.x + laser.vy * normal.y;
        laser.vx = laser.vx - 2 * dotProduct * normal.x;
        laser.vy = laser.vy - 2 * dotProduct * normal.y;

        // Snap to standard angles (15-degree increments)
        this.snapLaserAngle(laser);
    }

    /**
     * Move laser to edge of mirror to prevent getting stuck inside
     */
    moveLaserToEdge(laser, mirrorId) {
        const boundary = this.laserCollisionBoundaries.get(mirrorId);
        if (!boundary) return;

        // Find closest point on polygon boundary
        let closestPoint = null;
        let minDistance = Infinity;

        for (const edge of boundary.edges) {
            const point = this.closestPointOnLineSegment(laser.x, laser.y, edge.start, edge.end);
            const distance = Math.sqrt((laser.x - point.x) ** 2 + (laser.y - point.y) ** 2);

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }

        if (closestPoint) {
            // Move laser slightly outside the mirror
            const direction = {
                x: laser.x - closestPoint.x,
                y: laser.y - closestPoint.y
            };
            const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);

            if (length > 0) {
                direction.x /= length;
                direction.y /= length;

                // Place laser 2 pixels outside the edge
                laser.x = closestPoint.x + direction.x * 2;
                laser.y = closestPoint.y + direction.y * 2;
            }
        }
    }

    // ===== UTILITY METHODS =====

    snapLaserAngle(laser) {
        const currentAngle = Math.atan2(laser.vy, laser.vx);
        const degrees = currentAngle * 180 / Math.PI;
        const snappedDegrees = Math.round(degrees / CONFIG.ANGLE_INCREMENT) * CONFIG.ANGLE_INCREMENT;
        const snappedAngle = snappedDegrees * Math.PI / 180;

        laser.vx = Math.cos(snappedAngle) * CONFIG.LASER_SPEED;
        laser.vy = Math.sin(snappedAngle) * CONFIG.LASER_SPEED;
    }

    pointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (((points[i].y > y) !== (points[j].y > y)) &&
                (x < (points[j].x - points[i].x) * (y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    polygonsOverlap(points1, points2) {
        // Simple bounding box check first
        const bounds1 = this.getBounds(points1);
        const bounds2 = this.getBounds(points2);

        // For placement, use strict inequality (exclude borders)
        if (bounds1.right < bounds2.left || bounds2.right < bounds1.left ||
            bounds1.bottom < bounds2.top || bounds2.bottom < bounds1.top) {
            return false;
        }

        // More precise SAT test if bounding boxes overlap
        return this.separatingAxisTheorem(points1, points2);
    }

    getBounds(points) {
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        return {
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys)
        };
    }

    separatingAxisTheorem(points1, points2) {
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

    projectPolygon(points, axis) {
        let min = Infinity;
        let max = -Infinity;

        for (const point of points) {
            const dot = point.x * axis.x + point.y * axis.y;
            min = Math.min(min, dot);
            max = Math.max(max, dot);
        }

        return { min, max };
    }

    distancePointToLineSegment(px, py, start, end) {
        const A = px - start.x;
        const B = py - start.y;
        const C = end.x - start.x;
        const D = end.y - start.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = start.x;
            yy = start.y;
        } else if (param > 1) {
            xx = end.x;
            yy = end.y;
        } else {
            xx = start.x + param * C;
            yy = start.y + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    closestPointOnLineSegment(px, py, start, end) {
        const A = px - start.x;
        const B = py - start.y;
        const C = end.x - start.x;
        const D = end.y - start.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        if (param < 0) {
            return { x: start.x, y: start.y };
        } else if (param > 1) {
            return { x: end.x, y: end.y };
        } else {
            return {
                x: start.x + param * C,
                y: start.y + param * D
            };
        }
    }

    rotatePoints(points, centerX, centerY, angleDegrees) {
        const angle = angleDegrees * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return points.map(point => ({
            x: centerX + (point.x - centerX) * cos - (point.y - centerY) * sin,
            y: centerY + (point.x - centerX) * sin + (point.y - centerY) * cos
        }));
    }

}