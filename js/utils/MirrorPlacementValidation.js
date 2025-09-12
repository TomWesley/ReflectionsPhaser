import { CONFIG } from '../config.js';

export class MirrorPlacementValidation {
    static gridIntersections = [];
    static forbiddenZones = [];
    
    /**
     * Initialize the validation system with grid intersections and forbidden zones
     */
    static initialize() {
        this.generateGridIntersections();
        this.generateForbiddenZones();
    }
    
    /**
     * Generate all grid line intersection coordinates dynamically
     */
    static generateGridIntersections() {
        this.gridIntersections = [];
        
        const gridSize = CONFIG.GRID_SIZE;
        const maxX = CONFIG.CANVAS_WIDTH;
        const maxY = CONFIG.CANVAS_HEIGHT;
        
        for (let x = 0; x <= maxX; x += gridSize) {
            for (let y = 0; y <= maxY; y += gridSize) {
                this.gridIntersections.push({ x, y });
            }
        }
        
        console.log(`Generated ${this.gridIntersections.length} grid intersections`);
    }
    
    /**
     * Generate forbidden zones (center target area and edge margins)
     */
    static generateForbiddenZones() {
        this.forbiddenZones = [];
        
        // Center forbidden zone (circular area around target)
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const centerRadius = CONFIG.TARGET_RADIUS + 40; // Same as existing logic
        
        this.forbiddenZones.push({
            type: 'circle',
            x: centerX,
            y: centerY,
            radius: centerRadius
        });
        
        // Edge margins
        const margin = CONFIG.EDGE_MARGIN;
        
        // Left edge
        this.forbiddenZones.push({
            type: 'rectangle',
            x: 0,
            y: 0,
            width: margin,
            height: CONFIG.CANVAS_HEIGHT
        });
        
        // Right edge
        this.forbiddenZones.push({
            type: 'rectangle',
            x: CONFIG.CANVAS_WIDTH - margin,
            y: 0,
            width: margin,
            height: CONFIG.CANVAS_HEIGHT
        });
        
        // Top edge
        this.forbiddenZones.push({
            type: 'rectangle',
            x: 0,
            y: 0,
            width: CONFIG.CANVAS_WIDTH,
            height: margin
        });
        
        // Bottom edge
        this.forbiddenZones.push({
            type: 'rectangle',
            x: 0,
            y: CONFIG.CANVAS_HEIGHT - margin,
            width: CONFIG.CANVAS_WIDTH,
            height: margin
        });
    }
    
