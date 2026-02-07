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
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {boolean} isPlacementPhase - True if mirrors can be moved (before launch)
     */
    draw(ctx, isPlacementPhase = true) {
        ctx.save();

        // Draw using the canonical vertices (no rotation transform needed - vertices are already rotated)
        this.drawMirrorSurface(ctx, this.vertices, isPlacementPhase);
        this.drawMirrorBorder(ctx, this.vertices, isPlacementPhase);

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
    drawMirrorSurface(ctx, points, isPlacementPhase) {
        // Calculate center for gradient
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

        // Find bounds for gradient
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));

        // Placement phase glow - subtle pulsing to indicate movability
        if (isPlacementPhase && !this.isDragging) {
            const pulse = 0.4 + 0.2 * Math.sin(Date.now() / 400);
            ctx.shadowColor = 'rgba(200, 220, 255, ' + pulse + ')';
            ctx.shadowBlur = 12;
        } else if (this.isDragging) {
            ctx.shadowColor = '#FF6B35';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowBlur = 0;
        }

        // Silver/chrome reflective gradient - diagonal for shimmer effect
        const shimmerOffset = Math.sin(Date.now() / 600) * 0.15; // Subtle shimmer animation
        const gradient = ctx.createLinearGradient(minX, minY, maxX, maxY);

        // Silver/chrome color stops with shimmer
        gradient.addColorStop(0, '#606875');
        gradient.addColorStop(0.2 + shimmerOffset, '#8a939e');
        gradient.addColorStop(0.4, '#b8c0c8');  // Bright silver highlight
        gradient.addColorStop(0.5, '#d4dce4');  // Peak brightness
        gradient.addColorStop(0.6, '#b8c0c8');
        gradient.addColorStop(0.8 - shimmerOffset, '#8a939e');
        gradient.addColorStop(1, '#606875');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Add a subtle inner highlight for more reflective look
        ctx.globalAlpha = 0.3;
        const highlightGradient = ctx.createLinearGradient(centerX, minY, centerX, maxY);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
        highlightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = highlightGradient;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    drawMirrorBorder(ctx, points, isPlacementPhase) {
        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border styling based on state
        if (this.isDragging) {
            ctx.shadowColor = '#FF6B35';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#FF6B35';
            ctx.lineWidth = 2.5;
        } else if (isPlacementPhase) {
            // Subtle glow during placement phase
            ctx.shadowColor = 'rgba(200, 220, 255, 0.5)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#c0c8d0'; // Light silver border
            ctx.lineWidth = 2;
        } else {
            // Clean silver border after launch
            ctx.strokeStyle = '#9aa0a8';
            ctx.lineWidth = 1.5;
        }

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