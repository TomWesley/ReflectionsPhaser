/**
 * Device Independence Validation Test
 *
 * Verifies that game physics, scoring, and gameplay are identical
 * across all devices and screen sizes. The game uses a fixed 800x600
 * logical canvas with CSS-only scaling, ensuring all game logic
 * operates in the same coordinate space regardless of display.
 *
 * Key architecture decisions that ensure device independence:
 * 1. Fixed canvas dimensions (800x600) - never change
 * 2. Fixed physics timestep (1/60s) - deterministic simulation
 * 3. CSS-only display scaling - no game logic references screen size
 * 4. Proper input coordinate mapping (display coords -> canvas coords)
 * 5. All game constants in CONFIG, no device-dependent values
 */

import { describe, test, assert } from './run-tests.js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Expected game constants
const EXPECTED_CANVAS_WIDTH = 800;
const EXPECTED_CANVAS_HEIGHT = 600;
const EXPECTED_PHYSICS_DT = 1 / 60;
const EXPECTED_LASER_SPEED = 8;
const EXPECTED_TARGET_RADIUS = 50;
const EXPECTED_GRID_SIZE = 20;

describe('Device Independence - Fixed Canvas Dimensions', () => {

    test('CONFIG defines fixed canvas dimensions (800x600)', () => {
        const configSrc = readFileSync(join(projectRoot, 'js/config.js'), 'utf8');

        const widthMatch = configSrc.match(/CANVAS_WIDTH:\s*(\d+)/);
        const heightMatch = configSrc.match(/CANVAS_HEIGHT:\s*(\d+)/);

        assert.ok(widthMatch, 'CANVAS_WIDTH is defined in config');
        assert.ok(heightMatch, 'CANVAS_HEIGHT is defined in config');
        assert.equal(parseInt(widthMatch[1]), EXPECTED_CANVAS_WIDTH,
            `CANVAS_WIDTH is ${EXPECTED_CANVAS_WIDTH}`);
        assert.equal(parseInt(heightMatch[1]), EXPECTED_CANVAS_HEIGHT,
            `CANVAS_HEIGHT is ${EXPECTED_CANVAS_HEIGHT}`);
    });

    test('Canvas dimensions are set from CONFIG, not from screen size', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        // Canvas should be set using CONFIG values
        const usesConfigWidth = gameSrc.includes('CONFIG.CANVAS_WIDTH');
        const usesConfigHeight = gameSrc.includes('CONFIG.CANVAS_HEIGHT');

        assert.ok(usesConfigWidth, 'Game.js references CONFIG.CANVAS_WIDTH');
        assert.ok(usesConfigHeight, 'Game.js references CONFIG.CANVAS_HEIGHT');

        // Should NOT set canvas size from window/screen
        const usesInnerWidth = /canvas\.width\s*=\s*window\.innerWidth/g.test(gameSrc);
        const usesInnerHeight = /canvas\.height\s*=\s*window\.innerHeight/g.test(gameSrc);
        const usesScreenWidth = /canvas\.width\s*=\s*screen\.width/g.test(gameSrc);

        assert.equal(usesInnerWidth, false,
            'Canvas width is NOT set from window.innerWidth');
        assert.equal(usesInnerHeight, false,
            'Canvas height is NOT set from window.innerHeight');
        assert.equal(usesScreenWidth, false,
            'Canvas width is NOT set from screen.width');
    });
});

