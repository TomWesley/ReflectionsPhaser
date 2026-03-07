/**
 * RotationControl - Sci-fi circular dial for rotating selected mirrors
 * Renders on a small canvas with a Halo-inspired targeting reticle aesthetic
 */
export class RotationControl {
    constructor(canvas, onRotationChange) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onRotationChange = onRotationChange;
        this.width = canvas.width;
        this.height = canvas.height;
        this.center = this.width / 2;
        this.radius = this.width / 2 - 14;
        this.handleRadius = this.radius - 4;

        this.currentAngle = 0; // degrees
        this.isDragging = false;

        this.setupEvents();
        this.render();
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        window.addEventListener('mousemove', (e) => this.onPointerMove(e));
        window.addEventListener('mouseup', () => this.onPointerUp());

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onPointerDown(e.touches[0]);
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.onPointerMove(e.touches[0]);
            }
        }, { passive: false });
        window.addEventListener('touchend', () => this.onPointerUp());
    }

    getAngleFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width) - this.center;
        const y = (e.clientY - rect.top) * (this.height / rect.height) - this.center;
        // 0° = up (north), clockwise positive
        let angle = Math.atan2(x, -y) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        return Math.round(angle) % 360;
    }

    onPointerDown(e) {
        this.isDragging = true;
        this.updateFromEvent(e);
    }

    onPointerMove(e) {
        if (!this.isDragging) return;
        this.updateFromEvent(e);
    }

    onPointerUp() {
        this.isDragging = false;
    }

    updateFromEvent(e) {
        const angle = this.getAngleFromEvent(e);
        if (angle !== this.currentAngle) {
            this.currentAngle = angle;
            this.render();
            if (this.onRotationChange) {
                this.onRotationChange(angle);
            }
        }
    }

    setAngle(degrees) {
        this.currentAngle = ((degrees % 360) + 360) % 360;
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const cx = this.center;
        const cy = this.center;
        const r = this.radius;

        ctx.clearRect(0, 0, this.width, this.height);

        // Background circle
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 10);
        bgGrad.addColorStop(0, 'rgba(12, 12, 24, 0.95)');
        bgGrad.addColorStop(0.7, 'rgba(8, 8, 18, 0.98)');
        bgGrad.addColorStop(1, 'rgba(4, 4, 12, 0)');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = 'rgba(78, 120, 232, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner concentric rings (targeting reticle feel)
        ctx.strokeStyle = 'rgba(78, 120, 232, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair lines (subtle)
        ctx.strokeStyle = 'rgba(78, 120, 232, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy + r);
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();

        // Tick marks
        for (let deg = 0; deg < 360; deg += 5) {
            const rad = (deg - 90) * Math.PI / 180;
            const isMajor = deg % 30 === 0;
            const isMid = deg % 15 === 0;
            const innerR = isMajor ? r - 10 : (isMid ? r - 7 : r - 4);

            ctx.strokeStyle = isMajor
                ? 'rgba(78, 120, 232, 0.5)'
                : (isMid ? 'rgba(78, 120, 232, 0.25)' : 'rgba(78, 120, 232, 0.12)');
            ctx.lineWidth = isMajor ? 2 : 1;

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(rad) * innerR, cy + Math.sin(rad) * innerR);
            ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
            ctx.stroke();
        }

        // Cardinal labels
        ctx.font = '600 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(78, 120, 232, 0.4)';
        const labelR = r - 16;
        const labels = [
            { deg: 0, text: '0' },
            { deg: 90, text: '90' },
            { deg: 180, text: '180' },
            { deg: 270, text: '270' },
        ];
        for (const l of labels) {
            const rad = (l.deg - 90) * Math.PI / 180;
            ctx.fillText(l.text, cx + Math.cos(rad) * labelR, cy + Math.sin(rad) * labelR);
        }

        // Swept arc from 0 to current angle
        const startRad = -Math.PI / 2; // 0° = top
        const endRad = (this.currentAngle - 90) * Math.PI / 180;
        if (this.currentAngle > 0) {
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#4E78E8';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r * 0.65, startRad, endRad, false);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Angle indicator line
        const angleRad = (this.currentAngle - 90) * Math.PI / 180;
        const lineGrad = ctx.createLinearGradient(
            cx, cy,
            cx + Math.cos(angleRad) * this.handleRadius,
            cy + Math.sin(angleRad) * this.handleRadius
        );
        lineGrad.addColorStop(0, 'rgba(232, 78, 106, 0.2)');
        lineGrad.addColorStop(1, '#E84E6A');

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#E84E6A';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
            cx + Math.cos(angleRad) * this.handleRadius,
            cy + Math.sin(angleRad) * this.handleRadius
        );
        ctx.stroke();

        // Handle dot (draggable point)
        const hx = cx + Math.cos(angleRad) * this.handleRadius;
        const hy = cy + Math.sin(angleRad) * this.handleRadius;

        ctx.fillStyle = '#E84E6A';
        ctx.shadowColor = '#E84E6A';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow ring on handle
        ctx.strokeStyle = 'rgba(232, 78, 106, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Center dot
        ctx.fillStyle = 'rgba(78, 120, 232, 0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Digital angle readout
        ctx.font = '700 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${this.currentAngle}°`, cx, cy + r + 16);
    }
}
