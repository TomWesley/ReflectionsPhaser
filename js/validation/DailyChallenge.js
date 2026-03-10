import { CONFIG } from '../config.js';
import { SeededRandom } from './SeededRandom.js';
import { MirrorFactory } from '../mirrors/MirrorFactory.js';
import { SimpleValidator } from './SimpleValidator.js';

/**
 * DailyChallenge - Generates deterministic daily puzzle configurations
 * Uses date-based seeding so all players get the same puzzle each day.
 * One attempt per day, stored in localStorage.
 */
export class DailyChallenge {
    /**
     * Get today's date string for seeding
     */
    static getTodayString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Check if today's challenge has already been attempted
     */
    static hasAttemptedToday() {
        const key = `daily_challenge_${DailyChallenge.getTodayString()}`;
        return localStorage.getItem(key) !== null;
    }

    /**
     * Mark today's challenge as completed
     */
    static markCompleted(gameTime, timeString, mirrors, lasers) {
        const today = DailyChallenge.getTodayString();
        localStorage.setItem(`daily_challenge_${today}`, JSON.stringify({
            gameTime,
            timeString,
            completedAt: Date.now()
        }));

        // Save freeze-frame state for revisiting
        if (mirrors) {
            localStorage.setItem(`daily_mirrors_${today}`, JSON.stringify(
                mirrors.map(m => ({
                    x: m.x, y: m.y, shape: m.shape,
                    size: m.size, width: m.width, height: m.height,
                    rotation: m.rotation, topWidth: m.topWidth, skew: m.skew
                }))
            ));
        }
        if (lasers) {
            localStorage.setItem(`daily_lasers_${today}`, JSON.stringify(
                lasers.map(l => ({
                    x: l.x, y: l.y, vx: l.vx, vy: l.vy,
                    trail: l.trail.slice(-20) // Keep last 20 trail points
                }))
            ));
        }
    }

