const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000',
    physics: {
      default: 'matter',
      matter: {
        gravity: { y: 0 }, // No gravity
        debug: false // Debug mode turned off for production
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent: 'game-container',
      width: '100%',
      height: '100%'
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