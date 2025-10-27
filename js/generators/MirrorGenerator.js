import { CONFIG } from '../config.js';
import { MirrorFactory } from '../mirrors/MirrorFactory.js';
import { SurfaceAreaManager } from '../utils/SurfaceAreaManager.js';
import { IronCladValidator } from '../utils/IronCladValidator.js';
import { GridAlignmentEnforcer } from '../utils/GridAlignmentEnforcer.js';
import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';

/**
 * MirrorGenerator - Handles mirror generation and placement
 * Responsibilities:
 * - Generating mirrors for free play mode
 * - Generating mirrors for daily challenge mode
 * - Validating mirror placement
 * - Finding valid positions for mirrors
 */
export class MirrorGenerator {
    constructor(game) {
        this.game = game;
    }

    /**
     * Generate all mirrors for the current game mode
     */
    generateMirrors() {
        const mirrors = [];

        if (this.game.modeManager.isDailyChallenge()) {
            // Generate daily challenge puzzle
            const dailyPuzzle = this.game.modeManager.generateDailyPuzzle();

            // Create mirrors from daily puzzle data and validate them
            for (let mirrorData of dailyPuzzle.mirrors) {
                let mirror = this.createValidatedMirror(mirrorData, mirrors);
                if (mirror) {
                    mirrors.push(mirror);
                }
            }
            return mirrors;
        }

        // Free play mode - use surface area management with validation
        const mirrorConfigs = SurfaceAreaManager.generateMirrorsWithTargetSurfaceArea();

        for (let config of mirrorConfigs) {
            let mirror = this.createValidatedMirror(config, mirrors);
            if (mirror) {
                mirrors.push(mirror);
            } else {
                // If we can't place this specific mirror config, try generating a replacement
                console.warn('Could not place mirror config, generating replacement:', config);
                mirror = this.generateReplacementMirror(config, mirrors);
                if (mirror) {
                    mirrors.push(mirror);
                }
            }
        }

        // Debug: Log total surface area
        const totalSurfaceArea = SurfaceAreaManager.calculateTotalSurfaceArea(mirrors);
        console.log(`Free play mirrors generated: ${mirrors.length} mirrors, total surface area: ${totalSurfaceArea} (target: ${SurfaceAreaManager.TARGET_SURFACE_AREA})`);

        return mirrors;
    }

    /**
     * Create a validated mirror at a valid position
     */
    createValidatedMirror(config, existingMirrors) {
        const center = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
        const maxAttempts = 200;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate position in ring around center
            const angle = Math.random() * Math.PI * 2;
            const distance = 140 + Math.random() * 180;
            let x = center.x + Math.cos(angle) * distance;
            let y = center.y + Math.sin(angle) * distance;

            // Create mirror with the correct shape type using factory directly
            const mirror = MirrorFactory.createMirror(x, y, config.shape);

            // Check if mirror was created successfully
            if (!mirror) {
                console.error('Failed to create mirror - null:', config.shape);
                continue;
            }

            // Override properties if they differ from defaults
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
                this.game.safeUpdateVertices(mirror);
            }

            // IRON-CLAD STEP 1: Force grid alignment
            try {
                GridAlignmentEnforcer.enforceGridAlignment(mirror);
                this.game.safeUpdateVertices(mirror);
                const verification = GridAlignmentEnforcer.verifyAlignment(mirror);
                if (!verification.aligned) {
                    console.warn('Mirror alignment not perfect, but continuing');
                }
            } catch (error) {
                console.error('Failed to align mirror:', error);
                continue;
            }

            // IRON-CLAD STEP 2: Validate all 3 rules
            const validation = IronCladValidator.validateMirror(mirror, existingMirrors);

            if (validation.valid) {
                const vertices = MirrorPlacementValidation.getMirrorVertices(mirror);
                console.log(`✓ Created valid ${mirror.shape} mirror at (${mirror.x}, ${mirror.y}) with ${vertices.length} vertices`);
                return mirror;
            }

            // If not valid, try to find a nearby valid position
            const nearestValidPos = this.findNearestValidPositionIronClad(mirror, existingMirrors);
            if (nearestValidPos) {
                mirror.x = nearestValidPos.x;
                mirror.y = nearestValidPos.y;

                // Force alignment again after position change
                GridAlignmentEnforcer.enforceGridAlignment(mirror);
                this.game.safeUpdateVertices(mirror);

                // Re-validate
                const revalidation = IronCladValidator.validateMirror(mirror, existingMirrors);
                if (revalidation.valid) {
                    console.log(`✓ Created valid ${mirror.shape} mirror at adjusted position (${mirror.x}, ${mirror.y})`);
                    return mirror;
                }
            }
        }

        console.warn(`✗ Failed to place ${config.shape} mirror after ${maxAttempts} attempts`);
        return null;
    }

    /**
     * Generate a simpler replacement mirror when original placement fails
     */
    generateReplacementMirror(originalConfig, existingMirrors) {
        const simpleMirrors = [
            { shape: 'square', size: 40, width: 40, height: 40, rotation: 0 },
            { shape: 'square', size: 60, width: 60, height: 60, rotation: 0 },
            { shape: 'rectangle', size: 60, width: 60, height: 40, rotation: 0 },
            { shape: 'rectangle', size: 60, width: 40, height: 60, rotation: 0 }
        ];

        for (let simpleConfig of simpleMirrors) {
            let mirror = this.createValidatedMirror(simpleConfig, existingMirrors);
            if (mirror) {
                console.log('Generated replacement mirror:', simpleConfig.shape);
                return mirror;
            }
        }

        return null;
    }

    /**
     * Find the nearest valid position for a mirror using iron-clad validation
     */
    findNearestValidPositionIronClad(mirror, existingMirrors) {
        const searchRadius = CONFIG.GRID_SIZE * 15;
        const step = CONFIG.GRID_SIZE;

        let bestPosition = null;
        let bestDistance = Infinity;

        for (let radius = 0; radius <= searchRadius; radius += step) {
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

            for (let pos of positions) {
                const testMirror = Object.create(Object.getPrototypeOf(mirror));
                Object.assign(testMirror, mirror);
                testMirror.x = pos.x;
                testMirror.y = pos.y;

                GridAlignmentEnforcer.enforceGridAlignment(testMirror);
                this.game.safeUpdateVertices(testMirror);

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
}
