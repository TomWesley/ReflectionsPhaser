class ScalingManager {
    constructor(scene) {
      this.scene = scene;
      
      // Detect device type
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      this.isTablet = this.isMobile && (window.innerWidth > 768 || window.innerHeight > 768);
      
      // Fixed aspect ratio for the game area (16:9)
      this.GAME_ASPECT_RATIO = 16 / 9;
      
      // Base dimensions for scaling calculations (1080p reference)
      this.BASE_WIDTH = 1920;
      this.BASE_HEIGHT = 1080;
      
      // Minimum dimensions to ensure playability
      this.MIN_GAME_WIDTH = 600;
      this.MIN_GAME_HEIGHT = 340;
      
      // UI space allocations (as percentages) - NYT style clean layout
      this.UI_HEADER_RATIO = this.isMobile ? 0.12 : 0.10;
      this.UI_FOOTER_RATIO = this.isMobile ? 0.14 : 0.12;
      this.UI_SIDE_MARGIN_RATIO = this.isMobile ? 0.015 : 0.025;
      
      // Game element size ratios (relative to game area) - refined for NYT style
      this.TARGET_SIZE_RATIO = this.isMobile ? 0.06 : 0.05;
      this.MIRROR_MIN_SIZE_RATIO = this.isMobile ? 0.07 : 0.055;
      this.MIRROR_MAX_SIZE_RATIO = this.isMobile ? 0.10 : 0.085;
      this.SPAWNER_SIZE_RATIO = this.isMobile ? 0.018 : 0.015;
      
      // Placement constraints
      this.TARGET_SAFE_ZONE_RATIO = 0.18;
      this.WALL_SAFE_MARGIN_RATIO = 0.06;
      this.MIRROR_SPACING_RATIO = this.isMobile ? 0.09 : 0.07;
      
      // Touch-specific settings
      this.MIN_TOUCH_TARGET_SIZE = 44;
      this.OPTIMAL_TOUCH_TARGET_SIZE = 56;
      
      // Font scaling
      this.BASE_FONT_SIZE = 16;
      this.FONT_SCALE_MIN = 0.75;
      this.FONT_SCALE_MAX = 1.5;
      
      // Initialize dimensions
      this.calculateDimensions();
      
      // Store initial scale for relative calculations
      this.initialScale = this.scaleFactor;
      
      // Debounced resize handler
      this.resizeTimeout = null;
    }
    
    calculateDimensions() {
      // Get actual screen dimensions
      this.screenWidth = this.scene.cameras.main.width;
      this.screenHeight = this.scene.cameras.main.height;
      
      // Calculate density-aware scaling
      this.pixelRatio = window.devicePixelRatio || 1;
      this.densityScale = Math.min(this.pixelRatio, 2); // Cap at 2x for performance
      
      // Calculate UI dimensions
      this.headerHeight = this.screenHeight * this.UI_HEADER_RATIO;
      this.footerHeight = this.screenHeight * this.UI_FOOTER_RATIO;
      this.sideMargin = this.screenWidth * this.UI_SIDE_MARGIN_RATIO;
      
      // Calculate available space for game area
      const availableWidth = this.screenWidth - (this.sideMargin * 2);
      const availableHeight = this.screenHeight - this.headerHeight - this.footerHeight;
      
      // Calculate game area with fixed aspect ratio and proper scaling
      let gameWidth, gameHeight;
      
      if (availableWidth / availableHeight > this.GAME_ASPECT_RATIO) {
        // Height-constrained
        gameHeight = Math.max(availableHeight, this.MIN_GAME_HEIGHT);
        gameWidth = gameHeight * this.GAME_ASPECT_RATIO;
      } else {
        // Width-constrained
        gameWidth = Math.max(availableWidth, this.MIN_GAME_WIDTH);
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
      
      // Calculate scale factor based on screen size and density
      const baseScale = Math.min(
        this.screenWidth / this.BASE_WIDTH,
        this.screenHeight / this.BASE_HEIGHT
      );
      this.scaleFactor = Math.max(0.3, Math.min(2.0, baseScale * this.densityScale));
      
      // Calculate responsive scale for different screen sizes
      this.responsiveScale = this.calculateResponsiveScale();
      
      // Calculate UI positions
      this.uiPositions = {
        headerY: -this.screenHeight / 2 + this.headerHeight / 2,
        footerY: this.screenHeight / 2 - this.footerHeight / 2,
        centerX: 0,
        centerY: 0
      };
      
      // Calculate game element sizes with responsive scaling
      const gameSize = Math.min(gameWidth, gameHeight);
      this.elementSizes = {
        target: gameSize * this.TARGET_SIZE_RATIO * this.responsiveScale,
        mirrorMin: gameSize * this.MIRROR_MIN_SIZE_RATIO * this.responsiveScale,
        mirrorMax: gameSize * this.MIRROR_MAX_SIZE_RATIO * this.responsiveScale,
        spawner: gameSize * this.SPAWNER_SIZE_RATIO * this.responsiveScale,
        laser: Math.max(1, this.scaleFactor * 2)
      };
      
      // Calculate placement constraints
      this.placementConstraints = {
        targetSafeRadius: gameSize * this.TARGET_SAFE_ZONE_RATIO,
        wallSafeMargin: gameSize * this.WALL_SAFE_MARGIN_RATIO,
        mirrorMinSpacing: gameSize * this.MIRROR_SPACING_RATIO
      };
      
      // Calculate font sizes
      this.fontSizes = this.calculateFontSizes();
      
      // Calculate touch sizes
      this.touchSizes = this.calculateTouchSizes();
    }
    
    calculateResponsiveScale() {
      // Enhanced responsive scaling based on screen size and type
      const screenArea = this.screenWidth * this.screenHeight;
      const baseArea = this.BASE_WIDTH * this.BASE_HEIGHT;
      const areaRatio = screenArea / baseArea;
      
      // Different scaling curves for different device types
      if (this.isMobile) {
        // Mobile gets more aggressive scaling to maintain usability
        return Math.max(0.7, Math.min(1.3, Math.sqrt(areaRatio) * 1.1));
      } else if (this.isTablet) {
        // Tablet gets moderate scaling
        return Math.max(0.8, Math.min(1.4, Math.sqrt(areaRatio) * 1.05));
      } else {
        // Desktop gets proportional scaling
        return Math.max(0.6, Math.min(1.8, Math.sqrt(areaRatio)));
      }
    }
    
    calculateFontSizes() {
      const baseScale = this.scaleFactor * this.responsiveScale;
      const fontScale = Math.max(this.FONT_SCALE_MIN, Math.min(this.FONT_SCALE_MAX, baseScale));
      
      return {
        tiny: Math.round(10 * fontScale),
        small: Math.round(12 * fontScale),
        medium: Math.round(16 * fontScale),
        large: Math.round(20 * fontScale),
        xlarge: Math.round(24 * fontScale),
        xxlarge: Math.round(32 * fontScale),
        title: Math.round(40 * fontScale),
        display: Math.round(48 * fontScale)
      };
    }
    
    calculateTouchSizes() {
      const baseTouch = this.isMobile ? this.OPTIMAL_TOUCH_TARGET_SIZE : this.MIN_TOUCH_TARGET_SIZE;
      const scale = this.scaleFactor * this.responsiveScale;
      
      return {
        minimum: Math.max(this.MIN_TOUCH_TARGET_SIZE, baseTouch * scale),
        optimal: Math.max(this.OPTIMAL_TOUCH_TARGET_SIZE, baseTouch * scale * 1.25),
        large: Math.max(this.OPTIMAL_TOUCH_TARGET_SIZE * 1.5, baseTouch * scale * 1.5)
      };
    }
    
    // Get responsive font size by name or base size
    getFontSize(sizeNameOrBase) {
      if (typeof sizeNameOrBase === 'string') {
        return this.fontSizes[sizeNameOrBase] || this.fontSizes.medium;
      }
      
      // Legacy support for numeric base sizes
      const scale = this.scaleFactor * this.responsiveScale;
      const fontScale = Math.max(this.FONT_SCALE_MIN, Math.min(this.FONT_SCALE_MAX, scale));
      return Math.max(10, Math.round(sizeNameOrBase * fontScale));
    }
    
    // Get responsive dimension
    getScaledValue(baseValue) {
      return baseValue * this.scaleFactor * this.responsiveScale;
    }
    
    // Get touch-friendly dimension
    getTouchSize(baseSize, type = 'minimum') {
      const scaled = this.getScaledValue(baseSize);
      const minSize = this.touchSizes[type] || this.touchSizes.minimum;
      return this.isMobile ? Math.max(scaled, minSize) : scaled;
    }
    
    // Get UI spacing
    getSpacing(size = 'md') {
      const spacings = {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48
      };
      return this.getScaledValue(spacings[size] || spacings.md);
    }
    
    // Get border radius
    getBorderRadius(size = 'md') {
      const radii = {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16
      };
      return this.getScaledValue(radii[size] || radii.md);
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
      const margin = this.getScaledValue(15);
      const bounds = this.gameBounds;
      
      return [
        // Left side
        { x: bounds.left - margin, y: bounds.top + bounds.height * 0.2 },
        { x: bounds.left - margin, y: bounds.top + bounds.height * 0.5 },
        { x: bounds.left - margin, y: bounds.top + bounds.height * 0.8 },
        
        // Right side  
        { x: bounds.right + margin, y: bounds.top + bounds.height * 0.2 },
        { x: bounds.right + margin, y: bounds.top + bounds.height * 0.5 },
        { x: bounds.right + margin, y: bounds.top + bounds.height * 0.8 },
        
        // Top side
        { x: bounds.left + bounds.width * 0.2, y: bounds.top - margin },
        { x: bounds.left + bounds.width * 0.5, y: bounds.top - margin },
        { x: bounds.left + bounds.width * 0.8, y: bounds.top - margin },
        
        // Bottom side
        { x: bounds.left + bounds.width * 0.2, y: bounds.bottom + margin },
        { x: bounds.left + bounds.width * 0.5, y: bounds.bottom + margin },
        { x: bounds.left + bounds.width * 0.8, y: bounds.bottom + margin }
      ];
    }
    
    // Update dimensions when screen resizes
    handleResize() {
      // Clear any pending resize timeout
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      
      // Debounce resize to prevent excessive calculations
      this.resizeTimeout = setTimeout(() => {
        const oldScaleFactor = this.scaleFactor;
        const oldGameBounds = { ...this.gameBounds };
        
        // Recalculate dimensions
        this.calculateDimensions();
        
        // Ensure camera stays centered after resize
        if (this.scene.cameras && this.scene.cameras.main) {
          this.scene.cameras.main.centerOn(0, 0);
        }
        
        // Notify components of scale change if significant
        const scaleChange = Math.abs(this.scaleFactor - oldScaleFactor) / oldScaleFactor;
        const boundsChanged = (
          Math.abs(this.gameBounds.width - oldGameBounds.width) > 10 ||
          Math.abs(this.gameBounds.height - oldGameBounds.height) > 10
        );
        
        if (scaleChange > 0.05 || boundsChanged) {
          this.notifyScaleChange();
        }
        
        this.resizeTimeout = null;
      }, 16); // ~60fps debounce
    }
    
    // Notify all game components of scale changes
    notifyScaleChange() {
      if (this.scene.events) {
        this.scene.events.emit('scale-changed', {
          scaleFactor: this.scaleFactor,
          responsiveScale: this.responsiveScale,
          gameBounds: this.gameBounds,
          elementSizes: this.elementSizes,
          fontSizes: this.fontSizes
        });
      }
    }
    
    // Get current scale information
    getScaleInfo() {
      return {
        scaleFactor: this.scaleFactor,
        responsiveScale: this.responsiveScale,
        isMobile: this.isMobile,
        isTablet: this.isTablet,
        pixelRatio: this.pixelRatio,
        densityScale: this.densityScale
      };
    }
    
    // Cleanup
    destroy() {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = null;
      }
    }
  }