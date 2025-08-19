// Mirror Class - Handles mirror objects with various shapes and precise collision detection
class Mirror {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isDragging = false;
        
        // Generate random shape properties
        this.generateRandomShape();
    }
    
    generateRandomShape() {
        const shapes = ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle'];
        this.shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        // Generate size in grid units (1-4 tiles)
        const gridSize = GameConfig.GRID_SIZE;
        
        switch (this.shape) {
            case 'square':
                // Square: 1x1 to 4x4 grid cells
                const squareSize = Math.floor(Math.random() * 4) + 1;
                this.width = squareSize * gridSize;
                this.height = squareSize * gridSize;
                this.orientation = 0; // No rotation needed for squares
                break;
                
            case 'rectangle':
                // Rectangle: random width/height between 1-4, but not equal
                let rectWidth = Math.floor(Math.random() * 4) + 1;
                let rectHeight = Math.floor(Math.random() * 4) + 1;
                // Ensure it's actually a rectangle, not a square
                while (rectWidth === rectHeight) {
                    rectHeight = Math.floor(Math.random() * 4) + 1;
                }
                this.width = rectWidth * gridSize;
                this.height = rectHeight * gridSize;
                // Random orientation: 0, 90, 180, 270 degrees
                this.orientation = (Math.floor(Math.random() * 4) * 90);
                break;
                
            case 'rightTriangle':
                // Right triangle: random legs between 1-4 grid cells
                const leg1 = Math.floor(Math.random() * 4) + 1;
                const leg2 = Math.floor(Math.random() * 4) + 1;
                this.width = leg1 * gridSize;
                this.height = leg2 * gridSize;
                // Random orientation: 0, 90, 180, 270 degrees
                this.orientation = (Math.floor(Math.random() * 4) * 90);
                break;
                
            case 'isoscelesTriangle':
                // Isosceles triangle: base and height between 1-4 grid cells
                const base = Math.floor(Math.random() * 4) + 1;
                const triangleHeight = Math.floor(Math.random() * 4) + 1;
                this.width = base * gridSize;
                this.height = triangleHeight * gridSize;
                // Random orientation: 0, 90, 180, 270 degrees (points up, right, down, left)
                this.orientation = (Math.floor(Math.random() * 4) * 90);
                break;
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // Move to mirror center and rotate
        ctx.translate(this.x, this.y);
        ctx.rotate((this.orientation * Math.PI) / 180);
        
        // Draw glow effect if being dragged
        if (this.isDragging) {
            ctx.shadowColor = GameConfig.COLORS.MIRROR_GLOW;
            ctx.shadowBlur = GameConfig.GLOW_SIZE;
            ctx.fillStyle = `rgba(255, 255, 0, 0.3)`;
            this.drawShapeOutline(ctx, -5); // Expanded outline for glow
            ctx.shadowBlur = 0;
        }
        
        // Draw mirror surface
        ctx.fillStyle = this.isDragging ? 
            GameConfig.COLORS.MIRROR_SURFACE_DRAGGING : 
            GameConfig.COLORS.MIRROR_SURFACE;
        this.drawShape(ctx);
        
        // Draw highlight
        ctx.fillStyle = this.isDragging ? 
            GameConfig.COLORS.MIRROR_HIGHLIGHT_DRAGGING : 
            GameConfig.COLORS.MIRROR_HIGHLIGHT;
        this.drawHighlight(ctx);
        
        // Draw frame
        ctx.strokeStyle = this.isDragging ? 
            GameConfig.COLORS.MIRROR_FRAME_DRAGGING : 
            GameConfig.COLORS.MIRROR_FRAME;
        ctx.lineWidth = this.isDragging ? 
            GameConfig.DRAG_BORDER_THICKNESS : 
            GameConfig.NORMAL_BORDER_THICKNESS;
        this.drawShapeOutline(ctx);
        
        ctx.restore();
        
        // Debug: Show collision bounds
        if (GameConfig.SHOW_COLLISION_BOUNDS) {
            const bounds = this.getBounds();
            const laserRadius = GameConfig.LASER_RADIUS;
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(
                bounds.left - laserRadius, 
                bounds.top - laserRadius, 
                bounds.right - bounds.left + laserRadius * 2, 
                bounds.bottom - bounds.top + laserRadius * 2
            );
        }
    }
    
    drawShape(ctx) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        ctx.beginPath();
        
        switch (this.shape) {
            case 'square':
            case 'rectangle':
                ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
                break;
                
            case 'rightTriangle':
                // Right triangle with right angle at bottom-left
                ctx.moveTo(-halfWidth, halfHeight);
                ctx.lineTo(halfWidth, halfHeight);
                ctx.lineTo(-halfWidth, -halfHeight);
                ctx.closePath();
                break;
                
            case 'isoscelesTriangle':
                // Isosceles triangle pointing up
                ctx.moveTo(0, -halfHeight); // Top point
                ctx.lineTo(-halfWidth, halfHeight); // Bottom left
                ctx.lineTo(halfWidth, halfHeight); // Bottom right
                ctx.closePath();
                break;
        }
        
        ctx.fill();
    }
    
    drawShapeOutline(ctx, expand = 0) {
        const halfWidth = this.width / 2 + expand;
        const halfHeight = this.height / 2 + expand;
        
        ctx.beginPath();
        
        switch (this.shape) {
            case 'square':
            case 'rectangle':
                if (expand > 0) {
                    ctx.rect(-halfWidth, -halfHeight, this.width + expand * 2, this.height + expand * 2);
                    ctx.fill();
                } else {
                    ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
                    ctx.stroke();
                }
                break;
                
            case 'rightTriangle':
                ctx.moveTo(-halfWidth, halfHeight);
                ctx.lineTo(halfWidth, halfHeight);
                ctx.lineTo(-halfWidth, -halfHeight);
                ctx.closePath();
                if (expand > 0) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
                break;
                
            case 'isoscelesTriangle':
                ctx.moveTo(0, -halfHeight);
                ctx.lineTo(-halfWidth, halfHeight);
                ctx.lineTo(halfWidth, halfHeight);
                ctx.closePath();
                if (expand > 0) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
                break;
        }
    }
    
    drawHighlight(ctx) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        switch (this.shape) {
            case 'square':
            case 'rectangle':
                // Top and left edge highlights
                ctx.fillRect(-halfWidth, -halfHeight, this.width, 4);
                ctx.fillRect(-halfWidth, -halfHeight, 4, this.height);
                break;
                
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // Simple highlight line at the top edge
                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.strokeStyle = this.isDragging ? 
                    GameConfig.COLORS.MIRROR_HIGHLIGHT_DRAGGING : 
                    GameConfig.COLORS.MIRROR_HIGHLIGHT;
                if (this.shape === 'rightTriangle') {
                    ctx.moveTo(-halfWidth, -halfHeight);
                    ctx.lineTo(-halfWidth, halfHeight);
                } else {
                    ctx.moveTo(-halfWidth, halfHeight);
                    ctx.lineTo(halfWidth, halfHeight);
                }
                ctx.stroke();
                break;
        }
    }
    
    // Get axis-aligned bounding box for collision detection
    getBounds() {
        // Calculate rotated bounding box
        const cos = Math.cos((this.orientation * Math.PI) / 180);
        const sin = Math.sin((this.orientation * Math.PI) / 180);
        
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Get all corner points
        const corners = [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight }
        ];
        
        // For triangles, adjust corners
        if (this.shape === 'rightTriangle') {
            corners[0] = { x: -halfWidth, y: halfHeight };
            corners[1] = { x: halfWidth, y: halfHeight };
            corners[2] = { x: -halfWidth, y: -halfHeight };
            corners[3] = { x: -halfWidth, y: -halfHeight }; // Duplicate point
        } else if (this.shape === 'isoscelesTriangle') {
            corners[0] = { x: 0, y: -halfHeight };
            corners[1] = { x: -halfWidth, y: halfHeight };
            corners[2] = { x: halfWidth, y: halfHeight };
            corners[3] = { x: 0, y: -halfHeight }; // Duplicate point
        }
        
        // Rotate and find min/max
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        corners.forEach(corner => {
            const rotX = corner.x * cos - corner.y * sin + this.x;
            const rotY = corner.x * sin + corner.y * cos + this.y;
            
            minX = Math.min(minX, rotX);
            maxX = Math.max(maxX, rotX);
            minY = Math.min(minY, rotY);
            maxY = Math.max(maxY, rotY);
        });
        
        return {
            left: minX,
            right: maxX,
            top: minY,
            bottom: maxY
        };
    }
    
    // Check if a point is inside this mirror (accounting for rotation and shape)
    containsPoint(x, y) {
        // Transform point to mirror's local coordinate system
        const cos = Math.cos(-(this.orientation * Math.PI) / 180);
        const sin = Math.sin(-(this.orientation * Math.PI) / 180);
        
        const localX = (x - this.x) * cos - (y - this.y) * sin;
        const localY = (x - this.x) * sin + (y - this.y) * cos;
        
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        switch (this.shape) {
            case 'square':
            case 'rectangle':
                return localX >= -halfWidth && localX <= halfWidth &&
                       localY >= -halfHeight && localY <= halfHeight;
                       
            case 'rightTriangle':
                // Right triangle with right angle at bottom-left
                return localX >= -halfWidth && localY >= -halfHeight &&
                       localX <= halfWidth && localY <= halfHeight &&
                       (localX + halfWidth) <= (halfHeight - localY) * (this.width / this.height);
                       
            case 'isoscelesTriangle':
                // Isosceles triangle pointing up
                if (localY < -halfHeight || localY > halfHeight) return false;
                const triangleWidth = (halfHeight - localY) * (this.width / this.height);
                return Math.abs(localX) <= triangleWidth / 2;
                
            default:
                return false;
        }
    }
    
    // Check if a laser (with radius) collides with this mirror
    collidesWithLaser(laserX, laserY, laserRadius = GameConfig.LASER_RADIUS) {
        const bounds = this.getBounds();
        
        // Expand bounds by laser radius for collision detection
        const expandedLeft = bounds.left - laserRadius;
        const expandedRight = bounds.right + laserRadius;
        const expandedTop = bounds.top - laserRadius;
        const expandedBottom = bounds.bottom + laserRadius;
        
        return laserX >= expandedLeft && 
               laserX <= expandedRight &&
               laserY >= expandedTop && 
               laserY <= expandedBottom;
    }
    
    
    // Get all edges of the shape in world coordinates
    getShapeEdges() {
        const cos = Math.cos((this.orientation * Math.PI) / 180);
        const sin = Math.sin((this.orientation * Math.PI) / 180);
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        let localPoints = [];
        
        switch (this.shape) {
            case 'square':
            case 'rectangle':
                localPoints = [
                    { x: -halfWidth, y: -halfHeight },
                    { x: halfWidth, y: -halfHeight },
                    { x: halfWidth, y: halfHeight },
                    { x: -halfWidth, y: halfHeight }
                ];
                break;
                
            case 'rightTriangle':
                localPoints = [
                    { x: -halfWidth, y: halfHeight },
                    { x: halfWidth, y: halfHeight },
                    { x: -halfWidth, y: -halfHeight }
                ];
                break;
                
            case 'isoscelesTriangle':
                localPoints = [
                    { x: 0, y: -halfHeight },
                    { x: -halfWidth, y: halfHeight },
                    { x: halfWidth, y: halfHeight }
                ];
                break;
        }
        
        // Transform points to world coordinates
        const worldPoints = localPoints.map(point => ({
            x: point.x * cos - point.y * sin + this.x,
            y: point.x * sin + point.y * cos + this.y
        }));
        
        // Create edges
        const edges = [];
        for (let i = 0; i < worldPoints.length; i++) {
            const p1 = worldPoints[i];
            const p2 = worldPoints[(i + 1) % worldPoints.length];
            edges.push({
                x1: p1.x, y1: p1.y,
                x2: p2.x, y2: p2.y
            });
        }
        
        return edges;
    }
}