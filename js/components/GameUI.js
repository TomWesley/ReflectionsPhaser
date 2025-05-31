// GameUI.js - Manages all UI elements for the game
class GameUI {
    constructor(scene, scalingManager) {
      this.scene = scene;
      this.scaling = scalingManager;
      
      // UI element references
      this.elements = {};
      
      // Create all UI elements
      this.createUI();
    }
    
    createUI() {
      this.createHeader();
      this.createFooter();
      this.createCompletionPanel();
      this.createGameOverPanel();
    }
    
    createHeader() {
      const { screenWidth, headerHeight, sideMargin, uiPositions } = this.scaling;
      
      // Header background
      this.elements.headerBg = this.scene.add.graphics();
      this.drawHeaderBackground();
      
      // Timer text
      this.elements.timerText = this.scene.add.text(
        uiPositions.centerX, 
        uiPositions.headerY, 
        '00:00.000', 
        {
          fontFamily: 'Courier New, monospace',
          fontSize: `${this.scaling.getFontSize(32)}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: this.scaling.getScaledValue(2),
          shadow: {
            offsetX: this.scaling.getScaledValue(2),
            offsetY: this.scaling.getScaledValue(2),
            color: '#000000',
            blur: this.scaling.getScaledValue(4),
            stroke: true,
            fill: true
          }
        }
      ).setOrigin(0.5).setAlpha(0.7);
      
      // Instructions text
      this.elements.instructionsText = this.scene.add.text(
        uiPositions.centerX,
        uiPositions.headerY - this.scaling.getScaledValue(30),
        'Position mirrors to reflect the laser to the target',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${this.scaling.getFontSize(20)}px`,
          color: '#e0e0e0',
          align: 'center',
          stroke: '#000000',
          strokeThickness: this.scaling.getScaledValue(1)
        }
      ).setOrigin(0.5);
    }
    
