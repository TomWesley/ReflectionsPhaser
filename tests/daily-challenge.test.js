/**
 * Tests for Daily Challenge generation
 * Ensures date-based seeding produces consistent puzzles
 */

import { describe, test, assert } from './run-tests.js';
import { SeededRandom } from '../js/validation/SeededRandom.js';

// Mock localStorage for testing
global.localStorage = {
    storage: {},
    getItem(key) {
        return this.storage[key] || null;
    },
    setItem(key, value) {
        this.storage[key] = value;
    },
    removeItem(key) {
        delete this.storage[key];
    },
    clear() {
        this.storage = {};
    }
};

// Mock CONFIG
global.CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 20,
    TARGET_RADIUS: 50,
    EDGE_MARGIN: 40
};

import { DailyChallenge } from '../js/validation/DailyChallenge.js';

describe('DailyChallenge - Date-based Seeding', () => {
    test('Same date produces same puzzle seed', () => {
        const puzzle1 = DailyChallenge.generatePuzzle('2025-01-15');
        const puzzle2 = DailyChallenge.generatePuzzle('2025-01-15');

        assert.equal(puzzle1.mirrors.length, puzzle2.mirrors.length,
            'Same date should generate same number of mirrors');
        assert.equal(puzzle1.spawners.length, puzzle2.spawners.length,
            'Same date should generate same number of spawners');
    });

    test('Different dates produce different puzzles', () => {
        const puzzle1 = DailyChallenge.generatePuzzle('2025-01-15');
        const puzzle2 = DailyChallenge.generatePuzzle('2025-01-16');

        // At least one of these should be different for different dates
        const different =
            puzzle1.mirrors.length !== puzzle2.mirrors.length ||
            puzzle1.spawners.length !== puzzle2.spawners.length;

        assert.ok(different, 'Different dates should produce different puzzles');
    });

    test('Daily challenge has 3-12 mirrors (no surface area limit)', () => {
        const puzzle = DailyChallenge.generatePuzzle('2025-01-20');

        assert.ok(puzzle.mirrors.length >= 3,
            `Should have at least 3 mirrors, got ${puzzle.mirrors.length}`);
        assert.ok(puzzle.mirrors.length <= 12,
            `Should have at most 12 mirrors, got ${puzzle.mirrors.length}`);
    });

    test('Daily challenge has 6-10 spawners', () => {
        const puzzle = DailyChallenge.generatePuzzle('2025-01-20');

        assert.ok(puzzle.spawners.length >= 6,
            `Should have at least 6 spawners, got ${puzzle.spawners.length}`);
        assert.ok(puzzle.spawners.length <= 10,
            `Should have at most 10 spawners, got ${puzzle.spawners.length}`);
    });

    test('All mirrors are marked as daily challenge', () => {
        const puzzle = DailyChallenge.generatePuzzle('2025-01-20');

        for (const mirror of puzzle.mirrors) {
            assert.ok(mirror.isDailyChallenge,
                'All daily challenge mirrors should be marked with isDailyChallenge flag');
        }
    });

    test('All spawners are marked as daily challenge', () => {
        const puzzle = DailyChallenge.generatePuzzle('2025-01-20');

        for (const spawner of puzzle.spawners) {
            assert.ok(spawner.isDailyChallenge,
                'All daily challenge spawners should be marked with isDailyChallenge flag');
        }
    });

    test('getTodayString returns YYYY-MM-DD format', () => {
        const dateString = DailyChallenge.getTodayString();
        const regex = /^\d{4}-\d{2}-\d{2}$/;

        assert.ok(regex.test(dateString),
            `Date string should be in YYYY-MM-DD format, got ${dateString}`);
    });
});

describe('DailyChallenge - LocalStorage Persistence', () => {
    test('markCompleted saves to localStorage', () => {
        localStorage.clear();

        const mirrors = [{ x: 100, y: 100, shape: 'square', isDailyChallenge: true }];
        const lasers = [{ x: 50, y: 50, vx: 1, vy: 1, trail: [] }];

        DailyChallenge.markCompleted(10.5, '0:10.50', mirrors, lasers);

        const today = DailyChallenge.getTodayString();
        const completed = localStorage.getItem(`daily_challenge_${today}`);

        assert.equal(completed, 'true', 'Completion should be saved to localStorage');
    });

    test('markCompleted saves mirror positions', () => {
        localStorage.clear();

        const mirrors = [
            { x: 100, y: 100, shape: 'square', size: 40, width: 40, height: 40, rotation: 0 }
        ];
        const lasers = [];

        DailyChallenge.markCompleted(10.5, '0:10.50', mirrors, lasers);

        const today = DailyChallenge.getTodayString();
        const mirrorData = localStorage.getItem(`daily_mirrors_${today}`);

        assert.ok(mirrorData, 'Mirror data should be saved');

        const savedMirrors = JSON.parse(mirrorData);
        assert.equal(savedMirrors.length, 1, 'Should save one mirror');
        assert.equal(savedMirrors[0].x, 100, 'Mirror x position should be saved');
        assert.equal(savedMirrors[0].shape, 'square', 'Mirror shape should be saved');
    });

    test('markCompleted saves laser positions for freeze frame', () => {
        localStorage.clear();

        const mirrors = [];
        const lasers = [
            { x: 200, y: 300, vx: 2, vy: -1, trail: [{x: 190, y: 301}, {x: 195, y: 300.5}] }
        ];

        DailyChallenge.markCompleted(10.5, '0:10.50', mirrors, lasers);

        const today = DailyChallenge.getTodayString();
        const laserData = localStorage.getItem(`daily_lasers_${today}`);

        assert.ok(laserData, 'Laser data should be saved');

        const savedLasers = JSON.parse(laserData);
        assert.equal(savedLasers.length, 1, 'Should save one laser');
        assert.equal(savedLasers[0].x, 200, 'Laser x position should be saved');
        assert.ok(savedLasers[0].trail.length > 0, 'Laser trail should be saved');
    });

    test('hasCompletedToday returns correct status', () => {
        localStorage.clear();

        assert.equal(DailyChallenge.hasCompletedToday(), false,
            'Should return false when not completed');

        DailyChallenge.markCompleted(5.0, '0:05.00', [], []);

        assert.equal(DailyChallenge.hasCompletedToday(), true,
            'Should return true after completion');
    });
});
