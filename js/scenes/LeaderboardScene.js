class LeaderboardScene extends Phaser.Scene {
    constructor() {
      super({ key: 'LeaderboardScene' });
      
      // NYT-style color palette
      this.colors = {
        background: 0xfafafa,
        surface: 0xffffff,
        primary: 0x1a1a1a,
        secondary: 0x6c757d,
        accent: 0x121212,
        border: 0xe5e7eb,
        success: 0x4ade80,
        warning: 0xf59e0b,
        shadow: 0x000000
      };
      
      // Default values
      this.scores = [];
      this.isLoading = true;
      this.errorMessage = null;
    }
    
    create() {
      // Initialize scaling manager
      this.scalingManager = new ScalingManager(this);
      
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Create clean background
      this.createBackground();
      
      // Create header section
      this.createHeader();
      
      // Create loading state
      this.createLoadingState();
      
      // Create content container
      this.createContentContainer();
      
      // Create back button
      this.createBackButton();
      
      // Handle resize
      this.scale.on('resize', this.handleResize, this);
      
      // Load scores from Firebase
      this.loadScores();
      
      // Add subtle decorative elements
      this.createBackgroundElements();
      
      // Smooth fade in
      this.cameras.main.fadeIn(600, 250, 250, 250);
    }
    
    createBackground() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Clean gradient background
      this.backgroundGraphics = this.add.graphics();
      this.backgroundGraphics.fillStyle(this.colors.background, 1);
      this.backgroundGraphics.fillRect(0, 0, width, height);
    }
    
    createHeader() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Header container
      this.headerContainer = this.add.container(width / 2, height * 0.15);
      
      // Main title
      const titleFontSize = this.scalingManager.getFontSize('display');
      this.titleText = this.add.text(0, 0, 'Leaderboard', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${titleFontSize}px`,
        fontWeight: '700',
        color: '#1a1a1a',
        align: 'center'
      }).setOrigin(0.5);
      
      // Subtitle
      const subtitleFontSize = this.scalingManager.getFontSize('medium');
      this.subtitleText = this.add.text(0, titleFontSize * 0.7, 'Fastest completion times', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${subtitleFontSize}px`,
        fontWeight: '400',
        color: '#6c757d',
        align: 'center'
      }).setOrigin(0.5);
      
      this.headerContainer.add([this.titleText, this.subtitleText]);
    }
    
    createLoadingState() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Loading container
      this.loadingContainer = this.add.container(width / 2, height / 2);
      
      // Loading text
      this.loadingText = this.add.text(0, 0, 'Loading scores...', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scalingManager.getFontSize('large')}px`,
        fontWeight: '400',
        color: '#6c757d',
        align: 'center'
      }).setOrigin(0.5);
      
      // Loading animation - simple dots
      this.loadingDots = this.add.text(0, this.scalingManager.getSpacing('lg'), '●', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scalingManager.getFontSize('medium')}px`,
        color: '#6c757d',
        align: 'center'
      }).setOrigin(0.5);
      
      this.loadingContainer.add([this.loadingText, this.loadingDots]);
      
      // Animate loading dots
      this.tweens.add({
        targets: this.loadingDots,
        alpha: { from: 1, to: 0.3 },
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
    
    createContentContainer() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Content container for scores
      this.contentContainer = this.add.container(width / 2, height * 0.45);
      this.contentContainer.setVisible(false);
    }
    
    createBackButton() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Button container
      this.buttonContainer = this.add.container(width / 2, height * 0.9);
      
      // Button dimensions
      const buttonWidth = this.scalingManager.getTouchSize(180, 'optimal');
      const buttonHeight = this.scalingManager.getTouchSize(48, 'optimal');
      
      // Button background
      const buttonBg = this.add.graphics();
      buttonBg.lineStyle(1, this.colors.border, 1);
      buttonBg.strokeRoundedRect(
        -buttonWidth/2, -buttonHeight/2, 
        buttonWidth, buttonHeight, 
        this.scalingManager.getBorderRadius('md')
      );
      
      // Button interactive area
      const button = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.backToMenu())
        .on('pointerover', () => {
          buttonBg.clear();
          buttonBg.fillStyle(this.colors.background, 1);
          buttonBg.fillRoundedRect(
            -buttonWidth/2, -buttonHeight/2, 
            buttonWidth, buttonHeight, 
            this.scalingManager.getBorderRadius('md')
          );
          buttonBg.lineStyle(1, this.colors.border, 1);
          buttonBg.strokeRoundedRect(
            -buttonWidth/2, -buttonHeight/2, 
            buttonWidth, buttonHeight, 
            this.scalingManager.getBorderRadius('md')
          );
        })
        .on('pointerout', () => {
          buttonBg.clear();
          buttonBg.lineStyle(1, this.colors.border, 1);
          buttonBg.strokeRoundedRect(
            -buttonWidth/2, -buttonHeight/2, 
            buttonWidth, buttonHeight, 
            this.scalingManager.getBorderRadius('md')
          );
        });
      
      // Button text
      const buttonText = this.add.text(0, 0, 'Back to Menu', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scalingManager.getFontSize('medium')}px`,
        fontWeight: '500',
        color: '#1a1a1a',
        align: 'center'
      }).setOrigin(0.5);
      
      this.buttonContainer.add([buttonBg, button, buttonText]);
    }
    
    loadScores() {
      // Simulate loading for demo (replace with actual Firebase call)
      this.time.delayedCall(1500, () => {
        try {
          // Mock data for demo
          this.scores = [
            { name: 'Alex Chen', score: 12.543, timestamp: new Date() },
            { name: 'Sarah Kim', score: 15.234, timestamp: new Date() },
            { name: 'Mike Johnson', score: 18.765, timestamp: new Date() },
            { name: 'Emma Davis', score: 22.123, timestamp: new Date() },
            { name: 'David Wilson', score: 25.678, timestamp: new Date() }
          ];
          
          this.isLoading = false;
          this.displayScores();
        } catch (error) {
          console.error("Error loading scores:", error);
          this.isLoading = false;
          this.errorMessage = "Unable to load scores. Please try again.";
          this.displayScores();
        }
      });
      
      // If Firebase is available, use this instead:
      /*
      if (typeof getTopScores === 'function') {
        getTopScores(10)
          .then(scores => {
            this.scores = scores;
            this.isLoading = false;
            this.displayScores();
          })
          .catch(error => {
            console.error("Error loading scores:", error);
            this.isLoading = false;
            this.errorMessage = "Unable to load scores. Please try again.";
            this.displayScores();
          });
      } else {
        this.isLoading = false;
        this.errorMessage = "Leaderboard not available.";
        this.displayScores();
      }
      */
    }
    
    displayScores() {
      // Hide loading state
      this.loadingContainer.setVisible(false);
      
      // Clear content container
      this.contentContainer.removeAll(true);
      
      // Show content container
      this.contentContainer.setVisible(true);
      
      if (this.errorMessage) {
        this.displayError();
        return;
      }
      
      if (this.scores.length === 0) {
        this.displayEmptyState();
        return;
      }
      
      // Create scores display
      this.createScoresDisplay();
      
      // Animate in
      this.contentContainer.setAlpha(0);
      this.tweens.add({
        targets: this.contentContainer,
        alpha: 1,
        duration: 400,
        ease: 'Cubic.out'
      });
    }
    
    displayError() {
      const errorText = this.add.text(0, 0, this.errorMessage, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scalingManager.getFontSize('medium')}px`,
        fontWeight: '400',
        color: '#ef4444',
        align: 'center'
      }).setOrigin(0.5);
      
      this.contentContainer.add(errorText);
    }
    
    displayEmptyState() {
      const emptyText = this.add.text(0, 0, 'No scores yet.\nBe the first to play!', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scalingManager.getFontSize('medium')}px`,
        fontWeight: '400',
        color: '#6c757d',
        align: 'center',
        lineSpacing: this.scalingManager.getSpacing('xs')
      }).setOrigin(0.5);
      
      this.contentContainer.add(emptyText);
    }
    
    createScoresDisplay() {
      // Card background
      const cardWidth = Math.min(
        this.scalingManager.getScaledValue(500), 
        this.cameras.main.width * 0.9
      );
      const rowHeight = this.scalingManager.getTouchSize(48, 'minimum');
      const cardHeight = (this.scores.length + 1) * rowHeight + this.scalingManager.getSpacing('lg');
      
      const cardBg = this.add.graphics();
      cardBg.fillStyle(this.colors.surface, 1);
      cardBg.fillRoundedRect(
        -cardWidth/2, -cardHeight/2, 
        cardWidth, cardHeight, 
        this.scalingManager.getBorderRadius('lg')
      );
      cardBg.lineStyle(1, this.colors.border, 0.5);
      cardBg.strokeRoundedRect(
        -cardWidth/2, -cardHeight/2, 
        cardWidth, cardHeight, 
        this.scalingManager.getBorderRadius('lg')
      );
      
      this.contentContainer.add(cardBg);
      
      // Header row
      this.createHeaderRow(-cardHeight/2 + this.scalingManager.getSpacing('md'), cardWidth);
      
      // Score rows
      this.scores.forEach((score, index) => {
        const y = -cardHeight/2 + this.scalingManager.getSpacing('md') + (index + 1) * rowHeight;
        this.createScoreRow(score, index, y, cardWidth);
      });
    }
    
    createHeaderRow(y, cardWidth) {
      const fontSize = this.scalingManager.getFontSize('small');
      
      // Rank header
      const rankHeader = this.add.text(-cardWidth/2 + this.scalingManager.getSpacing('lg'), y, 'Rank', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: '600',
        color: '#6c757d',
        align: 'left'
      }).setOrigin(0, 0.5);
      
      // Name header
      const nameHeader = this.add.text(-cardWidth/4, y, 'Player', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: '600',
        color: '#6c757d',
        align: 'left'
      }).setOrigin(0, 0.5);
      
      // Time header
      const timeHeader = this.add.text(cardWidth/2 - this.scalingManager.getSpacing('lg'), y, 'Time', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: '600',
        color: '#6c757d',
        align: 'right'
      }).setOrigin(1, 0.5);
      
      this.contentContainer.add([rankHeader, nameHeader, timeHeader]);
    }
    
    createScoreRow(score, index, y, cardWidth) {
      const fontSize = this.scalingManager.getFontSize('medium');
      const isTopThree = index < 3;
      const textColor = isTopThree ? '#1a1a1a' : '#6c757d';
      
      // Row background for alternating colors
      if (index % 2 === 0) {
        const rowBg = this.add.graphics();
        rowBg.fillStyle(this.colors.background, 0.5);
        rowBg.fillRect(
          -cardWidth/2 + this.scalingManager.getSpacing('xs'), 
          y - this.scalingManager.getSpacing('sm'), 
          cardWidth - this.scalingManager.getSpacing('xs') * 2, 
          this.scalingManager.getTouchSize(48, 'minimum')
        );
        this.contentContainer.add(rowBg);
      }
      
      // Rank with trophy for top 3
      let rankText = `${index + 1}`;
      if (index === 0) rankText = '🥇';
      else if (index === 1) rankText = '🥈';
      else if (index === 2) rankText = '🥉';
      
      const rank = this.add.text(-cardWidth/2 + this.scalingManager.getSpacing('lg'), y, rankText, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: isTopThree ? '600' : '400',
        color: textColor,
        align: 'left'
      }).setOrigin(0, 0.5);
      
      // Player name (truncate if too long)
      let displayName = score.name || 'Anonymous';
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 12) + '...';
      }
      
      const name = this.add.text(-cardWidth/4, y, displayName, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: isTopThree ? '500' : '400',
        color: textColor,
        align: 'left'
      }).setOrigin(0, 0.5);
      
      // Score (time)
      const time = this.add.text(cardWidth/2 - this.scalingManager.getSpacing('lg'), y, `${score.score.toFixed(3)}s`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: isTopThree ? '600' : '400',
        color: textColor,
        align: 'right'
      }).setOrigin(1, 0.5);
      
      this.contentContainer.add([rank, name, time]);
    }
    
    createBackgroundElements() {
      // Add subtle decorative elements
      const elementCount = this.scalingManager.isMobile ? 5 : 10;
      
      for (let i = 0; i < elementCount; i++) {
        const x = Phaser.Math.Between(0, this.cameras.main.width);
        const y = Phaser.Math.Between(0, this.cameras.main.height);
        const size = this.scalingManager.getScaledValue(Phaser.Math.Between(10, 20));
        
        const element = this.add.circle(x, y, size, this.colors.border, 0.1);
        
        // Very slow animation
        this.tweens.add({
          targets: element,
          y: element.y + this.scalingManager.getSpacing('sm'),
          duration: Phaser.Math.Between(8000, 15000),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      }
    }
    
    handleResize(gameSize, baseSize, displaySize, resolution) {
      // Major resizes are handled by page reload in main.js  
      // Just update scaling manager for minor adjustments
      if (this.scalingManager) {
        this.scalingManager.handleResize();
      }
      
      // Re-center camera
      this.cameras.main.centerOn(gameSize.width / 2, gameSize.height / 2);
    }
    
    backToMenu() {
      // Mark that user explicitly navigated to menu
      if (window.gameSceneState) {
        window.gameSceneState.save();
      }
      
      // Clean transition
      this.cameras.main.fadeOut(400, 250, 250, 250);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    }
    
    destroy() {
      // Clean up listeners
      this.scale.off('resize', this.handleResize, this);
      
      // Clean up scaling manager
      if (this.scalingManager) {
        this.scalingManager.destroy();
      }
    }
  }