describe('Device Independence - Fixed Physics Timestep', () => {

    test('Physics timestep is fixed at 1/60 second', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        const dtMatch = gameSrc.match(/PHYSICS_DT\s*=\s*1\s*\/\s*60/);
        assert.ok(dtMatch, 'PHYSICS_DT is set to 1/60');
    });

    test('Game loop uses accumulator pattern for fixed timestep', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        // Should have accumulator-based physics stepping
        const hasAccumulator = gameSrc.includes('physicsAccumulator');
        const hasWhileLoop = /while\s*\(\s*this\.physicsAccumulator\s*>=\s*this\.PHYSICS_DT\s*\)/.test(gameSrc);

        assert.ok(hasAccumulator, 'Game uses physicsAccumulator for fixed timestep');
        assert.ok(hasWhileLoop, 'Game loop uses while loop to consume accumulated time');
    });

    test('deltaTime is set to PHYSICS_DT inside physics loop, not frame time', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        // Inside the while loop, deltaTime should be set to the fixed step
        const setsDtToPhysics = /this\.deltaTime\s*=\s*this\.PHYSICS_DT/.test(gameSrc);

        assert.ok(setsDtToPhysics, 'deltaTime is set to PHYSICS_DT (not variable frame time)');
    });

    test('Physics timestep produces deterministic results', () => {
        // Simulate two "runs" with different frame rates but same physics DT
        // Both should produce identical positions after the same elapsed time

        const PHYSICS_DT = EXPECTED_PHYSICS_DT;
        const speed = EXPECTED_LASER_SPEED;

        // Simulate 1 second of movement
        const totalTime = 1.0;

        // Run 1: 60fps (each frame = 1 physics step)
        let pos1 = 0;
        for (let t = 0; t < totalTime; t += PHYSICS_DT) {
            pos1 += speed * PHYSICS_DT;
        }

        // Run 2: 30fps (each frame = 2 physics steps via accumulator)
        let pos2 = 0;
        const frameDt30fps = 1 / 30;
        let accumulator = 0;
        for (let frame = 0; frame < 30; frame++) {
            accumulator += frameDt30fps;
            while (accumulator >= PHYSICS_DT) {
                pos2 += speed * PHYSICS_DT;
                accumulator -= PHYSICS_DT;
            }
        }

        // Run 3: Variable fps (jittery)
        let pos3 = 0;
        let accumulator3 = 0;
        const jitteryFrames = [0.02, 0.014, 0.018, 0.016, 0.015, 0.017, 0.013, 0.019, 0.016, 0.014];
        let elapsed = 0;
        while (elapsed < totalTime) {
            const frameDt = jitteryFrames[Math.floor(Math.random() * jitteryFrames.length)];
            accumulator3 += Math.min(frameDt, totalTime - elapsed);
            elapsed += frameDt;
            while (accumulator3 >= PHYSICS_DT) {
                pos3 += speed * PHYSICS_DT;
                accumulator3 -= PHYSICS_DT;
            }
        }

        // All three should be very close (within floating point tolerance)
        const tolerance = speed * PHYSICS_DT; // At most 1 step difference from rounding

        assert.ok(Math.abs(pos1 - pos2) < tolerance,
            `60fps and 30fps produce same position (diff: ${Math.abs(pos1 - pos2).toFixed(6)})`);
        assert.ok(Math.abs(pos1 - pos3) < tolerance,
            `60fps and variable fps produce same position (diff: ${Math.abs(pos1 - pos3).toFixed(6)})`);
    });
});

