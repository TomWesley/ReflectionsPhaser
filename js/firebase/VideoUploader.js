/**
 * VideoUploader - Upload replay videos to Firebase Storage for top 10 verification
 * Only used for main game top 10 scores
 */
import { getStorage } from './FirebaseConfig.js';

export class VideoUploader {
    constructor(auth, leaderboardService) {
        this.auth = auth;
        this.leaderboardService = leaderboardService;
    }

    /**
     * Upload a replay video blob to Firebase Storage
     * @param {Blob} videoBlob - The recorded MP4/WebM video
     * @param {number} score - The game score (for filename)
     * @param {string} docId - The Firestore score document ID to update with videoPath
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {string} Download URL of the uploaded video
     */
    async uploadReplayVideo(videoBlob, score, docId, onProgress = null) {
        const uid = this.auth.getUID();
        if (!uid || !videoBlob) return null;

        const storage = getStorage();
        const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const timestamp = Date.now();
        const scoreSec = Math.floor(score);
        const path = `replays/${uid}/main_${scoreSec}s_${timestamp}.${ext}`;
        const ref = storage.ref(path);

        const uploadTask = ref.put(videoBlob, {
            contentType: videoBlob.type,
            customMetadata: {
                score: String(score),
                displayName: this.auth.getDisplayNameOrDefault(),
                uid: uid,
                uploadedAt: new Date().toISOString(),
            }
        });

        // Track progress
        if (onProgress) {
            uploadTask.on('state_changed', (snapshot) => {
                const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                onProgress(percent);
            });
        }

        // Wait for completion
        await uploadTask;
        const downloadURL = await ref.getDownloadURL();

        // Update the Firestore score document with the video path
        if (docId) {
            await this.leaderboardService.updateVideoPath(docId, path);
        }

        return downloadURL;
    }

    /**
     * Get a download URL for a stored video path
     */
    async getVideoURL(videoPath) {
        if (!videoPath) return null;
        const storage = getStorage();
        try {
            return await storage.ref(videoPath).getDownloadURL();
        } catch {
            return null;
        }
    }
}
