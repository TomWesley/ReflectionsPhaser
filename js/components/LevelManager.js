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
      
      // NYT-style color palette
      this.colors = {
        spawner: 0x1a1a1a,
        spawnerActive: 0x4ade80
      }
    
    // Complete destruction (when scene is being destroyed)
    
      
      // Store level configuration
      this.levelConfig = {
        mirrorData: [],          // Store mirror positions and types
        spawnerIndices: null,    // Store selected spawner positions
        mirrorCount: null,       // Store mirror count
        isGenerated: false       // Whether level has been generated
      };
      
      // Set up scale change listener
      this.setupScaleListener();
    }
    destroy() {
        this.isDestroying = true;
        this.cleanup();
      };
    setupScaleListener() {
      // Remove any existing listener
      this.scene.events.off('scale-changed', this.onScaleChanged, this);
      // Add fresh listener
      this.scene.events.on('scale-changed', this.onScaleChanged, this);
    }
    
    setupLevel() {
      // Create target first
      this.createTarget();
      
      // Create or restore mirrors
      if (this.levelConfig.isGenerated && this.levelConfig.mirrorData.length > 0) {
        this.restoreMirrors();
      } else {
        this.createMirrors();
      }
      
      // Create or restore spawners
      this.createSpawners();
    }
    
    createTarget() {
      // Create target at center with proper scaling
      this.target = new Target(this.scene, 0, 0);
    }
    
    createMirrors() {
      // Clear existing mirrors
      this.mirrors.forEach(mirror => mirror.destroy());
      this.mirrors = [];
      
      const mirrorCount = this.scaling.isMobile ? 7 : 9;
      this.levelConfig.mirrorCount = mirrorCount;
      
      const shapeTypes = [
        'rightTriangle',
        'isoscelesTriangle',
        'rectangle',
        'trapezoid',
        'semicircle'
      ];
      
      // Track shape usage for variety
      const shapesUsed = new Set();
      
      // Generate mirror positions with improved algorithm
      const positions = this.generateMirrorPositions(mirrorCount);
      
      // Clear stored data
      this.levelConfig.mirrorData = [];
      
      // Create mirrors with enhanced error handling
      positions.forEach((pos, index) => {
        // Select shape type with better distribution
        let shapeType;
        const unusedShapes = shapeTypes.filter(shape => !shapesUsed.has(shape));
        
        if (unusedShapes.length > 0) {
          shapeType = Phaser.Utils.Array.GetRandom(unusedShapes);
          shapesUsed.add(shapeType);
        } else {
          // Reset after using all shapes
          if (shapesUsed.size >= shapeTypes.length) {
            shapesUsed.clear();
          }
          shapeType = Phaser.Utils.Array.GetRandom(shapeTypes);
        }
        
        try {
          const mirror = new Mirror(this.scene, pos.x, pos.y, shapeType);
          
          // Store original position
          mirror.originalX = pos.x;
          mirror.originalY = pos.y;
          
          // Verify the mirror is within bounds
          if (this.verifyMirrorPosition(mirror)) {
            this.mirrors.push(mirror);
          } else {
            // Find a valid position
            const validPos = this.findValidMirrorPosition(mirror);
            this.scene.matter.body.setPosition(mirror.body, validPos);
            mirror.x = validPos.x;
            mirror.y = validPos.y;
            mirror.originalX = validPos.x;
            mirror.originalY = validPos.y;
            mirror.drawFromPhysics();
            this.mirrors.push(mirror);
          }
          
          // Store mirror data for restoration after resize
          this.levelConfig.mirrorData.push({
            x: mirror.x,
            y: mirror.y,
            originalX: mirror.originalX,
            originalY: mirror.originalY,
            shapeType: shapeType,
            rotation: mirror.initialRotation || 0,
            baseSizeRatio: mirror.baseSizeRatio,
            rectangleAspectRatio: mirror.rectangleAspectRatio,
            trapezoidRatios: mirror.trapezoidRatios
          });
        } catch (e) {
          console.error(`Error creating mirror ${index}:`, e);
          // Continue with other mirrors
        }
      });
      
      this.levelConfig.isGenerated = true;
      console.log(`Created ${this.mirrors.length} mirrors out of ${mirrorCount} requested`);
    }
    
    restoreMirrors() {
      // Clear existing mirrors
      this.mirrors.forEach(mirror => mirror.destroy());
      this.mirrors = [];
      
      // Recreate mirrors from stored data
      this.levelConfig.mirrorData.forEach((mirrorData, index) => {
        try {
          const mirror = new Mirror(
            this.scene, 
            mirrorData.finalX || mirrorData.x, 
            mirrorData.finalY || mirrorData.y, 
            mirrorData.shapeType
          );
          
          // Restore original position
          mirror.originalX = mirrorData.originalX || mirrorData.x;
          mirror.originalY = mirrorData.originalY || mirrorData.y;
          
          // Restore shape-specific properties
          if (mirrorData.baseSizeRatio !== undefined) {
            mirror.baseSizeRatio = mirrorData.baseSizeRatio;
          }
          if (mirrorData.rectangleAspectRatio !== undefined) {
            mirror.rectangleAspectRatio = mirrorData.rectangleAspectRatio;
          }
          if (mirrorData.trapezoidRatios !== undefined) {
            mirror.trapezoidRatios = mirrorData.trapezoidRatios;
          }
          
          // Recreate physics body with same properties
          mirror.createPhysicsBody();
          
          // Restore rotation
          if (mirror.body && mirrorData.rotation) {
            this.scene.matter.body.setAngle(mirror.body, mirrorData.rotation);
            mirror.initialRotation = mirrorData.rotation;
          }
          
          // Redraw
          mirror.drawFromPhysics();
          
          // If the game had started, lock the mirror
          if ((mirrorData.finalX !== undefined || mirrorData.finalY !== undefined) || 
              (this.scene.isGameStarted)) {
            mirror.lock();
          } else {
            // Make sure it's interactive if game hasn't started
            mirror.makeInteractive();
          }
          
          this.mirrors.push(mirror);
        } catch (e) {
          console.error(`Error restoring mirror ${index}:`, e);
        }
      });
      
      console.log(`Restored ${this.mirrors.length} mirrors`);
    }
    
    generateMirrorPositions(count) {
      const positions = [];
      const constraints = this.scaling.placementConstraints;
      const bounds = this.scaling.gameBounds;
      
      // Define placement area with better distribution
      const innerRadius = constraints.targetSafeRadius * 1.4;
      const outerRadius = Math.min(bounds.width, bounds.height) * 0.42;
      
      // Use improved positioning algorithm
      for (let i = 0; i < count; i++) {
        let validPosition = false;
        let attempts = 0;
        let x, y;
        
        while (!validPosition && attempts < 100) {
          if (attempts < 50) {
            // First 50 attempts: use structured placement
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
            const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
            
            x = Math.cos(angle) * distance;
            y = Math.sin(angle) * distance;
          } else {
            // Fallback: random placement
            x = Phaser.Math.Between(bounds.left + constraints.wallSafeMargin, 
                                   bounds.right - constraints.wallSafeMargin);
            y = Phaser.Math.Between(bounds.top + constraints.wallSafeMargin, 
                                   bounds.bottom - constraints.wallSafeMargin);
          }
          
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
        
        // Fallback position if no valid position found
        if (!validPosition) {
          const angle = (i / count) * Math.PI * 2;
          const distance = (innerRadius + outerRadius) / 2;
          x = Math.cos(angle) * distance;
          y = Math.sin(angle) * distance;
          
          // Clamp to bounds
          const margin = constraints.wallSafeMargin + this.scaling.elementSizes.mirrorMax / 2;
          x = Phaser.Math.Clamp(x, bounds.left + margin, bounds.right - margin);
          y = Phaser.Math.Clamp(y, bounds.top + margin, bounds.bottom - margin);
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
      
      // Clamp to bounds with proper margin
      const margin = constraints.wallSafeMargin + this.scaling.elementSizes.mirrorMax / 2;
      x = Phaser.Math.Clamp(x, bounds.left + margin, bounds.right - margin);
      y = Phaser.Math.Clamp(y, bounds.top + margin, bounds.bottom - margin);
      
      return { x, y };
    }
    
    createSpawners() {
      // Clear existing spawners
      this.spawners.forEach(spawner => {
        if (spawner.destroy) spawner.destroy();
      });
      this.spawners = [];
      
      // Get all possible spawner positions
      const allPositions = this.scaling.getSpawnerPositions();
      
      // Use stored positions if game has started, otherwise select new ones
      if (!this.levelConfig.spawnerIndices) {
        // First time - randomly select 4 positions
        const indices = Array.from({ length: allPositions.length }, (_, i) => i);
        Phaser.Utils.Array.Shuffle(indices);
        this.levelConfig.spawnerIndices = indices.slice(0, 4);
      }
      
      // Create spawners at selected positions with enhanced design
      this.levelConfig.spawnerIndices.forEach(index => {
        const pos = allPositions[index];
        
        // Calculate direction toward center
        const direction = new Phaser.Math.Vector2(-pos.x, -pos.y).normalize();
        
        // Create spawner visual with NYT-style design
        const spawner = this.createSpawnerVisual(pos, direction);
        
        // Store original position
        spawner.originalPosition = {
          x: pos.x,
          y: pos.y
        };
        
        this.spawners.push(spawner);
      });
    }
    
    createSpawnerVisual(position, direction) {
      const size = this.scaling.elementSizes.spawner;
      const angle = Math.atan2(direction.y, direction.x);
      
      // Create spawner container
      const spawnerContainer = this.scene.add.container(position.x, position.y);
      
      // Create spawner graphics
      const graphics = this.scene.add.graphics();
      
      // Modern triangular design
      graphics.fillStyle(this.colors.spawner, 0.9);
      graphics.fillTriangle(
        0, -size,
        size * 0.8, size * 0.8,
        -size * 0.8, size * 0.8
      );
      
      // Subtle outline
      graphics.lineStyle(this.scaling.getScaledValue(1), this.colors.spawner, 1);
      graphics.strokeTriangle(
        0, -size,
        size * 0.8, size * 0.8,
        -size * 0.8, size * 0.8
      );
      
      // Add to container and rotate
      spawnerContainer.add(graphics);
      spawnerContainer.rotation = angle + Math.PI / 2;
      
      // Store spawner data
      spawnerContainer.direction = direction;
      spawnerContainer.position = new Phaser.Math.Vector2(position.x, position.y);
      spawnerContainer.graphics = graphics;
      
      // Add subtle pulse animation
      this.scene.tweens.add({
        targets: graphics,
        alpha: { from: 0.9, to: 0.6 },
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      return spawnerContainer;
    }
    
    launchLasers() {
      // Clear existing lasers
      this.lasers.forEach(laser => laser.destroy());
      this.lasers = [];
      
      // Create laser from each spawner with enhanced visuals
      this.spawners.forEach((spawner, index) => {
        const speed = this.scaling.getScaledValue(6); // Slightly faster for better gameplay
        
        const laser = new Laser(
          this.scene,
          spawner.position.x,
          spawner.position.y,
          spawner.direction,
          speed
        );
        
        this.lasers.push(laser);
        
        // Add launch effect to spawner
        this.addLaunchEffect(spawner);
      });
    }
    
    addLaunchEffect(spawner) {
      // Change spawner color briefly
      if (spawner.graphics) {
        spawner.graphics.clear();
        
        const size = this.scaling.elementSizes.spawner;
        
        // Active color
        spawner.graphics.fillStyle(this.colors.spawnerActive, 1);
        spawner.graphics.fillTriangle(
          0, -size,
          size * 0.8, size * 0.8,
          -size * 0.8, size * 0.8
        );
        
        // Reset to normal color after a delay
        this.scene.time.delayedCall(500, () => {
          if (spawner.graphics) {
            spawner.graphics.clear();
            spawner.graphics.fillStyle(this.colors.spawner, 0.9);
            spawner.graphics.fillTriangle(
              0, -size,
              size * 0.8, size * 0.8,
              -size * 0.8, size * 0.8
            );
          }
        });
      }
    }
    
    lockMirrors() {
      this.mirrors.forEach((mirror, index) => {
        if (mirror.lock) {
          mirror.lock();
          
          // Store the final rotation
          if (mirror.body && this.levelConfig.mirrorData[index]) {
            this.levelConfig.mirrorData[index].rotation = mirror.body.angle;
            this.levelConfig.mirrorData[index].finalX = mirror.x;
            this.levelConfig.mirrorData[index].finalY = mirror.y;
          }
        }
      });
    }
    
    // Handle scale changes
    onScaleChanged(scaleData) {
      this.handleResize();
    }
    
    // Handle resize by updating visual elements
    handleResize() {
      // Update target scale
      if (this.target && this.target.updateScale) {
        this.target.updateScale();
      }
      
      // Recreate spawners at new positions
      if (this.spawners && this.spawners.length > 0) {
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
    
    // Cleanup with enhanced error handling
    cleanup() {
      try {
        // Destroy all game objects
        this.lasers.forEach(laser => {
          try {
            laser.destroy();
          } catch (e) {
            console.warn('Error destroying laser:', e);
          }
        });
        
        this.mirrors.forEach(mirror => {
          try {
            mirror.destroy();
          } catch (e) {
            console.warn('Error destroying mirror:', e);
          }
        });
        
        this.spawners.forEach(spawner => {
          try {
            if (spawner.destroy) {
              spawner.destroy();
            }
          } catch (e) {
            console.warn('Error destroying spawner:', e);
          }
        });
        
        if (this.target) {
          try {
            this.target.destroy();
          } catch (e) {
            console.warn('Error destroying target:', e);
          }
        }
      } catch (e) {
        console.error('Error during cleanup:', e);
      }
      
      // Clear arrays
      this.lasers = [];
      this.mirrors = [];
      this.spawners = [];
      this.target = null;
      
      // Reset level configuration for a fresh start
      this.levelConfig = {
        mirrorData: [],
        spawnerIndices: null,
        mirrorCount: null,
        isGenerated: false
      };
      
      // Remove scale change listener
      this.scene.events.off('scale-changed', this.onScaleChanged, this);
      
      // Re-add listener if not being destroyed completely
      if (!this.isDestroying) {
        this.setupScaleListener();
      }
    }
  }