/**
 * PuzzleGenerator - headless, server-side puzzle generation (no DOM).
 *
 * The server generates the puzzle so a cheater can't hand-pick a trivially easy
 * board. It reuses the exact same generators the game uses (guaranteeing a valid
 * 84-surface-area main-game board with inbound spawners), driven by a tiny stub
 * in place of the live Game object.
 *
 * Output shape (consumed by the client to render, and by GameVerifier to check):
 *   {
 *     mode: 'main',
 *     mirrors:         [{ shape, size, width, height, rotation, x, y, ... }],  // initial layout
 *     mirrorInventory: [{ shape, size, width, height, ... }],                  // shapes/sizes only
 *     spawners:        [{ x, y, angle }],
 *   }
 * The client may reposition/rotate `mirrors`; the server verifies the final
 * placements against `mirrorInventory` (so mirrors can't be added or resized).
 */
import { MirrorGenerator } from '../generators/MirrorGenerator.js';
import { SpawnerGenerator } from '../generators/SpawnerGenerator.js';
import { DailyChallenge } from '../validation/DailyChallenge.js';

// The generators only need one thing from the game object: a safe vertex update.
const STUB_GAME = {
    safeUpdateVertices(mirror) {
        if (typeof mirror.updateVertices === 'function') mirror.updateVertices();
    },
};

// Copy a mirror's shape + all dimension params (no placement) — the fixed inventory.
function toInventory(mirror) {
    const inv = { shape: mirror.shape };
    for (const key of ['size', 'width', 'height', 'topWidth', 'skew']) {
        if (mirror[key] !== undefined) inv[key] = mirror[key];
    }
    return inv;
}

// Copy a mirror's inventory plus its initial placement — what the client renders.
function toMirrorConfig(mirror) {
    return { ...toInventory(mirror), x: mirror.x, y: mirror.y, rotation: mirror.rotation || 0 };
}

/**
 * Generate a fresh main-game puzzle (84 surface-area board + 5 inbound spawners).
 */
export function generateMainPuzzle() {
    const mirrors = new MirrorGenerator(STUB_GAME).generateMirrors();
    const spawners = new SpawnerGenerator(STUB_GAME).generateSpawners();

    return {
        mode: 'main',
        mirrors: mirrors.map(toMirrorConfig),
        mirrorInventory: mirrors.map(toInventory),
        spawners: spawners.map(s => ({ x: s.x, y: s.y, angle: s.angle })),
    };
}

/**
 * Today's daily puzzle. Date-seeded, so every player gets the same board and the
 * server can regenerate it. Daily mirror configs carry shape + dimensions but no
 * initial position (the client lays them out); verification only needs the fixed
 * inventory, so that's all we pin down here.
 */
export function generateDailyPuzzle() {
    const config = DailyChallenge.generateDailyConfig();
    return {
        mode: 'daily',
        dailyDate: DailyChallenge.getTodayString(),
        theme: config.theme,
        mirrors: config.mirrors.map(m => ({ ...m })),   // client renders these
        mirrorInventory: config.mirrors.map(toInventory),
        spawners: config.spawners.map(s => ({ x: s.x, y: s.y, angle: s.angle })),
    };
}
