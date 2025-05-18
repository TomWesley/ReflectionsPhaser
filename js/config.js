const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000',
    parent: 'game-container',
    pixelArt: false,
    physics: {
      default: 'matter',
      matter: {
        debug: false,
        gravity: { y: 0 }, // No gravity since this is a top-down game
        setBounds: false, // We'll set bounds manually
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 2, // Support multi-touch for mobile
      touch: {
        capture: true
      }
    },
    scene: [
      MenuScene,
      GameScene,
      LeaderboardScene
    ]
  };