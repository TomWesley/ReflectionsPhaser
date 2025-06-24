// GameScene.js - Main game scene with enhanced scaling and NYT styling
class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
      
      // Component references
      this.scalingManager = null;
      this.gameUI = null;
      this.gameArea = null;
      this.levelManager = null;
      this.gameState = null;
      
      // Resize debounce
      this.resizeTimeout = null;
    }
    
    init() {
      // Initialize scaling manager first
      this.scalingManager = new ScalingManager(this);
      
      // Initialize game state
      this.gameState = new GameStateManager(this);
    }
    
    create() {
      // Save this scene to localStorage
      if (window.SceneManager) {
        window.SceneManager.save('GameScene');
      }
      
      // Center the camera
      this.cameras.main.centerOn(0, 0);
      
      // Create components in order
      this.gameArea = new GameArea(this, this.scalingManager);
      this.gameUI = new GameUI(this, this.scalingManager);
      this.levelManager = new LevelManager(this, this.scalingManager, this.gameArea);
      
      // Set up level
      this.levelManager.setupLevel();
      
      // Set up resize handler with debouncing
      this.scale.on('resize', this.handleResize, this);
      
      // Set up collision handlers
      this.setupCollisions();
      
      // Store references for easier access
      this.mirrors = this.levelManager.mirrors;
      this.lasers = this.levelManager.lasers;
      this.spawners = this.levelManager.spawners;
      this.target = this.levelManager.target;
      
      // Store bounds for laser boundary checking
      this.updateBoundsReferences();
      
      // Add debug helper (press D to debug)
      this.input.keyboard.on('keydown-D', () => {
        console.log('=== Debug Info ===');
        console.log('Scale Factor:', this.scalingManager.scaleFactor);
        console.log('Responsive Scale:', this.scalingManager.responsiveScale);
        console.log('Game Bounds:', this.scalingManager.gameBounds);
        console.log('Element Sizes:', this.scalingManager.elementSizes);
        console.log('Mirrors:', this.mirrors.map((mirror, index) => ({
          index,
          position: { x: mirror.x, y: mirror.y },
          shapeType: mirror.shapeType,
          isLocked: mirror.isLocked
        })));
      });
      
      // Smooth fade in
      this.cameras.main.fadeIn(600, 250, 250, 250);
    }
    
    update(time, delta) {
      // Update game state
      this.gameState.update(delta);
      
      // Update UI timer
      if (this.gameState.isPlaying()) {
        this.gameUI.updateTimer(this.gameState.getGameTime());
      }
    }
    
    setupCollisions() {
      // Collision handling is managed in individual objects
      // This ensures clean separation of concerns
    }
    
    updateBoundsReferences() {
      // Store bounds for laser boundary checking
      const bounds = this.scalingManager.gameBounds;
      this.leftBound = bounds.left;
      this.rightBound = bounds.right;
      this.topBound = bounds.top;
      this.bottomBound = bounds.bottom;
      
      // Store placement constraints
      this.placementConstraints = this.scalingManager.placementConstraints;
    }
    
    startGame() {
      if (!this.gameState.startGame()) return;
      
      // Hide UI elements with smooth animations
      this.gameUI.hideStartButton();
      this.gameUI.hideInstructions();
      this.gameUI.showTimer();
      
      // Hide placement boundary
      this.gameArea.hidePlacementBoundary();
      
      // Lock mirrors
      this.levelManager.lockMirrors();
      
      // Launch lasers with slight delay for better UX
      this.time.delayedCall(300, () => {
        this.levelManager.launchLasers();
        this.lasers = this.levelManager.lasers;
      });
    }
    
    onLaserHitTarget(laser) {
      if (!this.gameState.onLaserHitTarget()) return;
      
      console.log('Target hit! Time:', this.gameState.getGameTime().toFixed(3));
      
      // Enhanced visual feedback
      this.target.onHit();
      
      // Add screen flash effect
      this.addSuccessEffect();
      
      // Complete game with delay for effects
      this.time.delayedCall(500, () => {
        this.gameComplete();
      });
    }
    
    addSuccessEffect() {
      // Subtle screen flash
      const flash = this.add.rectangle(0, 0, this.scalingManager.screenWidth * 2, this.scalingManager.screenHeight * 2, 0x4ade80, 0.15);
      flash.setDepth(100);
      
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 400,
        ease: 'Cubic.out',
        onComplete: () => flash.destroy()
      });
    }
    
    gameComplete() {
      // Stop lasers
      this.levelManager.stopLasers();
      
      // Reduce target opacity
      if (this.target) {
        this.target.setAlpha(0.4);
      }
      
      // Get stats
      const gameTime = this.gameState.getGameTime();
      const totalReflections = this.levelManager.getTotalReflections();
      
      // Show completion panel with delay
      this.time.delayedCall(200, () => {
        this.gameUI.showCompletionPanel(gameTime, totalReflections);
      });
      
      // Create celebration effect
      this.createCelebrationEffect();
    }
    
    gameOver() {
      // Stop the game
      this.gameState.reset();
      
      // Stop lasers
      this.levelManager.stopLasers();
      
      // Reduce target opacity
      if (this.target) {
        this.target.setAlpha(0.4);
      }
      
      // Show game over panel
      this.gameUI.showGameOverPanel();
    }
    
    createCelebrationEffect() {
      // Clean, minimal celebration effect
      const bounds = this.scalingManager.gameBounds;
      const particleCount = this.scalingManager.isMobile ? 20 : 30;
      
      for (let i = 0; i < particleCount; i++) {
        const x = Phaser.Math.Between(bounds.left, bounds.right);
        const y = bounds.top - this.scalingManager.getSpacing('xl');
        
        const particle = this.add.circle(
          x, y, 
          this.scalingManager.getScaledValue(Phaser.Math.Between(2, 4)), 
          Phaser.Math.RND.pick([0x4ade80, 0x1a1a1a, 0x6c757d]), 
          0.8
        );
        particle.setDepth(50);
        
        // Animate particle falling
        this.tweens.add({
          targets: particle,
          y: bounds.bottom + this.scalingManager.getSpacing('xl'),
          rotation: Phaser.Math.Between(0, 360) * Math.PI / 180,
          alpha: { from: 0.8, to: 0 },
          duration: Phaser.Math.Between(2000, 4000),
          ease: 'Cubic.out',
          delay: Phaser.Math.Between(0, 1000),
          onComplete: () => particle.destroy()
        });
      }
    }
    
    restartGame() {
      // Reset game state
      this.gameState.reset();
      
      // Clean up current level
      this.levelManager.cleanup();
      
      // Hide panels
      this.gameUI.elements.completionPanel.setVisible(false);
      this.gameUI.elements.gameOverPanel.setVisible(false);
      
      // Show placement boundaries again
      this.gameArea.showPlacementBoundary();
      
      // Recreate level
      this.levelManager.setupLevel();
      
      // Update references
      this.mirrors = this.levelManager.mirrors;
      this.lasers = this.levelManager.lasers;
      this.spawners = this.levelManager.spawners;
      this.target = this.levelManager.target;
      
      // Show UI elements
      this.showStartUI();
    }
    
    showStartUI() {
      const ui = this.gameUI.elements;
      
      // Reset visibility
      ui.startButton.setVisible(true);
      ui.startText.setVisible(true);
      ui.homeButton.setVisible(true);
      ui.homeText.setVisible(true);
      ui.instructionsText.setVisible(true);
      
      // Reset positions
      const { uiPositions } = this.scalingManager;
      ui.startButton.y = uiPositions.footerY;
      ui.startText.y = uiPositions.footerY;
      ui.homeButton.y = uiPositions.footerY;
      ui.homeText.y = uiPositions.footerY;
      ui.instructionsText.y = uiPositions.headerY - this.scalingManager.getSpacing('lg');
      
      // Smooth fade in
      this.tweens.add({
        targets: [ui.startButton, ui.startText, ui.homeButton, ui.homeText, ui.instructionsText],
        alpha: { from: 0, to: 1 },
        y: `-=${this.scalingManager.getSpacing('sm')}`,
        duration: 400,
        ease: 'Cubic.out'
      });
      
      // Reset timer
      ui.timerText.setText('00:00.000');
      ui.timerText.setAlpha(0.7);
    }
    
    returnToMenu() {
      // Clear the saved scene when explicitly returning to menu
      if (window.SceneManager) {
        window.SceneManager.clear();
      }
      
      // Clean up
      this.cleanup();
      
      // Fade out and return to menu
      this.cameras.main.fadeOut(400, 250, 250, 250);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    }
    
    handleResize(gameSize, baseSize, displaySize, resolution) {
      // Major resizes are handled by page reload in main.js
      // Just handle minor adjustments here
      if (this.scalingManager) {
        this.scalingManager.handleResize();
        this.updateBoundsReferences();
      }
    }
    
    cleanup() {
      // Clean up all components
      if (this.levelManager) this.levelManager.cleanup();
      if (this.gameArea) this.gameArea.destroy();
      if (this.gameUI) this.gameUI.destroy();
      
      // Reset state
      if (this.gameState) this.gameState.reset();
      
      // Remove resize handler
      this.scale.off('resize', this.handleResize, this);
      
      // Clean up scaling manager
      if (this.scalingManager) {
        this.scalingManager.destroy();
      }
    }
  }