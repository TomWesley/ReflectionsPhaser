import { CONFIG } from '../config.js';
import { Spawner } from '../classes/Spawner.js';

/**
 * SpawnerGenerator - Handles spawner generation
 * Responsibilities:
 * - Generating spawners for free play mode
 * - Generating spawners for daily challenge mode
 * - Calculating random angles for spawners
 */
export class SpawnerGenerator {
    constructor(game) {
        this.game = game;
    }

    /**
     * Generate all spawners for the current game mode
     */
    generateSpawners() {
        const spawners = [];

        if (this.game.modeManager.isDailyChallenge()) {
            const dailyPuzzle = this.game.modeManager.getDailyPuzzle();
            if (dailyPuzzle) {
                // Create spawners from daily puzzle data
                dailyPuzzle.spawners.forEach(spawnerData => {
                    spawners.push(new Spawner(spawnerData.x, spawnerData.y, spawnerData.angle));
                });
                return spawners;
            }
        }

        // Free play mode - generate random spawners
        const spawnerCount = 4 + Math.floor(Math.random() * 4); // 4-7 spawners
        const allPositions = this.generateRandomPositions();

        // Generate more positions if needed
        while (allPositions.length < spawnerCount) {
            const additionalPositions = this.generateRandomPositions();
            allPositions.push(...additionalPositions);
        }

        const selectedPositions = this.shuffleArray([...allPositions]).slice(0, spawnerCount);

        selectedPositions.forEach(pos => {
            const randomAngle = this.getRandomAngleInbound(pos.x, pos.y, pos.edge);
            spawners.push(new Spawner(pos.x, pos.y, randomAngle));
        });

        return spawners;
    }

    /**
     * Generate random positions along each edge
     */
    generateRandomPositions() {
        const positions = [];
        const margin = 50; // Keep spawners away from corners

        // Left edge - random Y position
        positions.push({
            x: 0,
            y: margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin),
            edge: 'left'
        });

        // Right edge - random Y position
        positions.push({
            x: CONFIG.CANVAS_WIDTH,
            y: margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin),
            edge: 'right'
        });

        // Top edge - random X position
        positions.push({
            x: margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin),
            y: 0,
            edge: 'top'
        });

        // Bottom edge - random X position
        positions.push({
            x: margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin),
            y: CONFIG.CANVAS_HEIGHT,
            edge: 'bottom'
        });

        return positions;
    }

    /**
     * Get a random angle pointing inbound from an edge
     */
    getRandomAngleInbound(x, y, edge) {
        let baseAngleDegrees;
        let allowedRange = 120; // ±60 degrees from base direction

        // Determine base inbound direction based on edge
        switch (edge) {
            case 'left':
                baseAngleDegrees = 0; // Point right into the play area
                break;
            case 'right':
                baseAngleDegrees = 180; // Point left into the play area
                break;
            case 'top':
                baseAngleDegrees = 90; // Point down into the play area
                break;
            case 'bottom':
                baseAngleDegrees = 270; // Point up into the play area
                break;
            default:
                // Fallback to center-pointing logic
                const centerX = CONFIG.CANVAS_WIDTH / 2;
                const centerY = CONFIG.CANVAS_HEIGHT / 2;
                const directAngle = Math.atan2(centerY - y, centerX - x);
                baseAngleDegrees = directAngle * 180 / Math.PI;
                break;
        }

        // Add random variation within allowed range
        const variation = (Math.random() - 0.5) * allowedRange;
        const randomDegrees = baseAngleDegrees + variation;

        // Snap to 15-degree increments
        const snappedDegrees = Math.round(randomDegrees / CONFIG.ANGLE_INCREMENT) * CONFIG.ANGLE_INCREMENT;

        // Convert to radians
        return (snappedDegrees % 360) * Math.PI / 180;
    }

    /**
     * Shuffle an array (Fisher-Yates algorithm)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
