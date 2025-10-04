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
     */
    calculateMirrorPlacementBoundary(mirror) {
        const boundary = {
            type: mirror.shape,
            center: { x: mirror.x, y: mirror.y },
            rotation: mirror.rotation || 0
        };

        switch (mirror.shape) {
            case 'square':
                const halfSize = mirror.size / 2;
                boundary.points = [
                    { x: mirror.x - halfSize, y: mirror.y - halfSize },
                    { x: mirror.x + halfSize, y: mirror.y - halfSize },
                    { x: mirror.x + halfSize, y: mirror.y + halfSize },
                    { x: mirror.x - halfSize, y: mirror.y + halfSize }
                ];
                break;

            case 'rectangle':
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                boundary.points = [
                    { x: mirror.x - halfWidth, y: mirror.y - halfHeight },
                    { x: mirror.x + halfWidth, y: mirror.y - halfHeight },
                    { x: mirror.x + halfWidth, y: mirror.y + halfHeight },
                    { x: mirror.x - halfWidth, y: mirror.y + halfHeight }
                ];
                break;

            case 'rightTriangle':
                boundary.points = this.getRightTrianglePoints(mirror);
                break;

            case 'isoscelesTriangle':
                boundary.points = this.getIsoscelesTrianglePoints(mirror);
                break;

            case 'trapezoid':
                boundary.points = this.getTrapezoidPoints(mirror);
                break;

            case 'parallelogram':
                boundary.points = this.getParallelogramPoints(mirror);
                break;
        }

        // Apply rotation if needed
        if (mirror.rotation) {
            boundary.points = this.rotatePoints(boundary.points, mirror.x, mirror.y, mirror.rotation);
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

        // Point in polygon test with edge tolerance
        return this.pointInPolygon(laser.x, laser.y, boundary.points);
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
     */
    reflectLaserOffEdge(laser, edge) {
        // Calculate edge vector
        const edgeVector = {
            x: edge.end.x - edge.start.x,
            y: edge.end.y - edge.start.y
        };

        // Calculate normal vector (perpendicular to edge)
        const edgeLength = Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y);
        const normal = {
            x: -edgeVector.y / edgeLength,
            y: edgeVector.x / edgeLength
        };

        // Reflect velocity vector: v' = v - 2(v·n)n
        const dotProduct = laser.vx * normal.x + laser.vy * normal.y;
        laser.vx = laser.vx - 2 * dotProduct * normal.x;
        laser.vy = laser.vy - 2 * dotProduct * normal.y;

        // Snap to standard angles
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

    // ===== SHAPE-SPECIFIC POINT CALCULATIONS =====

    getRightTrianglePoints(mirror) {
        const halfSize = mirror.size / 2;
        return [
            { x: mirror.x - halfSize, y: mirror.y + halfSize }, // bottom-left
            { x: mirror.x + halfSize, y: mirror.y + halfSize }, // bottom-right
            { x: mirror.x + halfSize, y: mirror.y - halfSize }  // top-right
        ];
    }

    getIsoscelesTrianglePoints(mirror) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        return [
            { x: mirror.x - halfWidth, y: mirror.y + halfHeight }, // bottom-left
            { x: mirror.x + halfWidth, y: mirror.y + halfHeight }, // bottom-right
            { x: mirror.x, y: mirror.y - halfHeight }             // top-center
        ];
    }

    getTrapezoidPoints(mirror) {
        const halfHeight = mirror.height / 2;
        const halfBottomWidth = mirror.width / 2;
        const halfTopWidth = mirror.topWidth / 2;

        return [
            { x: mirror.x - halfBottomWidth, y: mirror.y + halfHeight }, // bottom-left
            { x: mirror.x + halfBottomWidth, y: mirror.y + halfHeight }, // bottom-right
            { x: mirror.x + halfTopWidth, y: mirror.y - halfHeight },    // top-right
            { x: mirror.x - halfTopWidth, y: mirror.y - halfHeight }     // top-left
        ];
    }

    getParallelogramPoints(mirror) {
        const halfHeight = mirror.height / 2;
        const halfWidth = mirror.width / 2;
        const skew = mirror.skew || 20;

        return [
            { x: mirror.x - halfWidth, y: mirror.y + halfHeight },         // bottom-left
            { x: mirror.x + halfWidth, y: mirror.y + halfHeight },         // bottom-right
            { x: mirror.x + halfWidth + skew, y: mirror.y - halfHeight },  // top-right (skewed)
            { x: mirror.x - halfWidth + skew, y: mirror.y - halfHeight }   // top-left (skewed)
        ];
    }
}