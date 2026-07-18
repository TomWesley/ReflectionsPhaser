/**
 * REFLECTIONS - server-authoritative scoring.
 *
 * Two callable functions replace the old client-trusted flow:
 *   startGame  - the SERVER generates the puzzle and stores the fixed mirror
 *                inventory in a session the client can't see or edit.
 *   submitGame - the client sends only its final mirror placements; the server
 *                re-simulates the exact board and writes the authoritative score.
 *                The client's own score is never accepted.
 *
 * All the game logic (generation, verification, physics) is the same code the
 * browser runs, copied into functions/js by copy-shared.js.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { generateMainPuzzle, generateDailyPuzzle } from './js/core/PuzzleGenerator.js';
import { verifyGame } from './js/core/GameVerifier.js';

initializeApp();
const db = getFirestore();

// Require a valid App Check token on every callable — only the real app can call these.
const CALLABLE_OPTS = { enforceAppCheck: true };

function formatScore(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// Server-side re-sanitize of the display name (never trust the client's copy).
function sanitizeName(name) {
    const cleaned = String(name || '')
        .trim()
        .slice(0, 16)
        .replace(/<[^>]*>/g, '')
        .replace(/[<>"'&]/g, '');
    return cleaned || 'Player';
}

/**
 * startGame - issue a fresh, server-generated puzzle and open a session.
 * Input:  { mode: 'main' }
 * Output: { sessionId, puzzle: { mode, mirrors, mirrorInventory, spawners } }
 */
export const startGame = onCall(CALLABLE_OPTS, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in to play a ranked game.');

    const mode = request.data?.mode === 'daily' ? 'daily' : 'main';

    let puzzle;
    let sessionRef;
    if (mode === 'daily') {
        puzzle = generateDailyPuzzle();
        // One attempt per day: the daily session doc id is deterministic, so a repeat
        // start for the same user+day is caught without a composite index.
        sessionRef = db.collection('sessions').doc(`daily_${uid}_${puzzle.dailyDate}`);
        const existing = await sessionRef.get();
        if (existing.exists) {
            throw new HttpsError('failed-precondition', "You've already played today's challenge.");
        }
    } else {
        puzzle = generateMainPuzzle();
        sessionRef = db.collection('sessions').doc(); // auto id; unlimited main games
    }

    await sessionRef.set({
        uid,
        mode,
        dailyDate: puzzle.dailyDate || null,
        // Only what the server needs to verify later. The client cannot read this
        // collection (locked by rules), so it can't peek at or alter the inventory.
        mirrorInventory: puzzle.mirrorInventory,
        spawners: puzzle.spawners,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
    });

    return { sessionId: sessionRef.id, puzzle };
});

/**
 * submitGame - verify placements against the issued session and record the score.
 * Input:  { sessionId, placements: [{x,y,rotation}], displayName }
 * Output: { verified, score, scoreFormatted, isNewBest }
 */
