// Initialize Firebase leaderboard services
async function initFirebaseServices(cacheBust) {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded');
        return;
    }

    const { FirebaseAuth } = await import(`./firebase/FirebaseAuth.js${cacheBust}`);
    const { LeaderboardService } = await import(`./firebase/LeaderboardService.js${cacheBust}`);
    const { VideoUploader } = await import(`./firebase/VideoUploader.js${cacheBust}`);

    const auth = new FirebaseAuth();
    await auth.ensureAuth();

    const leaderboardService = new LeaderboardService(auth);
    const videoUploader = new VideoUploader(auth, leaderboardService);

    window.firebaseAuth = auth;
    window.leaderboardService = leaderboardService;
    window.videoUploader = videoUploader;

    // Pre-fill name input from saved name or Google profile
    const savedName = auth.getDisplayName() || auth.generateDefaultName();
    if (savedName) {
        const nameInputs = document.querySelectorAll('.player-name-input');
        nameInputs.forEach(input => { input.value = savedName; });
    }

    // Update UI when auth state changes (e.g., after Google/email sign-in)
    auth.onAuthChange(() => {
        syncNameInputs();
        // Auto-submit score if game is over and user just signed in
        if (window.game && window.game.gameOver && !auth.isAnonymous()) {
            if (typeof window.submitScore === 'function') window.submitScore();
        }
    });

    // Show the leaderboard submit UI in modals
    document.querySelectorAll('.leaderboard-submit').forEach(el => el.classList.remove('hidden'));
}


// Auth modal functions
window.openAuthModal = function() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authError').textContent = '';
};

window.closeAuthModal = function() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('authError').textContent = '';
};

window.switchAuthTab = function(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('authError').textContent = '';
    if (tab === 'signup') {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('authSignInForm').style.display = 'none';
        document.getElementById('authSignUpForm').style.display = 'flex';
    } else {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('authSignInForm').style.display = 'flex';
        document.getElementById('authSignUpForm').style.display = 'none';
    }
};

window.doEmailSignIn = async function() {
    if (!window.firebaseAuth) return;
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');

    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password.';
        return;
    }

    errorEl.textContent = '';
    const result = await window.firebaseAuth.signInWithEmail(email, password);
    if (result.success) {
        closeAuthModal();
        syncNameInputs();
        showToast('Signed in successfully!');
    } else {
        errorEl.textContent = result.error || 'Sign in failed.';
    }
};

window.doEmailSignUp = async function() {
    if (!window.firebaseAuth) return;
    const name = document.getElementById('authSignUpName').value.trim();
    const email = document.getElementById('authSignUpEmail').value.trim();
    const password = document.getElementById('authSignUpPassword').value;
    const errorEl = document.getElementById('authError');

    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password.';
        return;
    }

    errorEl.textContent = '';
    const result = await window.firebaseAuth.signUpWithEmail(email, password, name);
    if (result.success) {
        closeAuthModal();
        syncNameInputs();
        showToast('Account created!');
    } else {
        errorEl.textContent = result.error || 'Sign up failed.';
    }
};

window.doGoogleSignInFromModal = async function() {
    if (!window.firebaseAuth) return;
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';
    const result = await window.firebaseAuth.signInWithGoogle();
    if (result.success) {
        closeAuthModal();
        syncNameInputs();
        showToast('Signed in with Google!');
    } else if (result.error) {
        errorEl.textContent = result.error;
    }
};

window.doPasswordReset = async function() {
    if (!window.firebaseAuth) return;
    const email = document.getElementById('authEmail').value.trim();
    const errorEl = document.getElementById('authError');

    if (!email) {
        errorEl.textContent = 'Enter your email above, then click forgot password.';
        return;
    }

    const result = await window.firebaseAuth.sendPasswordReset(email);
    if (result.success) {
        errorEl.style.color = '#32FFB4';
        errorEl.textContent = 'Password reset email sent!';
        setTimeout(() => { errorEl.style.color = ''; }, 3000);
    } else {
        errorEl.textContent = result.error;
    }
};

function syncNameInputs() {
    if (!window.firebaseAuth) return;
    const name = window.firebaseAuth.getDisplayName() || window.firebaseAuth.generateDefaultName();
    document.querySelectorAll('.player-name-input').forEach(input => { input.value = name; });
    updateSubmitUI(window.firebaseAuth);
}

// Initialize the game when the page loads with error handling
document.addEventListener('DOMContentLoaded', async () => {
    // Cache-busting: daily granularity (caches within a session, busts across deploys)
    const today = new Date().toISOString().slice(0, 10);
    const cacheBust = `?v=${today}`;

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
                game.launchLasers();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                game.resetGame();
            });
        }

        // Initialize Firebase leaderboard services (non-blocking)
        initFirebaseServices(cacheBust).catch(err => {
            console.warn('Firebase leaderboard unavailable:', err.message);
        });

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