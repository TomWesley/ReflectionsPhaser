import { CONFIG } from '../config.js';
import { SeededRandom } from './SeededRandom.js';

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
        const mirrorCount = rng.nextInt(6, 10); // Slightly more mirrors for challenge
        const center = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
        
        const shapes = ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle'];
        
        for (let i = 0; i < mirrorCount; i++) {
            let attempts = 0;
            let mirror;
            
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
                const size = this.getMirrorSize(rng, shape);
                
                mirror = {
                    shape,
                    size,
                    x,
                    y,
                    width: shape === 'rectangle' ? size : size,
                    height: shape === 'rectangle' ? this.getMirrorSize(rng, shape) : size,
                    rotation: (shape === 'rightTriangle' || shape === 'isoscelesTriangle') 
                        ? rng.choice([0, 90, 180, 270]) : 0,
                    isDragging: false
                };
                
                // Ensure rectangle is actually rectangular
                if (shape === 'rectangle' && mirror.width === mirror.height) {
                    mirror.height = this.getMirrorSize(rng, shape);
                }
                
                attempts++;
            } while (!this.isValidMirrorPosition(mirror, mirrors) && attempts < 50);
            
            if (attempts < 50) {
                mirrors.push(mirror);
            }
        }
        
        return mirrors;
    }
    
    static getMirrorSize(rng, shape) {
        if (shape === 'rightTriangle' || shape === 'isoscelesTriangle') {
            // Triangle sizes: 40px or 80px (ensures grid alignment)
            return rng.choice([40, 80]);
        }
        
        // Square/rectangle sizes in 20px increments
        const sizes = [20, 40, 60];
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
        // Check bounds
        const bounds = this.getMirrorBounds(testMirror);
        const margin = CONFIG.EDGE_MARGIN;
        
        if (bounds.left < margin || bounds.right > CONFIG.CANVAS_WIDTH - margin ||
            bounds.top < margin || bounds.bottom > CONFIG.CANVAS_HEIGHT - margin) {
            return false;
        }
        
        // Check center forbidden zone
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenRadius = CONFIG.TARGET_RADIUS + 40;
        
        const closestPoint = this.getClosestPointToCenter(testMirror, centerX, centerY);
        const distFromCenter = Math.sqrt((closestPoint.x - centerX) ** 2 + (closestPoint.y - centerY) ** 2);
        if (distFromCenter < forbiddenRadius) {
            return false;
        }
        
        // Check overlap with existing mirrors
        for (let existingMirror of existingMirrors) {
            if (this.mirrorsOverlap(testMirror, existingMirror)) {
                return false;
            }
        }
        
        return true;
    }
    
    static getMirrorBounds(mirror) {
        switch (mirror.shape) {
            case 'square':
                const halfSize = mirror.size / 2;
                return {
                    left: mirror.x - halfSize,
                    right: mirror.x + halfSize,
                    top: mirror.y - halfSize,
                    bottom: mirror.y + halfSize
                };
            case 'rectangle':
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                return {
                    left: mirror.x - halfWidth,
                    right: mirror.x + halfWidth,
                    top: mirror.y - halfHeight,
                    bottom: mirror.y + halfHeight
                };
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // Simple bounding box for triangles
                const triangleHalfSize = mirror.size / 2;
                return {
                    left: mirror.x - triangleHalfSize,
                    right: mirror.x + triangleHalfSize,
                    top: mirror.y - triangleHalfSize,
                    bottom: mirror.y + triangleHalfSize
                };
            default:
                return { left: mirror.x, right: mirror.x, top: mirror.y, bottom: mirror.y };
        }
    }
    
    static getClosestPointToCenter(mirror, centerX, centerY) {
        const bounds = this.getMirrorBounds(mirror);
        const closestX = Math.max(bounds.left, Math.min(centerX, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(centerY, bounds.bottom));
        return { x: closestX, y: closestY };
    }
    
    static mirrorsOverlap(mirror1, mirror2) {
        const bounds1 = this.getMirrorBounds(mirror1);
        const bounds2 = this.getMirrorBounds(mirror2);
        
        return !(bounds1.right <= bounds2.left || 
                bounds2.right <= bounds1.left || 
                bounds1.bottom <= bounds2.top || 
                bounds2.bottom <= bounds1.top);
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