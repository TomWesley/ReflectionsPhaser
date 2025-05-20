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
        debug: true // Set to true to see hitboxes for testing
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
      MenuScene,
      GameScene,
      LeaderboardScene
    ]
  };