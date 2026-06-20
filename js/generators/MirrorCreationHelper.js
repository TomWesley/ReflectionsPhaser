import { CONFIG } from '../config.js';
import { MirrorFactory } from '../mirrors/MirrorFactory.js';

/**
 * MirrorCreationHelper - Handles creating and configuring mirrors
 */
export class MirrorCreationHelper {
    /**
     * Create a mirror with the correct shape using factory
     */
    static createMirror(x, y, shape) {
        return MirrorFactory.createMirror(x, y, shape);
    }

    /**
     * Apply configuration properties to a mirror
     */
    static applyConfiguration(mirror, config, game) {
        // Unconditionally apply all config dimensions to ensure surface area matches.
        // The factory creates mirrors with random defaults -- we must override them.
        if (config.size !== undefined) {
            mirror.size = config.size;
        }
        if (config.width !== undefined) {
            mirror.width = config.width;
        } else if (config.size !== undefined) {
            mirror.width = config.size;
        }
        if (config.height !== undefined) {
            mirror.height = config.height;
        } else if (config.size !== undefined) {
            mirror.height = config.size;
        }
        if (config.rotation !== undefined) {
            mirror.rotation = config.rotation;
        }
        if (config.topWidth !== undefined) {
            mirror.topWidth = config.topWidth;
        }
        if (config.skew !== undefined) {
            mirror.skew = config.skew;
        }

        game.safeUpdateVertices(mirror);
        return true;
    }

    /**
     * Generate a random position in a ring around the center
     */
    static generateRandomPosition() {
        const center = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
        const angle = Math.random() * Math.PI * 2;
        const distance = 140 + Math.random() * 180;

        return {
            x: center.x + Math.cos(angle) * distance,
            y: center.y + Math.sin(angle) * distance
        };
    }
}
