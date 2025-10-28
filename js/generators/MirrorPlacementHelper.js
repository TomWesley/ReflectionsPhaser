import { CONFIG } from '../config.js';
import { GridAlignmentEnforcer } from '../validation/GridAlignmentEnforcer.js';
import { IronCladValidator } from '../validation/IronCladValidator.js';

/**
 * MirrorPlacementHelper - Helps find valid positions for mirrors
 */
export class MirrorPlacementHelper {
    /**
     * Find the nearest valid position for a mirror using iron-clad validation
     */
    static findNearestValidPositionIronClad(mirror, existingMirrors, game) {
        const searchRadius = CONFIG.GRID_SIZE * 15;
        const step = CONFIG.GRID_SIZE;

        let bestPosition = null;
        let bestDistance = Infinity;

        for (let radius = 0; radius <= searchRadius; radius += step) {
            const positions = this.getRadialPositions(mirror, radius, step);

            for (let pos of positions) {
                const testMirror = this.createTestMirror(mirror, pos);

                GridAlignmentEnforcer.enforceGridAlignment(testMirror);
                game.safeUpdateVertices(testMirror);

                const validation = IronCladValidator.validateMirror(testMirror, existingMirrors);

                if (validation.valid) {
                    const distance = Math.sqrt((pos.x - mirror.x) ** 2 + (pos.y - mirror.y) ** 2);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestPosition = { x: testMirror.x, y: testMirror.y };
                    }
                }
            }

            if (bestPosition) {
                return bestPosition;
            }
        }

        return null;
    }

    /**
     * Get positions in a radial pattern around the mirror
     */
    static getRadialPositions(mirror, radius, step) {
        const positions = [];

        if (radius === 0) {
            positions.push({ x: mirror.x, y: mirror.y });
        } else {
            const circumference = 2 * Math.PI * radius;
            const numPoints = Math.max(8, Math.floor(circumference / step));

            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * 2 * Math.PI;
                const x = mirror.x + radius * Math.cos(angle);
                const y = mirror.y + radius * Math.sin(angle);

                positions.push({
                    x: Math.round(x / step) * step,
                    y: Math.round(y / step) * step
                });
            }
        }

        return positions;
    }

    /**
     * Create a test mirror at a new position
     */
    static createTestMirror(mirror, pos) {
        const testMirror = Object.create(Object.getPrototypeOf(mirror));
        Object.assign(testMirror, mirror);
        testMirror.x = pos.x;
        testMirror.y = pos.y;
        return testMirror;
    }
}
