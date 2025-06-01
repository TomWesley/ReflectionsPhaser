// GameStateManager.js - Manages game state, timing, and win/lose conditions
class GameStateManager {
    constructor(scene) {
      this.scene = scene;
      
      // Game state
      this.isGameStarted = false;
      this.gameTime = 0;
      this.targetHit = false;
      this.timeLimit = 60; // seconds
      
      // Timer event
      this.timeEvent = null;
    }
    
    startGame() {
      if (this.isGameStarted) return;
      
      this.isGameStarted = true;
      this.gameTime = 0;
      this.targetHit = false;
      
      // Set up timer
      this.timeEvent = this.scene.time.addEvent({
        delay: this.timeLimit * 1000,
        callback: this.onTimeout,
        callbackScope: this
      });
      
      return true;
    }
    
    update(delta) {
      if (this.isGameStarted && !this.targetHit) {
        this.gameTime += delta / 1000; // Convert to seconds
      }
    }
    
    onLaserHitTarget() {
      if (!this.isGameStarted || this.targetHit) return false;
      
      this.targetHit = true;
      this.isGameStarted = false;
      
      // Remove timer
      if (this.timeEvent) {
        this.timeEvent.remove();
        this.timeEvent = null;
      }
      
      return true;
    }
    
    onTimeout() {
      if (!this.isGameStarted || this.targetHit) return;
      
      this.isGameStarted = false;
      
      // Notify scene of game over
      this.scene.gameOver();
    }
    
    reset() {
      this.isGameStarted = false;
      this.gameTime = 0;
      this.targetHit = false;
      
      if (this.timeEvent) {
        this.timeEvent.remove();
        this.timeEvent = null;
      }
    }
    
    getGameTime() {
      return this.gameTime;
    }
    
    isPlaying() {
      return this.isGameStarted;
    }
    
    hasWon() {
      return this.targetHit;
    }
  }