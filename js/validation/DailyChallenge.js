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
        try {
            const key = `daily_challenge_${DailyChallenge.getTodayString()}`;
            return localStorage.getItem(key) !== null;
        } catch { return false; }
    }

    /**
     * Mark today's challenge as completed
     */
    static markCompleted(gameTime, timeString, mirrors, lasers) {
        try {
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
        } catch { /* Private browsing or quota exceeded — silently fail */ }
    }

    /**
     * Get today's completed result (or null if not attempted)
     */
    static getTodayResult() {
        try {
            const key = `daily_challenge_${DailyChallenge.getTodayString()}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }

    /**
     * Get saved frozen mirror configs from today's completed challenge
     */
    static getSavedMirrors() {
        try {
            const key = `daily_mirrors_${DailyChallenge.getTodayString()}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }

    /**
     * Get saved frozen laser states from today's completed challenge
     */
    static getSavedLasers() {
        try {
            const key = `daily_lasers_${DailyChallenge.getTodayString()}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
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

        // Pick theme using day-of-year for even distribution, then shuffle order with seed
        const themes = DailyChallenge.getThemes();
        const parts = today.split('-');
        const dayOfYear = Math.floor((new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) - new Date(parseInt(parts[0]), 0, 0)) / 86400000);
        const themeIndex = dayOfYear % themes.length;
        // Shuffle themes with a yearly seed so the rotation order varies year to year
        const yearRng = new SeededRandom(parts[0]);
        const shuffledThemes = yearRng.shuffle([...themes]);
        const theme = shuffledThemes[themeIndex];

        // Generate mirror configs using the theme
        const mirrorConfigs = theme.generate(rng);

        // Generate spawner configs
        const spawnerConfigs = DailyChallenge.generateDailySpawners(rng, theme.name);

        // Calculate difficulty rating
        const difficulty = DailyChallenge.calculateDifficulty(mirrorConfigs, spawnerConfigs.length);

        return {
            mirrors: mirrorConfigs,
            spawners: spawnerConfigs,
            theme: theme.name,
            difficulty
        };
    }

    // --- THEME GENERATORS ---
    // Each returns an array of mirror config objects

    /**
     * Tiny Army: 10-16 small squares and rectangles
     */
    static generateTinyArmy(rng) {
        const count = rng.nextInt(10, 16);
        const configs = [];
        const tinyShapes = [
            { shape: 'square', width: 20, height: 20 },
            { shape: 'square', width: 30, height: 30 },
            { shape: 'rectangle', width: 40, height: 20 },
            { shape: 'rectangle', width: 20, height: 40 },
        ];
        for (let i = 0; i < count; i++) {
            const cfg = rng.choice(tinyShapes);
            configs.push({
                ...cfg,
                size: Math.max(cfg.width, cfg.height),
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
     * Corridor: Long rectangles / parallelograms / trapezoids to create lanes
     */
    static generateCorridor(rng) {
        const count = rng.nextInt(4, 7);
        const configs = [];
        const longShapes = [
            { shape: 'rectangle', width: 120, height: 20 },
            { shape: 'rectangle', width: 100, height: 20 },
            { shape: 'rectangle', width: 120, height: 40 },
            { shape: 'parallelogram', width: 100, height: 40, skew: 20 },
            { shape: 'parallelogram', width: 80, height: 40, skew: 20 },
            { shape: 'trapezoid', width: 100, height: 30, topWidth: 60 },
        ];
        for (let i = 0; i < count; i++) {
            const cfg = rng.choice(longShapes);
            configs.push({
                ...cfg,
                size: Math.max(cfg.width, cfg.height),
                rotation: rng.nextInt(0, 11) * 30
            });
        }
        return configs;
    }

    /**
     * Big Three: 3 very large mirrors, guaranteed different shapes
     */
    static generateBigThree(rng) {
        const configs = [];
        const bigShapes = [
            { shape: 'square', size: 100, width: 100, height: 100 },
            { shape: 'rectangle', width: 120, height: 80, size: 120 },
            { shape: 'hexagon', size: 120, width: 120, height: 120 },
            { shape: 'trapezoid', width: 120, height: 80, topWidth: 60, size: 120 },
            { shape: 'isoscelesTriangle', width: 120, height: 100, size: 120 },
            { shape: 'rightTriangle', width: 100, height: 100, size: 100 },
            { shape: 'parallelogram', width: 120, height: 80, skew: 30, size: 120 },
        ];
        const shuffled = rng.shuffle(bigShapes);
        // Pick 3, but ensure all different shapes
        const picked = [];
        const usedShapes = new Set();
        for (const s of shuffled) {
            if (!usedShapes.has(s.shape)) {
                usedShapes.add(s.shape);
                picked.push({ ...s, rotation: rng.nextInt(0, 7) * 45 });
                if (picked.length === 3) break;
            }
        }
        return picked;
    }

    /**
     * Diamond Ring: Squares and hexagons at 45/30 degree angles
     */
    static generateDiamondRing(rng) {
        const count = rng.nextInt(6, 10);
        const configs = [];
        const diamondShapes = [
            { shape: 'square', size: 20, rotation: 45 },
            { shape: 'square', size: 40, rotation: 45 },
            { shape: 'square', size: 60, rotation: 45 },
            { shape: 'hexagon', size: 40, rotation: 30 },
            { shape: 'hexagon', size: 60, rotation: 30 },
        ];
        for (let i = 0; i < count; i++) {
            const cfg = rng.choice(diamondShapes);
            configs.push({
                shape: cfg.shape,
                size: cfg.size, width: cfg.size, height: cfg.size,
                rotation: cfg.rotation
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

    // --- DIFFICULTY RATING ---

    /**
     * Calculate a difficulty rating (1.0 - 10.0) for a daily challenge config.
     * Lower = easier. Based on total mirror surface area vs spawner count.
     * More surface area makes it easier, more spawners make it harder.
     */
    static calculateDifficulty(mirrorConfigs, spawnerCount) {
        // Estimate total reflective area in pixels squared
        let totalArea = 0;
        for (const cfg of mirrorConfigs) {
            const w = cfg.width || cfg.size || 40;
            const h = cfg.height || cfg.size || 40;
            switch (cfg.shape) {
                case 'square':
                    totalArea += w * h;
                    break;
                case 'rectangle':
                    totalArea += w * h;
                    break;
                case 'rightTriangle':
                case 'isoscelesTriangle':
                    totalArea += 0.5 * w * h;
                    break;
                case 'hexagon':
                    // Regular hexagon area ≈ 2.598 * (size/2)^2
                    totalArea += 2.598 * (w / 2) * (w / 2);
                    break;
                case 'trapezoid': {
                    const topW = cfg.topWidth || w * 0.6;
                    totalArea += 0.5 * (w + topW) * h;
                    break;
                }
                case 'parallelogram':
                    totalArea += w * h;
                    break;
                default:
                    totalArea += w * h;
            }
        }

        // Normalize: a "baseline" easy puzzle might have ~20000px area, 5 spawners
        // A hard puzzle might have ~3000px area, 10 spawners
        // ratio = area / spawners — higher ratio = easier
        const ratio = totalArea / Math.max(spawnerCount, 1);

        // Map ratio to 1.0-10.0 scale (inverted: low ratio = hard = high number)
        // Empirical range: ~300 (very hard) to ~5000 (very easy)
        // Use log scale for better distribution
        const logRatio = Math.log(Math.max(ratio, 100));
        // log(300) ≈ 5.7, log(5000) ≈ 8.5
        // Map [5.7, 8.5] → [9.0, 1.0]
        const difficulty = 9.0 - (logRatio - 5.7) * (8.0 / 2.8);
        return Math.round(Math.max(1.0, Math.min(10.0, difficulty)) * 10) / 10;
    }

    // --- SPAWNER GENERATION ---

    /**
     * Generate spawner positions and angles deterministically.
     * "one-wall" theme forces all spawners from one edge.
     * "scatter-shot" gets more spawners (8-10).
     * Default is 6-8 spawners from all edges.
     */
    static generateDailySpawners(rng, themeName) {
        let count, forcedEdge;
        if (themeName === 'one-wall') {
            count = rng.nextInt(6, 8);
            forcedEdge = rng.choice(['left', 'right', 'top', 'bottom']);
        } else if (themeName === 'scatter-shot') {
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
