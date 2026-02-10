// Initialize the game when the page loads with error handling
document.addEventListener('DOMContentLoaded', async () => {
    // Cache-busting version - increment to force reload of all modules
    const CACHE_VERSION = 11;
    const cacheBust = `?v=${CACHE_VERSION}`;

    // Show loading indicator
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = 'Loading defense systems...';
        statusEl.className = 'status-modern';
    }

    try {
        // Import modules with cache-busting
        const { Game } = await import(`./classes/Game.js${cacheBust}`);

        const game = new Game();

        // Expose game instance globally for modal functions
        window.game = game;

        // Setup game control buttons
        const launchBtn = document.getElementById('launchBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (launchBtn) {
            launchBtn.addEventListener('click', () => {
                console.log('Launch button clicked!');
                game.launchLasers();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('Reset button clicked!');
                game.resetGame();
            });
        }

    } catch (error) {
        console.error('Failed to load game modules:', error);

        // Show user-friendly error message
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'Loading failed. Please refresh the page.';
            statusEl.className = 'status-modern status-game-over';
        }

        // Try to reload after a short delay
        setTimeout(() => {
            if (confirm('Game failed to load properly. Reload the page?')) {
                window.location.reload();
            }
        }, 2000);
    }
});