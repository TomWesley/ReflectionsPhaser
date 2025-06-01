// GameScene.js - Main game scene using component architecture
class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
      
      // Component references
      this.scalingManager = null;
      this.gameUI = null;
      this.gameArea = null;
      this.levelManager = null;
      this.gameState = null;
    }
    
    init() {
      // Initialize scaling manager
      this.scalingManager = new ScalingManager(this);
      
      // Initialize game state
      this.gameState = new GameStateManager(this);
    }
    
    create() {
      // Center the camera
      this.cameras.main.centerOn(0, 0);
      
      // Create components
      this.gameUI = new GameUI(this, this.scalingManager);
      this.gameArea = new GameArea(this, this.scalingManager);
      this.levelManager = new LevelManager(this, this.scalingManager, this.gameArea);
      
      // Set up level
      this.levelManager.setupLevel();
      
      // Set up resize handler
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
      
      // Add debug helper (press D to debug mirrors)
      this.input.keyboard.on('keydown-D', () => {
        console.log('=== Mirror Debug Info ===');
        this.mirrors.forEach((mirror, index) => {
          console.log(`Mirror ${index}:`, {
            position: { x: mirror.x, y: mirror.y },
            shapeType: mirror.shapeType,
            hasBody: !!mirror.body,
            hasGraphics: !!mirror.graphics,
            graphicsVisible: mirror.graphics ? mirror.graphics.visible : 'no graphics',
            isLocked: mirror.isLocked,
            fillAlpha: mirror.style.fillAlpha,
            strokeColor: mirror.style.strokeColor
          });
        });
      });
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
      // Already handled in Laser class, but we need to ensure
      // the scene methods are available
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
      
      // Hide UI elements
      this.gameUI.hideStartButton();
      this.gameUI.hideInstructions();
      this.gameUI.showTimer();
      
      // Hide placement boundary
      this.gameArea.hidePlacementBoundary();
      
      // Lock mirrors
      this.levelManager.lockMirrors();
      
      // Launch lasers
      this.levelManager.launchLasers();
      
      // Update laser references
      this.lasers = this.levelManager.lasers;
    }
    
    onLaserHitTarget(laser) {
      if (!this.gameState.onLaserHitTarget()) return;
      
      console.log('Target hit! Time:', this.gameState.getGameTime().toFixed(3));
      
      // Visual feedback
      this.target.onHit();
      
      // Complete game
      this.gameComplete();
    }
    
    gameComplete() {
      // Stop lasers
      this.levelManager.stopLasers();
      
      // Reduce target opacity
      if (this.target) {
        this.target.setAlpha(0.3);
      }
      
      // Get stats
      const gameTime = this.gameState.getGameTime();
      const totalReflections = this.levelManager.getTotalReflections();
      
      // Show completion panel
      this.gameUI.showCompletionPanel(gameTime, totalReflections);
      
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
        this.target.setAlpha(0.3);
      }
      
      // Show game over panel
      this.gameUI.showGameOverPanel();
    }
    
    createCelebrationEffect() {
      const bounds = this.scalingManager.gameBounds;
      const particles = this.add.particles('laser');
      
      const confetti = particles.createEmitter({
        x: { min: bounds.left, max: bounds.right },
        y: bounds.top - 50,
        speed: { min: 200, max: 300 },
        angle: { min: 80, max: 100 },
        scale: { start: 0.1, end: 0 },
        lifespan: 4000,
        blendMode: 'ADD',
        frequency: 50,
        tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]
      });
      
      this.time.delayedCall(3000, () => {
        confetti.stop();
        this.time.delayedCall(4000, () => {
          particles.destroy();
        });
      });
    }
    
    restartGame() {
      // Reset game state
      this.gameState.reset();
      
      // Clean up current level
      this.levelManager.cleanup();
      
      // Hide panels
      this.gameUI.elements.completionPanel.setVisible(false);
      this.gameUI.elements.gameOverPanel.setVisible(false);
      
      // Recreate game area visuals
      this.gameArea.handleResize();
      
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
      ui.instructionsText.y = uiPositions.headerY - this.scalingManager.getScaledValue(30);
      
      // Fade in
      this.tweens.add({
        targets: [ui.startButton, ui.startText, ui.homeButton, ui.homeText, ui.instructionsText],
        alpha: 1,
        duration: 600,
        ease: 'Back.out'
      });
      
      // Reset timer
      ui.timerText.setText('00:00.000');
      ui.timerText.setAlpha(0.7);
    }
    
    returnToMenu() {
      // Clean up
      this.cleanup();
      
      // Transition to menu
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    }
    
    handleResize(gameSize, baseSize, displaySize, resolution) {
      // Update scaling manager
      this.scalingManager.handleResize();
      
      // IMPORTANT: Re-center the camera after resize
      this.cameras.main.centerOn(0, 0);
      
      // Update bounds references
      this.updateBoundsReferences();
      
      // Update all components
      this.gameUI.handleResize();
      this.gameArea.handleResize();
      
      // Only update level manager if game hasn't started
      // This prevents spawners from moving during gameplay
      if (!this.gameState.isPlaying()) {
        this.levelManager.handleResize();
        
        // Update references
        this.mirrors = this.levelManager.mirrors;
        this.spawners = this.levelManager.spawners;
        this.target = this.levelManager.target;
      } else {
        // If game is playing, only update mirrors to ensure they stay within bounds
        // but don't recreate spawners
        this.levelManager.mirrors.forEach(mirror => {
          // Update mirror scale
          if (mirror.updateScale) {
            mirror.updateScale(this.scalingManager.scaleFactor);
          }
          
          // Verify position is still valid
          if (!this.levelManager.verifyMirrorPosition(mirror)) {
            const validPos = this.levelManager.findValidMirrorPosition(mirror);
            this.matter.body.setPosition(mirror.body, validPos);
            mirror.x = validPos.x;
            mirror.y = validPos.y;
            mirror.drawFromPhysics();
          }
        });
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
    }
  }