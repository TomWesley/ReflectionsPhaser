class GameUI {
    constructor(scene, scalingManager) {
      this.scene = scene;
      this.scaling = scalingManager;
      
      // NYT-style color palette
      this.colors = {
        primary: 0x1a1a1a,
        secondary: 0x6c757d,
        surface: 0xffffff,
        background: 0xfafafa,
        border: 0xe5e7eb,
        success: 0x4ade80,
        error: 0xef4444,
        warning: 0xf59e0b,
        accent: 0x121212
      };
      
      // UI element references
      this.elements = {};
      
      // Create all UI elements
      this.createUI();
      
      // Listen for scale changes
      this.scene.events.on('scale-changed', this.onScaleChanged, this);
    }
    
    createUI() {
      this.createHeader();
      this.createFooter();
      this.createCompletionPanel();
      this.createGameOverPanel();
    }
    
    createHeader() {
      const { screenWidth, headerHeight, sideMargin, uiPositions } = this.scaling;
      
      // Header card background
      this.elements.headerBg = this.scene.add.graphics();
      this.drawHeaderBackground();
      
      // Timer text - clean monospace style
      this.elements.timerText = this.scene.add.text(
        uiPositions.centerX, 
        uiPositions.headerY, 
        '00:00.000', 
        {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: `${this.scaling.getFontSize('xlarge')}px`,
          fontWeight: '600',
          color: '#1a1a1a',
          stroke: 'transparent',
          strokeThickness: 0
        }
      ).setOrigin(0.5).setAlpha(1);
      
      // Instructions text - clean and minimal
      this.elements.instructionsText = this.scene.add.text(
        uiPositions.centerX,
        uiPositions.headerY - this.scaling.getSpacing('lg'),
        'Position mirrors to guide the beam to the target',
        {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: `${this.scaling.getFontSize('medium')}px`,
          fontWeight: '400',
          color: '#6c757d',
          align: 'center'
        }
      ).setOrigin(0.5);
    }
    
    createFooter() {
      const { screenWidth, footerHeight, sideMargin, uiPositions } = this.scaling;
      
      // Footer background
      this.elements.footerBg = this.scene.add.graphics();
      this.drawFooterBackground();
      
      // Button dimensions - optimal touch targets
      const buttonWidth = this.scaling.getTouchSize(180, 'optimal');
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      const homeButtonWidth = this.scaling.getTouchSize(100, 'optimal');
      
      // Start button - NYT style
      this.elements.startButtonBg = this.scene.add.graphics();
      this.drawStartButton();
      
      // Start button interactive area
      this.elements.startButton = this.scene.add.rectangle(
        uiPositions.centerX,
        uiPositions.footerY,
        buttonWidth,
        buttonHeight,
        0x000000, 0
      )
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onStartClick())
      .on('pointerover', () => this.onStartHover())
      .on('pointerout', () => this.onStartOut());
      
      this.elements.startText = this.scene.add.text(
        uiPositions.centerX,
        uiPositions.footerY,
        'Start Game',
        {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: `${this.scaling.getFontSize('medium')}px`,
          fontWeight: '500',
          color: '#ffffff'
        }
      ).setOrigin(0.5);
      
      // Home button - minimal style
      const homeButtonX = this.scaling.isMobile ? 
        -screenWidth / 2 + sideMargin + homeButtonWidth/2 + this.scaling.getSpacing('md') : 
        -screenWidth / 2 + sideMargin + homeButtonWidth/2;
      
      this.elements.homeButtonBg = this.scene.add.graphics();
      this.drawHomeButton();
      
      this.elements.homeButton = this.scene.add.rectangle(
        homeButtonX,
        uiPositions.footerY,
        homeButtonWidth,
        buttonHeight - this.scaling.getSpacing('xs'),
        0x000000, 0
      )
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onHomeClick())
      .on('pointerover', () => this.onHomeHover())
      .on('pointerout', () => this.onHomeOut());
      
      this.elements.homeText = this.scene.add.text(
        homeButtonX,
        uiPositions.footerY,
        'Menu',
        {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: `${this.scaling.getFontSize('small')}px`,
          fontWeight: '500',
          color: '#6c757d'
        }
      ).setOrigin(0.5);
      
      // Store button positions for resize
      this.buttonPositions = {
        startX: uiPositions.centerX,
        startY: uiPositions.footerY,
        homeX: homeButtonX,
        homeY: uiPositions.footerY
      };
    }
    
    createCompletionPanel() {
      // Create container for completion panel
      this.elements.completionPanel = this.scene.add.container(0, 0).setVisible(false).setDepth(1000);
      
      const panelWidth = Math.min(this.scaling.getScaledValue(420), this.scaling.screenWidth * 0.9);
      const panelHeight = Math.min(this.scaling.getScaledValue(360), this.scaling.screenHeight * 0.8);
      
      // Full screen overlay
      const overlay = this.scene.add.rectangle(0, 0, this.scaling.screenWidth * 2, this.scaling.screenHeight * 2, 0x000000, 0.5);
      
      // Panel card - NYT style
      const panelBg = this.scene.add.graphics();
      this.drawPanel(panelBg, panelWidth, panelHeight, this.colors.surface);
      
      // Success icon and title
      const titleText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getSpacing('xl'), '✓', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('display')}px`,
        fontWeight: '300',
        color: '#4ade80'
      }).setOrigin(0.5);
      
      const congratsText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getSpacing('xl') * 2, 'Success!', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('title')}px`,
        fontWeight: '600',
        color: '#1a1a1a'
      }).setOrigin(0.5);
      
      const subtitleText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getSpacing('xl') * 2.8, 'Target reached', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('medium')}px`,
        fontWeight: '400',
        color: '#6c757d'
      }).setOrigin(0.5);
      
      // Score displays
      this.elements.finalScoreText = this.scene.add.text(0, -this.scaling.getSpacing('sm'), '0.000s', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('xxlarge')}px`,
        fontWeight: '700',
        color: '#1a1a1a'
      }).setOrigin(0.5);
      
      this.elements.reflectionsText = this.scene.add.text(0, this.scaling.getSpacing('lg'), '0 reflections', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('medium')}px`,
        fontWeight: '400',
        color: '#6c757d'
      }).setOrigin(0.5);
      
      // Buttons
      const buttonWidth = Math.min(this.scaling.getScaledValue(180), panelWidth * 0.8);
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      
      const playAgainButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getSpacing('xl') * 1.5,
        buttonWidth, buttonHeight,
        'Play Again', this.colors.primary,
        () => this.scene.restartGame()
      );
      
      const menuButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getSpacing('lg'),
        buttonWidth, buttonHeight,
        'Menu', this.colors.secondary,
        () => this.scene.returnToMenu()
      );
      
      // Add all elements to container
      this.elements.completionPanel.add([
        overlay, panelBg, titleText, congratsText, subtitleText,
        this.elements.finalScoreText, this.elements.reflectionsText,
        ...playAgainButton, ...menuButton
      ]);
    }
    
    createGameOverPanel() {
      // Create container for game over panel
      this.elements.gameOverPanel = this.scene.add.container(0, 0).setVisible(false).setDepth(1000);
      
      const panelWidth = Math.min(this.scaling.getScaledValue(420), this.scaling.screenWidth * 0.9);
      const panelHeight = Math.min(this.scaling.getScaledValue(360), this.scaling.screenHeight * 0.8);
      
      // Full screen overlay
      const overlay = this.scene.add.rectangle(0, 0, this.scaling.screenWidth * 2, this.scaling.screenHeight * 2, 0x000000, 0.5);
      
      // Panel card
      const panelBg = this.scene.add.graphics();
      this.drawPanel(panelBg, panelWidth, panelHeight, this.colors.surface);
      
      // Error icon and title
      const titleText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getSpacing('xl'), '⏱', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('display')}px`,
        fontWeight: '300',
        color: '#f59e0b'
      }).setOrigin(0.5);
      
      const messageText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getSpacing('xl') * 2, 'Time\'s Up', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('title')}px`,
        fontWeight: '600',
        color: '#1a1a1a'
      }).setOrigin(0.5);
      
      const subtitleText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getSpacing('xl') * 2.8, 'The beam didn\'t reach the target', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('medium')}px`,
        fontWeight: '400',
        color: '#6c757d'
      }).setOrigin(0.5);
      
      const hintText = this.scene.add.text(0, -this.scaling.getSpacing('sm'), 'Try repositioning the mirrors for\na clearer path to the target.', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('small')}px`,
        fontWeight: '400',
        color: '#6c757d',
        align: 'center',
        lineSpacing: this.scaling.getSpacing('xs')
      }).setOrigin(0.5);
      
      // Buttons
      const buttonWidth = Math.min(this.scaling.getScaledValue(180), panelWidth * 0.8);
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      
      const tryAgainButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getSpacing('xl') * 1.5,
        buttonWidth, buttonHeight,
        'Try Again', this.colors.primary,
        () => this.scene.restartGame()
      );
      
      const menuButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getSpacing('lg'),
        buttonWidth, buttonHeight,
        'Menu', this.colors.secondary,
        () => this.scene.returnToMenu()
      );
      
      // Add all elements to container
      this.elements.gameOverPanel.add([
        overlay, panelBg, titleText, messageText, subtitleText, hintText,
        ...tryAgainButton, ...menuButton
      ]);
    }
    
    createPanelButton(x, y, width, height, text, color, callback) {
      const buttonHeight = this.scaling.getTouchSize(height, 'optimal');
      const buttonWidth = Math.max(width, this.scaling.getTouchSize(160, 'optimal'));
      
      const bg = this.scene.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(x - buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, this.scaling.getBorderRadius('md'));
      
      const button = this.scene.add.rectangle(x, y, buttonWidth, buttonHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback)
        .on('pointerover', () => {
          bg.clear();
          bg.fillStyle(color, 0.9);
          bg.fillRoundedRect(x - buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, this.scaling.getBorderRadius('md'));
        })
        .on('pointerout', () => {
          bg.clear();
          bg.fillStyle(color, 1);
          bg.fillRoundedRect(x - buttonWidth/2, y - buttonHeight/2, buttonWidth, buttonHeight, this.scaling.getBorderRadius('md'));
        });
      
      const btnText = this.scene.add.text(x, y, text, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${this.scaling.getFontSize('medium')}px`,
        fontWeight: '500',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      return [bg, button, btnText];
    }
    
    // Drawing methods
    drawHeaderBackground() {
      const { screenWidth, headerHeight, sideMargin, uiPositions } = this.scaling;
      
      this.elements.headerBg.clear();
      
      // Clean card background
      this.elements.headerBg.fillStyle(this.colors.surface, 0.95);
      this.elements.headerBg.fillRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.headerY - headerHeight / 2,
        screenWidth - (sideMargin * 2),
        headerHeight,
        this.scaling.getBorderRadius('md')
      );
      
      // Subtle border
      this.elements.headerBg.lineStyle(1, this.colors.border, 0.5);
      this.elements.headerBg.strokeRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.headerY - headerHeight / 2,
        screenWidth - (sideMargin * 2),
        headerHeight,
        this.scaling.getBorderRadius('md')
      );
    }
    
    drawFooterBackground() {
      const { screenWidth, footerHeight, sideMargin, uiPositions } = this.scaling;
      
      this.elements.footerBg.clear();
      
      // Clean card background
      this.elements.footerBg.fillStyle(this.colors.surface, 0.95);
      this.elements.footerBg.fillRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.footerY - footerHeight / 2,
        screenWidth - (sideMargin * 2),
        footerHeight,
        this.scaling.getBorderRadius('md')
      );
      
      // Subtle border
      this.elements.footerBg.lineStyle(1, this.colors.border, 0.5);
      this.elements.footerBg.strokeRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.footerY - footerHeight / 2,
        screenWidth - (sideMargin * 2),
        footerHeight,
        this.scaling.getBorderRadius('md')
      );
    }
    
    drawStartButton() {
      const buttonWidth = this.scaling.getTouchSize(180, 'optimal');
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      const { uiPositions } = this.scaling;
      
      this.elements.startButtonBg.clear();
      
      // Primary button style
      this.elements.startButtonBg.fillStyle(this.colors.primary, 1);
      this.elements.startButtonBg.fillRoundedRect(
        -buttonWidth/2, uiPositions.footerY - buttonHeight/2,
        buttonWidth, buttonHeight, 
        this.scaling.getBorderRadius('md')
      );
    }
    
    drawHomeButton() {
      const { screenWidth, sideMargin, uiPositions } = this.scaling;
      const homeButtonWidth = this.scaling.getTouchSize(100, 'optimal');
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      const homeButtonX = this.scaling.isMobile ? 
        -screenWidth / 2 + sideMargin + homeButtonWidth/2 + this.scaling.getSpacing('md') :
        -screenWidth / 2 + sideMargin + homeButtonWidth/2;
      
      this.elements.homeButtonBg.clear();
      
      // Secondary button style
      this.elements.homeButtonBg.lineStyle(1, this.colors.border, 1);
      this.elements.homeButtonBg.strokeRoundedRect(
        homeButtonX - homeButtonWidth/2,
        uiPositions.footerY - buttonHeight/2 + this.scaling.getSpacing('xs')/2,
        homeButtonWidth,
        buttonHeight - this.scaling.getSpacing('xs'),
        this.scaling.getBorderRadius('md')
      );
    }
    
    drawPanel(graphics, width, height, color) {
      graphics.fillStyle(color, 1);
      graphics.fillRoundedRect(-width/2, -height/2, width, height, this.scaling.getBorderRadius('lg'));
      
      // Subtle shadow effect
      graphics.lineStyle(1, this.colors.border, 0.3);
      graphics.strokeRoundedRect(-width/2, -height/2, width, height, this.scaling.getBorderRadius('lg'));
    }
    
    // Event handlers
    onStartClick() {
      this.scene.startGame();
    }
    
    onStartHover() {
      this.elements.startButtonBg.clear();
      this.elements.startButtonBg.fillStyle(this.colors.primary, 0.9);
      const buttonWidth = this.scaling.getTouchSize(180, 'optimal');
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      const { uiPositions } = this.scaling;
      this.elements.startButtonBg.fillRoundedRect(
        -buttonWidth/2, uiPositions.footerY - buttonHeight/2,
        buttonWidth, buttonHeight, 
        this.scaling.getBorderRadius('md')
      );
    }
    
    onStartOut() {
      this.drawStartButton();
    }
    
    onHomeClick() {
      this.scene.returnToMenu();
    }
    
    onHomeHover() {
      const { screenWidth, sideMargin, uiPositions } = this.scaling;
      const homeButtonWidth = this.scaling.getTouchSize(100, 'optimal');
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      const homeButtonX = this.scaling.isMobile ? 
        -screenWidth / 2 + sideMargin + homeButtonWidth/2 + this.scaling.getSpacing('md') :
        -screenWidth / 2 + sideMargin + homeButtonWidth/2;
      
      this.elements.homeButtonBg.clear();
      this.elements.homeButtonBg.fillStyle(this.colors.background, 1);
      this.elements.homeButtonBg.fillRoundedRect(
        homeButtonX - homeButtonWidth/2,
        uiPositions.footerY - buttonHeight/2 + this.scaling.getSpacing('xs')/2,
        homeButtonWidth,
        buttonHeight - this.scaling.getSpacing('xs'),
        this.scaling.getBorderRadius('md')
      );
      this.elements.homeButtonBg.lineStyle(1, this.colors.border, 1);
      this.elements.homeButtonBg.strokeRoundedRect(
        homeButtonX - homeButtonWidth/2,
        uiPositions.footerY - buttonHeight/2 + this.scaling.getSpacing('xs')/2,
        homeButtonWidth,
        buttonHeight - this.scaling.getSpacing('xs'),
        this.scaling.getBorderRadius('md')
      );
    }
    
    onHomeOut() {
      this.drawHomeButton();
    }
    
    // UI update methods
    updateTimer(time) {
      const minutes = Math.floor(time / 60);
      const seconds = (time % 60).toFixed(3);
      this.elements.timerText.setText(`${minutes.toString().padStart(2, '0')}:${seconds.padStart(6, '0')}`);
    }
    
    showCompletionPanel(time, reflections) {
      this.elements.finalScoreText.setText(`${time.toFixed(3)}s`);
      this.elements.reflectionsText.setText(`${reflections} reflection${reflections !== 1 ? 's' : ''}`);
      this.elements.completionPanel.setVisible(true);
      
      this.scene.tweens.add({
        targets: this.elements.completionPanel,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.95, to: 1 },
        duration: 300,
        ease: 'Cubic.out'
      });
    }
    
    showGameOverPanel() {
      this.elements.gameOverPanel.setVisible(true);
      this.elements.gameOverPanel.alpha = 0;
      
      this.scene.tweens.add({
        targets: this.elements.gameOverPanel,
        alpha: 1,
        duration: 300,
        ease: 'Cubic.out'
      });
    }
    
    hideStartButton() {
      const newY = this.scaling.screenHeight + 100;
      
      this.scene.tweens.add({
        targets: [
          this.elements.startButton,
          this.elements.startText,
          this.elements.homeButton,
          this.elements.homeText
        ],
        y: newY,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.in',
        onComplete: () => {
          this.elements.startButton.setVisible(false);
          this.elements.startText.setVisible(false);
          this.elements.homeButton.setVisible(false);
          this.elements.homeText.setVisible(false);
        }
      });
      
      // Also hide button backgrounds
      this.scene.tweens.add({
        targets: [this.elements.startButtonBg, this.elements.homeButtonBg],
        alpha: 0,
        duration: 300,
        ease: 'Cubic.in'
      });
    }
    
    hideInstructions() {
      this.scene.tweens.add({
        targets: this.elements.instructionsText,
        alpha: 0,
        y: this.elements.instructionsText.y - this.scaling.getSpacing('md'),
        duration: 200,
        ease: 'Cubic.out',
        onComplete: () => {
          this.elements.instructionsText.setVisible(false);
        }
      });
    }
    
    showTimer() {
      this.scene.tweens.add({
        targets: this.elements.timerText,
        alpha: 1,
        y: this.elements.timerText.y + this.scaling.getSpacing('xs'),
        duration: 300,
        ease: 'Cubic.out'
      });
    }
    
    // Handle scale changes
    onScaleChanged(scaleData) {
      this.handleResize();
    }
    
    // Handle window resize
    handleResize() {
      // Update all UI positions and sizes
      this.drawHeaderBackground();
      this.drawFooterBackground();
      this.drawStartButton();
      this.drawHomeButton();
      
      // Update text positions and sizes
      const { uiPositions } = this.scaling;
      
      this.elements.timerText.setPosition(uiPositions.centerX, uiPositions.headerY);
      this.elements.timerText.setFontSize(this.scaling.getFontSize('xlarge'));
      
      this.elements.instructionsText.setPosition(uiPositions.centerX, uiPositions.headerY - this.scaling.getSpacing('lg'));
      this.elements.instructionsText.setFontSize(this.scaling.getFontSize('medium'));
      
      // Update button sizes and positions
      const buttonWidth = this.scaling.getTouchSize(180, 'optimal');
      const buttonHeight = this.scaling.getTouchSize(48, 'optimal');
      const homeButtonWidth = this.scaling.getTouchSize(100, 'optimal');
      
      this.elements.startButton.setPosition(uiPositions.centerX, uiPositions.footerY);
      this.elements.startButton.setSize(buttonWidth, buttonHeight);
      this.elements.startText.setPosition(uiPositions.centerX, uiPositions.footerY);
      this.elements.startText.setFontSize(this.scaling.getFontSize('medium'));
      
      const { screenWidth, sideMargin } = this.scaling;
      const homeButtonX = this.scaling.isMobile ? 
        -screenWidth / 2 + sideMargin + homeButtonWidth/2 + this.scaling.getSpacing('md') :
        -screenWidth / 2 + sideMargin + homeButtonWidth/2;
      
      this.elements.homeButton.setPosition(homeButtonX, uiPositions.footerY);
      this.elements.homeButton.setSize(homeButtonWidth, buttonHeight - this.scaling.getSpacing('xs'));
      this.elements.homeText.setPosition(homeButtonX, uiPositions.footerY);
      this.elements.homeText.setFontSize(this.scaling.getFontSize('small'));
      
      // Redraw button backgrounds at new positions
      if (this.elements.startButton.visible) {
        this.drawStartButton();
      }
      if (this.elements.homeButton.visible) {
        this.drawHomeButton();
      }
      
      // Update panel sizes if they're visible
      if (this.elements.completionPanel.visible) {
        this.recreateCompletionPanel();
      }
      if (this.elements.gameOverPanel.visible) {
        this.recreateGameOverPanel();
      }
    }
    
    recreateCompletionPanel() {
      // Store current values
      const currentTime = this.elements.finalScoreText.text;
      const currentReflections = this.elements.reflectionsText.text;
      const wasVisible = this.elements.completionPanel.visible;
      
      // Destroy old panel
      this.elements.completionPanel.destroy();
      
      // Recreate with new dimensions
      this.createCompletionPanel();
      
      // Restore values
      this.elements.finalScoreText.setText(currentTime);
      this.elements.reflectionsText.setText(currentReflections);
      this.elements.completionPanel.setVisible(wasVisible);
    }
    
    recreateGameOverPanel() {
      // Store visibility
      const wasVisible = this.elements.gameOverPanel.visible;
      
      // Destroy old panel
      this.elements.gameOverPanel.destroy();
      
      // Recreate with new dimensions
      this.createGameOverPanel();
      
      // Restore visibility
      this.elements.gameOverPanel.setVisible(wasVisible);
    }
    
    // Cleanup
    destroy() {
      // Remove scale change listener
      this.scene.events.off('scale-changed', this.onScaleChanged, this);
      
      // Clean up all UI elements
      Object.values(this.elements).forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
    }
  }