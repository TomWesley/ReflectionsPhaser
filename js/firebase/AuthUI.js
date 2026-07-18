/**
 * AuthUI - the SINGLE shared account UI for the whole site (game + leaderboard).
 *
 * It owns the auth modal (injected on demand), all the sign-in / sign-up /
 * Google / sign-out handlers, and the navbar user display. Both pages call
 * initAuthUI(), so there is exactly one implementation — no more drift between
 * the game page and the leaderboard.
 *
 * Unique usernames are enforced on EVERY account-creation path (email sign-up
 * AND the Google display-name picker) via reserveUsername.
 */
import { getFirestore } from './FirebaseConfig.js';
import { GameService } from './GameService.js';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,16}$/;

let _auth = null;
let _onChange = () => {};
let _gameService = null;
let _authModalOriginalHTML = null;

function gameService() {
    if (window.gameService) return window.gameService;      // game page sets this
    if (!_gameService) _gameService = new GameService();    // leaderboard: make our own
    return _gameService;
}

function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

const AUTH_MODAL_HTML = `
    <div id="authModal" class="rules-modal hidden" role="dialog" aria-modal="true" aria-label="Account">
        <div class="rules-content auth-modal-content">
            <div class="auth-modal-header">
                <span class="auth-modal-title">Create Account</span>
                <button class="auth-modal-close" onclick="closeAuthModal()"><i class="iconoir-xmark"></i></button>
            </div>
            <div class="auth-modal-body">
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="signup" onclick="switchAuthTab('signup')">Create Account</button>
                    <button class="auth-tab" data-tab="signin" onclick="switchAuthTab('signin')">Sign In</button>
                </div>
                <div id="authSignInForm" class="auth-form" style="display:none;">
                    <input type="email" id="authEmail" class="auth-input" placeholder="Email" autocomplete="email">
                    <input type="password" id="authPassword" class="auth-input" placeholder="Password" autocomplete="current-password">
                    <button class="auth-btn-primary" onclick="doEmailSignIn()">Sign In</button>
                    <button class="auth-btn-link" onclick="doPasswordReset()">Forgot password?</button>
                </div>
                <div id="authSignUpForm" class="auth-form">
                    <input type="text" id="authSignUpName" class="auth-input" placeholder="Username (3–16 chars, must be unique)" maxlength="16" autocomplete="username">
                    <input type="email" id="authSignUpEmail" class="auth-input" placeholder="Email" autocomplete="email">
                    <input type="password" id="authSignUpPassword" class="auth-input" placeholder="Password (6+ characters)" autocomplete="new-password">
                    <button class="auth-btn-primary" onclick="doEmailSignUp()">Create Account</button>
                </div>
                <div class="auth-divider"><span>or</span></div>
                <button class="auth-btn-google" onclick="doGoogleSignInFromModal()">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                </button>
                <div id="authSignedInView">
                    <div class="auth-signedin-icon"><i class="iconoir-user"></i></div>
                    <div class="auth-signedin-label">Signed in as <strong id="authSignedInName"></strong></div>
                    <button class="auth-btn-primary" onclick="doSignOut()"><i class="iconoir-log-out"></i> Sign Out</button>
                </div>
                <div id="authError" class="auth-error"></div>
            </div>
        </div>
    </div>`;