    createFooter() {
      const { screenWidth, footerHeight, sideMargin, uiPositions } = this.scaling;
      
      // Footer background
      this.elements.footerBg = this.scene.add.graphics();
      this.drawFooterBackground();
      
      // Button dimensions
      const buttonWidth = this.scaling.getScaledValue(200);
      const buttonHeight = this.scaling.getScaledValue(50);
      const homeButtonWidth = this.scaling.getScaledValue(120);
      const borderRadius = this.scaling.getScaledValue(25);
      
      // Start button background
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
        'START GAME',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${this.scaling.getFontSize(24)}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: this.scaling.getScaledValue(2)
        }
      ).setOrigin(0.5);
      
      // Home button
      const homeButtonX = -screenWidth / 2 + sideMargin + homeButtonWidth/2;
      
      this.elements.homeButtonBg = this.scene.add.graphics();
      this.drawHomeButton();
      
      this.elements.homeButton = this.scene.add.rectangle(
        homeButtonX,
        uiPositions.footerY,
        homeButtonWidth,
        buttonHeight - 10,
        0x000000, 0
      )
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onHomeClick())
      .on('pointerover', () => this.onHomeHover())
      .on('pointerout', () => this.onHomeOut());
      
      this.elements.homeText = this.scene.add.text(
        homeButtonX,
        uiPositions.footerY,
        'MENU',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${this.scaling.getFontSize(18)}px`,
          fontStyle: 'bold',
          color: '#ecf0f1',
          stroke: '#000000',
          strokeThickness: this.scaling.getScaledValue(1)
        }
      ).setOrigin(0.5);
    }
    
    createCompletionPanel() {
      // Create container for completion panel
      this.elements.completionPanel = this.scene.add.container(0, 0).setVisible(false).setDepth(1000);
      
      const panelWidth = Math.min(this.scaling.getScaledValue(500), this.scaling.screenWidth * 0.9);
      const panelHeight = Math.min(this.scaling.getScaledValue(400), this.scaling.screenHeight * 0.8);
      
      // Full screen background
      const fullScreenBg = this.scene.add.rectangle(0, 0, this.scaling.screenWidth * 2, this.scaling.screenHeight * 2, 0x000000, 0.8);
      
      // Panel background
      const panelBg = this.scene.add.graphics();
      this.drawPanel(panelBg, panelWidth, panelHeight, 0x1a1a2e, 0x4facfe);
      
      // Panel content
      const titleText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getScaledValue(60), '🎯 TARGET HIT!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.scaling.getFontSize(48)}px`,
        fontStyle: 'bold',
        color: '#4facfe',
        stroke: '#000000',
        strokeThickness: this.scaling.getScaledValue(4)
      }).setOrigin(0.5);
      
      const congratsText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getScaledValue(120), 'LEVEL COMPLETE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.scaling.getFontSize(28)}px`,
        color: '#ecf0f1'
      }).setOrigin(0.5);
      
      // Score displays
      this.elements.finalScoreText = this.scene.add.text(0, 0, '0.000s', {
        fontFamily: 'Courier New, monospace',
        fontSize: `${this.scaling.getFontSize(42)}px`,
        fontStyle: 'bold',
        color: '#f39c12',
        stroke: '#000000',
        strokeThickness: this.scaling.getScaledValue(2)
      }).setOrigin(0.5);
      
      this.elements.reflectionsText = this.scene.add.text(0, this.scaling.getScaledValue(65), '0 reflections', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.scaling.getFontSize(24)}px`,
        color: '#ecf0f1'
      }).setOrigin(0.5);
      
      // Buttons
      const buttonWidth = Math.min(this.scaling.getScaledValue(250), panelWidth * 0.8);
      const buttonHeight = this.scaling.getScaledValue(50);
      
      const playAgainButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getScaledValue(125),
        buttonWidth, buttonHeight,
        'PLAY AGAIN', 0x27ae60,
        () => this.scene.restartGame()
      );
      
      const menuButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getScaledValue(65),
        buttonWidth, buttonHeight,
        'MAIN MENU', 0x34495e,
        () => this.scene.returnToMenu()
      );
      
      // Add all elements to container
      this.elements.completionPanel.add([
        fullScreenBg, panelBg, titleText, congratsText,
        this.elements.finalScoreText, this.elements.reflectionsText,
        ...playAgainButton, ...menuButton
      ]);
    }
    
    createGameOverPanel() {
      // Create container for game over panel
      this.elements.gameOverPanel = this.scene.add.container(0, 0).setVisible(false).setDepth(1000);
      
      const panelWidth = Math.min(this.scaling.getScaledValue(500), this.scaling.screenWidth * 0.9);
      const panelHeight = Math.min(this.scaling.getScaledValue(400), this.scaling.screenHeight * 0.8);
      
      // Full screen background
      const fullScreenBg = this.scene.add.rectangle(0, 0, this.scaling.screenWidth * 2, this.scaling.screenHeight * 2, 0x000000, 0.8);
      
      // Panel background
      const panelBg = this.scene.add.graphics();
      this.drawPanel(panelBg, panelWidth, panelHeight, 0x2c1810, 0xe74c3c);
      
      // Panel content
      const titleText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getScaledValue(60), '⏰ TIME\'S UP!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.scaling.getFontSize(48)}px`,
        fontStyle: 'bold',
        color: '#e74c3c',
        stroke: '#000000',
        strokeThickness: this.scaling.getScaledValue(4)
      }).setOrigin(0.5);
      
      const messageText = this.scene.add.text(0, -panelHeight/2 + this.scaling.getScaledValue(120), 'The laser didn\'t reach the target in time!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.scaling.getFontSize(22)}px`,
        color: '#ecf0f1',
        align: 'center'
      }).setOrigin(0.5);
      
      const hintText = this.scene.add.text(0, -this.scaling.getScaledValue(30), 'Try repositioning the mirrors\nfor a clearer path to the target.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.scaling.getFontSize(18)}px`,
        color: '#bdc3c7',
        align: 'center'
      }).setOrigin(0.5);
      
      // Buttons
      const buttonWidth = Math.min(this.scaling.getScaledValue(250), panelWidth * 0.8);
      const buttonHeight = this.scaling.getScaledValue(50);
      
      const tryAgainButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getScaledValue(125),
        buttonWidth, buttonHeight,
        'TRY AGAIN', 0xe67e22,
        () => this.scene.restartGame()
      );
      
      const menuButton = this.createPanelButton(
        0, panelHeight/2 - this.scaling.getScaledValue(65),
        buttonWidth, buttonHeight,
        'MAIN MENU', 0x34495e,
        () => this.scene.returnToMenu()
      );
      
      // Add all elements to container
      this.elements.gameOverPanel.add([
        fullScreenBg, panelBg, titleText, messageText, hintText,
        ...tryAgainButton, ...menuButton
      ]);
    }
    
    createPanelButton(x, y, width, height, text, color, callback) {
      const bg = this.scene.add.graphics();
      bg.fillStyle(color, 0.9);
      bg.fillRoundedRect(x - width/2, y - height/2, width, height, this.scaling.getScaledValue(25));
      bg.lineStyle(this.scaling.getScaledValue(2), color * 0.7, 1);
      bg.strokeRoundedRect(x - width/2, y - height/2, width, height, this.scaling.getScaledValue(25));
      
      const button = this.scene.add.rectangle(x, y, width, height, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback)
        .on('pointerover', () => {
          bg.clear();
          bg.fillStyle(color, 1);
          bg.fillRoundedRect(x - width/2, y - height/2, width, height, this.scaling.getScaledValue(25));
        })
        .on('pointerout', () => {
          bg.clear();
          bg.fillStyle(color, 0.9);
          bg.fillRoundedRect(x - width/2, y - height/2, width, height, this.scaling.getScaledValue(25));
        });
      
      const btnText = this.scene.add.text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.scaling.getFontSize(20)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: this.scaling.getScaledValue(1)
      }).setOrigin(0.5);
      
      return [bg, button, btnText];
    }
    
    // Drawing methods
    drawHeaderBackground() {
      const { screenWidth, headerHeight, sideMargin, uiPositions } = this.scaling;
      
      this.elements.headerBg.clear();
      this.elements.headerBg.fillStyle(0x1a1a2e, 0.95);
      this.elements.headerBg.fillRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.headerY - headerHeight / 2,
        screenWidth - (sideMargin * 2),
        headerHeight,
        this.scaling.getScaledValue(20)
      );
      this.elements.headerBg.lineStyle(this.scaling.getScaledValue(2), 0x16213e, 0.8);
      this.elements.headerBg.strokeRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.headerY - headerHeight / 2,
        screenWidth - (sideMargin * 2),
        headerHeight,
        this.scaling.getScaledValue(20)
      );
    }
    
    drawFooterBackground() {
      const { screenWidth, footerHeight, sideMargin, uiPositions } = this.scaling;
      
      this.elements.footerBg.clear();
      this.elements.footerBg.fillStyle(0x1a1a2e, 0.95);
      this.elements.footerBg.fillRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.footerY - footerHeight / 2,
        screenWidth - (sideMargin * 2),
        footerHeight,
        this.scaling.getScaledValue(20)
      );
      this.elements.footerBg.lineStyle(this.scaling.getScaledValue(2), 0x16213e, 0.8);
      this.elements.footerBg.strokeRoundedRect(
        -screenWidth / 2 + sideMargin,
        uiPositions.footerY - footerHeight / 2,
        screenWidth - (sideMargin * 2),
        footerHeight,
        this.scaling.getScaledValue(20)
      );
    }
    
    drawStartButton() {
      const buttonWidth = this.scaling.getScaledValue(200);
      const buttonHeight = this.scaling.getScaledValue(50);
      const borderRadius = this.scaling.getScaledValue(25);
      const { uiPositions } = this.scaling;
      
      this.elements.startButtonBg.clear();
      this.elements.startButtonBg.fillGradientStyle(0x4facfe, 0x4facfe, 0x00c9ff, 0x00c9ff, 1);
      this.elements.startButtonBg.fillRoundedRect(
        -buttonWidth/2, uiPositions.footerY - buttonHeight/2,
        buttonWidth, buttonHeight, borderRadius
      );
      this.elements.startButtonBg.lineStyle(this.scaling.getScaledValue(3), 0x0099cc, 1);
      this.elements.startButtonBg.strokeRoundedRect(
        -buttonWidth/2, uiPositions.footerY - buttonHeight/2,
        buttonWidth, buttonHeight, borderRadius
      );
    }
    
    drawHomeButton() {
      const { screenWidth, sideMargin, uiPositions } = this.scaling;
      const homeButtonWidth = this.scaling.getScaledValue(120);
      const buttonHeight = this.scaling.getScaledValue(50);
      const homeButtonX = -screenWidth / 2 + sideMargin + homeButtonWidth/2;
      
      this.elements.homeButtonBg.clear();
      this.elements.homeButtonBg.fillStyle(0x2c3e50, 0.9);
      this.elements.homeButtonBg.fillRoundedRect(
        homeButtonX - homeButtonWidth/2,
        uiPositions.footerY - buttonHeight/2 + 5,
        homeButtonWidth,
        buttonHeight - 10,
        this.scaling.getScaledValue(20)
      );
      this.elements.homeButtonBg.lineStyle(this.scaling.getScaledValue(2), 0x34495e, 1);
      this.elements.homeButtonBg.strokeRoundedRect(
        homeButtonX - homeButtonWidth/2,
        uiPositions.footerY - buttonHeight/2 + 5,
        homeButtonWidth,
        buttonHeight - 10,
        this.scaling.getScaledValue(20)
      );
    }
    
    drawPanel(graphics, width, height, baseColor, borderColor) {
      graphics.fillGradientStyle(baseColor, baseColor, baseColor * 1.2, baseColor * 1.2, 1);
      graphics.fillRoundedRect(-width/2, -height/2, width, height, this.scaling.getScaledValue(30));
      graphics.lineStyle(this.scaling.getScaledValue(4), borderColor, 1);
      graphics.strokeRoundedRect(-width/2, -height/2, width, height, this.scaling.getScaledValue(30));
    }
    
    // Event handlers
    onStartClick() {
      this.scene.startGame();
    }
    
    onStartHover() {
      this.elements.startButtonBg.clear();
      this.elements.startButtonBg.fillGradientStyle(0x5fbdff, 0x5fbdff, 0x22d4ff, 0x22d4ff, 1);
      this.drawStartButton();
      this.elements.startButtonBg.alpha = 1.1; // Subtle highlight
    }
    
    onStartOut() {
      this.drawStartButton();
      this.elements.startButtonBg.alpha = 1;
    }
    
    onHomeClick() {
      this.scene.returnToMenu();
    }
    
    onHomeHover() {
      this.elements.homeButtonBg.alpha = 1.1; // Subtle highlight
    }
    
    onHomeOut() {
      this.elements.homeButtonBg.alpha = 1;
    }
    
    // UI update methods
    updateTimer(time) {
      const minutes = Math.floor(time / 60);
      const seconds = (time % 60).toFixed(3);
      this.elements.timerText.setText(`${minutes.toString().padStart(2, '0')}:${seconds.padStart(6, '0')}`);
    }
    
    showCompletionPanel(time, reflections) {
      this.elements.finalScoreText.setText(`${time.toFixed(3)}s`);
      this.elements.reflectionsText.setText(`${reflections} reflections`);
      this.elements.completionPanel.setVisible(true);
      
      this.scene.tweens.add({
        targets: this.elements.completionPanel,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.8, to: 1 },
        duration: 600,
        ease: 'Back.out'
      });
    }
    
    showGameOverPanel() {
      this.elements.gameOverPanel.setVisible(true);
      this.elements.gameOverPanel.alpha = 0;
      
      this.scene.tweens.add({
        targets: this.elements.gameOverPanel,
        alpha: 1,
        duration: 500,
        ease: 'Cubic.out'
      });
    }
    
    hideStartButton() {
      this.scene.tweens.add({
        targets: [
          this.elements.startButton,
          this.elements.startText,
          this.elements.homeButton,
          this.elements.homeText
        ],
        y: this.scaling.screenHeight + 100,
        alpha: 0,
        duration: 500,
        ease: 'Back.in',
        onComplete: () => {
          this.elements.startButton.setVisible(false);
          this.elements.startText.setVisible(false);
          this.elements.homeButton.setVisible(false);
          this.elements.homeText.setVisible(false);
        }
      });
    }
    
    hideInstructions() {
      this.scene.tweens.add({
        targets: this.elements.instructionsText,
        alpha: 0,
        y: this.elements.instructionsText.y - 30,
        duration: 400,
        ease: 'Power2.out',
        onComplete: () => {
          this.elements.instructionsText.setVisible(false);
        }
      });
    }
    
    showTimer() {
      this.scene.tweens.add({
        targets: this.elements.timerText,
        alpha: 1,
        y: this.elements.timerText.y + 10,
        duration: 600,
        ease: 'Back.out'
      });
    }
    
    // Handle window resize
    handleResize() {
      // Update all UI positions and sizes
      this.drawHeaderBackground();
      this.drawFooterBackground();
      this.drawStartButton();
      this.drawHomeButton();
      
      // Update text positions
      const { uiPositions } = this.scaling;
      
      this.elements.timerText.setPosition(uiPositions.centerX, uiPositions.headerY);
      this.elements.instructionsText.setPosition(uiPositions.centerX, uiPositions.headerY - this.scaling.getScaledValue(30));
      
      this.elements.startButton.setPosition(uiPositions.centerX, uiPositions.footerY);
      this.elements.startText.setPosition(uiPositions.centerX, uiPositions.footerY);
      
      const { screenWidth, sideMargin } = this.scaling;
      const homeButtonWidth = this.scaling.getScaledValue(120);
      const homeButtonX = -screenWidth / 2 + sideMargin + homeButtonWidth/2;
      
      this.elements.homeButton.setPosition(homeButtonX, uiPositions.footerY);
      this.elements.homeText.setPosition(homeButtonX, uiPositions.footerY);
      
      // Update font sizes
      this.elements.timerText.setFontSize(this.scaling.getFontSize(32));
      this.elements.instructionsText.setFontSize(this.scaling.getFontSize(20));
      this.elements.startText.setFontSize(this.scaling.getFontSize(24));
      this.elements.homeText.setFontSize(this.scaling.getFontSize(18));
    }
    
    // Cleanup
    destroy() {
      // Clean up all UI elements
      Object.values(this.elements).forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
    }
  }