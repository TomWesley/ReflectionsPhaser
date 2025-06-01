// GameArea.js - Manages the game area boundaries and visual elements
class GameArea {
    constructor(scene, scalingManager) {
      this.scene = scene;
      this.scaling = scalingManager;
      
      // Physics bodies for boundaries
      this.walls = {};
      
      // Visual elements
      this.visuals = {};
      
      // Create game area
      this.createGameArea();
    }
    
    createGameArea() {
      this.createVisualBoundary();
      this.createPhysicsBoundaries();
      this.createPlacementBoundary();
    }
    
    createVisualBoundary() {
      const bounds = this.scaling.gameBounds;
      const borderSize = this.scaling.getScaledValue(10);
      
      // Game area background
      this.visuals.background = this.scene.add.graphics();
      this.visuals.background.fillGradientStyle(0x0f1419, 0x0f1419, 0x1a1a2e, 0x1a1a2e, 1);
      this.visuals.background.fillRoundedRect(
        bounds.left - borderSize,
        bounds.top - borderSize,
        bounds.width + borderSize * 2,
        bounds.height + borderSize * 2,
        this.scaling.getScaledValue(15)
      );
      this.visuals.background.lineStyle(this.scaling.getScaledValue(3), 0x4facfe, 0.6);
      this.visuals.background.strokeRoundedRect(
        bounds.left - borderSize,
        bounds.top - borderSize,
        bounds.width + borderSize * 2,
        bounds.height + borderSize * 2,
        this.scaling.getScaledValue(15)
      );
      
      // Glow effect
      this.visuals.glow = this.scene.add.graphics();
      this.visuals.glow.fillStyle(0x4facfe, 0.1);
      this.visuals.glow.fillRoundedRect(
        bounds.left - borderSize - 5,
        bounds.top - borderSize - 5,
        bounds.width + (borderSize + 5) * 2,
        bounds.height + (borderSize + 5) * 2,
        this.scaling.getScaledValue(20)
      );
    }
    
    createPhysicsBoundaries() {
      const bounds = this.scaling.gameBounds;
      const wallThickness = this.scaling.getScaledValue(5);
      
      // Create physics walls
      this.walls.top = this.scene.matter.add.rectangle(
        (bounds.left + bounds.right) / 2,
        bounds.top - wallThickness / 2,
        bounds.width + wallThickness * 2,
        wallThickness,
        {
          isStatic: true,
          label: 'boundary',
          restitution: 1,
          collisionFilter: {
            category: 0x0008,
            mask: 0x0001
          }
        }
      );
      
      this.walls.bottom = this.scene.matter.add.rectangle(
        (bounds.left + bounds.right) / 2,
        bounds.bottom + wallThickness / 2,
        bounds.width + wallThickness * 2,
        wallThickness,
        {
          isStatic: true,
          label: 'boundary',
          restitution: 1,
          collisionFilter: {
            category: 0x0008,
            mask: 0x0001
          }
        }
      );
      
      this.walls.left = this.scene.matter.add.rectangle(
        bounds.left - wallThickness / 2,
        (bounds.top + bounds.bottom) / 2,
        wallThickness,
        bounds.height + wallThickness * 2,
        {
          isStatic: true,
          label: 'boundary',
          restitution: 1,
          collisionFilter: {
            category: 0x0008,
            mask: 0x0001
          }
        }
      );
      
      this.walls.right = this.scene.matter.add.rectangle(
        bounds.right + wallThickness / 2,
        (bounds.top + bounds.bottom) / 2,
        wallThickness,
        bounds.height + wallThickness * 2,
        {
          isStatic: true,
          label: 'boundary',
          restitution: 1,
          collisionFilter: {
            category: 0x0008,
            mask: 0x0001
          }
        }
      );
    }
    
    createPlacementBoundary() {
      const bounds = this.scaling.gameBounds;
      const constraints = this.scaling.placementConstraints;
      
      // Visual indicators for no-go zones
      this.visuals.placementBoundary = this.scene.add.graphics();
      
      // Modern styling for restricted areas
      this.visuals.placementBoundary.fillStyle(0xFF6B6B, 0.2);
      this.visuals.placementBoundary.lineStyle(this.scaling.getScaledValue(2), 0xFF4757, 0.4);
      
      // Draw target no-go zone (circle around center)
      this.visuals.placementBoundary.fillCircle(0, 0, constraints.targetSafeRadius);
      this.visuals.placementBoundary.strokeCircle(0, 0, constraints.targetSafeRadius);
      
      // Draw wall no-go zones
      const margin = constraints.wallSafeMargin;
      
      // Top wall zone
      this.visuals.placementBoundary.fillRect(
        bounds.left,
        bounds.top,
        bounds.width,
        margin
      );
      
      // Bottom wall zone
      this.visuals.placementBoundary.fillRect(
        bounds.left,
        bounds.bottom - margin,
        bounds.width,
        margin
      );
      
      // Left wall zone
      this.visuals.placementBoundary.fillRect(
        bounds.left,
        bounds.top + margin,
        margin,
        bounds.height - margin * 2
      );
      
      // Right wall zone
      this.visuals.placementBoundary.fillRect(
        bounds.right - margin,
        bounds.top + margin,
        margin,
        bounds.height - margin * 2
      );
    }
    
    // Hide placement boundaries when game starts
    hidePlacementBoundary() {
      if (this.visuals.placementBoundary) {
        this.visuals.placementBoundary.setVisible(false);
      }
    }
    
    // Handle resize
    handleResize() {
      // Clear and recreate visual elements
      if (this.visuals.background) this.visuals.background.clear();
      if (this.visuals.glow) this.visuals.glow.clear();
      if (this.visuals.placementBoundary) this.visuals.placementBoundary.clear();
      
      this.createVisualBoundary();
      this.createPlacementBoundary();
      
      // Update physics boundaries
      this.updatePhysicsBoundaries();
    }
    
    updatePhysicsBoundaries() {
      const bounds = this.scaling.gameBounds;
      const wallThickness = this.scaling.getScaledValue(5);
      
      // Remove old walls
      if (this.scene.matter.world) {
        Object.values(this.walls).forEach(wall => {
          if (wall) this.scene.matter.world.remove(wall);
        });
      }
      
      // Recreate with new dimensions
      this.createPhysicsBoundaries();
    }
    
    // Get bounds for external use
    getBounds() {
      return this.scaling.gameBounds;
    }
    
    // Check if position is valid for mirror placement
    isValidMirrorPosition(x, y) {
      const constraints = this.scaling.placementConstraints;
      const bounds = this.scaling.gameBounds;
      
      // Check distance from center (target)
      const distanceFromCenter = Math.sqrt(x * x + y * y);
      if (distanceFromCenter < constraints.targetSafeRadius) {
        return false;
      }
      
      // Check wall margins
      const margin = constraints.wallSafeMargin;
      if (x < bounds.left + margin || x > bounds.right - margin ||
          y < bounds.top + margin || y > bounds.bottom - margin) {
        return false;
      }
      
      return true;
    }
    
    // Cleanup
    destroy() {
      // Remove physics bodies
      if (this.scene.matter.world) {
        Object.values(this.walls).forEach(wall => {
          if (wall) this.scene.matter.world.remove(wall);
        });
      }
      
      // Remove visual elements
      Object.values(this.visuals).forEach(visual => {
        if (visual && visual.destroy) visual.destroy();
      });
    }
  }