// SAT (Separating Axis Theorem) Collision Detection System
// Based on: https://dyn4j.org/2010/01/sat/
class SATCollision {
    
    // Check collision between laser (circle) and mirror (polygon) using SAT
    static checkLaserMirrorCollision(laser, mirror) {
        // Get mirror as polygon
        const polygon = this.getMirrorPolygon(mirror);
        
        // Laser as circle
        const circle = {
            x: laser.x,
            y: laser.y,
            radius: GameConfig.LASER_RADIUS
        };
        
        // Check collision and get collision info
        const collisionInfo = this.circlePolygonSAT(circle, polygon);
        
        if (collisionInfo.collision) {
            // Handle reflection
            this.handleSATReflection(laser, mirror, collisionInfo);
            return true;
        }
        
        return false;
    }
    
    // Convert mirror to polygon representation
    static getMirrorPolygon(mirror) {
        const cos = Math.cos((mirror.orientation * Math.PI) / 180);
        const sin = Math.sin((mirror.orientation * Math.PI) / 180);
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        
        let localVertices = [];
        
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                localVertices = [
                    { x: -halfWidth, y: -halfHeight },
                    { x: halfWidth, y: -halfHeight },
                    { x: halfWidth, y: halfHeight },
                    { x: -halfWidth, y: halfHeight }
                ];
                break;
                
            case 'rightTriangle':
                localVertices = [
                    { x: -halfWidth, y: halfHeight },  // Bottom left (right angle)
                    { x: halfWidth, y: halfHeight },   // Bottom right
                    { x: -halfWidth, y: -halfHeight }  // Top left
                ];
                break;
                
            case 'isoscelesTriangle':
                localVertices = [
                    { x: 0, y: -halfHeight },          // Top point
                    { x: -halfWidth, y: halfHeight },  // Bottom left
                    { x: halfWidth, y: halfHeight }    // Bottom right
                ];
                break;
        }
        
        // Transform vertices to world coordinates
        const worldVertices = localVertices.map(vertex => ({
            x: vertex.x * cos - vertex.y * sin + mirror.x,
            y: vertex.x * sin + vertex.y * cos + mirror.y
        }));
        
        // Calculate edges and normals
        const edges = [];
        const normals = [];
        
        for (let i = 0; i < worldVertices.length; i++) {
            const current = worldVertices[i];
            const next = worldVertices[(i + 1) % worldVertices.length];
            
            // Edge vector
            const edge = {
                x: next.x - current.x,
                y: next.y - current.y
            };
            
            // Normal (perpendicular to edge, pointing outward)
            const normal = {
                x: -edge.y,
                y: edge.x
            };
            
            // Normalize
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
            normal.x /= length;
            normal.y /= length;
            
            edges.push(edge);
            normals.push(normal);
        }
        
