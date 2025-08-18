// GridManager.js - Manages grid system and angle constraints
class GridManager {
    constructor(scalingManager) {
        this.scaling = scalingManager;
        
        // Grid configuration
        this.ANGLE_INCREMENT = 10; // degrees
        this.GRID_SIZE_BASE = 20; // base grid size
        
        // Calculate actual grid size based on scaling
        this.updateGridSize();
        
        // Grid visual settings
        this.gridColor = 0xcccccc;
        this.gridAlpha = 0.6;
        this.gridLineWidth = 1;
    }
    
    updateGridSize() {
        if (this.scaling) {
            // Scale grid size based on responsive scale for consistent visual feel
            this.gridSize = this.scaling.getScaledValue(this.GRID_SIZE_BASE);
        } else {
            this.gridSize = this.GRID_SIZE_BASE;
        }
    }
    
    // Snap position to grid
    snapToGrid(x, y) {
        const snappedX = Math.round(x / this.gridSize) * this.gridSize;
        const snappedY = Math.round(y / this.gridSize) * this.gridSize;
        return { x: snappedX, y: snappedY };
    }
    
    // Snap angle to 10-degree increments
    snapAngleToIncrement(angleRadians) {
        const angleDegrees = angleRadians * (180 / Math.PI);
        const snappedDegrees = Math.round(angleDegrees / this.ANGLE_INCREMENT) * this.ANGLE_INCREMENT;
        return snappedDegrees * (Math.PI / 180);
    }
    
    // Generate random angle in 10-degree increments
    getRandomAngleIncrement() {
        const numIncrements = 360 / this.ANGLE_INCREMENT;
        const randomIncrement = Math.floor(Math.random() * numIncrements);
        return randomIncrement * this.ANGLE_INCREMENT * (Math.PI / 180);
    }
    
    // Get valid angles for spawners (pointing toward center)
    getSpawnerAngle(spawnerPosition) {
        // Calculate angle toward center
        const angle = Math.atan2(-spawnerPosition.y, -spawnerPosition.x);
        // Snap to nearest increment
        return this.snapAngleToIncrement(angle);
    }
    
    // Check if a position aligns with grid
    isAlignedWithGrid(x, y) {
        const tolerance = 1; // pixels
        const snapped = this.snapToGrid(x, y);
        return Math.abs(x - snapped.x) <= tolerance && Math.abs(y - snapped.y) <= tolerance;
    }
    
    // Get grid boundaries for shape sizing
    getShapeGridBounds(shapeType) {
        switch (shapeType) {
            case 'rectangle':
            case 'square':
                // Ensure rectangles fit neatly in grid cells
                return {
                    minWidth: this.gridSize,
                    maxWidth: this.gridSize * 3,
                    minHeight: this.gridSize,
                    maxHeight: this.gridSize * 2
                };
            case 'rightTriangle':
            case 'isoscelesTriangle':
                // Triangles sized to fit grid proportionally
                return {
                    baseSize: this.gridSize * 1.5,
                    maxSize: this.gridSize * 2.5
                };
            case 'trapezoid':
                return {
                    baseWidth: this.gridSize * 2,
                    topWidth: this.gridSize,
                    height: this.gridSize * 1.5
                };
            case 'semicircle':
                return {
                    radius: this.gridSize
                };
            default:
                return {
                    size: this.gridSize
                };
        }
    }
    
    // Create grid visual overlay
    createGridVisual(scene, bounds) {
        console.log('Creating grid with bounds:', bounds);
        console.log('Grid size:', this.gridSize);
        console.log('Grid color:', this.gridColor, 'Alpha:', this.gridAlpha);
        
        const graphics = scene.add.graphics();
        graphics.setDepth(10); // Higher depth to be above background
        
        // Use thicker, darker lines for visibility
        graphics.lineStyle(2, 0x000000, 0.8);
        
        // Draw vertical lines
        for (let x = bounds.left; x <= bounds.right; x += this.gridSize) {
            graphics.moveTo(x, bounds.top);
            graphics.lineTo(x, bounds.bottom);
        }
        
        // Draw horizontal lines
        for (let y = bounds.top; y <= bounds.bottom; y += this.gridSize) {
            graphics.moveTo(bounds.left, y);
            graphics.lineTo(bounds.right, y);
        }
        
        graphics.strokePath();
        
        console.log('Grid created with', Math.floor((bounds.right - bounds.left) / this.gridSize), 'vertical lines and', Math.floor((bounds.bottom - bounds.top) / this.gridSize), 'horizontal lines');
        
        return graphics;
    }
    
