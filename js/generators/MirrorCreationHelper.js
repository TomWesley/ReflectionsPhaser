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
        let propertiesChanged = false;

        if (config.size && config.size !== mirror.size) {
            mirror.size = config.size;
            mirror.width = config.width || config.size;
            mirror.height = config.height || config.size;
            propertiesChanged = true;
        }
        if (config.width && config.width !== mirror.width) {
            mirror.width = config.width;
            propertiesChanged = true;
        }
        if (config.height && config.height !== mirror.height) {
            mirror.height = config.height;
            propertiesChanged = true;
        }
        if (config.rotation !== undefined && config.rotation !== mirror.rotation) {
            mirror.rotation = config.rotation;
            propertiesChanged = true;
        }

        // Copy special shape properties
        if (config.topWidth && config.topWidth !== mirror.topWidth) {
            mirror.topWidth = config.topWidth;
            propertiesChanged = true;
        }
        if (config.skew && config.skew !== mirror.skew) {
            mirror.skew = config.skew;
            propertiesChanged = true;
        }

        // If we modified any properties, recalculate vertices
        if (propertiesChanged) {
            game.safeUpdateVertices(mirror);
        }

        return propertiesChanged;
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
