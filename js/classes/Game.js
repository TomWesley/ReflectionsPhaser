// Game Class - Main game controller and rendering engine
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.gameOver = false;
        
        // Game objects
        this.mirrors = [];
        this.lasers = [];
        this.spawners = [];
        
        // Interaction state
        this.draggedMirror = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // UI elements
        this.statusElement = document.getElementById('status');
        this.launchButton = document.getElementById('launchBtn');
        this.resetButton = document.getElementById('resetBtn');
        this.clearCacheButton = document.getElementById('clearCacheBtn');
        this.timerElement = document.getElementById('timer-value');
        this.gameOverModal = document.getElementById('gameOverModal');
        this.retryButton = document.getElementById('retryBtn');
        this.rulesModal = document.getElementById('rulesModal');
        this.showRulesButton = document.getElementById('showRulesBtn');
        this.closeRulesButton = document.getElementById('closeRules');
        
        // Timer and scoring
        this.startTime = 0;
        this.elapsedTime = 0;
        this.totalReflections = 0;
        
        // Debug element finding
        console.log('Timer element found:', !!this.timerElement);
        console.log('Game over modal found:', !!this.gameOverModal);
        console.log('Retry button found:', !!this.retryButton);
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupInfoBubble();
        this.setupRulesModal();
        this.handleMobileLayout();
        this.scaleCanvasToScreen();
        this.generateMirrors();
        this.generateSpawners();
        this.updateStatus('🎯 Position your mirrors to protect the core!');
        this.gameLoop();
    }
    
    handleMobileLayout() {
        // Check if we're on mobile and handle canvas sizing
        const isMobile = window.innerWidth <= 768;
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isMobile && isLandscape) {
            // Set canvas to full viewport in mobile landscape
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
        }
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleMobileLayout();
            }, 100);
        });
        
        window.addEventListener('resize', () => {
            this.handleMobileLayout();
            if (window.innerWidth > 768) {
                this.scaleCanvasToScreen();
            }
        });
    }
    
    setupInfoBubble() {
        // Get info bubble elements
        const infoButton = document.getElementById('infoButton');
        const infoPopup = document.getElementById('infoPopup');
        const closeButton = document.getElementById('closeInfo');
        
        if (!infoButton || !infoPopup || !closeButton) return;
        
        // Show popup when info button is clicked/touched
        infoButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            infoPopup.classList.remove('hidden');
        });
        
        infoButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            infoPopup.classList.remove('hidden');
        });
        
        // Hide popup when close button is clicked/touched
        closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            infoPopup.classList.add('hidden');
        });
        
        closeButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            infoPopup.classList.add('hidden');
        });
        
        // Hide popup when clicking outside of it
        document.addEventListener('click', (e) => {
            if (!infoButton.contains(e.target) && !infoPopup.contains(e.target)) {
                infoPopup.classList.add('hidden');
            }
        });
        
        // Hide popup when touching outside of it
        document.addEventListener('touchend', (e) => {
            if (!infoButton.contains(e.target) && !infoPopup.contains(e.target)) {
                infoPopup.classList.add('hidden');
            }
        });
    }
    
    setupRulesModal() {
        if (this.showRulesButton && this.rulesModal && this.closeRulesButton) {
            this.showRulesButton.addEventListener('click', () => {
                this.rulesModal.classList.remove('hidden');
            });
            
            this.closeRulesButton.addEventListener('click', () => {
                this.rulesModal.classList.add('hidden');
            });
            
            // Close modal when clicking outside
            this.rulesModal.addEventListener('click', (e) => {
                if (e.target === this.rulesModal) {
                    this.rulesModal.classList.add('hidden');
                }
            });
        }
    }
    
    scaleCanvasToScreen() {
        // Calculate available screen space (leave some margin)
        const margin = 40;
        const headerHeight = document.getElementById('gameHeader')?.offsetHeight || 120;
        const availableWidth = window.innerWidth - margin * 2;
        const availableHeight = window.innerHeight - headerHeight - margin * 2;
        
        // Maintain aspect ratio (4:3)
        const aspectRatio = 4 / 3;
        let canvasWidth, canvasHeight;
        
        if (availableWidth / availableHeight > aspectRatio) {
            // Height is the limiting factor
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight * aspectRatio;
        } else {
            // Width is the limiting factor
            canvasWidth = availableWidth;
            canvasHeight = canvasWidth / aspectRatio;
        }
        
        // Set minimum size
        const minWidth = 600;
        const minHeight = 450;
        canvasWidth = Math.max(canvasWidth, minWidth);
        canvasHeight = Math.max(canvasHeight, minHeight);
        
        // Apply scaling to canvas
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        
        // Store scale factor for coordinate conversion
        this.scaleX = this.canvas.width / canvasWidth;
        this.scaleY = this.canvas.height / canvasHeight;
        
        console.log('Canvas scaled to:', { canvasWidth, canvasHeight, scaleX: this.scaleX, scaleY: this.scaleY });
    }
    
    setupEventListeners() {
        // Mouse events for mirror dragging
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e));
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.onPointerDown(touch);
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.onPointerMove(touch);
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.onPointerUp(e);
        });
        
        // Prevent context menu and scrolling
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.onPointerUp(e);
        });
        
        // UI button events
        this.launchButton.addEventListener('click', () => this.launchLasers());
        this.resetButton.addEventListener('click', () => this.resetGame());
        
        if (this.clearCacheButton) {
            this.clearCacheButton.addEventListener('click', () => this.clearCache());
            console.log('Clear cache button found and event listener added');
        } else {
            console.error('Clear cache button not found!');
        }
        
        if (this.retryButton) {
            this.retryButton.addEventListener('click', () => {
                this.hideGameOverModal();
                this.resetGame();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isPlaying) {
                e.preventDefault();
                this.launchLasers();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                this.resetGame();
            } else if (e.code === 'KeyD') {
                e.preventDefault();
                GameConfig.SHOW_COLLISION_BOUNDS = !GameConfig.SHOW_COLLISION_BOUNDS;
                console.log('Debug collision bounds:', GameConfig.SHOW_COLLISION_BOUNDS ? 'ON' : 'OFF');
            }
        });
    }
    
    generateMirrors() {
        this.mirrors = [];
        const center = { x: GameConfig.CANVAS_WIDTH / 2, y: GameConfig.CANVAS_HEIGHT / 2 };
        
        for (let i = 0; i < GameConfig.MIRROR_COUNT; i++) {
            let x, y, attempts = 0;
            let mirror = null;
            
            do {
                // Generate position in ring around center
                const angle = Math.random() * Math.PI * 2;
                const distance = 120 + Math.random() * 150;
                x = center.x + Math.cos(angle) * distance;
                y = center.y + Math.sin(angle) * distance;
                
                // Create mirror with random shape at approximate position
                mirror = new Mirror(x, y);
                
                // Snap mirror position so extremities align with grid lines
                const snappedPos = this.snapMirrorToGrid(mirror, x, y);
                x = snappedPos.x;
                y = snappedPos.y;
                
                attempts++;
            } while (!this.isValidMirrorPosition(x, y) && attempts < 100);
            
            // Update mirror position to final snapped position
            mirror.x = x;
            mirror.y = y;
            
            this.mirrors.push(mirror);
        }
    }
    
    generateSpawners() {
        this.spawners = [];
        const positions = Spawner.getEdgePositions();
        
        // Pick random spawners
        const selectedPositions = this.shuffleArray([...positions]).slice(0, GameConfig.SPAWNER_COUNT);
        
        selectedPositions.forEach(pos => {
            const randomAngle = Spawner.generateRandomAngleToCenter(pos.x, pos.y);
            this.spawners.push(new Spawner(pos.x, pos.y, randomAngle));
        });
    }
    
    snapToGrid(value) {
        return Math.round(value / GameConfig.GRID_SIZE) * GameConfig.GRID_SIZE;
    }
    
    
    // Snap mirror position so its extremities align with grid lines
    snapMirrorToGrid(mirror, x, y) {
        const gridSize = GameConfig.GRID_SIZE;
        
        // Create temporary mirror at the position to get its bounds
        const tempMirror = {
            x: x,
            y: y,
            shape: mirror.shape,
            width: mirror.width,
            height: mirror.height,
            orientation: mirror.orientation,
            getBounds: mirror.getBounds.bind({
                x: x,
                y: y,
                shape: mirror.shape,
                width: mirror.width,
                height: mirror.height,
                orientation: mirror.orientation
            })
        };
        
        const bounds = tempMirror.getBounds();
        
        // Calculate how much to adjust position to align extremities with grid
        const leftOffset = bounds.left % gridSize;
        const topOffset = bounds.top % gridSize;
        
        // Snap to nearest grid line
        const snapLeftOffset = leftOffset > gridSize / 2 ? gridSize - leftOffset : -leftOffset;
        const snapTopOffset = topOffset > gridSize / 2 ? gridSize - topOffset : -topOffset;
        
        return {
            x: x + snapLeftOffset,
            y: y + snapTopOffset
        };
    }
    
    isValidMirrorPosition(x, y, excludeMirror = null) {
        // For validation, we need to check against the mirror being moved
        let mirrorToCheck = excludeMirror;
        if (!mirrorToCheck) {
            // If no mirror specified, assume a default square mirror for initial placement
            mirrorToCheck = { 
                x: x, 
                y: y, 
                getBounds: () => {
                    const halfSize = GameConfig.MIRROR_SIZE / 2;
                    return {
                        left: x - halfSize,
                        right: x + halfSize,
                        top: y - halfSize,
                        bottom: y + halfSize
                    };
                }
            };
        } else {
            // Create a temporary mirror at the new position with same properties
            mirrorToCheck = { 
                x: x, 
                y: y,
                shape: excludeMirror.shape,
                width: excludeMirror.width,
                height: excludeMirror.height,
                orientation: excludeMirror.orientation,
                getBounds: excludeMirror.getBounds.bind({ 
                    x: x, 
                    y: y,
                    shape: excludeMirror.shape,
                    width: excludeMirror.width,
                    height: excludeMirror.height,
                    orientation: excludeMirror.orientation
                })
            };
        }
        
        const bounds = mirrorToCheck.getBounds();
        
        // Check bounds - mirrors can touch forbidden zone edges but not enter them
        const minX = GameConfig.EDGE_MARGIN;
        const maxX = GameConfig.CANVAS_WIDTH - GameConfig.EDGE_MARGIN;
        const minY = GameConfig.EDGE_MARGIN;
        const maxY = GameConfig.CANVAS_HEIGHT - GameConfig.EDGE_MARGIN;
        
        if (bounds.left < minX || bounds.right > maxX || bounds.top < minY || bounds.bottom > maxY) {
            return false;
        }
        
        // Check distance from center - no part of mirror can be in safe zone
        const centerX = GameConfig.CANVAS_WIDTH / 2;
        const centerY = GameConfig.CANVAS_HEIGHT / 2;
        
        // Calculate closest point of mirror bounding box to center
        const closestX = Math.max(bounds.left, Math.min(centerX, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(centerY, bounds.bottom));
        const distFromCenter = Math.sqrt((closestX - centerX) ** 2 + (closestY - centerY) ** 2);
        
        if (distFromCenter < GameConfig.TARGET_SAFE_RADIUS) {
            return false;
        }
        
        // Check overlap with other mirrors - no overlap allowed
        for (let mirror of this.mirrors) {
            if (mirror === excludeMirror) continue; // Skip the mirror being moved
            
            const otherBounds = mirror.getBounds();
            
            // Check for bounding box overlap (not just touching)
            if (bounds.left < otherBounds.right && bounds.right > otherBounds.left &&
                bounds.top < otherBounds.bottom && bounds.bottom > otherBounds.top) {
                return false; // Mirrors overlap
            }
        }
        
        return true;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Pointer event handlers (mouse and touch)
    onPointerDown(e) {
        if (this.isPlaying) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.scaleX || (this.canvas.width / rect.width);
        const scaleY = this.scaleY || (this.canvas.height / rect.height);
        
        const pointerX = (e.clientX - rect.left) * scaleX;
        const pointerY = (e.clientY - rect.top) * scaleY;
        
        // Check if clicking on a mirror
        for (let mirror of this.mirrors) {
            if (mirror.containsPoint(pointerX, pointerY)) {
                this.draggedMirror = mirror;
                this.dragOffset.x = pointerX - mirror.x;
                this.dragOffset.y = pointerY - mirror.y;
                this.canvas.style.cursor = 'grabbing';
                mirror.isDragging = true;
                break;
            }
        }
    }
    
    onPointerMove(e) {
        if (!this.draggedMirror || this.isPlaying) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.scaleX || (this.canvas.width / rect.width);
        const scaleY = this.scaleY || (this.canvas.height / rect.height);
        
        const pointerX = (e.clientX - rect.left) * scaleX;
        const pointerY = (e.clientY - rect.top) * scaleY;
        
        // Move smoothly without snapping during drag
        this.draggedMirror.x = pointerX - this.dragOffset.x;
        this.draggedMirror.y = pointerY - this.dragOffset.y;
    }
    
    onPointerUp(e) {
        if (this.draggedMirror) {
            // Snap mirror position so extremities align with grid lines
            const snappedPos = this.snapMirrorToGrid(this.draggedMirror, this.draggedMirror.x, this.draggedMirror.y);
            
            // Check if the snapped position is valid (exclude the dragged mirror from overlap check)
            if (this.isValidMirrorPosition(snappedPos.x, snappedPos.y, this.draggedMirror)) {
                this.draggedMirror.x = snappedPos.x;
                this.draggedMirror.y = snappedPos.y;
            } else {
                // If invalid, find nearest valid position
                const nearestValid = this.findNearestValidPosition(this.draggedMirror.x, this.draggedMirror.y, this.draggedMirror);
                this.draggedMirror.x = nearestValid.x;
                this.draggedMirror.y = nearestValid.y;
            }
            
            this.draggedMirror.isDragging = false;
        }
        this.draggedMirror = null;
        this.canvas.style.cursor = 'crosshair';
    }
    
    findNearestValidPosition(x, y, excludeMirror = null) {
        // Try positions in expanding spiral from current position
        let startPos = this.snapMirrorToGrid(excludeMirror, x, y);
        
        for (let radius = 0; radius <= 100; radius += GameConfig.GRID_SIZE) {
            for (let angle = 0; angle < 360; angle += 45) {
                const testX = startPos.x + Math.cos(angle * Math.PI / 180) * radius;
                const testY = startPos.y + Math.sin(angle * Math.PI / 180) * radius;
                const snappedPos = this.snapMirrorToGrid(excludeMirror, testX, testY);
                
                if (this.isValidMirrorPosition(snappedPos.x, snappedPos.y, excludeMirror)) {
                    return { x: snappedPos.x, y: snappedPos.y };
                }
            }
        }
        
        // Fallback to original position if no valid position found
        return startPos;
    }
    
    // Game flow methods
    launchLasers() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.gameOver = false;
        this.lasers = [];
        this.totalReflections = 0;
        
        // Start timer
        this.startTime = performance.now();
        this.elapsedTime = 0;
        
        // Create lasers from spawners
        this.spawners.forEach(spawner => {
            this.lasers.push(spawner.createLaser());
        });
        
        this.launchButton.disabled = true;
        this.updateStatus('⚡ LASER SEQUENCE ACTIVE ⚡', 'status-playing');
    }
    
    resetGame() {
        this.isPlaying = false;
        this.gameOver = false;
        this.lasers = [];
        this.totalReflections = 0;
        this.elapsedTime = 0;
        this.hideGameOverModal();
        this.generateMirrors();
        this.generateSpawners();
        
        this.launchButton.disabled = false;
        this.updateStatus('🎯 Position your mirrors to protect the core!');
        this.updateTimer();
    }
    
    clearCache() {
        console.log('Clear cache button clicked!');
        
        // Show immediate feedback
        this.updateStatus('Clearing cache...', 'status-playing');
        
        // Clear browser caches
        if ('caches' in window) {
            caches.keys().then(names => {
                console.log('Clearing caches:', names);
                names.forEach(name => {
                    caches.delete(name);
                });
            }).catch(err => console.log('Cache clear error:', err));
        }
        
        // Clear localStorage and sessionStorage
        try {
            localStorage.clear();
            sessionStorage.clear();
            console.log('Storage cleared');
        } catch (e) {
            console.log('Storage clear error:', e);
        }
        
        // Force reload without cache
        this.updateStatus('Cache cleared! Reloading...', 'status-success');
        setTimeout(() => {
            console.log('Forcing reload...');
            // Try multiple reload methods
            if (window.location.reload) {
                window.location.reload(true);
            } else {
                window.location.href = window.location.href + '?nocache=' + Date.now();
            }
        }, 1000);
    }
    
    updateTimer() {
        if (this.timerElement) {
            const minutes = Math.floor(this.elapsedTime / 60000);
            const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
            const milliseconds = Math.floor(this.elapsedTime % 1000);
            
            const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
            this.timerElement.textContent = formattedTime;
        } else {
            console.log('Timer element not found!');
        }
    }
    
    showGameOverModal() {
        console.log('showGameOverModal called');
        if (this.gameOverModal) {
            console.log('Game over modal found, showing...');
            // Calculate precision score with multiple factors
            const survivedSeconds = this.elapsedTime / 1000;
            
            // Time Bonus: More points for surviving longer (up to 60 seconds)
            const timeBonus = Math.min(survivedSeconds * 150, 9000);
            
            // Reflection Bonus: Points for each laser reflection (skill demonstration)
            const reflectionBonus = this.totalReflections * 75;
            
            // Precision Bonus: Extra points based on time vs reflections ratio
            // Rewards players who create complex reflection patterns
            const precisionRatio = this.totalReflections / Math.max(survivedSeconds, 1);
            const precisionBonus = Math.round(precisionRatio * 200);
            
            // Base survival bonus for lasting any amount of time
            const baseSurvivalBonus = survivedSeconds > 0 ? 500 : 0;
            
            const finalScore = Math.round(timeBonus + reflectionBonus + precisionBonus + baseSurvivalBonus);
            
            console.log('Score breakdown:', { 
                survivedSeconds: survivedSeconds.toFixed(3), 
                timeBonus, 
                reflectionBonus, 
                precisionBonus,
                baseSurvivalBonus,
                totalReflections: this.totalReflections, 
                finalScore 
            });
            
            // Update modal content
            const finalTimeElement = document.getElementById('finalTime');
            const finalReflectionsElement = document.getElementById('finalReflections');
            const finalScoreElement = document.getElementById('finalScore');
            
            if (finalTimeElement) finalTimeElement.textContent = this.timerElement ? this.timerElement.textContent : '00:00.000';
            if (finalReflectionsElement) finalReflectionsElement.textContent = this.totalReflections;
            if (finalScoreElement) finalScoreElement.textContent = finalScore.toLocaleString();
            
            // Show modal with animation
            this.gameOverModal.classList.remove('hidden');
        } else {
            console.error('Game over modal not found!');
        }
    }
    
    hideGameOverModal() {
        if (this.gameOverModal) {
            this.gameOverModal.classList.add('hidden');
        }
        // Don't call resetGame here to avoid infinite loop - resetGame calls this method
    }
    
    updateStatus(message, className = '') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.className = `status-modern ${className}`;
        }
    }
    
    // Game loop
    update() {
        // Update timer when playing
        if (this.isPlaying && !this.gameOver) {
            this.elapsedTime = performance.now() - this.startTime;
            this.updateTimer();
        }
        
        if (!this.isPlaying || this.gameOver) return;
        
        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update();
            
            // Check collision with mirrors using SAT
            for (let mirror of this.mirrors) {
                if (SATCollision.checkLaserMirrorCollision(laser, mirror)) {
                    laser.reflectionCount++;
                    this.totalReflections++;
                    break;
                }
            }
            
            // Check collision with center target
            if (laser.checkTargetCollision()) {
                this.gameOver = true;
                this.isPlaying = false;
                this.updateStatus('💥 CORE BREACH DETECTED 💥', 'status-game-over');
                
                // Show game over modal after brief delay for dramatic effect
                setTimeout(() => {
                    this.showGameOverModal();
                }, 1500);
                return;
            }
            
            // Remove laser if out of bounds
            if (laser.isOutOfBounds()) {
                this.lasers.splice(i, 1);
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, GameConfig.CANVAS_WIDTH, GameConfig.CANVAS_HEIGHT);
        
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
        
        // Draw forbidden zones during setup
        if (!this.isPlaying) {
            this.drawForbiddenZones();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = GameConfig.COLORS.GRID_LINE;
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= GameConfig.CANVAS_WIDTH; x += GameConfig.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, GameConfig.CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= GameConfig.CANVAS_HEIGHT; y += GameConfig.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(GameConfig.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
    }
    
    drawTarget() {
        const centerX = GameConfig.CANVAS_WIDTH / 2;
        const centerY = GameConfig.CANVAS_HEIGHT / 2;
        
        // Target circle
        this.ctx.fillStyle = this.gameOver ? 
            GameConfig.COLORS.TARGET_HIT : 
            GameConfig.COLORS.TARGET_NORMAL;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, GameConfig.TARGET_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Target crosshair
        this.ctx.strokeStyle = GameConfig.COLORS.TARGET_CROSSHAIR;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 8, centerY);
        this.ctx.lineTo(centerX + 8, centerY);
        this.ctx.moveTo(centerX, centerY - 8);
        this.ctx.lineTo(centerX, centerY + 8);
        this.ctx.stroke();
    }
    
    drawForbiddenZones() {
        this.ctx.fillStyle = GameConfig.COLORS.FORBIDDEN_ZONE;
        
        // Center forbidden zone
        const centerX = GameConfig.CANVAS_WIDTH / 2;
        const centerY = GameConfig.CANVAS_HEIGHT / 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, GameConfig.TARGET_SAFE_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Edge forbidden zones - show exact forbidden areas 
        const edgeMargin = GameConfig.EDGE_MARGIN;
        
        // Top zone
        this.ctx.fillRect(0, 0, GameConfig.CANVAS_WIDTH, edgeMargin);
        // Bottom zone  
        this.ctx.fillRect(0, GameConfig.CANVAS_HEIGHT - edgeMargin, GameConfig.CANVAS_WIDTH, edgeMargin);
        // Left zone
        this.ctx.fillRect(0, 0, edgeMargin, GameConfig.CANVAS_HEIGHT);
        // Right zone
        this.ctx.fillRect(GameConfig.CANVAS_WIDTH - edgeMargin, 0, edgeMargin, GameConfig.CANVAS_HEIGHT);
        
        // Draw border lines to make zones more obvious
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        // Center circle border
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, GameConfig.TARGET_SAFE_RADIUS, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Edge zone borders
        this.ctx.beginPath();
        this.ctx.rect(edgeMargin, edgeMargin, 
                     GameConfig.CANVAS_WIDTH - edgeMargin * 2, 
                     GameConfig.CANVAS_HEIGHT - edgeMargin * 2);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]); // Reset line dash
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}