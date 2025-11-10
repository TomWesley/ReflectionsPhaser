import { CONFIG } from '../config.js';
import { IronCladValidator } from '../validation/IronCladValidator.js';
import { GridAlignmentEnforcer } from '../validation/GridAlignmentEnforcer.js';

/**
 * MirrorDragAndSnapHandler
 *
 * Handles all drag-and-drop logic for mirrors, including:
 * - Finding valid snap positions when user releases drag
 * - Grid alignment enforcement
 * - Validation against other mirrors
 *
 * Goal: When user drops a mirror, it should snap to the NEAREST valid position
 * with minimal visual jump.
 */
export class MirrorDragAndSnapHandler {
    constructor(game) {
        this.game = game;
    }

    /**
     * Find the nearest valid position for a mirror after drag
     *
     * @param {Object} mirror - The mirror being dragged
     * @param {number} dropX - X pixel position where user released
     * @param {number} dropY - Y pixel position where user released
     * @returns {Object|null} - {x, y} of valid position, or null if none found
     */
    findNearestValidPosition(mirror, dropX, dropY) {
        console.log(`\n=== SIMPLIFIED: Testing drop position for ${mirror.shape} ===`);
        console.log(`Drop position: (${Math.round(dropX)}, ${Math.round(dropY)})`);

        // Get all other mirrors (exclude the one being dragged)
        const otherMirrors = this.game.mirrors.filter(m => m !== mirror);

        // SIMPLIFIED: Just try the exact drop position
        // No grid searching, no grid alignment - just test if this exact spot works
        const result = this._testPosition(mirror, dropX, dropY, otherMirrors);

        if (result) {
            console.log(`RESULT: Drop position is valid!`);
            return result;
        } else {
            console.log(`RESULT: Drop position is invalid (overlaps mirror or in forbidden zone)`);
            return null;
        }
    }

    /**
     * Test if a mirror can be placed at a specific position
     * SIMPLIFIED: Only checks overlap and forbidden zone (no grid alignment requirement)
     */
    _testPosition(originalMirror, px, py, otherMirrors) {
        // Create test mirror
        const testMirror = {
            ...originalMirror,
            x: px,
            y: py,
            isDragging: false,
            size: originalMirror.size,
            width: originalMirror.width,
            height: originalMirror.height,
            shape: originalMirror.shape,
            rotation: originalMirror.rotation,
            topWidth: originalMirror.topWidth,
            skew: originalMirror.skew
        };

        // TEMPORARILY DISABLED: Grid alignment enforcement
        // GridAlignmentEnforcer.enforceGridAlignment(testMirror);

        // Update vertices at the exact position
        this.game.safeUpdateVertices(testMirror);

        // Add getVertices method if needed
        if (!testMirror.getVertices) {
            testMirror.getVertices = function() {
                return this.vertices || [];
            };
        }

        // DEBUG: Log test mirror state
        const testVertices = testMirror.getVertices();
        console.log(`    Test mirror has ${testVertices.length} vertices:`);
        testVertices.forEach((v, i) => {
            const centerX = 400;
            const centerY = 300;
            const distToCenter = Math.sqrt((v.x - centerX) ** 2 + (v.y - centerY) ** 2);
            console.log(`      Vertex ${i}: (${v.x.toFixed(2)}, ${v.y.toFixed(2)}) - dist to center: ${distToCenter.toFixed(2)}px`);
        });

        // Validate ONLY Rule 2 (overlap) and Rule 3 (forbidden zone)
        // Rule 1 (grid alignment) is temporarily disabled
        const validation = IronCladValidator.validateMirror(testMirror, otherMirrors);

        const rule2Valid = validation.rule2.valid;
        const rule3Valid = validation.rule3.valid;

        console.log(`  Testing position (${px}, ${py}):`);
        console.log(`    Rule 2 (No overlap): ${rule2Valid ? 'PASS' : 'FAIL'}`);
        if (!rule2Valid) {
            console.log(`      ${validation.rule2.violations.length} overlap violations detected:`);
            validation.rule2.violations.forEach((v, i) => {
                console.log(`        ${i + 1}. ${v.type}: ${v.message}`);
                if (v.otherMirror) {
                    console.log(`           Other mirror: ${v.otherMirror.shape} at (${v.otherMirror.x}, ${v.otherMirror.y})`);
                }
            });
        }
        console.log(`    Rule 3 (No forbidden): ${rule3Valid ? 'PASS' : 'FAIL'}`);
        if (!rule3Valid) {
            console.log(`      ${validation.rule3.violations.length} forbidden zone violations detected:`);
            validation.rule3.violations.forEach((v, i) => {
                console.log(`        ${i + 1}. ${v.type}: ${v.message}`);
                if (v.vertex) {
                    console.log(`           Vertex at (${v.vertex.x}, ${v.vertex.y})`);
                    const centerX = 400;
                    const centerY = 300;
                    const distToCenter = Math.sqrt((v.vertex.x - centerX) ** 2 + (v.vertex.y - centerY) ** 2);
                    console.log(`           Distance to center: ${distToCenter.toFixed(2)}px (forbidden radius: 90px)`);
                }
            });
        }

        if (rule2Valid && rule3Valid) {
            console.log(`  VALID! Position accepted.`);
            return { x: testMirror.x, y: testMirror.y };
        }

        console.log(`  INVALID - position rejected`);
        return null;
    }

    /**
     * Generate grid cell candidates in order of distance from a starting grid cell
     */
    _generateGridCandidates(startGx, startGy, maxRadius) {
        const GRID = CONFIG.GRID_SIZE;
        const candidates = [];

        // First, try the exact grid cell
        candidates.push({
            gx: startGx,
            gy: startGy,
            px: startGx * GRID,
            py: startGy * GRID,
            gridDist: 0
        });

        // Then expand outward
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dgx = -radius; dgx <= radius; dgx++) {
                for (let dgy = -radius; dgy <= radius; dgy++) {
                    // Only check positions at this radius (perimeter of square)
                    if (Math.abs(dgx) !== radius && Math.abs(dgy) !== radius) {
                        continue;
                    }

                    const gx = startGx + dgx;
                    const gy = startGy + dgy;
                    const px = gx * GRID;
                    const py = gy * GRID;

                    // Skip out of bounds
                    if (px < 60 || px > CONFIG.CANVAS_WIDTH - 60 ||
                        py < 60 || py > CONFIG.CANVAS_HEIGHT - 60) {
                        continue;
                    }

                    const gridDist = Math.sqrt(dgx * dgx + dgy * dgy);
                    candidates.push({ gx, gy, px, py, gridDist });
                }
            }
        }

        // Sort by grid distance
        candidates.sort((a, b) => a.gridDist - b.gridDist);

        return candidates;
    }
}
