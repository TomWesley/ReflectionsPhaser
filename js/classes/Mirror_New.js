import { BaseMirror } from '../mirrors/BaseMirror.js';
import { MirrorRenderer } from '../mirrors/MirrorRenderer.js';
import { MirrorReflection } from '../mirrors/MirrorReflection.js';

/**
 * Mirror class that maintains exact same interface as original
 * but delegates to modular components
 */
export class Mirror extends BaseMirror {
    constructor(x, y) {
        super(x, y);
    }

    // Maintain exact same interface as original
    draw(ctx) {
        MirrorRenderer.draw(this, ctx);
    }

    reflect(laser) {
        MirrorReflection.reflect(this, laser);
    }

    // Keep all original methods for compatibility
    drawShape(ctx) {
        MirrorRenderer.drawShape(this, ctx);
    }

    drawSquare(ctx) {
        MirrorRenderer.drawSquare(this, ctx);
    }

    drawRectangle(ctx) {
        MirrorRenderer.drawRectangle(this, ctx);
    }

    drawRightTriangle(ctx) {
        MirrorRenderer.drawRightTriangle(this, ctx);
    }

    drawIsoscelesTriangle(ctx) {
        MirrorRenderer.drawIsoscelesTriangle(this, ctx);
    }

    drawTrapezoid(ctx) {
        MirrorRenderer.drawTrapezoid(this, ctx);
    }

    drawParallelogram(ctx) {
        MirrorRenderer.drawParallelogram(this, ctx);
    }

    reflectRectangle(laser) {
        MirrorReflection.reflectRectangle(this, laser);
    }

    reflectTriangle(laser, triangleType) {
        MirrorReflection.reflectTriangle(this, laser, triangleType);
    }

    reflectTrapezoid(laser) {
        MirrorReflection.reflectTrapezoid(this, laser);
    }

    reflectParallelogram(laser) {
        MirrorReflection.reflectParallelogram(this, laser);
    }

    getRightTriangleEdges() {
        return MirrorReflection.getRightTriangleEdges(this);
    }

    getIsoscelesTriangleEdges() {
        return MirrorReflection.getIsoscelesTriangleEdges(this);
    }

    getRightTrianglePoints() {
        return MirrorReflection.getRightTrianglePoints(this);
    }

    getIsoscelesTrianglePoints() {
        return MirrorReflection.getIsoscelesTrianglePoints(this);
    }

    distanceToLineSegment(px, py, start, end) {
        return MirrorReflection.distanceToLineSegment(px, py, start, end);
    }

    snapLaserAngle(laser) {
        MirrorReflection.snapLaserAngle(laser);
    }
}