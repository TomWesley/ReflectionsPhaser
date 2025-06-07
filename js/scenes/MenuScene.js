class MenuScene extends Phaser.Scene {
    constructor() {
      super({ key: 'MenuScene' });
      
      // NYT-style color palette
      this.colors = {
        background: 0xfafafa,
        surface: 0xffffff,
        primary: 0x1a1a1a,
        secondary: 0x6c757d,
        accent: 0x121212,
        border: 0xe5e7eb,
        shadow: 0x000000
      };
    }
  
    preload() {
      // Show elegant loading screen
      this.showLoadingScreen();
      
      // Load game assets (using placeholder data since we don't have actual images)
      this.load.image('mirror1', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMxYTFhMWEiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K');
      this.load.image('mirror2', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBvbHlnb24gcG9pbnRzPSIyMCw1IDM1LDM1IDUsMzUiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=');
      this.load.image('mirror3', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=');
      this.load.image('mirror4', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBvbHlnb24gcG9pbnRzPSIxMCw1IDMwLDUgMzUsMzUgNSwzNSIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjMWExYTFhIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+Cg==');
      this.load.image('laser', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iNCIgdmlld0JveD0iMCAwIDIwIDQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWExYTFhIi8+Cjwvc3ZnPgo=');
      this.load.image('spawner', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBvbHlnb24gcG9pbnRzPSIxMCwyIDMsMTggMTcsMTgiIGZpbGw9IiMxYTFhMWEiLz4KPC9zdmc+Cg==');
      this.load.image('button', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiByeD0iOCIgZmlsbD0iIzFhMWExYSIvPgo8L3N2Zz4K');
    }
    
    showLoadingScreen() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Clean loading background
      this.add.rectangle(0, 0, width, height, this.colors.background).setOrigin(0);
      
      // Loading container
      const loadingContainer = this.add.container(width / 2, height / 2);
      
      // Progress container
      const progressContainer = this.add.container(0, 0);
      
      // Progress background
      const progressBg = this.add.graphics();
      progressBg.fillStyle(this.colors.border, 1);
      progressBg.fillRoundedRect(-150, -3, 300, 6, 3);
      
      // Progress bar
      const progressBar = this.add.graphics();
      
      // Loading text
      const loadingText = this.add.text(0, -40, 'Loading', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '18px',
        fontWeight: '500',
        color: '#1a1a1a',
        align: 'center'
      }).setOrigin(0.5);
      
      progressContainer.add([progressBg, progressBar]);
      loadingContainer.add([loadingText, progressContainer]);
      
      // Progress tracking
      this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(this.colors.primary, 1);
        progressBar.fillRoundedRect(-150, -3, 300 * value, 6, 3);
        
        loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
      });
      
      this.load.on('complete', () => {
        loadingContainer.destroy();
      });
    }
  
    create() {
      // Initialize scaling manager for menu
      this.scalingManager = new ScalingManager(this);
      
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Clean gradient background
      this.createBackground();
      
      // Add subtle decorative elements
      this.createBackgroundElements();
      
      // Calculate responsive sizing
      const scaleFactor = this.scalingManager.scaleFactor;
      const responsiveScale = this.scalingManager.responsiveScale;
      
      // Title section
      this.createTitleSection(width, height, scaleFactor, responsiveScale);
      
      // Button section
      this.createButtonSection(width, height, scaleFactor, responsiveScale);
      
      // Footer
      this.createFooter(width, height, scaleFactor);
      
      // Handle resize
      this.scale.on('resize', this.handleResize, this);
      
      // Listen for scale changes
      this.events.on('scale-changed', this.onScaleChanged, this);
    }
    
    createBackground() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Clean background
      this.backgroundGraphics = this.add.graphics();
      this.backgroundGraphics.fillStyle(this.colors.background, 1);
      this.backgroundGraphics.fillRect(0, 0, width, height);
    }
    
    createTitleSection(width, height, scaleFactor, responsiveScale) {
      // Title container
      this.titleContainer = this.add.container(width / 2, height * 0.3);
      
      // Main title
      const titleFontSize = this.scalingManager.getFontSize('display');
      this.titleText = this.add.text(0, 0, 'Reflection', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${titleFontSize}px`,
        fontWeight: '700',
        color: '#1a1a1a',
        align: 'center'
      }).setOrigin(0.5);
      
      // Subtitle
      const subtitleFontSize = this.scalingManager.getFontSize('large');
      this.subtitleText = this.add.text(0, titleFontSize * 0.8, 'Guide light through mirrors', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${subtitleFontSize}px`,
        fontWeight: '400',
        color: '#6c757d',
        align: 'center'
      }).setOrigin(0.5);
      
      this.titleContainer.add([this.titleText, this.subtitleText]);
      
      // Subtle animation
      this.tweens.add({
        targets: this.titleContainer,
        y: this.titleContainer.y - this.scalingManager.getSpacing('xs'),
        duration: 3000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
    
    createButtonSection(width, height, scaleFactor, responsiveScale) {
      // Button container
      this.buttonContainer = this.add.container(width / 2, height * 0.6);
      
      // Button dimensions
      const buttonWidth = this.scalingManager.getTouchSize(220, 'optimal');
      const buttonHeight = this.scalingManager.getTouchSize(56, 'optimal');
      const buttonSpacing = this.scalingManager.getSpacing('lg');
      
      // Play button
      this.playButton = this.createButton(
        0, 0,
        buttonWidth, buttonHeight,
        'Play Game',
        this.colors.primary,
        () => this.startGame()
      );
      
      // Leaderboard button  
      this.leaderboardButton = this.createButton(
        0, buttonHeight + buttonSpacing,
        buttonWidth * 1.2, buttonHeight,
        'Leaderboard',
        this.colors.secondary,
        () => this.scene.start('LeaderboardScene')
      );
      
      this.buttonContainer.add([...this.playButton, ...this.leaderboardButton]);
      
      // Gentle pulse animation for play button
      this.tweens.add({
        targets: this.playButton[0], // The button background
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
    
    createButton(x, y, width, height, text, color, callback) {
      // Button background
      const bg = this.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(x - width/2, y - height/2, width, height, this.scalingManager.getBorderRadius('md'));
      
      // Button interactive area
      const button = this.add.rectangle(x, y, width, height, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback)
        .on('pointerover', () => {
          bg.clear();
          bg.fillStyle(color, 0.9);
          bg.fillRoundedRect(x - width/2, y - height/2, width, height, this.scalingManager.getBorderRadius('md'));
          
          // Subtle scale effect
          this.tweens.add({
            targets: [bg, btnText],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 150,
            ease: 'Cubic.out'
          });
        })
        .on('pointerout', () => {
          bg.clear();
          bg.fillStyle(color, 1);
          bg.fillRoundedRect(x - width/2, y - height/2, width, height, this.scalingManager.getBorderRadius('md'));
          
          // Reset scale
          this.tweens.add({
            targets: [bg, btnText],
            scaleX: 1,
            scaleY: 1,
            duration: 150,
            ease: 'Cubic.out'
          });
        });
      
      // Button text
      const fontSize = this.scalingManager.getFontSize('medium');
      const btnText = this.add.text(x, y, text, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: '500',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);
      
      return [bg, button, btnText];
    }
    
    createFooter(width, height, scaleFactor) {
      // Footer container
      this.footerContainer = this.add.container(width / 2, height * 0.9);
      
      // Credits text
      const creditsFontSize = this.scalingManager.getFontSize('small');
      this.creditsText = this.add.text(0, 0, '© 2025 Reflection Game', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${creditsFontSize}px`,
        fontWeight: '400',
        color: '#9ca3af',
        align: 'center'
      }).setOrigin(0.5);
      
      this.footerContainer.add([this.creditsText]);
    }
    
    createBackgroundElements() {
      // Add subtle decorative mirrors in background
      const elementCount = this.scalingManager.isMobile ? 8 : 15;
      
      for (let i = 0; i < elementCount; i++) {
        const x = Phaser.Math.Between(0, this.cameras.main.width);
        const y = Phaser.Math.Between(0, this.cameras.main.height);
        const size = this.scalingManager.getScaledValue(Phaser.Math.Between(15, 30));
        const type = Phaser.Math.Between(1, 4);
        
        const mirror = this.add.image(x, y, `mirror${type}`)
          .setScale(size / 40) // Base size is 40px
          .setAlpha(0.08)
          .setTint(this.colors.secondary)
          .setRotation(Phaser.Math.Between(0, 360) * Math.PI / 180);
        
        // Very slow rotation animation
        this.tweens.add({
          targets: mirror,
          rotation: mirror.rotation + Math.PI * 2,
          duration: Phaser.Math.Between(30000, 60000),
          repeat: -1
        });
      }
      
      // Add some subtle geometric lines
      this.createGeometricLines();
    }
    
    createGeometricLines() {
      const lineCount = this.scalingManager.isMobile ? 3 : 6;
      
      for (let i = 0; i < lineCount; i++) {
        const startX = Phaser.Math.Between(0, this.cameras.main.width);
        const startY = Phaser.Math.Between(0, this.cameras.main.height);
        const length = this.scalingManager.getScaledValue(Phaser.Math.Between(80, 200));
        const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
        
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        
        const line = this.add.line(0, 0, startX, startY, endX, endY, this.colors.border, 0.3)
          .setLineWidth(1)
          .setOrigin(0, 0);
        
        // Subtle opacity animation
        this.tweens.add({
          targets: line,
          alpha: { from: 0.1, to: 0.4 },
          duration: Phaser.Math.Between(4000, 8000),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      }
    }
    
    handleResize(gameSize, baseSize, displaySize, resolution) {
      // Update scaling manager
      this.scalingManager.handleResize();
      
      // Re-center camera
      this.cameras.main.centerOn(gameSize.width / 2, gameSize.height / 2);
      
      // Trigger scale change event
      this.scalingManager.notifyScaleChange();
    }
    
    onScaleChanged(scaleData) {
      // Update all elements with new scale
      this.updateElementSizes();
    }
    
    updateElementSizes() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Update background
      if (this.backgroundGraphics) {
        this.backgroundGraphics.clear();
        this.backgroundGraphics.fillStyle(this.colors.background, 1);
        this.backgroundGraphics.fillRect(0, 0, width, height);
      }
      
      // Update title section
      if (this.titleContainer) {
        this.titleContainer.setPosition(width / 2, height * 0.3);
        
        const titleFontSize = this.scalingManager.getFontSize('display');
        const subtitleFontSize = this.scalingManager.getFontSize('large');
        
        this.titleText.setFontSize(titleFontSize);
        this.subtitleText.setFontSize(subtitleFontSize);
        this.subtitleText.setPosition(0, titleFontSize * 0.8);
      }
      
      // Update button section
      if (this.buttonContainer) {
        this.buttonContainer.setPosition(width / 2, height * 0.6);
        
        // Would need to recreate buttons with new sizes
        // For simplicity, this could trigger a scene restart if needed
      }
      
      // Update footer
      if (this.footerContainer) {
        this.footerContainer.setPosition(width / 2, height * 0.9);
        
        const creditsFontSize = this.scalingManager.getFontSize('small');
        this.creditsText.setFontSize(creditsFontSize);
      }
    }
    
    startGame() {
      // Smooth transition to game
      this.cameras.main.fadeOut(400, 250, 250, 250);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    }
    
    destroy() {
      // Clean up listeners
      this.scale.off('resize', this.handleResize, this);
      this.events.off('scale-changed', this.onScaleChanged, this);
      
      // Clean up scaling manager
      if (this.scalingManager) {
        this.scalingManager.destroy();
      }
    }
  }