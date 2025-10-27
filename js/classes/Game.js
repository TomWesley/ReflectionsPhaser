import { CONFIG } from '../config.js';
import { Mirror } from './Mirror.js';
import { MirrorFactory } from '../mirrors/MirrorFactory.js';
import { Laser } from './Laser.js';
import { Spawner } from './Spawner.js';
import { DailyChallenge } from '../utils/DailyChallenge.js';
import { SurfaceAreaManager } from '../utils/SurfaceAreaManager.js';
import { PerformanceRating } from '../utils/PerformanceRating.js';
import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';
import { IronCladValidator } from '../utils/IronCladValidator.js';
import { GridAlignmentEnforcer } from '../utils/GridAlignmentEnforcer.js';
// New modular components
import { InputHandler } from '../core/InputHandler.js';
import { GameState } from '../core/GameState.js';
import { CollisionSystem } from '../core/CollisionSystem.js';
import { LaserCollisionHandler } from '../core/LaserCollisionHandler.js';
import { ShapeGeometry } from '../geometry/ShapeGeometry.js';
import { GameRenderer } from '../rendering/GameRenderer.js';
import { GameModeManager } from '../managers/GameModeManager.js';
import { MirrorGenerator } from '../generators/MirrorGenerator.js';
import { SpawnerGenerator } from '../generators/SpawnerGenerator.js';
import { GridAlignmentSystem } from '../systems/GridAlignmentSystem.js';

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

        // Initialize modular components (keeping original functionality)
        this.inputHandler = new InputHandler(this);
        this.gameState = new GameState(this);

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

    enforceValidationDuringPlacement() {
        // Validation is now only enforced on drop, not during placement
        // This method is kept for backward compatibility but does nothing
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

            // IRON-CLAD STEP 2: Validate with all 3 rules
            const validation = IronCladValidator.validateMirror(this.draggedMirror, this.mirrors);

            if (!validation.valid) {
                console.warn(`🚨 Invalid placement detected:`, validation.allViolations);

                // Try to find a nearby valid position
                const nearestValidPos = this.findNearestValidPositionIronClad(this.draggedMirror);

                if (nearestValidPos) {
                    this.draggedMirror.x = nearestValidPos.x;
                    this.draggedMirror.y = nearestValidPos.y;
                    console.log(`🔧 Mirror moved to nearest valid position: (${nearestValidPos.x}, ${nearestValidPos.y})`);
                } else {
                    // Final fallback: revert to original position
                    console.warn('⚠️ Could not find valid position, reverting to original');
                    this.draggedMirror.x = this.draggedMirror.originalX || targetX;
                    this.draggedMirror.y = this.draggedMirror.originalY || targetY;
                    GridAlignmentEnforcer.enforceGridAlignment(this.draggedMirror);
                    this.safeUpdateVertices(this.draggedMirror);
                }
            } else {
                console.log(`✅ Mirror placed at valid position (${this.draggedMirror.x}, ${this.draggedMirror.y})`);
            }

            this.draggedMirror.isDragging = false;
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
        GridAlignmentSystem.snapMirrorToGrid(mirror, this);
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

        // For mirror placement, exclude borders - mirrors can be placed snugly next to each other
        // Use strict inequality to allow mirrors to share edges without "overlapping"
        return !(bounds1.right < bounds2.left ||
                bounds2.right < bounds1.left ||
                bounds1.bottom < bounds2.top ||
                bounds2.bottom < bounds1.top);
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
        return GridAlignmentSystem.isOnGridLine(value);
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
        return ShapeGeometry.getTrapezoidVertices(mirror);
    }
    
    getParallelogramVertices(mirror) {
        return ShapeGeometry.getParallelogramVertices(mirror);
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
        GridAlignmentSystem.forceGridAlignment(mirror, this);
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