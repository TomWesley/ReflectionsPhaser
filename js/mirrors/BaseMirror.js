import { CONFIG } from '../config.js';
import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';

/**
 * Base class containing shared mirror functionality
 * Extracted from original Mirror.js without changing behavior
 */
export class BaseMirror {
    constructor(x, y, shapeType = null) {
        this.x = x;
        this.y = y;
        this.isDragging = false;

        // Randomly select shape and size (or use provided shape)
        this.shape = shapeType || this.getRandomShape();
        this.size = this.getRandomSize();

        // Set shape-specific properties (exact same logic as original)
        this.initializeShapeProperties();
        this.initializeRotation();
    }

    initializeShapeProperties() {
        if (this.shape === 'rectangle') {
            this.width = this.size;
            this.height = this.getRandomSize();
            // Ensure rectangle is actually rectangular
            while (this.height === this.width) {
                this.height = this.getRandomSize();
            }
        } else if (this.shape === 'trapezoid') {
            this.width = this.size;  // Bottom base
            this.height = this.getRandomSize();
            // Ensure topWidth is grid-aligned and creates symmetric trapezoid
            const gridSize = CONFIG.GRID_SIZE;
            const minTopWidth = gridSize; // At least 1 grid unit
            const maxReduction = Math.floor(this.width / gridSize) * gridSize / 2; // Half of bottom width max
            const reductions = [gridSize, gridSize * 2, gridSize * 3]; // 20, 40, 60px reductions
            const validReductions = reductions.filter(r => r <= maxReduction && this.width - r >= minTopWidth);
            const reduction = validReductions[Math.floor(Math.random() * validReductions.length)] || gridSize;
            this.topWidth = this.width - reduction;
        } else if (this.shape === 'parallelogram') {
            this.width = this.size;  // Base
            this.height = this.getRandomSize();
            this.skew = 20; // Default horizontal skew
        } else {
            this.width = this.size;
            this.height = this.size;
        }
    }

    initializeRotation() {
        // For triangles, trapezoids, and parallelograms, generate random rotation
        if (this.shape === 'rightTriangle' || this.shape === 'isoscelesTriangle' ||
            this.shape === 'trapezoid' || this.shape === 'parallelogram') {
            this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, or 270 degrees
        }
    }

    getRandomShape() {
        const shapes = ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle', 'trapezoid', 'parallelogram'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }

    getRandomSize() {
        const minSize = CONFIG.MIRROR_MIN_SIZE;
        const maxSize = CONFIG.MIRROR_MAX_SIZE;
        const gridIncrement = CONFIG.GRID_SIZE;

        // For triangles, use double increment to ensure proper grid alignment
        // Triangle vertices are at ±halfSize from center, so halfSize must be multiple of gridSize
        if (this.shape === 'rightTriangle' || this.shape === 'isoscelesTriangle') {
            const triangleIncrement = gridIncrement * 2; // 40px increments
            const triangleMinSize = 40; // Start at 40 so halfSize = 20 (aligns to grid)
            const triangleMaxSize = 80; // Keep reasonable max

            const numIncrements = Math.floor((triangleMaxSize - triangleMinSize) / triangleIncrement) + 1;
            const randomIncrement = Math.floor(Math.random() * numIncrements);
            return triangleMinSize + (randomIncrement * triangleIncrement);
        }

        // For squares and rectangles, use normal increment
        const numIncrements = Math.floor((maxSize - minSize) / gridIncrement) + 1;
        const randomIncrement = Math.floor(Math.random() * numIncrements);
        return minSize + (randomIncrement * gridIncrement);
    }
}