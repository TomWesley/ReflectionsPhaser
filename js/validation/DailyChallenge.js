import { CONFIG } from '../config.js';
import { SeededRandom } from './SeededRandom.js';
import { IronCladValidator } from './IronCladValidator.js';
import { SurfaceAreaManager } from './SurfaceAreaManager.js';

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
        const MAX_SURFACE_AREA = 84; // Same as free play for fairness
        let currentSurfaceArea = 0;
        const center = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };

        const shapes = ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle', 'trapezoid', 'parallelogram'];

        // Keep adding mirrors until we reach or get close to max surface area
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 5;

        while (currentSurfaceArea < MAX_SURFACE_AREA && consecutiveFailures < maxConsecutiveFailures) {
            const remainingSurfaceArea = MAX_SURFACE_AREA - currentSurfaceArea;

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

                mirror = {
                    shape,
                    size,
                    x,
                    y,
                    width: size,
                    height: size,
                    rotation: (shape === 'rightTriangle' || shape === 'isoscelesTriangle' ||
                              shape === 'trapezoid' || shape === 'parallelogram')
                        ? rng.choice([0, 90, 180, 270]) : 0,
                    isDragging: false
                };

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

                // Calculate surface area of this mirror
                mirrorSurfaceArea = SurfaceAreaManager.calculateMirrorSurfaceArea(mirror);

                attempts++;
            } while ((!this.isValidMirrorPosition(mirror, mirrors) ||
                      currentSurfaceArea + mirrorSurfaceArea > MAX_SURFACE_AREA) &&
                     attempts < 50);

            if (attempts < 50 && currentSurfaceArea + mirrorSurfaceArea <= MAX_SURFACE_AREA) {
                mirrors.push(mirror);
                currentSurfaceArea += mirrorSurfaceArea;
                consecutiveFailures = 0;
                console.log(`Daily Challenge: Added ${mirror.shape} (${mirrorSurfaceArea}) - total: ${currentSurfaceArea}/${MAX_SURFACE_AREA}`);
            } else {
                consecutiveFailures++;
            }
        }

        const finalSurfaceArea = SurfaceAreaManager.calculateTotalSurfaceArea(mirrors);
        console.log(`✅ Daily Challenge mirrors: ${mirrors.length} mirrors, ${finalSurfaceArea} surface area (max: ${MAX_SURFACE_AREA})`);

        return mirrors;
    }
    
    static getMirrorSize(rng, shape, remainingSurfaceArea = Infinity) {
        // Choose sizes that are likely to fit in remaining surface area
        // This is a rough heuristic - actual surface area calculated later

        if (shape === 'rightTriangle' || shape === 'isoscelesTriangle') {
            // Triangle sizes: 20px, 40px, 60px, 80px (ensures grid alignment)
            // Smaller triangles if running low on surface area
            const sizes = remainingSurfaceArea < 15 ? [20, 40] : [20, 40, 60, 80];
            return rng.choice(sizes);
        }

        // Square/rectangle sizes in 20px increments
        // Prefer smaller sizes if running low on surface area
        const sizes = remainingSurfaceArea < 12 ? [20, 40] : [20, 40, 60, 80];
        return rng.choice(sizes);
    }
    
    static generateSpawners(rng) {
        const spawners = [];
        const spawnerCount = rng.nextInt(4, 7); // 4-7 spawners for challenge
        
        // Create potential edge positions
        const edgePositions = [
            // Left edge
            ...Array(5).fill().map((_, i) => ({
                x: 0,
                y: 100 + i * 100,
                edge: 'left'
            })),
            // Right edge  
            ...Array(5).fill().map((_, i) => ({
                x: CONFIG.CANVAS_WIDTH,
                y: 100 + i * 100,
                edge: 'right'
            })),
            // Top edge
            ...Array(6).fill().map((_, i) => ({
                x: 100 + i * 120,
                y: 0,
                edge: 'top'
            })),
            // Bottom edge
            ...Array(6).fill().map((_, i) => ({
                x: 100 + i * 120,
                y: CONFIG.CANVAS_HEIGHT,
                edge: 'bottom'
            }))
        ];
        
        // Shuffle and select positions
        const selectedPositions = rng.shuffle(edgePositions).slice(0, spawnerCount);
        
        selectedPositions.forEach(pos => {
            const angle = this.getAngleInbound(rng, pos.edge);
            spawners.push({
                x: pos.x,
                y: pos.y,
                angle: angle
            });
        });
        
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
    
    // Mark today's challenge as completed
    static markCompleted(score, time) {
        const today = this.getTodayString();
        const result = {
            completed: true,
            score,
            time,
            timestamp: Date.now()
        };
        localStorage.setItem(`daily_challenge_${today}`, 'true');
        localStorage.setItem(`daily_score_${today}`, JSON.stringify(result));
    }
    
    // Get today's best score
    static getTodayScore() {
        const today = this.getTodayString();
        const scoreData = localStorage.getItem(`daily_score_${today}`);
        return scoreData ? JSON.parse(scoreData) : null;
    }
}