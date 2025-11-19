import { CONFIG } from '../config.js';
import { SeededRandom } from './SeededRandom.js';
import { IronCladValidator } from './IronCladValidator.js';
import { SurfaceAreaManager } from './SurfaceAreaManager.js';
import { MirrorCreationHelper } from '../generators/MirrorCreationHelper.js';

export class DailyChallenge {
    static getTodayString() {
        const now = new Date();
        return now.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    static generatePuzzle(dateString = this.getTodayString()) {
        const rng = new SeededRandom(dateString);
        
        // Generate mirrors for daily challenge
        const mirrors = this.generateMirrors(rng);
        
        // Generate spawners for daily challenge
        const spawners = this.generateSpawners(rng);
        
        return {
            date: dateString,
            mirrors,
            spawners,
            difficulty: this.calculateDifficulty(mirrors, spawners)
        };
    }
    
    static generateMirrors(rng) {
        const mirrors = [];

        // NO SURFACE AREA RESTRICTION for daily challenges - make them wacky!
        // Generate a random number of mirrors (3-12 for variety)
        const mirrorCount = rng.nextInt(3, 12);

        const center = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };

        const shapes = ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle', 'trapezoid', 'parallelogram'];

        console.log(`🎯 Daily Challenge: Generating ${mirrorCount} mirrors (no surface area limit)`);

        for (let mirrorIndex = 0; mirrorIndex < mirrorCount; mirrorIndex++) {
            const remainingSurfaceArea = Infinity; // No limit!

            // Try to create a mirror that fits in remaining surface area
            let attempts = 0;
            let mirror;
            let mirrorSurfaceArea;

            do {
                // Generate position in ring around center (similar to free play but more constrained)
                const angle = rng.nextFloat(0, Math.PI * 2);
                const distance = rng.nextFloat(140, 200); // Tighter ring for more strategic placement

                let x = center.x + Math.cos(angle) * distance;
                let y = center.y + Math.sin(angle) * distance;

                // Snap to grid
                x = Math.round(x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                y = Math.round(y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;

                // Create mirror with predetermined properties
                const shape = rng.choice(shapes);
                const size = this.getMirrorSize(rng, shape, remainingSurfaceArea);

                // Create actual mirror instance using MirrorCreationHelper
                mirror = MirrorCreationHelper.createMirror(x, y, shape);

                if (!mirror) {
                    attempts++;
                    continue;
                }

                // Set size and dimensions
                mirror.size = size;
                mirror.width = size;
                mirror.height = size;

                // Set rotation for applicable shapes
                if (shape === 'rightTriangle' || shape === 'isoscelesTriangle' ||
                    shape === 'trapezoid' || shape === 'parallelogram') {
                    mirror.rotation = rng.choice([0, 90, 180, 270]);
                }

                // Set specific properties based on shape
                if (shape === 'rectangle') {
                    mirror.height = this.getMirrorSize(rng, shape, remainingSurfaceArea);
                    // Ensure rectangle is actually rectangular
                    if (mirror.width === mirror.height) {
                        mirror.height = this.getMirrorSize(rng, shape, remainingSurfaceArea);
                    }
                } else if (shape === 'trapezoid') {
                    mirror.height = this.getMirrorSize(rng, shape, remainingSurfaceArea);
                    mirror.topWidth = rng.choice([20, 40]); // Smaller top base
                    mirror.width = Math.max(mirror.topWidth + 20, size); // Ensure bottom > top
                } else if (shape === 'parallelogram') {
                    mirror.height = this.getMirrorSize(rng, shape, remainingSurfaceArea);
                    mirror.skew = rng.choice([20, 40]); // Horizontal skew amount
                }

                // Update vertices with new properties
                mirror.updateVertices();

                // Mark as daily challenge mirror
                mirror.isDailyChallenge = true;

                attempts++;
            } while (!this.isValidMirrorPosition(mirror, mirrors) && attempts < 50);

            if (attempts < 50) {
                mirrors.push(mirror);
                console.log(`Daily Challenge: Added ${mirror.shape} at position ${mirrorIndex + 1}/${mirrorCount}`);
            } else {
                console.warn(`Daily Challenge: Failed to place mirror ${mirrorIndex + 1} after 50 attempts`);
            }
        }

        console.log(`✅ Daily Challenge mirrors: ${mirrors.length} mirrors placed`);

        return mirrors;
    }
    
    static getMirrorSize(rng, shape, remainingSurfaceArea = Infinity) {
        // Daily challenges can use ANY size - make them wacky!
        // All possible sizes from 20px to 120px in 20px increments
        const allSizes = [20, 40, 60, 80, 100, 120];
        return rng.choice(allSizes);
    }
    
    static generateSpawners(rng) {
        const spawners = [];
        // More spawners for daily challenge - 6-9 for increased difficulty
        const spawnerCount = rng.nextInt(6, 10);

        // Create potential edge positions with more variety
        const edgePositions = [
            // Left edge - more positions
            ...Array(7).fill().map((_, i) => ({
                x: 0,
                y: 80 + i * 80,
                edge: 'left'
            })),
            // Right edge - more positions
            ...Array(7).fill().map((_, i) => ({
                x: CONFIG.CANVAS_WIDTH,
                y: 80 + i * 80,
                edge: 'right'
            })),
            // Top edge - more positions
            ...Array(9).fill().map((_, i) => ({
                x: 70 + i * 90,
                y: 0,
                edge: 'top'
            })),
            // Bottom edge - more positions
            ...Array(9).fill().map((_, i) => ({
                x: 70 + i * 90,
                y: CONFIG.CANVAS_HEIGHT,
                edge: 'bottom'
            }))
        ];

        // Shuffle and select positions
        const selectedPositions = rng.shuffle(edgePositions).slice(0, spawnerCount);

        selectedPositions.forEach(pos => {
            // More varied angles for daily challenge
            const angle = this.getAngleInbound(rng, pos.edge);
            spawners.push({
                x: pos.x,
                y: pos.y,
                angle: angle,
                isDailyChallenge: true  // Mark for special rendering
            });
        });

        console.log(`🎯 Daily Challenge: ${spawners.length} spawners generated`);
        return spawners;
    }
    
    static getAngleInbound(rng, edge) {
        let baseAngle;
        const variation = rng.nextFloat(-Math.PI/3, Math.PI/3); // ±60 degrees variation
        
        switch(edge) {
            case 'left':
                baseAngle = 0; // Point right
                break;
            case 'right': 
                baseAngle = Math.PI; // Point left
                break;
            case 'top':
                baseAngle = Math.PI/2; // Point down
                break;
            case 'bottom':
                baseAngle = -Math.PI/2; // Point up
                break;
            default:
                baseAngle = 0;
        }
        
        return baseAngle + variation;
    }
    
    static isValidMirrorPosition(testMirror, existingMirrors) {
        // Use IronCladValidator for consistency - same validation everywhere
        const validation = IronCladValidator.validateMirror(testMirror, existingMirrors);
        return validation.valid;
    }
    
    static calculateDifficulty(mirrors, spawners) {
        // Simple difficulty calculation based on mirror count and spawner count
        const score = mirrors.length + spawners.length;
        if (score < 8) return 'easy';
        if (score < 12) return 'medium';
        return 'hard';
    }
    
    // Check if player has completed today's challenge
    static hasCompletedToday() {
        const today = this.getTodayString();
        const completed = localStorage.getItem(`daily_challenge_${today}`);
        return completed === 'true';
    }
    
    // Mark today's challenge as completed and save mirror positions + laser positions
    static markCompleted(score, time, mirrors = [], lasers = []) {
        const today = this.getTodayString();

        // Save score and completion status
        const result = {
            completed: true,
            score,
            time,
            timestamp: Date.now()
        };
        localStorage.setItem(`daily_challenge_${today}`, 'true');
        localStorage.setItem(`daily_score_${today}`, JSON.stringify(result));

        // Save mirror positions for replay viewing
        const mirrorState = mirrors.map(mirror => ({
            shape: mirror.shape,
            x: mirror.x,
            y: mirror.y,
            size: mirror.size,
            width: mirror.width,
            height: mirror.height,
            rotation: mirror.rotation,
            topWidth: mirror.topWidth,
            skew: mirror.skew,
            isDailyChallenge: true
        }));
        localStorage.setItem(`daily_mirrors_${today}`, JSON.stringify(mirrorState));

        // Save laser positions for freeze frame
        const laserState = lasers.map(laser => ({
            x: laser.x,
            y: laser.y,
            vx: laser.vx,
            vy: laser.vy,
            trail: laser.trail ? [...laser.trail] : []
        }));
        localStorage.setItem(`daily_lasers_${today}`, JSON.stringify(laserState));

        console.log(`Daily Challenge: Saved ${mirrorState.length} mirrors and ${laserState.length} lasers for freeze frame`);
    }
    
    // Get today's best score
    static getTodayScore() {
        const today = this.getTodayString();
        const scoreData = localStorage.getItem(`daily_score_${today}`);
        return scoreData ? JSON.parse(scoreData) : null;
    }

    // Get today's saved mirror positions (for completed challenges)
    static getTodayMirrorState() {
        const today = this.getTodayString();
        const mirrorData = localStorage.getItem(`daily_mirrors_${today}`);
        if (!mirrorData) return null;

        try {
            const mirrorConfigs = JSON.parse(mirrorData);
            console.log(`Daily Challenge: Loaded ${mirrorConfigs.length} saved mirror positions`);
            return mirrorConfigs;
        } catch (error) {
            console.error('Error loading saved mirror positions:', error);
            return null;
        }
    }

    // Reconstruct mirrors from saved state
    static reconstructMirrors(mirrorConfigs) {
        const mirrors = [];

        for (const config of mirrorConfigs) {
            const mirror = MirrorCreationHelper.createMirror(config.x, config.y, config.shape);
            if (!mirror) continue;

            // Apply saved properties
            mirror.size = config.size;
            mirror.width = config.width;
            mirror.height = config.height;
            mirror.rotation = config.rotation || 0;
            mirror.isDailyChallenge = true;

            // Apply special properties if they exist
            if (config.topWidth) mirror.topWidth = config.topWidth;
            if (config.skew) mirror.skew = config.skew;

            // Update vertices
            mirror.updateVertices();

            mirrors.push(mirror);
        }

        console.log(`Daily Challenge: Reconstructed ${mirrors.length} mirrors from saved state`);
        return mirrors;
    }

    // Get today's saved laser positions (for completed challenges freeze frame)
    static getTodayLaserState() {
        const today = this.getTodayString();
        const laserData = localStorage.getItem(`daily_lasers_${today}`);
        if (!laserData) return null;

        try {
            const laserConfigs = JSON.parse(laserData);
            console.log(`Daily Challenge: Loaded ${laserConfigs.length} saved laser positions`);
            return laserConfigs;
        } catch (error) {
            console.error('Error loading saved laser positions:', error);
            return null;
        }
    }

    // Reconstruct lasers from saved state (for freeze frame display)
    static reconstructLasers(laserConfigs) {
        // Import Laser class dynamically
        return laserConfigs.map(config => ({
            x: config.x,
            y: config.y,
            vx: config.vx,
            vy: config.vy,
            trail: config.trail || [],
            isFrozen: true  // Mark as frozen so they don't update
        }));
    }
}