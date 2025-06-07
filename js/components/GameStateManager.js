// GameStateManager.js - Enhanced game state management with better timing and events
class GameStateManager {
    constructor(scene) {
      this.scene = scene;
      
      // Game state
      this.isGameStarted = false;
      this.gameTime = 0;
      this.targetHit = false;
      this.isPaused = false;
      
      // Timing configuration - adjusted for better gameplay
      this.timeLimit = this.scene.scalingManager && this.scene.scalingManager.isMobile ? 90 : 75; // More time on mobile
      this.startTime = 0;
      
      // Performance tracking
      this.lastUpdateTime = 0;
      this.frameCount = 0;
      this.averageFPS = 60;
      
      // Timer event
      this.timeEvent = null;
      this.warningEvent = null;
      
      // Event callbacks
      this.callbacks = {
        onStart: [],
        onComplete: [],
        onTimeout: [],
        onPause: [],
        onResume: [],
        onWarning: []
      };
      
      // Listen for visibility changes for auto-pause
      this.setupVisibilityHandling();
    }
    
    setupVisibilityHandling() {
      // Auto-pause when tab/window becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (this.isGameStarted && !this.targetHit) {
          if (document.hidden) {
            this.pause();
          } else {
            // Auto-resume after a short delay to let user get ready
            this.scene.time.delayedCall(1000, () => {
              if (this.isPaused) {
                this.resume();
              }
            });
          }
        }
      });
    }
    
    startGame() {
      if (this.isGameStarted) return false;
      
      this.isGameStarted = true;
      this.gameTime = 0;
      this.targetHit = false;
      this.isPaused = false;
      this.startTime = this.scene.time.now;
      this.lastUpdateTime = this.startTime;
      
      // Set up main timer
      this.timeEvent = this.scene.time.addEvent({
        delay: this.timeLimit * 1000,
        callback: this.onTimeout,
        callbackScope: this
      });
      
      // Set up warning timer (last 10 seconds)
      if (this.timeLimit > 10) {
        this.warningEvent = this.scene.time.addEvent({
          delay: (this.timeLimit - 10) * 1000,
          callback: this.onWarning,
          callbackScope: this
        });
      }
      
      // Emit start event
      this.emitEvent('onStart', { timeLimit: this.timeLimit });
      
      return true;
    }
    
    update(delta) {
      if (!this.isGameStarted || this.targetHit || this.isPaused) return;
      
      // Update game time with high precision
      const currentTime = this.scene.time.now;
      const actualDelta = currentTime - this.lastUpdateTime;
      this.lastUpdateTime = currentTime;
      
      this.gameTime += actualDelta / 1000; // Convert to seconds
      
      // Performance tracking
      this.updatePerformanceMetrics(delta);
      
      // Check for natural timeout (backup to timer event)
      if (this.gameTime >= this.timeLimit) {
        this.onTimeout();
      }
    }
    
    updatePerformanceMetrics(delta) {
      this.frameCount++;
      
      // Update average FPS every 60 frames
      if (this.frameCount % 60 === 0) {
        const currentFPS = 1000 / delta;
        this.averageFPS = (this.averageFPS * 0.9) + (currentFPS * 0.1);
        
        // Adjust game behavior based on performance if needed
        if (this.averageFPS < 30) {
          console.warn('Low FPS detected:', this.averageFPS);
          this.emitEvent('onLowPerformance', { fps: this.averageFPS });
        }
      }
    }
    
    onLaserHitTarget() {
      if (!this.isGameStarted || this.targetHit) return false;
      
      // Record exact completion time
      const completionTime = this.gameTime;
      
      this.targetHit = true;
      this.isGameStarted = false;
      
      // Remove all timers
      this.clearTimers();
      
      // Emit completion event
      this.emitEvent('onComplete', { 
        time: completionTime,
        timeLimit: this.timeLimit,
        performance: this.getPerformanceStats()
      });
      
      return true;
    }
    
    onTimeout() {
      if (!this.isGameStarted || this.targetHit) return;
      
      this.isGameStarted = false;
      
      // Clear all timers
      this.clearTimers();
      
      // Emit timeout event
      this.emitEvent('onTimeout', {
        timeLimit: this.timeLimit,
        performance: this.getPerformanceStats()
      });
      
      // Notify scene of game over
      if (this.scene.gameOver) {
        this.scene.gameOver();
      }
    }
    
    onWarning() {
      if (!this.isGameStarted || this.targetHit) return;
      
      // Emit warning event for UI feedback
      this.emitEvent('onWarning', {
        timeRemaining: this.timeLimit - this.gameTime
      });
    }
    
    pause() {
      if (!this.isGameStarted || this.targetHit || this.isPaused) return false;
      
      this.isPaused = true;
      
      // Pause all timers
      if (this.timeEvent) this.timeEvent.paused = true;
      if (this.warningEvent) this.warningEvent.paused = true;
      
      // Store pause time for accurate resume
      this.pauseTime = this.scene.time.now;
      
      // Emit pause event
      this.emitEvent('onPause', {
        gameTime: this.gameTime,
        timeRemaining: this.timeLimit - this.gameTime
      });
      
      return true;
    }
    
    resume() {
      if (!this.isPaused) return false;
      
      this.isPaused = false;
      
      // Resume all timers
      if (this.timeEvent) this.timeEvent.paused = false;
      if (this.warningEvent) this.warningEvent.paused = false;
      
      // Adjust timing for pause duration
      const pauseDuration = this.scene.time.now - this.pauseTime;
      this.lastUpdateTime += pauseDuration;
      
      // Emit resume event
      this.emitEvent('onResume', {
        gameTime: this.gameTime,
        pauseDuration: pauseDuration / 1000
      });
      
      return true;
    }
    
    reset() {
      this.isGameStarted = false;
      this.gameTime = 0;
      this.targetHit = false;
      this.isPaused = false;
      this.startTime = 0;
      this.lastUpdateTime = 0;
      this.frameCount = 0;
      
      this.clearTimers();
      this.clearCallbacks();
    }
    
    clearTimers() {
      if (this.timeEvent) {
        this.timeEvent.remove();
        this.timeEvent = null;
      }
      
      if (this.warningEvent) {
        this.warningEvent.remove();
        this.warningEvent = null;
      }
    }
    
    // Event system for better component communication
    on(eventName, callback) {
      if (this.callbacks[eventName]) {
        this.callbacks[eventName].push(callback);
      }
    }
    
    off(eventName, callback) {
      if (this.callbacks[eventName]) {
        const index = this.callbacks[eventName].indexOf(callback);
        if (index > -1) {
          this.callbacks[eventName].splice(index, 1);
        }
      }
    }
    
    emitEvent(eventName, data = {}) {
      if (this.callbacks[eventName]) {
        this.callbacks[eventName].forEach(callback => {
          try {
            callback(data);
          } catch (e) {
            console.error(`Error in ${eventName} callback:`, e);
          }
        });
      }
    }
    
    clearCallbacks() {
      Object.keys(this.callbacks).forEach(key => {
        this.callbacks[key] = [];
      });
    }
    
    // Getters for game state
    getGameTime() {
      return this.gameTime;
    }
    
    getTimeRemaining() {
      return Math.max(0, this.timeLimit - this.gameTime);
    }
    
    getTimeLimit() {
      return this.timeLimit;
    }
    
    getProgress() {
      return Math.min(1, this.gameTime / this.timeLimit);
    }
    
    isPlaying() {
      return this.isGameStarted && !this.isPaused;
    }
    
    hasWon() {
      return this.targetHit;
    }
    
    hasLost() {
      return !this.isGameStarted && !this.targetHit && this.gameTime > 0;
    }
    
    getGameState() {
      return {
        isStarted: this.isGameStarted,
        isPaused: this.isPaused,
        hasWon: this.hasWon(),
        hasLost: this.hasLost(),
        gameTime: this.gameTime,
        timeRemaining: this.getTimeRemaining(),
        progress: this.getProgress()
      };
    }
    
    getPerformanceStats() {
      return {
        averageFPS: Math.round(this.averageFPS),
        frameCount: this.frameCount,
        startTime: this.startTime,
        totalTime: this.scene.time.now - this.startTime
      };
    }
    
    // Advanced timing features
    setTimeLimit(newLimit) {
      if (!this.isGameStarted) {
        this.timeLimit = newLimit;
        return true;
      }
      return false;
    }
    
    addTime(seconds) {
      if (this.isGameStarted && !this.targetHit) {
        this.timeLimit += seconds;
        
        // Update existing timer
        if (this.timeEvent) {
          this.timeEvent.remove();
          this.timeEvent = this.scene.time.addEvent({
            delay: (this.timeLimit - this.gameTime) * 1000,
            callback: this.onTimeout,
            callbackScope: this
          });
        }
        
        return true;
      }
      return false;
    }
    
    // Debug information
    getDebugInfo() {
      return {
        ...this.getGameState(),
        ...this.getPerformanceStats(),
        timers: {
          mainTimer: this.timeEvent ? this.timeEvent.getRemaining() : 0,
          warningTimer: this.warningEvent ? this.warningEvent.getRemaining() : 0
        }
      };
    }
    
    // Cleanup
    destroy() {
      this.clearTimers();
      this.clearCallbacks();
      
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', this.setupVisibilityHandling);
    }
  }