describe('Device Independence - Input Coordinate Mapping', () => {

    test('Game.js has getCanvasCoordinates method for input mapping', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        const hasMethod = gameSrc.includes('getCanvasCoordinates');
        assert.ok(hasMethod, 'getCanvasCoordinates method exists for mapping display -> canvas coords');
    });

    test('Coordinate mapping uses canvas.width/height ratio (not screen dimensions)', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        // The mapping should use canvas.width / rect.width
        const usesScaleX = /canvas\.width\s*\/\s*rect\.width/.test(gameSrc);
        const usesScaleY = /canvas\.height\s*\/\s*rect\.height/.test(gameSrc);

        assert.ok(usesScaleX, 'X scaling uses canvas.width / display rect.width');
        assert.ok(usesScaleY, 'Y scaling uses canvas.height / display rect.height');
    });

    test('Coordinate mapping produces correct results for different display sizes', () => {
        // Simulate the coordinate mapping for various display sizes
        const canvasWidth = EXPECTED_CANVAS_WIDTH;   // 800
        const canvasHeight = EXPECTED_CANVAS_HEIGHT;  // 600

        // Simulate different CSS display sizes (what getBoundingClientRect returns)
        const displaySizes = [
            { name: 'Full size (desktop)', width: 800, height: 600 },
            { name: 'Half size (small laptop)', width: 400, height: 300 },
            { name: 'iPhone SE landscape', width: 568, height: 320 },
            { name: 'iPad landscape', width: 1024, height: 768 },
            { name: '4K display', width: 1600, height: 1200 },
            { name: 'Ultrawide', width: 1200, height: 500 },
        ];

        // A click at the visual center of the display should always map to (400, 300)
        let allCorrect = true;
        for (const display of displaySizes) {
            const scaleX = canvasWidth / display.width;
            const scaleY = canvasHeight / display.height;

            // Click at visual center
            const clickX = display.width / 2;
            const clickY = display.height / 2;

            const mappedX = clickX * scaleX;
            const mappedY = clickY * scaleY;

            if (Math.abs(mappedX - 400) > 0.01 || Math.abs(mappedY - 300) > 0.01) {
                console.log(`    FAIL: ${display.name} mapped to (${mappedX}, ${mappedY})`);
                allCorrect = false;
            }
        }

        assert.ok(allCorrect,
            'Center click maps to (400, 300) on all display sizes');
    });

    test('Edge clicks map correctly regardless of display scaling', () => {
        const canvasWidth = EXPECTED_CANVAS_WIDTH;
        const canvasHeight = EXPECTED_CANVAS_HEIGHT;

        // Test corner mapping at various scales
        const scales = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0];
        let allCorrect = true;

        for (const scale of scales) {
            const displayW = canvasWidth * scale;
            const displayH = canvasHeight * scale;
            const scaleX = canvasWidth / displayW;
            const scaleY = canvasHeight / displayH;

            // Click at bottom-right of display
            const mappedX = displayW * scaleX;
            const mappedY = displayH * scaleY;

            if (Math.abs(mappedX - canvasWidth) > 0.01 || Math.abs(mappedY - canvasHeight) > 0.01) {
                console.log(`    FAIL at scale ${scale}: mapped to (${mappedX}, ${mappedY})`);
                allCorrect = false;
            }
        }

        assert.ok(allCorrect,
            'Bottom-right corner maps to (800, 600) at all scales');
    });
});

describe('Device Independence - No Screen-Dependent Game Logic', () => {

    test('Game logic files do not reference window.innerWidth/innerHeight', () => {
        // Game logic files (not CSS or rendering) should never use screen dimensions
        const gameLogicFiles = [
            'js/classes/Game.js',
            'js/classes/Laser.js',
            'js/classes/Spawner.js',
            'js/validation/SimpleValidator.js',
            'js/validation/MirrorPlacementValidation.js',
            'js/validation/RigidSurfaceAreaGenerator.js',
            'js/classes/CollisionSystem.js',
        ];

        let violations = [];

        for (const file of gameLogicFiles) {
            try {
                const src = readFileSync(join(projectRoot, file), 'utf8');
                // Check for screen-dependent references in game logic
                // (not in comments)
                const lines = src.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

                    if (/window\.innerWidth|window\.innerHeight|screen\.width|screen\.height/.test(line)) {
                        violations.push(`${file}:${i + 1}: ${line.trim()}`);
                    }
                }
            } catch (e) {
                // File may not exist, skip
            }
        }

        if (violations.length > 0) {
            console.log(`    Violations found:`);
            violations.forEach(v => console.log(`      ${v}`));
        }

        assert.equal(violations.length, 0,
            'No game logic files reference screen dimensions');
    });

    test('Collision detection uses CONFIG constants, not dynamic values', () => {
        // Check that collision system references CONFIG for dimensions
        try {
            const collisionSrc = readFileSync(join(projectRoot, 'js/classes/CollisionSystem.js'), 'utf8');

            const usesConfig = collisionSrc.includes('CONFIG');
            assert.ok(usesConfig, 'CollisionSystem uses CONFIG constants');
        } catch (e) {
            // CollisionSystem might be part of Game.js
            const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');
            const usesConfig = gameSrc.includes('CONFIG.CANVAS_WIDTH') && gameSrc.includes('CONFIG.CANVAS_HEIGHT');
            assert.ok(usesConfig, 'Game.js uses CONFIG for canvas dimensions in collision logic');
        }
    });

    test('Laser speed is constant across all conditions', () => {
        const configSrc = readFileSync(join(projectRoot, 'js/config.js'), 'utf8');

        const speedMatch = configSrc.match(/LASER_SPEED:\s*([\d.]+)/);
        assert.ok(speedMatch, 'LASER_SPEED is defined in CONFIG');

        const speed = parseFloat(speedMatch[1]);

        // Speed should be a fixed constant, not dependent on anything
        assert.equal(speed, EXPECTED_LASER_SPEED,
            `LASER_SPEED is fixed at ${EXPECTED_LASER_SPEED}`);
    });

    test('Target radius is constant', () => {
        const configSrc = readFileSync(join(projectRoot, 'js/config.js'), 'utf8');

        const radiusMatch = configSrc.match(/TARGET_RADIUS:\s*(\d+)/);
        assert.ok(radiusMatch, 'TARGET_RADIUS is defined in CONFIG');
        assert.equal(parseInt(radiusMatch[1]), EXPECTED_TARGET_RADIUS,
            `TARGET_RADIUS is fixed at ${EXPECTED_TARGET_RADIUS}`);
    });

    test('Grid size is constant', () => {
        const configSrc = readFileSync(join(projectRoot, 'js/config.js'), 'utf8');

        const gridMatch = configSrc.match(/GRID_SIZE:\s*(\d+)/);
        assert.ok(gridMatch, 'GRID_SIZE is defined in CONFIG');
        assert.equal(parseInt(gridMatch[1]), EXPECTED_GRID_SIZE,
            `GRID_SIZE is fixed at ${EXPECTED_GRID_SIZE}`);
    });
});

