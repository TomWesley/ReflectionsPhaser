import { CONFIG } from '../config.js';
import { TriangleAligner } from './TriangleAligner.js';
import { QuadrilateralAligner } from './QuadrilateralAligner.js';

/**
 * GridAlignmentSystem - Main entry point for grid alignment operations
 * Delegates to specialized aligners
 */
export class GridAlignmentSystem {
    /**
     * Snap a value to the nearest grid line
     */
    static snapToGrid(value) {
        return Math.round(value / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    }

    /**
     * Check if a value is on a grid line (within tolerance)
     */
    static isOnGridLine(value) {
        const remainder = Math.abs(value % CONFIG.GRID_SIZE);
        return remainder < 0.1 || remainder > (CONFIG.GRID_SIZE - 0.1);
    }

    /**
     * Adjust mirror position for proper grid alignment
     */
    static adjustMirrorPositionForGrid(mirror, game) {
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                this.alignRectangleToGrid(mirror);
                break;
            case 'rightTriangle':
            case 'isoscelesTriangle':
                TriangleAligner.alignTriangleToGrid(mirror);
                break;
            case 'trapezoid':
                QuadrilateralAligner.alignTrapezoidToGrid(mirror, game);
                break;
            case 'parallelogram':
                QuadrilateralAligner.alignParallelogramToGrid(mirror);
                break;
        }
    }

    /**
     * Align rectangle/square to grid
     */
    static alignRectangleToGrid(mirror) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;

        mirror.x = this.snapToGrid(mirror.x - halfWidth) + halfWidth;
        mirror.y = this.snapToGrid(mirror.y - halfHeight) + halfHeight;
    }

    /**
     * Align triangle to grid
     */
    static alignTriangleToGrid(mirror) {
        TriangleAligner.alignTriangleToGrid(mirror);
    }

    /**
     * Align trapezoid to grid
     */
    static alignTrapezoidToGrid(mirror, game) {
        QuadrilateralAligner.alignTrapezoidToGrid(mirror, game);
    }

    /**
     * Align parallelogram to grid
     */
    static alignParallelogramToGrid(mirror) {
        QuadrilateralAligner.alignParallelogramToGrid(mirror);
    }

    /**
     * Snap mirror to grid based on shape
     */
    static snapMirrorToGrid(mirror, game) {
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                mirror.x = this.snapToGrid(mirror.x);
                mirror.y = this.snapToGrid(mirror.y);
                this.adjustMirrorPositionForGrid(mirror, game);
                break;
            case 'rightTriangle':
            case 'isoscelesTriangle':
                this.alignTriangleToGrid(mirror);
                break;
            case 'trapezoid':
                this.alignTrapezoidToGrid(mirror, game);
                break;
            case 'parallelogram':
                this.alignParallelogramToGrid(mirror);
                break;
        }
    }

    /**
     * Ensure mirror shape is properly aligned to grid
     */
    static ensureMirrorShapeAlignment(mirror, game) {
        const originalX = mirror.x;
        const originalY = mirror.y;

        this.adjustMirrorPositionForGrid(mirror, game);

        // Only apply adjustment if change is within one grid cell
        if (Math.abs(mirror.x - originalX) > CONFIG.GRID_SIZE ||
            Math.abs(mirror.y - originalY) > CONFIG.GRID_SIZE) {
            mirror.x = originalX;
            mirror.y = originalY;
        }
    }

    /**
     * Force mirror to be grid-aligned
     */
    static forceGridAlignment(mirror, game) {
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;

                const leftGridLine = this.snapToGrid(mirror.x - halfWidth);
                const topGridLine = this.snapToGrid(mirror.y - halfHeight);

                mirror.x = leftGridLine + halfWidth;
                mirror.y = topGridLine + halfHeight;
                break;
            case 'rightTriangle':
            case 'isoscelesTriangle':
                this.alignTriangleToGrid(mirror);
                break;
            case 'trapezoid':
                this.alignTrapezoidToGrid(mirror, game);
                break;
            case 'parallelogram':
                this.alignParallelogramToGrid(mirror);
                break;
        }
    }
}