    /**
     * Get all vertex coordinates for a mirror
     */
    static getMirrorVertices(mirror) {
        const vertices = [];
        const centerX = mirror.x;
        const centerY = mirror.y;
        const rotation = (mirror.rotation || 0) * Math.PI / 180;
        
        switch (mirror.shape) {
            case 'square':
                const halfSize = mirror.size / 2;
                const squareCorners = [
                    { x: -halfSize, y: -halfSize },
                    { x: halfSize, y: -halfSize },
                    { x: halfSize, y: halfSize },
                    { x: -halfSize, y: halfSize }
                ];
                
                squareCorners.forEach(corner => {
                    const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
                    const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
                    vertices.push({
                        x: centerX + rotatedX,
                        y: centerY + rotatedY
                    });
                });
                break;
                
            case 'rectangle':
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                const rectCorners = [
                    { x: -halfWidth, y: -halfHeight },
                    { x: halfWidth, y: -halfHeight },
                    { x: halfWidth, y: halfHeight },
                    { x: -halfWidth, y: halfHeight }
                ];
                
                rectCorners.forEach(corner => {
                    const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
                    const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
                    vertices.push({
                        x: centerX + rotatedX,
                        y: centerY + rotatedY
                    });
                });
                break;
                
            case 'rightTriangle':
                const rtHalf = mirror.size / 2;
                const rtCorners = [
                    { x: -rtHalf, y: rtHalf },   // bottom-left
                    { x: rtHalf, y: rtHalf },    // bottom-right  
                    { x: rtHalf, y: -rtHalf }    // top-right
                ];
                
                rtCorners.forEach(corner => {
                    const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
                    const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
                    vertices.push({
                        x: centerX + rotatedX,
                        y: centerY + rotatedY
                    });
                });
                break;
                
            case 'isoscelesTriangle':
                const isoBaseHalf = mirror.width / 2;
                const isoHeight = mirror.height / 2;
                const isoCorners = [
                    { x: -isoBaseHalf, y: isoHeight },  // bottom-left
                    { x: isoBaseHalf, y: isoHeight },   // bottom-right
                    { x: 0, y: -isoHeight }             // top-center
                ];
                
                isoCorners.forEach(corner => {
                    const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
                    const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
                    vertices.push({
                        x: centerX + rotatedX,
                        y: centerY + rotatedY
                    });
                });
                break;
                
            case 'trapezoid':
                const trapHeight = mirror.height / 2;
                const trapBottomHalf = mirror.width / 2;
                const trapTopHalf = (mirror.topWidth || mirror.width * 0.6) / 2;
                const trapCorners = [
                    { x: -trapBottomHalf, y: trapHeight },   // bottom-left
                    { x: trapBottomHalf, y: trapHeight },    // bottom-right
                    { x: trapTopHalf, y: -trapHeight },      // top-right
                    { x: -trapTopHalf, y: -trapHeight }      // top-left
                ];
                
                trapCorners.forEach(corner => {
                    const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
                    const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
                    vertices.push({
                        x: centerX + rotatedX,
                        y: centerY + rotatedY
                    });
                });
                break;
                
            case 'parallelogram':
                const paraBaseHalf = mirror.width / 2;
                const paraHeightHalf = mirror.height / 2;
                const paraSkew = mirror.skew || 0;
                const paraCorners = [
                    { x: -paraBaseHalf - paraSkew/2, y: -paraHeightHalf },  // top-left
                    { x: paraBaseHalf - paraSkew/2, y: -paraHeightHalf },   // top-right
                    { x: paraBaseHalf + paraSkew/2, y: paraHeightHalf },    // bottom-right
                    { x: -paraBaseHalf + paraSkew/2, y: paraHeightHalf }    // bottom-left
                ];
                
                paraCorners.forEach(corner => {
                    const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
                    const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
                    vertices.push({
                        x: centerX + rotatedX,
                        y: centerY + rotatedY
                    });
                });
                break;
        }
        
        return vertices;
    }
    
