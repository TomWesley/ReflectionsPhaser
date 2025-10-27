import { CONFIG } from '../config.js';

/**
 * GridAlignmentSystem - Handles all grid alignment operations for mirrors
 * Responsibilities:
 * - Snapping to grid intersections
 * - Aligning mirror shapes to grid lines
 * - Finding nearest valid grid positions
 * - Ensuring all shape edges/vertices align correctly
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
     * Adjust mirror position to ensure proper grid alignment based on shape
     */
    static adjustMirrorPositionForGrid(mirror, game) {
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                this.alignRectangleToGrid(mirror);
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
     * Align rectangle/square to grid
     */
    static alignRectangleToGrid(mirror) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;

        // Find nearest grid intersection where edges will align
        mirror.x = this.snapToGrid(mirror.x - halfWidth) + halfWidth;
        mirror.y = this.snapToGrid(mirror.y - halfHeight) + halfHeight;
    }

    /**
     * Align triangle to grid
     */
    static alignTriangleToGrid(mirror) {
        const halfSize = mirror.size / 2;
        const gridSize = CONFIG.GRID_SIZE;

        if (mirror.shape === 'rightTriangle') {
            if (halfSize % gridSize === 0) {
                // For 2-tile and 3-tile triangles: halfSize = 20, 30 (multiples of gridSize)
                mirror.x = this.snapToGrid(mirror.x);
                mirror.y = this.snapToGrid(mirror.y);
            } else {
                // For 1-tile triangles: halfSize = 10 (not multiple of gridSize)
                const baseX = this.snapToGrid(mirror.x);
                const baseY = this.snapToGrid(mirror.y);
                mirror.x = baseX + gridSize / 2;
                mirror.y = baseY + gridSize / 2;
            }
        } else if (mirror.shape === 'isoscelesTriangle') {
            const halfWidth = (mirror.width || mirror.size) / 2;
            const halfHeight = (mirror.height || mirror.size) / 2;
            const rotation = mirror.rotation || 0;

            if (rotation === 0 || rotation === 180) {
                mirror.x = this.snapToGrid(mirror.x);

                if (rotation === 0) {
                    const desiredBaseY = this.snapToGrid(mirror.y + halfHeight);
                    mirror.y = desiredBaseY - halfHeight;
                } else {
                    const desiredBaseY = this.snapToGrid(mirror.y - halfHeight);
                    mirror.y = desiredBaseY + halfHeight;
                }
            } else if (rotation === 90 || rotation === 270) {
                mirror.y = this.snapToGrid(mirror.y);

                if (rotation === 90) {
                    const desiredBaseX = this.snapToGrid(mirror.x + halfHeight);
                    mirror.x = desiredBaseX - halfHeight;
                } else {
                    const desiredBaseX = this.snapToGrid(mirror.x - halfHeight);
                    mirror.x = desiredBaseX + halfHeight;
                }
            }
        }
    }

    /**
     * Align trapezoid to grid
     */
    static alignTrapezoidToGrid(mirror, game) {
        const halfHeight = mirror.height / 2;
        const bottomHalfWidth = mirror.width / 2;

        // Ensure topWidth is grid-aligned
        let topWidth = mirror.topWidth;
        if (!topWidth) {
            const gridSize = CONFIG.GRID_SIZE;
            const minTopWidth = gridSize;
            const maxReduction = Math.floor(mirror.width / gridSize) * gridSize / 2;
            const reductions = [gridSize, gridSize * 2, gridSize * 3];
            const validReductions = reductions.filter(r => r <= maxReduction && mirror.width - r >= minTopWidth);
            const reduction = validReductions[0] || gridSize;
            topWidth = mirror.width - reduction;
            mirror.topWidth = topWidth;
        }
        const topHalfWidth = topWidth / 2;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            // Align both Y edges to grid lines
            const bottomY = this.snapToGrid(mirror.y + halfHeight);
            const topY = this.snapToGrid(mirror.y - halfHeight);
            mirror.y = (bottomY + topY) / 2;

            // Find X position where all vertices align
            const currentX = mirror.x;
            let bestX = currentX;
            let bestScore = Infinity;

            for (let testX = currentX - CONFIG.GRID_SIZE; testX <= currentX + CONFIG.GRID_SIZE; testX += CONFIG.GRID_SIZE / 4) {
                const bottomLeft = testX - bottomHalfWidth;
                const bottomRight = testX + bottomHalfWidth;
                const topLeft = testX - topHalfWidth;
                const topRight = testX + topHalfWidth;

                const bottomLeftError = Math.abs(bottomLeft - this.snapToGrid(bottomLeft));
                const bottomRightError = Math.abs(bottomRight - this.snapToGrid(bottomRight));
                const topLeftError = Math.abs(topLeft - this.snapToGrid(topLeft));
                const topRightError = Math.abs(topRight - this.snapToGrid(topRight));

                const totalError = bottomLeftError + bottomRightError + topLeftError + topRightError;

                if (totalError < bestScore) {
                    bestScore = totalError;
                    bestX = testX;
                }
            }

            mirror.x = bestX;

        } else if (rotation === 90 || rotation === 270) {
            // Align both X edges to grid lines
            const leftX = this.snapToGrid(mirror.x - halfHeight);
            const rightX = this.snapToGrid(mirror.x + halfHeight);
            mirror.x = (leftX + rightX) / 2;

            // Find Y position where all vertices align
            const currentY = mirror.y;
            let bestY = currentY;
            let bestScore = Infinity;

            for (let testY = currentY - CONFIG.GRID_SIZE; testY <= currentY + CONFIG.GRID_SIZE; testY += CONFIG.GRID_SIZE / 4) {
                const bottomTop = testY - bottomHalfWidth;
                const bottomBottom = testY + bottomHalfWidth;
                const topTop = testY - topHalfWidth;
                const topBottom = testY + topHalfWidth;

                const bottomTopError = Math.abs(bottomTop - this.snapToGrid(bottomTop));
                const bottomBottomError = Math.abs(bottomBottom - this.snapToGrid(bottomBottom));
                const topTopError = Math.abs(topTop - this.snapToGrid(topTop));
                const topBottomError = Math.abs(topBottom - this.snapToGrid(topBottom));

                const totalError = bottomTopError + bottomBottomError + topTopError + topBottomError;

                if (totalError < bestScore) {
                    bestScore = totalError;
                    bestY = testY;
                }
            }

            mirror.y = bestY;
        }
    }

    /**
     * Align parallelogram to grid
     */
    static alignParallelogramToGrid(mirror) {
        const halfHeight = mirror.height / 2;
        const halfWidth = mirror.width / 2;
        const skew = mirror.skew || 20;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            // Ensure bottom edge is on grid line
            const bottomY = this.snapToGrid(mirror.y + halfHeight);
            mirror.y = bottomY - halfHeight;

            // Ensure top edge is on grid line
            const topY = this.snapToGrid(mirror.y - halfHeight);
            mirror.y = topY + halfHeight;

            // Ensure bottom-left vertex is on grid intersection
            const bottomLeftX = this.snapToGrid(mirror.x - halfWidth);
            mirror.x = bottomLeftX + halfWidth;

        } else if (rotation === 90 || rotation === 270) {
            // Ensure left edge is on grid line
            const leftX = this.snapToGrid(mirror.x - halfHeight);
            mirror.x = leftX + halfHeight;

            // Ensure right edge is on grid line
            const rightX = this.snapToGrid(mirror.x + halfHeight);
            mirror.x = rightX - halfHeight;

            // Ensure one vertex is on grid intersection
            const bottomY = this.snapToGrid(mirror.y - halfWidth);
            mirror.y = bottomY + halfWidth;
        }
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
