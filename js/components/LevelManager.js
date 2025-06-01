// LevelManager.js - Manages level setup, mirror placement, and spawner creation
class LevelManager {
    constructor(scene, scalingManager, gameArea) {
      this.scene = scene;
      this.scaling = scalingManager;
      this.gameArea = gameArea;
      
      // Collections
      this.mirrors = [];
      this.spawners = [];
      this.lasers = [];
      this.target = null;
    }
    
    setupLevel() {
      // Create target first
      this.createTarget();
      
      // Create mirrors
      this.createMirrors();
      
      // Create spawners
      this.createSpawners();
    }
    
    createTarget() {
      // Create target at center
      this.target = new Target(this.scene, 0, 0);
    }
    
    createMirrors() {
      // Clear existing mirrors
      this.mirrors.forEach(mirror => mirror.destroy());
      this.mirrors = [];
      
      const mirrorCount = 9;
      const shapeTypes = [
        'rightTriangle',
        'isoscelesTriangle',
        'rectangle',
        'trapezoid',
        'semicircle'
      ];
      
      // Track which shapes we've created
      const shapesUsed = new Set();
      
      // Generate mirror positions
      const positions = this.generateMirrorPositions(mirrorCount);
      
      // Create mirrors
      positions.forEach((pos, index) => {
        // Select shape type - try to use different shapes
        let shapeType;
        const unusedShapes = shapeTypes.filter(shape => !shapesUsed.has(shape));
        
        if (unusedShapes.length > 0) {
          shapeType = Phaser.Utils.Array.GetRandom(unusedShapes);
          shapesUsed.add(shapeType);
        } else {
          shapeType = Phaser.Utils.Array.GetRandom(shapeTypes);
        }
        
        try {
          const mirror = new Mirror(this.scene, pos.x, pos.y, shapeType);
          
          // Verify the mirror is within bounds
          if (this.verifyMirrorPosition(mirror)) {
            this.mirrors.push(mirror);
          } else {
            // If not within bounds, find a valid position
            const validPos = this.findValidMirrorPosition(mirror);
            mirror.x = validPos.x;
            mirror.y = validPos.y;
            this.scene.matter.body.setPosition(mirror.body, validPos);
            mirror.drawFromPhysics();
            this.mirrors.push(mirror);
          }
        } catch (e) {
          console.error(`Error creating mirror: ${e}`);
        }
      });
    }
    
    generateMirrorPositions(count) {
      const positions = [];
      const constraints = this.scaling.placementConstraints;
      const bounds = this.scaling.gameBounds;
      
      // Define a ring area where mirrors should be placed
      const innerRadius = constraints.targetSafeRadius * 1.3;
      const outerRadius = Math.min(bounds.width, bounds.height) * 0.4;
      
      // Generate positions in a circular pattern
      for (let i = 0; i < count; i++) {
        let validPosition = false;
        let attempts = 0;
        let x, y;
        
        while (!validPosition && attempts < 50) {
          // Random angle and distance
          const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
          
          x = Math.cos(angle) * distance;
          y = Math.sin(angle) * distance;
          
          // Check if position is valid
          if (this.gameArea.isValidMirrorPosition(x, y)) {
            // Check spacing from other mirrors
            const tooClose = positions.some(pos => {
              const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
              return dist < constraints.mirrorMinSpacing;
            });
            
            if (!tooClose) {
              validPosition = true;
            }
          }
          
          attempts++;
        }
        
        // If no valid position found, use a fallback
        if (!validPosition) {
          const angle = (i / count) * Math.PI * 2;
          x = Math.cos(angle) * (innerRadius + outerRadius) / 2;
          y = Math.sin(angle) * (innerRadius + outerRadius) / 2;
        }
        
        positions.push({ x, y });
      }
      
      return positions;
    }
    
    verifyMirrorPosition(mirror) {
      if (!mirror.body) return false;
      
      // Get mirror vertices
      let vertices = [];
      if (mirror.body.parts && mirror.body.parts.length > 1) {
        vertices = mirror.body.parts[1].vertices;
      } else {
        vertices = mirror.body.vertices;
      }
      
      // Check if all vertices are within bounds
      const bounds = this.scaling.gameBounds;
      const margin = this.scaling.placementConstraints.wallSafeMargin;
      
      for (const vertex of vertices) {
        if (vertex.x < bounds.left + margin || vertex.x > bounds.right - margin ||
            vertex.y < bounds.top + margin || vertex.y > bounds.bottom - margin) {
          return false;
        }
      }
      
      return true;
    }
    