export const submitGame = onCall(CALLABLE_OPTS, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in to submit a score.');

    const { sessionId, placements, displayName } = request.data || {};
    if (!sessionId || !Array.isArray(placements)) {
        throw new HttpsError('invalid-argument', 'Missing session or placements.');
    }

    const sessionRef = db.collection('sessions').doc(sessionId);
    const snap = await sessionRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Game session not found.');
    const session = snap.data();

    if (session.uid !== uid) throw new HttpsError('permission-denied', 'This session is not yours.');
    if (session.status !== 'active') {
        throw new HttpsError('failed-precondition', 'This game was already submitted.');
    }

    // Recompute the authoritative score from the SERVER-issued board + client placements.
    const result = verifyGame(
        { mode: session.mode, mirrorInventory: session.mirrorInventory, spawners: session.spawners },
        placements
    );

    if (!result.valid) {
        await sessionRef.update({ status: 'rejected', reason: result.reason });
        throw new HttpsError('invalid-argument', `Submission rejected: ${result.reason}`);
    }

    const score = result.score;
    // The leaderboard name is the user's RESERVED username (server-owned), not
    // whatever the client sent — so it can't be spoofed. Fall back to a sanitized
    // client name only if no username is on file.
    const userSnap = await db.collection('users').doc(uid).get();
    const cleanName = (userSnap.exists && userSnap.data().username)
        ? userSnap.data().username
        : sanitizeName(displayName);
    const isDaily = session.mode === 'daily';
    const scoreDocId = isDaily ? `${uid}_${session.dailyDate}` : `${uid}_main`;
    const scoreRef = db.collection('scores').doc(scoreDocId);

    const outcome = await db.runTransaction(async (tx) => {
        const existing = await tx.get(scoreRef);
        if (existing.exists && existing.data().score >= score) {
            return { isNewBest: false };
        }
        tx.set(scoreRef, {
            uid,
            displayName: cleanName,
            mode: session.mode,
            dailyDate: session.dailyDate || null,
            score,
            scoreFormatted: formatScore(score),
            mirrorCount: placements.length,
            spawnerCount: session.spawners.length,
            videoPath: existing.exists ? existing.data().videoPath || null : null,
            timestamp: FieldValue.serverTimestamp(),
        });
        return { isNewBest: true };
    });

    await sessionRef.update({ status: 'submitted', score });

    return {
        verified: true,
        score,
        scoreFormatted: formatScore(score),
        isNewBest: outcome.isNewBest,
    };
});

/**
 * setReplayVideoPath - record the Storage path of a top-score replay on the score
 * doc. Needed because clients can no longer write the scores collection directly:
 * the video is uploaded to Storage client-side, then this function stamps the path.
 * Input: { docId, videoPath }
 */
export const setReplayVideoPath = onCall(CALLABLE_OPTS, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { docId, videoPath } = request.data || {};
    if (typeof docId !== 'string' || typeof videoPath !== 'string') {
        throw new HttpsError('invalid-argument', 'Missing docId or videoPath.');
    }
    // The doc and the path must both belong to this user.
    if (!docId.startsWith(`${uid}_`)) {
        throw new HttpsError('permission-denied', 'Not your score.');
    }
    if (videoPath.length > 200 || !new RegExp(`^replays/${uid}/[^\\s]+$`).test(videoPath)) {
        throw new HttpsError('invalid-argument', 'Invalid video path.');
    }

    const ref = db.collection('scores').doc(docId);
    const snap = await ref.get();
    if (!snap.exists || snap.data().uid !== uid) {
        throw new HttpsError('not-found', 'Score not found.');
    }
    await ref.update({ videoPath });
    return { ok: true };
});

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,16}$/;

/**
 * reserveUsername - claim a unique username for this account.
 *
 * Uniqueness is enforced atomically in a transaction against a `usernames`
 * registry (keyed by lowercased name, so "Alex" and "alex" can't both exist).
 * A `users/{uid}` doc records the caller's current username; submitGame reads it
 * so the leaderboard name is always the reserved one, never client-controlled.
 * Called during sign-up BEFORE the email account is created, so a taken name
 * blocks the whole flow.
 */
export const reserveUsername = onCall(CALLABLE_OPTS, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const username = String(request.data?.username || '').trim();
    if (!USERNAME_RE.test(username)) {
        throw new HttpsError('invalid-argument', 'Username must be 3–16 characters: letters, numbers, _ or -.');
    }
    const key = username.toLowerCase();

    await db.runTransaction(async (tx) => {
        const nameRef = db.collection('usernames').doc(key);
        const userRef = db.collection('users').doc(uid);

        const existing = await tx.get(nameRef);
        if (existing.exists && existing.data().uid !== uid) {
            throw new HttpsError('already-exists', 'That username is taken.');
        }
        // If this user already held a different name, free it.
        const userDoc = await tx.get(userRef);
        const prevKey = userDoc.exists ? userDoc.data().usernameLower : null;

        tx.set(nameRef, { uid, username });
        tx.set(userRef, { username, usernameLower: key });
        if (prevKey && prevKey !== key) {
            tx.delete(db.collection('usernames').doc(prevKey));
        }
    });

    return { ok: true, username };
});
