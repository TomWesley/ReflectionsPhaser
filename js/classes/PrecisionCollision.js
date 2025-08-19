// Precision Collision Detection - Coordinate-based collision tracking
class PrecisionCollision {
    
    // Calculate how often to check collisions (1/10th of a grid tile)
    static getCollisionCheckInterval() {
        return GameConfig.GRID_SIZE / 10; // 2 pixels if grid is 20px
    }
    
    // Check collision by stepping through laser path
    static checkLaserCollision(laser, mirrors) {
        const stepSize = this.getCollisionCheckInterval();
        const speed = Math.sqrt(laser.vx * laser.vx + laser.vy * laser.vy);
        const steps = Math.ceil(speed / stepSize);
        
        // Calculate step increments
        const stepVx = laser.vx / steps;
        const stepVy = laser.vy / steps;
        
        // Check each step along the laser's path
        for (let step = 1; step <= steps; step++) {
            const checkX = laser.x + stepVx * step;
            const checkY = laser.y + stepVy * step;
            
            // Check collision with each mirror
            for (let mirror of mirrors) {
                // First do a quick bounding box check to avoid false positives
                const bounds = mirror.getBounds();
                const margin = 5; // Small margin around bounding box
                
                if (checkX >= bounds.left - margin && checkX <= bounds.right + margin &&
                    checkY >= bounds.top - margin && checkY <= bounds.bottom + margin) {
                    
                    // We're near the mirror, now do precise collision check
                    if (this.isPointInMirror(checkX, checkY, mirror)) {
                        // We hit the mirror! Get the closest edge and reflect
                        const hitInfo = this.getClosestEdgeInfo(checkX, checkY, mirror);
                        if (hitInfo) {
                            // Move laser back to just before collision
                            laser.x = checkX - stepVx;
                            laser.y = checkY - stepVy;
                            
                            this.handlePrecisionReflection(laser, mirror, hitInfo);
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    // Get distance to closest edge of mirror
    static getDistanceToMirrorEdge(x, y, mirror) {
        // Transform point to mirror's local coordinate system
        const cos = Math.cos(-(mirror.orientation * Math.PI) / 180);
        const sin = Math.sin(-(mirror.orientation * Math.PI) / 180);
        
        const localX = (x - mirror.x) * cos - (y - mirror.y) * sin;
        const localY = (x - mirror.x) * sin + (y - mirror.y) * cos;
        
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                return this.getDistanceToRectangleEdge(localX, localY, halfWidth, halfHeight);
                
            case 'rightTriangle':
                return this.getDistanceToRightTriangleEdge(localX, localY, halfWidth, halfHeight, mirror);
                
            case 'isoscelesTriangle':
                return this.getDistanceToIsoscelesTriangleEdge(localX, localY, halfWidth, halfHeight, mirror);
                
            default:
                return Infinity;
        }
    }
    
    static getDistanceToRectangleEdge(localX, localY, halfWidth, halfHeight) {
        const distToLeft = Math.abs(localX + halfWidth);
        const distToRight = Math.abs(localX - halfWidth);
        const distToTop = Math.abs(localY + halfHeight);
        const distToBottom = Math.abs(localY - halfHeight);
        
        return Math.min(distToLeft, distToRight, distToTop, distToBottom);
    }
    
    static getDistanceToRightTriangleEdge(localX, localY, halfWidth, halfHeight, mirror) {
        // Distance to base (bottom edge)
        const distToBase = Math.abs(localY - halfHeight);
        
        // Distance to vertical edge (left side)
        const distToVertical = Math.abs(localX + halfWidth);
        
        // Distance to hypotenuse
        // Line equation: x = -halfWidth + (width/height) * (y + halfHeight)
        const lineX = -halfWidth + (mirror.width / mirror.height) * (localY + halfHeight);
        const distToHypotenuse = Math.abs(localX - lineX) / Math.sqrt(1 + Math.pow(mirror.width / mirror.height, 2));
        
        return Math.min(distToBase, distToVertical, distToHypotenuse);
    }
    
    static getDistanceToIsoscelesTriangleEdge(localX, localY, halfWidth, halfHeight, mirror) {
        // Distance to base (bottom edge)
        const distToBase = Math.abs(localY - halfHeight);
        
        // Distance to left side
        const leftSlope = mirror.height / halfWidth;
        const leftLineY = -halfHeight + leftSlope * (localX + halfWidth);
        const distToLeft = Math.abs(localY - leftLineY) / Math.sqrt(1 + leftSlope * leftSlope);
        
        // Distance to right side
        const rightLineY = -halfHeight + leftSlope * (halfWidth - localX);
        const distToRight = Math.abs(localY - rightLineY) / Math.sqrt(1 + leftSlope * leftSlope);
        
        return Math.min(distToBase, distToLeft, distToRight);
    }
    
    // Get info about the closest edge to a point
    static getClosestEdgeInfo(x, y, mirror) {
        // Transform point to mirror's local coordinate system
        const cos = Math.cos(-(mirror.orientation * Math.PI) / 180);
        const sin = Math.sin(-(mirror.orientation * Math.PI) / 180);
        
        const localX = (x - mirror.x) * cos - (y - mirror.y) * sin;
        const localY = (x - mirror.x) * sin + (y - mirror.y) * cos;
        
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                return this.getClosestRectangleEdge(localX, localY, halfWidth, halfHeight, mirror);
                
            case 'rightTriangle':
                return this.getClosestRightTriangleEdge(localX, localY, halfWidth, halfHeight, mirror);
                
            case 'isoscelesTriangle':
                return this.getClosestIsoscelesTriangleEdge(localX, localY, halfWidth, halfHeight, mirror);
                
            default:
                return null;
        }
    }
    
    static getClosestRectangleEdge(localX, localY, halfWidth, halfHeight, mirror) {
        const distToLeft = Math.abs(localX + halfWidth);
        const distToRight = Math.abs(localX - halfWidth);
        const distToTop = Math.abs(localY + halfHeight);
        const distToBottom = Math.abs(localY - halfHeight);
        
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        if (minDist === distToLeft) {
            return { edge: 'left', angle: (270 + mirror.orientation) % 360 };
        } else if (minDist === distToRight) {
            return { edge: 'right', angle: (90 + mirror.orientation) % 360 };
        } else if (minDist === distToTop) {
            return { edge: 'top', angle: (0 + mirror.orientation) % 360 };
        } else {
            return { edge: 'bottom', angle: (180 + mirror.orientation) % 360 };
        }
    }
    
    static getClosestRightTriangleEdge(localX, localY, halfWidth, halfHeight, mirror) {
        const distToBase = Math.abs(localY - halfHeight);
        const distToVertical = Math.abs(localX + halfWidth);
        
        // Distance to hypotenuse
        const lineX = -halfWidth + (mirror.width / mirror.height) * (localY + halfHeight);
        const distToHypotenuse = Math.abs(localX - lineX) / Math.sqrt(1 + Math.pow(mirror.width / mirror.height, 2));
        
        const minDist = Math.min(distToBase, distToVertical, distToHypotenuse);
        
        if (minDist === distToBase) {
            return { edge: 'base', angle: (180 + mirror.orientation) % 360 };
        } else if (minDist === distToVertical) {
            return { edge: 'vertical', angle: (270 + mirror.orientation) % 360 };
        } else {
            // Hypotenuse
            const hypotenuseAngle = Math.atan2(mirror.height, mirror.width) * 180 / Math.PI;
            return { 
                edge: 'hypotenuse', 
                angle: (90 + hypotenuseAngle + mirror.orientation) % 360 
            };
        }
    }
    
    static getClosestIsoscelesTriangleEdge(localX, localY, halfWidth, halfHeight, mirror) {
        const distToBase = Math.abs(localY - halfHeight);
        
        const leftSlope = mirror.height / halfWidth;
        const leftLineY = -halfHeight + leftSlope * (localX + halfWidth);
        const distToLeft = Math.abs(localY - leftLineY) / Math.sqrt(1 + leftSlope * leftSlope);
        
        const rightLineY = -halfHeight + leftSlope * (halfWidth - localX);
        const distToRight = Math.abs(localY - rightLineY) / Math.sqrt(1 + leftSlope * leftSlope);
        
        const minDist = Math.min(distToBase, distToLeft, distToRight);
        
        if (minDist === distToBase) {
            return { edge: 'base', angle: (180 + mirror.orientation) % 360 };
        } else if (minDist === distToLeft) {
            const leftSideAngle = Math.atan2(mirror.height, halfWidth) * 180 / Math.PI;
            return { 
                edge: 'leftSide', 
                angle: (270 - leftSideAngle + mirror.orientation) % 360 
            };
        } else {
            const rightSideAngle = Math.atan2(mirror.height, halfWidth) * 180 / Math.PI;
            return { 
                edge: 'rightSide', 
                angle: (90 + rightSideAngle + mirror.orientation) % 360 
            };
        }
    }
    
    // Check if a point is inside a mirror shape
    static isPointInMirror(x, y, mirror) {
        // Transform point to mirror's local coordinate system
        const cos = Math.cos(-(mirror.orientation * Math.PI) / 180);
        const sin = Math.sin(-(mirror.orientation * Math.PI) / 180);
        
        const localX = (x - mirror.x) * cos - (y - mirror.y) * sin;
        const localY = (x - mirror.x) * sin + (y - mirror.y) * cos;
        
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                return localX >= -halfWidth && localX <= halfWidth &&
                       localY >= -halfHeight && localY <= halfHeight;
                       
            case 'rightTriangle':
                // Right triangle with right angle at bottom-left
                if (localX < -halfWidth || localX > halfWidth || 
                    localY < -halfHeight || localY > halfHeight) {
                    return false;
                }
                // Check if point is above the hypotenuse line
                // Line equation: x = -halfWidth + (width/height) * (y + halfHeight)
                const rightTriangleX = -halfWidth + (mirror.width / mirror.height) * (localY + halfHeight);
                return localX <= rightTriangleX;
                
            case 'isoscelesTriangle':
                // Isosceles triangle pointing up
                if (localY < -halfHeight || localY > halfHeight) {
                    return false;
                }
                // Calculate the width at this height
                const triangleWidthAtY = mirror.width * (halfHeight - localY) / mirror.height;
                return Math.abs(localX) <= triangleWidthAtY / 2;
                
            default:
                return false;
        }
    }
    
    // Get collision information (which edge was hit and its angle)
    static getCollisionInfo(x, y, mirror, laser) {
        // Transform point to mirror's local coordinate system
        const cos = Math.cos(-(mirror.orientation * Math.PI) / 180);
        const sin = Math.sin(-(mirror.orientation * Math.PI) / 180);
        
        const localX = (x - mirror.x) * cos - (y - mirror.y) * sin;
        const localY = (x - mirror.x) * sin + (y - mirror.y) * cos;
        
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        const tolerance = 2; // pixels
        
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                return this.getRectangleCollisionInfo(localX, localY, halfWidth, halfHeight, mirror, tolerance);
                
            case 'rightTriangle':
                return this.getRightTriangleCollisionInfo(localX, localY, halfWidth, halfHeight, mirror, tolerance);
                
            case 'isoscelesTriangle':
                return this.getIsoscelesTriangleCollisionInfo(localX, localY, halfWidth, halfHeight, mirror, tolerance);
                
            default:
                return null;
        }
    }
    
    static getRectangleCollisionInfo(localX, localY, halfWidth, halfHeight, mirror, tolerance) {
        // Check which edge is closest
        const distToLeft = Math.abs(localX + halfWidth);
        const distToRight = Math.abs(localX - halfWidth);
        const distToTop = Math.abs(localY + halfHeight);
        const distToBottom = Math.abs(localY - halfHeight);
        
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        if (minDist <= tolerance) {
            if (minDist === distToLeft) {
                return { edge: 'left', angle: (270 + mirror.orientation) % 360 };
            } else if (minDist === distToRight) {
                return { edge: 'right', angle: (90 + mirror.orientation) % 360 };
            } else if (minDist === distToTop) {
                return { edge: 'top', angle: (0 + mirror.orientation) % 360 };
            } else {
                return { edge: 'bottom', angle: (180 + mirror.orientation) % 360 };
            }
        }
        
        return null;
    }
    
    static getRightTriangleCollisionInfo(localX, localY, halfWidth, halfHeight, mirror, tolerance) {
        // Check base (bottom edge)
        if (Math.abs(localY - halfHeight) <= tolerance && 
            localX >= -halfWidth && localX <= halfWidth) {
            return { edge: 'base', angle: (180 + mirror.orientation) % 360 };
        }
        
        // Check vertical edge (left side)
        if (Math.abs(localX + halfWidth) <= tolerance && 
            localY >= -halfHeight && localY <= halfHeight) {
            return { edge: 'vertical', angle: (270 + mirror.orientation) % 360 };
        }
        
        // Check hypotenuse (diagonal edge)
        // Line equation: x = -halfWidth + (width/height) * (y + halfHeight)
        const lineX = -halfWidth + (mirror.width / mirror.height) * (localY + halfHeight);
        if (Math.abs(localX - lineX) <= tolerance && 
            localX >= -halfWidth && localX <= halfWidth && 
            localY >= -halfHeight && localY <= halfHeight) {
            
            // Calculate hypotenuse angle
            const hypotenuseAngle = Math.atan2(mirror.height, mirror.width) * 180 / Math.PI;
            return { 
                edge: 'hypotenuse', 
                angle: (90 + hypotenuseAngle + mirror.orientation) % 360 
            };
        }
        
        return null;
    }
    
    static getIsoscelesTriangleCollisionInfo(localX, localY, halfWidth, halfHeight, mirror, tolerance) {
        // Check base (bottom edge)
        if (Math.abs(localY - halfHeight) <= tolerance && 
            localX >= -halfWidth && localX <= halfWidth) {
            return { edge: 'base', angle: (180 + mirror.orientation) % 360 };
        }
        
        // Check left side
        // Line from (0, -halfHeight) to (-halfWidth, halfHeight)
        // Slope: height/halfWidth, y-intercept: -halfHeight
        const leftSlope = mirror.height / halfWidth;
        const leftLineY = -halfHeight + leftSlope * (localX + halfWidth);
        if (Math.abs(localY - leftLineY) <= tolerance && 
            localX >= -halfWidth && localX <= 0) {
            
            const leftSideAngle = Math.atan2(mirror.height, halfWidth) * 180 / Math.PI;
            return { 
                edge: 'leftSide', 
                angle: (270 - leftSideAngle + mirror.orientation) % 360 
            };
        }
        
        // Check right side
        // Line from (0, -halfHeight) to (halfWidth, halfHeight)
        const rightLineY = -halfHeight + leftSlope * (halfWidth - localX);
        if (Math.abs(localY - rightLineY) <= tolerance && 
            localX >= 0 && localX <= halfWidth) {
            
            const rightSideAngle = Math.atan2(mirror.height, halfWidth) * 180 / Math.PI;
            return { 
                edge: 'rightSide', 
                angle: (90 + rightSideAngle + mirror.orientation) % 360 
            };
        }
        
        return null;
    }
    
    // Handle reflection using precise angle calculations
    static handlePrecisionReflection(laser, mirror, hitInfo) {
        // Get current laser angle
        const laserAngle = Math.atan2(laser.vy, laser.vx) * 180 / Math.PI;
        
        // Calculate surface normal (perpendicular to surface)
        const surfaceAngle = hitInfo.angle;
        const normalAngle = (surfaceAngle + 90) % 360;
        
        // Calculate reflection: reflected = incident - 2 * (incident · normal) * normal
        // For 2D: reflected_angle = 2 * normal_angle - incident_angle
        let reflectedAngle = (2 * normalAngle - laserAngle) % 360;
        if (reflectedAngle < 0) reflectedAngle += 360;
        
        // Snap to 15-degree increments
        const snappedAngle = Math.round(reflectedAngle / GameConfig.ANGLE_INCREMENT) * GameConfig.ANGLE_INCREMENT;
        const radians = snappedAngle * Math.PI / 180;
        
        // Apply new velocity
        laser.vx = Math.cos(radians) * GameConfig.LASER_SPEED;
        laser.vy = Math.sin(radians) * GameConfig.LASER_SPEED;
        
        // Move laser slightly away from surface to prevent re-collision
        const pushDistance = 3;
        const normalRadians = normalAngle * Math.PI / 180;
        laser.x += Math.cos(normalRadians) * pushDistance;
        laser.y += Math.sin(normalRadians) * pushDistance;
        
        // Update laser's angle tracking
        laser.currentAngle = snappedAngle;
    }
}