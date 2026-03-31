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
