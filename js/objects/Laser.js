class Laser extends Phaser.Physics.Matter.Image {
    constructor(scene, x, y, direction, speed = 4) {
      super(scene.matter.world, x, y, 'laser');
      
      // Store reference to the scene
      this.gameScene = scene;
      
      // Set initial scale and alpha
      this.setScale(0.25);
      this.setAlpha(0.8);
      
      // Physics settings
      this.setFriction(0);
      this.setFrictionAir(0);
      this.setBounce(1); // Perfect reflection
      this.setMass(1);
      this.setFixedRotation(); // Prevent rotation during collisions
      
      // Collision settings
      this.setCollisionCategory(0x0001); // Category 1: lasers
      this.setCollidesWith([0x0002, 0x0004, 0x0008]); // Collide with mirrors, boundaries, absorbers
      
      // Speed and direction
      this.speed = speed;
      this.direction = direction.normalize();
      
      // Set velocity based on direction and speed
      this.setVelocity(
        this.direction.x * this.speed,
        this.direction.y * this.speed
      );
      
      // Add to scene
      scene.add.existing(this);
      
      // Create trail
      this.createTrail();
      
      // Points for trail
      this.points = [];
      this.maxPoints = 650; // Maximum points to keep
      
      // Track reflections
      this.reflectionCount = 0;
      
      // Set up collision handlers
      this.setupCollisions();
    }
    
    createTrail() {
      // Create graphics object for trail
      this.trail = this.gameScene.add.graphics();
      this.trail.lineStyle(2, 0x00ffff, 0.5);
      
      // Update trail on each frame
      this.gameScene.events.on('update', this.updateTrail, this);
    }
    
    updateTrail() {
      // Skip if game is over
      if (!this.gameScene.isGameStarted) return;
      
      // Add current position to points
      if (this.active) {
        this.points.push({
          x: this.x,
          y: this.y,
          time: this.gameScene.time.now
        });
        
        // Limit points array length
        if (this.points.length > this.maxPoints) {
          this.points.shift();
        }
        
        // Draw the trail
        this.drawTrail();
      }
    }
    
    drawTrail() {
      this.trail.clear();
      
      if (this.points.length < 2) return;
      
      this.trail.beginPath();
      this.trail.moveTo(this.points[0].x, this.points[0].y);
      
      // Draw lines between points
      for (let i = 1; i < this.points.length; i++) {
        this.trail.lineTo(this.points[i].x, this.points[i].y);
      }
      
      this.trail.strokePath();
    }
    
    setupCollisions() {
      // Handle collisions with reflection logic
      this.gameScene.matter.world.on('collisionstart', (event) => {
        const pairs = event.pairs;
        
        for (const pair of pairs) {
          // Check if this laser is involved in the collision
          if (pair.bodyA === this.body || pair.bodyB === this.body) {
            this.handleCollision(pair);
          }
        }
      });
    }
    
    handleCollision(pair) {
      // Get the other body
      const otherBody = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
      const otherGameObject = otherBody.gameObject;
      
      // Handle collision with absorber
      if (otherGameObject && otherGameObject.texture && otherGameObject.texture.key === 'absorber') {
        this.absorb();
        return;
      }
      
      // Get collision normal
      const normal = pair.collision.normal;
      
      // If the other object is a mirror, use its normal vector for more accurate reflection
      if (otherGameObject instanceof Mirror) {
        this.reflectOffMirror(otherGameObject);
      } else {
        // Otherwise use the collision normal
        this.reflectWithNormal(normal);
      }
      
      // Increment reflection count
      this.reflectionCount++;
    }
    
    reflectWithNormal(normal) {
      // Current velocity
      const vx = this.body.velocity.x;
      const vy = this.body.velocity.y;
      
      // Calculate reflection using the formula: v' = v - 2(v·n)n
      // where v is velocity vector and n is normal vector
      const dotProduct = vx * normal.x + vy * normal.y;
      
      const reflectedVx = vx - 2 * dotProduct * normal.x;
      const reflectedVy = vy - 2 * dotProduct * normal.y;
      
      // Apply new velocity, maintaining speed
      const speed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
      const normalizedVx = reflectedVx / speed * this.speed;
      const normalizedVy = reflectedVy / speed * this.speed;
      
      this.setVelocity(normalizedVx, normalizedVy);
    }
    
    reflectOffMirror(mirror) {
      // Get mirror's normal vector
      const normal = mirror.getNormal();
      
      // Current velocity
      const velocity = new Phaser.Math.Vector2(this.body.velocity.x, this.body.velocity.y);
      
      // Calculate reflection
      const dotProduct = velocity.dot(normal);
      const reflectedVelocity = velocity.subtract(normal.scale(2 * dotProduct));
      
      // Normalize and apply speed
      reflectedVelocity.normalize().scale(this.speed);
      
      // Apply new velocity
      this.setVelocity(reflectedVelocity.x, reflectedVelocity.y);
    }
    
    absorb() {
      // Stop the laser
      this.setStatic(true);
      this.setVelocity(0, 0);
      
      // Notify the game scene
      this.gameScene.onLaserAbsorbed(this);
    }
    
    // Clean up when destroying the laser
    destroy() {
      // Remove update listener
      if (this.gameScene && this.gameScene.events) {
        this.gameScene.events.off('update', this.updateTrail, this);
      }
      
      // Destroy trail graphics
      if (this.trail) {
        this.trail.destroy();
      }
      
      // Call parent class destroy
      super.destroy();
    }
  }