/**
 * Tests for MirrorEdgeSnapping system
 *
 * Verifies edge snapping across all mirror types, outward normal computation
 * regardless of vertex winding order, and correct flush placement.
 */

import { assert, describe, test } from './run-tests.js';
import { MirrorEdgeSnapping } from '../js/systems/MirrorEdgeSnapping.js';

// ── Mock mirror factory ──────────────────────────────────────────────────

function makeMirror(x, y, vertices) {
    return {
        x, y,
        vertices: vertices.map(v => ({ x: v[0], y: v[1] })),
        rotation: 0
    };
}

function makeSquare(cx, cy, halfSize, rotation = 0) {
    const hs = halfSize;
    let verts = [
        [cx - hs, cy - hs],
        [cx + hs, cy - hs],
        [cx + hs, cy + hs],
        [cx - hs, cy + hs]
    ];
    if (rotation) {
        const rad = rotation * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        verts = verts.map(([vx, vy]) => {
            const dx = vx - cx, dy = vy - cy;
            return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
        });
    }
    const m = makeMirror(cx, cy, verts);
    m.rotation = rotation;
    m.shape = 'square';
    m.size = halfSize * 2;
    return m;
}

// Isosceles triangle — CCW winding in screen coords (matches game code)
function makeIsoscelesTriangle(cx, cy, halfSize, rotation = 0) {
    let verts = [
        [cx, cy - halfSize],
        [cx - halfSize, cy + halfSize],
        [cx + halfSize, cy + halfSize]
    ];
    if (rotation) {
        const rad = rotation * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        verts = verts.map(([vx, vy]) => {
            const dx = vx - cx, dy = vy - cy;
            return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
        });
    }
    const m = makeMirror(cx, cy, verts);
    m.rotation = rotation;
    m.shape = 'isoscelesTriangle';
    m.size = halfSize * 2;
    return m;
}

// Right triangle — CW winding (matches game code)
function makeRightTriangle(cx, cy, halfSize, rotation = 0) {
    let verts = [
        [cx - halfSize, cy + halfSize],
        [cx + halfSize, cy + halfSize],
        [cx - halfSize, cy - halfSize]
    ];
    if (rotation) {
        const rad = rotation * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        verts = verts.map(([vx, vy]) => {
            const dx = vx - cx, dy = vy - cy;
            return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
        });
    }
    const m = makeMirror(cx, cy, verts);
    m.rotation = rotation;
    m.shape = 'rightTriangle';
    m.size = halfSize * 2;
    return m;
}

