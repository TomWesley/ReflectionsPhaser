/**
 * FirebaseConfig - Initialize Firebase app and expose service references
 * Uses Firebase compat SDK loaded via CDN in index.html / leaderboard.html
 */

const firebaseConfig = {
    apiKey: "AIzaSyBaTbUHflVyBoxrsvcFbXNY_lTD7RCVYgs",
    authDomain: "singularity-c216f.firebaseapp.com",
    databaseURL: "https://singularity-c216f.firebaseio.com",
    projectId: "singularity-c216f",
    storageBucket: "reflections-n6czi",
    messagingSenderId: "877374644269",
    appId: "1:877374644269:web:70b40d0b558941781b98a4",
    measurementId: "G-MZSHXBSBR6"
};

// App Check reCAPTCHA v3 site key. Paste your key here (from Firebase Console →
// App Check → your web app). Leave blank to disable App Check. It only activates
// on the live site (never on localhost, where the emulator is used).
const APP_CHECK_SITE_KEY = "6Ldr3lgtAAAAAHxEUfFSYuy1uvPrVxGp-rCJtxHn";

let initialized = false;

export function initFirebase() {
    if (initialized) return;
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded. Ensure CDN scripts are included.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // On localhost, talk to the Firebase Local Emulator instead of production, so
    // the whole server-authoritative flow can be tested end-to-end with nothing
    // deployed and no real data touched.
    const host = typeof location !== 'undefined' ? location.hostname : '';
    if (host === 'localhost' || host === '127.0.0.1') {
        try {
            firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
            firebase.firestore().useEmulator('127.0.0.1', 8080);
            if (firebase.functions) firebase.functions().useEmulator('127.0.0.1', 5001);
            console.info('[Firebase] Connected to local emulators (auth:9099, firestore:8080, functions:5001).');
        } catch (e) {
            console.warn('[Firebase] Emulator wiring skipped:', e.message);
        }
    } else if (APP_CHECK_SITE_KEY && firebase.appCheck) {
        // Production only: attest that requests come from the real app. Must run
        // before any auth/firestore/functions call, so it lives here in init.
        // The key is a reCAPTCHA Enterprise key, so use the Enterprise provider
        // (falls back to the plain site key form if that provider isn't present).
        try {
            const provider = (firebase.appCheck.ReCaptchaEnterpriseProvider)
                ? new firebase.appCheck.ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY)
                : APP_CHECK_SITE_KEY;
            firebase.appCheck().activate(provider, true);
            console.info('[Firebase] App Check activated (reCAPTCHA Enterprise).');
        } catch (e) {
            console.warn('[Firebase] App Check activation failed:', e.message);
        }
    }

    initialized = true;
}

export function getAuth() {
    initFirebase();
    return firebase.auth();
}

export function getFirestore() {
    initFirebase();
    return firebase.firestore();
}

export function getStorage() {
    initFirebase();
    return firebase.storage();
}

export function getFunctions() {
    initFirebase();
    return firebase.functions();
}
