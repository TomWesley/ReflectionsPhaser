/**
 * GameService - client wrapper for the server-authoritative game functions.
 *
 * startGame(mode)  -> { sessionId, puzzle }   the server issues the board.
 * submitGame(...)  -> { verified, score, scoreFormatted, isNewBest }
 *
 * The client never computes the ranked score; it plays the server's board and
 * submits only its final mirror placements. Any failure here (offline, not
 * signed in) is surfaced to the caller so the game can fall back to unranked play.
 */
import { getFunctions } from './FirebaseConfig.js';

export class GameService {
    constructor() {
        this._startGame = null;
        this._submitGame = null;
    }

    _ensure() {
        if (this._startGame && this._submitGame) return;
        const functions = getFunctions();
        this._startGame = functions.httpsCallable('startGame');
        this._submitGame = functions.httpsCallable('submitGame');
        this._setVideoPath = functions.httpsCallable('setReplayVideoPath');
        this._reserveUsername = functions.httpsCallable('reserveUsername');
    }

    /**
     * Claim a unique username. Throws if it's already taken.
     */
    async reserveUsername(username) {
        this._ensure();
        const result = await this._reserveUsername({ username });
        return result.data;
    }

    /**
     * Ask the server for a fresh puzzle.
     * @returns {Promise<{ sessionId: string, puzzle: object }>}
     */
    async startGame(mode = 'main') {
        this._ensure();
        const result = await this._startGame({ mode });
        return result.data;
    }

    /**
     * Submit final mirror placements for server verification and scoring.
     * @param {string} sessionId
     * @param {Array<{x:number,y:number,rotation:number}>} placements
     * @param {string} displayName
     * @returns {Promise<{ verified: boolean, score: number, scoreFormatted: string, isNewBest: boolean }>}
     */
    async submitGame(sessionId, placements, displayName) {
        this._ensure();
        const result = await this._submitGame({ sessionId, placements, displayName });
        return result.data;
    }

    /**
     * Record a replay video's Storage path on the score doc (server-side, since
     * clients can't write the scores collection directly).
     */
    async setReplayVideoPath(docId, videoPath) {
        this._ensure();
        const result = await this._setVideoPath({ docId, videoPath });
        return result.data;
    }
}