function makeHexagon(cx, cy, radius) {
    const verts = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 90) * Math.PI / 180;
        verts.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
    const m = makeMirror(cx, cy, verts);
    m.shape = 'hexagon';
    m.size = radius * 2;
    return m;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('MirrorEdgeSnapping - Outward Normal Computation', () => {
    test('Square (CW winding) normals', () => {
        const sq = makeSquare(200, 200, 20);
        const edges = MirrorEdgeSnapping.getEdges(sq);
        const topN = MirrorEdgeSnapping.outwardNormal(edges[0]);
        const rightN = MirrorEdgeSnapping.outwardNormal(edges[1]);
        const bottomN = MirrorEdgeSnapping.outwardNormal(edges[2]);
        const leftN = MirrorEdgeSnapping.outwardNormal(edges[3]);
        assert.ok(topN.y < -0.5, 'Top normal points up');
        assert.ok(rightN.x > 0.5, 'Right normal points right');
        assert.ok(bottomN.y > 0.5, 'Bottom normal points down');
        assert.ok(leftN.x < -0.5, 'Left normal points left');
    });

    test('Isosceles triangle (CCW winding) normals', () => {
        const tri = makeIsoscelesTriangle(200, 200, 20);
        const edges = MirrorEdgeSnapping.getEdges(tri);
        for (let i = 0; i < 3; i++) {
            const n = MirrorEdgeSnapping.outwardNormal(edges[i]);
            const mid = MirrorEdgeSnapping.midpoint(edges[i]);
            const toCenter = { x: tri.x - mid.x, y: tri.y - mid.y };
            const dot = n.x * toCenter.x + n.y * toCenter.y;
            assert.ok(dot < 0, `Triangle edge ${i} normal points outward`);
        }
    });

    test('Right triangle normals', () => {
        const tri = makeRightTriangle(200, 200, 20);
        const edges = MirrorEdgeSnapping.getEdges(tri);
        // Edge 0: bottom, normal should point down (y > 0)
        const n0 = MirrorEdgeSnapping.outwardNormal(edges[0]);
        assert.ok(n0.y > 0.5, 'Right tri bottom normal points down');
        // Edge 1: hypotenuse (220,220)→(180,180), center is ON this edge.
        // Normal should point upper-right (away from right angle at bottom-left)
        const n1 = MirrorEdgeSnapping.outwardNormal(edges[1]);
        assert.ok(n1.x > 0.5, 'Right tri hypotenuse normal points right (away from right angle)');
        // Edge 2: left side, normal should point left (x < 0)
        const n2 = MirrorEdgeSnapping.outwardNormal(edges[2]);
        assert.ok(n2.x < -0.5, 'Right tri left normal points left');
    });

    test('Hexagon normals', () => {
        const hex = makeHexagon(300, 300, 20);
        const edges = MirrorEdgeSnapping.getEdges(hex);
        for (let i = 0; i < 6; i++) {
            const n = MirrorEdgeSnapping.outwardNormal(edges[i]);
            const mid = MirrorEdgeSnapping.midpoint(edges[i]);
            const toCenter = { x: hex.x - mid.x, y: hex.y - mid.y };
            const dot = n.x * toCenter.x + n.y * toCenter.y;
            assert.ok(dot < 0, `Hexagon edge ${i} normal points outward`);
        }
    });
});

describe('MirrorEdgeSnapping - Square-to-Square Snap', () => {
    test('Adjacent squares: finds match', () => {
        const sqA = makeSquare(200, 200, 20);
        const sqB = makeSquare(250, 200, 20);
        const match = MirrorEdgeSnapping.findBestMatch(sqB, [sqA]);
        assert.ok(match !== null, 'Finds matching edge pair');
    });

    test('Adjacent squares: correct flush gap', () => {
        const sqA = makeSquare(200, 200, 20);
        const sqB = makeSquare(245, 200, 20);
        const snap = MirrorEdgeSnapping.calculatePerpendicularSnap(sqB, [sqA]);
        assert.ok(snap !== null, 'Calculates snap');
        const newBLeftEdge = 225 + snap.offsetX;
        assert.ok(Math.abs(newBLeftEdge - 220.5) < 0.2, 'Gap is ~0.5px');
    });

    test('Far apart squares: no snap', () => {
        const sqA = makeSquare(200, 200, 20);
        const sqB = makeSquare(300, 200, 20);
        const match = MirrorEdgeSnapping.findBestMatch(sqB, [sqA]);
        assert.ok(match === null, 'No snap when far apart');
    });

    test('Snap produces rendering segments', () => {
        const sqA = makeSquare(200, 200, 20);
        const sqB = makeSquare(245, 200, 20);
        const snap = MirrorEdgeSnapping.calculatePerpendicularSnap(sqB, [sqA]);
        assert.ok(snap !== null, 'Snap exists');
        assert.ok(snap.snappedEdges.length > 0, 'Has snapped edge segments');
    });

    test('Vertical snap: correct gap', () => {
        const sqA = makeSquare(200, 200, 20);
        const sqB = makeSquare(200, 248, 20);
        const snap = MirrorEdgeSnapping.calculatePerpendicularSnap(sqB, [sqA]);
        assert.ok(snap !== null, 'Vertical snap works');
        const newBTopEdge = 228 + snap.offsetY;
        assert.ok(Math.abs(newBTopEdge - 220.5) < 0.2, 'Vertical gap is ~0.5px');
    });
});

