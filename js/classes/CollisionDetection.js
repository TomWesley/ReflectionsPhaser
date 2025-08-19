// Collision Detection System - Handles precise shape-based collisions and reflections
class CollisionDetection {
    
    // Check if laser collides with mirror (without handling reflection)
    static checkCollision(mirror, laser) {
        const laserRadius = GameConfig.LASER_RADIUS;
        
        // Quick bounding box check first
        if (!mirror.collidesWithLaser(laser.x, laser.y, laserRadius)) {
            return false;
        }
        
        // For now, if it passes bounding box check, it's a collision
        // Could add more detailed shape checks here if needed
        return true;
    }
    
    // Handle reflection when collision occurs
    static handleReflection(mirror, laser) {
        const laserRadius = GameConfig.LASER_RADIUS;
        
        // Detailed shape-based collision and reflection
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                return this.handleRectangleCollision(mirror, laser);
                
            case 'rightTriangle':
                return this.handleRightTriangleCollision(mirror, laser);
                
            case 'isoscelesTriangle':
                return this.handleIsoscelesTriangleCollision(mirror, laser);
                
            default:
                return false;
        }
    }
    
    // Handle rectangle/square collisions (these were working fine)
    static handleRectangleCollision(mirror, laser) {
        const bounds = mirror.getBounds();
        const laserRadius = GameConfig.LASER_RADIUS;
        
        // Calculate distances from laser center to each edge
        const distToLeft = laser.x - bounds.left;
        const distToRight = bounds.right - laser.x;
        const distToTop = laser.y - bounds.top;
        const distToBottom = bounds.bottom - laser.y;
        
        // Find which edge the laser is closest to
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        let reflectHorizontal = false;
        let reflectVertical = false;
        
        // Determine reflection direction based on closest edge
        if (minDist === distToLeft || minDist === distToRight) {
            reflectHorizontal = true;
        }
        if (minDist === distToTop || minDist === distToBottom) {
            reflectVertical = true;
        }
        
        // Apply reflection
        if (reflectHorizontal) {
            laser.vx = -laser.vx;
        }
        if (reflectVertical) {
            laser.vy = -laser.vy;
        }
        
        // Move laser away from mirror to prevent multiple collisions
        const pushDistance = laserRadius + 1;
        if (reflectHorizontal) {
            if (distToLeft < distToRight) {
                laser.x = bounds.left - pushDistance;
            } else {
                laser.x = bounds.right + pushDistance;
            }
        }
        if (reflectVertical) {
            if (distToTop < distToBottom) {
                laser.y = bounds.top - pushDistance;
            } else {
                laser.y = bounds.bottom + pushDistance;
            }
        }
        
        this.snapLaserAngle(laser);
        return true;
    }
    
    // Handle right triangle collisions
    static handleRightTriangleCollision(mirror, laser) {
        const cos = Math.cos((mirror.orientation * Math.PI) / 180);
        const sin = Math.sin((mirror.orientation * Math.PI) / 180);
        
        // Transform laser position to mirror's local coordinate system
        const localX = (laser.x - mirror.x) * cos + (laser.y - mirror.y) * sin;
        const localY = -(laser.x - mirror.x) * sin + (laser.y - mirror.y) * cos;
        
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        const laserRadius = GameConfig.LASER_RADIUS;
        
        // Check which edge the laser hit
        // Right triangle has: base (bottom), vertical (left), hypotenuse (diagonal)
        
        // Base edge (horizontal bottom)
        if (Math.abs(localY - halfHeight) <= laserRadius && 
            localX >= -halfWidth && localX <= halfWidth) {
            laser.vy = -laser.vy;
            laser.y = mirror.y + (halfHeight + laserRadius + 1) * cos;
            this.snapLaserAngle(laser);
            return true;
        }
        
        // Vertical edge (left side)
        if (Math.abs(localX + halfWidth) <= laserRadius && 
            localY >= -halfHeight && localY <= halfHeight) {
            laser.vx = -laser.vx;
            laser.x = mirror.x - (halfWidth + laserRadius + 1) * cos;
            this.snapLaserAngle(laser);
            return true;
        }
        
        // Hypotenuse (diagonal edge) - this is the key fix
        // Line equation: x + (width/height) * y = -halfWidth + (width/height) * (-halfHeight)
        const slope = mirror.width / mirror.height;
        const lineConstant = -halfWidth - slope * halfHeight;
        const distanceToHypotenuse = Math.abs(localX + slope * localY - lineConstant) / Math.sqrt(1 + slope * slope);
        
        if (distanceToHypotenuse <= laserRadius && 
            localX >= -halfWidth && localX <= halfWidth && 
            localY >= -halfHeight && localY <= halfHeight &&
            localX + slope * localY <= lineConstant + laserRadius) {
            
            // Reflect off hypotenuse
            // Normal vector to hypotenuse: (1, slope) normalized
            const normalLength = Math.sqrt(1 + slope * slope);
            const normalX = 1 / normalLength;
            const normalY = slope / normalLength;
            
            // Transform laser velocity to local coordinates
            const localVx = laser.vx * cos + laser.vy * sin;
            const localVy = -laser.vx * sin + laser.vy * cos;
            
            // Reflect velocity off normal
            const dotProduct = localVx * normalX + localVy * normalY;
            const reflectedVx = localVx - 2 * dotProduct * normalX;
            const reflectedVy = localVy - 2 * dotProduct * normalY;
            
            // Transform back to world coordinates
            laser.vx = reflectedVx * cos - reflectedVy * sin;
            laser.vy = reflectedVx * sin + reflectedVy * cos;
            
            // Push laser away from surface
            const pushDistance = laserRadius + 2;
            laser.x += normalX * cos * pushDistance - normalY * sin * pushDistance;
            laser.y += normalX * sin * pushDistance + normalY * cos * pushDistance;
            
            this.snapLaserAngle(laser);
            return true;
        }
        
        return false;
    }
    
    // Handle isosceles triangle collisions
    static handleIsoscelesTriangleCollision(mirror, laser) {
        const cos = Math.cos((mirror.orientation * Math.PI) / 180);
        const sin = Math.sin((mirror.orientation * Math.PI) / 180);
        
        // Transform laser position to mirror's local coordinate system
        const localX = (laser.x - mirror.x) * cos + (laser.y - mirror.y) * sin;
        const localY = -(laser.x - mirror.x) * sin + (laser.y - mirror.y) * cos;
        
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        const laserRadius = GameConfig.LASER_RADIUS;
        
        // Base edge (horizontal bottom)
        if (Math.abs(localY - halfHeight) <= laserRadius && 
            localX >= -halfWidth && localX <= halfWidth) {
            laser.vy = -laser.vy;
            laser.y = mirror.y + (halfHeight + laserRadius + 1) * cos;
            this.snapLaserAngle(laser);
            return true;
        }
        
        // Left side (diagonal)
        // Line from (0, -halfHeight) to (-halfWidth, halfHeight)
        // Slope: (halfHeight - (-halfHeight)) / (-halfWidth - 0) = -height/width
        const leftSlope = mirror.height / mirror.width;
        const leftLineConstant = -halfHeight; // y-intercept when line passes through (0, -halfHeight)
        const distanceToLeft = Math.abs(-leftSlope * localX - localY + leftLineConstant) / Math.sqrt(leftSlope * leftSlope + 1);
        
        if (distanceToLeft <= laserRadius && 
            localX >= -halfWidth && localX <= 0 && 
            localY >= -halfHeight && localY <= halfHeight &&
            -leftSlope * localX - localY + leftLineConstant >= -laserRadius) {
            
            // Reflect off left side
            const normalLength = Math.sqrt(leftSlope * leftSlope + 1);
            const normalX = leftSlope / normalLength;
            const normalY = -1 / normalLength;
            
            // Transform laser velocity to local coordinates
            const localVx = laser.vx * cos + laser.vy * sin;
            const localVy = -laser.vx * sin + laser.vy * cos;
            
            // Reflect velocity off normal
            const dotProduct = localVx * normalX + localVy * normalY;
            const reflectedVx = localVx - 2 * dotProduct * normalX;
            const reflectedVy = localVy - 2 * dotProduct * normalY;
            
            // Transform back to world coordinates
            laser.vx = reflectedVx * cos - reflectedVy * sin;
            laser.vy = reflectedVx * sin + reflectedVy * cos;
            
            // Push laser away from surface
            const pushDistance = laserRadius + 2;
            laser.x += normalX * cos * pushDistance - normalY * sin * pushDistance;
            laser.y += normalX * sin * pushDistance + normalY * cos * pushDistance;
            
            this.snapLaserAngle(laser);
            return true;
        }
        
        // Right side (diagonal)
        // Line from (0, -halfHeight) to (halfWidth, halfHeight)
        // Slope: height/width
        const rightSlope = mirror.height / mirror.width;
        const rightLineConstant = -halfHeight; // y-intercept
        const distanceToRight = Math.abs(rightSlope * localX - localY + rightLineConstant) / Math.sqrt(rightSlope * rightSlope + 1);
        
        if (distanceToRight <= laserRadius && 
            localX >= 0 && localX <= halfWidth && 
            localY >= -halfHeight && localY <= halfHeight &&
            rightSlope * localX - localY + rightLineConstant >= -laserRadius) {
            
            // Reflect off right side
            const normalLength = Math.sqrt(rightSlope * rightSlope + 1);
            const normalX = -rightSlope / normalLength;
            const normalY = 1 / normalLength;
            
            // Transform laser velocity to local coordinates
            const localVx = laser.vx * cos + laser.vy * sin;
            const localVy = -laser.vx * sin + laser.vy * cos;
            
            // Reflect velocity off normal
            const dotProduct = localVx * normalX + localVy * normalY;
            const reflectedVx = localVx - 2 * dotProduct * normalX;
            const reflectedVy = localVy - 2 * dotProduct * normalY;
            
            // Transform back to world coordinates
            laser.vx = reflectedVx * cos - reflectedVy * sin;
            laser.vy = reflectedVx * sin + reflectedVy * cos;
            
            // Push laser away from surface
            const pushDistance = laserRadius + 2;
            laser.x += normalX * cos * pushDistance - normalY * sin * pushDistance;
            laser.y += normalX * sin * pushDistance + normalY * cos * pushDistance;
            
            this.snapLaserAngle(laser);
            return true;
        }
        
        return false;
    }
    
    // Snap laser angle to 15-degree increments
    static snapLaserAngle(laser) {
        const currentAngle = Math.atan2(laser.vy, laser.vx);
        const degrees = currentAngle * 180 / Math.PI;
        const snappedDegrees = Math.round(degrees / GameConfig.ANGLE_INCREMENT) * GameConfig.ANGLE_INCREMENT;
        const snappedAngle = snappedDegrees * Math.PI / 180;
        
        laser.vx = Math.cos(snappedAngle) * GameConfig.LASER_SPEED;
        laser.vy = Math.sin(snappedAngle) * GameConfig.LASER_SPEED;
    }
}