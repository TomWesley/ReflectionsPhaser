import { Game } from './classes/Game.js';
import { DailyChallenge } from './utils/DailyChallenge.js';

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // Expose game instance globally for modal functions
    window.game = game;
    
    // Add completion detection for daily challenges
    const originalUpdate = game.update?.bind(game);
    if (originalUpdate) {
        game.update = function() {
            const result = originalUpdate();
            
            // Check for Daily Challenge completion
            if (this.gameMode === 'dailyChallenge' && this.isPlaying && !this.challengeCompleted) {
                // If all lasers are gone and none hit the center, challenge is complete
                if (this.lasers.length === 0 && !this.gameOver) {
                    // Wait a moment to ensure all lasers have been processed
                    setTimeout(() => {
                        if (this.lasers.length === 0 && !this.gameOver) {
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
        if (this.challengeCompleted) return;
        
        this.challengeCompleted = true;
        const completionTime = Math.round(this.gameTime);
        const score = Math.max(1000 - completionTime * 10, 100); // Higher score for faster completion
        
        // Mark as completed in localStorage
        DailyChallenge.markCompleted(score, completionTime);
        
        // Update UI
        this.updateModeButtons();
        this.updateDailyInfo();
        
        // Show success message
        const statusEl = document.getElementById('status');
        statusEl.textContent = `Daily Challenge Complete! Time: ${completionTime}s, Score: ${score}`;
        statusEl.className = 'status-modern status-success';
    };
});

// Export the Game class for potential external use
export { Game };