describe('MirrorEdgeSnapping - Anti-parallel Safety', () => {
    test('Overlapping centers: does not create overlap', () => {
        const sqA = makeSquare(200, 200, 20);
        const sqB = makeSquare(205, 200, 20);
        const match = MirrorEdgeSnapping.findBestMatch(sqB, [sqA]);
        if (match) {
            const snap = MirrorEdgeSnapping.calculatePerpendicularSnap(sqB, [sqA]);
            if (snap) {
                const bLeftX = (sqB.x - 20) + snap.offsetX;
                assert.ok(bLeftX >= 219, 'B ends up outside A, not overlapping');
            }
        } else {
            assert.ok(true, 'No snap for overlapping mirrors (correct)');
        }
    });
});

describe('MirrorEdgeSnapping - Cross-Shape Snapping', () => {
    test('Square to isosceles triangle bottom', () => {
        const tri = makeIsoscelesTriangle(200, 200, 20);
        const sq = makeSquare(200, 248, 20);
        const match = MirrorEdgeSnapping.findBestMatch(sq, [tri]);
        assert.ok(match !== null, 'Square snaps to triangle bottom');
        assert.ok(Math.abs(match.rotationDelta) < 2, 'Minimal rotation for aligned edges');
    });

    test('Square to right triangle bottom', () => {
        const rt = makeRightTriangle(200, 200, 20);
        const sq = makeSquare(200, 248, 20);
        const match = MirrorEdgeSnapping.findBestMatch(sq, [rt]);
        assert.ok(match !== null, 'Square snaps to right triangle bottom');
    });

    test('Two hexagons with parallel edges', () => {
        const hexA = makeHexagon(200, 200, 20);
        const hexB = makeHexagon(240, 200, 20);
        const match = MirrorEdgeSnapping.findBestMatch(hexB, [hexA]);
        assert.ok(match !== null, 'Hexagons snap on parallel edges');
    });

    test('Square to hexagon vertical edge', () => {
        const hex = makeHexagon(200, 200, 20);
        // Hex edge 1 is vertical at x≈217.3 (from y=190 to y=210)
        // Place square to the right with a vertical edge nearby
        const sq = makeSquare(240, 200, 15);
        const match = MirrorEdgeSnapping.findBestMatch(sq, [hex]);
        // Square left edge is vertical — should snap to hex's vertical edge
        assert.ok(match !== null, 'Square snaps to hexagon vertical edge');
    });
});

describe('MirrorEdgeSnapping - Rotation Alignment', () => {
    test('5-degree misalignment: corrects rotation', () => {
        const sqA = makeSquare(200, 200, 20, 0);
        const sqB = makeSquare(248, 200, 20, 5);
        const match = MirrorEdgeSnapping.findBestMatch(sqB, [sqA]);
        assert.ok(match !== null, 'Snaps with 5-degree misalignment');
        assert.ok(Math.abs(match.rotationDelta) > 2, 'Provides non-zero rotation correction');
    });

    test('9-degree misalignment: within threshold', () => {
        const sqA = makeSquare(200, 200, 20, 0);
        const sqB = makeSquare(248, 200, 20, 9);
        const match = MirrorEdgeSnapping.findBestMatch(sqB, [sqA]);
        assert.ok(match !== null, 'Snaps at 9 degrees');
    });

    test('11-degree misalignment: beyond threshold', () => {
        const sqA = makeSquare(200, 200, 20, 0);
        const sqB = makeSquare(248, 200, 20, 11);
        const match = MirrorEdgeSnapping.findBestMatch(sqB, [sqA]);
        assert.ok(match === null, 'Does NOT snap beyond 10-degree threshold');
    });
});
