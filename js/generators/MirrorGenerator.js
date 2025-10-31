import { CONFIG } from '../config.js';
import { SurfaceAreaManager } from '../validation/SurfaceAreaManager.js';
import { IronCladValidator } from '../validation/IronCladValidator.js';
import { GridAlignmentEnforcer } from '../validation/GridAlignmentEnforcer.js';
import { MirrorCreationHelper } from './MirrorCreationHelper.js';
import { MirrorPlacementHelper } from './MirrorPlacementHelper.js';

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
            return this.generateDailyChallengeMirrors(mirrors);
        }

        return this.generateFreePlayMirrors(mirrors);
    }

    /**
     * Generate mirrors for daily challenge mode
     */
    generateDailyChallengeMirrors(mirrors) {
        const dailyPuzzle = this.game.modeManager.generateDailyPuzzle();

        for (let mirrorData of dailyPuzzle.mirrors) {
            let mirror = this.createValidatedMirror(mirrorData, mirrors);
            if (mirror) {
                mirrors.push(mirror);
            }
        }
        return mirrors;
    }

    /**
     * Generate mirrors for free play mode
     * CRITICAL: Must maintain exactly TARGET_SURFACE_AREA (84) for fair scoring
     */
    generateFreePlayMirrors(mirrors) {
        const maxConfigAttempts = 20; // Reasonable attempts to find a placeable configuration
        const startTime = Date.now();
        const maxTime = 5000; // 5 second timeout to prevent infinite loops

        for (let configAttempt = 0; configAttempt < maxConfigAttempts; configAttempt++) {
            // Safety timeout check
            if (Date.now() - startTime > maxTime) {
                console.error(`⏱️ TIMEOUT: Exceeded ${maxTime}ms trying to generate mirrors`);
                break;
            }

            mirrors.length = 0; // Clear any previous failed attempt
            const mirrorConfigs = SurfaceAreaManager.generateMirrorsWithTargetSurfaceArea();
            let allPlacedSuccessfully = true;

            console.log(`🔄 Config attempt ${configAttempt + 1}/${maxConfigAttempts}: Trying to place ${mirrorConfigs.length} mirrors...`);

            for (let config of mirrorConfigs) {
                let mirror = this.createValidatedMirror(config, mirrors);
                if (mirror) {
                    mirrors.push(mirror);
                } else {
                    // Failed to place this mirror - need to try a new configuration
                    console.warn(`⚠️ Failed to place ${config.shape} mirror (surface area: ${config.surfaceArea}) - ${mirrors.length}/${mirrorConfigs.length} placed`);
                    allPlacedSuccessfully = false;
                    break; // Stop trying this configuration
                }
            }

            if (allPlacedSuccessfully) {
                const totalSurfaceArea = SurfaceAreaManager.calculateTotalSurfaceArea(mirrors);
                console.log(`✅ Free play mirrors: ${mirrors.length}, total surface area: ${totalSurfaceArea} (config attempt ${configAttempt + 1})`);

                // CRITICAL: Verify we hit the target exactly
                if (totalSurfaceArea === SurfaceAreaManager.TARGET_SURFACE_AREA) {
                    // FINAL IRON-CLAD CHECK: Validate EVERY mirror before accepting this configuration
                    console.log(`🔍 Running final validation on all ${mirrors.length} mirrors...`);
                    let allValid = true;
                    for (let i = 0; i < mirrors.length; i++) {
                        const validation = IronCladValidator.validateMirror(mirrors[i], mirrors);
                        if (!validation.valid) {
                            console.error(`❌ Mirror ${i} (${mirrors[i].shape}) failed validation:`, validation.allViolations);
                            allValid = false;
                            break;
                        }
                    }

                    if (allValid) {
                        console.log(`✅ All mirrors validated successfully! Configuration is iron-clad.`);
                        return mirrors;
                    } else {
                        console.warn(`⚠️ Configuration had invalid mirrors, regenerating...`);
                        continue;
                    }
                } else {
                    console.error(`❌ CRITICAL: Surface area mismatch! Got ${totalSurfaceArea}, expected ${SurfaceAreaManager.TARGET_SURFACE_AREA}`);
                    // Try another configuration
                    continue;
                }
            } else {
                console.log(`⚠️ Configuration ${configAttempt + 1} failed after placing ${mirrors.length}/${mirrorConfigs.length} mirrors`);
            }
        }

        // If we get here, we failed to generate a valid configuration after all attempts
        console.error(`❌ CRITICAL: Failed to generate valid mirror configuration after ${maxConfigAttempts} attempts`);
        console.error(`❌ Returning partial configuration with ${mirrors.length} mirrors`);
        return mirrors;
    }

    /**
     * Create a validated mirror at a valid position
     */
    createValidatedMirror(config, existingMirrors) {
        const maxAttempts = 100; // Reduced to prevent long loops

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const pos = MirrorCreationHelper.generateRandomPosition();
            const mirror = MirrorCreationHelper.createMirror(pos.x, pos.y, config.shape);

            if (!mirror) {
                console.error('Failed to create mirror:', config.shape);
                continue;
            }

            MirrorCreationHelper.applyConfiguration(mirror, config, this.game);

            // IRON-CLAD STEP 1: Force grid alignment
            try {
                GridAlignmentEnforcer.enforceGridAlignment(mirror);
                this.game.safeUpdateVertices(mirror);
            } catch (error) {
                console.error('Failed to align mirror:', error);
                continue;
            }

            // IRON-CLAD STEP 2: Validate all 3 rules
            const validation = IronCladValidator.validateMirror(mirror, existingMirrors);

            if (validation.valid) {
                console.log(`✓ Created valid ${mirror.shape} mirror at (${mirror.x}, ${mirror.y})`);
                return mirror;
            }

            // Try to find nearby valid position
            const nearestValidPos = MirrorPlacementHelper.findNearestValidPositionIronClad(
                mirror,
                existingMirrors,
                this.game
            );

            if (nearestValidPos) {
                mirror.x = nearestValidPos.x;
                mirror.y = nearestValidPos.y;

                GridAlignmentEnforcer.enforceGridAlignment(mirror);
                this.game.safeUpdateVertices(mirror);

                const revalidation = IronCladValidator.validateMirror(mirror, existingMirrors);
                if (revalidation.valid) {
                    console.log(`✓ Created valid ${mirror.shape} mirror at adjusted (${mirror.x}, ${mirror.y})`);
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
}
