import { CONFIG } from '../config.js';
import { MirrorPlacementValidation } from './MirrorPlacementValidation.js';

/**
 * Grid Alignment Enforcer
 * Ensures ALL mirror vertices are EXACTLY on grid intersections
 * This is called during mirror construction and after any position change
 */
export class GridAlignmentEnforcer {
    /**
     * Force a mirror's position to ensure all vertices are on grid intersections
     * This is the IRON-CLAD enforcement - it WILL find a valid position
     */
    static enforceGridAlignment(mirror) {
        const gridSize = CONFIG.GRID_SIZE;

        switch (mirror.shape) {
            case 'square':
                this.alignSquare(mirror, gridSize);
                break;
            case 'rectangle':
                this.alignRectangle(mirror, gridSize);
                break;
            case 'rightTriangle':
                this.alignRightTriangle(mirror, gridSize);
                break;
            case 'isoscelesTriangle':
                this.alignIsoscelesTriangle(mirror, gridSize);
                break;
            case 'trapezoid':
                this.alignTrapezoid(mirror, gridSize);
                break;
            case 'parallelogram':
                this.alignParallelogram(mirror, gridSize);
                break;
            default:
                console.warn(`Unknown mirror shape: ${mirror.shape}`);
        }

        return mirror;
    }

    /**
     * Align square: All 4 corners must be on grid intersections
     */
    static alignSquare(mirror, gridSize) {
        const halfSize = mirror.size / 2;

        // For a square, if size is a multiple of gridSize, we can align perfectly
        if (halfSize % gridSize === 0) {
            // Center can be on grid intersection
            mirror.x = Math.round(mirror.x / gridSize) * gridSize;
            mirror.y = Math.round(mirror.y / gridSize) * gridSize;
        } else {
            // Center must be offset by half grid to get corners on intersections
            const baseX = Math.round(mirror.x / gridSize) * gridSize;
            const baseY = Math.round(mirror.y / gridSize) * gridSize;
            mirror.x = baseX + gridSize / 2;
            mirror.y = baseY + gridSize / 2;
        }
    }

    /**
     * Align rectangle: All 4 corners must be on grid intersections
     */
    static alignRectangle(mirror, gridSize) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;

        // Find the nearest position where ALL corners align to grid
        // Left edge should be on a grid line
        const leftGridLine = Math.round((mirror.x - halfWidth) / gridSize) * gridSize;
        // Top edge should be on a grid line
        const topGridLine = Math.round((mirror.y - halfHeight) / gridSize) * gridSize;

