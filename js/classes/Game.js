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
import { MirrorDragAndSnapHandler } from '../handlers/MirrorDragAndSnapHandler.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.gameOver = false;
        this.startTime = 0;
        this.gameTime = 0;
        this.lastTimestamp = null;
        this.deltaTime = 1/60;

        // Game objects
        this.mirrors = [];
        this.lasers = [];
        this.spawners = [];
        
        // Interaction state
        this.draggedMirror = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dragStartPos = { x: 0, y: 0 };
        this.mouseHasMoved = false;
        this.hoveredMirror = null; // Track which mirror is being hovered

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

        // Initialize drag and snap handler
        this.dragAndSnapHandler = new MirrorDragAndSnapHandler(this);

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
        // Store bound functions so we can add/remove them properly
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.handleDragEnd.bind(this);
        this.boundTouchMove = this.onTouchMove.bind(this);
        this.boundTouchEnd = this.onTouchEnd.bind(this);

        // Mouse down only on canvas
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));

        // Mouse move for hover effects (when not dragging)
        this.canvas.addEventListener('mousemove', (e) => this.onCanvasHover(e));

        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });

        // UI buttons
        document.getElementById('launchBtn').addEventListener('click', () => this.launchLasers());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
    }

    // Helper to get canvas coordinates from mouse or touch event
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    onTouchStart(e) {
        if (this.isPlaying) return;

        // Prevent interaction in completed Daily Challenges
        if (this.modeManager.isDailyChallenge() && this.modeManager.isDailyChallengeCompleted()) {
            return;
        }

        const coords = this.getCanvasCoordinates(e);

        // Check if touching a mirror
        for (let mirror of this.mirrors) {
            if (mirror.containsPoint(coords.x, coords.y)) {
                e.preventDefault(); // Prevent scrolling when dragging mirror
                this.startDragging(mirror, coords.x, coords.y);
                break;
            }
        }
    }

    onTouchMove(e) {
        if (!this.draggedMirror || this.isPlaying) return;

        e.preventDefault(); // Prevent scrolling while dragging

        const coords = this.getCanvasCoordinates(e);

        // Check if finger has moved significantly from start position
        const moveThreshold = 5;
        const deltaX = Math.abs(coords.x - this.dragStartPos.x);
        const deltaY = Math.abs(coords.y - this.dragStartPos.y);

        if (deltaX > moveThreshold || deltaY > moveThreshold) {
            this.mouseHasMoved = true;
        }

        // Move smoothly without snapping during drag
        let newX = coords.x - this.dragOffset.x;
        let newY = coords.y - this.dragOffset.y;

        this.draggedMirror.x = newX;
        this.draggedMirror.y = newY;
        this.safeUpdateVertices(this.draggedMirror);
    }

    onTouchEnd(e) {
        this.handleDragEnd(e);
    }

    startDragging(mirror, mouseX, mouseY) {
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

        // Add global event listeners for drag (mouse and touch)
        // These will work anywhere on the page
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundTouchEnd);
        document.addEventListener('touchcancel', this.boundTouchEnd);
    }

    stopDragging() {
        // Remove global event listeners FIRST (mouse and touch)
        // This prevents any race conditions where events could fire during cleanup
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundTouchMove);
        document.removeEventListener('touchend', this.boundTouchEnd);
        document.removeEventListener('touchcancel', this.boundTouchEnd);

        // Reset all drag state
        // Note: draggedMirror may already be null if cleared by handleDragEnd
        if (this.draggedMirror) {
            this.draggedMirror.isDragging = false;
            this.draggedMirror = null;
        }
        this.mouseHasMoved = false;
        this.canvas.style.cursor = 'crosshair';
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
        } else if (mirror.vertices && mirror.vertices.length > 0) {
            // Mirror already has vertices - no action needed
            // This happens with test mirrors created by spread operator
            return;
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

        // Skip validation check - player has manually positioned mirrors
        // Let them play with their chosen configuration

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
    
    async resetGame() {
        this.isPlaying = false;
        this.gameOver = false;
        this.startTime = 0;
        this.gameTime = 0;
        this.lasers = [];
        document.getElementById('timer').textContent = '0:00';

        // Use daily puzzle data if in daily challenge mode
        if (this.modeManager.isDailyChallenge()) {
            // Check if already completed
            if (this.modeManager.isDailyChallengeCompleted()) {
                // Load saved mirror and laser positions from completed challenge
                const DailyChallenge = (await import('../validation/DailyChallenge.js')).DailyChallenge;
                const savedMirrorState = DailyChallenge.getTodayMirrorState();
                const savedLaserState = DailyChallenge.getTodayLaserState();

                if (savedMirrorState) {
                    // Reconstruct mirrors from saved state
                    this.mirrors = DailyChallenge.reconstructMirrors(savedMirrorState);
                    console.log('Loaded completed daily challenge mirror state');
                } else {
                    // Fallback: generate the puzzle
                    const dailyPuzzle = this.modeManager.generateDailyPuzzle();
                    this.mirrors = dailyPuzzle.mirrors;
                }

                // Reconstruct frozen lasers from saved state
                if (savedLaserState) {
                    this.lasers = DailyChallenge.reconstructLasers(savedLaserState);
                    console.log('Loaded completed daily challenge laser freeze frame');
                } else {
                    this.lasers = [];
                }

                // Generate spawners
                this.generateSpawners();

                // Mark as completed freeze frame state
                this.isPlaying = false;
                this.gameOver = true;  // Freeze frame state

                // Disable launch button
                document.getElementById('launchBtn').disabled = true;
                const statusEl = document.getElementById('status');
                if (statusEl) {
                    statusEl.textContent = 'Daily Challenge Complete! This is your final solution. Come back tomorrow for a new puzzle.';
                    statusEl.className = 'status-modern status-success';
                }
                return;
            } else {
                // Not completed yet - generate fresh puzzle
                const dailyPuzzle = this.modeManager.generateDailyPuzzle();
                this.mirrors = dailyPuzzle.mirrors;

                // Update vertices for all mirrors
                this.mirrors.forEach(mirror => this.safeUpdateVertices(mirror));

                // Generate spawners
                this.generateSpawners();
            }
        } else {
            // Free play mode
            this.generateMirrors();
            this.generateSpawners();
        }

        document.getElementById('launchBtn').disabled = false;
        const statusEl = document.getElementById('status');

        if (statusEl) {
            if (this.modeManager.isDailyChallenge()) {
                statusEl.textContent = 'Daily Challenge: Position mirrors to protect the center!';
            } else {
                statusEl.textContent = 'Position your mirrors to protect the center!';
            }
            statusEl.className = 'status-modern';
        }
    }
    
    onCanvasHover(e) {
        // Only detect hover when not playing and not dragging
        if (this.isPlaying || this.draggedMirror) {
            this.hoveredMirror = null;
            return;
        }

        // No hover effects for completed daily challenges
        if (this.modeManager.isDailyChallenge() && this.modeManager.isDailyChallengeCompleted()) {
            this.hoveredMirror = null;
            this.canvas.style.cursor = 'default';
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // Check if hovering over a mirror
        let foundMirror = null;
        for (let mirror of this.mirrors) {
            if (this.isMouseOverMirror(mouseX, mouseY, mirror)) {
                foundMirror = mirror;
                break;
            }
        }

        // Update hover state
        this.hoveredMirror = foundMirror;

        // Change cursor based on hover
        this.canvas.style.cursor = foundMirror ? 'grab' : 'crosshair';
    }

    isMouseOverMirror(mouseX, mouseY, mirror) {
        // Use the mirror's own containsPoint method - proper OOP approach
        // Each mirror knows how to test if a point is inside it
        return mirror.containsPoint(mouseX, mouseY);
    }

    onMouseDown(e) {
        if (this.isPlaying) return;

        // Prevent interaction in completed Daily Challenges
        if (this.modeManager.isDailyChallenge() && this.modeManager.isDailyChallengeCompleted()) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // Check if clicking on a mirror - use proper OOP method
        for (let mirror of this.mirrors) {
            if (mirror.containsPoint(mouseX, mouseY)) {
                this.startDragging(mirror, mouseX, mouseY);
                break;
            }
        }
    }
    
    onMouseMove(e) {
        if (!this.draggedMirror || this.isPlaying) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
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
    
    handleDragEnd(e) {
        if (!this.draggedMirror) return;

        const mirror = this.draggedMirror;

        // CRITICAL: Store mirror reference and clear draggedMirror IMMEDIATELY
        // This prevents any race conditions where a new drag could start
        this.draggedMirror = null;

        // CRITICAL: Use try/finally to ensure stopDragging is ALWAYS called
        try {
            // Clear dragging flag immediately
            mirror.isDragging = false;

            // If mouse didn't move, just keep it where it was
            if (!this.mouseHasMoved) {
                return;
            }

            // Get the final drop position with proper scaling (works for both mouse and touch)
            const coords = this.getCanvasCoordinates(e);
            const dropX = coords.x - this.dragOffset.x;
            const dropY = coords.y - this.dragOffset.y;

            // Quick bounds check - reject positions clearly outside the canvas
            // The SimpleValidator will handle precise forbidden zone checking
            const margin = 20; // Small buffer
            const isWayOutOfBounds = dropX < margin ||
                                     dropX > CONFIG.CANVAS_WIDTH - margin ||
                                     dropY < margin ||
                                     dropY > CONFIG.CANVAS_HEIGHT - margin;

            if (isWayOutOfBounds) {
                console.warn('Drop position is way out of bounds, reverting to original position');
                mirror.x = mirror.originalX;
                mirror.y = mirror.originalY;
                this.safeUpdateVertices(mirror);
                return;
            }

            // Find nearest valid position using the dedicated handler
            const nearestValid = this.dragAndSnapHandler.findNearestValidPosition(mirror, dropX, dropY);

            if (nearestValid) {
                // nearestValid already has the correctly aligned position
                mirror.x = nearestValid.x;
                mirror.y = nearestValid.y;
                this.safeUpdateVertices(mirror);
                console.log(`✅ Mirror placed at (${mirror.x}, ${mirror.y})`);
            } else {
                // Revert to original position - mirror stays where it started
                console.warn('No valid position found, reverting to original');
                mirror.x = mirror.originalX;
                mirror.y = mirror.originalY;
                this.safeUpdateVertices(mirror);
            }
        } catch (error) {
            console.error('❌ Error during drag end:', error);
            // Revert to original position on any error
            mirror.x = mirror.originalX;
            mirror.y = mirror.originalY;
            GridAlignmentEnforcer.enforceGridAlignment(mirror);
            this.safeUpdateVertices(mirror);
        } finally {
            // CRITICAL: Clean up and remove event listeners NO MATTER WHAT
            this.stopDragging();
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

    ensureMirrorShapeAlignment(mirror) {
        GridAlignmentSystem.ensureMirrorShapeAlignment(mirror, this);
    }
    
    snapMirrorToGrid(mirror) {
        GridAlignmentSystem.snapMirrorToGrid(mirror, this);
    }
    
    /**
     * Get the theoretical offset from center to primary vertex for this shape
     * This is FIXED for each shape type and doesn't change during drag
     */
    getPrimaryVertexOffset(mirror) {
        switch (mirror.shape) {
            case 'square':
                const halfSize = mirror.size / 2;
                return { x: -halfSize, y: -halfSize }; // Top-left corner

            case 'rectangle':
                const halfWidth = mirror.width / 2;
                const halfHeight = mirror.height / 2;
                return { x: -halfWidth, y: -halfHeight }; // Top-left corner

            case 'rightTriangle':
            case 'isoscelesTriangle':
            case 'trapezoid':
            case 'parallelogram':
                // For complex shapes, use first vertex from a fresh calculation
                const tempMirror = {
                    ...mirror,
                    isDragging: false
                };
                this.safeUpdateVertices(tempMirror);
                const vertices = tempMirror.vertices || tempMirror.getVertices();
                if (vertices && vertices.length > 0) {
                    return {
                        x: vertices[0].x - tempMirror.x,
                        y: vertices[0].y - tempMirror.y
                    };
                }
                return { x: 0, y: 0 };

            default:
                return { x: 0, y: 0 };
        }
    }

    findNearestValidPositionSmart(mirror, dropX, dropY) {
        /**
         * GRID-COORDINATE-BASED SNAPPING - Simple and intuitive:
         * 1. Convert current mirror position to grid coordinates
         * 2. Test that exact grid cell
         * 3. If invalid, try adjacent grid cells in order of distance
         *
         * Think in GRID CELLS, not pixels!
         */

        const GRID = CONFIG.GRID_SIZE; // 20px per grid cell

        // Convert pixel position to grid coordinates
        const toGridCoords = (px, py) => ({
            gx: Math.round(px / GRID),
            gy: Math.round(py / GRID)
        });

        // Convert grid coordinates to pixel position
        const toPixels = (gx, gy) => ({
            px: gx * GRID,
            py: gy * GRID
        });

        console.log(`  📍 Mirror currently at (${mirror.x}, ${mirror.y} pixels)`);

        // Test if a position is valid (pixels, not grid coords)
        const testPosition = (px, py) => {
            const testMirror = {
                ...mirror,
                x: px,
                y: py,
                isDragging: false,
                size: mirror.size,
                width: mirror.width,
                height: mirror.height,
                shape: mirror.shape,
                rotation: mirror.rotation,
                topWidth: mirror.topWidth,
                skew: mirror.skew
            };

            // CRITICAL: Use GridAlignmentEnforcer to ensure vertices are on grid
            // This may shift the position slightly to achieve perfect grid alignment
            GridAlignmentEnforcer.enforceGridAlignment(testMirror);

            // Update vertices AFTER alignment
            if (typeof testMirror.updateVertices === 'function') {
                testMirror.updateVertices();
            } else if (typeof mirror.calculateVertices === 'function') {
                testMirror.calculateVertices = mirror.calculateVertices.bind(testMirror);
                testMirror.vertices = testMirror.calculateVertices();
            } else {
                this.safeUpdateVertices(testMirror);
            }

            if (!testMirror.getVertices) {
                testMirror.getVertices = function() {
                    return this.vertices || [];
                };
            }

            // Validate
            // CRITICAL: Exclude the original mirror from validation
            const otherMirrors = this.mirrors.filter(m => m !== mirror);
            const validation = IronCladValidator.validateMirror(testMirror, otherMirrors);

            if (validation.valid) {
                return { x: testMirror.x, y: testMirror.y };
            }
            return null;
        };

        // Test with detailed logging
        const testPositionWithLogging = (px, py, label) => {
            const testMirror = {
                ...mirror,
                x: px,
                y: py,
                isDragging: false,
                size: mirror.size,
                width: mirror.width,
                height: mirror.height,
                shape: mirror.shape,
                rotation: mirror.rotation,
                topWidth: mirror.topWidth,
                skew: mirror.skew
            };

            // CRITICAL: Use GridAlignmentEnforcer FIRST to ensure vertices are on grid
            const beforeX = testMirror.x;
            const beforeY = testMirror.y;
            GridAlignmentEnforcer.enforceGridAlignment(testMirror);
            const shiftDist = Math.sqrt((testMirror.x - beforeX) ** 2 + (testMirror.y - beforeY) ** 2);

            if (shiftDist > 1) {
                console.log(`     Grid enforcer shifted from (${beforeX}, ${beforeY}) to (${testMirror.x}, ${testMirror.y}) - ${shiftDist.toFixed(1)}px`);
            }

            // Update vertices AFTER alignment
            if (typeof testMirror.updateVertices === 'function') {
                testMirror.updateVertices();
            } else if (typeof mirror.calculateVertices === 'function') {
                testMirror.calculateVertices = mirror.calculateVertices.bind(testMirror);
                testMirror.vertices = testMirror.calculateVertices();
            } else {
                this.safeUpdateVertices(testMirror);
            }

            if (!testMirror.getVertices) {
                testMirror.getVertices = function() {
                    return this.vertices || [];
                };
            }

            // Validate with detailed logging
            // CRITICAL: Exclude the original mirror from validation to avoid self-overlap detection
            const otherMirrors = this.mirrors.filter(m => m !== mirror);
            const validation = IronCladValidator.validateMirror(testMirror, otherMirrors);

            console.log(`  Testing ${label} at (${px}, ${py}):`);
            console.log(`     Rule 1 (Grid aligned): ${validation.rule1.valid ? 'PASS' : 'FAIL'} ${!validation.rule1.valid ? `(${validation.rule1.violations.length} vertices off grid)` : ''}`);
            console.log(`     Rule 2 (No overlap): ${validation.rule2.valid ? 'PASS' : 'FAIL'} ${!validation.rule2.valid ? `(${validation.rule2.violations.length} overlaps)` : ''}`);

            // If Rule 2 fails, show which mirrors are overlapping
            if (!validation.rule2.valid) {
                console.log(`     OVERLAP DETAILS:`);
                const overlappingMirrors = new Set();
                validation.rule2.violations.forEach(v => {
                    if (v.otherMirror) {
                        overlappingMirrors.add(v.otherMirror);
                    }
                });
                overlappingMirrors.forEach(om => {
                    console.log(`       - ${om.shape} at (${om.x}, ${om.y}) ${om === mirror ? '<<< THIS IS THE SAME MIRROR!' : ''}`);
                });
            }

            console.log(`     Rule 3 (No forbidden): ${validation.rule3.valid ? 'PASS' : 'FAIL'} ${!validation.rule3.valid ? `(${validation.rule3.violations.length} in forbidden zone)` : ''}`);

            if (validation.valid) {
                return { x: testMirror.x, y: testMirror.y };
            }
            return null;
        };

        // STEP 1: Try EXACT current position first
        console.log(`  📍 Testing exact current position (${mirror.x}, ${mirror.y})`);
        const exactResult = testPositionWithLogging(mirror.x, mirror.y, "Exact position");
        if (exactResult) {
            console.log(`  ✅ Current position is already valid!`);
            return exactResult;
        }

        // STEP 2: Try snapping to nearest grid cell
        const currentGrid = toGridCoords(mirror.x, mirror.y);
        const snappedPixels = toPixels(currentGrid.gx, currentGrid.gy);
        console.log(`  🎯 Snapping to nearest grid [${currentGrid.gx}, ${currentGrid.gy}] = (${snappedPixels.px}, ${snappedPixels.py})`);

        const snappedResult = testPositionWithLogging(snappedPixels.px, snappedPixels.py, "Snapped position");
        if (snappedResult) {
            console.log(`  ✅ Snapped position is valid!`);
            return snappedResult;
        }

        // STEP 3: Try nearby grid cells in order of distance
        console.log(`  🔍 Searching nearby grid cells...`);

        const candidates = [];
        const searchRadius = 5; // Grid cells to search (5 cells = 100px)

        for (let dgx = -searchRadius; dgx <= searchRadius; dgx++) {
            for (let dgy = -searchRadius; dgy <= searchRadius; dgy++) {
                if (dgx === 0 && dgy === 0) continue; // Already tested snapped position

                const testGx = currentGrid.gx + dgx;
                const testGy = currentGrid.gy + dgy;

                // Calculate grid distance (using grid cells, not pixels!)
                const gridDist = Math.sqrt(dgx * dgx + dgy * dgy);

                const testPixels = toPixels(testGx, testGy);
                candidates.push({
                    gx: testGx,
                    gy: testGy,
                    px: testPixels.px,
                    py: testPixels.py,
                    gridDist
                });
            }
        }

        // Sort by grid distance (closest first)
        candidates.sort((a, b) => a.gridDist - b.gridDist);

        // Test each grid cell in order
        for (const candidate of candidates) {
            const result = testPosition(candidate.px, candidate.py);
            if (result) {
                console.log(`  ✅ Found valid at grid [${candidate.gx}, ${candidate.gy}] = (${candidate.px}, ${candidate.py} pixels), ${candidate.gridDist.toFixed(1)} grid cells away`);
                return result;
            }
        }

        console.error('  ❌ No valid position found!');
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

        // Check for victory (perfect score - survived max time)
        if (this.gameTime >= CONFIG.MAX_GAME_TIME) {
            this.gameTime = CONFIG.MAX_GAME_TIME; // Cap at exactly max time
            this.showVictoryModal();
            return;
        }

        // Update lasers with new collision system
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update(this.deltaTime);

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

        // Also update mobile timer (shorter format without centiseconds)
        const mobileTimer = document.getElementById('mobileTimer');
        if (mobileTimer) {
            mobileTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    async showGameOverModal() {
        this.gameOver = true;

        // Capture canvas snapshot before any modal overlay
        const snapshotImg = document.getElementById('gameOverSnapshot');
        if (snapshotImg) {
            snapshotImg.src = this.canvas.toDataURL('image/png');
        }

        // Format final time with centiseconds
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const centiseconds = Math.floor((this.gameTime % 1) * 100);
        const finalTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;

        // Mark daily challenge as completed if in daily challenge mode
        if (this.modeManager.isDailyChallenge() && !this.modeManager.isDailyChallengeCompleted()) {
            const DailyChallenge = (await import('../validation/DailyChallenge.js')).DailyChallenge;
            DailyChallenge.markCompleted(this.gameTime, finalTimeString, this.mirrors, this.lasers);
            console.log('Daily Challenge completed and marked with mirror + laser positions saved!');
        }

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

        // Update status (if element exists)
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'CORE BREACH! Check your final score above.';
            statusEl.className = 'status-modern status-game-over';
        }
    }

    async showVictoryModal() {
        this.gameOver = true;

        // Capture canvas snapshot before any modal overlay
        const snapshotImg = document.getElementById('victorySnapshot');
        if (snapshotImg) {
            snapshotImg.src = this.canvas.toDataURL('image/png');
        }

        // Format final time (should be exactly 5:00.00)
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const centiseconds = Math.floor((this.gameTime % 1) * 100);
        const finalTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;

        // Mark daily challenge as completed if in daily challenge mode
        if (this.modeManager.isDailyChallenge() && !this.modeManager.isDailyChallengeCompleted()) {
            DailyChallenge.markCompleted(this.gameTime, finalTimeString, this.mirrors, this.lasers);
            console.log('Daily Challenge completed with PERFECT SCORE! Mirror + laser positions saved.');
        }

        // Update modal content
        document.getElementById('victoryTime').textContent = finalTimeString;

        // Show modal
        document.getElementById('victoryModal').classList.remove('hidden');

        // Update status (if element exists)
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'PERFECT DEFENSE! You protected the core for the maximum time!';
            statusEl.className = 'status-modern status-game-over';
        }
    }

    continueAfterGameOver() {
        // Allow player to continue playing after game over
        this.gameOver = false;
        this.isPlaying = false;

        // Update mode UI if in daily challenge mode (show completion status)
        if (this.modeManager.isDailyChallenge()) {
            this.modeManager.updateModeButtons();
            this.modeManager.updateDailyInfo();
        }

        // Reset the game state
        this.resetGame();
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        if (this.lastTimestamp !== null && timestamp !== undefined) {
            this.deltaTime = (timestamp - this.lastTimestamp) / 1000;
            if (this.deltaTime > 0.1) this.deltaTime = 0.1;
            if (this.deltaTime <= 0) this.deltaTime = 1/60;
        }
        if (timestamp !== undefined) {
            this.lastTimestamp = timestamp;
        }

        this.update();
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}