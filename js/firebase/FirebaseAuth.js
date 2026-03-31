/**
 * FirebaseAuth - Anonymous + Google + Email/Password authentication
 *
 * Players start as anonymous (zero friction). They can optionally sign in with
 * Google or create an email/password account to persist identity across devices.
 * Anonymous accounts are linked to the new credential so existing scores transfer.
 */
import { getAuth } from './FirebaseConfig.js';

export class FirebaseAuth {
    constructor() {
        this.user = null;
        this.ready = false;
        this._readyPromise = null;
        this._onAuthChangeCallbacks = [];
    }

    /**
     * Ensure auth is established (anonymous if no prior session). Safe to call multiple times.
     * @returns {Promise<firebase.User>}
     */
    async ensureAuth() {
        if (this.ready && this.user) return this.user;

        if (this._readyPromise) return this._readyPromise;

        this._readyPromise = new Promise((resolve) => {
            const auth = getAuth();

            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.user = user;
                    this.ready = true;
                    this._syncGoogleDisplayName(user);
                    unsubscribe();
                    resolve(user);
                } else {
                    try {
                        const cred = await auth.signInAnonymously();
                        this.user = cred.user;
                        this.ready = true;
                        unsubscribe();
                        resolve(cred.user);
                    } catch (error) {
                        console.error('Anonymous auth failed:', error);
                        this.ready = true;
                        unsubscribe();
                        resolve(null);
                    }
                }
            });
        });

        return this._readyPromise;
    }

    /**
     * Sign in with Google. If currently anonymous, links the Google credential
     * to the existing anonymous account so scores are preserved.
     * @returns {{ success: boolean, user: firebase.User|null, error: string|null }}
     */
    async signInWithGoogle() {
        const auth = getAuth();
        const provider = new firebase.auth.GoogleAuthProvider();

        try {
            if (this.user && this.user.isAnonymous) {
                // Link anonymous account to Google — preserves UID and scores
                const result = await this.user.linkWithPopup(provider);
                this.user = result.user;
                this._syncGoogleDisplayName(this.user);
                this._notifyAuthChange();
                return { success: true, user: this.user, error: null };
            }

            // Already signed in with Google or fresh sign-in
            const result = await auth.signInWithPopup(provider);
            this.user = result.user;
            this._syncGoogleDisplayName(this.user);
            this._notifyAuthChange();
            return { success: true, user: this.user, error: null };

        } catch (error) {
            // If linking fails because Google account already linked to another user,
            // sign in directly with Google instead (drops the anonymous account)
            if (error.code === 'auth/credential-already-in-use') {
                try {
                    const result = await auth.signInWithCredential(error.credential);
                    this.user = result.user;
                    this._syncGoogleDisplayName(this.user);
                    this._notifyAuthChange();
                    return { success: true, user: this.user, error: null };
                } catch (innerError) {
                    console.error('Google sign-in fallback failed:', innerError);
                    return { success: false, user: null, error: innerError.message };
                }
            }

            // User closed the popup
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                return { success: false, user: null, error: null };
            }

            console.error('Google sign-in failed:', error);
            return { success: false, user: null, error: error.message };
        }
    }

    /**
     * Create a new account with email and password.
     * If currently anonymous, links the credential to preserve scores.
     * @returns {{ success: boolean, user: firebase.User|null, error: string|null }}
     */
    async signUpWithEmail(email, password, displayName) {
        const auth = getAuth();

        try {
            const credential = firebase.auth.EmailAuthProvider.credential(email, password);

            if (this.user && this.user.isAnonymous) {
                // Link anonymous account to email — preserves UID and scores
                const result = await this.user.linkWithCredential(credential);
                this.user = result.user;
                // Set display name on the Firebase profile
                await this.user.updateProfile({ displayName: displayName || email.split('@')[0] });
                if (displayName) this.setDisplayName(displayName);
                this._notifyAuthChange();
                return { success: true, user: this.user, error: null };
            }

            // Fresh sign-up (no anonymous session)
            const result = await auth.createUserWithEmailAndPassword(email, password);
            this.user = result.user;
            await this.user.updateProfile({ displayName: displayName || email.split('@')[0] });
            if (displayName) this.setDisplayName(displayName);
            this._notifyAuthChange();
            return { success: true, user: this.user, error: null };

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                return { success: false, user: null, error: 'Email already in use. Try signing in instead.' };
            }
            if (error.code === 'auth/weak-password') {
                return { success: false, user: null, error: 'Password must be at least 6 characters.' };
            }
            if (error.code === 'auth/invalid-email') {
                return { success: false, user: null, error: 'Invalid email address.' };
            }
            console.error('Email sign-up failed:', error);
            return { success: false, user: null, error: error.message };
        }
    }

    /**
     * Sign in with existing email and password.
     * @returns {{ success: boolean, user: firebase.User|null, error: string|null }}
     */
    async signInWithEmail(email, password) {
        const auth = getAuth();

        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            this.user = result.user;
            // Sync display name from profile
            if (this.user.displayName && !this.getDisplayName()) {
                this.setDisplayName(this.user.displayName);
            }
            this._notifyAuthChange();
            return { success: true, user: this.user, error: null };

        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                return { success: false, user: null, error: 'Invalid email or password.' };
            }
            if (error.code === 'auth/invalid-email') {
                return { success: false, user: null, error: 'Invalid email address.' };
            }
            if (error.code === 'auth/too-many-requests') {
                return { success: false, user: null, error: 'Too many attempts. Please try again later.' };
            }
            console.error('Email sign-in failed:', error);
            return { success: false, user: null, error: error.message };
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(email) {
        const auth = getAuth();
        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true, error: null };
        } catch (error) {
            return { success: false, error: 'Could not send reset email. Check the address.' };
        }
    }

    /**
     * Sign out and revert to anonymous auth
     */
    async signOut() {
        const auth = getAuth();
        await auth.signOut();
        // Sign back in anonymously
        const cred = await auth.signInAnonymously();
        this.user = cred.user;
        this._notifyAuthChange();
    }

    /**
     * Register a callback for auth state changes
     */
    onAuthChange(callback) {
        this._onAuthChangeCallbacks.push(callback);
    }

    _notifyAuthChange() {
        this._onAuthChangeCallbacks.forEach(cb => {
            try { cb(this.user); } catch (e) { console.error('Auth change callback error:', e); }
        });
    }

    /**
     * If signed in with Google, auto-save Google display name
     */
    _syncGoogleDisplayName(user) {
        if (!user || user.isAnonymous) return;
        const googleName = user.displayName;
        if (googleName && !this.getDisplayName()) {
            this.setDisplayName(googleName);
        }
    }

    getUser() {
        return this.user;
    }

    getUID() {
        return this.user ? this.user.uid : null;
    }

    isGoogleUser() {
        if (!this.user) return false;
        return this.user.providerData.some(p => p.providerId === 'google.com');
    }

    isEmailUser() {
        if (!this.user) return false;
        return this.user.providerData.some(p => p.providerId === 'password');
    }

    isSignedIn() {
        return this.user && !this.user.isAnonymous;
    }

    isAnonymous() {
        return this.user ? this.user.isAnonymous : true;
    }

    getGooglePhotoURL() {
        if (!this.user) return null;
        const google = this.user.providerData.find(p => p.providerId === 'google.com');
        return google ? google.photoURL : null;
    }

    /**
     * Get stored display name from localStorage
     */
    getDisplayName() {
        try {
            return localStorage.getItem('reflections_display_name') || null;
        } catch {
            return null;
        }
    }

    /**
     * Save display name to localStorage
     */
    setDisplayName(name) {
        const cleaned = (name || '').trim().slice(0, 16);
        if (!cleaned) return;
        try {
            localStorage.setItem('reflections_display_name', cleaned);
        } catch { /* ignore */ }
    }

    /**
     * Get display name or generate a default
     */
    getDisplayNameOrDefault() {
        return this.getDisplayName() || this.generateDefaultName();
    }

    generateDefaultName() {
        if (!this.user) return 'Anonymous';
        if (!this.user.isAnonymous && this.user.displayName) {
            return this.user.displayName.slice(0, 16);
        }
        return 'Player_' + this.user.uid.slice(-4);
    }
}
