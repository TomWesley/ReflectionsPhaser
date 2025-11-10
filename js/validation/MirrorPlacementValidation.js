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
     * Generate forbidden zones (ONLY center target area)
     * Edge boundaries are handled separately by canvas bounds checking
     */
    static generateForbiddenZones() {
        this.forbiddenZones = [];

        // ONLY forbidden zone: Center circle around target
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const centerRadius = CONFIG.TARGET_RADIUS + 40; // 50 + 40 = 90px radius

        this.forbiddenZones.push({
            type: 'circle',
            x: centerX,
            y: centerY,
            radius: centerRadius
        });

        // NOTE: Edge margins are NOT forbidden zones - mirrors can be placed near edges
        // Canvas bounds checking will prevent mirrors from going off-screen
    }
    
    /**
     * Snap a vertex to the nearest grid intersection
     */
    static snapVertexToGrid(vertex) {
        const gridSize = CONFIG.GRID_SIZE;
        return {
            x: Math.round(vertex.x / gridSize) * gridSize,
            y: Math.round(vertex.y / gridSize) * gridSize
        };
    }
    
    /**
     * Get all vertex coordinates for a mirror
     * NOW USES CANONICAL SOURCE OF TRUTH FROM MIRROR
     */
    static getMirrorVertices(mirror) {
        // Return the canonical vertices stored in the mirror
        return mirror.getVertices();
    }
    
    /**
     * Check if a point is in a forbidden zone or on game boundary edges
     */
    static isPointInForbiddenZone(point) {
        // First check: No vertices can be on the very edges of the game grid
        if (point.x <= 0 || point.x >= CONFIG.CANVAS_WIDTH || 
            point.y <= 0 || point.y >= CONFIG.CANVAS_HEIGHT) {
            return true;
        }
        
        // Second check: Standard forbidden zones
        for (let zone of this.forbiddenZones) {
            if (zone.type === 'circle') {
                const distance = Math.sqrt(
                    (point.x - zone.x) ** 2 + (point.y - zone.y) ** 2
                );
                // Point is forbidden if it's INSIDE the circle (not on the edge)
                if (distance < zone.radius) {
                    return true;
                }
            } else if (zone.type === 'rectangle') {
                // Point is forbidden if it's INSIDE or ON the rectangle edges
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
     * Check if a line segment intersects with any forbidden zone or game boundaries
     */
    static doesLineIntersectForbiddenZone(lineStart, lineEnd) {
        // First check: No lines can touch or cross the game boundary edges
        if (lineStart.x <= 0 || lineStart.x >= CONFIG.CANVAS_WIDTH || 
            lineStart.y <= 0 || lineStart.y >= CONFIG.CANVAS_HEIGHT ||
            lineEnd.x <= 0 || lineEnd.x >= CONFIG.CANVAS_WIDTH || 
            lineEnd.y <= 0 || lineEnd.y >= CONFIG.CANVAS_HEIGHT) {
            return true;
        }
        
        // Second check: Standard forbidden zones
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
     * Check if line intersects circle (crosses inside, not just touches)
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
        
        if (discriminant <= 0) {
            return false; // No intersection or just touching (tangent)
        }
        
        const discriminantSqrt = Math.sqrt(discriminant);
        const t1 = (-b - discriminantSqrt) / (2 * a);
        const t2 = (-b + discriminantSqrt) / (2 * a);
        
        // Check if line actually crosses through the circle (both endpoints outside or one inside)
        const startDistance = Math.sqrt(fx * fx + fy * fy);
        const endDistance = Math.sqrt((lineEnd.x - circle.x) ** 2 + (lineEnd.y - circle.y) ** 2);
        
        // Allow if line is tangent or both endpoints are outside and line doesn't cross
        if (startDistance >= circle.radius && endDistance >= circle.radius) {
            // Both endpoints outside - only forbidden if line passes through interior
            return (0 < t1 && t1 < 1) || (0 < t2 && t2 < 1);
        }
        
        // If one or both endpoints are inside, that's forbidden
        return startDistance < circle.radius || endDistance < circle.radius;
    }
    
    /**
     * Check if line intersects rectangle (crosses interior or touches boundary)
     */
    static lineIntersectsRectangle(lineStart, lineEnd, rect) {
        // Check if either endpoint is inside or on the rectangle boundary
        const startInside = lineStart.x >= rect.x && lineStart.x <= rect.x + rect.width &&
                           lineStart.y >= rect.y && lineStart.y <= rect.y + rect.height;
        const endInside = lineEnd.x >= rect.x && lineEnd.x <= rect.x + rect.width &&
                         lineEnd.y >= rect.y && lineEnd.y <= rect.y + rect.height;
        
        // If either endpoint is inside or on boundary, that's forbidden
        if (startInside || endInside) {
            return true;
        }
        
        // Check if line crosses through the rectangle
        const rectCorners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
        ];
        
        // Check intersection with each edge of the rectangle
        for (let i = 0; i < rectCorners.length; i++) {
            const next = (i + 1) % rectCorners.length;
            if (this.doLinesIntersect(lineStart, lineEnd, rectCorners[i], rectCorners[next])) {
                return true; // Line intersects rectangle boundary
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
        
        // Check 4: No overlap with other mirrors (comprehensive overlap detection)
        for (let otherMirror of existingMirrors) {
            if (otherMirror === mirror) continue; // Skip self
            
            const otherVertices = this.getMirrorVertices(otherMirror);
            
            // Check A: Edge intersections
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
            
            // Check B: Polygon containment (one mirror completely inside another)
            // Check if any vertex of this mirror is inside the other mirror
            for (let vertex of vertices) {
                if (this.isPointInPolygon(vertex, otherVertices)) {
                    return { valid: false, reason: 'Mirror overlaps inside another mirror', vertex };
                }
            }
            
            // Check if any vertex of other mirror is inside this mirror
            for (let otherVertex of otherVertices) {
                if (this.isPointInPolygon(otherVertex, vertices)) {
                    return { valid: false, reason: 'Another mirror overlaps inside this mirror', otherVertex };
                }
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Check if a point is inside a polygon using ray casting algorithm
     */
    static isPointInPolygon(point, polygonVertices) {
        let inside = false;
        const x = point.x;
        const y = point.y;
        
        for (let i = 0, j = polygonVertices.length - 1; i < polygonVertices.length; j = i++) {
            const xi = polygonVertices[i].x;
            const yi = polygonVertices[i].y;
            const xj = polygonVertices[j].x;
            const yj = polygonVertices[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
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