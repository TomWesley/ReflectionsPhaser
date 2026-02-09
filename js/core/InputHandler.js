import { CONFIG } from '../config.js';

/**
 * Handles all input functionality for the game
 * Extracted from Game.js without changing behavior
 */
export class InputHandler {
    constructor(game) {
        this.game = game;
    }

    setupEventListeners() {
        // Mouse events on canvas
        this.game.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.game.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.game.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.game.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));

        // Global mouse events to handle off-canvas dragging
        document.addEventListener('mousemove', (e) => this.onGlobalMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onGlobalMouseUp(e));

        // UI buttons
        document.getElementById('launchBtn').addEventListener('click', () => this.game.launchLasers());
        document.getElementById('resetBtn').addEventListener('click', () => this.game.resetGame());
    }

    onMouseDown(e) {
        if (this.game.isPlaying) return;

        const rect = this.game.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if clicking on a mirror
        for (let mirror of this.game.mirrors) {
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
                    isMouseOverMirror = this.game.pointInRightTriangle(mouseX, mouseY, mirror);
                    break;
                case 'isoscelesTriangle':
                    isMouseOverMirror = this.game.pointInIsoscelesTriangle(mouseX, mouseY, mirror);
                    break;
                case 'trapezoid':
                    isMouseOverMirror = this.game.pointInTrapezoid(mouseX, mouseY, mirror);
                    break;
                case 'parallelogram':
                    isMouseOverMirror = this.game.pointInParallelogram(mouseX, mouseY, mirror);
                    break;
            }

            if (isMouseOverMirror) {

                this.game.draggedMirror = mirror;
                this.game.dragOffset.x = mouseX - mirror.x;
                this.game.dragOffset.y = mouseY - mirror.y;
                this.game.dragStartPos.x = mouseX;
                this.game.dragStartPos.y = mouseY;
                this.game.mouseHasMoved = false;
                this.game.canvas.style.cursor = 'grabbing';
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
        if (!this.game.draggedMirror || this.game.isPlaying) return;

        const rect = this.game.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if mouse has moved significantly from start position
        const moveThreshold = 5; // pixels
        const deltaX = Math.abs(mouseX - this.game.dragStartPos.x);
        const deltaY = Math.abs(mouseY - this.game.dragStartPos.y);

        if (deltaX > moveThreshold || deltaY > moveThreshold) {
            this.game.mouseHasMoved = true;
        }

        // Move smoothly without snapping during drag
        let newX = mouseX - this.game.dragOffset.x;
        let newY = mouseY - this.game.dragOffset.y;

        // Constrain to canvas bounds with margin for mirror size
        const maxMirrorSize = Math.max(this.game.draggedMirror.width || this.game.draggedMirror.size,
                                      this.game.draggedMirror.height || this.game.draggedMirror.size);
        const margin = maxMirrorSize / 2 + 10; // Half mirror size plus small buffer

        newX = Math.max(margin, Math.min(CONFIG.CANVAS_WIDTH - margin, newX));
        newY = Math.max(margin, Math.min(CONFIG.CANVAS_HEIGHT - margin, newY));

        // Update mirror position directly (no validation during drag)
        this.game.draggedMirror.x = newX;
        this.game.draggedMirror.y = newY;
        this.game.draggedMirror.isDragging = true;
    }

    onMouseUp(e) {
        if (this.game.draggedMirror) {
            // If mouse didn't move, just restore original position and exit
            if (!this.game.mouseHasMoved) {
                this.game.draggedMirror.isDragging = false;
                this.game.draggedMirror = null;
                this.game.canvas.style.cursor = 'grab';
                return;
            }

            const mirror = this.game.draggedMirror;
            console.log('Dropped mirror at', mirror.x, mirror.y);

            // Validate the new position
            if (this.game.isValidPosition(mirror)) {
                // Valid position - complete the move with grid alignment
                this.game.alignMirrorToGrid(mirror);
                mirror.isDragging = false;

                console.log('Final mirror position after grid alignment:', mirror.x, mirror.y);

                // Force validation after placement to maintain constraints
                this.game.enforceValidationDuringPlacement();

            } else {
                console.log('Invalid position, reverting');
                // Invalid position - revert to original position
                mirror.x = mirror.originalX;
                mirror.y = mirror.originalY;
                mirror.isDragging = false;

                // Show visual feedback or message
                const statusEl = document.getElementById('status');
                if (statusEl) {
                    const originalText = statusEl.textContent;
                    const originalClass = statusEl.className;
                    statusEl.textContent = 'Invalid mirror placement!';
                    statusEl.className = 'status-modern status-invalid';

                    setTimeout(() => {
                        statusEl.textContent = originalText;
                        statusEl.className = originalClass;
                    }, 2000);
                }
            }

            this.game.canvas.style.cursor = 'grab';
            this.game.draggedMirror = null;
            this.game.mouseHasMoved = false;
        }
    }

    onMouseLeave(e) {
        // Continue tracking global mouse events
        // The global events will handle the actual mouse up
    }

    onGlobalMouseMove(e) {
        if (!this.game.draggedMirror || this.game.isPlaying) return;

        const rect = this.game.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if mouse has moved significantly from start position
        const moveThreshold = 5; // pixels
        const deltaX = Math.abs(mouseX - this.game.dragStartPos.x);
        const deltaY = Math.abs(mouseY - this.game.dragStartPos.y);

        if (deltaX > moveThreshold || deltaY > moveThreshold) {
            this.game.mouseHasMoved = true;
        }

        // Move smoothly without snapping during drag
        let newX = mouseX - this.game.dragOffset.x;
        let newY = mouseY - this.game.dragOffset.y;

        // Constrain to canvas bounds with margin for mirror size
        const maxMirrorSize = Math.max(this.game.draggedMirror.width || this.game.draggedMirror.size,
                                      this.game.draggedMirror.height || this.game.draggedMirror.size);
        const margin = maxMirrorSize / 2 + 10; // Half mirror size plus small buffer

        newX = Math.max(margin, Math.min(CONFIG.CANVAS_WIDTH - margin, newX));
        newY = Math.max(margin, Math.min(CONFIG.CANVAS_HEIGHT - margin, newY));

        // Update mirror position directly
        this.game.draggedMirror.x = newX;
        this.game.draggedMirror.y = newY;
        this.game.draggedMirror.isDragging = true;
    }

    onGlobalMouseUp(e) {
        if (this.game.draggedMirror) {
            this.onMouseUp(e);
        }
    }
}