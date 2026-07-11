/**
 * GameVerifier - server-authoritative game verification (DOM-free).
 *
 * Given the puzzle the SERVER issued (fixed mirror inventory + spawners) and the
 * player's submitted mirror placements, this recomputes the authoritative score
 * from scratch. The client's reported score is never trusted.
 *
 * The client may only MOVE and ROTATE the issued mirrors — it cannot add, remove,
 * or resize them (the inventory is fixed by the server), and every placement must
 * be legal (on the board, out of the protected center, non-overlapping). Anything
 * else is rejected. This runs identically in the browser and on the server.
 */
import { CONFIG } from '../config.js';
import { simulateSurvivalTime, createMirrorFromConfig } from './Simulation.js';
import { SimpleValidator } from '../validation/SimpleValidator.js';

/**
 * @param {Object} puzzle    { mode, mirrorInventory: [{shape,size,width,height}], spawners: [{x,y,angle}] }
 * @param {Array}  placements [{ x, y, rotation }] — same length/order as mirrorInventory
 * @returns {{ valid: boolean, score?: number, reason?: string }}
 */
export function verifyGame(puzzle, placements) {
    const inventory = (puzzle && puzzle.mirrorInventory) || [];
    const spawners = (puzzle && puzzle.spawners) || [];

    // The submission must move exactly the mirrors that were issued — no more, no fewer.
    if (!Array.isArray(placements) || placements.length !== inventory.length) {
        return { valid: false, reason: 'Placement count does not match the issued mirrors' };
    }

    // Rebuild each mirror from the SERVER-issued shape/size + the CLIENT-supplied transform.
    const mirrorConfigs = inventory.map((inv, i) => ({
        shape: inv.shape,
        size: inv.size,
        width: inv.width,
        height: inv.height,
        x: placements[i].x,
        y: placements[i].y,
        rotation: placements[i].rotation || 0,
        isDailyChallenge: puzzle.mode === 'daily',
    }));

    // Guard against non-finite / garbage transforms before building geometry.
    for (const c of mirrorConfigs) {
        if (![c.x, c.y, c.rotation].every(Number.isFinite)) {
            return { valid: false, reason: 'A mirror placement has invalid coordinates' };
        }
    }

    const mirrors = mirrorConfigs.map(createMirrorFromConfig);

    // Every placement must be on the board, clear of forbidden zones, and non-overlapping.
    for (let i = 0; i < mirrors.length; i++) {
        for (const v of mirrors[i].vertices) {
            if (v.x < 0 || v.x > CONFIG.CANVAS_WIDTH || v.y < 0 || v.y > CONFIG.CANVAS_HEIGHT) {
                return { valid: false, reason: 'A mirror is placed off the board' };
            }
        }
        const others = mirrors.filter((_, j) => j !== i);
        const result = SimpleValidator.validateMirror(mirrors[i], others);
        if (!result.valid) {
            return { valid: false, reason: result.reason || 'Illegal mirror placement' };
        }
    }

    // Recompute the authoritative survival time from the verified board.
    const score = simulateSurvivalTime(mirrorConfigs, spawners);
    return { valid: true, score };
}
