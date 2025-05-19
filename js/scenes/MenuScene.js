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
      this.load.image('absorber', 'assets/images/absorber.png');
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
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Background with subtle pattern
      this.add.rectangle(0, 0, width, height, 0x000033).setOrigin(0);
      
      // Add some floating mirrors in the background for visual effect
      this.createBackgroundElements();
      
      // Title text
      const titleText = this.add.text(width / 2, height / 4, 'REFLECTION', {
        fontFamily: 'Arial',
        fontSize: 64,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6
      }).setOrigin(0.5);
      
      // Subtitle
      const subtitleText = this.add.text(width / 2, height / 4 + 70, 'A puzzle of light and mirrors', {
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#aaaaff'
      }).setOrigin(0.5);
      
      // Play button
      const playButton = this.add.rectangle(width / 2, height / 2 + 50, 200, 60, 0x4444ff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.startGame())
        .on('pointerover', () => playButton.fillColor = 0x6666ff)
        .on('pointerout', () => playButton.fillColor = 0x4444ff);
      
      const playText = this.add.text(width / 2, height / 2 + 50, 'PLAY', {
        fontFamily: 'Arial',
        fontSize: 32,
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      // Leaderboard button
      const leaderboardButton = this.add.rectangle(width / 2, height / 2 + 130, 300, 60, 0x444477, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('LeaderboardScene'))
        .on('pointerover', () => leaderboardButton.fillColor = 0x5555aa)
        .on('pointerout', () => leaderboardButton.fillColor = 0x444477);
      
      const leaderboardText = this.add.text(width / 2, height / 2 + 130, 'LEADERBOARD', {
        fontFamily: 'Arial',
        fontSize: 28,
        color: '#ffffff'
      }).setOrigin(0.5);
      
      // Credits text
      const creditsText = this.add.text(width / 2, height - 30, '© 2025 Your Name - All Rights Reserved', {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#888888'
      }).setOrigin(0.5);
      
      // Add animation to title
      this.tweens.add({
        targets: titleText,
        y: titleText.y - 10,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      // Add animation to the play button
      this.tweens.add({
        targets: [playButton, playText],
        scale: 1.05,
        duration: 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
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