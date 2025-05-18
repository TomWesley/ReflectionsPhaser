document.addEventListener('DOMContentLoaded', function() {
    // Create the Phaser game instance
    const game = new Phaser.Game(config);
    
    // Expose game to window for debugging
    window.game = game;
    
    // Handle window resize
    window.addEventListener('resize', function() {
      game.scale.refresh();
    });
    
    // Handle visibility change (for pausing/resuming the game)
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        // Pause game when tab/window is not visible
        game.scene.pause(game.scene.getScenes(true)[0].scene.key);
      } else {
        // Resume game when tab/window becomes visible
        const currentScene = game.scene.getScenes(true)[0];
        if (currentScene && currentScene.scene.key !== 'MenuScene') {
          currentScene.scene.resume();
        }
      }
    });
  });