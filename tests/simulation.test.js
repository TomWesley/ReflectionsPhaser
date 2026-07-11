/**
 * Tests for the headless deterministic simulation (js/core/Simulation.js).
 *
 * This is the foundation for server-side score verification: the physics must
 * (1) run with no DOM/canvas present, and (2) produce identical results for
 * identical input so the server can recompute a player's authoritative score.
 *
 * The fact that this file imports and runs the physics at all — in Node, with no
 * browser — is itself the proof that the simulation is DOM-free and portable.
 */

import { describe, test, assert } from './run-tests.js';
import { simulateSurvivalTime, buildSimulation } from '../js/core/Simulation.js';
import { CONFIG } from '../js/config.js';

describe('Simulation - headless execution & determinism', () => {
    const NO_MIRRORS = [];
    // Left-middle spawner aimed straight across at the core -> guaranteed breach.
    const DIRECT_HIT = [{ x: 100, y: 300, angle: 0 }];
    // Off-axis spawner firing straight up -> bounces vertically at x=100, which is
    // ~300px from the core; it can never enter the 50px target -> survives forever.
    const SAFE_BOUNCE = [{ x: 100, y: 50, angle: -Math.PI / 2 }];

    test('Physics runs headless in Node (no DOM dependency)', () => {
        const t = simulateSurvivalTime(NO_MIRRORS, DIRECT_HIT);
        assert.ok(typeof t === 'number' && !Number.isNaN(t), 'returns a numeric survival time');
    });

    test('Same input yields the EXACT same score across repeated runs', () => {
        const a = simulateSurvivalTime(NO_MIRRORS, DIRECT_HIT);
        const b = simulateSurvivalTime(NO_MIRRORS, DIRECT_HIT);
        const c = simulateSurvivalTime(NO_MIRRORS, DIRECT_HIT);
        assert.equal(a, b, 'run 1 === run 2');
        assert.equal(b, c, 'run 2 === run 3');
    });

    test('A laser aimed at the core breaches before the time cap', () => {
        const t = simulateSurvivalTime(NO_MIRRORS, DIRECT_HIT);
        assert.ok(
            t > 0 && t < CONFIG.MAX_GAME_TIME,
            `breach time (${t}s) is between 0 and the ${CONFIG.MAX_GAME_TIME}s cap`
        );
    });

    test('A laser that never reaches the core survives to the time cap', () => {
        const t = simulateSurvivalTime(NO_MIRRORS, SAFE_BOUNCE);
        assert.equal(t, CONFIG.MAX_GAME_TIME, `off-axis laser survives the full ${CONFIG.MAX_GAME_TIME}s`);
    });

    test('Mirrors are part of the simulation (a mirror in the path changes the outcome)', () => {
        const withoutMirror = simulateSurvivalTime([], DIRECT_HIT);
        const withMirror = simulateSurvivalTime(
            [{ x: 250, y: 300, shape: 'square', size: 40, width: 40, height: 40, rotation: 0 }],
            DIRECT_HIT
        );
        assert.notEqual(withMirror, withoutMirror, 'a mirror in the laser path changes the survival time');
    });

    test('buildSimulation reconstructs mirrors and lasers from plain config', () => {
        const { mirrors, lasers } = buildSimulation(
            [{ x: 250, y: 300, shape: 'square', size: 40, width: 40, height: 40, rotation: 0 }],
            DIRECT_HIT
        );
        assert.equal(mirrors.length, 1, 'one mirror built');
        assert.ok(mirrors[0].vertices.length >= 3, 'mirror has canonical vertices for collision');
        assert.equal(lasers.length, 1, 'one laser built from the spawner');
    });
});
