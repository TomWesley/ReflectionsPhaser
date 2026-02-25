/**
 * ReplayRecorder - Records canvas gameplay as video for replay and download
 * Uses MediaRecorder API to capture canvas stream
 * Supports MP4 conversion and native sharing on mobile
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

        // MP4 conversion state
        this.mp4Blob = null;
        this.mp4URL = null;
        this.isConverting = false;
        this.ffmpegLoaded = false;
    }

    /**
     * Check if running on mobile device
     */
    static isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    /**
     * Check if Web Share API is supported with files
     */
    static canShare() {
        return navigator.share && navigator.canShare;
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
     * Load FFmpeg for MP4 conversion
     */
    async loadFFmpeg() {
        if (this.ffmpegLoaded) return true;

        try {
            // FFmpeg is loaded via script tag, access via window
            if (typeof FFmpeg === 'undefined') {
                console.error('FFmpeg not loaded. Make sure the script is included.');
                return false;
            }

            this.ffmpeg = new FFmpeg.FFmpeg();

            // Set up logging
            this.ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg:', message);
            });

            this.ffmpeg.on('progress', ({ progress }) => {
                console.log('FFmpeg progress:', Math.round(progress * 100) + '%');
            });

            console.log('Loading FFmpeg core...');
            await this.ffmpeg.load({
                coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
                wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
            });

            this.ffmpegLoaded = true;
            console.log('FFmpeg loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            return false;
        }
    }

    /**
     * Convert WebM to MP4 for mobile compatibility
     * @returns {Promise<Blob>} MP4 video blob
     */
    async getMP4Blob() {
        // Return cached version if available
        if (this.mp4Blob) {
            return this.mp4Blob;
        }

        if (!this.videoBlob) {
            console.warn('No WebM video to convert');
            return null;
        }

        if (this.isConverting) {
            console.warn('Conversion already in progress');
            return null;
        }

        this.isConverting = true;

        try {
            // Load FFmpeg if not already loaded
            const loaded = await this.loadFFmpeg();
            if (!loaded) {
                throw new Error('Failed to load FFmpeg');
            }

            console.log('Converting WebM to MP4...');

            // Write WebM to virtual filesystem
            const webmData = new Uint8Array(await this.videoBlob.arrayBuffer());
            await this.ffmpeg.writeFile('input.webm', webmData);

            // Convert to MP4 with H.264 codec
            await this.ffmpeg.exec([
                '-i', 'input.webm',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                'output.mp4'
            ]);

            // Read the output
            const mp4Data = await this.ffmpeg.readFile('output.mp4');
            this.mp4Blob = new Blob([mp4Data], { type: 'video/mp4' });
            this.mp4URL = URL.createObjectURL(this.mp4Blob);

            // Clean up virtual filesystem
            await this.ffmpeg.deleteFile('input.webm');
            await this.ffmpeg.deleteFile('output.mp4');

            console.log('MP4 conversion complete:', this.mp4Blob.size, 'bytes');
            return this.mp4Blob;
        } catch (error) {
            console.error('MP4 conversion failed:', error);
            return null;
        } finally {
            this.isConverting = false;
        }
    }

    /**
     * Share video using native share API (mobile)
     * @param {string} filename - Name for the shared file
     * @returns {Promise<boolean>} Whether share was successful
     */
    async shareVideo(filename = 'reflections-replay.mp4') {
        if (!ReplayRecorder.canShare()) {
            console.warn('Web Share API not supported');
            return false;
        }

        try {
            // Convert to MP4 for mobile compatibility
            const mp4Blob = await this.getMP4Blob();
            if (!mp4Blob) {
                throw new Error('Failed to get MP4 video');
            }

            // Create file for sharing
            const file = new File([mp4Blob], filename, { type: 'video/mp4' });

            // Check if we can share this file type
            if (!navigator.canShare({ files: [file] })) {
                console.warn('Cannot share MP4 files on this device');
                return false;
            }

            // Share with only files property for iOS compatibility
            await navigator.share({ files: [file] });

            console.log('Video shared successfully');
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Share cancelled by user');
            } else {
                console.error('Share failed:', error);
            }
            return false;
        }
    }

    /**
     * Download MP4 version (for mobile fallback)
     * @param {string} filename - Name for the downloaded file
     */
    async downloadMP4(filename = 'reflections-replay.mp4') {
        const mp4Blob = await this.getMP4Blob();
        if (!mp4Blob) {
            console.warn('No MP4 video to download');
            return;
        }

        const url = this.mp4URL;
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

        if (this.mp4URL) {
            URL.revokeObjectURL(this.mp4URL);
            this.mp4URL = null;
        }

        this.videoBlob = null;
        this.mp4Blob = null;
        this.recordedChunks = [];
        this.mediaRecorder = null;
        this.isRecording = false;
        this.isConverting = false;
    }
}
