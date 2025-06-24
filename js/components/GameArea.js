// GameArea.js - Manages the game area boundaries and visual elements (NYT Style)
class GameArea {
    constructor(scene, scalingManager) {
      this.scene = scene;
      this.scaling = scalingManager;
      
      // NYT-style color palette
      this.colors = {
        background: 0xfafafa,
        surface: 0xffffff,
        border: 0xe5e7eb,
        borderLight: 0xf3f4f6,
        accent: 0x121212,
        danger: 0xef4444,
        dangerLight: 0xfee2e2,
        shadow: 0x000000
      };
      
      // Physics bodies for boundaries
      this.walls = {};
      
      // Visual elements
      this.visuals = {};
      
      // Create game area
      this.createGameArea();
      
      // Listen for scale changes
      this.scene.events.on('scale-changed', this.onScaleChanged, this);
    }
    
    createGameArea() {
      this.createVisualBoundary();
      this.createPhysicsBoundaries();
      this.createPlacementBoundary();
    }
    
    createVisualBoundary() {
      const bounds = this.scaling.gameBounds;
      const borderSize = this.scaling.getSpacing('sm');
      
      // Clear existing visuals
      if (this.visuals.background) {
        this.visuals.background.clear();
      } else {
        this.visuals.background = this.scene.add.graphics();
      }
      
      if (this.visuals.shadow) {
        this.visuals.shadow.clear();
      } else {
        this.visuals.shadow = this.scene.add.graphics();
      }
      
      // Game area background - clean white card
      this.visuals.background.fillStyle(this.colors.surface, 1);
      this.visuals.background.fillRoundedRect(
        bounds.left - borderSize,
        bounds.top - borderSize,
        bounds.width + borderSize * 2,
        bounds.height + borderSize * 2,
        this.scaling.getBorderRadius('lg')
      );
      
      // Subtle border
      this.visuals.background.lineStyle(1, this.colors.border, 0.8);
      this.visuals.background.strokeRoundedRect(
        bounds.left - borderSize,
        bounds.top - borderSize,
        bounds.width + borderSize * 2,
        bounds.height + borderSize * 2,
        this.scaling.getBorderRadius('lg')
      );
      
      // Subtle shadow effect
      this.visuals.shadow.fillStyle(this.colors.shadow, 0.03);
      this.visuals.shadow.fillRoundedRect(
        bounds.left - borderSize + this.scaling.getSpacing('xs'),
        bounds.top - borderSize + this.scaling.getSpacing('xs'),
        bounds.width + borderSize * 2,
        bounds.height + borderSize * 2,
        this.scaling.getBorderRadius('lg')
      );
      
      // Set shadow behind background
      this.visuals.shadow.setDepth(-1);
      this.visuals.background.setDepth(0);
    }
    
    createPhysicsBoundaries() {
      const bounds = this.scaling.gameBounds;
      const wallThickness = this.scaling.getScaledValue(8);
      
      // Clear existing walls
      if (this.scene.matter.world) {
        Object.values(this.walls).forEach(wall => {
          if (wall) this.scene.matter.world.remove(wall);
        });
      }
      
      // Create physics walls with proper collision categories
      this.walls.top = this.scene.matter.add.rectangle(
        (bounds.left + bounds.right) / 2,
        bounds.top - wallThickness / 2,
        bounds.width + wallThickness * 2,
        wallThickness,
        {
          isStatic: true,
          label: 'boundary',
          restitution: 1,
          friction: 0,
          frictionAir: 0,
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
          friction: 0,
          frictionAir: 0,
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
          friction: 0,
          frictionAir: 0,
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
          friction: 0,
          frictionAir: 0,
          collisionFilter: {
            category: 0x0008,
            mask: 0x0001
          }
        }
      );
      
      // Hide the default Matter.js rendering
      Object.values(this.walls).forEach(wall => {
        if (wall) wall.render.visible = false;
      });
    }
    
