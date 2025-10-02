import { CONFIG } from '../config.js';
import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';

/**
 * Abstract base class for all mirror types
 * Contains shared properties and behavior that all mirrors inherit
 */
export class BaseMirror {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isDragging = false;

        // Initialize shape-specific properties
        this.initializeProperties();
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    initializeProperties() {
        throw new Error('initializeProperties() must be implemented by subclass');
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    getShapeType() {
        throw new Error('getShapeType() must be implemented by subclass');
    }

    /**
     * Shared size generation logic
     */
    getRandomSize() {
        const minSize = CONFIG.MIRROR_MIN_SIZE;
        const maxSize = CONFIG.MIRROR_MAX_SIZE;
        const gridIncrement = CONFIG.GRID_SIZE;

        // For triangles, use double increment to ensure proper grid alignment
        if (this.shape === 'rightTriangle' || this.shape === 'isoscelesTriangle') {
            const triangleIncrement = gridIncrement * 2; // 40px increments
            const triangleMinSize = 40; // Start at 40 so halfSize = 20 (aligns to grid)
            const triangleMaxSize = 80; // Keep reasonable max

            const numIncrements = Math.floor((triangleMaxSize - triangleMinSize) / triangleIncrement) + 1;
            const randomIncrement = Math.floor(Math.random() * numIncrements);
            return triangleMinSize + (randomIncrement * triangleIncrement);
        }

        // For squares and rectangles, use normal increment
        const numIncrements = Math.floor((maxSize - minSize) / gridIncrement) + 1;
        const randomIncrement = Math.floor(Math.random() * numIncrements);
        return minSize + (randomIncrement * gridIncrement);
    }

    /**
     * Shared drawing method - delegates to specific shape drawing
     */
    draw(ctx) {
        ctx.save();

        // Apply rotation if the shape supports it
        if (this.rotation) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.translate(-this.x, -this.y);
        }

        // Draw the specific shape
        this.drawShape(ctx);

        ctx.restore();
    }

    /**
     * Abstract method for drawing - implemented by subclasses
     */
    drawShape(ctx) {
        throw new Error('drawShape() must be implemented by subclass');
    }

    /**
     * Shared reflection method - delegates to specific shape reflection
     */
    reflect(laser) {
        this.reflectShape(laser);
    }

    /**
     * Abstract method for reflection - implemented by subclasses
     */
    reflectShape(laser) {
        throw new Error('reflectShape() must be implemented by subclass');
    }

    /**
     * Shared drawing utilities
     */
    drawMirrorSurface(ctx, points) {
        // Add powder blue glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawMirrorBorder(ctx, points) {
        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border with glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 10;
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    /**
     * Get vertices using validation system
     */
    getVertices() {
        return MirrorPlacementValidation.getMirrorVertices(this);
    }

    /**
     * Shared reflection utility methods
     */
    reflectAcrossLine(laser, x1, y1, x2, y2) {
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

    snapLaserAngle(laser) {
        // Snap angle to 15-degree increments
        const currentAngle = Math.atan2(laser.vy, laser.vx);
        const degrees = currentAngle * 180 / Math.PI;
        const snappedDegrees = Math.round(degrees / CONFIG.ANGLE_INCREMENT) * CONFIG.ANGLE_INCREMENT;
        const snappedAngle = snappedDegrees * Math.PI / 180;

        laser.vx = Math.cos(snappedAngle) * CONFIG.LASER_SPEED;
        laser.vy = Math.sin(snappedAngle) * CONFIG.LASER_SPEED;
    }

    distanceToLineSegment(px, py, start, end) {
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
}