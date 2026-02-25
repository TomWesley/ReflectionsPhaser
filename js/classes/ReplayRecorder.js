/**
 * ReplayRecorder - Records canvas gameplay as video for replay and download
 * Uses MediaRecorder API to capture canvas stream
 */
export class ReplayRecorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.videoBlob = null;
        this.videoURL = null;
        this.isRecording = false;
        this.stream = null;
    }

    /**
     * Check if MediaRecorder is supported
     */
    static isSupported() {
        return typeof MediaRecorder !== 'undefined' &&
               typeof HTMLCanvasElement.prototype.captureStream === 'function';
    }

    /**
     * Start recording the canvas
     */
    startRecording() {
        if (!ReplayRecorder.isSupported()) {
            console.warn('MediaRecorder not supported in this browser');
            return false;
        }

        // Clean up previous recording
        this.cleanup();

        try {
            // Use captureStream with 30fps - simpler and more compatible
            this.stream = this.canvas.captureStream(30);

            // Use the simplest possible configuration
            // Let the browser choose the best codec
            const options = {};

            // Only set mimeType if we're sure it's supported
            if (MediaRecorder.isTypeSupported('video/webm')) {
                options.mimeType = 'video/webm';
            }

            console.log('MediaRecorder options:', options);

            this.mediaRecorder = new MediaRecorder(this.stream, options);

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                    console.log('Chunk recorded:', e.data.size, 'bytes');
                }
            };

            this.mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e.error);
                this.isRecording = false;
            };

            this.mediaRecorder.onstart = () => {
                console.log('MediaRecorder started');
            };

            // Start with timeslice to get regular data chunks
            this.mediaRecorder.start(1000); // Get data every 1 second
            this.isRecording = true;

            console.log('Recording started, state:', this.mediaRecorder.state);
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    /**
     * Stop recording and create video blob
     * @returns {Promise<Blob>} The recorded video blob
     */
    stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                console.log('MediaRecorder not active');
                resolve(null);
                return;
            }

            console.log('Stopping recording, current state:', this.mediaRecorder.state);

            this.mediaRecorder.onstop = () => {
                try {
                    console.log('MediaRecorder stopped, chunks:', this.recordedChunks.length);

                    if (this.recordedChunks.length === 0) {
                        console.warn('No recorded chunks available');
                        this.isRecording = false;
                        resolve(null);
                        return;
                    }

                    // Get the actual mimeType from the recorder
                    const mimeType = this.mediaRecorder.mimeType || 'video/webm';
                    console.log('Creating blob with mimeType:', mimeType);

                    this.videoBlob = new Blob(this.recordedChunks, { type: mimeType });
                    this.videoURL = URL.createObjectURL(this.videoBlob);
                    this.isRecording = false;

                    console.log('Video blob created:', this.videoBlob.size, 'bytes');
                    console.log('Video URL:', this.videoURL);

                    resolve(this.videoBlob);
                } catch (error) {
                    console.error('Failed to create video blob:', error);
                    reject(error);
                }
            };

            // Request any remaining data before stopping
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.requestData();
            }
            this.mediaRecorder.stop();
        });
    }

    /**
     * Get the URL for the recorded video
     * @returns {string|null} Object URL for the video
     */
    getVideoURL() {
        return this.videoURL;
    }

    /**
     * Check if a replay is available
     * @returns {boolean}
     */
    hasReplay() {
        return this.videoBlob !== null && this.videoBlob.size > 0;
    }

    /**
     * Download the recorded video
     * @param {string} filename - Name for the downloaded file
     */
    downloadVideo(filename = 'reflections-replay.webm') {
        if (!this.videoBlob) {
            console.warn('No video to download');
            return;
        }

        const url = this.getVideoURL();
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoURL) {
            URL.revokeObjectURL(this.videoURL);
            this.videoURL = null;
        }
        this.videoBlob = null;
        this.recordedChunks = [];
        this.mediaRecorder = null;
        this.isRecording = false;
    }
}
