class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
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
      if (this.isGameStarted) {
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
      this.gameCompletionPanel = this.add.container(0, 0).setAlpha(0).setVisible(false);
      
      const panel = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.8);
      const completeText = this.add.text(0, -100, 'TARGET HIT!', {
        fontFamily: 'Arial',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#00ff00'
      }).setOrigin(0.5);
      
      this.finalScoreText = this.add.text(0, -40, 'Time: 0.000', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      const submitScoreButton = this.add.rectangle(0, 20, 250, 50, 0x4444ff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.submitScore())
        .on('pointerover', () => submitScoreButton.fillColor = 0x6666ff)
        .on('pointerout', () => submitScoreButton.fillColor = 0x4444ff);
      
      const submitScoreText = this.add.text(0, 20, 'SUBMIT SCORE', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      const playAgainButton = this.add.rectangle(0, 80, 250, 50, 0x444477, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.restart())
        .on('pointerover', () => playAgainButton.fillColor = 0x5555aa)
        .on('pointerout', () => playAgainButton.fillColor = 0x444477);
      
      const playAgainText = this.add.text(0, 80, 'PLAY AGAIN', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      const menuButton = this.add.rectangle(0, 140, 250, 50, 0x666666, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.returnToMenu())
        .on('pointerover', () => menuButton.fillColor = 0x888888)
        .on('pointerout', () => menuButton.fillColor = 0x666666);
      
      const menuText = this.add.text(0, 140, 'MAIN MENU', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      this.gameCompletionPanel.add([
        panel, 
        completeText, 
        this.finalScoreText, 
        submitScoreButton, 
        submitScoreText, 
        playAgainButton, 
        playAgainText,
        menuButton,
        menuText
      ]);
    }
    
    createGameOverPanel() {
      this.gameOverPanel = this.add.container(0, 0).setAlpha(0).setVisible(false);
      
      const panel = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.8);
      const gameOverText = this.add.text(0, -100, 'TIME\'S UP', {
        fontFamily: 'Arial',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ff0000'
      }).setOrigin(0.5);
      
      const messageText = this.add.text(0, -40, 'You ran out of time!', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      const tryAgainButton = this.add.rectangle(0, 30, 250, 50, 0x4444ff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.restart())
        .on('pointerover', () => tryAgainButton.fillColor = 0x6666ff)
        .on('pointerout', () => tryAgainButton.fillColor = 0x4444ff);
      
      const tryAgainText = this.add.text(0, 30, 'TRY AGAIN', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      const menuButton = this.add.rectangle(0, 100, 250, 50, 0x666666, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.returnToMenu())
        .on('pointerover', () => menuButton.fillColor = 0x888888)
        .on('pointerout', () => menuButton.fillColor = 0x666666);
      
      const menuText = this.add.text(0, 100, 'MAIN MENU', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      this.gameOverPanel.add([
        panel, 
        gameOverText, 
        messageText, 
        tryAgainButton, 
        tryAgainText,
        menuButton,
        menuText
      ]);
    }
    
    createBoundaries() {
      // Create boundary walls using Matter.js
      const wallThickness = 20;
      
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
          category: 0x0008
        }
      });
      
      // Right wall
      this.rightWall = this.matter.add.rectangle(this.rightBound + wallThickness/2, 0, wallThickness, this.gameHeight, {
        isStatic: true,
        label: 'boundary',
        restitution: 1, // Perfect bounce
        collisionFilter: {
          category: 0x0008
        }
      });
      
      // Visual representation of game area
      this.gameArea = this.add.rectangle(0, 0, 
        this.rightBound - this.leftBound, 
        this.bottomBound - this.topBound, 
        0x111144, 0.3)
        .setStrokeStyle(2, 0x3333aa);
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
      for (let i = 0; i < 5; i++) {
        // Random position ensuring not too close to center
        let x, y;
        do {
          x = Phaser.Math.Between(this.leftBound + 50, this.rightBound - 50);
          y = Phaser.Math.Between(this.topBound + 50, this.bottomBound - 50);
        } while (Math.abs(x) < 80 && Math.abs(y) < 80); // Keep away from center target
        
        // Random mirror type and rotation
        const type = Phaser.Math.Between(1, 4);
        const rotation = Phaser.Math.Between(0, 7) * 45 * Math.PI / 180; // Convert to radians
        
        // Create the mirror
        const mirror = new Mirror(this, x, y, type);
        mirror.setRotation(rotation);
        
        // Add to mirrors array
        this.mirrors.push(mirror);
      }
    }
    
    createSpawners() {
      // Clear existing spawners
      this.spawners.forEach(spawner => spawner.destroy());
      this.spawners = [];
      
      // Define spawner positions - ensure they're outside the game boundaries
      const outerMargin = 30; // Increased distance outside boundary
      
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
    
    setupInput() {
      // Setup drag input handlers
      this.input.on('dragstart', (pointer, gameObject) => {
        if (this.isGameStarted) return; // Can't move objects after game starts
        
        // If the object is a Mirror, call its startDrag method
        if (gameObject instanceof Mirror) {
          gameObject.startDrag();
        }
      });
      
      this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (this.isGameStarted) return; // Can't move objects after game starts
        
        // Move the object
        gameObject.x = dragX;
        gameObject.y = dragY;
        
        // Constrain to game boundaries
        gameObject.x = Phaser.Math.Clamp(gameObject.x, this.leftBound + 30, this.rightBound - 30);
        gameObject.y = Phaser.Math.Clamp(gameObject.y, this.topBound + 30, this.bottomBound - 30);
      });
      
      this.input.on('dragend', (pointer, gameObject) => {
        if (this.isGameStarted) return; // Can't move objects after game starts
        
        // If the object is a Mirror, call its stopDrag method
        if (gameObject instanceof Mirror) {
          gameObject.stopDrag();
        }
      });
    }
    
    setupCollisions() {
      // Collision detection is handled in the Laser class
    }
    
    startGame() {
      if (this.isGameStarted) return;
      
      this.isGameStarted = true;
      this.gameTime = 0;
      this.targetHit = false;
      
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
      
      // Mark target as hit
      this.targetHit = true;
      
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
      
      // Show completion panel
      this.finalScoreText.setText(`Time: ${this.gameTime.toFixed(3)}`);
      this.gameCompletionPanel.setVisible(true);
      
      // Animate panel in
      this.tweens.add({
        targets: this.gameCompletionPanel,
        alpha: 1,
        duration: 500,
        ease: 'Cubic.out'
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
      
      // Show game over panel
      this.gameOverPanel.setVisible(true);
      
      // Animate panel in
      this.tweens.add({
        targets: this.gameOverPanel,
        alpha: 1,
        duration: 500,
        ease: 'Cubic.out'
      });
    }
    
    submitScore() {
      // Prompt for player name
      const playerName = prompt("Enter your name for the leaderboard:", "");
      
      if (playerName !== null) { // If user didn't cancel
        // Show loading message
        const loadingText = this.add.text(0, 0, 'Submitting score...', {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#ffffff'
        }).setOrigin(0.5);
        
        // Submit score to Firebase
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
      }
    }
    
    returnToMenu() {
      this.scene.start('MenuScene');
    }
  }