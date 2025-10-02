import { SquareMirror } from './SquareMirror.js';
import { RectangleMirror } from './RectangleMirror.js';
import { RightTriangleMirror } from './RightTriangleMirror.js';
import { IsoscelesTriangleMirror } from './IsoscelesTriangleMirror.js';
import { TrapezoidMirror } from './TrapezoidMirror.js';
import { ParallelogramMirror } from './ParallelogramMirror.js';

/**
 * Factory for creating mirror instances using proper inheritance hierarchy
 */
export class MirrorFactory {
    static createMirror(x, y, shapeType = null) {
        const shape = shapeType || MirrorFactory.getRandomShape();

        switch (shape) {
            case 'square':
                return new SquareMirror(x, y);
            case 'rectangle':
                return new RectangleMirror(x, y);
            case 'rightTriangle':
                return new RightTriangleMirror(x, y);
            case 'isoscelesTriangle':
                return new IsoscelesTriangleMirror(x, y);
            case 'trapezoid':
                return new TrapezoidMirror(x, y);
            case 'parallelogram':
                return new ParallelogramMirror(x, y);
            default:
                throw new Error(`Unknown mirror shape: ${shape}`);
        }
    }

    static getRandomShape() {
        const shapes = ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle', 'trapezoid', 'parallelogram'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }

    static getAllShapes() {
        return ['square', 'rectangle', 'rightTriangle', 'isoscelesTriangle', 'trapezoid', 'parallelogram'];
    }
}