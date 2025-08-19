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
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupInfoBubble();
        this.handleMobileLayout();
        this.generateMirrors();
        this.generateSpawners();
        this.updateStatus('Position your mirrors to protect the center!');
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
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
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
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
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
        
        // Create lasers from spawners
        this.spawners.forEach(spawner => {
            this.lasers.push(spawner.createLaser());
        });
        
        this.launchButton.disabled = true;
        this.updateStatus('Lasers launched! Protect the center!', 'status-playing');
    }
    
    resetGame() {
        this.isPlaying = false;
        this.gameOver = false;
        this.lasers = [];
        this.generateMirrors();
        this.generateSpawners();
        
        this.launchButton.disabled = false;
        this.updateStatus('Position your mirrors to protect the center!');
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
    
    updateStatus(message, className = '') {
        this.statusElement.textContent = message;
        this.statusElement.className = className;
    }
    
    // Game loop
    update() {
        if (!this.isPlaying || this.gameOver) return;
        
        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update();
            
            // Check collision with mirrors using SAT
            for (let mirror of this.mirrors) {
                if (SATCollision.checkLaserMirrorCollision(laser, mirror)) {
                    laser.reflectionCount++;
                    break;
                }
            }
            
            // Check collision with center target
            if (laser.checkTargetCollision()) {
                this.gameOver = true;
                this.updateStatus('GAME OVER! Laser hit the center!', 'status-game-over');
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