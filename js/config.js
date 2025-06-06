const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#000000',
    physics: {
      default: 'matter',
      matter: {
        gravity: { y: 0 }, // No gravity
        debug: false // Debug mode turned off for production
      }
    },
    scene: [
      MenuScene,
      GameScene,
      LeaderboardScene
    ],
    // Mobile optimizations
    input: {
      activePointers: 1, // Support only 1 pointer for simplicity
      smoothFactor: 0.2
    },
    // Prevent context menu on long press
    disableContextMenu: true
  };