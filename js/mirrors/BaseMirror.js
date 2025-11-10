import { CONFIG } from '../config.js';

/**
 * Abstract base class for all mirror types
 * Contains shared properties and behavior that all mirrors inherit
 *
 * CANONICAL SOURCE OF TRUTH: this.vertices array
 * All rendering, collision, and validation use this array
 */
export class BaseMirror {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isDragging = false;

        // CANONICAL SOURCE OF TRUTH: Array of vertex coordinates
        // Format: [{x: number, y: number}, ...]
        this.vertices = [];

        // Initialize shape-specific properties
        this.initializeProperties();

        // Calculate and store vertices immediately after initialization
        this.updateVertices();
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    initializeProperties() {
        throw new Error('initializeProperties() must be implemented by subclass');
    }

    /**
     * Abstract method - must be implemented by subclasses
     * This calculates the vertices based on the mirror's position and properties
     */
    calculateVertices() {
        throw new Error('calculateVertices() must be implemented by subclass');
    }

    /**
     * Update the stored vertices (call this whenever position or rotation changes)
     */
    updateVertices() {
        this.vertices = this.calculateVertices();
    }

    /**
     * Get the canonical vertices (THE ONLY SOURCE OF TRUTH)
     * Returns the stored vertices array directly
     */
    getVertices() {
        // Simply return the stored vertices - no calculation, no external calls
        // DEBUG: This should NEVER call any other function
        if (!this.vertices) {
            console.error('getVertices called but vertices is', this.vertices, 'for mirror', this.shape);
            return [];
        }
        return this.vertices;
    }

    /**
     * Check if a point is inside this mirror's shape
     * Uses ray-casting algorithm on the canonical vertices
     * Fixed version with proper edge case handling
     */
    containsPoint(px, py) {
        if (!this.vertices || this.vertices.length < 3) {
            return false;
        }

        let inside = false;
        const n = this.vertices.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const xi = this.vertices[i].x;
            const yi = this.vertices[i].y;
            const xj = this.vertices[j].x;
            const yj = this.vertices[j].y;

            // Check if point is on a horizontal or vertical ray from the test point
            const intersect = ((yi > py) !== (yj > py)) &&
                              (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

            if (intersect) {
                inside = !inside;
            }
        }

        return inside;
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
     * Shared drawing method - uses canonical vertices
     */
    draw(ctx) {
        ctx.save();

        // Draw using the canonical vertices (no rotation transform needed - vertices are already rotated)
        this.drawMirrorSurface(ctx, this.vertices);
        this.drawMirrorBorder(ctx, this.vertices);

        ctx.restore();
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
        // Add sunset orange glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#FF6B35';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - elegant dark glass with slight gradient
        const gradient = ctx.createLinearGradient(
            points[0].x, points[0].y,
            points[points.length - 1].x, points[points.length - 1].y
        );
        gradient.addColorStop(0, '#2a2a2a');
        gradient.addColorStop(0.5, '#404040');
        gradient.addColorStop(1, '#2a2a2a');

        ctx.fillStyle = gradient;
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

        // Border with sunset glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#FF6B35';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#FF6B35';
        } else {
            ctx.strokeStyle = '#FFB627'; // Sunset gold border when not dragging
        }

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