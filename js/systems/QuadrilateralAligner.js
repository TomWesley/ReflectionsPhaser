import { CONFIG } from '../config.js';
import { GridAlignmentSystem } from './GridAlignmentSystem.js';

/**
 * QuadrilateralAligner - Grid alignment logic for trapezoids and parallelograms
 */
export class QuadrilateralAligner {
    /**
     * Align trapezoid to grid
     */
    static alignTrapezoidToGrid(mirror) {
        const halfHeight = mirror.height / 2;
        const bottomHalfWidth = mirror.width / 2;

        // Ensure topWidth is grid-aligned
        let topWidth = this.ensureTopWidthAligned(mirror);
        const topHalfWidth = topWidth / 2;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            this.alignHorizontalTrapezoid(mirror, halfHeight, bottomHalfWidth, topHalfWidth);
        } else if (rotation === 90 || rotation === 270) {
            this.alignVerticalTrapezoid(mirror, halfHeight, bottomHalfWidth, topHalfWidth);
        }
    }

    /**
     * Ensure topWidth is aligned to grid
     */
    static ensureTopWidthAligned(mirror) {
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
        return topWidth;
    }

    /**
     * Align horizontal trapezoid
     */
    static alignHorizontalTrapezoid(mirror, halfHeight, bottomHalfWidth, topHalfWidth) {
        const bottomY = GridAlignmentSystem.snapToGrid(mirror.y + halfHeight);
        const topY = GridAlignmentSystem.snapToGrid(mirror.y - halfHeight);
        mirror.y = (bottomY + topY) / 2;

        mirror.x = this.findBestXAlignment(mirror, bottomHalfWidth, topHalfWidth);
    }

    /**
     * Align vertical trapezoid
     */
    static alignVerticalTrapezoid(mirror, halfHeight, bottomHalfWidth, topHalfWidth) {
        const leftX = GridAlignmentSystem.snapToGrid(mirror.x - halfHeight);
        const rightX = GridAlignmentSystem.snapToGrid(mirror.x + halfHeight);
        mirror.x = (leftX + rightX) / 2;

        mirror.y = this.findBestYAlignment(mirror, bottomHalfWidth, topHalfWidth);
    }

    /**
     * Find best X alignment for all vertices
     */
    static findBestXAlignment(mirror, bottomHalfWidth, topHalfWidth) {
        const currentX = mirror.x;
        let bestX = currentX;
        let bestScore = Infinity;

        for (let testX = currentX - CONFIG.GRID_SIZE; testX <= currentX + CONFIG.GRID_SIZE; testX += CONFIG.GRID_SIZE / 4) {
            const score = this.calculateXAlignmentScore(testX, bottomHalfWidth, topHalfWidth);
            if (score < bestScore) {
                bestScore = score;
                bestX = testX;
            }
        }

        return bestX;
    }

    /**
     * Find best Y alignment for all vertices
     */
    static findBestYAlignment(mirror, bottomHalfWidth, topHalfWidth) {
        const currentY = mirror.y;
        let bestY = currentY;
        let bestScore = Infinity;

        for (let testY = currentY - CONFIG.GRID_SIZE; testY <= currentY + CONFIG.GRID_SIZE; testY += CONFIG.GRID_SIZE / 4) {
            const score = this.calculateYAlignmentScore(testY, bottomHalfWidth, topHalfWidth);
            if (score < bestScore) {
                bestScore = score;
                bestY = testY;
            }
        }

        return bestY;
    }

    /**
     * Calculate alignment score for X position
     */
    static calculateXAlignmentScore(testX, bottomHalfWidth, topHalfWidth) {
        const bottomLeft = testX - bottomHalfWidth;
        const bottomRight = testX + bottomHalfWidth;
        const topLeft = testX - topHalfWidth;
        const topRight = testX + topHalfWidth;

        return Math.abs(bottomLeft - GridAlignmentSystem.snapToGrid(bottomLeft)) +
               Math.abs(bottomRight - GridAlignmentSystem.snapToGrid(bottomRight)) +
               Math.abs(topLeft - GridAlignmentSystem.snapToGrid(topLeft)) +
               Math.abs(topRight - GridAlignmentSystem.snapToGrid(topRight));
    }

    /**
     * Calculate alignment score for Y position
     */
    static calculateYAlignmentScore(testY, bottomHalfWidth, topHalfWidth) {
        const bottomTop = testY - bottomHalfWidth;
        const bottomBottom = testY + bottomHalfWidth;
        const topTop = testY - topHalfWidth;
        const topBottom = testY + topHalfWidth;

        return Math.abs(bottomTop - GridAlignmentSystem.snapToGrid(bottomTop)) +
               Math.abs(bottomBottom - GridAlignmentSystem.snapToGrid(bottomBottom)) +
               Math.abs(topTop - GridAlignmentSystem.snapToGrid(topTop)) +
               Math.abs(topBottom - GridAlignmentSystem.snapToGrid(topBottom));
    }

    /**
     * Align parallelogram to grid
     */
    static alignParallelogramToGrid(mirror) {
        const halfHeight = mirror.height / 2;
        const halfWidth = mirror.width / 2;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            const bottomY = GridAlignmentSystem.snapToGrid(mirror.y + halfHeight);
            mirror.y = bottomY - halfHeight;

            const topY = GridAlignmentSystem.snapToGrid(mirror.y - halfHeight);
            mirror.y = topY + halfHeight;

            const bottomLeftX = GridAlignmentSystem.snapToGrid(mirror.x - halfWidth);
            mirror.x = bottomLeftX + halfWidth;
        } else if (rotation === 90 || rotation === 270) {
            const leftX = GridAlignmentSystem.snapToGrid(mirror.x - halfHeight);
            mirror.x = leftX + halfHeight;

            const rightX = GridAlignmentSystem.snapToGrid(mirror.x + halfHeight);
            mirror.x = rightX - halfHeight;

            const bottomY = GridAlignmentSystem.snapToGrid(mirror.y - halfWidth);
            mirror.y = bottomY + halfWidth;
        }
    }
}
