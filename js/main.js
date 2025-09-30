// Initialize the game when the page loads with error handling
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading indicator
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = 'Loading defense systems...';
        statusEl.className = 'status-modern';
    }
    
    try {
        // Import modules with error handling
        const { Game } = await import('./core/Game.js');
        const { DailyChallenge } = await import('./utils/DailyChallenge.js');
        
        const game = new Game();
        
        // Expose game instance globally for modal functions
        window.game = game;

        // Setup game control buttons
        const launchBtn = document.getElementById('launchBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (launchBtn) {
            launchBtn.addEventListener('click', () => {
                console.log('Launch button clicked!');
                game.gameState.launchLasers();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('Reset button clicked!');
                game.gameState.resetGame();
            });
        }

        // Add completion detection for daily challenges
        const originalUpdate = game.update?.bind(game);
        if (originalUpdate) {
            game.update = function() {
                const result = originalUpdate();

                // Check for Daily Challenge completion
                if (this.gameState.gameMode === 'dailyChallenge' && this.gameState.isPlaying && !this.gameState.challengeCompleted) {
                    // If all lasers are gone and none hit the center, challenge is complete
                    if (this.lasers.length === 0 && !this.gameState.gameOver) {
                        // Wait a moment to ensure all lasers have been processed
                        setTimeout(() => {
                            if (this.lasers.length === 0 && !this.gameState.gameOver) {
                                this.completeDaily();
                            }
                        }, 1000);
                    }
                }

                return result;
            };
        }

        // Add daily challenge completion method
        game.completeDaily = function() {
            if (this.gameState.challengeCompleted) return;

            this.gameState.challengeCompleted = true;
            const completionTime = Math.round(this.gameState.gameTime);
            const score = Math.max(1000 - completionTime * 10, 100); // Higher score for faster completion

            // Mark as completed in localStorage
            DailyChallenge.markCompleted(score, completionTime);

            // Update UI
            this.gameState.updateModeButtons();
            this.gameState.updateDailyInfo();

            // Show success message
            const statusEl = document.getElementById('status');
            statusEl.textContent = `Daily Challenge Complete! Time: ${completionTime}s, Score: ${score}`;
            statusEl.className = 'status-modern status-success';
        };
        
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