    // Hide grid visual
    hideGrid(gridGraphics, scene) {
        if (gridGraphics) {
            scene.tweens.add({
                targets: gridGraphics,
                alpha: 0,
                duration: 300,
                ease: 'Cubic.out',
                onComplete: () => {
                    gridGraphics.setVisible(false);
                }
            });
        }
    }
    
    // Show grid visual
    showGrid(gridGraphics, scene) {
        if (gridGraphics) {
            gridGraphics.setVisible(true);
            scene.tweens.add({
                targets: gridGraphics,
                alpha: this.gridAlpha,
                duration: 300,
                ease: 'Cubic.out'
            });
        }
    }
    
    // Find nearest valid grid position within bounds
    findNearestValidGridPosition(x, y, bounds, constraints) {
        let snapped = this.snapToGrid(x, y);
        
        // Ensure position is within bounds
        const margin = constraints.wallSafeMargin;
        snapped.x = Math.max(bounds.left + margin, Math.min(bounds.right - margin, snapped.x));
        snapped.y = Math.max(bounds.top + margin, Math.min(bounds.bottom - margin, snapped.y));
        
        // Re-snap after clamping
        snapped = this.snapToGrid(snapped.x, snapped.y);
        
        // Check if too close to center
        const distFromCenter = Math.sqrt(snapped.x * snapped.x + snapped.y * snapped.y);
        if (distFromCenter < constraints.targetSafeRadius) {
            // Move to nearest valid grid position outside safe radius
            const angle = Math.atan2(snapped.y, snapped.x);
            const newDistance = constraints.targetSafeRadius + this.gridSize;
            snapped.x = Math.cos(angle) * newDistance;
            snapped.y = Math.sin(angle) * newDistance;
            snapped = this.snapToGrid(snapped.x, snapped.y);
        }
        
        return snapped;
    }
    
    // Generate grid-aligned mirror positions
    generateGridAlignedPositions(count, bounds, constraints) {
        const positions = [];
        let attempts = 0;
        const maxAttempts = 1000;
        
        // Define safe placement area
        const innerRadius = constraints.targetSafeRadius + this.gridSize;
        const outerRadius = Math.min(bounds.width, bounds.height) * 0.4;
        
        while (positions.length < count && attempts < maxAttempts) {
            // Generate position in ring around center
            const angle = Math.random() * Math.PI * 2;
            const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
            
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            // Snap to grid
            const gridPos = this.snapToGrid(x, y);
            
            // Validate position
            if (this.isValidGridPosition(gridPos.x, gridPos.y, bounds, constraints, positions)) {
                positions.push(gridPos);
            }
            
            attempts++;
        }
        
        return positions;
    }
    
    // Check if grid position is valid
    isValidGridPosition(x, y, bounds, constraints, existingPositions = []) {
        // Check bounds
        const margin = constraints.wallSafeMargin;
        if (x < bounds.left + margin || x > bounds.right - margin ||
            y < bounds.top + margin || y > bounds.bottom - margin) {
            return false;
        }
        
        // Check distance from center
        const distFromCenter = Math.sqrt(x * x + y * y);
        if (distFromCenter < constraints.targetSafeRadius) {
            return false;
        }
        
        // Check spacing from existing positions
        const minSpacing = Math.max(this.gridSize * 2, constraints.mirrorMinSpacing || this.gridSize * 3);
        for (const pos of existingPositions) {
            const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
            if (dist < minSpacing) {
                return false;
            }
        }
        
        return true;
    }
}