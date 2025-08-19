// Main Game Initialization
// This file starts the game when the page loads

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the game
    const game = new Game();
    
    // Make game globally accessible for debugging
    window.game = game;
    
    // Add some helpful console messages
    console.log('🎮 Reflection Game - Ultra Precise Edition');
    console.log('📋 Controls:');
    console.log('   • Drag mirrors to position them');
    console.log('   • Space: Launch lasers');
    console.log('   • R: Reset game');
    console.log('   • D: Toggle debug collision bounds');
    console.log('🎯 Goal: Protect the center target from lasers!');
    
    // Optional: Add performance monitoring
    if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('game-start');
        console.log('⚡ Game initialized successfully');
    }
});

// Handle page visibility changes (pause/resume game if needed)
document.addEventListener('visibilitychange', function() {
    if (window.game) {
        if (document.hidden) {
            // Page is hidden - could pause game here if needed
            console.log('🔇 Game paused (tab hidden)');
        } else {
            // Page is visible - could resume game here if needed
            console.log('🔊 Game resumed (tab visible)');
        }
    }
});

// Handle errors gracefully
window.addEventListener('error', function(event) {
    console.error('❌ Game Error:', event.error);
    // Could show user-friendly error message here
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, Mirror, Laser, Spawner, GameConfig };
}