function ensureModal() {
    if (document.getElementById('authModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = AUTH_MODAL_HTML.trim();
    document.body.appendChild(wrap.firstElementChild);
}

window.openAuthModal = function() {
    const modal = document.getElementById('authModal');
    const body = modal.querySelector('.auth-modal-body');
    if (_authModalOriginalHTML && !document.getElementById('authSignInForm')) {
        body.innerHTML = _authModalOriginalHTML;
    }
    if (_auth && _auth.isSignedIn()) {
        const nameEl = document.getElementById('authSignedInName');
        if (nameEl) nameEl.textContent = _auth.getDisplayNameOrDefault();
        body.classList.add('signed-in');
        modal.querySelector('.auth-modal-title').textContent = 'Account';
    } else {
        body.classList.remove('signed-in');
        window.switchAuthTab('signup');   // default to Create Account
    }
    modal.classList.remove('hidden');
    const errEl = document.getElementById('authError');
    if (errEl) errEl.textContent = '';
};

window.closeAuthModal = function() {
    document.getElementById('authModal').classList.add('hidden');
    const errEl = document.getElementById('authError');
    if (errEl) errEl.textContent = '';
};

window.switchAuthTab = function(tab) {
    document.querySelectorAll('#authModal .auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('authError').textContent = '';
    document.getElementById('authSignInForm').style.display = (tab === 'signin') ? 'flex' : 'none';
    document.getElementById('authSignUpForm').style.display = (tab === 'signup') ? 'flex' : 'none';
    const titleEl = document.querySelector('#authModal .auth-modal-title');
    if (titleEl) titleEl.textContent = (tab === 'signup') ? 'Create Account' : 'Sign In';
};

window.doEmailSignIn = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    if (!email || !password) { errorEl.textContent = 'Please enter email and password.'; return; }
    errorEl.textContent = '';
    const result = await _auth.signInWithEmail(email, password);
    if (result.success) { window.closeAuthModal(); afterAuth(); toast('Signed in successfully!'); }
    else { errorEl.textContent = result.error || 'Sign in failed.'; }
};

window.doEmailSignUp = async function() {
    const name = document.getElementById('authSignUpName').value.trim();
    const email = document.getElementById('authSignUpEmail').value.trim();
    const password = document.getElementById('authSignUpPassword').value;
    const errorEl = document.getElementById('authError');
    if (!USERNAME_RE.test(name)) { errorEl.textContent = 'Username must be 3–16 characters: letters, numbers, _ or -.'; return; }
    if (!email || !password) { errorEl.textContent = 'Please enter email and password.'; return; }
    errorEl.textContent = '';
    // Claim the unique username FIRST — a taken name blocks account creation.
    try {
        await gameService().reserveUsername(name);
    } catch (e) {
        errorEl.textContent = usernameError(e);
        return;
    }
    const result = await _auth.signUpWithEmail(email, password, name);
    if (result.success) { window.closeAuthModal(); afterAuth(); toast('Account created!'); }
    else { errorEl.textContent = result.error || 'Sign up failed.'; }
};

window.doGoogleSignInFromModal = async function() {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';
    const result = await _auth.signInWithGoogle();
    if (result.success) {
        if (!_auth.getDisplayName()) {
            showNamePicker(result.user.displayName || '');   // must pick a unique username
        } else {
            window.closeAuthModal(); afterAuth(); toast('Signed in with Google!');
        }
    } else if (result.error) {
        errorEl.textContent = result.error;
    }
};

window.doPasswordReset = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const errorEl = document.getElementById('authError');
    if (!email) { errorEl.textContent = 'Enter your email above, then click forgot password.'; return; }
    const result = await _auth.sendPasswordReset(email);
    if (result.success) {
        errorEl.style.color = '#32FFB4';
        errorEl.textContent = 'Password reset email sent!';
        setTimeout(() => { errorEl.style.color = ''; }, 3000);
    } else {
        errorEl.textContent = result.error;
    }
};

window.doSignOut = async function() {
    try { await _auth.signOut(); } catch (e) { console.warn('Sign out error:', e.message); }
    window.closeAuthModal();
    afterAuth();
    toast('Signed out.');
};

function showNamePicker(suggestedName) {
    const body = document.querySelector('#authModal .auth-modal-body');
    const title = document.querySelector('#authModal .auth-modal-title');
    if (!_authModalOriginalHTML) _authModalOriginalHTML = body.innerHTML;
    title.textContent = 'Choose a Username';
    body.classList.remove('signed-in');
    body.innerHTML = `
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Pick a unique username — this is how you'll appear on the leaderboard.
        </p>
        <div class="auth-form">
            <input type="text" id="namePickerInput" class="auth-input" placeholder="Username (3–16 chars)" maxlength="16" value="${String(suggestedName).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16)}">
            <button class="auth-btn-primary" onclick="confirmNamePick()">Confirm</button>
        </div>
        <div id="namePickerError" class="auth-error"></div>`;
    const input = document.getElementById('namePickerInput');
    input.focus();
    input.select();
}

window.confirmNamePick = async function() {
    const name = (document.getElementById('namePickerInput').value || '').trim();
    const errorEl = document.getElementById('namePickerError');
    if (!USERNAME_RE.test(name)) { errorEl.textContent = 'Username must be 3–16 characters: letters, numbers, _ or -.'; return; }
    try {
        await gameService().reserveUsername(name);
    } catch (e) {
        errorEl.textContent = usernameError(e);
        return;
    }
    _auth.setDisplayName(name);
    try { await _auth.getUser().updateProfile({ displayName: name }); } catch (e) { /* non-fatal */ }
    window.closeAuthModal();
    afterAuth();
    toast('Welcome, ' + name + '!');
};

function usernameError(e) {
    return /taken|already-exists/i.test(e.message || '')
        ? 'That username is taken — pick another.'
        : (e.message || 'Could not reserve that username.');
}

async function updateNavbarUser() {
    const signedIn = _auth && _auth.isSignedIn();
    const el = document.getElementById('navbarUser');
    const mobileRow = document.getElementById('mobileAccountRow');
    const mobileName = document.getElementById('mobileAccountName');

    // Best name we can show synchronously, without waiting on the network. Prefer
    // the locally-cached username, then the provider profile name, then the email
    // local-part — anything real before an anonymous "Account" placeholder.
    let name = 'Sign In';
    if (signedIn) {
        const u = _auth.getUser();
        name = _auth.getDisplayName()
            || (u && u.displayName)
            || (u && u.email && u.email.split('@')[0])
            || 'Account';
    }

    const setName = (n) => {
        if (el) el.textContent = n;
        if (mobileName) mobileName.textContent = signedIn ? n : 'Sign in';
    };
    setName(name);
    if (el) {
        el.onclick = () => window.openAuthModal();
        el.style.cursor = 'pointer';
        el.title = signedIn ? 'Account' : 'Sign in to save scores';
    }
    if (mobileRow) {
        mobileRow.classList.toggle('signed-in', !!signedIn);
        mobileRow.onclick = () => { if (window.closeMobileMenu) window.closeMobileMenu(); window.openAuthModal(); };
    }

    // Upgrade to the authoritative server username and cache it locally, so every
    // page/load shows the same name instantly even if a later read is rate-limited
    // or blocked by an App Check token that hasn't arrived yet.
    if (signedIn) {
        try {
            const snap = await getFirestore().collection('users').doc(_auth.getUID()).get();
            const uname = snap.exists && snap.data().username;
            if (uname) {
                _auth.setDisplayName(uname);
                setName(uname);
            }
        } catch (e) { /* keep the best local name */ }
    }
}

// Runs after any auth change: refresh the navbar and let the page react.
function afterAuth() {
    updateNavbarUser();
    try { _onChange(); } catch (e) { console.warn('auth onChange error:', e.message); }
}

/**
 * Wire the shared auth UI into a page.
 * @param {Object} opts
 * @param {FirebaseAuth} opts.auth
 * @param {Function} [opts.onChange] page-specific reaction to auth changes
 */
export function initAuthUI({ auth, onChange }) {
    _auth = auth;
    _onChange = onChange || (() => {});
    ensureModal();
    updateNavbarUser();
    _auth.onAuthChange(() => afterAuth());
}
