class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
    }
    
    init() {
      // Game state
      this.isGameStarted = false;
      this.gameTime = 0;
      this.absorberCount = 0;
      this.totalLasers = 0;
      this.absorbedLasers = 0;
      
      // Object collections
      this.lasers = [];
      this.mirrors = [];
      this.absorbers = [];
      this.spawners = [];
      
      // Game dimensions
      this.gameWidth = this.cameras.main.width;
      this.gameHeight = this.cameras.main.height;
      
      // Game boundaries
      this.leftBound = -this.gameWidth / 2 + 20;
      this.rightBound = this.gameWidth / 2 - 20;
      this.topBound = -this.gameHeight / 2 + 20;
      this.bottomBound = this.gameHeight / 2 - 20;
    }
    
    create() {
      // Center the coordinates (0,0) in the middle of the screen
      this.cameras.main.centerOn(0, 0);
      
      // Create game UI
      this.createUI();
      
      // Create game boundaries
      this.createBoundaries();
      
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
      
      // Check for game completion
      if (this.isGameStarted && this.absorbedLasers === this.totalLasers) {
        this.gameComplete();
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
      this.instructionsText = this.add.text(0, this.topBound + 40, 'Position the mirrors to reflect the laser beams into the absorbers', {
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
      const completeText = this.add.text(0, -100, 'LEVEL COMPLETE!', {
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
      const gameOverText = this.add.text(0, -100, 'GAME OVER', {
        fontFamily: 'Arial',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ff0000'
      }).setOrigin(0.5);
      
      const messageText = this.add.text(0, -40, 'Laser hit the boundary!', {
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
      const wallThickness = 50;
      
      // Top wall
      this.matter.add.rectangle(0, this.topBound - wallThickness/2, this.gameWidth, wallThickness, {
        isStatic: true,
        label: 'boundary',
        collisionFilter: {
          category: 0x0008 // Category 4: boundaries
        }
      });
      
      // Bottom wall
      this.matter.add.rectangle(0, this.bottomBound + wallThickness/2, this.gameWidth, wallThickness, {
        isStatic: true,
        label: 'boundary',
        collisionFilter: {
          category: 0x0008
        }
      });
      
      // Left wall
      this.matter.add.rectangle(this.leftBound - wallThickness/2, 0, wallThickness, this.gameHeight, {
        isStatic: true,
        label: 'boundary',
        collisionFilter: {
          category: 0x0008
        }
      });
      
      // Right wall
      this.matter.add.rectangle(this.rightBound + wallThickness/2, 0, wallThickness, this.gameHeight, {
        isStatic: true,
        label: 'boundary',
        collisionFilter: {
          category: 0x0008
        }
      });
      
      // Visual representation of game area
      this.add.rectangle(0, 0, 
        this.rightBound - this.leftBound, 
        this.bottomBound - this.topBound, 
        0x111144, 0.3)
        .setStrokeStyle(2, 0x3333aa);
    }
    
    setupLevel() {
      // Create mirrors
      this.createMirrors();
      
      // Create absorbers
      this.createAbsorbers();
      
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
        } while (Math.abs(x) < 100 && Math.abs(y) < 100); // Keep away from center
        
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
    
    createAbsorbers() {
      // Clear existing absorbers
      this.absorbers.forEach(absorber => absorber.destroy());
      this.absorbers = [];
      
      // Create 3 absorbers at random positions
      for (let i = 0; i < 3; i++) {
        // Random position ensuring not too close to center
        let x, y;
        do {
          x = Phaser.Math.Between(this.leftBound + 70, this.rightBound - 70);
          y = Phaser.Math.Between(this.topBound + 70, this.bottomBound - 70);
        } while (Math.abs(x) < 120 && Math.abs(y) < 120); // Keep away from center
        
        // Create the absorber
        const absorber = new Absorber(this, x, y);
        
        // Add to absorbers array
        this.absorbers.push(absorber);
      }
      
      // Set the absorber count for game completion check
      this.absorberCount = this.absorbers.length;
    }
    
    createSpawners() {
      // Clear existing spawners
      this.spawners.forEach(spawner => spawner.destroy());
      this.spawners = [];
      
      // Define possible positions for spawners (near the boundaries)
      const spawnerPositions = [
        { x: this.leftBound + 30, y: 0 },                       // Left center
        { x: this.rightBound - 30, y: 0 },                      // Right center
        { x: 0, y: this.topBound + 30 },                        // Top center
        { x: 0, y: this.bottomBound - 30 },                     // Bottom center
        { x: this.leftBound + 60, y: this.topBound + 60 },      // Top left
        { x: this.rightBound - 60, y: this.topBound + 60 },     // Top right
        { x: this.leftBound + 60, y: this.bottomBound - 60 },   // Bottom left
        { x: this.rightBound - 60, y: this.bottomBound - 60 }   // Bottom right
      ];
      
      // Randomly select 5 spawner positions
      const selectedPositions = Phaser.Utils.Array.Shuffle([...spawnerPositions]).slice(0, 5);
      
      // Create spawners at selected positions
      for (const pos of selectedPositions) {
        // Create spawner (simple image)
        const spawner = this.add.image(pos.x, pos.y, 'spawner');
        
        // Calculate direction - pointing away from the center
        const direction = new Phaser.Math.Vector2(-pos.x, -pos.y).normalize();
        
        // Set rotation (point away from center)
        const angle = Math.atan2(direction.y, direction.x);
        spawner.setRotation(angle);
        
        // Add slight random variation to angle
        const randomAngle = angle + Phaser.Math.FloatBetween(-0.2, 0.2);
        spawner.setRotation(randomAngle);
        
        // Store direction for later use when creating laser
        spawner.direction = new Phaser.Math.Vector2(
          Math.cos(randomAngle),
          Math.sin(randomAngle)
        ).normalize();
        
        // Add to spawners array
        this.spawners.push(spawner);
      }
      
      // Set the total number of lasers for game completion check
      this.totalLasers = this.spawners.length;
    }
    
    setupInput() {
      // Setup drag input handlers
      this.input.on('dragstart', (pointer, gameObject) => {
        if (this.isGameStarted) return; // Can't move objects after game starts
        
        // If the object is a Mirror or Absorber, call its startDrag method
        if (gameObject instanceof Mirror || gameObject instanceof Absorber) {
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
        
        // If the object is a Mirror or Absorber, call its stopDrag method
        if (gameObject instanceof Mirror || gameObject instanceof Absorber) {
          gameObject.stopDrag();
        }
      });
    }
    
    setupCollisions() {
      // Setup collision event handler
      this.matter.world.on('collisionstart', (event) => {
        // Loop through all collision pairs
        const pairs = event.pairs;
        
        for (const pair of pairs) {
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;
          
          // Check for collisions with boundaries
          if ((bodyA.label === 'boundary' && bodyB.parent.gameObject instanceof Laser) ||
              (bodyB.label === 'boundary' && bodyA.parent.gameObject instanceof Laser)) {
            // Laser hit boundary - game over!
            this.gameOver();
          }
        }
      });
    }
    
    startGame() {
      if (this.isGameStarted) return;
      
      this.isGameStarted = true;
      this.gameTime = 0;
      this.absorbedLasers = 0;
      
      // Hide start button
      this.startButton.setVisible(false);
      this.startText.setVisible(false);
      
      // Hide instructions
      this.instructionsText.setVisible(false);
      
      // Lock all mirrors and absorbers
      this.mirrors.forEach(mirror => mirror.lock());
      this.absorbers.forEach(absorber => absorber.lock());
      
      // Launch lasers from each spawner
      this.lasers = [];
      this.spawners.forEach(spawner => {
        // Create laser
        const laser = new Laser(this, spawner.x, spawner.y, spawner.direction);
        
        // Add to lasers array
        this.lasers.push(laser);
      });
    }
    
    onLaserAbsorbed(laser) {
      // Find the matching absorber
      for (const absorber of this.absorbers) {
        // Check if the laser is close to this absorber
        if (Phaser.Math.Distance.Between(laser.x, laser.y, absorber.x, absorber.y) < 30) {
          // Call absorber's absorbLaser method
          absorber.absorbLaser();
          
          // Increment absorbed lasers count
          this.absorbedLasers++;
          
          // Check if all lasers are absorbed
          if (this.absorbedLasers === this.totalLasers) {
            this.gameComplete();
          }
          
          break;
        }
      }
    }
    
    gameComplete() {
      if (!this.isGameStarted) return;
      
      // Stop the game
      this.isGameStarted = false;
      
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
      
      // Celebration effects
      this.createCompletionEffects();
    }
    
    createCompletionEffects() {
      // Add some particle effects for celebration
      const particles = this.add.particles('laser');
      
      const emitter = particles.createEmitter({
        x: 0,
        y: 0,
        speed: { min: 100, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.3, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        quantity: 1
      });
      
      // Create burst emitters at each absorber
      this.absorbers.forEach(absorber => {
        emitter.explode(20, absorber.x, absorber.y);
      });
      
      // Destroy particles after a few seconds
      this.time.delayedCall(3000, () => {
        particles.destroy();
      });
    }
    
    gameOver() {
      if (!this.isGameStarted) return;
      
      // Stop the game
      this.isGameStarted = false;
      
      // Stop all lasers
      this.lasers.forEach(laser => {
        laser.setStatic(true);
        laser.setVelocity(0, 0);
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