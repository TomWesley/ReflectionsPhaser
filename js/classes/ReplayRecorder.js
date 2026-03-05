/**
 * ReplayRecorder - Records canvas gameplay as MP4 video
 * Uses WebCodecs VideoEncoder + mp4-muxer for native H.264/MP4 output
 * Falls back to MediaRecorder (WebM) if WebCodecs unavailable
 */
export class ReplayRecorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.videoBlob = null;
        this.videoURL = null;
        this.isRecording = false;

        // WebCodecs + mp4-muxer state
        this.encoder = null;
        this.muxer = null;
        this.frameCount = 0;
        this.lastCaptureTime = 0;
        this.targetFps = 30;
        this.captureInterval = 1000 / this.targetFps;
        this.useWebCodecs = false; // determined at start time

        // MediaRecorder fallback state
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
    }

    static isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    static canShare() {
        return navigator.share && navigator.canShare;
    }

    static isSupported() {
        return (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') ||
               (typeof MediaRecorder !== 'undefined' &&
                typeof HTMLCanvasElement.prototype.captureStream === 'function');
    }

    /**
     * Start recording the canvas
     */
    async startRecording() {
        this.cleanup();

        // Try WebCodecs + mp4-muxer first
        if (typeof VideoEncoder !== 'undefined' &&
            typeof VideoFrame !== 'undefined' &&
            typeof Mp4Muxer !== 'undefined') {
            const started = await this.startWebCodecsRecording();
            if (started) return true;
        }

        // Fall back to MediaRecorder
        return this.startMediaRecorderFallback();
    }

    /**
     * Start recording with WebCodecs + mp4-muxer (produces MP4)
     */
    async startWebCodecsRecording() {
        try {
            const width = this.canvas.width;
            const height = this.canvas.height;

            // Check codec support before configuring
            const codecConfig = {
                codec: 'avc1.42001f', // H.264 Baseline Level 3.1
                width: width,
                height: height,
                bitrate: 2_500_000,
                framerate: this.targetFps,
            };

            const support = await VideoEncoder.isConfigSupported(codecConfig);
            if (!support.supported) {
                console.warn('H.264 Baseline not supported, trying Main profile');
                codecConfig.codec = 'avc1.4d001f'; // Main profile
                const support2 = await VideoEncoder.isConfigSupported(codecConfig);
                if (!support2.supported) {
                    console.warn('H.264 not supported by VideoEncoder');
                    return false;
                }
            }

            this.muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width: width,
                    height: height,
                },
                fastStart: 'in-memory',
            });

            this.encoder = new VideoEncoder({
                output: (chunk, meta) => {
                    this.muxer.addVideoChunk(chunk, meta);
                },
                error: (e) => console.error('VideoEncoder error:', e),
            });

            this.encoder.configure(codecConfig);

            this.frameCount = 0;
            this.lastCaptureTime = 0;
            this.isRecording = true;
            this.useWebCodecs = true;

            console.log('WebCodecs MP4 recording started');
            return true;
        } catch (error) {
            console.error('Failed to start WebCodecs recording:', error);
            return false;
        }
    }

    /**
     * Capture a frame during gameplay - call from game loop
     * @param {number} timestamp - requestAnimationFrame timestamp
     */
    captureFrame(timestamp) {
        if (!this.isRecording || !this.useWebCodecs || !this.encoder) return;
        if (this.encoder.state === 'closed') return;

        // Throttle to target fps
        if (this.lastCaptureTime > 0 && (timestamp - this.lastCaptureTime) < this.captureInterval * 0.9) {
            return;
        }
        this.lastCaptureTime = timestamp;

        try {
            const frame = new VideoFrame(this.canvas, {
                timestamp: this.frameCount * (1_000_000 / this.targetFps), // microseconds
            });

            // Keyframe every 2 seconds
            const keyFrame = this.frameCount % (this.targetFps * 2) === 0;
            this.encoder.encode(frame, { keyFrame });
            frame.close();

            this.frameCount++;
        } catch (e) {
            // Silently skip frames that fail (e.g., canvas tainted)
        }
    }

    /**
     * Stop recording and create video blob
     * @returns {Promise<Blob>} The recorded video blob
     */
    async stopRecording() {
        if (!this.isRecording) return null;

        if (this.useWebCodecs && this.encoder) {
            return this.stopWebCodecsRecording();
        } else {
            return this.stopMediaRecorderFallback();
        }
    }

    /**
     * Finalize WebCodecs recording into MP4 blob
     */
    async stopWebCodecsRecording() {
        try {
            if (this.encoder.state !== 'closed') {
                await this.encoder.flush();
            }
            this.muxer.finalize();

            const buffer = this.muxer.target.buffer;
            this.videoBlob = new Blob([buffer], { type: 'video/mp4' });
            this.videoURL = URL.createObjectURL(this.videoBlob);
            this.isRecording = false;

            console.log('MP4 recording complete:', this.videoBlob.size, 'bytes,', this.frameCount, 'frames');
            return this.videoBlob;
        } catch (error) {
            console.error('Failed to finalize MP4:', error);
            this.isRecording = false;
            return null;
        }
    }

    // ─── MediaRecorder Fallback (WebM) ───────────────────────────

    startMediaRecorderFallback() {
        if (typeof MediaRecorder === 'undefined' ||
            typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
            console.warn('Neither WebCodecs nor MediaRecorder supported');
            return false;
        }

        try {
            this.stream = this.canvas.captureStream(30);
            const options = {};
            if (MediaRecorder.isTypeSupported('video/webm')) {
                options.mimeType = 'video/webm';
            }

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };
            this.mediaRecorder.onerror = () => { this.isRecording = false; };
            this.mediaRecorder.start(1000);

            this.isRecording = true;
            this.useWebCodecs = false;
            console.log('MediaRecorder fallback started (WebM)');
            return true;
        } catch (error) {
            console.error('MediaRecorder fallback failed:', error);
            return false;
        }
    }

    stopMediaRecorderFallback() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                if (this.recordedChunks.length === 0) {
                    this.isRecording = false;
                    resolve(null);
                    return;
                }

                const mimeType = this.mediaRecorder.mimeType || 'video/webm';
                this.videoBlob = new Blob(this.recordedChunks, { type: mimeType });
                this.videoURL = URL.createObjectURL(this.videoBlob);
                this.isRecording = false;
                resolve(this.videoBlob);
            };

            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.requestData();
            }
            this.mediaRecorder.stop();
        });
    }

    // ─── Playback & Export ───────────────────────────────────────

    getVideoURL() {
        return this.videoURL;
    }

    hasReplay() {
        return this.videoBlob !== null && this.videoBlob.size > 0;
    }

    /**
     * Whether the recording is MP4 (vs WebM fallback)
     */
    isMP4() {
        return this.videoBlob && this.videoBlob.type === 'video/mp4';
    }

    /**
     * Download the recorded video
     */
    downloadVideo(filename) {
        if (!this.videoBlob) return;

        const ext = this.isMP4() ? 'mp4' : 'webm';
        const finalName = filename || `reflections-replay.${ext}`;

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = this.getVideoURL();
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Share video using native share API (mobile camera roll)
     */
    async shareVideo(filename = 'reflections-replay.mp4') {
        if (!navigator.share || !navigator.canShare || !this.videoBlob) return false;

        try {
            const type = this.isMP4() ? 'video/mp4' : 'video/webm';
            const ext = this.isMP4() ? '.mp4' : '.webm';
            const finalName = filename.replace(/\.\w+$/, ext);
            const file = new File([this.videoBlob], finalName, { type });

            if (!navigator.canShare({ files: [file] })) return false;
            await navigator.share({ files: [file] });
            return true;
        } catch (error) {
            if (error.name !== 'AbortError') console.error('Share failed:', error);
            return false;
        }
    }

    /**
     * Clean up all resources
     */
    cleanup() {
        // Close WebCodecs encoder
        if (this.encoder && this.encoder.state !== 'closed') {
            try { this.encoder.close(); } catch (e) { /* ignore */ }
        }
        this.encoder = null;
        this.muxer = null;

        // Stop MediaRecorder stream
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
        this.useWebCodecs = false;
        this.frameCount = 0;
        this.lastCaptureTime = 0;
    }
}
