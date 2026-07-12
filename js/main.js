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

    // Update UI when auth state changes (e.g., after Google/email sign-in)
    auth.onAuthChange(() => {
        syncNameInputs();
        updateNavbarUser(auth);
        // Auto-submit score if game is over and user just signed in
        if (window.game && window.game.gameOver && !auth.isAnonymous()) {
            if (typeof window.submitScore === 'function') window.submitScore();
        }
    });

    updateNavbarUser(auth);

    // Show the leaderboard submit UI in modals
    document.querySelectorAll('.leaderboard-submit').forEach(el => el.classList.remove('hidden'));
}


// Auth modal functions
let _authModalOriginalHTML = null;

window.openAuthModal = function() {
    const modal = document.getElementById('authModal');
    const body = modal.querySelector('.auth-modal-body');
    // Restore original content if it was replaced by name picker
    if (_authModalOriginalHTML && !document.getElementById('authSignInForm')) {
        body.innerHTML = _authModalOriginalHTML;
        modal.querySelector('.auth-modal-title').textContent = 'Sign In';
    }

    // If already signed in, show the account/sign-out view instead of the forms.
    const signedIn = window.firebaseAuth && window.firebaseAuth.isSignedIn();
    if (signedIn) {
        const nameEl = document.getElementById('authSignedInName');
        if (nameEl) nameEl.textContent = window.firebaseAuth.getDisplayNameOrDefault();
        body.classList.add('signed-in');
        modal.querySelector('.auth-modal-title').textContent = 'Account';
    } else {
        body.classList.remove('signed-in');
        // Default to Create Account — we optimize for getting new users in fast.
        switchAuthTab('signup');
    }

    modal.classList.remove('hidden');
    const errEl = document.getElementById('authError');
    if (errEl) errEl.textContent = '';
};

window.doSignOut = async function() {
    if (!window.firebaseAuth) return;
    try {
        await window.firebaseAuth.signOut();
    } catch (e) {
        console.warn('Sign out error:', e.message);
    }
    updateNavbarUser(window.firebaseAuth);
    syncNameInputs();
    closeAuthModal();
    if (typeof showToast === 'function') showToast('Signed out.');
};

window.closeAuthModal = function() {
    document.getElementById('authModal').classList.add('hidden');
    const errEl = document.getElementById('authError');
    if (errEl) errEl.textContent = '';
};

window.switchAuthTab = function(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('authError').textContent = '';
    document.getElementById('authSignInForm').style.display = (tab === 'signin') ? 'flex' : 'none';
    document.getElementById('authSignUpForm').style.display = (tab === 'signup') ? 'flex' : 'none';
    const titleEl = document.querySelector('#authModal .auth-modal-title');
    if (titleEl) titleEl.textContent = (tab === 'signup') ? 'Create Account' : 'Sign In';
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

    if (!/^[a-zA-Z0-9_-]{3,16}$/.test(name)) {
        errorEl.textContent = 'Username must be 3–16 characters: letters, numbers, _ or -.';
        return;
    }
    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password.';
        return;
    }

    errorEl.textContent = '';

    // Claim the unique username FIRST — a taken name blocks account creation.
    if (window.gameService) {
        try {
            await window.gameService.reserveUsername(name);
        } catch (e) {
            errorEl.textContent = /taken|already-exists/i.test(e.message || '')
                ? 'That username is taken — pick another.'
                : (e.message || 'Could not reserve that username.');
            return;
        }
    }

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
        // If user hasn't chosen a display name yet, prompt them
        if (!window.firebaseAuth.getDisplayName()) {
            showNamePicker(result.user.displayName || '');
        } else {
            closeAuthModal();
            syncNameInputs();
            showToast('Signed in with Google!');
        }
    } else if (result.error) {
        errorEl.textContent = result.error;
    }
};

// Show inline name picker inside the auth modal
function showNamePicker(suggestedName) {
    const body = document.querySelector('#authModal .auth-modal-body');
    const title = document.querySelector('#authModal .auth-modal-title');
    // Save original HTML so we can restore it later
    if (!_authModalOriginalHTML) {
        _authModalOriginalHTML = body.innerHTML;
    }
    title.textContent = 'Choose Display Name';
    body.innerHTML = `
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            This is how you'll appear on the leaderboard.
        </p>
        <div class="auth-form">
            <input type="text" id="namePickerInput" class="auth-input" placeholder="Display name" maxlength="16" value="${suggestedName.replace(/"/g, '&quot;').slice(0, 16)}">
            <button class="auth-btn-primary" onclick="confirmNamePick()">Confirm</button>
        </div>
        <div id="namePickerError" class="auth-error"></div>
    `;
    document.getElementById('namePickerInput').focus();
    document.getElementById('namePickerInput').select();
}

window.confirmNamePick = function() {
    const input = document.getElementById('namePickerInput');
    const name = (input.value || '').trim();
    const errorEl = document.getElementById('namePickerError');

    if (!name) {
        errorEl.textContent = 'Please enter a display name.';
        return;
    }

    window.firebaseAuth.setDisplayName(name);
    closeAuthModal();
    syncNameInputs();
    showToast('Welcome, ' + name + '!');

    // Restore auth modal to default state for next open
    restoreAuthModal();
};

function restoreAuthModal() {
    const title = document.querySelector('#authModal .auth-modal-title');
    title.textContent = 'Sign In';
    // Re-render the original auth modal body on next open
    // (openAuthModal already resets state via switchAuthTab)
}

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

function updateNavbarUser(auth) {
    // Desktop navbar
    const el = document.getElementById('navbarUser');
    if (el) {
        if (auth.isSignedIn()) {
            el.textContent = auth.getDisplayNameOrDefault();
            el.onclick = () => openAuthModal();   // opens the account / sign-out view
            el.style.cursor = 'pointer';
            el.title = 'Account';
        } else {
            el.textContent = 'Sign In';
            el.onclick = () => openAuthModal();
            el.style.cursor = 'pointer';
            el.title = 'Sign in to save scores';
        }
    }

    // Mobile menu footer
    const mobileRow = document.getElementById('mobileAccountRow');
    const mobileName = document.getElementById('mobileAccountName');
    if (mobileRow && mobileName) {
        if (auth.isSignedIn()) {
            mobileName.textContent = auth.getDisplayNameOrDefault();
            mobileRow.classList.add('signed-in');
            mobileRow.onclick = () => {   // opens the account / sign-out view
                closeMobileMenu();
                openAuthModal();
            };
        } else {
            mobileName.textContent = 'Sign in';
            mobileRow.classList.remove('signed-in');
            mobileRow.onclick = () => {
                closeMobileMenu();
                openAuthModal();
            };
        }
    }
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