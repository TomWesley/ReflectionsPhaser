import { CONFIG } from '../config.js';
import { GridAlignmentSystem } from './GridAlignmentSystem.js';

/**
 * TriangleAligner - Grid alignment logic for triangles
 */
export class TriangleAligner {
    /**
     * Align triangle to grid
     */
    static alignTriangleToGrid(mirror) {
        const halfSize = mirror.size / 2;
        const gridSize = CONFIG.GRID_SIZE;

        if (mirror.shape === 'rightTriangle') {
            this.alignRightTriangle(mirror, halfSize, gridSize);
        } else if (mirror.shape === 'isoscelesTriangle') {
            this.alignIsoscelesTriangle(mirror);
        }
    }

    /**
     * Align right triangle to grid
     */
    static alignRightTriangle(mirror, halfSize, gridSize) {
        if (halfSize % gridSize === 0) {
            // For 2-tile and 3-tile triangles
            mirror.x = GridAlignmentSystem.snapToGrid(mirror.x);
            mirror.y = GridAlignmentSystem.snapToGrid(mirror.y);
        } else {
            // For 1-tile triangles
            const baseX = GridAlignmentSystem.snapToGrid(mirror.x);
            const baseY = GridAlignmentSystem.snapToGrid(mirror.y);
            mirror.x = baseX + gridSize / 2;
            mirror.y = baseY + gridSize / 2;
        }
    }

    /**
     * Align isosceles triangle to grid
     */
    static alignIsoscelesTriangle(mirror) {
        const halfWidth = (mirror.width || mirror.size) / 2;
        const halfHeight = (mirror.height || mirror.size) / 2;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            mirror.x = GridAlignmentSystem.snapToGrid(mirror.x);

            if (rotation === 0) {
                const desiredBaseY = GridAlignmentSystem.snapToGrid(mirror.y + halfHeight);
                mirror.y = desiredBaseY - halfHeight;
            } else {
                const desiredBaseY = GridAlignmentSystem.snapToGrid(mirror.y - halfHeight);
                mirror.y = desiredBaseY + halfHeight;
            }
        } else if (rotation === 90 || rotation === 270) {
            mirror.y = GridAlignmentSystem.snapToGrid(mirror.y);

            if (rotation === 90) {
                const desiredBaseX = GridAlignmentSystem.snapToGrid(mirror.x + halfHeight);
                mirror.x = desiredBaseX - halfHeight;
            } else {
                const desiredBaseX = GridAlignmentSystem.snapToGrid(mirror.x - halfHeight);
                mirror.x = desiredBaseX + halfHeight;
            }
        }
    }
}
