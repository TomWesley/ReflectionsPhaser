import { DailyChallenge } from '../validation/DailyChallenge.js';
import { ModeUIController } from './ModeUIController.js';

/**
 * GameModeManager - Manages game modes (Free Play vs Daily Challenge)
 * Responsibilities:
 * - Switching between game modes
 * - Managing daily challenge state
 * - Providing mode-specific information
 */
export class GameModeManager {
    constructor(game) {
        this.game = game;
        this.currentMode = 'freePlay';
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

        this.updateModeButtons();
    }

    /**
     * Switch to Free Play mode
     */
    switchToFreePlay() {
        if (this.game.isPlaying) return;

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
        if (this.game.isPlaying) return;

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
        ModeUIController.updateModeButtons(this.currentMode);
    }

    /**
     * Update daily challenge info display
     */
    updateDailyInfo() {
        ModeUIController.updateDailyInfo(this.currentMode);
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
