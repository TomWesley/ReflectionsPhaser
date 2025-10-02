import { MirrorFactory } from '../mirrors/MirrorFactory.js';

/**
 * Mirror class that uses proper inheritance hierarchy
 * Maintains backward compatibility by acting as a factory
 */
export class Mirror {
    constructor(x, y, shapeType = null) {
        // Use factory to create the appropriate mirror type
        const mirror = MirrorFactory.createMirror(x, y, shapeType);

        // Copy all properties from the created mirror to this instance
        Object.assign(this, mirror);

        // Preserve the prototype chain for methods
        Object.setPrototypeOf(this, Object.getPrototypeOf(mirror));

        return mirror;
    }

    // Static method for backward compatibility
    static create(x, y, shapeType = null) {
        return MirrorFactory.createMirror(x, y, shapeType);
    }
}