    createPlacementBoundary() {
      const bounds = this.scaling.gameBounds;
      const constraints = this.scaling.placementConstraints;
      
      // Clear existing placement boundary
      if (this.visuals.placementBoundary) {
        this.visuals.placementBoundary.clear();
      } else {
        this.visuals.placementBoundary = this.scene.add.graphics();
      }
      
      // Only draw if visible
      if (!this.visuals.placementBoundary.visible) {
        this.visuals.placementBoundary.setDepth(1);
        return;
      }
      
      // Visual indicators for restricted areas - subtle NYT style
      this.visuals.placementBoundary.fillStyle(this.colors.dangerLight, 0.3);
      this.visuals.placementBoundary.lineStyle(1, this.colors.danger, 0.4);
      
      // Draw target no-go zone (circle around center)
      this.visuals.placementBoundary.fillCircle(0, 0, constraints.targetSafeRadius);
      this.visuals.placementBoundary.strokeCircle(0, 0, constraints.targetSafeRadius);
      
      // Draw wall no-go zones
      const margin = constraints.wallSafeMargin;
      
      // Top wall zone
      this.visuals.placementBoundary.fillRoundedRect(
        bounds.left,
        bounds.top,
        bounds.width,
        margin,
        this.scaling.getBorderRadius('sm')
      );
      
      // Bottom wall zone
      this.visuals.placementBoundary.fillRoundedRect(
        bounds.left,
        bounds.bottom - margin,
        bounds.width,
        margin,
        this.scaling.getBorderRadius('sm')
      );
      
      // Left wall zone
      this.visuals.placementBoundary.fillRoundedRect(
        bounds.left,
        bounds.top + margin,
        margin,
        bounds.height - margin * 2,
        this.scaling.getBorderRadius('sm')
      );
      
      // Right wall zone
      this.visuals.placementBoundary.fillRoundedRect(
        bounds.right - margin,
        bounds.top + margin,
        margin,
        bounds.height - margin * 2,
        this.scaling.getBorderRadius('sm')
      );
      
      // Set proper depth for placement boundaries
      this.visuals.placementBoundary.setDepth(1);
    }
    
    // Hide placement boundaries when game starts
    hidePlacementBoundary() {
      if (this.visuals.placementBoundary) {
        // Smooth fade out
        this.scene.tweens.add({
          targets: this.visuals.placementBoundary,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.out',
          onComplete: () => {
            this.visuals.placementBoundary.setVisible(false);
          }
        });
      }
    }
    
    // Show placement boundaries
    showPlacementBoundary() {
      if (this.visuals.placementBoundary) {
        this.visuals.placementBoundary.setVisible(true);
        this.visuals.placementBoundary.setAlpha(1);
        this.createPlacementBoundary(); // Redraw with current bounds
      }
    }
    
    // Handle scale changes
    onScaleChanged(scaleData) {
      this.handleResize();
    }
    
    // Handle resize by recreating visual elements and physics
    handleResize() {
      // Recreate visual elements with new dimensions
      this.createVisualBoundary();
      this.createPlacementBoundary();
      
      // Recreate physics boundaries
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
    
    // Add subtle visual feedback for valid/invalid positions
    showPositionFeedback(x, y, isValid) {
      // Remove existing feedback
      if (this.positionFeedback) {
        this.positionFeedback.destroy();
      }
      
      // Create feedback circle
      const radius = this.scaling.getScaledValue(20);
      const color = isValid ? 0x4ade80 : this.colors.danger;
      const alpha = 0.3;
      
      this.positionFeedback = this.scene.add.circle(x, y, radius, color, alpha);
      this.positionFeedback.setDepth(2);
      
      // Fade out after a short time
      this.scene.tweens.add({
        targets: this.positionFeedback,
        alpha: 0,
        scale: 1.5,
        duration: 400,
        ease: 'Cubic.out',
        onComplete: () => {
          if (this.positionFeedback) {
            this.positionFeedback.destroy();
            this.positionFeedback = null;
          }
        }
      });
    }
    
    // Add visual polish - subtle grid pattern
    createGridPattern() {
      const bounds = this.scaling.gameBounds;
      const gridSize = this.scaling.getScaledValue(40);
      
      if (this.visuals.grid) {
        this.visuals.grid.clear();
      } else {
        this.visuals.grid = this.scene.add.graphics();
      }
      
      this.visuals.grid.lineStyle(1, this.colors.borderLight, 0.3);
      
      // Vertical lines
      for (let x = bounds.left; x <= bounds.right; x += gridSize) {
        this.visuals.grid.moveTo(x, bounds.top);
        this.visuals.grid.lineTo(x, bounds.bottom);
      }
      
      // Horizontal lines
      for (let y = bounds.top; y <= bounds.bottom; y += gridSize) {
        this.visuals.grid.moveTo(bounds.left, y);
        this.visuals.grid.lineTo(bounds.right, y);
      }
      
      this.visuals.grid.strokePath();
      this.visuals.grid.setDepth(-0.5);
      this.visuals.grid.setAlpha(0);
      
      // Subtle fade in
      this.scene.tweens.add({
        targets: this.visuals.grid,
        alpha: 1,
        duration: 1000,
        ease: 'Cubic.out'
      });
    }
    
    // Cleanup
    destroy() {
      // Remove scale change listener
      this.scene.events.off('scale-changed', this.onScaleChanged, this);
      
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
      
      // Clean up feedback
      if (this.positionFeedback) {
        this.positionFeedback.destroy();
        this.positionFeedback = null;
      }
    }
  }