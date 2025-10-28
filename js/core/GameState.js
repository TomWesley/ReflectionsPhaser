import { DailyChallenge } from '../validation/DailyChallenge.js';

/**
 * Manages game state and mode switching
 * Extracted from Game.js without changing behavior
 */
export class GameState {
    constructor(game) {
        this.game = game;
    }

    setupModeButtons() {
        const freePlayBtn = document.getElementById('freePlayBtn');
        const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');

        freePlayBtn.addEventListener('click', () => this.switchToFreePlay());
        dailyChallengeBtn.addEventListener('click', () => this.switchToDailyChallenge());

        // Update button states
        this.updateModeButtons();
    }

    switchToFreePlay() {
        if (this.game.isPlaying) return; // Don't allow mode switch during gameplay

        this.game.gameMode = 'freePlay';
        this.game.dailyPuzzle = null;
        this.game.challengeCompleted = false;
        this.updateModeButtons();
        this.updateDailyInfo();
        this.game.resetGame();
    }

    switchToDailyChallenge() {
        if (this.game.isPlaying) return; // Don't allow mode switch during gameplay

        this.game.gameMode = 'dailyChallenge';
        this.game.challengeCompleted = false;
        this.updateModeButtons();
        this.updateDailyInfo();
        this.game.resetGame();
    }

    updateModeButtons() {
        const freePlayBtn = document.getElementById('freePlayBtn');
        const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');

        // Remove active class from both
        freePlayBtn.classList.remove('active');
        dailyChallengeBtn.classList.remove('active');

        // Add active class to current mode
        if (this.game.gameMode === 'freePlay') {
            freePlayBtn.classList.add('active');
        } else {
            dailyChallengeBtn.classList.add('active');
        }
    }

    updateDailyInfo() {
        const dailyInfo = document.getElementById('dailyInfo');

        if (this.game.gameMode === 'dailyChallenge') {
            // Show daily challenge info
            this.game.dailyPuzzle = DailyChallenge.generateDailyChallenge();

            const dateStr = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let statusText = '';
            if (DailyChallenge.hasCompletedToday()) {
                const completion = DailyChallenge.getCompletionStatus();
                statusText = `<span style="color: #4CAF50;">✓ Completed!</span> (${completion.completionTime}s, Score: ${completion.score})`;
                this.game.challengeCompleted = true;
            } else {
                statusText = '<span style="color: #FFA500;">⏳ In Progress</span>';
                this.game.challengeCompleted = false;
            }

            dailyInfo.innerHTML = `
                <h3>Daily Challenge - ${dateStr}</h3>
                <p><strong>Target:</strong> ${this.game.dailyPuzzle.surfaceArea} units²</p>
                <p><strong>Status:</strong> ${statusText}</p>
            `;
            dailyInfo.style.display = 'block';
        } else {
            // Hide daily challenge info
            dailyInfo.style.display = 'none';
        }
    }
}