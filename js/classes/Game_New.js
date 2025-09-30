import { CONFIG } from '../config.js';
import { Mirror } from './Mirror_New.js';
import { Laser } from './Laser.js';
import { Spawner } from './Spawner.js';
import { DailyChallenge } from '../utils/DailyChallenge.js';
import { SurfaceAreaManager } from '../utils/SurfaceAreaManager.js';
import { PerformanceRating } from '../utils/PerformanceRating.js';
import { MirrorPlacementValidation } from '../utils/MirrorPlacementValidation.js';
import { InputHandler } from '../core/InputHandler.js';
import { GameState } from '../core/GameState.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.gameOver = false;
        this.startTime = 0;
        this.gameTime = 0;

        // Game mode
        this.gameMode = 'freePlay'; // 'freePlay' or 'dailyChallenge'
        this.dailyPuzzle = null;
        this.challengeCompleted = false;

        // Game objects
        this.mirrors = [];
        this.lasers = [];
        this.spawners = [];

        // Interaction state
        this.draggedMirror = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dragStartPos = { x: 0, y: 0 };
        this.mouseHasMoved = false;

        // Initialize modular components
        this.inputHandler = new InputHandler(this);
        this.gameState = new GameState(this);

        this.init();
    }

    init() {
        // Initialize the validation system first
        MirrorPlacementValidation.initialize();

        this.setupEventListeners();
        this.setupModeButtons();
        this.updateDailyInfo();
        this.generateMirrors();
        this.generateSpawners();
        this.gameLoop();
    }

    // Delegate to modular components but maintain exact same interface
    setupEventListeners() {
        this.inputHandler.setupEventListeners();
    }

    setupModeButtons() {
        this.gameState.setupModeButtons();
    }

    switchToFreePlay() {
        this.gameState.switchToFreePlay();
    }

    switchToDailyChallenge() {
        this.gameState.switchToDailyChallenge();
    }

    updateModeButtons() {
        this.gameState.updateModeButtons();
    }

    updateDailyInfo() {
        this.gameState.updateDailyInfo();
    }

    // Mouse event handlers - delegate to InputHandler but keep methods for compatibility
    onMouseDown(e) {
        this.inputHandler.onMouseDown(e);
    }

    onMouseMove(e) {
        this.inputHandler.onMouseMove(e);
    }

    onMouseUp(e) {
        this.inputHandler.onMouseUp(e);
    }

    onMouseLeave(e) {
        this.inputHandler.onMouseLeave(e);
    }

    onGlobalMouseMove(e) {
        this.inputHandler.onGlobalMouseMove(e);
    }

    onGlobalMouseUp(e) {
        this.inputHandler.onGlobalMouseUp(e);
    }

    // Keep all original methods exactly as they were
    generateMirrors() {
        this.mirrors = [];

        if (this.gameMode === 'dailyChallenge') {
            // Generate mirrors for daily challenge
            const mirrorConfigs = SurfaceAreaManager.generateMirrorsForTarget(this.dailyPuzzle.surfaceArea);

            for (const config of mirrorConfigs) {
                const mirror = this.createValidatedMirror(config);
                if (mirror) {
                    this.mirrors.push(mirror);
                }
            }
        } else {
            // Free play mode - generate random mirrors
            const targetCount = CONFIG.MIRROR_COUNT || 10; // Default fallback

            for (let i = 0; i < targetCount; i++) {
                let attempts = 0;
                let mirror = null;

                do {
                    // Generate random position within playable area
                    const margin = 60; // Margin from edges
                    const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin);
                    const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin);

                    mirror = new Mirror(x, y);
                    attempts++;

                } while (!this.isValidPosition(mirror) && attempts < 50);

                if (attempts < 50) {
                    this.alignMirrorToGrid(mirror);
                    this.mirrors.push(mirror);
                }
            }
        }
    }

    createValidatedMirror(config) {
        let attempts = 0;
        let mirror = null;

        do {
            // Generate random position
            const margin = 60;
            const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin);
            const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin);

            mirror = new Mirror(x, y);

            // Apply specific configuration
            Object.assign(mirror, config);

            attempts++;

        } while (!this.isValidPosition(mirror) && attempts < 50);

        if (attempts < 50) {
            this.alignMirrorToGrid(mirror);

            // Create replacement mirrors if the configured one can't be placed
            if (!this.isValidPosition(mirror)) {
                return this.generateReplacementMirror(config);
            }

            return mirror;
        }

        return this.generateReplacementMirror(config);
    }

    generateReplacementMirror(originalConfig) {
        let attempts = 0;
        let mirror = null;

        do {
            const margin = 60;
            const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin);
            const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin);

            mirror = new Mirror(x, y);
            attempts++;

        } while (!this.isValidPosition(mirror) && attempts < 30);

        if (attempts < 30) {
            this.alignMirrorToGrid(mirror);
            return mirror;
        }

        return null;
    }

    enforceValidationDuringPlacement() {
        // Remove any invalid mirrors that might have been created
        this.mirrors = this.mirrors.filter(mirror => {
            const isValid = this.isValidPosition(mirror);
            if (!isValid) {
                console.log(`Removing invalid mirror at ${mirror.x}, ${mirror.y}`);
            }
            return isValid;
        });

        // If we have too few mirrors, try to add more
        const minMirrors = 5;
        let attempts = 0;
        while (this.mirrors.length < minMirrors && attempts < 20) {
            const margin = 60;
            const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - 2 * margin);
            const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - 2 * margin);

            const mirror = new Mirror(x, y);

            if (this.isValidPosition(mirror)) {
                this.alignMirrorToGrid(mirror);
                this.mirrors.push(mirror);
                console.log(`Added replacement mirror at ${mirror.x}, ${mirror.y}`);
            }
            attempts++;
        }
    }

    generateSpawners() {
        this.spawners = [];
        const numSpawners = Math.floor(Math.random() * 3) + 2; // 2-4 spawners

        // Possible edges
        const edges = ['top', 'right', 'bottom', 'left'];
        const shuffledEdges = this.shuffleArray([...edges]);

        for (let i = 0; i < numSpawners; i++) {
            const edge = shuffledEdges[i % shuffledEdges.length];
            let x, y, angle;

            switch (edge) {
                case 'top':
                    x = Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50; // Margin from edges
                    y = 25;
                    angle = this.getRandomAngleInbound(x, y, edge);
                    break;

                case 'right':
                    x = CONFIG.CANVAS_WIDTH - 25;
                    y = Math.random() * (CONFIG.CANVAS_HEIGHT - 100) + 50;
                    angle = this.getRandomAngleInbound(x, y, edge);
                    break;

                case 'bottom':
                    x = Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50;
                    y = CONFIG.CANVAS_HEIGHT - 25;
                    angle = this.getRandomAngleInbound(x, y, edge);
                    break;

                case 'left':
                    x = 25;
                    y = Math.random() * (CONFIG.CANVAS_HEIGHT - 100) + 50;
                    angle = this.getRandomAngleInbound(x, y, edge);
                    break;
            }

            this.spawners.push(new Spawner(x, y, angle));
        }
    }

    // Keep all original methods from here unchanged...
    [Continue with the rest of the original Game.js methods]
}