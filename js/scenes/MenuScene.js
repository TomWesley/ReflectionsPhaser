class MenuScene extends Phaser.Scene {
    constructor() {
      super({ key: 'MenuScene' });
    }
  
    preload() {
      // Load all game assets
      this.load.image('mirror1', 'assets/images/mirror1.png');
      this.load.image('mirror2', 'assets/images/mirror2.png');
      this.load.image('mirror3', 'assets/images/mirror3.png');
      this.load.image('mirror4', 'assets/images/mirror4.png');
      this.load.image('laser', 'assets/images/laser.png');
      this.load.image('spawner', 'assets/images/spawner.png');
      
      // Load fonts and UI elements
      this.load.image('button', 'assets/images/button.png');
      
      // Show loading progress
      const progressBar = this.add.graphics();
      const progressBox = this.add.graphics();
      progressBox.fillStyle(0x222222, 0.8);
      progressBox.fillRect(240, 270, 320, 50);
      
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const loadingText = this.make.text({
        x: width / 2,
        y: height / 2 - 50,
        text: 'Loading...',
        style: {
          font: '20px monospace',
          fill: '#ffffff'
        }
      });
      loadingText.setOrigin(0.5, 0.5);
      
      const percentText = this.make.text({
        x: width / 2,
        y: height / 2 - 5,
        text: '0%',
        style: {
          font: '18px monospace',
          fill: '#ffffff'
        }
      });
      percentText.setOrigin(0.5, 0.5);
      
      this.load.on('progress', function (value) {
        percentText.setText(parseInt(value * 100) + '%');
        progressBar.clear();
        progressBar.fillStyle(0xffffff, 1);
        progressBar.fillRect(250, 280, 300 * value, 30);
      });
      
      this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
        percentText.destroy();
      });
    }
  
    create() {
      // Store UI elements for resize
      this.uiElements = {};
      
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Detect if mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Background with subtle pattern
      this.uiElements.background = this.add.rectangle(0, 0, width, height, 0x000033).setOrigin(0);
      
      // Add some floating mirrors in the background for visual effect
      this.backgroundElements = [];
      this.createBackgroundElements();
      
      // Scale factor for mobile
      const scaleFactor = Math.min(width / 800, height / 600);
      const mobileMultiplier = isMobile ? 1.2 : 1;
      
      // Title text
      const titleFontSize = Math.max(32, 64 * scaleFactor) * mobileMultiplier;
      this.uiElements.titleText = this.add.text(width / 2, height / 4, 'REFLECTION', {
        fontFamily: 'Arial',
        fontSize: titleFontSize,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6 * scaleFactor
      }).setOrigin(0.5);
      
      // Subtitle
      const subtitleFontSize = Math.max(16, 24 * scaleFactor) * mobileMultiplier;
      this.uiElements.subtitleText = this.add.text(width / 2, height / 4 + 70 * scaleFactor, 'A puzzle of light and mirrors', {
        fontFamily: 'Arial',
        fontSize: subtitleFontSize,
        color: '#aaaaff'
      }).setOrigin(0.5);
      
      // Button dimensions - larger on mobile
      const buttonWidth = Math.max(200, 200 * scaleFactor) * (isMobile ? 1.5 : 1);
      const buttonHeight = Math.max(60, 60 * scaleFactor) * (isMobile ? 1.3 : 1);
      const buttonFontSize = Math.max(20, 32 * scaleFactor) * mobileMultiplier;
      
      // Play button
      this.uiElements.playButton = this.add.rectangle(width / 2, height / 2 + 50 * scaleFactor, buttonWidth, buttonHeight, 0x4444ff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.startGame())
        .on('pointerover', () => this.uiElements.playButton.fillColor = 0x6666ff)
        .on('pointerout', () => this.uiElements.playButton.fillColor = 0x4444ff);
      
      this.uiElements.playText = this.add.text(width / 2, height / 2 + 50 * scaleFactor, 'PLAY', {
        fontFamily: 'Arial',
        fontSize: buttonFontSize,
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      // Leaderboard button
      this.uiElements.leaderboardButton = this.add.rectangle(width / 2, height / 2 + 130 * scaleFactor, buttonWidth * 1.5, buttonHeight, 0x444477, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('LeaderboardScene'))
        .on('pointerover', () => this.uiElements.leaderboardButton.fillColor = 0x5555aa)
        .on('pointerout', () => this.uiElements.leaderboardButton.fillColor = 0x444477);
      
      const leaderboardFontSize = Math.max(18, 28 * scaleFactor) * mobileMultiplier;
      this.uiElements.leaderboardText = this.add.text(width / 2, height / 2 + 130 * scaleFactor, 'LEADERBOARD', {
        fontFamily: 'Arial',
        fontSize: leaderboardFontSize,
        color: '#ffffff'
      }).setOrigin(0.5);
      
      // Credits text
      const creditsFontSize = Math.max(12, 14 * scaleFactor);
      this.uiElements.creditsText = this.add.text(width / 2, height - 30 * scaleFactor, '© 2025 Your Name - All Rights Reserved', {
        fontFamily: 'Arial',
        fontSize: creditsFontSize,
        color: '#888888'
      }).setOrigin(0.5);
      
      // Add animation to title
      this.tweens.add({
        targets: this.uiElements.titleText,
        y: this.uiElements.titleText.y - 10 * scaleFactor,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      // Add animation to the play button
      this.tweens.add({
        targets: [this.uiElements.playButton, this.uiElements.playText],
        scale: 1.05,
        duration: 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      // Handle resize
      this.scale.on('resize', (gameSize) => this.handleResize(gameSize));
    }
    
    handleResize(gameSize) {
      const width = gameSize.width;
      const height = gameSize.height;
      
      // Re-center camera
      this.cameras.main.setSize(width, height);
      this.cameras.main.centerToBounds();
      
      // Detect if mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Update background
      this.uiElements.background.setSize(width, height);
      
      // Recalculate scale factors
      const scaleFactor = Math.min(width / 800, height / 600);
      const mobileMultiplier = isMobile ? 1.2 : 1;
      
      // Update title
      const titleFontSize = Math.max(32, 64 * scaleFactor) * mobileMultiplier;
      this.uiElements.titleText.setPosition(width / 2, height / 4);
      this.uiElements.titleText.setFontSize(titleFontSize);
      
      // Update subtitle
      const subtitleFontSize = Math.max(16, 24 * scaleFactor) * mobileMultiplier;
      this.uiElements.subtitleText.setPosition(width / 2, height / 4 + 70 * scaleFactor);
      this.uiElements.subtitleText.setFontSize(subtitleFontSize);
      
      // Update buttons
      const buttonWidth = Math.max(200, 200 * scaleFactor) * (isMobile ? 1.5 : 1);
      const buttonHeight = Math.max(60, 60 * scaleFactor) * (isMobile ? 1.3 : 1);
      const buttonFontSize = Math.max(20, 32 * scaleFactor) * mobileMultiplier;
      const leaderboardFontSize = Math.max(18, 28 * scaleFactor) * mobileMultiplier;
      
      this.uiElements.playButton.setPosition(width / 2, height / 2 + 50 * scaleFactor);
      this.uiElements.playButton.setSize(buttonWidth, buttonHeight);
      this.uiElements.playText.setPosition(width / 2, height / 2 + 50 * scaleFactor);
      this.uiElements.playText.setFontSize(buttonFontSize);
      
      this.uiElements.leaderboardButton.setPosition(width / 2, height / 2 + 130 * scaleFactor);
      this.uiElements.leaderboardButton.setSize(buttonWidth * 1.5, buttonHeight);
      this.uiElements.leaderboardText.setPosition(width / 2, height / 2 + 130 * scaleFactor);
      this.uiElements.leaderboardText.setFontSize(leaderboardFontSize);
      
      // Update credits
      const creditsFontSize = Math.max(12, 14 * scaleFactor);
      this.uiElements.creditsText.setPosition(width / 2, height - 30 * scaleFactor);
      this.uiElements.creditsText.setFontSize(creditsFontSize);
      
      // Recreate background elements
      this.backgroundElements.forEach(element => element.destroy());
      this.backgroundElements = [];
      this.createBackgroundElements();
    }
    
    createBackgroundElements() {
      // Add decorative mirrors and lasers in the background
      for (let i = 0; i < 20; i++) {
        const x = Phaser.Math.Between(0, this.cameras.main.width);
        const y = Phaser.Math.Between(0, this.cameras.main.height);
        const size = Phaser.Math.Between(20, 50) / 100;
        const type = Phaser.Math.Between(1, 4);
        
        const mirror = this.add.image(x, y, `mirror${type}`)
          .setScale(size)
          .setAlpha(0.3)
          .setRotation(Phaser.Math.Between(0, 360) * Math.PI / 180);
        
        // Add subtle rotation animation
        this.tweens.add({
          targets: mirror,
          rotation: mirror.rotation + Math.PI * 2,
          duration: Phaser.Math.Between(15000, 30000),
          repeat: -1
        });
        
        this.backgroundElements.push(mirror);
      }
      
      // Add some laser beams
      for (let i = 0; i < 5; i++) {
        const startX = Phaser.Math.Between(0, this.cameras.main.width);
        const startY = Phaser.Math.Between(0, this.cameras.main.height);
        const length = Phaser.Math.Between(100, 300);
        const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
        
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        
        const line = this.add.line(0, 0, startX, startY, endX, endY, 0x00ffff, 0.2)
          .setLineWidth(2)
          .setOrigin(0, 0);
        
        // Add pulse animation
        this.tweens.add({
          targets: line,
          alpha: { from: 0.1, to: 0.4 },
          duration: Phaser.Math.Between(1000, 3000),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
        
        this.backgroundElements.push(line);
      }
    }
    
    startGame() {
      // Add a simple fade transition
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    }
  }