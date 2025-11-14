import { SimpleValidator } from '../validation/SimpleValidator.js';

/**
 * MirrorDragAndSnapHandler
 *
 * Simplified version that only validates:
 * 1. No forbidden zone placement
 * 2. No mirror overlap
 *
 * NO grid alignment enforcement!
 */
export class MirrorDragAndSnapHandler {
    constructor(game) {
        this.game = game;
    }

    /**
     * Find valid position for a mirror after drag
     * Simply tests the exact drop position - no grid snapping!
     */
    findNearestValidPosition(mirror, dropX, dropY) {
        console.log(`\n=== Testing drop position for ${mirror.shape} ===`);
        console.log(`Drop position: (${Math.round(dropX)}, ${Math.round(dropY)})`);

        // Get all other mirrors (exclude the one being dragged)
        const otherMirrors = this.game.mirrors.filter(m => m !== mirror);

        // Save original position
        const savedX = mirror.x;
        const savedY = mirror.y;
        const savedVertices = mirror.vertices ? [...mirror.vertices] : [];

        try {
            // Move mirror to drop position
            mirror.x = dropX;
            mirror.y = dropY;

            // Recalculate vertices at new position
            this.game.safeUpdateVertices(mirror);

            // Validate (only two rules: no forbidden zones, no overlap)
            const validation = SimpleValidator.validateMirror(mirror, otherMirrors);

            if (validation.valid) {
                console.log(`✅ Position is VALID`);
                return { x: mirror.x, y: mirror.y };
            } else {
                console.log(`❌ Position is INVALID: ${validation.reason}`);
                return null;
            }

        } finally {
            // Restore original position after testing
            mirror.x = savedX;
            mirror.y = savedY;
            if (savedVertices.length > 0) {
                mirror.vertices = savedVertices;
            }
        }
    }
}
