import { DailyChallenge } from '../utils/DailyChallenge.js';

/**
 * GameModeManager - Manages game modes (Free Play vs Daily Challenge)
 * Responsibilities:
 * - Switching between game modes
 * - Updating UI buttons and displays
 * - Managing daily challenge state
 * - Providing mode-specific information
 */
export class GameModeManager {
    constructor(game) {
        this.game = game;
        this.currentMode = 'freePlay'; // 'freePlay' or 'dailyChallenge'
        this.dailyPuzzle = null;
        this.challengeCompleted = false;
    }

    /**
     * Initialize mode buttons and event listeners
     */
    setupModeButtons() {
        const freePlayBtn = document.getElementById('freePlayBtn');
        const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');

        freePlayBtn.addEventListener('click', () => this.switchToFreePlay());
        dailyChallengeBtn.addEventListener('click', () => this.switchToDailyChallenge());

        // Update button states
        this.updateModeButtons();
    }

    /**
     * Switch to Free Play mode
     */
    switchToFreePlay() {
        if (this.game.isPlaying) return; // Don't allow mode switch during gameplay

        this.currentMode = 'freePlay';
        this.dailyPuzzle = null;
        this.challengeCompleted = false;
        this.updateModeButtons();
        this.updateDailyInfo();
        this.game.resetGame();
    }

    /**
     * Switch to Daily Challenge mode
     */
    switchToDailyChallenge() {
        if (this.game.isPlaying) return; // Don't allow mode switch during gameplay

        this.currentMode = 'dailyChallenge';
        this.challengeCompleted = DailyChallenge.hasCompletedToday();
        this.updateModeButtons();
        this.updateDailyInfo();
        this.game.resetGame();
    }

    /**
     * Update mode button states
     */
    updateModeButtons() {
        const freePlayBtn = document.getElementById('freePlayBtn');
        const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');
        const resetBtn = document.getElementById('resetBtn');

        // Update active states
        freePlayBtn.classList.toggle('active', this.currentMode === 'freePlay');
        dailyChallengeBtn.classList.toggle('active', this.currentMode === 'dailyChallenge');

        // Update completed state for daily challenge
        const isCompleted = DailyChallenge.hasCompletedToday();
        dailyChallengeBtn.classList.toggle('completed', isCompleted);

        // Hide reset button during daily challenge mode
        if (resetBtn) {
            resetBtn.style.display = this.currentMode === 'dailyChallenge' ? 'none' : '';
        }

        // Button text is handled by CSS for completed state
        dailyChallengeBtn.textContent = 'Daily Challenge';
    }

    /**
     * Update daily challenge info display
     */
    updateDailyInfo() {
        const dailyInfo = document.getElementById('dailyInfo');
        const dailyDate = dailyInfo.querySelector('.daily-date');
        const dailyStatus = dailyInfo.querySelector('.daily-status');

        if (this.currentMode === 'dailyChallenge') {
            dailyInfo.classList.remove('hidden');

            // Show today's date
            const today = DailyChallenge.getTodayString();
            const formattedDate = new Date(today).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
            dailyDate.textContent = formattedDate;

            // Show completion status
            if (DailyChallenge.hasCompletedToday()) {
                const score = DailyChallenge.getTodayScore();
                dailyStatus.textContent = `Completed in ${score.time}s`;
                dailyStatus.classList.add('completed');
            } else {
                dailyStatus.textContent = 'Not completed yet';
                dailyStatus.classList.remove('completed');
            }
        } else {
            dailyInfo.classList.add('hidden');
        }
    }

    /**
     * Generate daily puzzle data
     */
    generateDailyPuzzle() {
        this.dailyPuzzle = DailyChallenge.generatePuzzle();
        return this.dailyPuzzle;
    }

    /**
     * Check if currently in daily challenge mode
     */
    isDailyChallenge() {
        return this.currentMode === 'dailyChallenge';
    }

    /**
     * Check if currently in free play mode
     */
    isFreePlay() {
        return this.currentMode === 'freePlay';
    }

    /**
     * Check if daily challenge has been completed today
     */
    isDailyChallengeCompleted() {
        return DailyChallenge.hasCompletedToday();
    }

    /**
     * Get the current game mode
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * Get the daily puzzle data
     */
    getDailyPuzzle() {
        return this.dailyPuzzle;
    }
}
