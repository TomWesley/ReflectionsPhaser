import { CONFIG } from '../config.js';
import { Mirror } from './Mirror.js';
import { MirrorFactory } from '../mirrors/MirrorFactory.js';
import { Laser } from './Laser.js';
import { Spawner } from './Spawner.js';
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
import { MirrorGenerator } from '../generators/MirrorGenerator.js';
import { SpawnerGenerator } from '../generators/SpawnerGenerator.js';
import { GridAlignmentSystem } from '../systems/GridAlignmentSystem.js';
import { MirrorPlacementHelper } from '../generators/MirrorPlacementHelper.js';
import { MirrorDragAndSnapHandler } from '../handlers/MirrorDragAndSnapHandler.js';
import { ReplayRecorder } from './ReplayRecorder.js';
import { RotationControl } from './RotationControl.js';
import { SimpleValidator } from '../validation/SimpleValidator.js';
import { DailyChallenge } from '../validation/DailyChallenge.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.gameOver = false;
        this.isReplayMode = false;
        this.isGeneratingMP4 = false;
        this.isBreach = false;
        this.breachProgress = 0;
        this.breachStartTime = 0;
        this.breachDuration = 1.5; // seconds
        this.breachSnapshotCaptured = false;
        this.breachSnapshotDataUrl = null;
        this.startTime = 0;
        this.gameTime = 0;
        this.lastTimestamp = null;
        this.deltaTime = 1/60;
        this.physicsAccumulator = 0;
        this.PHYSICS_DT = 1/60; // Fixed physics timestep for deterministic simulation

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
        this.hoveredSpawner = null; // Track which spawner is being hovered (desktop)
        this.selectedSpawner = null; // Track which spawner is selected (mobile tap)
        this.selectedMirror = null; // Track which mirror is selected for rotation
        this.isDailyChallenge = false; // Daily challenge mode flag

        // Zoom/pan state for setup phase
        this.zoom = 1;
        this.zoomMin = 1;
        this.zoomMax = 3;
        this.panX = 0;
        this.panY = 0;
        this.isPinching = false;
        this.lastPinchDist = 0;
        this.lastPinchCenter = { x: 0, y: 0 };

        // Initialize collision systems
        this.collisionSystem = new CollisionSystem();
        this.laserCollisionHandler = new LaserCollisionHandler(this.collisionSystem);

        // Initialize renderer
        this.renderer = new GameRenderer(this.ctx, this);

        // Initialize mirror generator
        this.mirrorGenerator = new MirrorGenerator(this);

        // Initialize spawner generator
        this.spawnerGenerator = new SpawnerGenerator(this);

        // Initialize drag and snap handler
        this.dragAndSnapHandler = new MirrorDragAndSnapHandler(this);

        // Initialize replay recorder
        this.replayRecorder = new ReplayRecorder(this.canvas);

        // Initialize rotation control
        const rotCanvas = document.getElementById('rotationCanvas');
        this.rotationControl = new RotationControl(rotCanvas, (angle) => this.onRotationChange(angle));
        this.rotationControlEl = document.getElementById('rotationControl');

        this.init();
    }

    init() {
        // Initialize the validation system first
        MirrorPlacementValidation.initialize();

        this.setupEventListeners();
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
        this.canvas.addEventListener('touchmove', (e) => this.onCanvasTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onCanvasTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.onCanvasTouchEnd(e), { passive: false });

        // Wheel event for trackpad/mouse zoom
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

        // UI buttons
        document.getElementById('launchBtn').addEventListener('click', () => this.launchLasers());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());

        // Daily challenge toggle
        const dailyToggle = document.getElementById('dailyChallengeToggle');
        if (dailyToggle) dailyToggle.addEventListener('click', () => this.toggleDailyChallenge());
        const mobileDailyToggle = document.getElementById('mobileDailyChallengeToggle');
        if (mobileDailyToggle) mobileDailyToggle.addEventListener('click', () => {
            this.toggleDailyChallenge();
            // Close mobile menu after toggling
            const menu = document.getElementById('mobileMenu');
            const overlay = document.getElementById('mobileMenuOverlay');
            if (menu) menu.classList.remove('open');
            if (overlay) overlay.classList.add('hidden');
            document.body.classList.remove('menu-open');
        });
    }

    // Helper to get canvas coordinates from mouse or touch event
    // Accounts for zoom/pan transform during setup phase
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

        // Convert to base canvas coordinates
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        // Inverse zoom/pan transform to get game-world coordinates
        return {
            x: (canvasX - this.panX) / this.zoom,
            y: (canvasY - this.panY) / this.zoom
        };
    }

    onTouchStart(e) {
        if (this.isPlaying || this.dailyCompleted) return;

        // Two-finger pinch start
        if (e.touches.length === 2) {
            e.preventDefault();
            this.isPinching = true;
            // Stop any active drag
            if (this.draggedMirror) this.stopDragging();
            const t0 = e.touches[0], t1 = e.touches[1];
            this.lastPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            this.lastPinchCenter = {
                x: (t0.clientX + t1.clientX) / 2,
                y: (t0.clientY + t1.clientY) / 2
            };
            return;
        }

        // Single touch — skip if already pinching
        if (this.isPinching) return;

        const coords = this.getCanvasCoordinates(e);

        // Check if touching a mirror
        for (let mirror of this.mirrors) {
            if (mirror.containsPoint(coords.x, coords.y)) {
                e.preventDefault();
                this.selectedSpawner = null;
                this.startDragging(mirror, coords.x, coords.y);
                return;
            }
        }

        // Check if tapping a spawner
        for (let spawner of this.spawners) {
            const dx = coords.x - spawner.x;
            const dy = coords.y - spawner.y;
            if (dx * dx + dy * dy <= 25 * 25) {
                e.preventDefault();
                this.selectedSpawner = (this.selectedSpawner === spawner) ? null : spawner;
                this.selectMirror(null);
                return;
            }
        }

        // Tapped empty space — clear all selections
        this.selectedSpawner = null;
        this.selectMirror(null);
    }

    onTouchMove(e) {
        // Pinch zoom is handled by onCanvasTouchMove (canvas-level listener)
        if (this.isPinching) return;

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
        if (this.isPinching) {
            // End pinch when fewer than 2 fingers remain
            if (!e.touches || e.touches.length < 2) {
                this.isPinching = false;
            }
            return;
        }
        this.handleDragEnd(e);
    }

    /**
     * Canvas-level touchmove — handles pinch zoom/pan.
     * Separate from the document-level onTouchMove (used for mirror dragging).
     */
    onCanvasTouchMove(e) {
        if (e.touches.length === 2 && this.isPinching) {
            e.preventDefault();
            const t0 = e.touches[0], t1 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            const center = {
                x: (t0.clientX + t1.clientX) / 2,
                y: (t0.clientY + t1.clientY) / 2
            };

            // Zoom
            const zoomDelta = dist / this.lastPinchDist;
            this.applyZoom(zoomDelta, center.x, center.y);

            // Pan
            const rect = this.canvas.getBoundingClientRect();
            const dxScreen = center.x - this.lastPinchCenter.x;
            const dyScreen = center.y - this.lastPinchCenter.y;
            const canvasScaleX = this.canvas.width / rect.width;
            const canvasScaleY = this.canvas.height / rect.height;
            this.panX += dxScreen * canvasScaleX;
            this.panY += dyScreen * canvasScaleY;
            this.clampPan();

            this.lastPinchDist = dist;
            this.lastPinchCenter = center;
        }
    }

    /**
     * Canvas-level touchend — ends pinch when fingers lift.
     */
    onCanvasTouchEnd(e) {
        if (this.isPinching && (!e.touches || e.touches.length < 2)) {
            this.isPinching = false;
        }
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
    
    
    /**
     * Select a mirror for rotation, or deselect if null
     */
    selectMirror(mirror) {
        this.selectedMirror = mirror;
        if (mirror) {
            this.rotationControl.isDailyChallenge = this.isDailyChallenge;
            this.rotationControl.setAngle(mirror.rotation || 0);
            this.rotationControlEl.classList.remove('hidden');
        } else {
            this.rotationControlEl.classList.add('hidden');
        }
    }

    /**
     * Handle rotation change from the dial control
     */
    onRotationChange(angleDegrees) {
        if (!this.selectedMirror) return;

        const mirror = this.selectedMirror;
        const oldRotation = mirror.rotation;

        // Apply new rotation
        mirror.rotation = angleDegrees;
        this.safeUpdateVertices(mirror);

        // Validate — if invalid, revert
        const otherMirrors = this.mirrors.filter(m => m !== mirror);
        const validation = SimpleValidator.validateMirror(mirror, otherMirrors);

        if (!validation.valid) {
            mirror.rotation = oldRotation;
            this.safeUpdateVertices(mirror);
            this.rotationControl.setAngle(oldRotation);
        }
    }

    // --- Zoom / Pan ---

    onWheel(e) {
        if (this.isPlaying || this.dailyCompleted) return;
        e.preventDefault();

        // Trackpad pinch sends ctrlKey + wheel; mouse scroll also uses wheel
        const zoomSensitivity = 0.002;
        const zoomDelta = 1 - e.deltaY * zoomSensitivity;
        this.applyZoom(zoomDelta, e.clientX, e.clientY);
    }

    applyZoom(zoomDelta, clientX, clientY) {
        const oldZoom = this.zoom;
        this.zoom = Math.min(this.zoomMax, Math.max(this.zoomMin, this.zoom * zoomDelta));
        const actualDelta = this.zoom / oldZoom;

        // Zoom toward the pointer: adjust pan so the point under the cursor stays fixed
        const rect = this.canvas.getBoundingClientRect();
        const canvasScaleX = this.canvas.width / rect.width;
        const canvasScaleY = this.canvas.height / rect.height;
        const cx = (clientX - rect.left) * canvasScaleX;
        const cy = (clientY - rect.top) * canvasScaleY;

        this.panX = cx - actualDelta * (cx - this.panX);
        this.panY = cy - actualDelta * (cy - this.panY);
        this.clampPan();
    }

    clampPan() {
        // Prevent panning so far that the game board goes off-screen
        const W = CONFIG.CANVAS_WIDTH;
        const H = CONFIG.CANVAS_HEIGHT;
        const maxPanX = (this.zoom - 1) * W;
        const maxPanY = (this.zoom - 1) * H;
        this.panX = Math.min(0, Math.max(-maxPanX, this.panX));
        this.panY = Math.min(0, Math.max(-maxPanY, this.panY));
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
    }

    generateMirrors() {
        if (this.isDailyChallenge) {
            // Daily challenge generates mirrors and spawners together from seed
            this.generateDailyChallengeConfig();
        } else {
            // Delegate mirror generation to the MirrorGenerator
            this.mirrors = this.mirrorGenerator.generateMirrors();
        }
    }

    /**
     * Generate both mirrors and spawners from the daily seed in one pass
     */
    generateDailyChallengeConfig() {
        const config = DailyChallenge.generateDailyConfig();
        this.dailyTheme = config.theme;
        this.mirrors = DailyChallenge.placeMirrors(config.mirrors, this);
        this.mirrors.forEach(m => { m.isDailyChallenge = true; });
        this.spawners = config.spawners.map(s => {
            const spawner = new Spawner(s.x, s.y, s.angle);
            spawner.isDailyChallenge = true;
            return spawner;
        });
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
        if (this.isDailyChallenge) {
            // Already generated in generateDailyChallengeConfig()
            return;
        }
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

        // Daily challenge: one attempt only
        if (this.isDailyChallenge && DailyChallenge.hasAttemptedToday()) {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.textContent = "Already completed today's challenge!";
                statusEl.className = 'status-modern';
            }
            return;
        }

        // Reset zoom to full view for gameplay
        this.resetZoom();

        this.selectedSpawner = null;
        this.hoveredSpawner = null;
        this.selectMirror(null);

        // Skip validation check - player has manually positioned mirrors
        // Let them play with their chosen configuration

        // Show brief loading message
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'Calculating collision boundaries...';
            statusEl.className = 'status-modern';
        }

        // Allow UI to update before heavy computation
        setTimeout(async () => {
            // Initialize collision boundaries for all mirrors (iron-clad system)
            this.collisionSystem.initializeCollisionBoundaries(this.mirrors);
            this.laserCollisionHandler.initialize(this.mirrors);

            this.isPlaying = true;
            this.gameOver = false;
            this.startTime = Date.now();
            this.gameTime = 0;
            this.lasers = [];
            this.lastTimestamp = null;
            this.physicsAccumulator = 0;

            // Save game state for canvas replay fallback, then start recording
            this.replayRecorder.saveGameState(this.mirrors, this.spawners);
            await this.replayRecorder.startRecording();

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
            const laser = new Laser(spawner.x, spawner.y, spawner.angle);
            laser.isDailyChallenge = this.isDailyChallenge;
            this.lasers.push(laser);
        });

        document.getElementById('launchBtn').disabled = true;
    }
    
    resetGame() {
        // If daily challenge already completed, show frozen state instead
        if (this.isDailyChallenge && DailyChallenge.hasAttemptedToday()) {
            this.showCompletedDailyChallenge();
            return;
        }

        this.isPlaying = false;
        this.gameOver = false;
        this.isBreach = false;
        this.breachProgress = 0;
        this.breachSnapshotCaptured = false;
        this.breachSnapshotDataUrl = null;
        this.selectedSpawner = null;
        this.hoveredSpawner = null;
        this.selectMirror(null);
        this.startTime = 0;
        this.gameTime = 0;
        this.lasers = [];
        this.dailyCompleted = false;
        this.resetZoom();

        // Generate new mirrors and spawners
        this.generateMirrors();
        this.generateSpawners();

        document.getElementById('launchBtn').disabled = false;
        const statusEl = document.getElementById('status');

        if (statusEl) {
            statusEl.textContent = this.isDailyChallenge
                ? 'Daily Challenge - position your mirrors!'
                : 'Position your mirrors to protect the center!';
            statusEl.className = 'status-modern';
        }

        this.updateModeUI();
    }

    /**
     * Toggle between main game and daily challenge mode
     */
    toggleDailyChallenge() {
        if (this.isPlaying) return; // Can't toggle during gameplay

        this.isDailyChallenge = !this.isDailyChallenge;

        if (this.isDailyChallenge && DailyChallenge.hasAttemptedToday()) {
            // Already completed — show frozen final state
            this.showCompletedDailyChallenge();
            return;
        }

        this.resetGame();
    }

    /**
     * Display the frozen final state of today's completed daily challenge
     */
    showCompletedDailyChallenge() {
        const result = DailyChallenge.getTodayResult();
        const savedMirrors = DailyChallenge.getSavedMirrors();
        const savedLasers = DailyChallenge.getSavedLasers();

        // Restore mirrors from saved state
        if (savedMirrors) {
            this.mirrors = savedMirrors.map(saved => {
                const mirror = MirrorFactory.createMirror(saved.x, saved.y, saved.shape);
                mirror.size = saved.size;
                mirror.width = saved.width;
                mirror.height = saved.height;
                mirror.rotation = saved.rotation;
                if (saved.topWidth) mirror.topWidth = saved.topWidth;
                if (saved.skew) mirror.skew = saved.skew;
                mirror.isDailyChallenge = true;
                this.safeUpdateVertices(mirror);
                return mirror;
            });
        }

        // Restore lasers from saved state (frozen positions with trails)
        if (savedLasers) {
            this.lasers = savedLasers.map(saved => {
                const laser = new Laser(saved.x, saved.y, 0);
                laser.vx = saved.vx;
                laser.vy = saved.vy;
                laser.trail = saved.trail || [];
                laser.isDailyChallenge = true;
                return laser;
            });
        } else {
            this.lasers = [];
        }

        // Restore spawners from daily config
        const config = DailyChallenge.generateDailyConfig();
        this.spawners = config.spawners.map(s => {
            const spawner = new Spawner(s.x, s.y, s.angle);
            spawner.isDailyChallenge = true;
            return spawner;
        });

        // Set game state to show as completed (not playing, game over)
        this.isPlaying = false;
        this.gameOver = true;
        this.isBreach = false;
        this.breachProgress = 0;
        this.selectedMirror = null;
        this.selectedSpawner = null;
        this.hoveredSpawner = null;
        this.gameTime = result.gameTime;
        this.dailyCompleted = true; // Flag to prevent interaction

        // Disable launch
        document.getElementById('launchBtn').disabled = true;

        this.updateModeUI();
        this.renderer.render();

        // Also draw the timer HUD to show final score
        // (render() already handles this since gameOver is true)
    }

    /**
     * Update UI elements to reflect current mode
     */
    updateModeUI() {
        const isDaily = this.isDailyChallenge;

        // Update toggle button text/state
        const desktopToggle = document.getElementById('dailyChallengeToggle');
        if (desktopToggle) {
            desktopToggle.classList.toggle('daily-active', isDaily);
            const label = desktopToggle.querySelector('span');
            if (label) label.textContent = isDaily ? 'Main Game' : 'Daily';
        }

        const mobileToggle = document.getElementById('mobileDailyChallengeToggle');
        if (mobileToggle) {
            mobileToggle.classList.toggle('daily-active', isDaily);
            const label = mobileToggle.querySelector('span');
            if (label) label.textContent = isDaily ? 'Switch to Main Game' : 'Daily Challenge';
        }

        // Toggle body class for global CSS theming
        document.body.classList.toggle('daily-challenge-mode', isDaily);
    }
    
    onCanvasHover(e) {
        // Only detect hover when not playing and not dragging
        if (this.isPlaying || this.draggedMirror) {
            this.hoveredMirror = null;
            this.hoveredSpawner = null;
            return;
        }

        const coords = this.getCanvasCoordinates(e);
        const mouseX = coords.x;
        const mouseY = coords.y;

        // Check if hovering over a mirror
        let foundMirror = null;
        for (let mirror of this.mirrors) {
            if (this.isMouseOverMirror(mouseX, mouseY, mirror)) {
                foundMirror = mirror;
                break;
            }
        }

        // Check if hovering over a spawner
        let foundSpawner = null;
        if (!foundMirror) {
            for (let spawner of this.spawners) {
                const dx = mouseX - spawner.x;
                const dy = mouseY - spawner.y;
                if (dx * dx + dy * dy <= 20 * 20) {
                    foundSpawner = spawner;
                    break;
                }
            }
        }

        // Update hover state
        this.hoveredMirror = foundMirror;
        this.hoveredSpawner = foundSpawner;

        // Change cursor based on hover
        this.canvas.style.cursor = foundMirror ? 'grab' : (foundSpawner ? 'pointer' : 'crosshair');
    }

    isMouseOverMirror(mouseX, mouseY, mirror) {
        // Use the mirror's own containsPoint method - proper OOP approach
        // Each mirror knows how to test if a point is inside it
        return mirror.containsPoint(mouseX, mouseY);
    }

    onMouseDown(e) {
        if (this.isPlaying || this.dailyCompleted) return;

        const coords = this.getCanvasCoordinates(e);
        const mouseX = coords.x;
        const mouseY = coords.y;

        // Check if clicking on a mirror
        for (let mirror of this.mirrors) {
            if (mirror.containsPoint(mouseX, mouseY)) {
                this.startDragging(mirror, mouseX, mouseY);
                return;
            }
        }

        // Clicked empty space — deselect mirror
        this.selectMirror(null);
    }
    
    onMouseMove(e) {
        if (!this.draggedMirror || this.isPlaying) return;

        const coords = this.getCanvasCoordinates(e);
        const mouseX = coords.x;
        const mouseY = coords.y;
        
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

            // If mouse didn't move, it was a click — select this mirror
            if (!this.mouseHasMoved) {
                this.selectMirror(mirror);
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
                this.selectMirror(mirror);
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
        if (!this.isPlaying || this.gameOver || this.isGeneratingMP4) return;

        // Handle breach animation phase
        if (this.isBreach) {
            this.breachProgress = (Date.now() - this.breachStartTime) / (this.breachDuration * 1000);

            // Capture snapshot at peak visual intensity (~0.7 progress)
            if (!this.breachSnapshotCaptured && this.breachProgress >= 0.7) {
                this.breachSnapshotDataUrl = this.canvas.toDataURL('image/png');
                this.breachSnapshotCaptured = true;
            }

            if (this.breachProgress >= 1) {
                this.breachProgress = 1;
                this.isBreach = false;
                this.showGameOverModal();
            }
            return;
        }

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
                this.startBreach();
                return;
            }

            // Remove laser if out of bounds
            if (this.laserCollisionHandler.isOutOfBounds(laser)) {
                this.lasers.splice(i, 1);
            }
        }
    }

    /**
     * Start the core breach animation - laser has hit the center
     * Freezes the timer but continues rendering for ~1.5s before showing game over
     */
    startBreach() {
        this.isBreach = true;
        this.breachStartTime = Date.now();
        this.breachProgress = 0;
        // gameTime is frozen at the moment of impact (no more updates)
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
        // Timer is now rendered directly on the canvas via GameRenderer.drawTimerHUD()
        // No external DOM elements needed
    }
    
    async showGameOverModal() {
        this.gameOver = true;

        // If this is a canvas replay finishing, just show the modal again
        if (this.isReplayMode) {
            this.isReplayMode = false;
            this.isPlaying = false;
            document.getElementById('gameOverModal').classList.remove('hidden');
            return;
        }

        // Save duration and stop recording for replay
        this.replayRecorder.saveGameDuration(this.gameTime);
        await this.replayRecorder.stopRecording();

        // Use the snapshot captured at peak breach intensity
        const snapshotImg = document.getElementById('gameOverSnapshot');
        if (snapshotImg) {
            snapshotImg.src = this.breachSnapshotDataUrl || this.canvas.toDataURL('image/png');
        }

        // Format final time with centiseconds
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const centiseconds = Math.floor((this.gameTime % 1) * 100);
        const finalTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;

        // Save daily challenge result if applicable
        if (this.isDailyChallenge && !this.isReplayMode) {
            DailyChallenge.markCompleted(this.gameTime, finalTimeString, this.mirrors, this.lasers);
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
            performanceElement.title = performanceData.description;
        } catch (error) {
            console.error('Error loading performance rating:', error);
            const performanceElement = document.getElementById('missionPerformance');
            performanceElement.textContent = 'Failed';
            performanceElement.style.color = '#E84E6A';
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

        // If this is a canvas replay finishing, just show the modal again
        if (this.isReplayMode) {
            this.isReplayMode = false;
            this.isPlaying = false;
            document.getElementById('victoryModal').classList.remove('hidden');
            return;
        }

        // Save duration and stop recording for replay
        this.replayRecorder.saveGameDuration(this.gameTime);
        await this.replayRecorder.stopRecording();

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

        // Save daily challenge result if applicable
        if (this.isDailyChallenge && !this.isReplayMode) {
            DailyChallenge.markCompleted(this.gameTime, finalTimeString, this.mirrors, this.lasers);
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
        this.isReplayMode = false;

        // Reset the game state
        this.resetGame();
    }

    /**
     * Start a canvas-based replay by restoring saved game state and re-simulating
     * Used on mobile when video recording is unavailable
     */
    startCanvasReplay() {
        const state = this.replayRecorder.savedGameState;
        if (!state) return false;

        this.isReplayMode = true;

        // Recreate mirrors from saved state
        this.mirrors = state.mirrors.map(saved => {
            const mirror = MirrorFactory.createMirror(saved.x, saved.y, saved.shape);
            mirror.size = saved.size;
            mirror.width = saved.width;
            mirror.height = saved.height;
            mirror.rotation = saved.rotation;
            mirror.isDailyChallenge = saved.isDailyChallenge;
            mirror.updateVertices();
            return mirror;
        });

        // Recreate spawners from saved state
        this.spawners = state.spawners.map(saved => new Spawner(saved.x, saved.y, saved.angle));

        // Re-initialize collision system and launch
        this.collisionSystem.initializeCollisionBoundaries(this.mirrors);
        this.laserCollisionHandler.initialize(this.mirrors);

        this.isPlaying = true;
        this.gameOver = false;
        this.isBreach = false;
        this.breachProgress = 0;
        this.startTime = Date.now();
        this.gameTime = 0;
        this.lasers = [];
        this.lastTimestamp = null;
        this.physicsAccumulator = 0;

        // Create lasers from spawners
        this.spawners.forEach(spawner => {
            const laser = new Laser(spawner.x, spawner.y, spawner.angle);
            laser.isDailyChallenge = this.isDailyChallenge;
            this.lasers.push(laser);
        });

        return true;
    }

    /**
     * Generate MP4 by re-simulating the game and encoding frames with h264-mp4-encoder
     * Used on mobile when real-time video recording wasn't available
     * @param {function} onProgress - callback(percent) for progress updates
     * @returns {Promise<Blob>} MP4 video blob
     */
    async generateReplayMP4(onProgress) {
        const state = this.replayRecorder.savedGameState;
        if (!state || !state.duration || typeof HME === 'undefined') return null;

        const fps = 30;
        const renderDt = 1 / fps; // Time between rendered frames
        const physicsDt = this.PHYSICS_DT; // Must match live game physics step
        const physicsStepsPerFrame = Math.round(renderDt / physicsDt); // 2 steps per frame at 30fps/60hz
        const totalFrames = Math.ceil(state.duration * fps);
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Save current game state
        const savedMirrors = this.mirrors;
        const savedSpawners = this.spawners;
        const savedLasers = this.lasers;
        const savedIsPlaying = this.isPlaying;
        const savedGameOver = this.gameOver;
        const savedGameTime = this.gameTime;
        const savedDeltaTime = this.deltaTime;
        const savedStartTime = this.startTime;

        this.isGeneratingMP4 = true;

        try {
            // Initialize h264-mp4-encoder
            const encoder = await HME.createH264MP4Encoder();
            encoder.width = width;
            encoder.height = height;
            encoder.frameRate = fps;
            encoder.quantizationParameter = 28;
            encoder.initialize();

            // Set up simulation state from saved game
            this.mirrors = state.mirrors.map(saved => {
                const mirror = MirrorFactory.createMirror(saved.x, saved.y, saved.shape);
                mirror.size = saved.size;
                mirror.width = saved.width;
                mirror.height = saved.height;
                mirror.rotation = saved.rotation;
                mirror.isDailyChallenge = saved.isDailyChallenge;
                mirror.updateVertices();
                return mirror;
            });

            this.spawners = state.spawners.map(s => new Spawner(s.x, s.y, s.angle));
            this.lasers = [];
            this.spawners.forEach(s => {
                const laser = new Laser(s.x, s.y, s.angle);
                laser.isDailyChallenge = this.isDailyChallenge;
                this.lasers.push(laser);
            });

            this.collisionSystem.initializeCollisionBoundaries(this.mirrors);
            this.laserCollisionHandler.initialize(this.mirrors);

            this.isPlaying = true;
            this.gameOver = false;
            this.isBreach = false;
            this.breachProgress = 0;
            this.deltaTime = physicsDt;
            this.startTime = Date.now();

            // Process frames in batches to avoid blocking the UI
            const BATCH_SIZE = 5;
            let frameIndex = 0;
            let breachFrame = -1;
            // Only render 70% of breach animation - end at same frame as screenshot
            const breachFrameCount = Math.ceil(this.breachDuration * fps * 0.7);

            const processBatch = () => {
                return new Promise((resolve) => {
                    const endFrame = Math.min(frameIndex + BATCH_SIZE, totalFrames + breachFrameCount);

                    for (; frameIndex < endFrame; frameIndex++) {
                        if (breachFrame >= 0) {
                            // Playing breach animation
                            this.breachProgress = breachFrame / breachFrameCount;
                            breachFrame++;
                            if (breachFrame >= breachFrameCount) {
                                // Render final frame and stop
                                this.breachProgress = 1;
                                this.renderer.render();
                                const imageData = this.ctx.getImageData(0, 0, width, height);
                                encoder.addFrameRgba(imageData.data);
                                frameIndex = totalFrames + breachFrameCount; // exit
                                break;
                            }
                        } else {
                            // Normal simulation - sub-step physics to match live game
                            this.gameTime = frameIndex * renderDt;

                            for (let step = 0; step < physicsStepsPerFrame; step++) {
                                for (let i = this.lasers.length - 1; i >= 0; i--) {
                                    const laser = this.lasers[i];
                                    laser.update(physicsDt);
                                    this.laserCollisionHandler.checkAndHandleCollisions(laser, this.mirrors);

                                    if (this.laserCollisionHandler.checkTargetCollision(laser)) {
                                        this.gameOver = true;
                                        breachFrame = 0;
                                        this.breachProgress = 0;
                                    }

                                    if (this.laserCollisionHandler.isOutOfBounds(laser)) {
                                        this.lasers.splice(i, 1);
                                    }
                                }
                                if (breachFrame >= 0) break; // Stop sub-stepping once breach starts
                            }
                        }

                        // Render frame
                        this.renderer.render();

                        // Capture pixels and encode
                        const imageData = this.ctx.getImageData(0, 0, width, height);
                        encoder.addFrameRgba(imageData.data);

                        if (breachFrame >= breachFrameCount) {
                            frameIndex = totalFrames + breachFrameCount; // exit
                            break;
                        }
                    }

                    if (onProgress) {
                        const maxFrames = totalFrames + breachFrameCount;
                        onProgress(Math.min(100, Math.round((frameIndex / maxFrames) * 100)));
                    }

                    // Yield to UI thread
                    requestAnimationFrame(resolve);
                });
            };

            const maxFrames = totalFrames + breachFrameCount;
            while (frameIndex < maxFrames) {
                await processBatch();
            }

            // Finalize encoding
            encoder.finalize();
            const mp4Data = encoder.FS.readFile(encoder.outputFilename);
            const mp4Blob = new Blob([mp4Data], { type: 'video/mp4' });
            encoder.delete();

            // Store the generated MP4
            this.replayRecorder.videoBlob = mp4Blob;
            this.replayRecorder.videoURL = URL.createObjectURL(mp4Blob);

            return mp4Blob;
        } finally {
            this.isGeneratingMP4 = false;

            // Restore original game state
            this.mirrors = savedMirrors;
            this.spawners = savedSpawners;
            this.lasers = savedLasers;
            this.isPlaying = savedIsPlaying;
            this.gameOver = savedGameOver;
            this.gameTime = savedGameTime;
            this.deltaTime = savedDeltaTime;
            this.startTime = savedStartTime;

            // Re-render original state
            this.renderer.render();
        }
    }

    gameLoop(timestamp) {
        // Calculate real elapsed time since last frame
        let frameDt = this.PHYSICS_DT; // default for first frame
        if (this.lastTimestamp !== null && timestamp !== undefined) {
            frameDt = (timestamp - this.lastTimestamp) / 1000;
            if (frameDt > 0.1) frameDt = 0.1; // cap to prevent spiral of death
            if (frameDt <= 0) frameDt = this.PHYSICS_DT;
        }
        if (timestamp !== undefined) {
            this.lastTimestamp = timestamp;
        }

        // Fixed timestep with accumulator for deterministic physics
        this.physicsAccumulator += frameDt;
        while (this.physicsAccumulator >= this.PHYSICS_DT) {
            this.deltaTime = this.PHYSICS_DT;
            this.update();
            this.physicsAccumulator -= this.PHYSICS_DT;
        }

        this.render();

        // Capture frame for MP4 replay (throttled to 30fps internally, skip during replay)
        if (this.isPlaying && !this.gameOver && !this.isReplayMode) {
            this.replayRecorder.captureFrame(timestamp);
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}