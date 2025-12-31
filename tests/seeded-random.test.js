/**
 * Tests for SeededRandom class
 * Ensures deterministic random generation for daily challenges
 */

import { describe, test, assert } from './run-tests.js';
import { SeededRandom } from '../js/validation/SeededRandom.js';

describe('SeededRandom', () => {
    test('Same seed produces same sequence', () => {
        const rng1 = new SeededRandom('2025-01-15');
        const rng2 = new SeededRandom('2025-01-15');

        const sequence1 = [rng1.next(), rng1.next(), rng1.next()];
        const sequence2 = [rng2.next(), rng2.next(), rng2.next()];

        assert.deepEqual(sequence1, sequence2, 'Same seed should produce identical sequences');
    });

    test('Different seeds produce different sequences', () => {
        const rng1 = new SeededRandom('2025-01-15');
        const rng2 = new SeededRandom('2025-01-16');

        const val1 = rng1.next();
        const val2 = rng2.next();

        assert.notEqual(val1, val2, 'Different seeds should produce different values');
    });

    test('nextInt produces integers in range', () => {
        const rng = new SeededRandom('test-seed');

        for (let i = 0; i < 100; i++) {
            const value = rng.nextInt(5, 10);
            assert.ok(value >= 5 && value <= 10, `nextInt(5, 10) should be in range [5, 10], got ${value}`);
            assert.ok(Number.isInteger(value), 'nextInt should produce integers');
        }
    });

    test('nextFloat produces floats in range', () => {
        const rng = new SeededRandom('test-seed');

        for (let i = 0; i < 100; i++) {
            const value = rng.nextFloat(0, 1);
            assert.ok(value >= 0 && value <= 1, `nextFloat(0, 1) should be in range [0, 1], got ${value}`);
        }
    });

    test('choice selects from array', () => {
        const rng = new SeededRandom('test-seed');
        const array = ['a', 'b', 'c', 'd'];

        for (let i = 0; i < 20; i++) {
            const choice = rng.choice(array);
            assert.ok(array.includes(choice), `choice should select from array, got ${choice}`);
        }
    });

    test('shuffle produces deterministic shuffles', () => {
        const rng1 = new SeededRandom('shuffle-test');
        const rng2 = new SeededRandom('shuffle-test');

        const array1 = [1, 2, 3, 4, 5];
        const array2 = [1, 2, 3, 4, 5];

        const shuffled1 = rng1.shuffle(array1);
        const shuffled2 = rng2.shuffle(array2);

        assert.deepEqual(shuffled1, shuffled2, 'Same seed should produce identical shuffles');
    });

    test('String seeds are converted to numbers', () => {
        const rng1 = new SeededRandom('daily-2025-01-15');
        const rng2 = new SeededRandom('daily-2025-01-15');

        assert.equal(rng1.next(), rng2.next(), 'String seeds should be converted consistently');
    });
});
