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
    
    // Hide start button
    this.startButton.setVisible(false);
    this.startText.setVisible(false);
    
    // Hide instructions
    this.instructionsText.setVisible(false);
    
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
    this.finalScoreText.setText(`Time: ${this.gameTime.toFixed(3)}s`);
    this.reflectionsText.setText(`Reflections: ${this.totalReflections}`);
    this.gameCompletionPanel.setVisible(true);
    
    // Animate panel in with a bounce effect
    this.tweens.add({
      targets: this.gameCompletionPanel,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: 600,
      ease: 'Back.out'
    });
    
    // Play success sound (if you want to add audio)
    // this.sound.play('success');
    
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
    
    // Play game over sound (if you want to add audio)
    // this.sound.play('gameover');
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
    
    // Show start button and instructions
    this.startButton.setVisible(true);
    this.startText.setVisible(true);
    this.instructionsText.setVisible(true);
    
    // Reset timer display
    this.timerText.setText('Time: 0.000');
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
    if (this.gameArea) this.gameArea.destroy();
    
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
    
    // Game dimensions
    this.gameWidth = this.cameras.main.width;
    this.gameHeight = this.cameras.main.height;
    
    // Game boundaries - reduced to make room for spawners outside
    const margin = Math.min(this.gameWidth, this.gameHeight) * 0.08; // 8% margin
    this.leftBound = -this.gameWidth / 2 + margin;
    this.rightBound = this.gameWidth / 2 - margin;
    this.topBound = -this.gameHeight / 2 + margin;
    this.bottomBound = this.gameHeight / 2 - margin;
  }
  
  create() {
    // Center the coordinates (0,0) in the middle of the screen
    this.cameras.main.centerOn(0, 0);
    
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
  
  update(time, delta) {
    // Update game timer if game has started
    if (this.isGameStarted && !this.targetHit) {
      this.gameTime += delta / 1000; // Convert ms to seconds
      this.timerText.setText(`Time: ${this.gameTime.toFixed(3)}`);
    }
  }
  
  createUI() {
    // Timer text
    this.timerText = this.add.text(this.leftBound + 20, this.topBound + 20, 'Time: 0.000', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    });
    
    // Start button
    this.startButton = this.add.rectangle(0, this.bottomBound - 40, 200, 60, 0x4444ff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame())
      .on('pointerover', () => this.startButton.fillColor = 0x6666ff)
      .on('pointerout', () => this.startButton.fillColor = 0x4444ff);
    
    this.startText = this.add.text(0, this.bottomBound - 40, 'START', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Instructions text
    this.instructionsText = this.add.text(0, this.topBound + 40, 'Position the mirrors to reflect the laser beam into the target', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    
    // Home button
    this.homeButton = this.add.rectangle(this.leftBound + 60, this.bottomBound - 40, 100, 40, 0x666666, 0.8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToMenu())
      .on('pointerover', () => this.homeButton.fillColor = 0x888888)
      .on('pointerout', () => this.homeButton.fillColor = 0x666666);
    
    this.homeText = this.add.text(this.leftBound + 60, this.bottomBound - 40, 'MENU', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
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
    
    // Semitransparent background that covers the entire screen
    const fullScreenBg = this.add.rectangle(
      0, 0, 
      this.cameras.main.width * 2, 
      this.cameras.main.height * 2, 
      0x000000, 0.7
    );
    
    // Panel background
    const panel = this.add.rectangle(0, 0, 400, 350, 0x111155, 0.9)
      .setStrokeStyle(2, 0x3333ff);
    
    // Success text with glow effect
    const completeText = this.add.text(0, -130, 'TARGET HIT!', {
      fontFamily: 'Arial',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#00ff00',
      stroke: '#004400',
      strokeThickness: 4,
      shadow: { color: '#00ff00', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    // Congratulatory message
    const congratsText = this.add.text(0, -80, 'Thank You for Playing', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.finalScoreText = this.add.text(0, -30, 'Time: 0.000', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffff00'
    }).setOrigin(0.5);
    
    const reflectionsText = this.add.text(0, 10, 'Reflections: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.reflectionsText = reflectionsText; // Store for later update
    
    // Play again button
    const playAgainButton = this.add.rectangle(0, 70, 250, 60, 0x22aa22, 0.9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.restartGame())
      .on('pointerover', () => playAgainButton.fillColor = 0x44cc44)
      .on('pointerout', () => playAgainButton.fillColor = 0x22aa22);
    
    const playAgainText = this.add.text(0, 70, 'PLAY AGAIN', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Main menu button
    const menuButton = this.add.rectangle(0, 140, 250, 60, 0x2244aa, 0.9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToMenu())
      .on('pointerover', () => menuButton.fillColor = 0x4466cc)
      .on('pointerout', () => menuButton.fillColor = 0x2244aa);
    
    const menuText = this.add.text(0, 140, 'MAIN MENU', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Add everything to the container
    this.gameCompletionPanel.add([
      fullScreenBg,
      panel, 
      completeText, 
      congratsText,
      this.finalScoreText, 
      reflectionsText,
      playAgainButton, 
      playAgainText,
      menuButton,
      menuText
    ]);
  }
  
  createGameOverPanel() {
    this.gameOverPanel = this.add.container(0, 0).setVisible(false);
    
    // Set a high depth to ensure it appears on top of everything
    this.gameOverPanel.setDepth(1000);
    
    // Semitransparent background
    const fullScreenBg = this.add.rectangle(
      0, 0, 
      this.cameras.main.width * 2, 
      this.cameras.main.height * 2, 
      0x000000, 0.7
    );
    
    const panel = this.add.rectangle(0, 0, 400, 350, 0x331111, 0.9)
      .setStrokeStyle(2, 0xff3333);
    
    const gameOverText = this.add.text(0, -130, 'TIME\'S UP', {
      fontFamily: 'Arial',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ff0000',
      stroke: '#440000',
      strokeThickness: 4,
      shadow: { color: '#ff0000', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    const messageText = this.add.text(0, -70, 'You ran out of time!', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    const hintText = this.add.text(0, -20, 'Try rearranging the mirrors\nfor a better path to the target.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#aaaaaa',
      align: 'center'
    }).setOrigin(0.5);
    
    const tryAgainButton = this.add.rectangle(0, 60, 250, 60, 0xaa2222, 0.9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.restartGame())
      .on('pointerover', () => tryAgainButton.fillColor = 0xcc4444)
      .on('pointerout', () => tryAgainButton.fillColor = 0xaa2222);
    
    const tryAgainText = this.add.text(0, 60, 'TRY AGAIN', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    const menuButton = this.add.rectangle(0, 130, 250, 60, 0x2244aa, 0.9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToMenu())
      .on('pointerover', () => menuButton.fillColor = 0x4466cc)
      .on('pointerout', () => menuButton.fillColor = 0x2244aa);
    
    const menuText = this.add.text(0, 130, 'MAIN MENU', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.gameOverPanel.add([
      fullScreenBg,
      panel, 
      gameOverText, 
      messageText, 
      hintText,
      tryAgainButton, 
      tryAgainText,
      menuButton,
      menuText
    ]);
  }
  
  createGameOverPanel() {
    this.gameOverPanel = this.add.container(0, 0).setVisible(false);
    
    // Semitransparent background
    const fullScreenBg = this.add.rectangle(
      0, 0, 
      this.cameras.main.width * 2, 
      this.cameras.main.height * 2, 
      0x000000, 0.7
    );
    
    const panel = this.add.rectangle(0, 0, 400, 350, 0x331111, 0.9)
      .setStrokeStyle(2, 0xff3333);
    
    const gameOverText = this.add.text(0, -130, 'TIME\'S UP', {
      fontFamily: 'Arial',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ff0000',
      stroke: '#440000',
      strokeThickness: 4,
      shadow: { color: '#ff0000', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    const messageText = this.add.text(0, -70, 'You ran out of time!', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    const hintText = this.add.text(0, -20, 'Try rearranging the mirrors\nfor a better path to the target.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#aaaaaa',
      align: 'center'
    }).setOrigin(0.5);
    
    const tryAgainButton = this.add.rectangle(0, 60, 250, 60, 0xaa2222, 0.9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.restartGame())
      .on('pointerover', () => tryAgainButton.fillColor = 0xcc4444)
      .on('pointerout', () => tryAgainButton.fillColor = 0xaa2222);
    
    const tryAgainText = this.add.text(0, 60, 'TRY AGAIN', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    const menuButton = this.add.rectangle(0, 130, 250, 60, 0x2244aa, 0.9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToMenu())
      .on('pointerover', () => menuButton.fillColor = 0x4466cc)
      .on('pointerout', () => menuButton.fillColor = 0x2244aa);
    
    const menuText = this.add.text(0, 130, 'MAIN MENU', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.gameOverPanel.add([
      fullScreenBg,
      panel, 
      gameOverText, 
      messageText, 
      hintText,
      tryAgainButton, 
      tryAgainText,
      menuButton,
      menuText
    ]);
  }
  
  createBoundaries() {
    // Create boundary walls using Matter.js
    const wallThickness = 5; // Reduced from 20 to 5 for more precise collisions
    
    // Top wall
    this.topWall = this.matter.add.rectangle(0, this.topBound - wallThickness/2, this.gameWidth, wallThickness, {
      isStatic: true,
      label: 'boundary',
      restitution: 1, // Perfect bounce
      collisionFilter: {
        category: 0x0008, // Category 4: boundaries
        mask: 0x0001 // Only collide with lasers
      }
    });
    
    // Bottom wall
    this.bottomWall = this.matter.add.rectangle(0, this.bottomBound + wallThickness/2, this.gameWidth, wallThickness, {
      isStatic: true,
      label: 'boundary',
      restitution: 1, // Perfect bounce
      collisionFilter: {
        category: 0x0008,
        mask: 0x0001 // Only collide with lasers
      }
    });
    
    // Left wall
    this.leftWall = this.matter.add.rectangle(this.leftBound - wallThickness/2, 0, wallThickness, this.gameHeight, {
      isStatic: true,
      label: 'boundary',
      restitution: 1, // Perfect bounce
      collisionFilter: {
        category: 0x0008,
        mask: 0x0001 // Only collide with lasers
      }
    });
    
    // Right wall
    this.rightWall = this.matter.add.rectangle(this.rightBound + wallThickness/2, 0, wallThickness, this.gameHeight, {
      isStatic: true,
      label: 'boundary',
      restitution: 1, // Perfect bounce
      collisionFilter: {
        category: 0x0008,
        mask: 0x0001 // Only collide with lasers
      }
    });
    
    // Visual representation of game area - slightly inset from the actual physics boundaries
    const visualInset = 1; // Visual inset from physics boundaries
    this.gameArea = this.add.rectangle(0, 0, 
      this.rightBound - this.leftBound - visualInset*2, 
      this.bottomBound - this.topBound - visualInset*2, 
      0x111144, 0.3)
      .setStrokeStyle(2, 0x3333aa);
    
    // Create placement boundary area (no-go zone for mirrors)
    this.createPlacementBoundary();
  }
  
  createPlacementBoundary() {
    // Define the no-go zone sizes
    const targetSafeRadius = 120; // Safe zone around target
    const wallSafeMargin = 40;   // Safe zone near walls
    
    // Create graphics for placement boundary visualization
    this.placementBoundary = this.add.graphics();
    
    // Light pink color with some transparency
    this.placementBoundary.fillStyle(0xFF9999, 0.3);
    
    // Draw target no-go zone (circle around center)
    this.placementBoundary.fillCircle(0, 0, targetSafeRadius);
    
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
    
    // Store the boundary values for mirror placement validation
    this.placementConstraints = {
      targetSafeRadius,
      wallSafeMargin
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
    
    // Create 5 mirrors with different types and positions
    const mirrorCount = 9;
    const targetShapeTypes = [
      'rightTriangle',
      'isoscelesTriangle',
      'rectangle',
      'trapezoid',
      'semicircle'
      // Removed 'crescent' as requested
    ];
    
    // Try to create at least one of each shape type if possible
    let shapesCreated = [];
    
    // Define a safe radius away from the target
    const safeRadius = Math.max(
      this.placementConstraints.targetSafeRadius * 1.5,
      150 // Minimum of 150 pixels away from center
    );
    
    for (let i = 0; i < mirrorCount; i++) {
      // Random position ensuring not too close to center or boundaries
      let x, y;
      let validPosition = false;
      
      // Try positions until a valid one is found
      const maxAttempts = 100; // Increased attempts to account for overlap checking
      let attempts = 0;
      
      while (!validPosition && attempts < maxAttempts) {
        // Method 1: Use an angle and distance to ensure mirrors are away from center
        const angle = Math.random() * Math.PI * 2; // Random angle 0-2π
        
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
        const angle = (Math.PI / 4) + (i * Math.PI / 2); // Distribute along diagonals
        const extraSpacing = 50 * i; // Add extra spacing for each subsequent mirror
        const finalRadius = safeRadius + extraSpacing;
        
        x = Math.cos(angle) * finalRadius;
        y = Math.sin(angle) * finalRadius;
        
        console.log(`Using fallback position for mirror ${i} at angle ${angle.toFixed(2)}: (${x.toFixed(0)}, ${y.toFixed(0)})`);
      }
      
      // Choose shape type - try to use different shapes
      let shapeType;
      
      // For variety, ensure we try to create different shapes
      // First try to create shapes we haven't created yet
      const unusedShapes = targetShapeTypes.filter(shape => !shapesCreated.includes(shape));
      
      if (unusedShapes.length > 0) {
        shapeType = Phaser.Utils.Array.GetRandom(unusedShapes);
      } else {
        // If all shapes have been created, choose randomly
        shapeType = Phaser.Utils.Array.GetRandom(targetShapeTypes);
      }
      
      // Debug
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
    
    // Define spawner positions - ensure they're inside the game boundaries
    const outerMargin = -1; // Increased distance outside boundary
    
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
      
      // Create spawner as a smaller triangle pointing inward
      const size = 6; // Reduced from 10 to make spawners smaller
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
    returnToMenu() {
      this.scene.start('MenuScene');
    }
  }