    /**
     * Check if a point is in a forbidden zone
     */
    static isPointInForbiddenZone(point) {
        for (let zone of this.forbiddenZones) {
            if (zone.type === 'circle') {
                const distance = Math.sqrt(
                    (point.x - zone.x) ** 2 + (point.y - zone.y) ** 2
                );
                if (distance <= zone.radius) {
                    return true;
                }
            } else if (zone.type === 'rectangle') {
                if (point.x >= zone.x && 
                    point.x <= zone.x + zone.width &&
                    point.y >= zone.y && 
                    point.y <= zone.y + zone.height) {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Check if a point is at a grid intersection
     */
    static isPointAtGridIntersection(point, tolerance = 0.1) {
        for (let intersection of this.gridIntersections) {
            const distance = Math.sqrt(
                (point.x - intersection.x) ** 2 + (point.y - intersection.y) ** 2
            );
            if (distance <= tolerance) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if two line segments intersect
     */
    static doLinesIntersect(line1Start, line1End, line2Start, line2End) {
        const det = (line1End.x - line1Start.x) * (line2End.y - line2Start.y) - 
                   (line2End.x - line2Start.x) * (line1End.y - line1Start.y);
        
        if (det === 0) {
            return false; // Lines are parallel
        }
        
        const lambda = ((line2End.y - line2Start.y) * (line2End.x - line1Start.x) + 
                       (line2Start.x - line2End.x) * (line2End.y - line1Start.y)) / det;
        const gamma = ((line1Start.y - line1End.y) * (line2End.x - line1Start.x) + 
                      (line1End.x - line1Start.x) * (line2End.y - line1Start.y)) / det;
        
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
    
    /**
     * Check if a line segment intersects with any forbidden zone
     */
    static doesLineIntersectForbiddenZone(lineStart, lineEnd) {
        for (let zone of this.forbiddenZones) {
            if (zone.type === 'circle') {
                // Check if line intersects circle
                if (this.lineIntersectsCircle(lineStart, lineEnd, zone)) {
                    return true;
                }
            } else if (zone.type === 'rectangle') {
                // Check if line intersects rectangle
                if (this.lineIntersectsRectangle(lineStart, lineEnd, zone)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Check if line intersects circle
     */
    static lineIntersectsCircle(lineStart, lineEnd, circle) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const fx = lineStart.x - circle.x;
        const fy = lineStart.y - circle.y;
        
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - circle.radius * circle.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return false; // No intersection
        }
        
        const discriminantSqrt = Math.sqrt(discriminant);
        const t1 = (-b - discriminantSqrt) / (2 * a);
        const t2 = (-b + discriminantSqrt) / (2 * a);
        
        return (0 <= t1 && t1 <= 1) || (0 <= t2 && t2 <= 1);
    }
    
    /**
     * Check if line intersects rectangle
     */
    static lineIntersectsRectangle(lineStart, lineEnd, rect) {
        // Check intersection with each edge of the rectangle
        const rectCorners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
        ];
        
        for (let i = 0; i < rectCorners.length; i++) {
            const next = (i + 1) % rectCorners.length;
            if (this.doLinesIntersect(lineStart, lineEnd, rectCorners[i], rectCorners[next])) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Main validation function - checks if a mirror placement is valid
     */
    static isValidPlacement(mirror, existingMirrors = []) {
        const vertices = this.getMirrorVertices(mirror);
        
        // Check 1: All vertices must be at grid intersections
        for (let vertex of vertices) {
            if (!this.isPointAtGridIntersection(vertex)) {
                return { valid: false, reason: 'Vertex not at grid intersection', vertex };
            }
        }
        
        // Check 2: No vertices in forbidden zones
        for (let vertex of vertices) {
            if (this.isPointInForbiddenZone(vertex)) {
                return { valid: false, reason: 'Vertex in forbidden zone', vertex };
            }
        }
        
        // Check 3: No mirror edges intersect forbidden zones
        for (let i = 0; i < vertices.length; i++) {
            const next = (i + 1) % vertices.length;
            if (this.doesLineIntersectForbiddenZone(vertices[i], vertices[next])) {
                return { valid: false, reason: 'Edge intersects forbidden zone', edge: { start: vertices[i], end: vertices[next] } };
            }
        }
        
        // Check 4: No mirror edges intersect with other mirror edges
        for (let otherMirror of existingMirrors) {
            if (otherMirror === mirror) continue; // Skip self
            
            const otherVertices = this.getMirrorVertices(otherMirror);
            
            // Check each edge of this mirror against each edge of other mirror
            for (let i = 0; i < vertices.length; i++) {
                const next = (i + 1) % vertices.length;
                const thisEdge = { start: vertices[i], end: vertices[next] };
                
                for (let j = 0; j < otherVertices.length; j++) {
                    const otherNext = (j + 1) % otherVertices.length;
                    const otherEdge = { start: otherVertices[j], end: otherVertices[otherNext] };
                    
                    if (this.doLinesIntersect(thisEdge.start, thisEdge.end, otherEdge.start, otherEdge.end)) {
                        return { valid: false, reason: 'Edge intersects another mirror', thisEdge, otherEdge };
                    }
                }
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Find the nearest valid position for a mirror
     */
    static findNearestValidPosition(mirror, existingMirrors = []) {
        const originalX = mirror.x;
        const originalY = mirror.y;
        const searchRadius = CONFIG.GRID_SIZE * 10; // Search within 10 grid units
        const step = CONFIG.GRID_SIZE; // Move by grid increments
        
        let bestPosition = null;
        let bestDistance = Infinity;
        
        // Search in expanding circles around original position
        for (let radius = 0; radius <= searchRadius; radius += step) {
            const positions = [];
            
            if (radius === 0) {
                positions.push({ x: originalX, y: originalY });
            } else {
                // Generate positions on the perimeter of the current radius
                const circumference = 2 * Math.PI * radius;
                const numPoints = Math.max(8, Math.floor(circumference / step));
                
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i / numPoints) * 2 * Math.PI;
                    const x = originalX + radius * Math.cos(angle);
                    const y = originalY + radius * Math.sin(angle);
                    
                    // Snap to grid
                    positions.push({
                        x: Math.round(x / step) * step,
                        y: Math.round(y / step) * step
                    });
                }
            }
            
            // Test each position
            for (let pos of positions) {
                const testMirror = { ...mirror, x: pos.x, y: pos.y };
                const validation = this.isValidPlacement(testMirror, existingMirrors);
                
                if (validation.valid) {
                    const distance = Math.sqrt((pos.x - originalX) ** 2 + (pos.y - originalY) ** 2);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestPosition = pos;
                    }
                }
            }
            
            // If we found a valid position at this radius, use the closest one
            if (bestPosition) {
                break;
            }
        }
        
        return bestPosition;
    }
}