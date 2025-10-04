import { CONFIG } from '../config.js';

/**
 * Handles laser collision detection and reflection using the centralized collision system
 */
export class LaserCollisionHandler {
    constructor(collisionSystem) {
        this.collisionSystem = collisionSystem;
        this.mirrorIds = [];
    }

    /**
     * Initialize with mirror IDs for collision checking
     */
    initialize(mirrors) {
        this.mirrorIds = mirrors.map((_, index) => `mirror_${index}`);
        console.log('Laser collision handler initialized with', this.mirrorIds.length, 'mirrors');
    }

    /**
     * Check if laser collides with any mirror and handle reflection
     * Returns true if collision occurred and was handled
     */
    checkAndHandleCollisions(laser, mirrors) {
        // Skip if laser has exceeded max reflections
        if (laser.totalReflections >= laser.maxReflections) {
            return false;
        }

        // Check collision with each mirror
        for (let i = 0; i < mirrors.length; i++) {
            const mirrorId = `mirror_${i}`;
            const mirror = mirrors[i];

            // Skip if laser is in cooldown with this specific mirror
            if (laser.reflectionCooldown > 0 && laser.lastReflectedMirror === mirror) {
                continue;
            }

            // Check for collision
            if (this.checkLaserMirrorCollision(laser, mirrorId)) {
                // Handle collision
                this.handleCollision(laser, mirror, mirrorId);
                return true; // Only one collision per frame
            }
        }

        return false;
    }

    /**
     * Check if laser collides with a specific mirror
     */
    checkLaserMirrorCollision(laser, mirrorId) {
        // Use previous position for continuous collision detection
        if (laser.prevX !== undefined && laser.prevY !== undefined) {
            const wasInside = this.collisionSystem.checkLaserMirrorCollision(
                { x: laser.prevX, y: laser.prevY }, mirrorId
            );
            const isInside = this.collisionSystem.checkLaserMirrorCollision(laser, mirrorId);

            // Collision occurs when laser enters mirror (was outside, now inside)
            if (!wasInside && isInside) {
                return true;
            }

            // Emergency escape if laser gets stuck inside
            if (wasInside && isInside && laser.reflectionCooldown === 0) {
                this.emergencyEscape(laser, mirrorId);
                return false;
            }
        } else {
            // Fallback for first frame
            return this.collisionSystem.checkLaserMirrorCollision(laser, mirrorId);
        }

        return false;
    }

    /**
     * Handle collision between laser and mirror
     */
    handleCollision(laser, mirror, mirrorId) {
        // Move laser to edge to prevent getting stuck
        this.collisionSystem.moveLaserToEdge(laser, mirrorId);

        // Find collision edge
        const collisionEdge = this.collisionSystem.findCollisionEdge(laser, mirrorId);

        if (collisionEdge) {
            // Reflect laser off the edge
            this.collisionSystem.reflectLaserOffEdge(laser, collisionEdge);
        } else {
            // Fallback: use mirror's built-in reflection
            console.warn('No collision edge found, using fallback reflection');
            mirror.reflect(laser);
        }

        // Update laser state
        laser.reflectionCooldown = 5;
        laser.lastReflectedMirror = mirror;
        laser.totalReflections++;

        // Check for max reflections
        if (laser.totalReflections >= laser.maxReflections) {
            console.log('Laser exceeded max reflections, removing');
            laser.x = -100;
            laser.y = -100;
        }
    }

    /**
     * Emergency escape for stuck lasers
     */
    emergencyEscape(laser, mirrorId) {
        console.warn('Emergency escape triggered for stuck laser');

        // Try to move laser out of mirror
        this.collisionSystem.moveLaserToEdge(laser, mirrorId);

        // If still stuck, move in direction opposite to velocity
        if (this.collisionSystem.checkLaserMirrorCollision(laser, mirrorId)) {
            const escapeDistance = 5;
            const speed = Math.sqrt(laser.vx * laser.vx + laser.vy * laser.vy);
            const normalizedVx = laser.vx / speed;
            const normalizedVy = laser.vy / speed;

            laser.x -= normalizedVx * escapeDistance;
            laser.y -= normalizedVy * escapeDistance;
        }

        // Set brief cooldown to prevent immediate re-collision
        laser.reflectionCooldown = 3;
    }

    /**
     * Check collision with center target
     */
    checkTargetCollision(laser) {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const targetRadius = CONFIG.TARGET_RADIUS;

        const distance = Math.sqrt(
            (laser.x - centerX) ** 2 + (laser.y - centerY) ** 2
        );

        return distance <= targetRadius;
    }

    /**
     * Check if laser is out of bounds
     */
    isOutOfBounds(laser) {
        return laser.x < 0 || laser.x > CONFIG.CANVAS_WIDTH ||
               laser.y < 0 || laser.y > CONFIG.CANVAS_HEIGHT;
    }
}