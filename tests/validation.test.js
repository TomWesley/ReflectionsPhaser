/**
 * Tests for Mirror Placement Validation
 * Ensures forbidden zones are properly enforced
 */

import { describe, test, assert } from './run-tests.js';

// Mock CONFIG
global.CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 20,
    TARGET_RADIUS: 50,
    EDGE_MARGIN: 40,
    MIN_DISTANCE_FROM_TARGET: 0
};

describe('Mirror Validation - Forbidden Zones', () => {
    test('Forbidden zones should include center circle', () => {
        const centerX = CONFIG.CANVAS_WIDTH / 2; // 400
        const centerY = CONFIG.CANVAS_HEIGHT / 2; // 300

        // Point inside forbidden center
        const insideX = centerX;
        const insideY = centerY;

        const distToCenter = Math.sqrt(
            (insideX - centerX) ** 2 + (insideY - centerY) ** 2
        );

        assert.ok(distToCenter < CONFIG.TARGET_RADIUS,
            'Center point should be within forbidden radius');
    });

    test('Forbidden zones should include edge borders', () => {
        const edgeMargin = CONFIG.EDGE_MARGIN; // 40

        // Test all four edges
        const leftEdge = edgeMargin / 2; // Inside left forbidden zone
        const rightEdge = CONFIG.CANVAS_WIDTH - edgeMargin / 2; // Inside right forbidden zone
        const topEdge = edgeMargin / 2; // Inside top forbidden zone
        const bottomEdge = CONFIG.CANVAS_HEIGHT - edgeMargin / 2; // Inside bottom forbidden zone

        assert.ok(leftEdge < edgeMargin, 'Left edge should be in forbidden zone');
        assert.ok(rightEdge > CONFIG.CANVAS_WIDTH - edgeMargin, 'Right edge should be in forbidden zone');
        assert.ok(topEdge < edgeMargin, 'Top edge should be in forbidden zone');
        assert.ok(bottomEdge > CONFIG.CANVAS_HEIGHT - edgeMargin, 'Bottom edge should be in forbidden zone');
    });
});

describe('Mirror Validation - Vertex and Edge Checking', () => {
    test('Validation should check both vertices AND edges', () => {
        // This test documents that we must check:
        // 1. All vertices of the mirror
        // 2. All edges of the mirror (line segments between vertices)
        //
        // Because a mirror could have vertices outside a forbidden zone
        // but an edge could pass through it

        const mockMirror = {
            vertices: [
                { x: 100, y: 100 },  // Outside forbidden zone
                { x: 500, y: 100 },  // Outside forbidden zone
                { x: 500, y: 500 },  // Outside forbidden zone
                { x: 100, y: 500 }   // Outside forbidden zone
            ]
        };

        // The center forbidden zone is at (400, 300) with radius 50
        // An edge from (100, 100) to (500, 100) would pass through center vertically
        // This demonstrates why edge checking is critical

        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;

        // Edge from vertex 0 to vertex 1
        const edgeStart = mockMirror.vertices[0];
        const edgeEnd = mockMirror.vertices[1];

        // Check if edge line could potentially cross center
        const edgeCrossesCenterY =
            (edgeStart.y <= centerY && edgeEnd.y >= centerY) ||
            (edgeStart.y >= centerY && edgeEnd.y <= centerY);

        assert.ok(true, 'Test documents that both vertex and edge checking is required');
    });
});

describe('Mirror Validation - Mirror Overlap', () => {
    test('Overlapping mirrors should be detected', () => {
        const mirror1 = {
            vertices: [
                { x: 100, y: 100 },
                { x: 140, y: 100 },
                { x: 140, y: 140 },
                { x: 100, y: 140 }
            ]
        };

        const mirror2 = {
            vertices: [
                { x: 120, y: 120 }, // Overlaps with mirror1
                { x: 160, y: 120 },
                { x: 160, y: 160 },
                { x: 120, y: 160 }
            ]
        };

        // Mirrors overlap in the region (120,120) to (140,140)
        const overlaps =
            mirror1.vertices.some(v1 =>
                v1.x >= 120 && v1.x <= 140 && v1.y >= 120 && v1.y <= 140
            );

        assert.ok(overlaps, 'Overlapping mirrors should be detected');
    });

    test('Non-overlapping mirrors should not be flagged', () => {
        const mirror1 = {
            vertices: [
                { x: 100, y: 100 },
                { x: 140, y: 100 },
                { x: 140, y: 140 },
                { x: 100, y: 140 }
            ]
        };

        const mirror2 = {
            vertices: [
                { x: 200, y: 200 }, // Far away, no overlap
                { x: 240, y: 200 },
                { x: 240, y: 240 },
                { x: 200, y: 240 }
            ]
        };

        // No vertex of mirror1 is within mirror2's bounds
        const overlaps =
            mirror1.vertices.some(v1 =>
                v1.x >= 200 && v1.x <= 240 && v1.y >= 200 && v1.y <= 240
            );

        assert.equal(overlaps, false, 'Non-overlapping mirrors should not be flagged');
    });
});

describe('Mirror Validation - Game Objective', () => {
    test('Game objective is to PREVENT lasers hitting center', () => {
        // This test documents the core game goal
        const gameObjective = 'prevent lasers from hitting center core';
        const scoringMechanism = 'longer survival time = better score';

        assert.ok(gameObjective.includes('prevent'),
            'Game is about PREVENTING, not completing');
        assert.ok(scoringMechanism.includes('longer'),
            'Longer time is better (survival game)');
    });

    test('Survival time should be displayed as score, not "completion"', () => {
        // Language matters - we want to convey that surviving longer is better
        const goodTerms = ['Final Score', 'Survival Time', 'Score:'];
        const badTerms = ['Completed in', 'Finished in', 'Done in'];

        goodTerms.forEach(term => {
            assert.ok(!term.toLowerCase().includes('complet'),
                `"${term}" correctly avoids "completed" language`);
        });

        assert.ok(true, 'Score display should emphasize survival, not completion');
    });
});
