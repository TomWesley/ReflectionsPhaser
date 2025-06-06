document.addEventListener('DOMContentLoaded', function() {
    // Create the Phaser game instance
    const game = new Phaser.Game(config);
    
    // Expose game to window for debugging
    window.game = game;
    
    // Force Phaser to handle window resize
    window.addEventListener('resize', function() {
      if (game && game.scale) {
        // Update the game size
        game.scale.resize(window.innerWidth, window.innerHeight);
        console.log('Forcing Phaser resize:', window.innerWidth, 'x', window.innerHeight);
      }
    });
    
    // Handle visibility change (for pausing/resuming the game)
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        // Pause game when tab/window is not visible
        const scenes = game.scene.getScenes(true);
        if (scenes.length > 0) {
          game.scene.pause(scenes[0].scene.key);
        }
      } else {
        // Resume game when tab/window becomes visible
        const currentScene = game.scene.getScenes(true)[0];
        if (currentScene && currentScene.scene.key !== 'MenuScene') {
          currentScene.scene.resume();
        }
      }
    });
    
    // Mobile orientation handling
    function handleOrientationChange() {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Force a scale refresh after orientation change
        setTimeout(() => {
          if (game && game.scale) {
            game.scale.resize(window.innerWidth, window.innerHeight);
            console.log('Orientation change - forcing resize');
          }
        }, 100);
      }
    }
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Prevent zoom on mobile
    document.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  });