        // Set center so edges align
        mirror.x = leftGridLine + halfWidth;
        mirror.y = topGridLine + halfHeight;
    }

    /**
     * Align right triangle: All 3 vertices must be on grid intersections
     */
    static alignRightTriangle(mirror, gridSize) {
        const halfSize = mirror.size / 2;

        // Right triangle vertices (before rotation):
        // bottom-left: (x - halfSize, y + halfSize)
        // bottom-right: (x + halfSize, y + halfSize)
        // top-left: (x - halfSize, y - halfSize)

        if (halfSize % gridSize === 0) {
            // If halfSize is multiple of grid (40, 60, 80), center on grid intersection
            mirror.x = Math.round(mirror.x / gridSize) * gridSize;
            mirror.y = Math.round(mirror.y / gridSize) * gridSize;
        } else {
            // If halfSize is not multiple (20, 30), offset by half grid
            const baseX = Math.round(mirror.x / gridSize) * gridSize;
            const baseY = Math.round(mirror.y / gridSize) * gridSize;
            mirror.x = baseX + gridSize / 2;
            mirror.y = baseY + gridSize / 2;
        }
    }

    /**
     * Align isosceles triangle: All 3 vertices must be on grid intersections
     *
     * CRITICAL: For perfect grid alignment:
     * - width MUST be EVEN number of grid units (40, 80, 120) - NOT odd (20, 60, 100)
     * - height can be any multiple of gridSize
     */
    static alignIsoscelesTriangle(mirror, gridSize) {
        const halfWidth = mirror.width / 2;
        const halfHeight = mirror.height / 2;
        const rotation = mirror.rotation || 0;

        // Isosceles triangle vertices (rotation 0):
        // top apex: (x, y - halfHeight)
        // bottom-left: (x - halfWidth, y + halfHeight)
        // bottom-right: (x + halfWidth, y + halfHeight)

        if (rotation === 0 || rotation === 180) {
            // Horizontal base

            // Step 1: Align base Y coordinate to grid
            const baseY = Math.round((mirror.y + halfHeight) / gridSize) * gridSize;

            // Step 2: Calculate apex Y from aligned base
            const apexY = baseY - mirror.height;
            mirror.y = (baseY + apexY) / 2;  // Center between base and apex

            // Step 3: Align X so that BOTH base corners are on grid
            // For base corners (x - halfWidth) and (x + halfWidth) to be on grid,
            // x must be positioned such that halfWidth offsets land on grid intersections

            if (halfWidth % gridSize === 0) {
                // halfWidth is multiple of gridSize (20, 40, 60) - center on grid intersection
                mirror.x = Math.round(mirror.x / gridSize) * gridSize;
            } else {
                // halfWidth is NOT multiple of gridSize - need offset center
                const baseX = Math.round(mirror.x / gridSize) * gridSize;
                mirror.x = baseX + gridSize / 2;
            }
        } else if (rotation === 90 || rotation === 270) {
            // Vertical base

            // Step 1: Align base X coordinate to grid
            const baseX = Math.round((mirror.x + halfHeight) / gridSize) * gridSize;

            // Step 2: Calculate apex X from aligned base
            const apexX = baseX - mirror.height;
            mirror.x = (baseX + apexX) / 2;

            // Step 3: Align Y so that BOTH base corners are on grid
            if (halfWidth % gridSize === 0) {
                // halfWidth is multiple of gridSize - center on grid intersection
                mirror.y = Math.round(mirror.y / gridSize) * gridSize;
            } else {
                // halfWidth is NOT multiple of gridSize - need offset center
                const baseY = Math.round(mirror.y / gridSize) * gridSize;
                mirror.y = baseY + gridSize / 2;
            }
        }
    }

    /**
     * Align trapezoid: All 4 vertices must be on grid intersections
     */
    static alignTrapezoid(mirror, gridSize) {
        const halfHeight = mirror.height / 2;
        const bottomHalfWidth = mirror.width / 2;
        const topHalfWidth = mirror.topWidth / 2;
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            // Horizontal bases
            // Step 1: Align both Y edges to grid lines
            const bottomY = Math.round((mirror.y + halfHeight) / gridSize) * gridSize;
            const topY = Math.round((mirror.y - halfHeight) / gridSize) * gridSize;
            mirror.y = (bottomY + topY) / 2;

            // Step 2: Find X position where ALL 4 vertices land on grid intersections
            // We need to find an X where both bottom corners AND top corners are on grid
            let bestX = mirror.x;
            let bestError = Infinity;

            // Search around current X position
            const searchRadius = gridSize * 2;
            for (let testX = mirror.x - searchRadius; testX <= mirror.x + searchRadius; testX += gridSize / 4) {
                // Calculate all 4 vertex X positions
                const bottomLeft = testX - bottomHalfWidth;
                const bottomRight = testX + bottomHalfWidth;
                const topLeft = testX - topHalfWidth;
                const topRight = testX + topHalfWidth;

                // Calculate error (distance from nearest grid line)
                const bottomLeftError = Math.abs(bottomLeft - Math.round(bottomLeft / gridSize) * gridSize);
                const bottomRightError = Math.abs(bottomRight - Math.round(bottomRight / gridSize) * gridSize);
                const topLeftError = Math.abs(topLeft - Math.round(topLeft / gridSize) * gridSize);
                const topRightError = Math.abs(topRight - Math.round(topRight / gridSize) * gridSize);

                const totalError = bottomLeftError + bottomRightError + topLeftError + topRightError;

                if (totalError < bestError) {
                    bestError = totalError;
                    bestX = testX;
                }

                // If we found perfect alignment, stop searching
                if (totalError < 0.01) break;
            }

            mirror.x = bestX;
        } else if (rotation === 90 || rotation === 270) {
            // Vertical bases
            // Step 1: Align both X edges to grid lines
            const leftX = Math.round((mirror.x - halfHeight) / gridSize) * gridSize;
            const rightX = Math.round((mirror.x + halfHeight) / gridSize) * gridSize;
            mirror.x = (leftX + rightX) / 2;

            // Step 2: Find Y position where all vertices align
            let bestY = mirror.y;
            let bestError = Infinity;

            const searchRadius = gridSize * 2;
            for (let testY = mirror.y - searchRadius; testY <= mirror.y + searchRadius; testY += gridSize / 4) {
                const bottomTop = testY - bottomHalfWidth;
                const bottomBottom = testY + bottomHalfWidth;
                const topTop = testY - topHalfWidth;
                const topBottom = testY + topHalfWidth;

                const bottomTopError = Math.abs(bottomTop - Math.round(bottomTop / gridSize) * gridSize);
                const bottomBottomError = Math.abs(bottomBottom - Math.round(bottomBottom / gridSize) * gridSize);
                const topTopError = Math.abs(topTop - Math.round(topTop / gridSize) * gridSize);
                const topBottomError = Math.abs(topBottom - Math.round(topBottom / gridSize) * gridSize);

                const totalError = bottomTopError + bottomBottomError + topTopError + topBottomError;

                if (totalError < bestError) {
                    bestError = totalError;
                    bestY = testY;
                }

                if (totalError < 0.01) break;
            }

            mirror.y = bestY;
        }
    }

    /**
     * Align parallelogram: All 4 vertices must be on grid intersections
     */
    static alignParallelogram(mirror, gridSize) {
        const halfHeight = mirror.height / 2;
        const halfWidth = mirror.width / 2;
        const skew = mirror.skew || 20; // Default 20px skew
        const rotation = mirror.rotation || 0;

        if (rotation === 0 || rotation === 180) {
            // Horizontal orientation
            // Vertices (no rotation):
            // bottom-left: (x - halfWidth, y + halfHeight)
            // bottom-right: (x + halfWidth, y + halfHeight)
            // top-right: (x + halfWidth + skew, y - halfHeight)
            // top-left: (x - halfWidth + skew, y - halfHeight)

            // Step 1: Align both Y edges to grid lines
            const bottomY = Math.round((mirror.y + halfHeight) / gridSize) * gridSize;
            const topY = Math.round((mirror.y - halfHeight) / gridSize) * gridSize;
            mirror.y = (bottomY + topY) / 2;

            // Step 2: Find X where all 4 vertices land on grid
            // Since skew is 20 (= gridSize), if bottom-left is on grid, all should align
            const bottomLeftX = Math.round((mirror.x - halfWidth) / gridSize) * gridSize;
            mirror.x = bottomLeftX + halfWidth;
        } else if (rotation === 90 || rotation === 270) {
            // Vertical orientation
            // Step 1: Align both X edges to grid lines
            const leftX = Math.round((mirror.x - halfHeight) / gridSize) * gridSize;
            const rightX = Math.round((mirror.x + halfHeight) / gridSize) * gridSize;
            mirror.x = (leftX + rightX) / 2;

            // Step 2: Find Y where all vertices align
            const bottomLeftY = Math.round((mirror.y - halfWidth) / gridSize) * gridSize;
            mirror.y = bottomLeftY + halfWidth;
        }
    }

    /**
     * Verify that mirror is correctly aligned (for debugging)
     */
    static verifyAlignment(mirror) {
        const vertices = MirrorPlacementValidation.getMirrorVertices(mirror);
        const gridSize = CONFIG.GRID_SIZE;
        const tolerance = 0.01;

        const errors = [];

        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];
            const xRemainder = Math.abs(vertex.x % gridSize);
            const yRemainder = Math.abs(vertex.y % gridSize);

            const xAligned = xRemainder < tolerance || xRemainder > (gridSize - tolerance);
            const yAligned = yRemainder < tolerance || yRemainder > (gridSize - tolerance);

            if (!xAligned || !yAligned) {
                errors.push({
                    vertexIndex: i,
                    vertex,
                    xAligned,
                    yAligned,
                    xRemainder,
                    yRemainder
                });
            }
        }

        return {
            aligned: errors.length === 0,
            errors
        };
    }

    /**
     * Force align a mirror and verify it worked
     */
    static forceAlign(mirror) {
        this.enforceGridAlignment(mirror);
        const verification = this.verifyAlignment(mirror);

        if (!verification.aligned) {
            console.error('Grid alignment FAILED for mirror:', mirror);
            console.error('Alignment errors:', verification.errors);
            throw new Error(`Failed to align ${mirror.shape} mirror to grid`);
        }

        return mirror;
    }
}