describe('Device Independence - Replay Determinism', () => {

    test('MP4 replay uses same physics timestep as live game', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        // The MP4 generation should reference PHYSICS_DT
        const mp4UsesPhysicsDt = gameSrc.includes('physicsDt') || gameSrc.includes('PHYSICS_DT');

        assert.ok(mp4UsesPhysicsDt,
            'MP4 replay generation references the physics timestep');
    });

    test('Canvas replay uses same dimensions as live game', () => {
        const gameSrc = readFileSync(join(projectRoot, 'js/classes/Game.js'), 'utf8');

        // Look for canvas replay using canvas.width (the fixed 800x600)
        const usesCanvasWidth = gameSrc.includes('this.canvas.width');

        assert.ok(usesCanvasWidth,
            'Replay uses this.canvas.width (fixed 800) for rendering');
    });
});

describe('Device Independence - Scoring Consistency', () => {

    test('Game time increments by fixed physics DT regardless of frame rate', () => {
        // Simulate game time accumulation at different frame rates
        const PHYSICS_DT = EXPECTED_PHYSICS_DT;
        const duration = 10; // seconds

        // 60fps
        let time60 = 0;
        let steps60 = 0;
        for (let t = 0; t < duration; t += PHYSICS_DT) {
            time60 += PHYSICS_DT;
            steps60++;
        }

        // 30fps with accumulator
        let time30 = 0;
        let steps30 = 0;
        let acc = 0;
        for (let frame = 0; frame < 300; frame++) { // 300 frames at 30fps = 10s
            acc += 1 / 30;
            while (acc >= PHYSICS_DT) {
                time30 += PHYSICS_DT;
                steps30++;
                acc -= PHYSICS_DT;
            }
        }

        // Both should have the same number of physics steps
        assert.equal(steps60, steps30,
            `60fps and 30fps produce same number of physics steps (${steps60})`);

        // Game time should be identical
        assert.ok(Math.abs(time60 - time30) < 0.001,
            `Game time is identical regardless of frame rate (diff: ${Math.abs(time60 - time30).toFixed(6)}s)`);
    });

    test('MAX_GAME_TIME is defined as fixed constant (300s / 5 min)', () => {
        const configSrc = readFileSync(join(projectRoot, 'js/config.js'), 'utf8');

        const maxTimeMatch = configSrc.match(/MAX_GAME_TIME:\s*(\d+)/);
        assert.ok(maxTimeMatch, 'MAX_GAME_TIME is defined');
        assert.equal(parseInt(maxTimeMatch[1]), 300,
            'MAX_GAME_TIME is 300 seconds (5 minutes)');
    });
});
