// ScalingManager.js - Centralized scaling logic for consistent gameplay
class ScalingManager {
    constructor(scene) {
      this.scene = scene;
      
      // Fixed aspect ratio for the game area (16:9)
      this.GAME_ASPECT_RATIO = 16 / 9;
      
      // Base dimensions for scaling calculations
      this.BASE_WIDTH = 1280;
      this.BASE_HEIGHT = 720;
      
      // Minimum dimensions to ensure playability
      this.MIN_GAME_WIDTH = 800;
      this.MIN_GAME_HEIGHT = 450;
      
      // UI space allocations (as percentages)
      this.UI_HEADER_RATIO = 0.12;
      this.UI_FOOTER_RATIO = 0.12;
      this.UI_SIDE_MARGIN_RATIO = 0.03;
      
      // Game element size ratios (relative to game area)
      this.TARGET_SIZE_RATIO = 0.08;
      this.MIRROR_MIN_SIZE_RATIO = 0.06;
      this.MIRROR_MAX_SIZE_RATIO = 0.09;
      this.SPAWNER_SIZE_RATIO = 0.015;
      
      // Placement constraints (as ratios of game size)
      this.TARGET_SAFE_ZONE_RATIO = 0.15;
      this.WALL_SAFE_MARGIN_RATIO = 0.05;
      this.MIRROR_SPACING_RATIO = 0.08;
      
      // Initialize dimensions
      this.calculateDimensions();
    }
    
    calculateDimensions() {
      // Get actual screen dimensions
      this.screenWidth = this.scene.cameras.main.width;
      this.screenHeight = this.scene.cameras.main.height;
      
      // Calculate UI dimensions
      this.headerHeight = this.screenHeight * this.UI_HEADER_RATIO;
      this.footerHeight = this.screenHeight * this.UI_FOOTER_RATIO;
      this.sideMargin = this.screenWidth * this.UI_SIDE_MARGIN_RATIO;
      
      // Calculate available space for game area
      const availableWidth = this.screenWidth - (this.sideMargin * 2);
      const availableHeight = this.screenHeight - this.headerHeight - this.footerHeight;
      
      // Calculate game area with fixed aspect ratio
      let gameWidth, gameHeight;
      
      if (availableWidth / availableHeight > this.GAME_ASPECT_RATIO) {
        // Height-constrained
        gameHeight = availableHeight;
        gameWidth = gameHeight * this.GAME_ASPECT_RATIO;
      } else {
        // Width-constrained
        gameWidth = availableWidth;
        gameHeight = gameWidth / this.GAME_ASPECT_RATIO;
      }
      
      // Ensure minimum dimensions
      if (gameWidth < this.MIN_GAME_WIDTH) {
        gameWidth = this.MIN_GAME_WIDTH;
        gameHeight = gameWidth / this.GAME_ASPECT_RATIO;
      }
      
      // Store game dimensions
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      
      // Calculate game bounds (centered in available area)
      const gameMargin = Math.min(gameWidth, gameHeight) * 0.02;
      this.gameBounds = {
        left: -gameWidth / 2 + gameMargin,
        right: gameWidth / 2 - gameMargin,
        top: -gameHeight / 2 + gameMargin,
        bottom: gameHeight / 2 - gameMargin,
        width: gameWidth - (gameMargin * 2),
        height: gameHeight - (gameMargin * 2)
      };
      
      // Calculate scale factor based on base dimensions
      this.scaleFactor = Math.min(gameWidth / this.BASE_WIDTH, gameHeight / this.BASE_HEIGHT);
      
      // Calculate UI positions
      this.uiPositions = {
        headerY: -this.screenHeight / 2 + this.headerHeight / 2,
        footerY: this.screenHeight / 2 - this.footerHeight / 2,
        centerX: 0
      };
      
      // Calculate game element sizes
      this.elementSizes = {
        target: Math.min(gameWidth, gameHeight) * this.TARGET_SIZE_RATIO,
        mirrorMin: Math.min(gameWidth, gameHeight) * this.MIRROR_MIN_SIZE_RATIO,
        mirrorMax: Math.min(gameWidth, gameHeight) * this.MIRROR_MAX_SIZE_RATIO,
        spawner: Math.min(gameWidth, gameHeight) * this.SPAWNER_SIZE_RATIO,
        laser: this.scaleFactor * 2
      };
      
      // Calculate placement constraints
      this.placementConstraints = {
        targetSafeRadius: Math.min(gameWidth, gameHeight) * this.TARGET_SAFE_ZONE_RATIO,
        wallSafeMargin: Math.min(gameWidth, gameHeight) * this.WALL_SAFE_MARGIN_RATIO,
        mirrorMinSpacing: Math.min(gameWidth, gameHeight) * this.MIRROR_SPACING_RATIO
      };
    }
    
    // Get responsive font size
    getFontSize(baseSize) {
      return Math.max(12, Math.round(baseSize * this.scaleFactor));
    }
    
    // Get responsive dimension
    getScaledValue(baseValue) {
      return baseValue * this.scaleFactor;
    }
    
    // Check if a position is within game bounds
    isWithinGameBounds(x, y, margin = 0) {
      return x >= this.gameBounds.left + margin &&
             x <= this.gameBounds.right - margin &&
             y >= this.gameBounds.top + margin &&
             y <= this.gameBounds.bottom - margin;
    }
    
    // Clamp position to game bounds
    clampToGameBounds(x, y, margin = 0) {
      return {
        x: Phaser.Math.Clamp(x, this.gameBounds.left + margin, this.gameBounds.right - margin),
        y: Phaser.Math.Clamp(y, this.gameBounds.top + margin, this.gameBounds.bottom - margin)
      };
    }
    
    // Get spawner positions around the game area
    getSpawnerPositions() {
      const margin = this.getScaledValue(10);
      const bounds = this.gameBounds;
      
      return [
        // Left side
        { x: bounds.left - margin, y: bounds.top + bounds.height * 0.25 },
        { x: bounds.left - margin, y: bounds.top + bounds.height * 0.5 },
        { x: bounds.left - margin, y: bounds.top + bounds.height * 0.75 },
        
        // Right side
        { x: bounds.right + margin, y: bounds.top + bounds.height * 0.25 },
        { x: bounds.right + margin, y: bounds.top + bounds.height * 0.5 },
        { x: bounds.right + margin, y: bounds.top + bounds.height * 0.75 },
        
        // Top side
        { x: bounds.left + bounds.width * 0.25, y: bounds.top - margin },
        { x: bounds.left + bounds.width * 0.5, y: bounds.top - margin },
        { x: bounds.left + bounds.width * 0.75, y: bounds.top - margin },
        
        // Bottom side
        { x: bounds.left + bounds.width * 0.25, y: bounds.bottom + margin },
        { x: bounds.left + bounds.width * 0.5, y: bounds.bottom + margin },
        { x: bounds.left + bounds.width * 0.75, y: bounds.bottom + margin }
      ];
    }
    
    // Update dimensions when screen resizes
    handleResize() {
      this.calculateDimensions();
      
      // Ensure camera stays centered after resize
      if (this.scene.cameras && this.scene.cameras.main) {
        this.scene.cameras.main.centerOn(0, 0);
      }
    }
  }