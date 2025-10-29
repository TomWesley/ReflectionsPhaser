import { CONFIG } from '../config.js';
import { Mirror } from './Mirror.js';
import { MirrorFactory } from '../mirrors/MirrorFactory.js';
import { Laser } from './Laser.js';
import { Spawner } from './Spawner.js';
import { DailyChallenge } from '../validation/DailyChallenge.js';
import { SurfaceAreaManager } from '../validation/SurfaceAreaManager.js';
import { PerformanceRating } from '../validation/PerformanceRating.js';
import { MirrorPlacementValidation } from '../validation/MirrorPlacementValidation.js';
import { IronCladValidator } from '../validation/IronCladValidator.js';
import { GridAlignmentEnforcer } from '../validation/GridAlignmentEnforcer.js';
// New modular components
import { CollisionSystem } from '../core/CollisionSystem.js';
import { LaserCollisionHandler } from '../core/LaserCollisionHandler.js';
import { ShapeGeometry } from '../geometry/ShapeGeometry.js';
import { GameRenderer } from '../rendering/GameRenderer.js';
import { GameModeManager } from '../managers/GameModeManager.js';
import { MirrorGenerator } from '../generators/MirrorGenerator.js';
import { SpawnerGenerator } from '../generators/SpawnerGenerator.js';
import { GridAlignmentSystem } from '../systems/GridAlignmentSystem.js';
import { MirrorPlacementHelper } from '../generators/MirrorPlacementHelper.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.gameOver = false;
        this.startTime = 0;
        this.gameTime = 0;

        // Game objects
        this.mirrors = [];
        this.lasers = [];
        this.spawners = [];
        
        // Interaction state
        this.draggedMirror = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dragStartPos = { x: 0, y: 0 };
        this.mouseHasMoved = false;

        // Initialize collision systems
        this.collisionSystem = new CollisionSystem();
        this.laserCollisionHandler = new LaserCollisionHandler(this.collisionSystem);

        // Initialize renderer
        this.renderer = new GameRenderer(this.ctx, this);

        // Initialize mode manager
        this.modeManager = new GameModeManager(this);

        // Initialize mirror generator
        this.mirrorGenerator = new MirrorGenerator(this);

        // Initialize spawner generator
        this.spawnerGenerator = new SpawnerGenerator(this);

        this.init();
    }
    
    init() {
        // Initialize the validation system first
        MirrorPlacementValidation.initialize();

        this.setupEventListeners();
        this.modeManager.setupModeButtons();
        this.modeManager.updateDailyInfo();
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
    
    
    generateMirrors() {
        // Delegate mirror generation to the MirrorGenerator
        this.mirrors = this.mirrorGenerator.generateMirrors();
    }

    // Helper method to safely update mirror vertices
    safeUpdateVertices(mirror) {
        if (typeof mirror.updateVertices === 'function') {
            mirror.updateVertices();
        } else if (typeof mirror.calculateVertices === 'function') {
            mirror.vertices = mirror.calculateVertices();
        } else {
            console.error('Mirror has no way to calculate vertices!', mirror);
        }
    }

    
    generateSpawners() {
        // Delegate spawner generation to the SpawnerGenerator
        this.spawners = this.spawnerGenerator.generateSpawners();
    }
    
    snapToGrid(value) {
        return GridAlignmentSystem.snapToGrid(value);
    }

    adjustMirrorPositionForGrid(mirror) {
        GridAlignmentSystem.adjustMirrorPositionForGrid(mirror, this);
    }

    alignTriangleToGrid(mirror) {
        GridAlignmentSystem.alignTriangleToGrid(mirror);
    }

    alignTrapezoidToGrid(mirror) {
        GridAlignmentSystem.alignTrapezoidToGrid(mirror, this);
    }

    alignParallelogramToGrid(mirror) {
        GridAlignmentSystem.alignParallelogramToGrid(mirror);
    }
    
    isValidMirrorPosition(testMirror) {
        // Use IronCladValidator for consistency
        // This ensures all validation uses the same rules
        const validation = IronCladValidator.validateMirror(testMirror, this.mirrors);
        return validation.valid;
    }
    
    launchLasers() {
        if (this.isPlaying) return;

        // Prevent launching in completed Daily Challenges
        if (this.modeManager.isDailyChallenge() && this.modeManager.isDailyChallengeCompleted()) {
            return;
        }

        // IRON-CLAD PRE-LAUNCH VALIDATION: Run full validation report
        console.log('🔍 Running pre-launch validation...');
        const validationReport = IronCladValidator.generateReport(this.mirrors);

        if (!validationReport.allValid) {
            console.error('❌ CANNOT LAUNCH: Validation violations detected!');
            console.error('Fix all violations before launching lasers');
            return;
        }

        console.log('🚀 Launching lasers - initializing collision system...');

        // Show brief loading message
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'Calculating collision boundaries...';
            statusEl.className = 'status-modern';
        }

        // Allow UI to update before heavy computation
        setTimeout(() => {
            // Initialize collision boundaries for all mirrors (iron-clad system)
            this.collisionSystem.initializeCollisionBoundaries(this.mirrors);
            this.laserCollisionHandler.initialize(this.mirrors);

            this.isPlaying = true;
            this.gameOver = false;
            this.startTime = Date.now();
            this.gameTime = 0;
            this.lasers = [];

            console.log('✅ Collision system ready');

            // Create lasers from spawners
            this.createLasersFromSpawners();

            // Update status
            if (statusEl) {
                statusEl.textContent = 'Defense systems active!';
                statusEl.className = 'status-modern';
            }
        }, 50); // 50ms delay to show loading message
    }

    createLasersFromSpawners() {
        // Create lasers from spawners
        this.spawners.forEach(spawner => {
            this.lasers.push(new Laser(spawner.x, spawner.y, spawner.angle));
        });

        document.getElementById('launchBtn').disabled = true;
    }
    
    resetGame() {
        // In Daily Challenge mode, don't allow reset if already completed
        if (this.modeManager.isDailyChallenge() && this.modeManager.isDailyChallengeCompleted()) {
            return;
        }

        this.isPlaying = false;
        this.gameOver = false;
        this.startTime = 0;
        this.gameTime = 0;
        this.lasers = [];
        document.getElementById('timer').textContent = '0:00';
        this.generateMirrors();
        this.generateSpawners();

        document.getElementById('launchBtn').disabled = false;
        const statusEl = document.getElementById('status');

        if (this.modeManager.isDailyChallenge()) {
            statusEl.textContent = 'Daily Challenge: Position mirrors to protect the center!';

            // Disable launch button if already completed
            if (this.modeManager.isDailyChallengeCompleted()) {
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
        if (this.modeManager.isDailyChallenge() && this.modeManager.isDailyChallengeCompleted()) {
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

        // IMPORTANT: Update vertices so the mirror renders correctly at the new position
        this.safeUpdateVertices(this.draggedMirror);
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

            // Set target position
            this.draggedMirror.x = targetX;
            this.draggedMirror.y = targetY;

            // IRON-CLAD STEP 1: Force grid alignment
            GridAlignmentEnforcer.enforceGridAlignment(this.draggedMirror);
            this.safeUpdateVertices(this.draggedMirror);

            // CRITICAL: Clear isDragging flag BEFORE validation so overlap detection works properly
            this.draggedMirror.isDragging = false;

            // IRON-CLAD STEP 2: Validate with all 3 rules
            const validation = IronCladValidator.validateMirror(this.draggedMirror, this.mirrors);

            if (!validation.valid) {
                console.warn(`🚨 Invalid placement at (${this.draggedMirror.x}, ${this.draggedMirror.y}):`, validation.allViolations);

                // Try to find nearest valid position using smart algorithm
                const nearestValid = this.findNearestValidPositionSmart(this.draggedMirror, dropX, dropY);

                if (nearestValid) {
                    console.log(`✨ Found valid position nearby at (${nearestValid.x}, ${nearestValid.y})`);
                    this.draggedMirror.x = nearestValid.x;
                    this.draggedMirror.y = nearestValid.y;

                    // MANDATORY: Force grid alignment (this may adjust x/y slightly)
                    GridAlignmentEnforcer.enforceGridAlignment(this.draggedMirror);
                    this.safeUpdateVertices(this.draggedMirror);

                    // FINAL VERIFICATION: Triple-check everything is valid
                    const finalValidation = IronCladValidator.validateMirror(this.draggedMirror, this.mirrors);
                    if (!finalValidation.valid) {
                        console.error('❌ CRITICAL: Smart placement failed final validation!');
                        console.error('Violations:', finalValidation.allViolations);
                        console.error('Reverting to original position');
                        this.draggedMirror.x = this.draggedMirror.originalX;
                        this.draggedMirror.y = this.draggedMirror.originalY;
                        GridAlignmentEnforcer.enforceGridAlignment(this.draggedMirror);
                        this.safeUpdateVertices(this.draggedMirror);
                    } else {
                        console.log(`✅ Final verification passed - mirror at (${this.draggedMirror.x}, ${this.draggedMirror.y})`);
                    }
                } else {
                    console.warn('⚠️ No valid position found nearby, reverting to original position');
                    this.draggedMirror.x = this.draggedMirror.originalX;
                    this.draggedMirror.y = this.draggedMirror.originalY;
                    GridAlignmentEnforcer.enforceGridAlignment(this.draggedMirror);
                    this.safeUpdateVertices(this.draggedMirror);
                }
            } else {
                console.log(`✅ Mirror placed at valid position (${this.draggedMirror.x}, ${this.draggedMirror.y})`);
            }

            // ULTIMATE SAFETY CHECK: Verify grid alignment
            const alignmentCheck = GridAlignmentEnforcer.verifyAlignment(this.draggedMirror);
            if (!alignmentCheck.aligned) {
                console.error('🚨 GRID ALIGNMENT VIOLATION DETECTED!');
                console.error('Alignment errors:', alignmentCheck.errors);
                console.error('Attempting emergency realignment...');

                // Emergency realignment
                GridAlignmentEnforcer.enforceGridAlignment(this.draggedMirror);
                this.safeUpdateVertices(this.draggedMirror);

                // Re-verify
                const recheckAlignment = GridAlignmentEnforcer.verifyAlignment(this.draggedMirror);
                if (!recheckAlignment.aligned) {
                    console.error('❌ EMERGENCY REALIGNMENT FAILED! Reverting to original position.');
                    this.draggedMirror.x = this.draggedMirror.originalX;
                    this.draggedMirror.y = this.draggedMirror.originalY;
                    GridAlignmentEnforcer.enforceGridAlignment(this.draggedMirror);
                    this.safeUpdateVertices(this.draggedMirror);
                } else {
                    console.log('✅ Emergency realignment successful');
                }
            }
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
        GridAlignmentSystem.ensureMirrorShapeAlignment(mirror, this);
    }
    
    snapMirrorToGrid(mirror) {
        GridAlignmentSystem.snapMirrorToGrid(mirror, this);
    }
    
    findNearestValidPositionSmart(mirror, dropX, dropY) {
        /**
         * Smart algorithm that searches for valid positions in order of priority:
         * 1. Try exact drop position first
         * 2. If in forbidden zone, move toward nearest border in straight line
         * 3. Search in expanding concentric grid pattern around drop point
         * 4. Each position tested fully with IronCladValidator
         */

        const startX = this.snapToGrid(dropX);
        const startY = this.snapToGrid(dropY);
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const forbiddenRadius = CONFIG.TARGET_RADIUS + 40;

        // Create test mirror at start position with proper grid alignment and vertex updates
        const createTestMirror = (x, y) => {
            // Create a deep copy to avoid modifying the original mirror
            const testMirror = {
                ...mirror,
                x,
                y,
                isDragging: false,
                // Copy all shape-specific properties
                size: mirror.size,
                width: mirror.width,
                height: mirror.height,
                shape: mirror.shape,
                rotation: mirror.rotation,
                topWidth: mirror.topWidth,
                skew: mirror.skew
            };

            // CRITICAL: Force grid alignment on the test position
            GridAlignmentEnforcer.enforceGridAlignment(testMirror);

            // CRITICAL: Update vertices after alignment to ensure they're calculated correctly
            if (typeof testMirror.updateVertices === 'function') {
                testMirror.updateVertices();
            } else if (typeof mirror.calculateVertices === 'function') {
                // Copy the method from original mirror
                testMirror.calculateVertices = mirror.calculateVertices.bind(testMirror);
                testMirror.vertices = testMirror.calculateVertices();
            } else {
                // Fallback: manually calculate vertices using safeUpdateVertices
                this.safeUpdateVertices(testMirror);
            }

            return testMirror;
        };

        // Test if a position is valid
        const testPosition = (x, y) => {
            const testMirror = createTestMirror(x, y);
            const validation = IronCladValidator.validateMirror(testMirror, this.mirrors);
            return validation.valid ? { x: testMirror.x, y: testMirror.y } : null;
        };

        // STEP 1: Try exact drop position
        const exactResult = testPosition(startX, startY);
        if (exactResult) return exactResult;

        // STEP 2: If dropped in forbidden zone, search toward nearest border
        const distToCenter = Math.sqrt((startX - centerX) ** 2 + (startY - centerY) ** 2);
        if (distToCenter < forbiddenRadius + 60) { // Close to or in forbidden zone
            // Calculate direction away from center
            const dx = startX - centerX;
            const dy = startY - centerY;
            const angle = Math.atan2(dy, dx);

            // Search outward along this direction
            for (let dist = CONFIG.GRID_SIZE; dist <= 200; dist += CONFIG.GRID_SIZE) {
                const testX = this.snapToGrid(centerX + Math.cos(angle) * (forbiddenRadius + 60 + dist));
                const testY = this.snapToGrid(centerY + Math.sin(angle) * (forbiddenRadius + 60 + dist));

                const result = testPosition(testX, testY);
                if (result) return result;
            }
        }

        // STEP 3: Expanding grid search from drop point (prioritize closer positions)
        const maxRadius = 15; // Grid cells
        const gridSize = CONFIG.GRID_SIZE;

        for (let radius = 1; radius <= maxRadius; radius++) {
            // Create a sorted list of positions at this radius, ordered by distance to drop point
            const positions = [];

            // Generate all positions in a square ring at this radius
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Only check positions on the perimeter of the square
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const testX = this.snapToGrid(startX + dx * gridSize);
                        const testY = this.snapToGrid(startY + dy * gridSize);

                        // Skip if out of bounds
                        if (testX < 50 || testX > CONFIG.CANVAS_WIDTH - 50 ||
                            testY < 50 || testY > CONFIG.CANVAS_HEIGHT - 50) {
                            continue;
                        }

                        // Calculate actual distance to drop point
                        const actualDist = Math.sqrt((testX - dropX) ** 2 + (testY - dropY) ** 2);
                        positions.push({ x: testX, y: testY, dist: actualDist });
                    }
                }
            }

            // Sort by distance to drop point (closest first)
            positions.sort((a, b) => a.dist - b.dist);

            // Test each position in order
            for (const pos of positions) {
                const result = testPosition(pos.x, pos.y);
                if (result) return result;
            }
        }

        // No valid position found
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

        // For mirror placement, exclude borders - mirrors can be placed snugly next to each other
        // Use strict inequality to allow mirrors to share edges without "overlapping"
        return !(bounds1.right < bounds2.left ||
                bounds2.right < bounds1.left ||
                bounds1.bottom < bounds2.top ||
                bounds2.bottom < bounds1.top);
    }
    
    update() {
        if (!this.isPlaying || this.gameOver) return;
        
        // Update game time
        this.gameTime = (Date.now() - this.startTime) / 1000;
        this.updateTimerDisplay();
        
        // Update lasers with new collision system
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update();

            // Use new collision system for mirror collisions
            this.laserCollisionHandler.checkAndHandleCollisions(laser, this.mirrors);

            // Check collision with center target
            if (this.laserCollisionHandler.checkTargetCollision(laser)) {
                this.showGameOverModal();
                return;
            }

            // Remove laser if out of bounds
            if (this.laserCollisionHandler.isOutOfBounds(laser)) {
                this.lasers.splice(i, 1);
            }
        }
    }
    
    
    checkContinuousLaserMirrorCollision(laser, mirror) {
        // Skip collision if laser has exceeded max reflections
        if (laser.totalReflections >= laser.maxReflections) {
            return false;
        }

        // Skip collision if laser is in cooldown with this specific mirror
        if (laser.reflectionCooldown > 0 && laser.lastReflectedMirror === mirror) {
            return false;
        }

        // Additional check: prevent rapid oscillations between very close mirrors
        if (laser.reflectionCooldown > 0 && laser.totalReflections > 3) {
            // If laser has bounced recently and multiple times, require larger movement
            const distanceMoved = Math.sqrt(
                (laser.x - laser.prevX) ** 2 + (laser.y - laser.prevY) ** 2
            );
            if (distanceMoved < 2) { // Minimum movement threshold
                return false;
            }
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
        return ShapeGeometry.pointInRightTriangle(px, py, mirror);
    }
    
    pointInIsoscelesTriangle(px, py, mirror) {
        return ShapeGeometry.pointInIsoscelesTriangle(px, py, mirror);
    }
    
    getRightTrianglePoints(mirror) {
        return ShapeGeometry.getRightTrianglePoints(mirror);
    }
    
    getIsoscelesTrianglePoints(mirror) {
        return ShapeGeometry.getIsoscelesTrianglePoints(mirror);
    }
    
    rotatePoint(px, py, centerX, centerY, angleDegrees) {
        return ShapeGeometry.rotatePoint(px, py, centerX, centerY, angleDegrees);
    }
    
    pointInTriangle(px, py, p1, p2, p3) {
        return ShapeGeometry.pointInTriangle(px, py, p1, p2, p3);
    }
    
    pointInTrapezoid(px, py, mirror) {
        return ShapeGeometry.pointInTrapezoid(px, py, mirror);
    }
    
    pointInParallelogram(px, py, mirror) {
        return ShapeGeometry.pointInParallelogram(px, py, mirror);
    }
    
    pointInPolygon(px, py, vertices) {
        return ShapeGeometry.pointInPolygon(px, py, vertices);
    }
    
    checkLaserTargetCollision(laser) {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((laser.x - centerX) ** 2 + (laser.y - centerY) ** 2);
        return distance <= CONFIG.TARGET_RADIUS;
    }
    
    render() {
        // Delegate all rendering to the GameRenderer
        this.renderer.render();
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