        return {
            vertices: worldVertices,
            edges: edges,
            normals: normals,
            center: { x: mirror.x, y: mirror.y }
        };
    }
    
    // SAT collision detection between circle and polygon
    static circlePolygonSAT(circle, polygon) {
        let minOverlap = Infinity;
        let collisionNormal = null;
        let collisionEdgeIndex = -1;
        
        // Test polygon normals
        for (let i = 0; i < polygon.normals.length; i++) {
            const normal = polygon.normals[i];
            
            // Project polygon onto normal
            const polygonProjection = this.projectPolygon(polygon.vertices, normal);
            
            // Project circle onto normal
            const circleProjection = this.projectCircle(circle, normal);
            
            // Check for separation
            if (polygonProjection.max < circleProjection.min || 
                circleProjection.max < polygonProjection.min) {
                // Separated - no collision
                return { collision: false };
            }
            
            // Calculate overlap
            const overlap = Math.min(polygonProjection.max - circleProjection.min, 
                                   circleProjection.max - polygonProjection.min);
            
            if (overlap < minOverlap) {
                minOverlap = overlap;
                collisionNormal = normal;
                collisionEdgeIndex = i;
            }
        }
        
        // Test circle-to-closest-vertex axis
        const closestVertex = this.getClosestVertex(circle, polygon.vertices);
        const circleToVertex = {
            x: closestVertex.x - circle.x,
            y: closestVertex.y - circle.y
        };
        
        const length = Math.sqrt(circleToVertex.x * circleToVertex.x + circleToVertex.y * circleToVertex.y);
        if (length > 0) {
            circleToVertex.x /= length;
            circleToVertex.y /= length;
            
            // Project polygon onto this axis
            const polygonProjection = this.projectPolygon(polygon.vertices, circleToVertex);
            
            // Project circle onto this axis
            const circleProjection = this.projectCircle(circle, circleToVertex);
            
            // Check for separation
            if (polygonProjection.max < circleProjection.min || 
                circleProjection.max < polygonProjection.min) {
                return { collision: false };
            }
            
            // Calculate overlap
            const overlap = Math.min(polygonProjection.max - circleProjection.min, 
                                   circleProjection.max - polygonProjection.min);
            
            if (overlap < minOverlap) {
                minOverlap = overlap;
                collisionNormal = circleToVertex;
                collisionEdgeIndex = -1; // Vertex collision
            }
        }
        
        // Ensure normal points away from circle
        const centerToCircle = {
            x: circle.x - polygon.center.x,
            y: circle.y - polygon.center.y
        };
        
        const dot = collisionNormal.x * centerToCircle.x + collisionNormal.y * centerToCircle.y;
        if (dot < 0) {
            collisionNormal.x = -collisionNormal.x;
            collisionNormal.y = -collisionNormal.y;
        }
        
        return {
            collision: true,
            normal: collisionNormal,
            overlap: minOverlap,
            edgeIndex: collisionEdgeIndex
        };
    }
    
    // Project polygon vertices onto axis
    static projectPolygon(vertices, axis) {
        let min = vertices[0].x * axis.x + vertices[0].y * axis.y;
        let max = min;
        
        for (let i = 1; i < vertices.length; i++) {
            const projection = vertices[i].x * axis.x + vertices[i].y * axis.y;
            if (projection < min) min = projection;
            if (projection > max) max = projection;
        }
        
        return { min, max };
    }
    
    // Project circle onto axis
    static projectCircle(circle, axis) {
        const centerProjection = circle.x * axis.x + circle.y * axis.y;
        return {
            min: centerProjection - circle.radius,
            max: centerProjection + circle.radius
        };
    }
    
    // Find closest vertex to circle
    static getClosestVertex(circle, vertices) {
        let closestVertex = vertices[0];
        let minDistance = this.distanceSquared(circle, vertices[0]);
        
        for (let i = 1; i < vertices.length; i++) {
            const distance = this.distanceSquared(circle, vertices[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestVertex = vertices[i];
            }
        }
        
        return closestVertex;
    }
    
    // Calculate squared distance between two points
    static distanceSquared(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return dx * dx + dy * dy;
    }
    
    // Handle reflection using SAT collision info
    static handleSATReflection(laser, mirror, collisionInfo) {
        const normal = collisionInfo.normal;
        
        // Move laser out of collision
        const pushDistance = collisionInfo.overlap + 1;
        laser.x += normal.x * pushDistance;
        laser.y += normal.y * pushDistance;
        
        // Reflect velocity using: v' = v - 2(v·n)n
        const velocityDotNormal = laser.vx * normal.x + laser.vy * normal.y;
        laser.vx = laser.vx - 2 * velocityDotNormal * normal.x;
        laser.vy = laser.vy - 2 * velocityDotNormal * normal.y;
        
        // Snap to 15-degree increments
        const currentAngle = Math.atan2(laser.vy, laser.vx);
        const degrees = currentAngle * 180 / Math.PI;
        const snappedDegrees = Math.round(degrees / GameConfig.ANGLE_INCREMENT) * GameConfig.ANGLE_INCREMENT;
        const snappedAngle = snappedDegrees * Math.PI / 180;
        
        laser.vx = Math.cos(snappedAngle) * GameConfig.LASER_SPEED;
        laser.vy = Math.sin(snappedAngle) * GameConfig.LASER_SPEED;
        laser.currentAngle = snappedDegrees;
    }
}