import { CONFIG } from '../config.js';

export class Mirror {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isDragging = false;
        
        // Randomly select shape and size
        this.shape = this.getRandomShape();
        this.size = this.getRandomSize();
        
        // For rectangles, define width and height
        if (this.shape === 'rectangle') {
            this.width = this.size;
            this.height = this.getRandomSize();
            // Ensure rectangle is actually rectangular
            while (this.height === this.width) {
                this.height = this.getRandomSize();
            }
        } else {
            this.width = this.size;
            this.height = this.size;
        }
        
        // For triangles, generate random rotation
        if (this.shape === 'rightTriangle' || this.shape === 'isoscelesTriangle') {
            this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, or 270 degrees
        }
    }
    
    getRandomShape() {
        const shapes = ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }
    
    getRandomSize() {
        const minSize = CONFIG.MIRROR_MIN_SIZE;
        const maxSize = CONFIG.MIRROR_MAX_SIZE;
        const gridIncrement = CONFIG.GRID_SIZE;
        
        // For triangles, use double increment to ensure proper grid alignment
        // Triangle vertices are at ±halfSize from center, so halfSize must be multiple of gridSize
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
    
    draw(ctx) {
        ctx.save();
        
        // Apply rotation for triangles
        if (this.rotation) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.translate(-this.x, -this.y);
        }
        
        // Draw based on shape
        this.drawShape(ctx);
        
        ctx.restore();
    }
    
    drawShape(ctx) {
        switch (this.shape) {
            case 'square':
                this.drawSquare(ctx);
                break;
            case 'rectangle':
                this.drawRectangle(ctx);
                break;
            case 'rightTriangle':
                this.drawRightTriangle(ctx);
                break;
            case 'isoscelesTriangle':
                this.drawIsoscelesTriangle(ctx);
                break;
        }
    }
    
    drawSquare(ctx) {
        const halfSize = this.size / 2;
        
        // Add powder blue glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }
        
        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(this.x - halfSize, this.y - halfSize, this.size, this.size);
        
        // Reset shadow for border
        ctx.shadowBlur = 0;
        
        // Border with glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 8;
        }
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - halfSize, this.y - halfSize, this.size, this.size);
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    drawRectangle(ctx) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Add powder blue glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }
        
        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(this.x - halfWidth, this.y - halfHeight, this.width, this.height);
        
        // Reset shadow for border
        ctx.shadowBlur = 0;
        
        // Border with glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 8;
        }
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - halfWidth, this.y - halfHeight, this.width, this.height);
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    drawRightTriangle(ctx) {
        const halfSize = this.size / 2;
        
        // Define triangle points (right angle at bottom-left)
        const points = [
            { x: this.x - halfSize, y: this.y + halfSize }, // bottom-left (right angle)
            { x: this.x + halfSize, y: this.y + halfSize }, // bottom-right
            { x: this.x - halfSize, y: this.y - halfSize }  // top-left
        ];
        
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
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.fill();
        
        // Reset shadow for border
        ctx.shadowBlur = 0;
        
        // Border with glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 8;
        }
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    drawIsoscelesTriangle(ctx) {
        const halfWidth = (this.width || this.size) / 2;  // Base half-width
        const halfHeight = (this.height || this.size) / 2; // Height from center to top/bottom
        
        // Define triangle points
        const points = [
            { x: this.x, y: this.y - halfHeight },           // top apex
            { x: this.x - halfWidth, y: this.y + halfHeight }, // bottom-left
            { x: this.x + halfWidth, y: this.y + halfHeight }  // bottom-right
        ];
        
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
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.fill();
        
        // Reset shadow for border
        ctx.shadowBlur = 0;
        
        // Border with glow if dragging
        if (this.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 8;
        }
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    reflect(laser) {
        switch (this.shape) {
            case 'square':
            case 'rectangle':
                this.reflectRectangle(laser);
                break;
            case 'rightTriangle':
                this.reflectTriangle(laser, 'right');
                break;
            case 'isoscelesTriangle':
                this.reflectTriangle(laser, 'isosceles');
                break;
        }
    }
    
    reflectRectangle(laser) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const relX = laser.x - this.x;
        const relY = laser.y - this.y;
        
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
        
        this.snapLaserAngle(laser);
    }
    
    reflectTriangle(laser, triangleType) {
        // Get triangle edges
        const edges = triangleType === 'right' ? 
            this.getRightTriangleEdges() : 
            this.getIsoscelesTriangleEdges();
        
        // Find which edge the laser is closest to
        let closestEdge = null;
        let minDistance = Infinity;
        
        for (const edge of edges) {
            const distance = this.distanceToLineSegment(laser.x, laser.y, edge.start, edge.end);
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
            
            this.snapLaserAngle(laser);
        }
    }
    
    getRightTriangleEdges() {
        const points = this.getRightTrianglePoints();
        return [
            { start: points[0], end: points[1] }, // bottom edge
            { start: points[1], end: points[2] }, // hypotenuse
            { start: points[2], end: points[0] }  // left edge
        ];
    }
    
    getIsoscelesTriangleEdges() {
        const points = this.getIsoscelesTrianglePoints();
        return [
            { start: points[0], end: points[1] }, // left edge
            { start: points[1], end: points[2] }, // bottom edge
            { start: points[2], end: points[0] }  // right edge
        ];
    }
    
    getRightTrianglePoints() {
        const halfSize = this.size / 2;
        let points = [
            { x: this.x - halfSize, y: this.y + halfSize }, // bottom-left (right angle)
            { x: this.x + halfSize, y: this.y + halfSize }, // bottom-right
            { x: this.x - halfSize, y: this.y - halfSize }  // top-left
        ];
        
        // Apply rotation if needed
        if (this.rotation) {
            const angle = this.rotation * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            points = points.map(p => ({
                x: this.x + (p.x - this.x) * cos - (p.y - this.y) * sin,
                y: this.y + (p.x - this.x) * sin + (p.y - this.y) * cos
            }));
        }
        
        return points;
    }
    
    getIsoscelesTrianglePoints() {
        const halfWidth = (this.width || this.size) / 2;  // Base half-width
        const halfHeight = (this.height || this.size) / 2; // Height from center to top/bottom
        let points = [
            { x: this.x, y: this.y - halfHeight },           // top apex
            { x: this.x - halfWidth, y: this.y + halfHeight }, // bottom-left
            { x: this.x + halfWidth, y: this.y + halfHeight }  // bottom-right
        ];
        
        // Apply rotation if needed
        if (this.rotation) {
            const angle = this.rotation * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            points = points.map(p => ({
                x: this.x + (p.x - this.x) * cos - (p.y - this.y) * sin,
                y: this.y + (p.x - this.x) * sin + (p.y - this.y) * cos
            }));
        }
        
        return points;
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
    
    snapLaserAngle(laser) {
        // Snap angle to 15-degree increments
        const currentAngle = Math.atan2(laser.vy, laser.vx);
        const degrees = currentAngle * 180 / Math.PI;
        const snappedDegrees = Math.round(degrees / CONFIG.ANGLE_INCREMENT) * CONFIG.ANGLE_INCREMENT;
        const snappedAngle = snappedDegrees * Math.PI / 180;
        
        laser.vx = Math.cos(snappedAngle) * CONFIG.LASER_SPEED;
        laser.vy = Math.sin(snappedAngle) * CONFIG.LASER_SPEED;
    }
}