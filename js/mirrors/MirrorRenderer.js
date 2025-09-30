import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';
import { CONFIG } from '../config.js';

/**
 * Handles all mirror rendering functionality
 * Extracted from original Mirror.js without changing behavior
 */
export class MirrorRenderer {
    static draw(mirror, ctx) {
        ctx.save();

        // Apply rotation for triangles, trapezoids, and parallelograms
        if (mirror.rotation) {
            ctx.translate(mirror.x, mirror.y);
            ctx.rotate(mirror.rotation * Math.PI / 180);
            ctx.translate(-mirror.x, -mirror.y);
        }

        // Draw based on shape (exact same logic as original)
        MirrorRenderer.drawShape(mirror, ctx);

        ctx.restore();
    }

    static drawShape(mirror, ctx) {
        switch (mirror.shape) {
            case 'square':
                MirrorRenderer.drawSquare(mirror, ctx);
                break;
            case 'rectangle':
                MirrorRenderer.drawRectangle(mirror, ctx);
                break;
            case 'rightTriangle':
                MirrorRenderer.drawRightTriangle(mirror, ctx);
                break;
            case 'isoscelesTriangle':
                MirrorRenderer.drawIsoscelesTriangle(mirror, ctx);
                break;
            case 'trapezoid':
                MirrorRenderer.drawTrapezoid(mirror, ctx);
                break;
            case 'parallelogram':
                MirrorRenderer.drawParallelogram(mirror, ctx);
                break;
        }
    }

    static drawSquare(mirror, ctx) {
        // Get the exact same vertices used by the validation system
        const points = MirrorPlacementValidation.getMirrorVertices(mirror);

        // Add powder blue glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.fill();

        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border with glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    static drawRectangle(mirror, ctx) {
        // Get the exact same vertices used by the validation system
        const points = MirrorPlacementValidation.getMirrorVertices(mirror);

        // Add powder blue glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.fill();

        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border with glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 10;
        }

        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    static drawRightTriangle(mirror, ctx) {
        // Get the exact same vertices used by the validation system
        const points = MirrorPlacementValidation.getMirrorVertices(mirror);

        // Add powder blue glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.fill();

        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border with glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    static drawIsoscelesTriangle(mirror, ctx) {
        // Get the exact same vertices used by the validation system
        const points = MirrorPlacementValidation.getMirrorVertices(mirror);

        // Add powder blue glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.fill();

        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border with glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    static drawTrapezoid(mirror, ctx) {
        // Get the exact same vertices used by the validation system
        const points = MirrorPlacementValidation.getMirrorVertices(mirror);

        // Add powder blue glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.fill();

        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border with glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 10;
        }

        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    static drawParallelogram(mirror, ctx) {
        // Get the exact same vertices used by the validation system
        const points = MirrorPlacementValidation.getMirrorVertices(mirror);

        // Add powder blue glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowBlur = 0;
        }

        // Surface - solid silver
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.fill();

        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Border with glow if dragging
        if (mirror.isDragging) {
            ctx.shadowColor = '#87ceeb';
            ctx.shadowBlur = 10;
        }

        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }
}