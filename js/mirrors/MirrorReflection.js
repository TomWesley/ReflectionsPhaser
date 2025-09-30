import { CONFIG } from '../config.js';

/**
 * Handles all mirror reflection logic
 * Extracted from original Mirror.js without changing behavior
 */
export class MirrorReflection {
    static reflect(mirror, laser) {
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                MirrorReflection.reflectRectangle(mirror, laser);
                break;
            case 'rightTriangle':
                MirrorReflection.reflectTriangle(mirror, laser, 'right');
                break;
            case 'isoscelesTriangle':
                MirrorReflection.reflectTriangle(mirror, laser, 'isosceles');
                break;
            case 'trapezoid':
                MirrorReflection.reflectTrapezoid(mirror, laser);
                break;
            case 'parallelogram':
                MirrorReflection.reflectParallelogram(mirror, laser);
                break;
        }
    }

    static reflectRectangle(mirror, laser) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        const relX = laser.x - mirror.x;
        const relY = laser.y - mirror.y;

        // Determine which edge is closest
        const distances = {
            left: Math.abs(relX + halfWidth),
            right: Math.abs(relX - halfWidth),
            top: Math.abs(relY + halfHeight),
            bottom: Math.abs(relY - halfHeight)
        };

        const closestEdge = Object.keys(distances).reduce((a, b) =>
            distances[a] < distances[b] ? a : b
        );

        // Reflect based on edge
        if (closestEdge === 'left' || closestEdge === 'right') {
            laser.vx = -laser.vx; // Horizontal reflection
        } else {
            laser.vy = -laser.vy; // Vertical reflection
        }

        MirrorReflection.snapLaserAngle(laser);
    }

    static reflectTriangle(mirror, laser, triangleType) {
        // Get triangle edges
        const edges = triangleType === 'right' ?
            MirrorReflection.getRightTriangleEdges(mirror) :
            MirrorReflection.getIsoscelesTriangleEdges(mirror);

        // Find which edge the laser is closest to
        let closestEdge = null;
        let minDistance = Infinity;

        for (const edge of edges) {
            const distance = MirrorReflection.distanceToLineSegment(laser.x, laser.y, edge.start, edge.end);
            if (distance < minDistance) {
                minDistance = distance;
                closestEdge = edge;
            }
        }

        if (closestEdge) {
            // Calculate reflection based on edge normal
            const edgeVector = {
                x: closestEdge.end.x - closestEdge.start.x,
                y: closestEdge.end.y - closestEdge.start.y
            };

            // Calculate normal vector (perpendicular to edge)
            const normal = {
                x: -edgeVector.y,
                y: edgeVector.x
            };

            // Normalize the normal vector
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
            normal.x /= length;
            normal.y /= length;

            // Reflect velocity vector
            const dot = laser.vx * normal.x + laser.vy * normal.y;
            laser.vx = laser.vx - 2 * dot * normal.x;
            laser.vy = laser.vy - 2 * dot * normal.y;

            MirrorReflection.snapLaserAngle(laser);
        }
    }

    static getRightTriangleEdges(mirror) {
        const points = MirrorReflection.getRightTrianglePoints(mirror);
        return [
            { start: points[0], end: points[1] }, // bottom edge
            { start: points[1], end: points[2] }, // hypotenuse
            { start: points[2], end: points[0] }  // left edge
        ];
    }

    static getIsoscelesTriangleEdges(mirror) {
        const points = MirrorReflection.getIsoscelesTrianglePoints(mirror);
        return [
            { start: points[0], end: points[1] }, // left edge
            { start: points[1], end: points[2] }, // bottom edge
            { start: points[2], end: points[0] }  // right edge
        ];
    }

    static getRightTrianglePoints(mirror) {
        const halfSize = mirror.size / 2;
        let points = [
            { x: mirror.x - halfSize, y: mirror.y + halfSize }, // bottom-left (right angle)
            { x: mirror.x + halfSize, y: mirror.y + halfSize }, // bottom-right
            { x: mirror.x - halfSize, y: mirror.y - halfSize }  // top-left
        ];

        // Apply rotation if needed
        if (mirror.rotation) {
            const angle = mirror.rotation * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            points = points.map(p => ({
                x: mirror.x + (p.x - mirror.x) * cos - (p.y - mirror.y) * sin,
                y: mirror.y + (p.x - mirror.x) * sin + (p.y - mirror.y) * cos
            }));
        }

        return points;
    }

    static getIsoscelesTrianglePoints(mirror) {
        const halfWidth = (mirror.width || mirror.size) / 2;  // Base half-width
        const halfHeight = (mirror.height || mirror.size) / 2; // Height from center to top/bottom
        let points = [
            { x: mirror.x, y: mirror.y - halfHeight },           // top apex
            { x: mirror.x - halfWidth, y: mirror.y + halfHeight }, // bottom-left
            { x: mirror.x + halfWidth, y: mirror.y + halfHeight }  // bottom-right
        ];

        // Apply rotation if needed
        if (mirror.rotation) {
            const angle = mirror.rotation * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            points = points.map(p => ({
                x: mirror.x + (p.x - mirror.x) * cos - (p.y - mirror.y) * sin,
                y: mirror.y + (p.x - mirror.x) * sin + (p.y - mirror.y) * cos
            }));
        }

        return points;
    }

    static distanceToLineSegment(px, py, start, end) {
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

    static reflectTrapezoid(mirror, laser) {
        // Get trapezoid vertices for accurate edge detection
        const vertices = [
            { x: mirror.x - mirror.width/2, y: mirror.y + mirror.height/2 },
            { x: mirror.x + mirror.width/2, y: mirror.y + mirror.height/2 },
            { x: mirror.x + (mirror.topWidth || mirror.width*0.6)/2, y: mirror.y - mirror.height/2 },
            { x: mirror.x - (mirror.topWidth || mirror.width*0.6)/2, y: mirror.y - mirror.height/2 }
        ];

        // Apply rotation if needed
        if (mirror.rotation) {
            const angle = mirror.rotation * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            vertices.forEach(vertex => {
                const tempX = vertex.x - mirror.x;
                const tempY = vertex.y - mirror.y;
                vertex.x = mirror.x + tempX * cos - tempY * sin;
                vertex.y = mirror.y + tempX * sin + tempY * cos;
            });
        }

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
            const distance = MirrorReflection.distanceToLineSegmentCoords(laser.x, laser.y, edge.x1, edge.y1, edge.x2, edge.y2);
            if (distance < minDistance) {
                minDistance = distance;
                closestEdge = edge;
            }
        });

        // Reflect across the closest edge
        if (closestEdge && minDistance < 5) {
            MirrorReflection.reflectAcrossLine(laser, closestEdge.x1, closestEdge.y1, closestEdge.x2, closestEdge.y2);
        }
    }

    static distanceToLineSegmentCoords(px, py, x1, y1, x2, y2) {
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

    static reflectAcrossLine(laser, x1, y1, x2, y2) {
        // Calculate direction vector of the line
        const lineVx = x2 - x1;
        const lineVy = y2 - y1;

        // Normalize the line direction vector
        const lineLength = Math.sqrt(lineVx * lineVx + lineVy * lineVy);
        const lineNx = lineVx / lineLength;
        const lineNy = lineVy / lineLength;

        // Calculate the normal vector (perpendicular to the line)
        const normalX = -lineNy;
        const normalY = lineNx;

        // Calculate the dot product of laser direction and normal
        const dotProduct = laser.vx * normalX + laser.vy * normalY;

        // Reflect the laser direction
        laser.vx = laser.vx - 2 * dotProduct * normalX;
        laser.vy = laser.vy - 2 * dotProduct * normalY;
    }

    static reflectParallelogram(mirror, laser) {
        // For now, just use rectangle reflection as baseline
        MirrorReflection.reflectRectangle(mirror, laser);
    }

    static snapLaserAngle(laser) {
        // Snap angle to 15-degree increments
        const currentAngle = Math.atan2(laser.vy, laser.vx);
        const degrees = currentAngle * 180 / Math.PI;
        const snappedDegrees = Math.round(degrees / CONFIG.ANGLE_INCREMENT) * CONFIG.ANGLE_INCREMENT;
        const snappedAngle = snappedDegrees * Math.PI / 180;

        laser.vx = Math.cos(snappedAngle) * CONFIG.LASER_SPEED;
        laser.vy = Math.sin(snappedAngle) * CONFIG.LASER_SPEED;
    }
}