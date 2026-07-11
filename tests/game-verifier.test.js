/**
 * Tests for server-authoritative game verification (js/core/GameVerifier.js).
 *
 * These prove the anti-cheat core: the server recomputes the score from the
 * issued puzzle + submitted placements, and rejects submissions that add mirrors,
 * resize them, or place them illegally.
 */

import { describe, test, assert } from './run-tests.js';
import { verifyGame } from '../js/core/GameVerifier.js';

// A server-issued puzzle: two 40px square mirrors + one spawner aimed at the core.
const PUZZLE = {
    mode: 'main',
    mirrorInventory: [
        { shape: 'square', size: 40, width: 40, height: 40 },
        { shape: 'square', size: 40, width: 40, height: 40 },
    ],
    spawners: [{ x: 100, y: 300, angle: 0 }],
};

// Legal placements: both mirrors well inside the board, apart, clear of the core.
const GOOD = [
    { x: 200, y: 150, rotation: 0 },
    { x: 600, y: 450, rotation: 0 },
];

describe('GameVerifier - server-authoritative scoring & anti-cheat', () => {
    test('A valid submission returns a positive authoritative score', () => {
        const r = verifyGame(PUZZLE, GOOD);
        assert.ok(r.valid, `should be valid (${r.reason || 'ok'})`);
        assert.ok(typeof r.score === 'number' && r.score > 0, 'has a positive numeric score');
    });

    test('The recomputed score is deterministic', () => {
        const a = verifyGame(PUZZLE, GOOD);
        const b = verifyGame(PUZZLE, GOOD);
        assert.equal(a.score, b.score, 'same submission -> same score');
    });

    test('Rejects adding mirrors that were not issued', () => {
        const extra = [...GOOD, { x: 400, y: 100, rotation: 0 }];
        assert.ok(!verifyGame(PUZZLE, extra).valid, 'extra mirror rejected');
    });

    test('Rejects a mirror placed on the protected core', () => {
        const onCore = [{ x: 400, y: 300, rotation: 0 }, { x: 600, y: 450, rotation: 0 }];
        assert.ok(!verifyGame(PUZZLE, onCore).valid, 'mirror on the core rejected');
    });

    test('Rejects overlapping mirrors', () => {
        const overlap = [{ x: 300, y: 300, rotation: 0 }, { x: 305, y: 300, rotation: 0 }];
        assert.ok(!verifyGame(PUZZLE, overlap).valid, 'overlapping mirrors rejected');
    });

    test('Rejects a mirror placed off the board', () => {
        const offBoard = [{ x: 5000, y: 300, rotation: 0 }, { x: 600, y: 450, rotation: 0 }];
        assert.ok(!verifyGame(PUZZLE, offBoard).valid, 'off-board mirror rejected');
    });

    test('Rejects garbage coordinates (NaN/Infinity)', () => {
        const junk = [{ x: NaN, y: 300, rotation: 0 }, { x: 600, y: 450, rotation: 0 }];
        assert.ok(!verifyGame(PUZZLE, junk).valid, 'non-finite coordinates rejected');
    });
});
