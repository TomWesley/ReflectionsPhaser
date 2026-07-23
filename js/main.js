// Initialize Firebase leaderboard services
async function initFirebaseServices(cacheBust) {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded');
        return;
    }

    const { FirebaseAuth } = await import(`./firebase/FirebaseAuth.js${cacheBust}`);
    const { LeaderboardService } = await import(`./firebase/LeaderboardService.js${cacheBust}`);
    const { VideoUploader } = await import(`./firebase/VideoUploader.js${cacheBust}`);
    const { GameService } = await import(`./firebase/GameService.js${cacheBust}`);
    const { initAuthUI } = await import(`./firebase/AuthUI.js${cacheBust}`);

    const auth = new FirebaseAuth();
    await auth.ensureAuth();

    const leaderboardService = new LeaderboardService(auth);
    const videoUploader = new VideoUploader(auth, leaderboardService);
    const gameService = new GameService();

    window.firebaseAuth = auth;
    window.leaderboardService = leaderboardService;
    window.videoUploader = videoUploader;
    window.gameService = gameService;

    // Pre-fill name input from saved name or Google profile
    const savedName = auth.getDisplayName() || auth.generateDefaultName();
    if (savedName) {
        const nameInputs = document.querySelectorAll('.player-name-input');
        nameInputs.forEach(input => { input.value = savedName; });
    }

    // Wire the shared account UI (navbar + modal + sign-in / sign-up / sign-out /
    // unique-username enforcement). Same module the leaderboard page uses.
    initAuthUI({
        auth,
        onChange: () => {
            syncNameInputs();
            // Auto-submit the score if the game is over and the user just signed in.
            if (window.game && window.game.gameOver && !auth.isAnonymous()
                && typeof window.submitScore === 'function') {
                window.submitScore();
            }
        }
    });

    // Show the leaderboard submit UI in modals
    document.querySelectorAll('.leaderboard-submit').forEach(el => el.classList.remove('hidden'));
}


function syncNameInputs() {
    if (!window.firebaseAuth) return;
    const name = window.firebaseAuth.getDisplayName() || window.firebaseAuth.generateDefaultName();
    document.querySelectorAll('.player-name-input').forEach(input => { input.value = name; });
}

// Initialize the game when the page loads with error handling
document.addEventListener('DOMContentLoaded', async () => {
    // Cache-busting: daily granularity (caches within a session, busts across deploys)
    const today = new Date().toISOString().slice(0, 10);
    const cacheBust = `?v=${today}`;

    // Install the Arcade Graphics Engine theme (fonts + CSS) as early as possible,
    // non-blocking. Purely visual — no effect on game logic.
    import(`./theme/ArcadeTheme.js${cacheBust}`).then(m => m.initArcadeTheme()).catch(() => {});

    // Loading is indicated by the #canvasLoader overlay, removed once the game renders.

    try {
        // Import modules with cache-busting
        const { Game } = await import(`./classes/Game.js${cacheBust}`);

        const game = new Game();

        // NOTE: the loading overlay is removed by Game.setupBoard() once the first
        // board is ready (it waits for the server-issued ranked board), not here.

        // Expose game instance globally for modal functions
        window.game = game;

        // Setup game control buttons
        // Launch/Reset click handlers are bound once in Game.setupEventListeners().
        // Do NOT bind them again here — a second listener fires launchLasers()/resetGame()
        // twice per click, double-starting the recorder and churning laser state.

        // Initialize Firebase leaderboard services (non-blocking)
        initFirebaseServices(cacheBust).catch(err => {
            console.warn('Firebase leaderboard unavailable:', err.message);
            if (typeof showToast === 'function') {
                showToast('Leaderboard unavailable - scores won\'t be saved', 5000);
            }
        });

        // Offline/online indicators
        window.addEventListener('offline', () => {
            if (typeof showToast === 'function') {
                showToast('You are offline - scores won\'t be saved', 5000);
            }
        });
        window.addEventListener('online', () => {
            if (typeof showToast === 'function') {
                showToast('Back online', 2000);
            }
        });

    } catch (error) {
        console.error('Failed to load game modules:', error);

        // Surface a visible error. There is no #status element in the DOM, so use
        // the toast system (otherwise this failure is silent until the confirm below).
        if (typeof showToast === 'function') {
            showToast('Loading failed. Please refresh the page.', 6000);
        }

        // Try to reload after a short delay
        setTimeout(() => {
            if (confirm('Game failed to load properly. Reload the page?')) {
                window.location.reload();
            }
        }, 2000);
    }
});