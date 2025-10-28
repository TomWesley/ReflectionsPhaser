import { DailyChallenge } from '../validation/DailyChallenge.js';

/**
 * ModeUIController - Handles UI updates for game modes
 */
export class ModeUIController {
    /**
     * Update mode button states
     */
    static updateModeButtons(currentMode) {
        const freePlayBtn = document.getElementById('freePlayBtn');
        const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');
        const resetBtn = document.getElementById('resetBtn');

        // Update active states
        freePlayBtn.classList.toggle('active', currentMode === 'freePlay');
        dailyChallengeBtn.classList.toggle('active', currentMode === 'dailyChallenge');

        // Update completed state for daily challenge
        const isCompleted = DailyChallenge.hasCompletedToday();
        dailyChallengeBtn.classList.toggle('completed', isCompleted);

        // Hide reset button during daily challenge mode
        if (resetBtn) {
            resetBtn.style.display = currentMode === 'dailyChallenge' ? 'none' : '';
        }

        // Button text is handled by CSS for completed state
        dailyChallengeBtn.textContent = 'Daily Challenge';
    }

    /**
     * Update daily challenge info display
     */
    static updateDailyInfo(currentMode) {
        const dailyInfo = document.getElementById('dailyInfo');
        const dailyDate = dailyInfo.querySelector('.daily-date');
        const dailyStatus = dailyInfo.querySelector('.daily-status');

        if (currentMode === 'dailyChallenge') {
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
}
