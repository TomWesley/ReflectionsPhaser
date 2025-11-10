import { CONFIG } from '../config.js';
import { SurfaceAreaManager } from '../validation/SurfaceAreaManager.js';
import { IronCladValidator } from '../validation/IronCladValidator.js';
import { GridAlignmentEnforcer } from '../validation/GridAlignmentEnforcer.js';
import { MirrorCreationHelper } from './MirrorCreationHelper.js';
import { MirrorPlacementHelper } from './MirrorPlacementHelper.js';
import { RigidSurfaceAreaGenerator } from '../validation/RigidSurfaceAreaGenerator.js';

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
     *
     * NEW RIGID APPROACH:
     * 1. Generate a configuration that is GUARANTEED to sum to exactly 84
     * 2. Try to place all mirrors from that configuration
     * 3. If placement fails, generate a NEW configuration and try again
     * 4. Never return partial configurations - always exactly 84
     */
    generateFreePlayMirrors(mirrors) {
        const maxConfigAttempts = 50; // Try many different configurations

        console.log(`🎯 Generating mirrors with RIGID 84 surface area requirement...`);

        for (let attempt = 0; attempt < maxConfigAttempts; attempt++) {
            mirrors.length = 0; // Clear previous attempt

            // Generate a NEW configuration that ALWAYS sums to exactly 84
            const mirrorConfigs = RigidSurfaceAreaGenerator.generateExact84Configuration();

            // VERIFY it's exactly 84 (should never fail, but double-check)
            const configTotal = RigidSurfaceAreaGenerator.calculateTotal(mirrorConfigs);
            if (configTotal !== 84) {
                console.error(`❌ CRITICAL BUG: RigidGenerator returned ${configTotal} instead of 84!`);
                console.error('This should be IMPOSSIBLE! Check RigidSurfaceAreaGenerator.');
                continue;
            }

            console.log(`🔄 Attempt ${attempt + 1}: Placing ${mirrorConfigs.length} mirrors (total: ${configTotal})...`);

            let allPlacedSuccessfully = true;

            // Try to place each mirror from this configuration
            for (let config of mirrorConfigs) {
                let mirror = this.createValidatedMirror(config, mirrors);
                if (mirror) {
                    mirrors.push(mirror);
                } else {
                    // Failed to place - will generate a different configuration next attempt
                    console.warn(`  ⚠️ Failed to place ${config.shape} (${config.surfaceArea})`);
                    allPlacedSuccessfully = false;
                    break;
                }
            }

            if (allPlacedSuccessfully) {
                // SUCCESS! Verify final surface area
                const totalSurfaceArea = SurfaceAreaManager.calculateTotalSurfaceArea(mirrors);
                console.log(`✅ Successfully placed ${mirrors.length} mirrors`);

                // CRITICAL VERIFICATION
                if (totalSurfaceArea !== 84) {
                    console.error(`❌❌❌ CRITICAL BUG: Placed mirrors sum to ${totalSurfaceArea} instead of 84!`);
                    console.error('Configs:', mirrorConfigs.map(m => `${m.shape}(${m.surfaceArea})`).join(', '));
                    console.error('Placed:', mirrors.map(m => `${m.shape}(${SurfaceAreaManager.calculateMirrorSurfaceArea(m)})`).join(', '));
                    continue;
                }

                // Final validation check
                console.log(`🔍 Running final validation on all ${mirrors.length} mirrors...`);
                let allValid = true;

                for (let i = 0; i < mirrors.length; i++) {
                    const mirror = mirrors[i];
                    const otherMirrors = mirrors.filter((m, idx) => idx !== i);
                    const validation = IronCladValidator.validateMirror(mirror, otherMirrors);

                    if (!validation.valid) {
                        console.error(`❌ Mirror ${i} failed validation`);
                        allValid = false;
                        break;
                    }
                }

                if (allValid) {
                    console.log(`✅✅✅ Configuration complete: ${mirrors.length} mirrors, EXACTLY 84 surface area`);
                    return mirrors;
                } else {
                    console.warn(`⚠️ Validation failed, generating new configuration...`);
                }
            }
        }

        // If we exhausted all attempts, use guaranteed fallback
        console.error(`❌ Could not place any configuration after ${maxConfigAttempts} attempts`);
        console.warn(`🔧 Using guaranteed-simple fallback...`);

        return this.generateGuaranteedFallback();
    }

    /**
     * Generate the simplest guaranteed-placeable fallback
     * Uses COMBINATION 10 from MirrorCombinations (28 + 28 + 28 = 84)
     * Only 3 large rectangles positioned safely away from all forbidden zones
     */
    generateGuaranteedFallback() {
        const mirrors = [];
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;

        // Use the simplest combination: 3 large rectangles (28 + 28 + 28 = 84)
        const safeConfigs = [
            {
                x: centerX - 160,
                y: centerY - 160,
                shape: 'rectangle',
                width: 120,
                height: 80,
                rotation: 0,
                surfaceArea: 28
            },
            {
                x: centerX + 160,
                y: centerY + 160,
                shape: 'rectangle',
                width: 120,
                height: 80,
                rotation: 90,
                surfaceArea: 28
            },
            {
                x: centerX + 160,
                y: centerY - 160,
                shape: 'rectangle',
                width: 120,
                height: 80,
                rotation: 0,
                surfaceArea: 28
            }
        ];

        console.log(`🔧 Generating guaranteed fallback: 3 rectangles in safe positions`);

        // Place each mirror at predefined safe locations
        for (let config of safeConfigs) {
            const mirror = MirrorCreationHelper.createMirror(config.x, config.y, config.shape);
            if (mirror) {
                MirrorCreationHelper.applyConfiguration(mirror, config, this.game);
                GridAlignmentEnforcer.enforceGridAlignment(mirror);
                this.game.safeUpdateVertices(mirror);

                // Validate this mirror
                const validation = IronCladValidator.validateMirror(mirror, mirrors);
                if (validation.valid) {
                    mirrors.push(mirror);
                    console.log(`  ✓ Placed ${mirror.shape} at (${mirror.x}, ${mirror.y})`);
                } else {
                    console.error(`  ❌ Fallback mirror failed validation!`);
                    console.error(`     R1: ${validation.rule1.valid ? '✓' : '✗'} R2: ${validation.rule2.valid ? '✓' : '✗'} R3: ${validation.rule3.valid ? '✓' : '✗'}`);
                }
            }
        }

        // Verify surface area
        const totalSurfaceArea = SurfaceAreaManager.calculateTotalSurfaceArea(mirrors);
        console.log(`✅ Fallback complete: ${mirrors.length} mirrors, surface area: ${totalSurfaceArea}`);

        if (totalSurfaceArea !== 84) {
            console.error(`❌ CRITICAL: Fallback has wrong surface area! ${totalSurfaceArea} !== 84`);
        }

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
                console.log(`✓ Created valid ${mirror.shape} mirror at (${mirror.x}, ${mirror.y}) [${existingMirrors.length} existing mirrors]`);
                return mirror;
            } else {
                // Log why it's invalid (but only occasionally to avoid spam)
                if (attempt % 20 === 0) {
                    console.log(`  Attempt ${attempt}: ${mirror.shape} at (${mirror.x}, ${mirror.y}) invalid - R1:${validation.rule1.valid ? '✓' : '✗'} R2:${validation.rule2.valid ? '✓' : '✗'} R3:${validation.rule3.valid ? '✓' : '✗'}`);
                }
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
