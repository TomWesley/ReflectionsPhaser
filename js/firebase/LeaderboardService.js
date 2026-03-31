/**
 * LeaderboardService - Firestore-backed score management
 *
 * Firestore collection: "scores"
 * Document ID: {uid}_main (main game) or {uid}_{YYYY-MM-DD} (daily challenge)
 */
import { getFirestore } from './FirebaseConfig.js';

export class LeaderboardService {
    constructor(auth) {
        this.auth = auth;
    }

    /**
     * Submit or update a score. Only writes if new score > existing score.
     * @returns {{ isNewBest: boolean, docId: string }}
     */
    async submitScore(mode, score, scoreFormatted, metadata = {}) {
        const uid = this.auth.getUID();
        if (!uid) throw new Error('Not authenticated');

        // Enforce valid range
        if (score < 0 || score > 300) throw new Error('Invalid score');

        const db = getFirestore();
        const docId = this._getDocId(uid, mode, metadata.dailyDate);
        const docRef = db.collection('scores').doc(docId);

        const displayName = this.auth.getDisplayNameOrDefault();

        const data = {
            uid,
            displayName,
            mode,
            dailyDate: metadata.dailyDate || null,
            score,
            scoreFormatted,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            mirrorCount: metadata.mirrorCount || 0,
            spawnerCount: metadata.spawnerCount || 0,
            videoPath: null,
        };

        // Use transaction to only write if score is higher
        const result = await db.runTransaction(async (tx) => {
            const doc = await tx.get(docRef);
            if (doc.exists) {
                const existing = doc.data();
                if (score <= existing.score) {
                    return { isNewBest: false, docId };
                }
                // Keep existing videoPath if we're updating
                data.videoPath = existing.videoPath || null;
            }
            tx.set(docRef, data);
            return { isNewBest: true, docId };
        });

        return result;
    }

    /**
     * Update the videoPath field on an existing score document
     */
    async updateVideoPath(docId, videoPath) {
        const db = getFirestore();
        await db.collection('scores').doc(docId).update({ videoPath });
    }

    /**
     * Fetch leaderboard entries
     * @param {string} mode - "main" or "daily"
     * @param {string} period - "all", "weekly", "today"
     * @param {string|null} dailyDate - for daily mode, the specific date
     * @param {number} limit - max entries to return
     */
    async getLeaderboard(mode, period = 'all', dailyDate = null, limit = 50) {
        const db = getFirestore();
        let query = db.collection('scores')
            .where('mode', '==', mode)
            .orderBy('score', 'desc')
            .limit(limit);

        // For daily challenge, filter by specific date
        if (mode === 'daily' && dailyDate) {
            query = db.collection('scores')
                .where('mode', '==', 'daily')
                .where('dailyDate', '==', dailyDate)
                .orderBy('score', 'desc')
                .limit(limit);
        }

        // Time-based filtering for main game
        if (period === 'weekly') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            query = db.collection('scores')
                .where('mode', '==', mode)
                .where('timestamp', '>=', weekAgo)
                .orderBy('timestamp', 'desc')
                .limit(200); // fetch more, sort client-side
        } else if (period === 'today') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            query = db.collection('scores')
                .where('mode', '==', mode)
                .where('timestamp', '>=', todayStart)
                .orderBy('timestamp', 'desc')
                .limit(200);
        }

        const snapshot = await query.get();
        let entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // For time-based queries, re-sort by score desc client-side
        if (period === 'weekly' || period === 'today') {
            entries.sort((a, b) => b.score - a.score);
            entries = entries.slice(0, limit);
        }

        return entries;
    }

    /**
     * Get current user's score for a mode
     */
    async getUserScore(mode, dailyDate = null) {
        const uid = this.auth.getUID();
        if (!uid) return null;

        const db = getFirestore();
        const docId = this._getDocId(uid, mode, dailyDate);
        const doc = await db.collection('scores').doc(docId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    /**
     * Get the user's rank for a given mode (how many players scored higher)
     */
    async getUserRank(mode, userScore) {
        if (userScore === null || userScore === undefined) return null;

        const db = getFirestore();
        const snapshot = await db.collection('scores')
            .where('mode', '==', mode)
            .where('score', '>', userScore)
            .get();

        return snapshot.size + 1;
    }

    /**
     * Get total player count for a mode
     */
    async getTotalPlayers(mode) {
        const db = getFirestore();
        const snapshot = await db.collection('scores')
            .where('mode', '==', mode)
            .get();
        return snapshot.size;
    }

    /**
     * Check if a score would be in the top 10 for main game
     */
    async isTop10(score) {
        const db = getFirestore();
        const snapshot = await db.collection('scores')
            .where('mode', '==', 'main')
            .orderBy('score', 'desc')
            .limit(10)
            .get();

        if (snapshot.size < 10) return true;

        const tenthPlace = snapshot.docs[snapshot.docs.length - 1].data().score;
        return score > tenthPlace;
    }

    _getDocId(uid, mode, dailyDate) {
        if (mode === 'daily' && dailyDate) {
            return `${uid}_${dailyDate}`;
        }
        return `${uid}_main`;
    }
}
