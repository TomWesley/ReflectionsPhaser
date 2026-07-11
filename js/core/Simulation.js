/**
 * Simulation - the deterministic physics core, with NO DOM/canvas dependency.
 *
 * This module is the single source of truth for laser physics. It runs in three
 * places, all producing identical results for identical input:
 *   1. The live browser game loop (Game.update -> stepLasers).
 *   2. A headless run for testing (simulateSurvivalTime).
 *   3. Server-side score verification (Node / Cloud Function).
 *
 * Because the physics is a fixed-timestep, fully deterministic function of
 * (mirror placements, spawner positions/angles), the server can recompute a
 * player's authoritative survival time by replaying it here — no need to trust
 * the client's reported score.
 */
import { CONFIG } from '../config.js';
import { Laser } from '../classes/Laser.js';
import { CollisionSystem } from './CollisionSystem.js';
import { LaserCollisionHandler } from './LaserCollisionHandler.js';
import { MirrorFactory } from '../mirrors/MirrorFactory.js';

/**
 * Rebuild a mirror instance from a plain config object. Mirrors the exact
 * reconstruction the replay system uses (shape + size/width/height/rotation),
 * then recomputes the canonical vertices used for collision.
 */
export function createMirrorFromConfig(config) {
    const mirror = MirrorFactory.createMirror(config.x, config.y, config.shape);
    if (config.size !== undefined) mirror.size = config.size;
    if (config.width !== undefined) mirror.width = config.width;
    if (config.height !== undefined) mirror.height = config.height;
    if (config.rotation !== undefined) mirror.rotation = config.rotation;
    // Shape-specific dimensions (trapezoid/parallelogram) so every shape rebuilds exactly.
    if (config.topWidth !== undefined) mirror.topWidth = config.topWidth;
    if (config.skew !== undefined) mirror.skew = config.skew;
    mirror.isDailyChallenge = config.isDailyChallenge || false;
    mirror.updateVertices();
    return mirror;
}

/**
 * Assemble the full simulation state (mirrors, lasers, collision handler) from
 * plain config arrays.
 *   mirrorConfigs:  [{ x, y, shape, size, width, height, rotation, isDailyChallenge }]
 *   spawnerConfigs: [{ x, y, angle, isDailyChallenge }]
 */
export function buildSimulation(mirrorConfigs, spawnerConfigs) {
    const mirrors = mirrorConfigs.map(createMirrorFromConfig);

    const collisionSystem = new CollisionSystem();
    collisionSystem.initializeCollisionBoundaries(mirrors);

    const handler = new LaserCollisionHandler(collisionSystem);
    handler.initialize(mirrors);

    const lasers = spawnerConfigs.map(s => {
        const laser = new Laser(s.x, s.y, s.angle);
        laser.isDailyChallenge = !!s.isDailyChallenge;
        return laser;
    });

    return { mirrors, lasers, collisionSystem, handler };
}

/**
 * Advance every laser by ONE fixed physics step. Mutates the lasers array
 * (removing any that leave the field) and returns true if a laser reached the
 * core this step. This is the shared hot path: the live game loop and the
 * headless simulation both call it, so their physics can never diverge.
 */
export function stepLasers(lasers, mirrors, handler, dt) {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.update(dt);
        handler.checkAndHandleCollisions(laser, mirrors);

        if (handler.checkTargetCollision(laser)) {
            return true; // core breached
        }
        if (handler.isOutOfBounds(laser)) {
            lasers.splice(i, 1);
        }
    }
    return false;
}

/**
 * Run a full deterministic simulation and return the survival time in seconds
 * (the player's score). The loop ordering mirrors Game.update exactly: advance
 * the clock by one fixed step, honor the victory cap first (so you cannot lose
 * at exactly the cap), then step the lasers.
 *
 * Same inputs -> same score, on any V8 runtime (browser or server).
 */
export function simulateSurvivalTime(mirrorConfigs, spawnerConfigs) {
    const { mirrors, lasers, handler } = buildSimulation(mirrorConfigs, spawnerConfigs);
    const dt = CONFIG.PHYSICS_DT;
    const maxTime = CONFIG.MAX_GAME_TIME;

    // Safety bound: at most one step per physics tick up to the cap, plus margin.
    const maxSteps = Math.ceil(maxTime / dt) + 2;

    let gameTime = 0;
    for (let step = 0; step < maxSteps; step++) {
        gameTime += dt;
        if (gameTime >= maxTime) {
            return maxTime; // survived to the cap -> perfect score
        }
        if (stepLasers(lasers, mirrors, handler, dt)) {
            return gameTime; // core breached at this instant
        }
    }
    return maxTime;
}
