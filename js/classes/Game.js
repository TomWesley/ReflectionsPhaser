import { CONFIG } from '../config.js';
import { Mirror } from './Mirror.js';
import { Laser } from './Laser.js';
import { Spawner } from './Spawner.js';
import { DailyChallenge } from '../utils/DailyChallenge.js';
import { SurfaceAreaManager } from '../utils/SurfaceAreaManager.js';
import { PerformanceRating } from '../utils/PerformanceRating.js';
import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.gameOver = false;
        this.startTime = 0;
        this.gameTime = 0;
        
        // Game mode
        this.gameMode = 'freePlay'; // 'freePlay' or 'dailyChallenge'
        this.dailyPuzzle = null;
        this.challengeCompleted = false;
        
        // Game objects
        this.mirrors = [];
        this.lasers = [];
        this.spawners = [];
        
        // Interaction state
        this.draggedMirror = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dragStartPos = { x: 0, y: 0 };
        this.mouseHasMoved = false;
        
        this.init();
    }
    
    init() {
        // Initialize the validation system first
        MirrorPlacementValidation.initialize();
        
        this.setupEventListeners();
        this.setupModeButtons();
        this.updateDailyInfo();
        this.generateMirrors();
        this.generateSpawners();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Mouse events on canvas
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
        
        // Global mouse events to handle off-canvas dragging
        document.addEventListener('mousemove', (e) => this.onGlobalMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onGlobalMouseUp(e));
        
        // UI buttons
        document.getElementById('launchBtn').addEventListener('click', () => this.launchLasers());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
    }
    
    setupModeButtons() {
        const freePlayBtn = document.getElementById('freePlayBtn');
        const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');
        
        freePlayBtn.addEventListener('click', () => this.switchToFreePlay());
        dailyChallengeBtn.addEventListener('click', () => this.switchToDailyChallenge());
        
        // Update button states
        this.updateModeButtons();
    }
    
    switchToFreePlay() {
        if (this.isPlaying) return; // Don't allow mode switch during gameplay
        
        this.gameMode = 'freePlay';
        this.dailyPuzzle = null;
        this.challengeCompleted = false;
        this.updateModeButtons();
        this.updateDailyInfo();
        this.resetGame();
    }
    
    switchToDailyChallenge() {
        if (this.isPlaying) return; // Don't allow mode switch during gameplay
        
        this.gameMode = 'dailyChallenge';
        this.challengeCompleted = DailyChallenge.hasCompletedToday();
        this.updateModeButtons();
        this.updateDailyInfo();
        this.resetGame();
    }
    
    updateModeButtons() {
        const freePlayBtn = document.getElementById('freePlayBtn');
        const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        // Update active states
        freePlayBtn.classList.toggle('active', this.gameMode === 'freePlay');
        dailyChallengeBtn.classList.toggle('active', this.gameMode === 'dailyChallenge');
        
        // Update completed state for daily challenge
        const isCompleted = DailyChallenge.hasCompletedToday();
        dailyChallengeBtn.classList.toggle('completed', isCompleted);
        
        // Hide reset button during daily challenge mode
        if (resetBtn) {
            resetBtn.style.display = this.gameMode === 'dailyChallenge' ? 'none' : '';
        }
        
        // Button text is handled by CSS for completed state
        dailyChallengeBtn.textContent = 'Daily Challenge';
    }
    
    updateDailyInfo() {
        const dailyInfo = document.getElementById('dailyInfo');
        const dailyDate = dailyInfo.querySelector('.daily-date');
        const dailyStatus = dailyInfo.querySelector('.daily-status');
        
        if (this.gameMode === 'dailyChallenge') {
            dailyInfo.classList.remove('hidden');
            
            // Show today's date
            const today = DailyChallenge.getTodayString();
            const formattedDate = new Date(today).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
            dailyDate.textContent = formattedDate;
            
            // Show completion status
            if (DailyChallenge.hasCompletedToday()) {
                const score = DailyChallenge.getTodayScore();
                dailyStatus.textContent = `Completed in ${score.time}s`;
                dailyStatus.classList.add('completed');
            } else {
                dailyStatus.textContent = 'Not completed yet';
                dailyStatus.classList.remove('completed');
            }
        } else {
            dailyInfo.classList.add('hidden');
        }
    }
    
    generateMirrors() {
        this.mirrors = [];
        
        if (this.gameMode === 'dailyChallenge') {
            // Generate daily challenge puzzle
            this.dailyPuzzle = DailyChallenge.generatePuzzle();
            
            // Create mirrors from daily puzzle data and validate them
            for (let mirrorData of this.dailyPuzzle.mirrors) {
                let mirror = this.createValidatedMirror(mirrorData);
                if (mirror) {
                    this.mirrors.push(mirror);
                }
            }
            return;
        }
        
        // Free play mode - use surface area management with validation
        const mirrorConfigs = SurfaceAreaManager.generateMirrorsWithTargetSurfaceArea();
        
        for (let config of mirrorConfigs) {
            let mirror = this.createValidatedMirror(config);
            if (mirror) {
                this.mirrors.push(mirror);
            } else {
                // If we can't place this specific mirror config, try generating a replacement
                console.warn('Could not place mirror config, generating replacement:', config);
                mirror = this.generateReplacementMirror(config);
                if (mirror) {
                    this.mirrors.push(mirror);
                }
            }
        }
        
        // Debug: Log total surface area
        const totalSurfaceArea = SurfaceAreaManager.calculateTotalSurfaceArea(this.mirrors);
        console.log(`Free play mirrors generated: ${this.mirrors.length} mirrors, total surface area: ${totalSurfaceArea} (target: ${SurfaceAreaManager.TARGET_SURFACE_AREA})`);
    }
    
    createValidatedMirror(config) {
        const center = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
        const maxAttempts = 100;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate position in ring around center
            const angle = Math.random() * Math.PI * 2;
            const distance = 140 + Math.random() * 180;
            let x = center.x + Math.cos(angle) * distance;
            let y = center.y + Math.sin(angle) * distance;
            
            // Snap to grid
            x = this.snapToGrid(x);
            y = this.snapToGrid(y);
            
            // Create mirror with config properties
            const mirror = new Mirror(x, y);
            mirror.shape = config.shape;
            mirror.size = config.size;
            mirror.width = config.width;
            mirror.height = config.height;
            mirror.rotation = config.rotation || 0;
            
            // Copy special shape properties
            if (config.topWidth) mirror.topWidth = config.topWidth;
            if (config.skew) mirror.skew = config.skew;
            
            // Validate placement using new system
            const validation = MirrorPlacementValidation.isValidPlacement(mirror, this.mirrors);
            if (validation.valid) {
                return mirror;
            }
            
            // Try to find a nearby valid position
            const nearestValidPos = MirrorPlacementValidation.findNearestValidPosition(mirror, this.mirrors);
            if (nearestValidPos) {
                mirror.x = nearestValidPos.x;
                mirror.y = nearestValidPos.y;
                
                // Re-validate the corrected position
                const revalidation = MirrorPlacementValidation.isValidPlacement(mirror, this.mirrors);
                if (revalidation.valid) {
                    return mirror;
                }
            }
        }
        
        return null; // Could not place this mirror
    }
    
    generateReplacementMirror(originalConfig) {
        // Generate a simpler mirror that's easier to place
        const simpleMirrors = [
            { shape: 'square', size: 40, width: 40, height: 40, rotation: 0 },
            { shape: 'square', size: 60, width: 60, height: 60, rotation: 0 },
            { shape: 'rectangle', size: 60, width: 60, height: 40, rotation: 0 },
            { shape: 'rectangle', size: 60, width: 40, height: 60, rotation: 0 }
        ];
        
        for (let simpleConfig of simpleMirrors) {
            let mirror = this.createValidatedMirror(simpleConfig);
            if (mirror) {
                console.log('Generated replacement mirror:', simpleConfig.shape);
                return mirror;
            }
        }
        
        return null;
    }
    
    enforceValidationDuringPlacement() {
        // Check every mirror every frame during placement stage
        for (let mirror of this.mirrors) {
            // Skip the mirror being dragged - allow temporary violations during drag
            if (mirror.isDragging) continue;
            
            // Get other mirrors (excluding this one)
            const otherMirrors = this.mirrors.filter(m => m !== mirror);
            
            // Validate this mirror's placement
            const validation = MirrorPlacementValidation.isValidPlacement(mirror, otherMirrors);
            
            if (!validation.valid) {
                console.warn(`Mirror violation detected: ${validation.reason}`, mirror);
                
                // Find the nearest valid position
                const nearestValidPos = MirrorPlacementValidation.findNearestValidPosition(mirror, otherMirrors);
                
                if (nearestValidPos) {
                    console.log(`Moving mirror from (${mirror.x}, ${mirror.y}) to (${nearestValidPos.x}, ${nearestValidPos.y})`);
                    mirror.x = nearestValidPos.x;
                    mirror.y = nearestValidPos.y;
                } else {
                    // Emergency fallback: move to a safe area
                    const center = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
                    const safeDistance = 200;
                    const angle = Math.random() * Math.PI * 2;
                    
                    mirror.x = this.snapToGrid(center.x + Math.cos(angle) * safeDistance);
                    mirror.y = this.snapToGrid(center.y + Math.sin(angle) * safeDistance);
                    
                    console.warn('Emergency relocation for mirror:', mirror);
                }
            }
        }
    }
    
    generateSpawners() {
        this.spawners = [];
        
        if (this.gameMode === 'dailyChallenge' && this.dailyPuzzle) {
            // Create spawners from daily puzzle data
            this.dailyPuzzle.spawners.forEach(spawnerData => {
                this.spawners.push(new Spawner(spawnerData.x, spawnerData.y, spawnerData.angle));
            });
            return;
        }
        
        // Generate random positions along each edge
        const generateRandomPositions = () => {
            const positions = [];
            const margin = 50; // Keep spawners away from corners
            
            // Left edge - random Y position
            positions.push({ 
                x: 0, 
                y: margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin),
                edge: 'left'
            });
            
            // Right edge - random Y position  
            positions.push({ 
                x: CONFIG.CANVAS_WIDTH, 
                y: margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin),
                edge: 'right'
            });
            
            // Top edge - random X position
            positions.push({ 
                x: margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin), 
                y: 0,
                edge: 'top'
            });
            
            // Bottom edge - random X position
            positions.push({ 
                x: margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin), 
                y: CONFIG.CANVAS_HEIGHT,
                edge: 'bottom'
            });
            
            return positions;
        };
        
        // Pick 4-7 random spawners from random edge positions
        const spawnerCount = 4 + Math.floor(Math.random() * 4); // 4, 5, 6, or 7
        const allPositions = generateRandomPositions();
        
        // Generate more positions if needed to ensure we have enough variety
        while (allPositions.length < spawnerCount) {
            const additionalPositions = generateRandomPositions();
            allPositions.push(...additionalPositions);
        }
        
        const selectedPositions = this.shuffleArray([...allPositions]).slice(0, spawnerCount);
        
        selectedPositions.forEach(pos => {
            const randomAngle = this.getRandomAngleInbound(pos.x, pos.y, pos.edge);
            this.spawners.push(new Spawner(pos.x, pos.y, randomAngle));
        });
    }
    
    snapToGrid(value) {
        return Math.round(value / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    }
    
    adjustMirrorPositionForGrid(mirror) {
        // Adjust position so that borders align with grid lines
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                // For rectangles/squares, ensure all edges are on grid lines
                // This means width and height must be multiples of grid size
                // And center must be positioned so edges hit grid lines
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                
                // Find nearest grid intersection where edges will align
                mirror.x = this.snapToGrid(mirror.x - halfWidth) + halfWidth;
                mirror.y = this.snapToGrid(mirror.y - halfHeight) + halfHeight;
                break;
                
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // For triangles, ensure all vertices are at grid intersections
                // We need to position the center so all vertices hit grid intersections
                this.alignTriangleToGrid(mirror);
                break;
        }
    }
    
    alignTriangleToGrid(mirror) {
        const halfSize = mirror.size / 2;
        const gridSize = CONFIG.GRID_SIZE;
        
        if (mirror.shape === 'rightTriangle') {
            if (halfSize % gridSize === 0) {
                // For 2-tile and 3-tile triangles: halfSize = 20, 30 (multiples of gridSize)
                // Center can be on grid intersection and vertices will align
                mirror.x = this.snapToGrid(mirror.x);
                mirror.y = this.snapToGrid(mirror.y);
            } else {
                // For 1-tile triangles: halfSize = 10 (not multiple of gridSize)
                // Center needs to be offset by half grid to get vertices on intersections
                const baseX = this.snapToGrid(mirror.x);
                const baseY = this.snapToGrid(mirror.y);
                mirror.x = baseX + gridSize / 2;
                mirror.y = baseY + gridSize / 2;
            }
        } else if (mirror.shape === 'isoscelesTriangle') {
            // Isosceles triangles: Handle alignment based on rotation
            const halfWidth = (mirror.width || mirror.size) / 2;
            const halfHeight = (mirror.height || mirror.size) / 2;
            const rotation = mirror.rotation || 0;
            
            if (rotation === 0 || rotation === 180) {
                // Standard orientation: base is horizontal (top or bottom)
                // Always snap X to grid (for even base width, center X should be on grid line)
                mirror.x = this.snapToGrid(mirror.x);
                
                // For Y positioning: base vertices need to be on grid lines
                if (rotation === 0) {
                    // Base at bottom: center.y + halfHeight = grid line
                    const desiredBaseY = this.snapToGrid(mirror.y + halfHeight);
                    mirror.y = desiredBaseY - halfHeight;
                } else {
                    // Base at top: center.y - halfHeight = grid line  
                    const desiredBaseY = this.snapToGrid(mirror.y - halfHeight);
                    mirror.y = desiredBaseY + halfHeight;
                }
            } else if (rotation === 90 || rotation === 270) {
                // Rotated orientation: base is vertical (left or right)
                // Now width/height are swapped due to rotation
                
                // Always snap Y to grid (for even base width, center Y should be on grid line)
                mirror.y = this.snapToGrid(mirror.y);
                
                // For X positioning: base vertices need to be on grid lines
                if (rotation === 90) {
                    // Base at right: center.x + halfHeight = grid line (height becomes horizontal extent)
                    const desiredBaseX = this.snapToGrid(mirror.x + halfHeight);
                    mirror.x = desiredBaseX - halfHeight;
                } else {
                    // Base at left: center.x - halfHeight = grid line
                    const desiredBaseX = this.snapToGrid(mirror.x - halfHeight);
                    mirror.x = desiredBaseX + halfHeight;
                }
            }
        }
    }
    
    alignTrapezoidToGrid(mirror) {
        const halfHeight = mirror.height / 2;
        const bottomHalfWidth = mirror.width / 2;
        const topHalfWidth = (mirror.topWidth || mirror.width * 0.6) / 2;
        const rotation = mirror.rotation || 0;
        
        if (rotation === 0 || rotation === 180) {
            // Standard orientation: horizontal bases
            
            // Step 1: Align both Y edges to grid lines
            const bottomY = this.snapToGrid(mirror.y + halfHeight);
            const topY = this.snapToGrid(mirror.y - halfHeight);
            mirror.y = (bottomY + topY) / 2;
            
            // Step 2: Find X position where ALL vertices land on grid intersections
            // We need both bottom corners AND top corners to be on grid intersections
            
            // Try different X positions to find one where all vertices align
            const currentX = mirror.x;
            let bestX = currentX;
            let bestScore = Infinity;
            
            // Test X positions in a reasonable range around current position
            for (let testX = currentX - CONFIG.GRID_SIZE; testX <= currentX + CONFIG.GRID_SIZE; testX += CONFIG.GRID_SIZE / 4) {
                // Calculate all 4 vertex positions with this X
                const bottomLeft = testX - bottomHalfWidth;
                const bottomRight = testX + bottomHalfWidth;
                const topLeft = testX - topHalfWidth;
                const topRight = testX + topHalfWidth;
                
                // Calculate how far each vertex is from nearest grid intersection
                const bottomLeftError = Math.abs(bottomLeft - this.snapToGrid(bottomLeft));
                const bottomRightError = Math.abs(bottomRight - this.snapToGrid(bottomRight));
                const topLeftError = Math.abs(topLeft - this.snapToGrid(topLeft));
                const topRightError = Math.abs(topRight - this.snapToGrid(topRight));
                
                const totalError = bottomLeftError + bottomRightError + topLeftError + topRightError;
                
                if (totalError < bestScore) {
                    bestScore = totalError;
                    bestX = testX;
                }
            }
            
            mirror.x = bestX;
            
        } else if (rotation === 90 || rotation === 270) {
            // Rotated orientation: vertical bases (dimensions swap)
            // When rotated 90°: height becomes horizontal extent, width/topWidth become vertical extents
            
            // Step 1: Align both X edges to grid lines (using original height as horizontal extent)
            const leftX = this.snapToGrid(mirror.x - halfHeight);
            const rightX = this.snapToGrid(mirror.x + halfHeight);
            mirror.x = (leftX + rightX) / 2;
            
            // Step 2: Find Y position where all vertices align
            const currentY = mirror.y;
            let bestY = currentY;
            let bestScore = Infinity;
            
            for (let testY = currentY - CONFIG.GRID_SIZE; testY <= currentY + CONFIG.GRID_SIZE; testY += CONFIG.GRID_SIZE / 4) {
                // For rotated trapezoid, width/topWidth become the vertical distances from center
                // The "bottom" (wider) base is now vertical, extending bottomHalfWidth from center
                // The "top" (narrower) base is now vertical, extending topHalfWidth from center
                const bottomTop = testY - bottomHalfWidth;    // top of wider base
                const bottomBottom = testY + bottomHalfWidth; // bottom of wider base  
                const topTop = testY - topHalfWidth;          // top of narrower base
                const topBottom = testY + topHalfWidth;       // bottom of narrower base
                
                const bottomTopError = Math.abs(bottomTop - this.snapToGrid(bottomTop));
                const bottomBottomError = Math.abs(bottomBottom - this.snapToGrid(bottomBottom));
                const topTopError = Math.abs(topTop - this.snapToGrid(topTop));
                const topBottomError = Math.abs(topBottom - this.snapToGrid(topBottom));
                
                const totalError = bottomTopError + bottomBottomError + topTopError + topBottomError;
                
                if (totalError < bestScore) {
                    bestScore = totalError;
                    bestY = testY;
                }
            }
            
            mirror.y = bestY;
        }
    }
    
    alignParallelogramToGrid(mirror) {
        const halfHeight = mirror.height / 2;
        const halfWidth = mirror.width / 2;
        const skew = mirror.skew || 20;
        const rotation = mirror.rotation || 0;
        
        if (rotation === 0 || rotation === 180) {
            // Standard orientation
            // Bottom vertices: (x-halfWidth, y+halfHeight), (x+halfWidth, y+halfHeight)
            // Top vertices: (x-halfWidth+skew, y-halfHeight), (x+halfWidth+skew, y-halfHeight)
            
            // Ensure bottom edge is on grid line
            const bottomY = this.snapToGrid(mirror.y + halfHeight);
            mirror.y = bottomY - halfHeight;
            
            // Ensure top edge is on grid line  
            const topY = this.snapToGrid(mirror.y - halfHeight);
            mirror.y = topY + halfHeight;
            
            // Ensure bottom-left vertex is on grid intersection
            const bottomLeftX = this.snapToGrid(mirror.x - halfWidth);
            mirror.x = bottomLeftX + halfWidth;
            
            // Since skew is already a multiple of grid size (20px), and we've aligned
            // the bottom-left to grid, all other vertices should automatically align
            
        } else if (rotation === 90 || rotation === 270) {
            // Rotated 90/270 degrees
            // After rotation, width becomes height and vice versa
            
            // Ensure left edge is on grid line (was bottom before rotation)
            const leftX = this.snapToGrid(mirror.x - halfHeight);
            mirror.x = leftX + halfHeight;
            
            // Ensure right edge is on grid line (was top before rotation)
            const rightX = this.snapToGrid(mirror.x + halfHeight);  
            mirror.x = rightX - halfHeight;
            
            // Ensure one vertex is on grid intersection
            const bottomY = this.snapToGrid(mirror.y - halfWidth);
            mirror.y = bottomY + halfWidth;
        }
    }
    
    isValidMirrorPosition(testMirror) {
        // Get mirror bounds first
        const bounds = this.getMirrorBounds(testMirror);
        
        // Check edge bounds - ensure no part of the mirror extends into forbidden edge zones
        const edgeMargin = CONFIG.EDGE_MARGIN;
        if (bounds.left < edgeMargin || bounds.right > CONFIG.CANVAS_WIDTH - edgeMargin ||
            bounds.top < edgeMargin || bounds.bottom > CONFIG.CANVAS_HEIGHT - edgeMargin) {
            return false;
        }
        
        // Check center forbidden zone - two tiles (40px) from target edge
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const targetRadius = CONFIG.TARGET_RADIUS;
        const forbiddenRadius = targetRadius + 40; // Two tiles (2 * 20px)
        
        // For more accurate center forbidden zone checking, test if mirror bounds intersect the forbidden circle
        const mirrorCenterX = (bounds.left + bounds.right) / 2;
        const mirrorCenterY = (bounds.top + bounds.bottom) / 2;
        const mirrorRadius = Math.max(
            Math.abs(bounds.right - bounds.left) / 2,
            Math.abs(bounds.bottom - bounds.top) / 2
        );
        
        // Distance from mirror center to center target
        const distBetweenCenters = Math.sqrt(
            (mirrorCenterX - centerX) ** 2 + (mirrorCenterY - centerY) ** 2
        );
        
        // Check if mirror's bounding circle intersects with forbidden circle
        if (distBetweenCenters < forbiddenRadius + mirrorRadius) {
            return false;
        }
        
        // Check overlap with existing mirrors (but skip the mirror we're currently dragging)
        for (let existingMirror of this.mirrors) {
            if (existingMirror === testMirror) continue; // Skip self
            if (this.mirrorsOverlap(testMirror, existingMirror)) {
                return false;
            }
        }
        
        return true;
    }
    
    getRandomAngleInbound(x, y, edge) {
        let baseAngleDegrees;
        let allowedRange = 120; // ±60 degrees from base direction
        
        // Determine base inbound direction based on edge
        switch(edge) {
            case 'left':
                baseAngleDegrees = 0; // Point right into the play area
                break;
            case 'right': 
                baseAngleDegrees = 180; // Point left into the play area
                break;
            case 'top':
                baseAngleDegrees = 90; // Point down into the play area
                break;
            case 'bottom':
                baseAngleDegrees = 270; // Point up into the play area
                break;
            default:
                // Fallback to center-pointing logic
                const centerX = CONFIG.CANVAS_WIDTH / 2;
                const centerY = CONFIG.CANVAS_HEIGHT / 2;
                const directAngle = Math.atan2(centerY - y, centerX - x);
                baseAngleDegrees = directAngle * 180 / Math.PI;
                break;
        }
        
        // Add random variation within allowed range
        const variation = (Math.random() - 0.5) * allowedRange;
        const randomDegrees = baseAngleDegrees + variation;
        
        // Snap to 15-degree increments
        const snappedDegrees = Math.round(randomDegrees / CONFIG.ANGLE_INCREMENT) * CONFIG.ANGLE_INCREMENT;
        
        // Convert to radians
        return (snappedDegrees % 360) * Math.PI / 180;
    }
    
    // Keep the old method for backwards compatibility if needed
    getRandomAngleTowardsCenter(x, y) {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        
        // Get the direct angle to center
        const directAngle = Math.atan2(centerY - y, centerX - x);
        const directDegrees = directAngle * 180 / Math.PI;
        
        // Add random variation (±60 degrees for good gameplay)
        const variation = (Math.random() - 0.5) * 120; // ±60 degrees
        const randomDegrees = directDegrees + variation;
        
        // Snap to 15-degree increments
        const snappedDegrees = Math.round(randomDegrees / CONFIG.ANGLE_INCREMENT) * CONFIG.ANGLE_INCREMENT;
        return snappedDegrees * Math.PI / 180;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    launchLasers() {
        if (this.isPlaying) return;
        
        // Prevent launching in completed Daily Challenges
        if (this.gameMode === 'dailyChallenge' && DailyChallenge.hasCompletedToday()) {
            return;
        }
        
        this.isPlaying = true;
        this.gameOver = false;
        this.startTime = Date.now();
        this.gameTime = 0;
        this.lasers = [];
        
        // Create lasers from spawners
        this.spawners.forEach(spawner => {
            this.lasers.push(new Laser(spawner.x, spawner.y, spawner.angle));
        });
        
        document.getElementById('launchBtn').disabled = true;
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'Lasers launched! Protect the center!';
        statusEl.className = 'status-modern status-playing';
    }
    
    resetGame() {
        // In Daily Challenge mode, don't allow reset if already completed
        if (this.gameMode === 'dailyChallenge' && DailyChallenge.hasCompletedToday()) {
            return;
        }
        
        this.isPlaying = false;
        this.gameOver = false;
        this.startTime = 0;
        this.gameTime = 0;
        this.lasers = [];
        this.challengeCompleted = false;
        document.getElementById('timer').textContent = '0:00';
        this.generateMirrors();
        this.generateSpawners();
        
        document.getElementById('launchBtn').disabled = false;
        const statusEl = document.getElementById('status');
        
        if (this.gameMode === 'dailyChallenge') {
            statusEl.textContent = 'Daily Challenge: Position mirrors to protect the center!';
            
            // Disable launch button if already completed
            if (DailyChallenge.hasCompletedToday()) {
                document.getElementById('launchBtn').disabled = true;
                statusEl.textContent = 'Daily Challenge Complete! Come back tomorrow for a new puzzle.';
                statusEl.className = 'status-modern status-success';
                return;
            }
        } else {
            statusEl.textContent = 'Position your mirrors to protect the center!';
        }
        statusEl.className = 'status-modern';
    }
    
    onMouseDown(e) {
        if (this.isPlaying) return;
        
        // Prevent interaction in completed Daily Challenges
        if (this.gameMode === 'dailyChallenge' && DailyChallenge.hasCompletedToday()) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if clicking on a mirror
        for (let mirror of this.mirrors) {
            let isMouseOverMirror = false;
            
            switch (mirror.shape) {
                case 'square':
                case 'rectangle':
                    const halfWidth = mirror.width / 2;
                    const halfHeight = mirror.height / 2;
                    isMouseOverMirror = mouseX >= mirror.x - halfWidth && 
                                      mouseX <= mirror.x + halfWidth &&
                                      mouseY >= mirror.y - halfHeight && 
                                      mouseY <= mirror.y + halfHeight;
                    break;
                case 'rightTriangle':
                    isMouseOverMirror = this.pointInRightTriangle(mouseX, mouseY, mirror);
                    break;
                case 'isoscelesTriangle':
                    isMouseOverMirror = this.pointInIsoscelesTriangle(mouseX, mouseY, mirror);
                    break;
                case 'trapezoid':
                    isMouseOverMirror = this.pointInTrapezoid(mouseX, mouseY, mirror);
                    break;
                case 'parallelogram':
                    isMouseOverMirror = this.pointInParallelogram(mouseX, mouseY, mirror);
                    break;
            }
            
            if (isMouseOverMirror) {
                
                this.draggedMirror = mirror;
                this.dragOffset.x = mouseX - mirror.x;
                this.dragOffset.y = mouseY - mirror.y;
                this.dragStartPos.x = mouseX;
                this.dragStartPos.y = mouseY;
                this.mouseHasMoved = false;
                this.canvas.style.cursor = 'grabbing';
                mirror.isDragging = true;
                
                // Store original position for potential revert
                mirror.originalX = mirror.x;
                mirror.originalY = mirror.y;
                
                console.log('Started dragging mirror at', mirror.x, mirror.y);
                break;
            }
        }
    }
    
    onMouseMove(e) {
        if (!this.draggedMirror || this.isPlaying) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if mouse has moved significantly from start position
        const moveThreshold = 5; // pixels
        const deltaX = Math.abs(mouseX - this.dragStartPos.x);
        const deltaY = Math.abs(mouseY - this.dragStartPos.y);
        
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
            this.mouseHasMoved = true;
        }
        
        // Move smoothly without snapping during drag
        let newX = mouseX - this.dragOffset.x;
        let newY = mouseY - this.dragOffset.y;
        
        // Constrain to canvas bounds with margin for mirror size
        const maxMirrorSize = Math.max(this.draggedMirror.width || this.draggedMirror.size, 
                                      this.draggedMirror.height || this.draggedMirror.size);
        const margin = maxMirrorSize / 2 + 10; // Half mirror size plus small buffer
        
        newX = Math.max(margin, Math.min(CONFIG.CANVAS_WIDTH - margin, newX));
        newY = Math.max(margin, Math.min(CONFIG.CANVAS_HEIGHT - margin, newY));
        
        // Update mirror position directly (no validation during drag)
        this.draggedMirror.x = newX;
        this.draggedMirror.y = newY;
        this.draggedMirror.isDragging = true;
    }
    
    onMouseUp(e) {
        if (this.draggedMirror) {
            // If mouse didn't move, just restore original position and exit
            if (!this.mouseHasMoved) {
                this.draggedMirror.isDragging = false;
                this.canvas.style.cursor = 'default';
                this.draggedMirror = null;
                return;
            }
            
            // Get the final mouse position
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate exact drop position (accounting for drag offset)
            const dropX = mouseX - this.dragOffset.x;
            const dropY = mouseY - this.dragOffset.y;
            
            // Snap to nearest grid intersection
            const targetX = this.snapToGrid(dropX);
            const targetY = this.snapToGrid(dropY);
            
            // Try to place mirror at target position
            this.draggedMirror.x = targetX;
            this.draggedMirror.y = targetY;
            
            // Get other mirrors (excluding the one being dragged)
            const otherMirrors = this.mirrors.filter(m => m !== this.draggedMirror);
            
            // Validate placement using new system
            const validation = MirrorPlacementValidation.isValidPlacement(this.draggedMirror, otherMirrors);
            
            if (!validation.valid) {
                // Find the nearest valid position
                const nearestValidPos = MirrorPlacementValidation.findNearestValidPosition(this.draggedMirror, otherMirrors);
                
                if (nearestValidPos) {
                    this.draggedMirror.x = nearestValidPos.x;
                    this.draggedMirror.y = nearestValidPos.y;
                    console.log(`Mirror moved to nearest valid position: (${nearestValidPos.x}, ${nearestValidPos.y}). Reason: ${validation.reason}`);
                } else {
                    // Final fallback: move to original position
                    console.warn('Could not find valid position, reverting to original');
                    this.draggedMirror.x = this.draggedMirror.originalX || targetX;
                    this.draggedMirror.y = this.draggedMirror.originalY || targetY;
                }
            }
            
            this.draggedMirror.isDragging = false;
            console.log('Mirror placed at', this.draggedMirror.x, this.draggedMirror.y);
        }
        this.draggedMirror = null;
        this.canvas.style.cursor = 'crosshair';
    }
    
    onMouseLeave(e) {
        // When mouse leaves canvas, continue tracking with global events
        // Don't cancel drag here - let global mouseup handle it
        if (this.draggedMirror) {
            console.log('Mouse left canvas during drag - continuing with global tracking');
        }
    }
    
    onGlobalMouseMove(e) {
        // Only handle if we have a dragged mirror and mouse left canvas
        if (!this.draggedMirror) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if mouse is outside canvas bounds
        const isOutside = mouseX < 0 || mouseX > CONFIG.CANVAS_WIDTH || 
                         mouseY < 0 || mouseY > CONFIG.CANVAS_HEIGHT;
        
        if (isOutside) {
            // Constrain the drag to canvas edges
            let newX = mouseX - this.dragOffset.x;
            let newY = mouseY - this.dragOffset.y;
            
            const maxMirrorSize = Math.max(this.draggedMirror.width || this.draggedMirror.size, 
                                          this.draggedMirror.height || this.draggedMirror.size);
            const margin = maxMirrorSize / 2 + 10;
            
            newX = Math.max(margin, Math.min(CONFIG.CANVAS_WIDTH - margin, newX));
            newY = Math.max(margin, Math.min(CONFIG.CANVAS_HEIGHT - margin, newY));
            
            this.draggedMirror.x = newX;
            this.draggedMirror.y = newY;
            this.mouseHasMoved = true;
        }
    }
    
    onGlobalMouseUp(e) {
        // Handle mouse up anywhere on the page
        if (this.draggedMirror) {
            this.onMouseUp(e);
        }
    }
    
    ensureMirrorShapeAlignment(mirror) {
        // Apply proper alignment based on shape, but only if it doesn't cause major position changes
        const originalX = mirror.x;
        const originalY = mirror.y;
        
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                // For rectangles/squares, ensure all edges are on grid lines
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                
                // Find nearest grid intersection where edges will align
                const targetX = this.snapToGrid(originalX - halfWidth) + halfWidth;
                const targetY = this.snapToGrid(originalY - halfHeight) + halfHeight;
                
                // Only adjust if the change is small (within one grid cell)
                if (Math.abs(targetX - originalX) <= CONFIG.GRID_SIZE && 
                    Math.abs(targetY - originalY) <= CONFIG.GRID_SIZE) {
                    mirror.x = targetX;
                    mirror.y = targetY;
                }
                break;
                
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // For triangles, ensure center aligns to grid (vertices will follow)
                const targetTriangleX = this.snapToGrid(originalX);
                const targetTriangleY = this.snapToGrid(originalY);
                
                // Only adjust if the change is small
                if (Math.abs(targetTriangleX - originalX) <= CONFIG.GRID_SIZE && 
                    Math.abs(targetTriangleY - originalY) <= CONFIG.GRID_SIZE) {
                    mirror.x = targetTriangleX;
                    mirror.y = targetTriangleY;
                }
                break;
                
            case 'trapezoid':
                this.alignTrapezoidToGrid(mirror);
                break;
                
            case 'parallelogram':
                this.alignParallelogramToGrid(mirror);
                break;
        }
        
        // After alignment, enforce forbidden zones
        this.enforceForbiddenZones(mirror);
    }
    
    enforceForbiddenZones(mirror) {
        const bounds = this.getMirrorBounds(mirror);
        const forbiddenDistance = 2 * CONFIG.GRID_SIZE; // 2 grid lengths = 40px
        
        let adjustedX = mirror.x;
        let adjustedY = mirror.y;
        
        // Check and fix edge violations
        // Left edge
        if (bounds.left < forbiddenDistance) {
            adjustedX = forbiddenDistance + (mirror.x - bounds.left);
        }
        // Right edge  
        if (bounds.right > CONFIG.CANVAS_WIDTH - forbiddenDistance) {
            adjustedX = (CONFIG.CANVAS_WIDTH - forbiddenDistance) - (bounds.right - mirror.x);
        }
        // Top edge
        if (bounds.top < forbiddenDistance) {
            adjustedY = forbiddenDistance + (mirror.y - bounds.top);
        }
        // Bottom edge
        if (bounds.bottom > CONFIG.CANVAS_HEIGHT - forbiddenDistance) {
            adjustedY = (CONFIG.CANVAS_HEIGHT - forbiddenDistance) - (bounds.bottom - mirror.y);
        }
        
        // Check and fix center target violation (8x8 grid square)
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenSquareSize = 8 * CONFIG.GRID_SIZE; // 8x8 grid tiles = 160px
        const halfForbiddenSize = forbiddenSquareSize / 2;
        
        // Define center forbidden square bounds
        const forbiddenLeft = centerX - halfForbiddenSize;
        const forbiddenRight = centerX + halfForbiddenSize;
        const forbiddenTop = centerY - halfForbiddenSize;
        const forbiddenBottom = centerY + halfForbiddenSize;
        
        // Update bounds after edge adjustments
        mirror.x = adjustedX;
        mirror.y = adjustedY;
        const updatedBounds = this.getMirrorBounds(mirror);
        
        // Check if mirror overlaps with center forbidden square
        const overlapsX = updatedBounds.right > forbiddenLeft && updatedBounds.left < forbiddenRight;
        const overlapsY = updatedBounds.bottom > forbiddenTop && updatedBounds.top < forbiddenBottom;
        
        if (overlapsX && overlapsY) {
            // Calculate which direction to push the mirror (shortest distance out)
            const pushLeft = forbiddenLeft - updatedBounds.right;
            const pushRight = updatedBounds.left - forbiddenRight;
            const pushUp = forbiddenTop - updatedBounds.bottom;
            const pushDown = updatedBounds.top - forbiddenBottom;
            
            // Find the smallest push needed (closest exit)
            const minPushX = Math.abs(pushLeft) < Math.abs(pushRight) ? pushLeft : pushRight;
            const minPushY = Math.abs(pushUp) < Math.abs(pushDown) ? pushUp : pushDown;
            
            // Choose the direction that requires less movement
            if (Math.abs(minPushX) < Math.abs(minPushY)) {
                // Push horizontally
                adjustedX += minPushX;
            } else {
                // Push vertically
                adjustedY += minPushY;
            }
            
            // Snap to grid
            adjustedX = this.snapToGrid(adjustedX);
            adjustedY = this.snapToGrid(adjustedY);
        }
        
        // Apply the adjustments
        mirror.x = adjustedX;
        mirror.y = adjustedY;
    }
    
    snapMirrorToGrid(mirror) {
        // Apply appropriate snapping based on mirror shape
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                // For rectangles/squares, snap center then adjust for edge alignment
                const snappedX = this.snapToGrid(mirror.x);
                const snappedY = this.snapToGrid(mirror.y);
                mirror.x = snappedX;
                mirror.y = snappedY;
                this.adjustMirrorPositionForGrid(mirror);
                break;
                
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // For triangles, use the triangle-specific alignment
                this.alignTriangleToGrid(mirror);
                break;
            case 'trapezoid':
                this.alignTrapezoidToGrid(mirror);
                break;
            case 'parallelogram':
                this.alignParallelogramToGrid(mirror);
                break;
        }
    }
    
    findNearestValidPosition(mirror, maxRadiusInGridCells = 10) {
        // Try positions in expanding spiral from current position
        const startX = this.snapToGrid(mirror.x);
        const startY = this.snapToGrid(mirror.y);
        const maxRadius = maxRadiusInGridCells * CONFIG.GRID_SIZE;
        
        // First try the exact position
        const exactTest = { ...mirror, x: startX, y: startY };
        if (this.isValidMirrorPosition(exactTest)) {
            return { x: startX, y: startY };
        }
        
        // Then expand outward in small increments for closer positions
        for (let radius = CONFIG.GRID_SIZE; radius <= maxRadius; radius += CONFIG.GRID_SIZE) {
            for (let angle = 0; angle < 360; angle += 45) {
                const testX = startX + Math.cos(angle * Math.PI / 180) * radius;
                const testY = startY + Math.sin(angle * Math.PI / 180) * radius;
                const snappedTestX = this.snapToGrid(testX);
                const snappedTestY = this.snapToGrid(testY);
                
                // Create a test mirror at the new position
                const testMirror = { ...mirror, x: snappedTestX, y: snappedTestY };
                
                if (this.isValidMirrorPosition(testMirror)) {
                    return { x: snappedTestX, y: snappedTestY };
                }
            }
        }
        
        // Return null if no valid position found within the radius
        return null;
    }
    
    getMirrorBounds(mirror) {
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
                // For triangles, get bounding box from vertices
                const points = mirror.shape === 'rightTriangle' ? 
                    this.getRightTrianglePoints(mirror) : 
                    this.getIsoscelesTrianglePoints(mirror);
                
                const xs = points.map(p => p.x);
                const ys = points.map(p => p.y);
                
                return {
                    left: Math.min(...xs),
                    right: Math.max(...xs),
                    top: Math.min(...ys),
                    bottom: Math.max(...ys)
                };
            case 'trapezoid':
                // Get actual trapezoid vertices and calculate bounding box
                const trapVertices = this.getTrapezoidVertices(mirror);
                const trapXs = trapVertices.map(v => v.x);
                const trapYs = trapVertices.map(v => v.y);
                
                return {
                    left: Math.min(...trapXs),
                    right: Math.max(...trapXs),
                    top: Math.min(...trapYs),
                    bottom: Math.max(...trapYs)
                };
            case 'parallelogram':
                // Get actual parallelogram vertices and calculate bounding box
                const paraVertices = this.getParallelogramVertices(mirror);
                const paraXs = paraVertices.map(v => v.x);
                const paraYs = paraVertices.map(v => v.y);
                
                return {
                    left: Math.min(...paraXs),
                    right: Math.max(...paraXs),
                    top: Math.min(...paraYs),
                    bottom: Math.max(...paraYs)
                };
            default:
                return { left: mirror.x, right: mirror.x, top: mirror.y, bottom: mirror.y };
        }
    }
    
    getClosestPointToCenter(mirror, centerX, centerY) {
        const bounds = this.getMirrorBounds(mirror);
        
        // Find closest point on bounding box to center
        const closestX = Math.max(bounds.left, Math.min(centerX, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(centerY, bounds.bottom));
        
        return { x: closestX, y: closestY };
    }
    
    mirrorsOverlap(mirror1, mirror2) {
        const bounds1 = this.getMirrorBounds(mirror1);
        const bounds2 = this.getMirrorBounds(mirror2);
        
        // Check if bounding boxes overlap
        return !(bounds1.right <= bounds2.left || 
                bounds2.right <= bounds1.left || 
                bounds1.bottom <= bounds2.top || 
                bounds2.bottom <= bounds1.top);
    }
    
    update() {
        // Only validate if no drag operation is active
        if (!this.isPlaying && !this.draggedMirror) {
            this.enforceValidationDuringPlacement();
        }
        
        if (!this.isPlaying || this.gameOver) return;
        
        // Update game time
        this.gameTime = (Date.now() - this.startTime) / 1000;
        this.updateTimerDisplay();
        
        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update();
            
            // Check continuous collision with mirrors (check path from previous to current position)
            for (let mirror of this.mirrors) {
                if (this.checkContinuousLaserMirrorCollision(laser, mirror)) {
                    laser.reflect(mirror);
                    break;
                }
            }
            
            // Check collision with center target
            if (this.checkLaserTargetCollision(laser)) {
                this.showGameOverModal();
                return;
            }
            
            // Remove laser if out of bounds
            if (laser.x < 0 || laser.x > CONFIG.CANVAS_WIDTH || 
                laser.y < 0 || laser.y > CONFIG.CANVAS_HEIGHT) {
                this.lasers.splice(i, 1);
            }
        }
    }
    
    enforceIronCladValidation() {
        // Check every mirror every frame during placement stage
        for (let mirror of this.mirrors) {
            // Skip the mirror being dragged - allow temporary overlaps during drag
            if (mirror.isDragging) continue;
            
            let needsFix = false;
            
            // RULE 1: Check if shape edges are aligned to grid lines
            if (!this.isShapeProperlyAligned(mirror)) {
                needsFix = true;
            }
            
            // RULE 2: Check if any part is in forbidden zones
            if (this.isInForbiddenZone(mirror)) {
                needsFix = true;
            }
            
            // RULE 3: Check if overlapping with other mirrors (except during drag)
            if (this.isOverlappingWithOthers(mirror)) {
                needsFix = true;
            }
            
            // Fix any violations immediately
            if (needsFix) {
                this.forceCorrectPlacement(mirror);
            }
        }
    }
    
    isShapeProperlyAligned(mirror) {
        switch (mirror.shape) {
            case 'square':
                const halfSize = mirror.size / 2;
                const leftEdge = mirror.x - halfSize;
                const rightEdge = mirror.x + halfSize;
                const topEdge = mirror.y - halfSize;
                const bottomEdge = mirror.y + halfSize;
                
                // All edges must be exactly on grid lines
                return this.isOnGridLine(leftEdge) && this.isOnGridLine(rightEdge) &&
                       this.isOnGridLine(topEdge) && this.isOnGridLine(bottomEdge);
                
            case 'rectangle':
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                const rectLeft = mirror.x - halfWidth;
                const rectRight = mirror.x + halfWidth;
                const rectTop = mirror.y - halfHeight;
                const rectBottom = mirror.y + halfHeight;
                
                // All edges must be exactly on grid lines
                return this.isOnGridLine(rectLeft) && this.isOnGridLine(rectRight) &&
                       this.isOnGridLine(rectTop) && this.isOnGridLine(rectBottom);
                
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // For triangles, check if vertices are properly aligned to grid
                return this.areTriangleVerticesAligned(mirror);
                
            case 'trapezoid':
            case 'parallelogram':
                // For trapezoids and parallelograms, check if flat sides are on grid lines
                return this.areQuadrilateralSidesAligned(mirror);
                
            default:
                return true;
        }
    }
    
    isOnGridLine(value) {
        // Check if value is exactly on a grid line (within 0.1px tolerance for floating point)
        const remainder = Math.abs(value % CONFIG.GRID_SIZE);
        return remainder < 0.1 || remainder > (CONFIG.GRID_SIZE - 0.1);
    }
    
    areTriangleVerticesAligned(mirror) {
        // Get the actual triangle vertices and check if they're on grid intersections
        let points;
        if (mirror.shape === 'rightTriangle') {
            points = this.getRightTrianglePoints(mirror);
            // For right triangles, all vertices should be on grid intersections
            return points.every(point => 
                this.isOnGridLine(point.x) && this.isOnGridLine(point.y)
            );
        } else if (mirror.shape === 'isoscelesTriangle') {
            points = this.getIsoscelesTrianglePoints(mirror);
            // For isosceles triangles, only require base vertices to be on grid lines
            // Base vertices are the last two points (bottom-left and bottom-right)
            const baseVertices = points.slice(1, 3); // Skip apex (index 0)
            return baseVertices.every(point => 
                this.isOnGridLine(point.x) && this.isOnGridLine(point.y)
            );
        } else {
            return false;
        }
    }
    
    areQuadrilateralSidesAligned(mirror) {
        // Check if all vertices are on grid intersections
        let vertices;
        
        if (mirror.shape === 'trapezoid') {
            vertices = this.getTrapezoidVertices(mirror);
        } else if (mirror.shape === 'parallelogram') {
            vertices = this.getParallelogramVertices(mirror);
        } else {
            return true;
        }
        
        // All vertices must be on grid intersections
        return vertices.every(vertex => 
            this.isOnGridLine(vertex.x) && this.isOnGridLine(vertex.y)
        );
    }
    
    getTrapezoidVertices(mirror) {
        const halfHeight = mirror.height / 2;
        const bottomHalfWidth = mirror.width / 2;
        const topHalfWidth = (mirror.topWidth || mirror.width * 0.6) / 2;
        const rotation = mirror.rotation || 0;
        
        // Calculate vertices based on rotation
        if (rotation === 0 || rotation === 180) {
            // Standard orientation: bases are horizontal
            return [
                { x: mirror.x - bottomHalfWidth, y: mirror.y + halfHeight },  // bottom-left
                { x: mirror.x + bottomHalfWidth, y: mirror.y + halfHeight },  // bottom-right
                { x: mirror.x + topHalfWidth, y: mirror.y - halfHeight },     // top-right
                { x: mirror.x - topHalfWidth, y: mirror.y - halfHeight }      // top-left
            ];
        } else if (rotation === 90 || rotation === 270) {
            // Rotated 90/270: bases become vertical, height/width swap meanings
            return [
                { x: mirror.x - halfHeight, y: mirror.y + bottomHalfWidth },  // bottom-left (now wider base)
                { x: mirror.x - halfHeight, y: mirror.y - bottomHalfWidth },  // top-left  
                { x: mirror.x + halfHeight, y: mirror.y - topHalfWidth },     // top-right (now narrower base)
                { x: mirror.x + halfHeight, y: mirror.y + topHalfWidth }      // bottom-right
            ];
        }
        
        return [];
    }
    
    getParallelogramVertices(mirror) {
        const halfHeight = mirror.height / 2;
        const halfWidth = mirror.width / 2;
        const skew = mirror.skew || 20;
        const rotation = mirror.rotation || 0;
        
        // Calculate vertices based on rotation
        if (rotation === 0 || rotation === 180) {
            // Standard orientation: skew is horizontal
            return [
                { x: mirror.x - halfWidth, y: mirror.y + halfHeight },        // bottom-left
                { x: mirror.x + halfWidth, y: mirror.y + halfHeight },        // bottom-right
                { x: mirror.x + halfWidth + skew, y: mirror.y - halfHeight }, // top-right (skewed)
                { x: mirror.x - halfWidth + skew, y: mirror.y - halfHeight }  // top-left (skewed)
            ];
        } else if (rotation === 90 || rotation === 270) {
            // Rotated 90/270: skew becomes vertical, dimensions swap
            return [
                { x: mirror.x - halfHeight, y: mirror.y - halfWidth },        // top-left
                { x: mirror.x - halfHeight, y: mirror.y + halfWidth },        // bottom-left  
                { x: mirror.x + halfHeight, y: mirror.y + halfWidth + skew }, // bottom-right (skewed)
                { x: mirror.x + halfHeight, y: mirror.y - halfWidth + skew }  // top-right (skewed)
            ];
        }
        
        return [];
    }
    
    isInForbiddenZone(mirror) {
        const bounds = this.getMirrorBounds(mirror);
        const forbiddenDistance = 2 * CONFIG.GRID_SIZE; // 40px from edges
        
        // Check edge violations
        if (bounds.left < forbiddenDistance || 
            bounds.right > CONFIG.CANVAS_WIDTH - forbiddenDistance ||
            bounds.top < forbiddenDistance || 
            bounds.bottom > CONFIG.CANVAS_HEIGHT - forbiddenDistance) {
            return true;
        }
        
        // Check center forbidden square (8x8 grid)
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenSquareSize = 8 * CONFIG.GRID_SIZE;
        const halfForbiddenSize = forbiddenSquareSize / 2;
        
        const forbiddenLeft = centerX - halfForbiddenSize;
        const forbiddenRight = centerX + halfForbiddenSize;
        const forbiddenTop = centerY - halfForbiddenSize;
        const forbiddenBottom = centerY + halfForbiddenSize;
        
        // Check if mirror overlaps with center forbidden square
        const overlapsX = bounds.right > forbiddenLeft && bounds.left < forbiddenRight;
        const overlapsY = bounds.bottom > forbiddenTop && bounds.top < forbiddenBottom;
        
        return overlapsX && overlapsY;
    }
    
    isOverlappingWithOthers(mirror) {
        // Check if this mirror overlaps with any other mirror
        for (let otherMirror of this.mirrors) {
            if (otherMirror === mirror) continue; // Skip self
            if (otherMirror.isDragging) continue; // Skip mirrors being dragged
            
            if (this.mirrorsOverlap(mirror, otherMirror)) {
                return true;
            }
        }
        return false;
    }
    
    forceCorrectPlacement(mirror) {
        // First: Force proper grid alignment
        this.forceGridAlignment(mirror);
        
        // Then: Force out of forbidden zones
        this.enforceForbiddenZones(mirror);
        
        // Double-check and fix again if still invalid
        if (!this.isShapeProperlyAligned(mirror) || 
            this.isInForbiddenZone(mirror) || 
            this.isOverlappingWithOthers(mirror)) {
            // Find the nearest valid position
            const validPosition = this.findNearestValidPosition(mirror);
            if (validPosition) {
                mirror.x = validPosition.x;
                mirror.y = validPosition.y;
            }
        }
    }
    
    forceGridAlignment(mirror) {
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                // For rectangles/squares, ensure all edges are exactly on grid lines
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                
                // Force edges to grid lines
                const leftGridLine = this.snapToGrid(mirror.x - halfWidth);
                const topGridLine = this.snapToGrid(mirror.y - halfHeight);
                
                mirror.x = leftGridLine + halfWidth;
                mirror.y = topGridLine + halfHeight;
                break;
                
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // Use the same alignment logic as alignTriangleToGrid
                this.alignTriangleToGrid(mirror);
                break;
            case 'trapezoid':
                this.alignTrapezoidToGrid(mirror);
                break;
            case 'parallelogram':
                this.alignParallelogramToGrid(mirror);
                break;
        }
    }
    
    findNearestValidPosition(mirror) {
        // Try positions in expanding grid around current position
        const startX = this.snapToGrid(mirror.x);
        const startY = this.snapToGrid(mirror.y);
        
        for (let radius = 0; radius <= 10; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Skip inner positions already checked
                    if (radius > 0 && Math.abs(dx) < radius && Math.abs(dy) < radius) continue;
                    
                    const testX = startX + dx * CONFIG.GRID_SIZE;
                    const testY = startY + dy * CONFIG.GRID_SIZE;
                    
                    // Create test mirror
                    const testMirror = { ...mirror, x: testX, y: testY };
                    this.forceGridAlignment(testMirror);
                    
                    // Check if this position is valid
                    if (this.isShapeProperlyAligned(testMirror) && 
                        !this.isInForbiddenZone(testMirror) &&
                        !this.overlapsWithOtherMirrors(testMirror, mirror)) {
                        return { x: testMirror.x, y: testMirror.y };
                    }
                }
            }
        }
        
        return null; // No valid position found
    }
    
    overlapsWithOtherMirrors(testMirror, excludeMirror) {
        for (let existingMirror of this.mirrors) {
            if (existingMirror === excludeMirror) continue;
            if (this.mirrorsOverlap(testMirror, existingMirror)) {
                return true;
            }
        }
        return false;
    }
    
    checkContinuousLaserMirrorCollision(laser, mirror) {
        // Skip collision if laser is in cooldown with this specific mirror
        if (laser.reflectionCooldown > 0 && laser.lastReflectedMirror === mirror) {
            return false;
        }
        
        // If laser doesn't have previous position yet, fall back to point collision
        if (laser.prevX === undefined || laser.prevY === undefined) {
            return this.checkLaserMirrorCollision(laser, mirror);
        }
        
        // Check if previous position was outside and current position is inside
        const wasOutside = !this.checkLaserMirrorCollision({x: laser.prevX, y: laser.prevY}, mirror);
        const isInside = this.checkLaserMirrorCollision(laser, mirror);
        
        if (wasOutside && isInside) {
            // Laser just entered mirror - this is a proper collision
            this.moveLaserToMirrorEdge(laser, mirror);
            
            // Additional safeguard: push laser slightly away from mirror to prevent immediate re-collision
            this.nudgeLaserAwayFromMirror(laser, mirror);
            
            return true;
        }
        
        if (isInside && !wasOutside) {
            // Laser is stuck inside - emergency escape (but only if not in cooldown)
            if (laser.reflectionCooldown === 0) {
                this.emergencyEscapeLaser(laser, mirror);
                return true;
            }
        }
        
        return false;
    }
    
    moveLaserToMirrorEdge(laser, mirror) {
        // Try to find the exact collision point between previous and current position
        let bestX = laser.prevX;
        let bestY = laser.prevY;
        
        // Binary search for exact collision point
        let t1 = 0;  // Previous position (known to be outside)
        let t2 = 1;  // Current position (known to be inside)
        
        for (let iterations = 0; iterations < 10; iterations++) {
            const t = (t1 + t2) / 2;
            const testX = laser.prevX + (laser.x - laser.prevX) * t;
            const testY = laser.prevY + (laser.y - laser.prevY) * t;
            
            if (this.checkLaserMirrorCollision({x: testX, y: testY}, mirror)) {
                // Still inside, move t2 back
                t2 = t;
            } else {
                // Outside, move t1 forward and update best position
                t1 = t;
                bestX = testX;
                bestY = testY;
            }
        }
        
        laser.x = bestX;
        laser.y = bestY;
    }
    
    emergencyEscapeLaser(laser, mirror) {
        // Laser is stuck inside - push it out in the direction opposite to its velocity
        const escapeDistance = 5; // Push out by 5 pixels
        const normalizedVx = laser.vx / CONFIG.LASER_SPEED;
        const normalizedVy = laser.vy / CONFIG.LASER_SPEED;
        
        // Try pushing in opposite direction of movement
        let testX = laser.x - normalizedVx * escapeDistance;
        let testY = laser.y - normalizedVy * escapeDistance;
        
        if (!this.checkLaserMirrorCollision({x: testX, y: testY}, mirror)) {
            laser.x = testX;
            laser.y = testY;
            return;
        }
        
        // If that doesn't work, try all cardinal directions
        const directions = [
            {x: escapeDistance, y: 0},
            {x: -escapeDistance, y: 0},
            {x: 0, y: escapeDistance},
            {x: 0, y: -escapeDistance}
        ];
        
        for (let dir of directions) {
            testX = laser.x + dir.x;
            testY = laser.y + dir.y;
            
            if (!this.checkLaserMirrorCollision({x: testX, y: testY}, mirror)) {
                laser.x = testX;
                laser.y = testY;
                return;
            }
        }
        
        // Ultimate fallback: use previous position
        laser.x = laser.prevX;
        laser.y = laser.prevY;
    }
    
    nudgeLaserAwayFromMirror(laser, mirror) {
        // Push laser slightly away from mirror in the direction opposite to its velocity
        const nudgeDistance = 1; // Small nudge distance
        const speed = Math.sqrt(laser.vx * laser.vx + laser.vy * laser.vy);
        const normalizedVx = laser.vx / speed;
        const normalizedVy = laser.vy / speed;
        
        // Try nudging backwards first
        let testX = laser.x - normalizedVx * nudgeDistance;
        let testY = laser.y - normalizedVy * nudgeDistance;
        
        if (!this.checkLaserMirrorCollision({x: testX, y: testY}, mirror)) {
            laser.x = testX;
            laser.y = testY;
        }
    }
    
    
    checkLaserMirrorCollision(laser, mirror) {
        switch (mirror.shape) {
            case 'square':
            case 'rectangle':
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                return laser.x >= mirror.x - halfWidth && 
                       laser.x <= mirror.x + halfWidth &&
                       laser.y >= mirror.y - halfHeight && 
                       laser.y <= mirror.y + halfHeight;
            
            case 'rightTriangle':
                return this.pointInRightTriangle(laser.x, laser.y, mirror);
            
            case 'isoscelesTriangle':
                return this.pointInIsoscelesTriangle(laser.x, laser.y, mirror);
            
            case 'trapezoid':
                return this.pointInTrapezoid(laser.x, laser.y, mirror);
                
            case 'parallelogram':
                return this.pointInParallelogram(laser.x, laser.y, mirror);
            
            default:
                return false;
        }
    }
    
    pointInRightTriangle(px, py, mirror) {
        const halfSize = mirror.size / 2;
        
        // Get triangle points with rotation applied
        const points = this.getRightTrianglePoints(mirror);
        
        // Use barycentric coordinates to test if point is inside triangle
        return this.pointInTriangle(px, py, points[0], points[1], points[2]);
    }
    
    pointInIsoscelesTriangle(px, py, mirror) {
        const halfSize = mirror.size / 2;
        
        // Get triangle points with rotation applied
        const points = this.getIsoscelesTrianglePoints(mirror);
        
        // Use barycentric coordinates to test if point is inside triangle
        return this.pointInTriangle(px, py, points[0], points[1], points[2]);
    }
    
    getRightTrianglePoints(mirror) {
        const halfSize = mirror.size / 2;
        let points = [
            { x: mirror.x - halfSize, y: mirror.y + halfSize }, // bottom-left (right angle)
            { x: mirror.x + halfSize, y: mirror.y + halfSize }, // bottom-right
            { x: mirror.x - halfSize, y: mirror.y - halfSize }  // top-left
        ];
        
        // Apply rotation if needed
        if (mirror.rotation) {
            points = points.map(p => this.rotatePoint(p.x, p.y, mirror.x, mirror.y, mirror.rotation));
        }
        
        return points;
    }
    
    getIsoscelesTrianglePoints(mirror) {
        const halfWidth = (mirror.width || mirror.size) / 2;  // Base half-width
        const halfHeight = (mirror.height || mirror.size) / 2; // Height from center to top/bottom
        
        let points = [
            { x: mirror.x, y: mirror.y - halfHeight },           // top apex
            { x: mirror.x - halfWidth, y: mirror.y + halfHeight }, // bottom-left
            { x: mirror.x + halfWidth, y: mirror.y + halfHeight }  // bottom-right
        ];
        
        // Apply rotation if needed
        if (mirror.rotation) {
            points = points.map(p => this.rotatePoint(p.x, p.y, mirror.x, mirror.y, mirror.rotation));
        }
        
        return points;
    }
    
    rotatePoint(px, py, centerX, centerY, angleDegrees) {
        const angle = angleDegrees * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Translate to origin
        const x = px - centerX;
        const y = py - centerY;
        
        // Rotate
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        // Translate back
        return {
            x: rotatedX + centerX,
            y: rotatedY + centerY
        };
    }
    
    pointInTriangle(px, py, p1, p2, p3) {
        // Using barycentric coordinates
        const denom = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
        const a = ((p2.y - p3.y) * (px - p3.x) + (p3.x - p2.x) * (py - p3.y)) / denom;
        const b = ((p3.y - p1.y) * (px - p3.x) + (p1.x - p3.x) * (py - p3.y)) / denom;
        const c = 1 - a - b;
        
        return a >= 0 && b >= 0 && c >= 0;
    }
    
    pointInTrapezoid(px, py, mirror) {
        const vertices = this.getTrapezoidVertices(mirror);
        return this.pointInPolygon(px, py, vertices);
    }
    
    pointInParallelogram(px, py, mirror) {
        const vertices = this.getParallelogramVertices(mirror);
        return this.pointInPolygon(px, py, vertices);
    }
    
    pointInPolygon(px, py, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    checkLaserTargetCollision(laser) {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((laser.x - centerX) ** 2 + (laser.y - centerY) ** 2);
        return distance <= CONFIG.TARGET_RADIUS;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Draw grid
        this.drawGrid();
        
        // Draw center target
        this.drawTarget();
        
        // Draw spawners
        this.spawners.forEach(spawner => spawner.draw(this.ctx));
        
        // Draw mirrors
        this.mirrors.forEach(mirror => mirror.draw(this.ctx));
        
        // Draw lasers
        this.lasers.forEach(laser => laser.draw(this.ctx));
        
        // Draw forbidden zones
        if (!this.isPlaying) {
            this.drawForbiddenZones();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
    }
    
    drawTarget() {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const radius = CONFIG.TARGET_RADIUS;
        
        this.ctx.save();
        
        // Outer protective aura - pulsing effect
        const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() / 300);
        this.ctx.globalAlpha = pulseIntensity * 0.3;
        this.ctx.shadowColor = this.gameOver ? '#ff0000' : '#00ff88';
        this.ctx.shadowBlur = 40;
        this.ctx.fillStyle = this.gameOver ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 136, 0.1)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Middle aura ring
        this.ctx.globalAlpha = pulseIntensity * 0.5;
        this.ctx.shadowBlur = 25;
        this.ctx.fillStyle = this.gameOver ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 136, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner aura
        this.ctx.globalAlpha = pulseIntensity * 0.7;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = this.gameOver ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 136, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        
        // Main computer chip body - hexagonal with rounded corners
        const chipSize = radius * 0.9;
        this.ctx.fillStyle = this.gameOver ? '#660000' : '#003322';
        this.ctx.strokeStyle = this.gameOver ? '#ff3366' : '#00ff88';
        this.ctx.lineWidth = 3;
        
        // Draw hexagonal chip outline
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize;
            const y = centerY + Math.sin(angle) * chipSize;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Inner chip core - smaller circle with glow
        this.ctx.shadowColor = this.gameOver ? '#ff3366' : '#00ff88';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = this.gameOver ? '#ff1144' : '#00ff66';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, chipSize * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Circuit pattern lines radiating from center
        this.ctx.shadowBlur = 5;
        this.ctx.strokeStyle = this.gameOver ? '#ff6699' : '#66ffaa';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const innerRadius = chipSize * 0.5;
            const outerRadius = chipSize * 0.8;
            
            this.ctx.beginPath();
            this.ctx.moveTo(
                centerX + Math.cos(angle) * innerRadius,
                centerY + Math.sin(angle) * innerRadius
            );
            this.ctx.lineTo(
                centerX + Math.cos(angle) * outerRadius,
                centerY + Math.sin(angle) * outerRadius
            );
            this.ctx.stroke();
        }
        
        // Corner connection points (like chip pins)
        this.ctx.shadowBlur = 3;
        this.ctx.fillStyle = this.gameOver ? '#ff4477' : '#44ff77';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * chipSize * 0.9;
            const y = centerY + Math.sin(angle) * chipSize * 0.9;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Central processing indicator - pulsing dot
        this.ctx.shadowBlur = 8;
        this.ctx.fillStyle = this.gameOver ? '#ffffff' : '#ffffff';
        const centralPulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
        this.ctx.globalAlpha = centralPulse;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawForbiddenZones() {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Much brighter - was 0.1, now 0.3
        
        // Center forbidden zone (8x8 grid square)
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenSquareSize = 8 * CONFIG.GRID_SIZE; // 8x8 grid tiles = 160px
        const halfForbiddenSize = forbiddenSquareSize / 2;
        
        this.ctx.fillRect(
            centerX - halfForbiddenSize,
            centerY - halfForbiddenSize,
            forbiddenSquareSize,
            forbiddenSquareSize
        );
        
        // Edge forbidden zones
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.EDGE_MARGIN);
        this.ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - CONFIG.EDGE_MARGIN, CONFIG.CANVAS_WIDTH, CONFIG.EDGE_MARGIN);
        this.ctx.fillRect(0, 0, CONFIG.EDGE_MARGIN, CONFIG.CANVAS_HEIGHT);
        this.ctx.fillRect(CONFIG.CANVAS_WIDTH - CONFIG.EDGE_MARGIN, 0, CONFIG.EDGE_MARGIN, CONFIG.CANVAS_HEIGHT);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const centiseconds = Math.floor((this.gameTime % 1) * 100);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
        document.getElementById('timer').textContent = timeString;
    }
    
    async showGameOverModal() {
        this.gameOver = true;
        
        // Format final time with centiseconds
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const centiseconds = Math.floor((this.gameTime % 1) * 100);
        const finalTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
        
        // Update modal content
        document.getElementById('finalTime').textContent = finalTimeString;
        
        // Get performance rating based on survival time
        try {
            const performanceData = await PerformanceRating.getRating(this.gameTime);
            const performanceElement = document.getElementById('missionPerformance');
            performanceElement.textContent = performanceData.rating;
            performanceElement.style.color = performanceData.color;
            performanceElement.style.textShadow = `0 0 10px ${performanceData.color}`;
            performanceElement.title = performanceData.description; // Tooltip on hover
        } catch (error) {
            console.error('Error loading performance rating:', error);
            const performanceElement = document.getElementById('missionPerformance');
            performanceElement.textContent = 'Failed';
            performanceElement.style.color = '#ff3366';
        }
        
        // Show modal
        document.getElementById('gameOverModal').classList.remove('hidden');
        
        // Update status
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'CORE BREACH! Check your final score above.';
        statusEl.className = 'status-modern status-game-over';
    }
    
    continueAfterGameOver() {
        // Allow player to continue playing after game over
        this.gameOver = false;
        this.isPlaying = false;
        
        // Reset the game state
        this.resetGame();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}