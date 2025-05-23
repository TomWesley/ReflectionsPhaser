class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
    }
    
    setupInput() {
      // The Mirror class now handles its own input
      // No need for any setup here
    }
    
    setupCollisions() {
      // Main collision handling is in the Laser class
    }
    
    startGame() {
      if (this.isGameStarted) return;
      
      this.isGameStarted = true;
      this.gameTime = 0;
      this.targetHit = false;
      this.totalReflections = 0; // For tracking total reflections
      
      // Hide start button with animation
      this.tweens.add({
        targets: [this.startButton, this.startText, this.homeButton, this.homeText],
        y: this.screenHeight + 100,
        alpha: 0,
        duration: 500,
        ease: 'Back.in',
        onComplete: () => {
          this.startButton.setVisible(false);
          this.startText.setVisible(false);
          this.homeButton.setVisible(false);
          this.homeText.setVisible(false);
        }
      });
      
      // Hide instructions with fade
      this.tweens.add({
        targets: this.instructionsText,
        alpha: 0,
        y: this.instructionsText.y - 30,
        duration: 400,
        ease: 'Power2.out',
        onComplete: () => {
          this.instructionsText.setVisible(false);
        }
      });
      
      // Show timer with animation
      this.tweens.add({
        targets: this.timerText,
        alpha: 1,
        y: this.timerText.y + 10,
        duration: 600,
        ease: 'Back.out'
      });
      
      // Hide placement boundary visual indicators
      if (this.placementBoundary) {
        this.placementBoundary.setVisible(false);
      }
      
      // Lock all mirrors
      this.mirrors.forEach(mirror => mirror.lock());
      
      // Launch lasers from each spawner
      this.lasers = [];
      this.spawners.forEach(spawner => {
        // Create laser at spawner position with spawner direction
        const laser = new Laser(this, spawner.position.x, spawner.position.y, spawner.direction);
        
        // Add to lasers array
        this.lasers.push(laser);
      });
      
      // Set time limit
      this.timeLimit = 60; // 60 seconds
      this.timeEvent = this.time.addEvent({
        delay: this.timeLimit * 1000,
        callback: this.gameOver,
        callbackScope: this
      });
    }
    
    onLaserHitTarget(laser) {
      if (!this.isGameStarted || this.targetHit) return;
      
      console.log('Laser hit target! Time:', this.gameTime.toFixed(3));
      
      // Mark target as hit
      this.targetHit = true;
      
      // Calculate total reflections from all lasers
      this.totalReflections = this.lasers.reduce((total, laser) => total + laser.reflectionCount, 0);
      
      // Call target's hit effect
      this.target.onHit();
      
      // Game complete!
      this.gameComplete();
    }
    
    gameComplete() {
      if (!this.isGameStarted || !this.targetHit) return;
      
      // Stop the game
      this.isGameStarted = false;
      
      // If there's a time event, remove it
      if (this.timeEvent) {
        this.timeEvent.remove();
      }
      
      // Stop all lasers (freeze them in place)
      this.lasers.forEach(laser => {
        if (laser.body) {
          this.matter.body.setStatic(laser.body, true);
        }
      });
      
      // Optionally reduce target opacity when showing the completion panel
      if (this.target) {
        this.tweens.add({
          targets: this.target.graphics,
          alpha: 0.3,
          duration: 300
        });
        
        if (this.target.pulseContainer) {
          this.tweens.add({
            targets: this.target.pulseContainer,
            alpha: 0.3,
            duration: 300
          });
        }
      }
      
      console.log('Game completed! Showing completion panel.');
      
      // Update and show completion panel
      this.finalScoreText.setText(`${this.gameTime.toFixed(3)}s`);
      this.reflectionsText.setText(`${this.totalReflections} reflections`);
      this.gameCompletionPanel.setVisible(true);
      
      // Animate panel in with a bounce effect
      this.tweens.add({
        targets: this.gameCompletionPanel,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.8, to: 1 },
        duration: 600,
        ease: 'Back.out'
      });
      
      // Add celebration particles
      this.createCelebrationEffect();
    }
    
    createCelebrationEffect() {
      // Add particle effects for celebration
      const particles = this.add.particles('laser');
      
      // Confetti effect
      const confetti = particles.createEmitter({
        x: { min: this.leftBound, max: this.rightBound },
        y: this.topBound - 50,
        speed: { min: 200, max: 300 },
        angle: { min: 80, max: 100 },
        scale: { start: 0.1, end: 0 },
        lifespan: 4000,
        blendMode: 'ADD',
        frequency: 50,
        tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]
      });
      
      // Stop after 3 seconds
      this.time.delayedCall(3000, () => {
        confetti.stop();
        // Clean up particles after they're done
        this.time.delayedCall(4000, () => {
          particles.destroy();
        });
      });
    }
    
    gameOver() {
      if (!this.isGameStarted || this.targetHit) return;
      
      // Stop the game
      this.isGameStarted = false;
      
      // Stop all lasers
      this.lasers.forEach(laser => {
        if (laser.body) {
          this.matter.body.setStatic(laser.body, true);
        }
      });
      
      // Optionally reduce target opacity when showing the game over panel
      if (this.target) {
        this.tweens.add({
          targets: this.target.graphics,
          alpha: 0.3,
          duration: 300
        });
        
        if (this.target.pulseContainer) {
          this.tweens.add({
            targets: this.target.pulseContainer,
            alpha: 0.3,
            duration: 300
          });
        }
      }
      
      // Show game over panel with animation
      this.gameOverPanel.setVisible(true);
      this.gameOverPanel.alpha = 0;
      
      // Animate panel in
      this.tweens.add({
        targets: this.gameOverPanel,
        alpha: 1,
        duration: 500,
        ease: 'Cubic.out'
      });
    }
    
    restartGame() {
      // Clean up current game elements
      this.cleanupGame();
      
      // Hide UI panels
      this.gameCompletionPanel.setVisible(false);
      this.gameOverPanel.setVisible(false);
      
      // Reset game state
      this.init();
      
      // Create new level elements
      this.createBoundaries();
      this.createTarget();
      this.setupLevel();
      
      // Show start button and instructions with animation
      this.startButton.setVisible(true);
      this.startText.setVisible(true);
      this.homeButton.setVisible(true);
      this.homeText.setVisible(true);
      this.instructionsText.setVisible(true);
      
      // Animate them back to their proper positions
      this.startButton.y = this.footerY + 5;
      this.startText.y = this.footerY + 5;
      this.homeButton.y = this.footerY + 5;
      this.homeText.y = this.footerY + 5;
      this.instructionsText.y = this.headerY - 40;
      
      this.tweens.add({
        targets: [this.startButton, this.startText, this.homeButton, this.homeText, this.instructionsText],
        alpha: 1,
        duration: 600,
        ease: 'Back.out'
      });
      
      // Reset timer display
      this.timerText.setText('00:00.000');
      this.timerText.setAlpha(0.7);
    }
    
    cleanupGame() {
      // Clean up lasers
      this.lasers.forEach(laser => laser.destroy());
      this.lasers = [];
      
      // Clean up mirrors
      this.mirrors.forEach(mirror => mirror.destroy());
      this.mirrors = [];
      
      // Clean up spawners
      this.spawners.forEach(spawner => spawner.destroy());
      this.spawners = [];
      
      // Clean up target
      if (this.target) {
        this.target.destroy();
        this.target = null;
      }
      
      // Clean up placement boundary
      if (this.placementBoundary) {
        this.placementBoundary.clear();
        this.placementBoundary.destroy();
        this.placementBoundary = null;
      }
      
      // Remove physics bodies
      if (this.matter.world) {
        if (this.topWall) this.matter.world.remove(this.topWall);
        if (this.bottomWall) this.matter.world.remove(this.bottomWall);
        if (this.leftWall) this.matter.world.remove(this.leftWall);
        if (this.rightWall) this.matter.world.remove(this.rightWall);
      }
      
      // Remove game area visual
      if (this.gameAreaBg) this.gameAreaBg.destroy();
      if (this.gameAreaGlow) this.gameAreaGlow.destroy();
      
      // Clear any running timers
      if (this.timeEvent) this.timeEvent.remove();
    }
    
    submitScore() {
      // Prompt for player name
      const playerName = prompt("Enter your name for the leaderboard:", "");
      
      if (playerName !== null && playerName.trim() !== '') {
        // Show loading message
        const loadingText = this.add.text(0, 0, 'Submitting score...', {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#ffffff'
        }).setOrigin(0.5);
        
        try {
          // Submit score to Firebase
          if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            signInAnonymously()
              .then(() => {
                return submitScoreToLeaderboard(playerName, this.gameTime);
              })
              .then(() => {
                loadingText.setText('Score submitted successfully!');
                
                // Show leaderboard after a short delay
                this.time.delayedCall(1000, () => {
                  loadingText.destroy();
                  this.scene.start('LeaderboardScene');
                });
              })
              .catch(error => {
                console.error("Error submitting score:", error);
                loadingText.setText('Error submitting score. Please try again.');
                
                // Remove error message after a delay
                this.time.delayedCall(2000, () => {
                  loadingText.destroy();
                });
              });
          } else {
            // Firebase not available
            loadingText.setText('Leaderboard service not available.');
            this.time.delayedCall(2000, () => loadingText.destroy());
          }
        } catch (error) {
          console.error("Error with Firebase:", error);
          loadingText.setText('Leaderboard service not available.');
          this.time.delayedCall(2000, () => loadingText.destroy());
        }
      }
    }
    
    returnToMenu() {
      // Clean up current game
      this.cleanupGame();
      
      // Go to menu scene with fade transition
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    }
    
    init() {
      // Game state
      this.isGameStarted = false;
      this.gameTime = 0;
      this.targetHit = false; // Win condition
      
      // Object collections
      this.lasers = [];
      this.mirrors = [];
      this.spawners = [];
      
      // Get actual screen dimensions
      this.screenWidth = this.cameras.main.width;
      this.screenHeight = this.cameras.main.height;
      
      // Calculate responsive layout dimensions
      this.calculateLayout();
    }
    
    calculateLayout() {
      // Define UI space requirements (as proportions of screen size)
      const headerHeightRatio = 0.15; // 15% of screen for header
      const footerHeightRatio = 0.15; // 15% of screen for footer
      const sideMarginRatio = 0.05;   // 5% margin on each side
      
      // Calculate actual UI dimensions
      this.headerHeight = this.screenHeight * headerHeightRatio;
      this.footerHeight = this.screenHeight * footerHeightRatio;
      this.sideMargin = this.screenWidth * sideMarginRatio;
      
      // Calculate available game area
      this.gameAreaWidth = this.screenWidth - (this.sideMargin * 2);
      this.gameAreaHeight = this.screenHeight - this.headerHeight - this.footerHeight;
      
      // Use the smaller dimension to maintain square aspect ratio
      this.gameSize = Math.min(this.gameAreaWidth, this.gameAreaHeight);
      
      // Calculate game boundaries (centered in available area)
      const gameMargin = this.gameSize * 0.08; // 8% internal margin for spawners
      this.leftBound = -this.gameSize / 2 + gameMargin;
      this.rightBound = this.gameSize / 2 - gameMargin;
      this.topBound = -this.gameSize / 2 + gameMargin;
      this.bottomBound = this.gameSize / 2 - gameMargin;
      
      // Calculate UI positions (in screen coordinates, not game coordinates)
      this.headerY = -this.screenHeight / 2 + this.headerHeight / 2;
      this.footerY = this.screenHeight / 2 - this.footerHeight / 2;
      
      // Scale factor for responsive elements
      this.scaleFactor = this.gameSize / 800; // Assuming 800px as base size
    }
    
    create() {
      // Center the coordinates (0,0) in the middle of the screen
      this.cameras.main.centerOn(0, 0);
      
      // Set up resize handler
      this.scale.on('resize', this.handleResize, this);
      
      // Create game UI
      this.createUI();
      
      // Create game boundaries
      this.createBoundaries();
      
      // Create central target
      this.createTarget();
      
      // Setup level
      this.setupLevel();
      
      // Setup input handlers
      this.setupInput();
      
      // Setup collision handlers
      this.setupCollisions();
    }
    
    handleResize(gameSize, baseSize, displaySize, resolution) {
      // Update screen dimensions
      this.screenWidth = this.cameras.main.width;
      this.screenHeight = this.cameras.main.height;
      
      // Recalculate layout
      this.calculateLayout();
      
      // Re-center the camera
      this.cameras.main.centerOn(0, 0);
      
      // Update all visual elements
      this.updateUIPositions();
      this.updateGameArea();
      this.updateMirrorConstraints();
    }
    
    updateUIPositions() {
      if (!this.headerBg) return; // Not created yet
      
      // Responsive font sizes
      const titleFontSize = Math.max(16, 32 * this.scaleFactor);
      const textFontSize = Math.max(14, 20 * this.scaleFactor);
      const buttonFontSize = Math.max(16, 24 * this.scaleFactor);
      const timerFontSize = Math.max(18, 32 * this.scaleFactor);
      
      // Update header background
      this.headerBg.clear();
      this.headerBg.fillStyle(0x1a1a2e, 0.95);
      this.headerBg.fillRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.headerY - this.headerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.headerHeight, 
        20 * this.scaleFactor
      );
      this.headerBg.lineStyle(2 * this.scaleFactor, 0x16213e, 0.8);
      this.headerBg.strokeRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.headerY - this.headerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.headerHeight, 
        20 * this.scaleFactor
      );
      
      // Update timer position and style
      this.timerText.setPosition(0, this.headerY);
      this.timerText.setFontSize(timerFontSize);
      this.timerText.setStroke('#000000', 2 * this.scaleFactor);
      
      // Update instructions position and style
      this.instructionsText.setPosition(0, this.headerY - 25 * this.scaleFactor);
      this.instructionsText.setFontSize(textFontSize);
      this.instructionsText.setStroke('#000000', 1 * this.scaleFactor);
      
      // Update footer background
      this.footerBg.clear();
      this.footerBg.fillStyle(0x1a1a2e, 0.95);
      this.footerBg.fillRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.footerY - this.footerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.footerHeight, 
        20 * this.scaleFactor
      );
      this.footerBg.lineStyle(2 * this.scaleFactor, 0x16213e, 0.8);
      this.footerBg.strokeRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.footerY - this.footerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.footerHeight, 
        20 * this.scaleFactor
      );
      
      // Responsive button dimensions
      const buttonWidth = 200 * this.scaleFactor;
      const buttonHeight = 50 * this.scaleFactor;
      const homeButtonWidth = 120 * this.scaleFactor;
      const borderRadius = 25 * this.scaleFactor;
      
      // Update start button
      this.startButton.setPosition(0, this.footerY);
      this.startButton.setSize(buttonWidth, buttonHeight);
      this.startText.setPosition(0, this.footerY);
      this.startText.setFontSize(buttonFontSize);
      this.startText.setStroke('#000000', 2 * this.scaleFactor);
      
      // Update start button background
      this.startButtonBg.clear();
      this.startButtonBg.fillGradientStyle(0x4facfe, 0x4facfe, 0x00c9ff, 0x00c9ff, 1);
      this.startButtonBg.fillRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
      this.startButtonBg.lineStyle(3 * this.scaleFactor, 0x0099cc, 1);
      this.startButtonBg.strokeRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
      
      // Update home button position
      const homeButtonX = -this.screenWidth / 2 + this.sideMargin + homeButtonWidth/2;
      this.homeButton.setPosition(homeButtonX, this.footerY);
      this.homeButton.setSize(homeButtonWidth, buttonHeight - 10);
      this.homeText.setPosition(homeButtonX, this.footerY);
      this.homeText.setFontSize(Math.max(14, 18 * this.scaleFactor));
      this.homeText.setStroke('#000000', 1 * this.scaleFactor);
      
      // Update home button background
      this.homeButtonBg.clear();
      this.homeButtonBg.fillStyle(0x2c3e50, 0.9);
      this.homeButtonBg.fillRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
      this.homeButtonBg.lineStyle(2 * this.scaleFactor, 0x34495e, 1);
      this.homeButtonBg.strokeRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
    }
    
    updateGameArea() {
      if (!this.gameAreaBg) return; // Not created yet
      
      // Update game area background
      this.gameAreaBg.clear();
      this.gameAreaBg.fillGradientStyle(0x0f1419, 0x0f1419, 0x1a1a2e, 0x1a1a2e, 1);
      this.gameAreaBg.fillRoundedRect(
        this.leftBound - 10 * this.scaleFactor, 
        this.topBound - 10 * this.scaleFactor, 
        (this.rightBound - this.leftBound) + 20 * this.scaleFactor, 
        (this.bottomBound - this.topBound) + 20 * this.scaleFactor, 
        15 * this.scaleFactor
      );
      this.gameAreaBg.lineStyle(3 * this.scaleFactor, 0x4facfe, 0.6);
      this.gameAreaBg.strokeRoundedRect(
        this.leftBound - 10 * this.scaleFactor, 
        this.topBound - 10 * this.scaleFactor, 
        (this.rightBound - this.leftBound) + 20 * this.scaleFactor, 
        (this.bottomBound - this.topBound) + 20 * this.scaleFactor, 
        15 * this.scaleFactor
      );
      
      // Update game area glow
      this.gameAreaGlow.clear();
      this.gameAreaGlow.fillStyle(0x4facfe, 0.1);
      this.gameAreaGlow.fillRoundedRect(
        this.leftBound - 15 * this.scaleFactor, 
        this.topBound - 15 * this.scaleFactor, 
        (this.rightBound - this.leftBound) + 30 * this.scaleFactor, 
        (this.bottomBound - this.topBound) + 30 * this.scaleFactor, 
        20 * this.scaleFactor
      );
      
      // Update placement boundary if it exists
      if (this.placementBoundary && this.placementBoundary.visible) {
        this.updatePlacementBoundary();
      }
    }
    
    updatePlacementBoundary() {
      if (!this.placementBoundary) return;
      
      // Define the no-go zone sizes (scaled)
      const targetSafeRadius = 120 * this.scaleFactor;
      const wallSafeMargin = 40 * this.scaleFactor;
      
      // Clear and redraw placement boundary
      this.placementBoundary.clear();
      this.placementBoundary.fillStyle(0xFF6B6B, 0.2);
      this.placementBoundary.lineStyle(2 * this.scaleFactor, 0xFF4757, 0.4);
      
      // Draw target no-go zone (circle around center)
      this.placementBoundary.fillCircle(0, 0, targetSafeRadius);
      this.placementBoundary.strokeCircle(0, 0, targetSafeRadius);
      
      // Draw wall no-go zones
      this.placementBoundary.fillRect(this.leftBound, this.topBound, this.rightBound - this.leftBound, wallSafeMargin);
      this.placementBoundary.fillRect(this.leftBound, this.bottomBound - wallSafeMargin, this.rightBound - this.leftBound, wallSafeMargin);
      this.placementBoundary.fillRect(this.leftBound, this.topBound + wallSafeMargin, wallSafeMargin, this.bottomBound - this.topBound - (2 * wallSafeMargin));
      this.placementBoundary.fillRect(this.rightBound - wallSafeMargin, this.topBound + wallSafeMargin, wallSafeMargin, this.bottomBound - this.topBound - (2 * wallSafeMargin));
      
      // Update constraints
      this.placementConstraints = {
        targetSafeRadius: targetSafeRadius,
        wallSafeMargin: wallSafeMargin
      };
    }
    
    updateMirrorConstraints() {
      // Update physics boundaries if they exist
      if (this.topWall) {
        const wallThickness = 5 * this.scaleFactor;
        
        // Remove old walls
        this.matter.world.remove([this.topWall, this.bottomWall, this.leftWall, this.rightWall]);
        
        // Create new walls with updated dimensions
        this.topWall = this.matter.add.rectangle(0, this.topBound - wallThickness/2, this.gameSize, wallThickness, {
          isStatic: true, label: 'boundary', restitution: 1,
          collisionFilter: { category: 0x0008, mask: 0x0001 }
        });
        
        this.bottomWall = this.matter.add.rectangle(0, this.bottomBound + wallThickness/2, this.gameSize, wallThickness, {
          isStatic: true, label: 'boundary', restitution: 1,
          collisionFilter: { category: 0x0008, mask: 0x0001 }
        });
        
        this.leftWall = this.matter.add.rectangle(this.leftBound - wallThickness/2, 0, wallThickness, this.gameSize, {
          isStatic: true, label: 'boundary', restitution: 1,
          collisionFilter: { category: 0x0008, mask: 0x0001 }
        });
        
        this.rightWall = this.matter.add.rectangle(this.rightBound + wallThickness/2, 0, wallThickness, this.gameSize, {
          isStatic: true, label: 'boundary', restitution: 1,
          collisionFilter: { category: 0x0008, mask: 0x0001 }
        });
      }
    }
    
    update(time, delta) {
      // Update game timer if game has started
      if (this.isGameStarted && !this.targetHit) {
        this.gameTime += delta / 1000; // Convert ms to seconds
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = (this.gameTime % 60).toFixed(3);
        this.timerText.setText(`${minutes.toString().padStart(2, '0')}:${seconds.padStart(6, '0')}`);
      }
    }
    
    createUI() {
      const centerX = 0;
      
      // Responsive font sizes
      const titleFontSize = Math.max(16, 32 * this.scaleFactor);
      const textFontSize = Math.max(14, 20 * this.scaleFactor);
      const buttonFontSize = Math.max(16, 24 * this.scaleFactor);
      const timerFontSize = Math.max(18, 32 * this.scaleFactor);
      
      // Create header background
      this.headerBg = this.add.graphics();
      this.headerBg.fillStyle(0x1a1a2e, 0.95);
      this.headerBg.fillRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.headerY - this.headerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.headerHeight, 
        20 * this.scaleFactor
      );
      this.headerBg.lineStyle(2 * this.scaleFactor, 0x16213e, 0.8);
      this.headerBg.strokeRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.headerY - this.headerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.headerHeight, 
        20 * this.scaleFactor
      );
      
      // Modern timer with monospace font and styling
      this.timerText = this.add.text(centerX, this.headerY, '00:00.000', {
        fontFamily: 'Courier New, monospace',
        fontSize: `${timerFontSize}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2 * this.scaleFactor,
        shadow: {
          offsetX: 2 * this.scaleFactor,
          offsetY: 2 * this.scaleFactor,
          color: '#000000',
          blur: 4 * this.scaleFactor,
          stroke: true,
          fill: true
        }
      }).setOrigin(0.5).setAlpha(0.7);
      
      // Instructions text with modern styling
      this.instructionsText = this.add.text(centerX, this.headerY - 25 * this.scaleFactor, 'Position mirrors to reflect the laser into the target', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${textFontSize}px`,
        color: '#e0e0e0',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 1 * this.scaleFactor,
        shadow: {
          offsetX: 1 * this.scaleFactor,
          offsetY: 1 * this.scaleFactor,
          color: '#000000',
          blur: 2 * this.scaleFactor,
          stroke: true,
          fill: true
        }
      }).setOrigin(0.5);
      
      // Create footer background
      this.footerBg = this.add.graphics();
      this.footerBg.fillStyle(0x1a1a2e, 0.95);
      this.footerBg.fillRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.footerY - this.footerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.footerHeight, 
        20 * this.scaleFactor
      );
      this.footerBg.lineStyle(2 * this.scaleFactor, 0x16213e, 0.8);
      this.footerBg.strokeRoundedRect(
        -this.screenWidth / 2 + this.sideMargin, 
        this.footerY - this.footerHeight / 2, 
        this.screenWidth - (this.sideMargin * 2), 
        this.footerHeight, 
        20 * this.scaleFactor
      );
      
      // Responsive button dimensions
      const buttonWidth = 200 * this.scaleFactor;
      const buttonHeight = 50 * this.scaleFactor;
      const homeButtonWidth = 120 * this.scaleFactor;
      const borderRadius = 25 * this.scaleFactor;
      
      // Modern start button with gradient effect
      this.startButtonBg = this.add.graphics();
      this.startButtonBg.fillGradientStyle(0x4facfe, 0x4facfe, 0x00c9ff, 0x00c9ff, 1);
      this.startButtonBg.fillRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
      this.startButtonBg.lineStyle(3 * this.scaleFactor, 0x0099cc, 1);
      this.startButtonBg.strokeRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
      
      this.startButton = this.add.rectangle(centerX, this.footerY, buttonWidth, buttonHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.startGame();
          // Button press animation
          this.tweens.add({
            targets: [this.startButtonBg, this.startText],
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 100,
            yoyo: true,
            ease: 'Power2.out'
          });
        })
        .on('pointerover', () => {
          this.startButtonBg.clear();
          this.startButtonBg.fillGradientStyle(0x5fbdff, 0x5fbdff, 0x22d4ff, 0x22d4ff, 1);
          this.startButtonBg.fillRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
          this.startButtonBg.lineStyle(3 * this.scaleFactor, 0x00aadd, 1);
          this.startButtonBg.strokeRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
          
          this.tweens.add({
            targets: [this.startButtonBg, this.startText],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 200,
            ease: 'Power2.out'
          });
        })
        .on('pointerout', () => {
          this.startButtonBg.clear();
          this.startButtonBg.fillGradientStyle(0x4facfe, 0x4facfe, 0x00c9ff, 0x00c9ff, 1);
          this.startButtonBg.fillRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
          this.startButtonBg.lineStyle(3 * this.scaleFactor, 0x0099cc, 1);
          this.startButtonBg.strokeRoundedRect(-buttonWidth/2, this.footerY - buttonHeight/2, buttonWidth, buttonHeight, borderRadius);
          
          this.tweens.add({
            targets: [this.startButtonBg, this.startText],
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Power2.out'
          });
        });
      
      this.startText = this.add.text(centerX, this.footerY, 'START GAME', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${buttonFontSize}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2 * this.scaleFactor,
        shadow: {
          offsetX: 2 * this.scaleFactor,
          offsetY: 2 * this.scaleFactor,
          color: '#000000',
          blur: 4 * this.scaleFactor,
          stroke: true,
          fill: true
        }
      }).setOrigin(0.5);
      
      // Modern home button with subtle styling
      const homeButtonX = -this.screenWidth / 2 + this.sideMargin + homeButtonWidth/2;
      
      this.homeButtonBg = this.add.graphics();
      this.homeButtonBg.fillStyle(0x2c3e50, 0.9);
      this.homeButtonBg.fillRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
      this.homeButtonBg.lineStyle(2 * this.scaleFactor, 0x34495e, 1);
      this.homeButtonBg.strokeRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
      
      this.homeButton = this.add.rectangle(homeButtonX, this.footerY, homeButtonWidth, buttonHeight - 10, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.returnToMenu();
          // Button press animation
          this.tweens.add({
            targets: [this.homeButtonBg, this.homeText],
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 100,
            yoyo: true,
            ease: 'Power2.out'
          });
        })
        .on('pointerover', () => {
          this.homeButtonBg.clear();
          this.homeButtonBg.fillStyle(0x34495e, 0.9);
          this.homeButtonBg.fillRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
          this.homeButtonBg.lineStyle(2 * this.scaleFactor, 0x4a6278, 1);
          this.homeButtonBg.strokeRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
          
          this.tweens.add({
            targets: [this.homeButtonBg, this.homeText],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 200,
            ease: 'Power2.out'
          });
        })
        .on('pointerout', () => {
          this.homeButtonBg.clear();
          this.homeButtonBg.fillStyle(0x2c3e50, 0.9);
          this.homeButtonBg.fillRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
          this.homeButtonBg.lineStyle(2 * this.scaleFactor, 0x34495e, 1);
          this.homeButtonBg.strokeRoundedRect(homeButtonX - homeButtonWidth/2, this.footerY - buttonHeight/2 + 5, homeButtonWidth, buttonHeight - 10, 20 * this.scaleFactor);
          
          this.tweens.add({
            targets: [this.homeButtonBg, this.homeText],
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Power2.out'
          });
        });
      
      this.homeText = this.add.text(homeButtonX, this.footerY, 'MENU', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(14, 18 * this.scaleFactor)}px`,
        fontStyle: 'bold',
        color: '#ecf0f1',
        stroke: '#000000',
        strokeThickness: 1 * this.scaleFactor
      }).setOrigin(0.5);
      
      // Add subtle pulsing animation to the start button
      this.tweens.add({
        targets: [this.startButtonBg, this.startText],
        alpha: 0.9,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      // Create game completion panel (hidden initially)
      this.createCompletionPanel();
      
      // Create game over panel (hidden initially)
      this.createGameOverPanel();
    }
    
    createCompletionPanel() {
      // Create a container to hold all elements
      this.gameCompletionPanel = this.add.container(0, 0).setVisible(false);
      
      // Set a high depth to ensure it appears on top of everything
      this.gameCompletionPanel.setDepth(1000);
      
      // Responsive panel dimensions
      const panelWidth = Math.min(500 * this.scaleFactor, this.screenWidth * 0.9);
      const panelHeight = Math.min(400 * this.scaleFactor, this.screenHeight * 0.8);
      
      // Semitransparent background that covers the entire screen
      const fullScreenBg = this.add.rectangle(
        0, 0, 
        this.screenWidth * 2, 
        this.screenHeight * 2, 
        0x000000, 0.8
      );
      
      // Modern panel with gradient background
      const panelBg = this.add.graphics();
      panelBg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
      panelBg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 30 * this.scaleFactor);
      panelBg.lineStyle(4 * this.scaleFactor, 0x4facfe, 1);
      panelBg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 30 * this.scaleFactor);
      
      // Add subtle glow effect
      const glow = this.add.graphics();
      glow.fillStyle(0x4facfe, 0.2);
      glow.fillRoundedRect(-panelWidth/2 - 10, -panelHeight/2 - 10, panelWidth + 20, panelHeight + 20, 35 * this.scaleFactor);
      
      // Responsive font sizes for modal
      const titleFontSize = Math.max(24, 48 * this.scaleFactor);
      const textFontSize = Math.max(18, 28 * this.scaleFactor);
      const scoreFontSize = Math.max(24, 42 * this.scaleFactor);
      const buttonFontSize = Math.max(16, 20 * this.scaleFactor);
      
      // Success text with modern styling
      const completeText = this.add.text(0, -panelHeight/2 + 60 * this.scaleFactor, '🎯 TARGET HIT!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleFontSize}px`,
        fontStyle: 'bold',
        color: '#4facfe',
        stroke: '#000000',
        strokeThickness: 4 * this.scaleFactor,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#4facfe',
          blur: 20 * this.scaleFactor,
          stroke: false,
          fill: true
        }
      }).setOrigin(0.5);
      
      // Congratulatory message
      const congratsText = this.add.text(0, -panelHeight/2 + 120 * this.scaleFactor, 'Excellent work!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${textFontSize}px`,
        color: '#ecf0f1'
      }).setOrigin(0.5);
      
      // Score displays
      const scoreLabel = this.add.text(0, -30 * this.scaleFactor, 'YOUR TIME', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(12, 16 * this.scaleFactor)}px`,
        color: '#95a5a6',
        letterSpacing: 2
      }).setOrigin(0.5);
      
      this.finalScoreText = this.add.text(0, 0, '0.000s', {
        fontFamily: 'Courier New, monospace',
        fontSize: `${scoreFontSize}px`,
        fontStyle: 'bold',
        color: '#f39c12',
        stroke: '#000000',
        strokeThickness: 2 * this.scaleFactor
      }).setOrigin(0.5);
      
      const reflectionsLabel = this.add.text(0, 40 * this.scaleFactor, 'REFLECTIONS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(12, 16 * this.scaleFactor)}px`,
        color: '#95a5a6',
        letterSpacing: 2
      }).setOrigin(0.5);
      
      this.reflectionsText = this.add.text(0, 65 * this.scaleFactor, '0 reflections', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(16, 24 * this.scaleFactor)}px`,
        color: '#ecf0f1'
      }).setOrigin(0.5);
      
      // Responsive button dimensions
      const modalButtonWidth = Math.min(250 * this.scaleFactor, panelWidth * 0.8);
      const modalButtonHeight = 50 * this.scaleFactor;
      
      // Modern buttons
      const playAgainBg = this.add.graphics();
      playAgainBg.fillGradientStyle(0x27ae60, 0x27ae60, 0x2ecc71, 0x2ecc71, 1);
      playAgainBg.fillRoundedRect(-modalButtonWidth/2, panelHeight/2 - 150 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      playAgainBg.lineStyle(2 * this.scaleFactor, 0x1e8449, 1);
      playAgainBg.strokeRoundedRect(-modalButtonWidth/2, panelHeight/2 - 150 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      
      const playAgainButton = this.add.rectangle(0, panelHeight/2 - 125 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.restartGame());
      
      const playAgainText = this.add.text(0, panelHeight/2 - 125 * this.scaleFactor, 'PLAY AGAIN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${buttonFontSize}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 1 * this.scaleFactor
      }).setOrigin(0.5);
      
      const menuBg = this.add.graphics();
      menuBg.fillStyle(0x34495e, 0.9);
      menuBg.fillRoundedRect(-modalButtonWidth/2, panelHeight/2 - 90 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      menuBg.lineStyle(2 * this.scaleFactor, 0x2c3e50, 1);
      menuBg.strokeRoundedRect(-modalButtonWidth/2, panelHeight/2 - 90 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      
      const menuButton = this.add.rectangle(0, panelHeight/2 - 65 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.returnToMenu());
      
      const menuText = this.add.text(0, panelHeight/2 - 65 * this.scaleFactor, 'MAIN MENU', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${buttonFontSize}px`,
        fontStyle: 'bold',
        color: '#ecf0f1',
        stroke: '#000000',
        strokeThickness: 1 * this.scaleFactor
      }).setOrigin(0.5);
      
      // Add everything to the container
      this.gameCompletionPanel.add([
        fullScreenBg,
        glow,
        panelBg, 
        completeText, 
        congratsText,
        scoreLabel,
        this.finalScoreText,
        reflectionsLabel,
        this.reflectionsText,
        playAgainBg,
        playAgainButton, 
        playAgainText,
        menuBg,
        menuButton,
        menuText
      ]);
    }
    
    createGameOverPanel() {
      this.gameOverPanel = this.add.container(0, 0).setVisible(false);
      
      // Set a high depth to ensure it appears on top of everything
      this.gameOverPanel.setDepth(1000);
      
      // Responsive panel dimensions
      const panelWidth = Math.min(500 * this.scaleFactor, this.screenWidth * 0.9);
      const panelHeight = Math.min(400 * this.scaleFactor, this.screenHeight * 0.8);
      
      // Semitransparent background
      const fullScreenBg = this.add.rectangle(
        0, 0, 
        this.screenWidth * 2, 
        this.screenHeight * 2, 
        0x000000, 0.8
      );
      
      // Modern panel with gradient background
      const panelBg = this.add.graphics();
      panelBg.fillGradientStyle(0x2c1810, 0x2c1810, 0x3e2723, 0x3e2723, 1);
      panelBg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 30 * this.scaleFactor);
      panelBg.lineStyle(4 * this.scaleFactor, 0xe74c3c, 1);
      panelBg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 30 * this.scaleFactor);
      
      // Add subtle glow effect
      const glow = this.add.graphics();
      glow.fillStyle(0xe74c3c, 0.2);
      glow.fillRoundedRect(-panelWidth/2 - 10, -panelHeight/2 - 10, panelWidth + 20, panelHeight + 20, 35 * this.scaleFactor);
      
      // Responsive font sizes
      const titleFontSize = Math.max(24, 48 * this.scaleFactor);
      const textFontSize = Math.max(16, 22 * this.scaleFactor);
      const hintFontSize = Math.max(14, 18 * this.scaleFactor);
      const buttonFontSize = Math.max(16, 20 * this.scaleFactor);
      
      const gameOverText = this.add.text(0, -panelHeight/2 + 60 * this.scaleFactor, '⏰ TIME\'S UP!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleFontSize}px`,
        fontStyle: 'bold',
        color: '#e74c3c',
        stroke: '#000000',
        strokeThickness: 4 * this.scaleFactor,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#e74c3c',
          blur: 20 * this.scaleFactor,
          stroke: false,
          fill: true
        }
      }).setOrigin(0.5);
      
      const messageText = this.add.text(0, -panelHeight/2 + 120 * this.scaleFactor, 'The laser didn\'t reach the target in time!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${textFontSize}px`,
        color: '#ecf0f1',
        align: 'center'
      }).setOrigin(0.5);
      
      const hintText = this.add.text(0, -30 * this.scaleFactor, 'Try repositioning the mirrors\nfor a clearer path to the target.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${hintFontSize}px`,
        color: '#bdc3c7',
        align: 'center'
      }).setOrigin(0.5);
      
      // Responsive button dimensions
      const modalButtonWidth = Math.min(250 * this.scaleFactor, panelWidth * 0.8);
      const modalButtonHeight = 50 * this.scaleFactor;
      
      // Modern buttons (similar to completion panel)
      const tryAgainBg = this.add.graphics();
      tryAgainBg.fillGradientStyle(0xe67e22, 0xe67e22, 0xf39c12, 0xf39c12, 1);
      tryAgainBg.fillRoundedRect(-modalButtonWidth/2, panelHeight/2 - 150 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      tryAgainBg.lineStyle(2 * this.scaleFactor, 0xd35400, 1);
      tryAgainBg.strokeRoundedRect(-modalButtonWidth/2, panelHeight/2 - 150 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      
      const tryAgainButton = this.add.rectangle(0, panelHeight/2 - 125 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.restartGame());
      
      const tryAgainText = this.add.text(0, panelHeight/2 - 125 * this.scaleFactor, 'TRY AGAIN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${buttonFontSize}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 1 * this.scaleFactor
      }).setOrigin(0.5);
      
      const menuBg = this.add.graphics();
      menuBg.fillStyle(0x34495e, 0.9);
      menuBg.fillRoundedRect(-modalButtonWidth/2, panelHeight/2 - 90 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      menuBg.lineStyle(2 * this.scaleFactor, 0x2c3e50, 1);
      menuBg.strokeRoundedRect(-modalButtonWidth/2, panelHeight/2 - 90 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 25 * this.scaleFactor);
      
      const menuButton = this.add.rectangle(0, panelHeight/2 - 65 * this.scaleFactor, modalButtonWidth, modalButtonHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.returnToMenu());
      
      const menuText = this.add.text(0, panelHeight/2 - 65 * this.scaleFactor, 'MAIN MENU', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${buttonFontSize}px`,
        fontStyle: 'bold',
        color: '#ecf0f1',
        stroke: '#000000',
        strokeThickness: 1 * this.scaleFactor
      }).setOrigin(0.5);
      
      this.gameOverPanel.add([
        fullScreenBg,
        glow,
        panelBg, 
        gameOverText, 
        messageText, 
        hintText,
        tryAgainBg,
        tryAgainButton, 
        tryAgainText,
        menuBg,
        menuButton,
        menuText
      ]);
    }
    
    createBoundaries() {
      // Create boundary walls using Matter.js
      const wallThickness = 5 * this.scaleFactor;
      
      // Top wall
      this.topWall = this.matter.add.rectangle(0, this.topBound - wallThickness/2, this.gameSize, wallThickness, {
        isStatic: true,
        label: 'boundary',
        restitution: 1, // Perfect bounce
        collisionFilter: {
          category: 0x0008, // Category 4: boundaries
          mask: 0x0001 // Only collide with lasers
        }
      });
      
      // Bottom wall
      this.bottomWall = this.matter.add.rectangle(0, this.bottomBound + wallThickness/2, this.gameSize, wallThickness, {
        isStatic: true,
        label: 'boundary',
        restitution: 1, // Perfect bounce
        collisionFilter: {
          category: 0x0008,
          mask: 0x0001 // Only collide with lasers
        }
      });
      
      // Left wall
      this.leftWall = this.matter.add.rectangle(this.leftBound - wallThickness/2, 0, wallThickness, this.gameSize, {
        isStatic: true,
        label: 'boundary',
        restitution: 1, // Perfect bounce
        collisionFilter: {
          category: 0x0008,
          mask: 0x0001 // Only collide with lasers
        }
      });
      
      // Right wall
      this.rightWall = this.matter.add.rectangle(this.rightBound + wallThickness/2, 0, wallThickness, this.gameSize, {
        isStatic: true,
        label: 'boundary',
        restitution: 1, // Perfect bounce
        collisionFilter: {
          category: 0x0008,
          mask: 0x0001 // Only collide with lasers
        }
      });
      
      // Modern game area with subtle gradient and glow
      this.gameAreaBg = this.add.graphics();
      this.gameAreaBg.fillGradientStyle(0x0f1419, 0x0f1419, 0x1a1a2e, 0x1a1a2e, 1);
      this.gameAreaBg.fillRoundedRect(
        this.leftBound - 10 * this.scaleFactor, 
        this.topBound - 10 * this.scaleFactor, 
        (this.rightBound - this.leftBound) + 20 * this.scaleFactor, 
        (this.bottomBound - this.topBound) + 20 * this.scaleFactor, 
        15 * this.scaleFactor
      );
      this.gameAreaBg.lineStyle(3 * this.scaleFactor, 0x4facfe, 0.6);
      this.gameAreaBg.strokeRoundedRect(
        this.leftBound - 10 * this.scaleFactor, 
        this.topBound - 10 * this.scaleFactor, 
        (this.rightBound - this.leftBound) + 20 * this.scaleFactor, 
        (this.bottomBound - this.topBound) + 20 * this.scaleFactor, 
        15 * this.scaleFactor
      );
      
      // Add subtle glow effect to game area
      this.gameAreaGlow = this.add.graphics();
      this.gameAreaGlow.fillStyle(0x4facfe, 0.1);
      this.gameAreaGlow.fillRoundedRect(
        this.leftBound - 15 * this.scaleFactor, 
        this.topBound - 15 * this.scaleFactor, 
        (this.rightBound - this.leftBound) + 30 * this.scaleFactor, 
        (this.bottomBound - this.topBound) + 30 * this.scaleFactor, 
        20 * this.scaleFactor
      );
      
      // Create placement boundary area (no-go zone for mirrors)
      this.createPlacementBoundary();
    }
    
    createPlacementBoundary() {
      // Define the no-go zone sizes (scaled)
      const targetSafeRadius = 120 * this.scaleFactor; // Safe zone around target
      const wallSafeMargin = 40 * this.scaleFactor;   // Safe zone near walls
      
      // Create graphics for placement boundary visualization
      this.placementBoundary = this.add.graphics();
      
      // Modern styling for restricted areas
      this.placementBoundary.fillStyle(0xFF6B6B, 0.2);
      this.placementBoundary.lineStyle(2 * this.scaleFactor, 0xFF4757, 0.4);
      
      // Draw target no-go zone (circle around center)
      this.placementBoundary.fillCircle(0, 0, targetSafeRadius);
      this.placementBoundary.strokeCircle(0, 0, targetSafeRadius);
      
      // Draw wall no-go zones (rectangles along each wall)
      // Top wall
      this.placementBoundary.fillRect(
        this.leftBound,
        this.topBound,
        this.rightBound - this.leftBound,
        wallSafeMargin
      );
      
      // Bottom wall
      this.placementBoundary.fillRect(
        this.leftBound,
        this.bottomBound - wallSafeMargin,
        this.rightBound - this.leftBound,
        wallSafeMargin
      );
      
      // Left wall
      this.placementBoundary.fillRect(
        this.leftBound,
        this.topBound + wallSafeMargin,
        wallSafeMargin,
        this.bottomBound - this.topBound - (2 * wallSafeMargin)
      );
      
      // Right wall
      this.placementBoundary.fillRect(
        this.rightBound - wallSafeMargin,
        this.topBound + wallSafeMargin,
        wallSafeMargin,
        this.bottomBound - this.topBound - (2 * wallSafeMargin)
      );
      
      // Store the boundary values for mirror placement validation (scaled)
      this.placementConstraints = {
        targetSafeRadius: targetSafeRadius,
        wallSafeMargin: wallSafeMargin
      };
    }
    
    createTarget() {
      // Create a target in the center of the screen
      this.target = new Target(this, 0, 0);
    }
    
    setupLevel() {
      // Create mirrors
      this.createMirrors();
      
      // Create spawners (laser emitters)
      this.createSpawners();
    }
    
    createMirrors() {
      // Clear existing mirrors
      this.mirrors.forEach(mirror => mirror.destroy());
      this.mirrors = [];
      
      // Create mirrors with different types and positions (scaled)
      const mirrorCount = 9;
      const targetShapeTypes = [
        'rightTriangle',
        'isoscelesTriangle',
        'rectangle',
        'trapezoid',
        'semicircle'
      ];
      
      // Try to create at least one of each shape type if possible
      let shapesCreated = [];
      
      // Define a safe radius away from the target (scaled)
      const safeRadius = Math.max(
        this.placementConstraints.targetSafeRadius * 1.5,
        150 * this.scaleFactor // Minimum distance scaled
      );
      
      for (let i = 0; i < mirrorCount; i++) {
        // Random position ensuring not too close to center or boundaries
        let x, y;
        let validPosition = false;
        
        // Try positions until a valid one is found
        const maxAttempts = 100;
        let attempts = 0;
        
        while (!validPosition && attempts < maxAttempts) {
          // Use an angle and distance to ensure mirrors are away from center
          const angle = Math.random() * Math.PI * 2;
          
          // Random distance between safe radius and almost to the edge
          const maxDistance = Math.min(
            this.rightBound - this.leftBound,
            this.bottomBound - this.topBound
          ) * 0.4; // 40% of the smallest dimension
          
          const distance = safeRadius + Math.random() * (maxDistance - safeRadius);
          
          x = Math.cos(angle) * distance;
          y = Math.sin(angle) * distance;
          
          // Verify position is within game bounds and away from walls
          const margin = this.placementConstraints.wallSafeMargin;
          const withinBounds = (
            x > this.leftBound + margin && 
            x < this.rightBound - margin &&
            y > this.topBound + margin && 
            y < this.bottomBound - margin
          );
          
          if (withinBounds) {
            // Create a temporary mirror to check for overlaps with existing mirrors
            const tempMirror = new Mirror(this, x, y, 'rectangle');
            
            // Check if this position would be valid (no overlaps)
            validPosition = tempMirror.isPositionValid(x, y);
            
            // Clean up the temporary mirror
            tempMirror.destroy();
          }
          
          attempts++;
        }
        
        // If we couldn't find a valid position, use a safe default with extra spacing
        if (!validPosition) {
          // Position along one of the diagonals with extra spacing
          const angle = (Math.PI / 4) + (i * Math.PI / 2);
          const extraSpacing = 50 * this.scaleFactor * i;
          const finalRadius = safeRadius + extraSpacing;
          
          x = Math.cos(angle) * finalRadius;
          y = Math.sin(angle) * finalRadius;
          
          console.log(`Using fallback position for mirror ${i} at angle ${angle.toFixed(2)}: (${x.toFixed(0)}, ${y.toFixed(0)})`);
        }
        
        // Choose shape type - try to use different shapes
        let shapeType;
        
        const unusedShapes = targetShapeTypes.filter(shape => !shapesCreated.includes(shape));
        
        if (unusedShapes.length > 0) {
          shapeType = Phaser.Utils.Array.GetRandom(unusedShapes);
        } else {
          shapeType = Phaser.Utils.Array.GetRandom(targetShapeTypes);
        }
        
        console.log(`Creating mirror ${i} at (${x.toFixed(0)}, ${y.toFixed(0)}) with shape ${shapeType}`);
        
        try {
          // Create the mirror at the valid position with the selected shape
          const mirror = new Mirror(this, x, y, shapeType);
          this.mirrors.push(mirror);
          
          // Keep track of which shapes we've successfully created
          if (mirror.shapeType === shapeType) {
            shapesCreated.push(shapeType);
          }
        } catch (e) {
          console.error(`Error creating mirror with shape ${shapeType}:`, e);
          
          // Fallback to a rectangle on failure
          try {
            const mirror = new Mirror(this, x, y, 'rectangle');
            this.mirrors.push(mirror);
          } catch (fallbackError) {
            console.error(`Even fallback mirror creation failed:`, fallbackError);
          }
        }
      }
      
      console.log(`Created mirrors with shapes: ${shapesCreated.join(', ')}`);
    }
    
    createSpawners() {
      // Clear existing spawners
      this.spawners.forEach(spawner => spawner.destroy());
      this.spawners = [];
      
      // Define spawner positions - scaled appropriately
      const outerMargin = -1 * this.scaleFactor;
      
      // Possible positions for spawners (outside boundaries)
      const spawnerPositions = [
        // Left wall spawners
        { x: this.leftBound - outerMargin, y: this.topBound * 0.5 },
        { x: this.leftBound - outerMargin, y: 0 },
        { x: this.leftBound - outerMargin, y: this.bottomBound * 0.5 },
        
        // Right wall spawners
        { x: this.rightBound + outerMargin, y: this.topBound * 0.5 },
        { x: this.rightBound + outerMargin, y: 0 },
        { x: this.rightBound + outerMargin, y: this.bottomBound * 0.5 },
        
        // Top wall spawners
        { x: this.leftBound * 0.5, y: this.topBound - outerMargin },
        { x: 0, y: this.topBound - outerMargin },
        { x: this.rightBound * 0.5, y: this.topBound - outerMargin },
        
        // Bottom wall spawners
        { x: this.leftBound * 0.5, y: this.bottomBound + outerMargin },
        { x: 0, y: this.bottomBound + outerMargin },
        { x: this.rightBound * 0.5, y: this.bottomBound + outerMargin }
      ];
      
      // Randomly select 4 spawner positions
      const selectedPositions = Phaser.Utils.Array.Shuffle([...spawnerPositions]).slice(0, 4);
      
      // Create spawners at selected positions
      for (const pos of selectedPositions) {
        // Calculate direction pointing toward the center
        const direction = new Phaser.Math.Vector2(-pos.x, -pos.y).normalize();
        
        // Create spawner as a smaller triangle pointing inward (scaled)
        const size = 6 * this.scaleFactor;
        const angle = Math.atan2(direction.y, direction.x);
        
        const spawner = this.add.triangle(
          pos.x, pos.y,
          0, -size,
          size, size,
          -size, size,
          0xff4500
        );
        
        // Rotate to point toward center
        spawner.rotation = angle + Math.PI / 2;
        
        // Store direction for later when creating laser
        spawner.direction = direction;
        spawner.position = new Phaser.Math.Vector2(pos.x, pos.y);
        
        // Add to spawners array
        this.spawners.push(spawner);
      }
    }
}