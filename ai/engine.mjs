/**
 * engine.mjs — thin headless wrapper around the game's deterministic physics core
 * (functions/js is the DOM-free shared simulation). Gives the AI three things:
 *   newBoard()                       -> a fresh main-game puzzle (inventory + 5 lasers)
 *   scoreGame(inventory, placements, spawners) -> authoritative survival time
 *   simulateTrace(...)               -> per-frame laser positions for replay
 * plus validity helpers (on-board, out of forbidden zones, non-overlapping).
 */
import { CONFIG } from '../functions/js/config.js';
import { generateMainPuzzle } from '../functions/js/core/PuzzleGenerator.js';
import {
    createMirrorFromConfig, buildSimulation, simulateSurvivalTime,
} from '../functions/js/core/Simulation.js';
import { SimpleValidator } from '../functions/js/validation/SimpleValidator.js';

export const W = CONFIG.CANVAS_WIDTH;
export const H = CONFIG.CANVAS_HEIGHT;
export const CENTER = { x: W / 2, y: H / 2 };
export const TARGET_RADIUS = CONFIG.TARGET_RADIUS;         // 50 — the kill circle
export const FORBID_RADIUS = CONFIG.CORE_EXCLUSION_RADIUS; // mirror-free zone around the core
export const EDGE = CONFIG.EDGE_MARGIN;                    // 40 — no mirrors past this from edges
export const MAX_TIME = CONFIG.MAX_GAME_TIME;              // 300 — perfect score

export function newBoard() {
    return generateMainPuzzle();
}

/** Merge fixed inventory (shape/size) with the AI's transform (x,y,rotation). */
export function toMirrorConfigs(inventory, placements) {
    return inventory.map((inv, i) => ({
        ...inv,
        x: placements[i].x,
        y: placements[i].y,
        rotation: placements[i].rotation || 0,
        isDailyChallenge: false,
    }));
}

export function buildMirror(inv, place) {
    return createMirrorFromConfig({
        ...inv, x: place.x, y: place.y, rotation: place.rotation || 0,
    });
}

/** Is a single mirror instance legal against a set of already-placed instances? */
export function mirrorValidAgainst(inst, others) {
    for (const v of inst.vertices) {
        if (v.x < 0 || v.x > W || v.y < 0 || v.y > H) return false;
    }
    return SimpleValidator.validateMirror(inst, others).valid;
}

/** Full-config validity (same checks the server's GameVerifier applies). */
export function placementValid(inventory, placements) {
    const mirrors = placements.map((p, i) => buildMirror(inventory[i], p));
    for (let i = 0; i < mirrors.length; i++) {
        for (const v of mirrors[i].vertices) {
            if (v.x < 0 || v.x > W || v.y < 0 || v.y > H) return false;
        }
        const others = mirrors.filter((_, j) => j !== i);
        if (!SimpleValidator.validateMirror(mirrors[i], others).valid) return false;
    }
    return true;
}

/** Authoritative survival time (seconds) — identical to server verification. */
export function scoreGame(inventory, placements, spawners) {
    return simulateSurvivalTime(toMirrorConfigs(inventory, placements), spawners);
}

/**
 * Replay trace: re-run the exact physics and record each laser's position at
 * `fps`, capped at `maxSeconds` of footage. Laser slots keep a stable index
 * (null once a laser leaves the field) so the gallery can animate them.
 * Returns static mirror polygons too. Survival time itself comes from scoreGame.
 */
export function simulateTrace(inventory, placements, spawners, { fps = 30, maxSeconds = 24 } = {}) {
    const cfgs = toMirrorConfigs(inventory, placements);
    const { mirrors, lasers, handler } = buildSimulation(cfgs, spawners);
    const dt = CONFIG.PHYSICS_DT;
    const stepEvery = Math.max(1, Math.round((1 / fps) / dt));
    const capSteps = Math.ceil(Math.min(maxSeconds, MAX_TIME) / dt);

    const mirrorPolys = mirrors.map(m => m.vertices.map(v => [Math.round(v.x), Math.round(v.y)]));
    const alive = lasers.map(() => true);
    const frames = [];
    let breached = false;

    for (let s = 0; s < capSteps; s++) {
        for (let i = 0; i < lasers.length; i++) {
            if (!alive[i]) continue;
            const laser = lasers[i];
            laser.update(dt);
            handler.checkAndHandleCollisions(laser, mirrors);
            if (handler.checkTargetCollision(laser)) { breached = true; }
            else if (handler.isOutOfBounds(laser)) { alive[i] = false; }
        }
        if (s % stepEvery === 0 || breached) {
            frames.push(lasers.map((l, i) => (alive[i] ? [Math.round(l.x), Math.round(l.y)] : null)));
        }
        if (breached) break;
    }
    return { mirrorPolys, frames, fps, breached };
}