    /**
     * Get today's completed result (or null if not attempted)
     */
    static getTodayResult() {
        const key = `daily_challenge_${DailyChallenge.getTodayString()}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Get saved frozen mirror configs from today's completed challenge
     */
    static getSavedMirrors() {
        const key = `daily_mirrors_${DailyChallenge.getTodayString()}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Get saved frozen laser states from today's completed challenge
     */
    static getSavedLasers() {
        const key = `daily_lasers_${DailyChallenge.getTodayString()}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Novel challenge theme definitions.
     * Each theme produces a unique, zany mirror configuration.
     */
    static getThemes() {
        return [
            { name: 'tiny-army',       generate: DailyChallenge.generateTinyArmy },
            { name: 'all-triangles',   generate: DailyChallenge.generateAllTriangles },
            { name: 'one-wall',        generate: DailyChallenge.generateOneWall },
            { name: 'hexagon-hive',    generate: DailyChallenge.generateHexagonHive },
            { name: 'corridor',        generate: DailyChallenge.generateCorridor },
            { name: 'big-three',       generate: DailyChallenge.generateBigThree },
            { name: 'diamond-ring',    generate: DailyChallenge.generateDiamondRing },
            { name: 'scatter-shot',    generate: DailyChallenge.generateScatterShot },
        ];
    }

    /**
     * Generate today's challenge configuration (mirrors + spawners)
     * Returns { mirrors: [...configs], spawners: [...configs], theme: string }
     */
    static generateDailyConfig() {
        const today = DailyChallenge.getTodayString();
        const rng = new SeededRandom(today);

        // Pick a theme deterministically
        const themes = DailyChallenge.getThemes();
        const theme = themes[rng.nextInt(0, themes.length - 1)];

        // Generate mirror configs using the theme
        const mirrorConfigs = theme.generate(rng);

        // Generate spawner configs
        const spawnerConfigs = DailyChallenge.generateDailySpawners(rng);

        return {
            mirrors: mirrorConfigs,
            spawners: spawnerConfigs,
            theme: theme.name
        };
    }

    // --- THEME GENERATORS ---
    // Each returns an array of mirror config objects

    /**
     * Tiny Army: 8-14 small squares
     */
    static generateTinyArmy(rng) {
        const count = rng.nextInt(8, 14);
        const configs = [];
        for (let i = 0; i < count; i++) {
            configs.push({
                shape: 'square',
                size: 20, width: 20, height: 20,
                rotation: rng.choice([0, 45, 90, 135])
            });
        }
        return configs;
    }

    /**
     * All Triangles: 5-9 right/isosceles triangles of various sizes
     */
    static generateAllTriangles(rng) {
        const count = rng.nextInt(5, 9);
        const configs = [];
        const types = ['rightTriangle', 'isoscelesTriangle'];
        const sizes = [
            { width: 40, height: 40 },
            { width: 60, height: 40 },
            { width: 40, height: 60 },
            { width: 60, height: 60 },
            { width: 80, height: 60 },
        ];
        for (let i = 0; i < count; i++) {
            const shape = rng.choice(types);
            const dims = rng.choice(sizes);
            configs.push({
                shape,
                size: Math.max(dims.width, dims.height),
                width: dims.width, height: dims.height,
                rotation: rng.nextInt(0, 3) * 90
            });
        }
        return configs;
    }

    /**
     * One Wall: All spawners from one edge, 4-7 mixed mirrors
     */
    static generateOneWall(rng) {
        const count = rng.nextInt(4, 7);
        const configs = [];
        const shapes = MirrorFactory.getAllShapes();
        const sizeSets = [
            { width: 40, height: 40 },
            { width: 60, height: 40 },
            { width: 60, height: 60 },
            { width: 80, height: 40 },
            { width: 40, height: 80 },
        ];
        for (let i = 0; i < count; i++) {
            const shape = rng.choice(shapes);
            const dims = rng.choice(sizeSets);
            configs.push({
                shape,
                size: Math.max(dims.width, dims.height),
                width: dims.width, height: dims.height,
                rotation: rng.nextInt(0, 7) * 45
            });
        }
        return configs;
    }

    /**
     * Hexagon Hive: 4-7 hexagons only
     */
    static generateHexagonHive(rng) {
        const count = rng.nextInt(4, 7);
        const configs = [];
        const hexSizes = [40, 60, 80, 100];
        for (let i = 0; i < count; i++) {
            const size = rng.choice(hexSizes);
            configs.push({
                shape: 'hexagon',
                size, width: size, height: size,
                rotation: rng.choice([0, 30, 60, 90, 120, 150])
            });
        }
        return configs;
    }

    /**
     * Corridor: Long rectangles / parallelograms to create lanes
     */
    static generateCorridor(rng) {
        const count = rng.nextInt(4, 6);
        const configs = [];
        const longShapes = [
            { shape: 'rectangle', width: 120, height: 20 },
            { shape: 'rectangle', width: 100, height: 20 },
            { shape: 'rectangle', width: 120, height: 40 },
            { shape: 'parallelogram', width: 100, height: 40, skew: 20 },
            { shape: 'parallelogram', width: 80, height: 40, skew: 20 },
        ];
        for (let i = 0; i < count; i++) {
            const cfg = rng.choice(longShapes);
            configs.push({
                ...cfg,
                size: Math.max(cfg.width, cfg.height),
                rotation: rng.nextInt(0, 7) * 45
            });
        }
        return configs;
    }

    /**
     * Big Three: 3 very large mirrors
     */
    static generateBigThree(rng) {
        const configs = [];
        const bigShapes = [
            { shape: 'square', size: 100, width: 100, height: 100 },
            { shape: 'rectangle', width: 120, height: 80, size: 120 },
            { shape: 'rectangle', width: 100, height: 80, size: 100 },
            { shape: 'hexagon', size: 120, width: 120, height: 120 },
            { shape: 'trapezoid', width: 100, height: 80, topWidth: 60, size: 100 },
            { shape: 'isoscelesTriangle', width: 100, height: 80, size: 100 },
        ];
        const shuffled = rng.shuffle(bigShapes);
        for (let i = 0; i < 3; i++) {
            configs.push({
                ...shuffled[i],
                rotation: rng.nextInt(0, 3) * 90
            });
        }
        return configs;
    }

    /**
     * Diamond Ring: All squares rotated 45 degrees around center
     */
    static generateDiamondRing(rng) {
        const count = rng.nextInt(6, 10);
        const configs = [];
        const squareSizes = [20, 40, 60];
        for (let i = 0; i < count; i++) {
            const size = rng.choice(squareSizes);
            configs.push({
                shape: 'square',
                size, width: size, height: size,
                rotation: 45
            });
        }
        return configs;
    }

    /**
     * Scatter Shot: Many spawners, mixed small-medium mirrors
     */
    static generateScatterShot(rng) {
        const count = rng.nextInt(6, 10);
        const configs = [];
        const shapes = MirrorFactory.getAllShapes();
        for (let i = 0; i < count; i++) {
            const shape = rng.choice(shapes);
            const size = rng.choice([20, 40, 60]);
            configs.push({
                shape,
                size, width: size, height: size,
                rotation: rng.nextInt(0, 7) * 45
            });
        }
        return configs;
    }

    // --- SPAWNER GENERATION ---

    /**
     * Generate spawner positions and angles deterministically.
     * "one-wall" theme forces all spawners from one edge.
     * "scatter-shot" gets more spawners (8-10).
     * Default is 6-8 spawners from all edges.
     */
    static generateDailySpawners(rng) {
        const today = DailyChallenge.getTodayString();
        const themeRng = new SeededRandom(today);
        const themes = DailyChallenge.getThemes();
        const theme = themes[themeRng.nextInt(0, themes.length - 1)];

        let count, forcedEdge;
        if (theme.name === 'one-wall') {
            count = rng.nextInt(6, 8);
            forcedEdge = rng.choice(['left', 'right', 'top', 'bottom']);
        } else if (theme.name === 'scatter-shot') {
            count = rng.nextInt(8, 10);
            forcedEdge = null;
        } else {
            count = rng.nextInt(6, 8);
            forcedEdge = null;
        }

        const margin = 50;
        const edges = ['left', 'right', 'top', 'bottom'];
        const spawners = [];

        for (let i = 0; i < count; i++) {
            const edge = forcedEdge || rng.choice(edges);
            let x, y;

            switch (edge) {
                case 'left':
                    x = 0;
                    y = margin + rng.nextFloat(0, 1) * (CONFIG.CANVAS_HEIGHT - 2 * margin);
                    break;
                case 'right':
                    x = CONFIG.CANVAS_WIDTH;
                    y = margin + rng.nextFloat(0, 1) * (CONFIG.CANVAS_HEIGHT - 2 * margin);
                    break;
                case 'top':
                    x = margin + rng.nextFloat(0, 1) * (CONFIG.CANVAS_WIDTH - 2 * margin);
                    y = 0;
                    break;
                case 'bottom':
                    x = margin + rng.nextFloat(0, 1) * (CONFIG.CANVAS_WIDTH - 2 * margin);
                    y = CONFIG.CANVAS_HEIGHT;
                    break;
            }

            // Calculate inbound angle
            let baseAngle;
            switch (edge) {
                case 'left':   baseAngle = 0; break;
                case 'right':  baseAngle = 180; break;
                case 'top':    baseAngle = 90; break;
                case 'bottom': baseAngle = 270; break;
            }

            const variation = (rng.nextFloat(0, 1) - 0.5) * 120; // +/- 60 degrees
            const degrees = Math.round(baseAngle + variation);
            const angle = (degrees % 360) * Math.PI / 180;

            spawners.push({ x, y, angle, edge });
        }

        return spawners;
    }

    /**
     * Place mirrors from configs onto the game board using seeded positions
     * Returns array of placed mirror objects
     */
    static placeMirrors(mirrorConfigs, game) {
        const today = DailyChallenge.getTodayString();
        const rng = new SeededRandom(today + '-placement');
        const placed = [];

        for (const config of mirrorConfigs) {
            let mirror = null;
            for (let attempt = 0; attempt < 150; attempt++) {
                // Generate a seeded random position
                const angle = rng.nextFloat(0, 1) * Math.PI * 2;
                const distance = 100 + rng.nextFloat(0, 1) * 220;
                const cx = CONFIG.CANVAS_WIDTH / 2;
                const cy = CONFIG.CANVAS_HEIGHT / 2;
                const x = cx + Math.cos(angle) * distance;
                const y = cy + Math.sin(angle) * distance;

                const candidate = MirrorFactory.createMirror(x, y, config.shape);
                if (!candidate) continue;

                candidate.size = config.size || candidate.size;
                candidate.width = config.width || candidate.width;
                candidate.height = config.height || candidate.height;
                candidate.rotation = config.rotation || 0;
                if (config.topWidth) candidate.topWidth = config.topWidth;
                if (config.skew) candidate.skew = config.skew;
                candidate.isDailyChallenge = true;
                game.safeUpdateVertices(candidate);

                const validation = SimpleValidator.validateMirror(candidate, placed);
                if (validation.valid) {
                    mirror = candidate;
                    break;
                }
            }

            if (mirror) {
                placed.push(mirror);
            }
        }

        return placed;
    }
}