    findValidMirrorPosition(mirror) {
      const constraints = this.scaling.placementConstraints;
      const bounds = this.scaling.gameBounds;
      
      // Get current position
      let { x, y } = mirror;
      
      // If too close to center, move outward
      const distFromCenter = Math.sqrt(x * x + y * y);
      if (distFromCenter < constraints.targetSafeRadius * 1.5) {
        const angle = Math.atan2(y, x);
        x = Math.cos(angle) * constraints.targetSafeRadius * 1.5;
        y = Math.sin(angle) * constraints.targetSafeRadius * 1.5;
      }
      
      // Clamp to bounds
      const margin = constraints.wallSafeMargin + this.scaling.elementSizes.mirrorMax / 2;
      x = Phaser.Math.Clamp(x, bounds.left + margin, bounds.right - margin);
      y = Phaser.Math.Clamp(y, bounds.top + margin, bounds.bottom - margin);
      
      return { x, y };
    }
    
    createSpawners() {
      // Clear existing spawners
      this.spawners.forEach(spawner => spawner.destroy());
      this.spawners = [];
      
      // Get all possible spawner positions
      const allPositions = this.scaling.getSpawnerPositions();
      
      // Use stored positions if game has started, otherwise select new ones
      if (!this.selectedSpawnerIndices) {
        // First time - randomly select 4 positions
        const indices = Array.from({ length: allPositions.length }, (_, i) => i);
        Phaser.Utils.Array.Shuffle(indices);
        this.selectedSpawnerIndices = indices.slice(0, 4);
      }
      
      // Create spawners at selected positions
      this.selectedSpawnerIndices.forEach(index => {
        const pos = allPositions[index];
        
        // Calculate direction toward center
        const direction = new Phaser.Math.Vector2(-pos.x, -pos.y).normalize();
        
        // Create spawner visual
        const size = this.scaling.elementSizes.spawner;
        const angle = Math.atan2(direction.y, direction.x);
        
        const spawner = this.scene.add.triangle(
          pos.x, pos.y,
          0, -size,
          size, size,
          -size, size,
          0xff4500
        );
        
        // Rotate to point toward center
        spawner.rotation = angle + Math.PI / 2;
        
        // Store spawner data
        spawner.direction = direction;
        spawner.position = new Phaser.Math.Vector2(pos.x, pos.y);
        
        this.spawners.push(spawner);
      });
    }
    
    launchLasers() {
      // Clear existing lasers
      this.lasers.forEach(laser => laser.destroy());
      this.lasers = [];
      
      // Create laser from each spawner
      this.spawners.forEach(spawner => {
        const speed = this.scaling.getScaledValue(5);
        const laser = new Laser(
          this.scene,
          spawner.position.x,
          spawner.position.y,
          spawner.direction,
          speed
        );
        
        this.lasers.push(laser);
      });
    }
    
    lockMirrors() {
      this.mirrors.forEach(mirror => mirror.lock());
    }
    
    // Handle window resize
    handleResize() {
      // Update target scale
      if (this.target) {
        this.target.destroy();
        this.target = new Target(this.scene, 0, 0);
      }
      
      // Update mirror scales and ensure they're within bounds
      this.mirrors.forEach(mirror => {
        // Update mirror scale
        if (mirror.updateScale) {
          mirror.updateScale(this.scaling.scaleFactor);
        }
        
        // Verify position is still valid
        if (!this.verifyMirrorPosition(mirror)) {
          const validPos = this.findValidMirrorPosition(mirror);
          this.scene.matter.body.setPosition(mirror.body, validPos);
          mirror.x = validPos.x;
          mirror.y = validPos.y;
          mirror.drawFromPhysics();
        }
      });
      
      // Only recreate spawners if game hasn't started
      // This prevents them from moving during gameplay
      if (!this.scene.gameState || !this.scene.gameState.isPlaying()) {
        this.createSpawners();
      }
    }
    
    // Get total reflections from all lasers
    getTotalReflections() {
      return this.lasers.reduce((total, laser) => total + laser.reflectionCount, 0);
    }
    
    // Stop all lasers
    stopLasers() {
      this.lasers.forEach(laser => {
        if (laser.body) {
          this.scene.matter.body.setStatic(laser.body, true);
        }
      });
    }
    
    // Cleanup
    cleanup() {
      // Destroy all game objects
      this.lasers.forEach(laser => laser.destroy());
      this.mirrors.forEach(mirror => mirror.destroy());
      this.spawners.forEach(spawner => spawner.destroy());
      
      if (this.target) {
        this.target.destroy();
      }
      
      // Clear arrays
      this.lasers = [];
      this.mirrors = [];
      this.spawners = [];
      this.target = null;
      
      // Reset spawner selection for next game
      this.selectedSpawnerIndices = null;
    }
  }