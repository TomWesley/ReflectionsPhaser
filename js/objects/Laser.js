class Laser {
    constructor(scene, x, y, direction, speed = 5) {
      // Store reference to the scene
      this.scene = scene;
      
      // Set starting position
      this.x = x;
      this.y = y;
      
      // Physics settings for Matter.js - create a tiny circle body for ultra-precise collisions
      this.body = scene.matter.add.circle(x, y, 1, { // Ultra-small for pixel-perfect collisions
        frictionAir: 0,
        friction: 0,
        restitution: 1, // Perfect bounce
        label: 'laser',
        collisionFilter: {
          category: 0x0001, // Category 1: lasers
          mask: 0x0002 | 0x0004 | 0x0008 // Collide with mirrors, targets, and boundaries
        }
      });
      
      // Important: Don't set gameObject property on the body
      // This causes issues with Phaser's event system
      
      // Remove default Matter.js rendering of the body
      this.body.render.visible = false;
      
      // Visual representation of the laser
      this.visualSize = 5; // Visual laser size
      
      // Speed and direction
      this.speed = speed;
      this.direction = direction.normalize();
      
      // Set velocity based on direction and speed
      scene.matter.body.setVelocity(this.body, {
        x: this.direction.x * this.speed,
        y: this.direction.y * this.speed
      });
      
      // Create line for laser beam
      this.line = scene.add.line(0, 0, 0, 0, 0, 0, 0xff0000).setLineWidth(2);
      
      // Points for trail
      this.points = [];
      this.maxPoints = 100; // Set max points for performance
      
      // Update position on each frame
      scene.events.on('update', this.update, this);
      
      // Track reflections
      this.reflectionCount = 0;
      
      // Setup collision handlers
      this.setupCollisions();
      
      // Store active state
      this.active = true;
    }
    
    update() {
      if (!this.active) return;
      
      // Update position based on physics body
      this.x = this.body.position.x;
      this.y = this.body.position.y;
      
      // IMPORTANT: Check if laser is outside boundaries and force reflection if needed
      this.checkBoundaries();
      
      // Add current position to points array for trail
      this.points.push({
        x: this.x,
        y: this.y,
        time: this.scene.time.now
      });
      
      // Limit points array length
      if (this.points.length > this.maxPoints) {
        this.points.shift();
      }
      
      // Update laser trail
      this.updateLaserBeam();
    }
    
    // Check if laser is outside game boundaries and force reflection
    checkBoundaries() {
      const boundsCheck = {
        leftBound: this.scene.leftBound,
        rightBound: this.scene.rightBound,
        topBound: this.scene.topBound,
        bottomBound: this.scene.bottomBound
      };
      
      let reflectionNeeded = false;
      let normal = { x: 0, y: 0 };
      
      // Check against each boundary with a small buffer to ensure we're inside
      const buffer = 2;
      
      // Left boundary check
      if (this.x < boundsCheck.leftBound + buffer) {
        reflectionNeeded = true;
        normal = { x: 1, y: 0 }; // Normal pointing right
        this.x = boundsCheck.leftBound + buffer; // Force position to be inside
      }
      // Right boundary check
      else if (this.x > boundsCheck.rightBound - buffer) {
        reflectionNeeded = true;
        normal = { x: -1, y: 0 }; // Normal pointing left
        this.x = boundsCheck.rightBound - buffer; // Force position to be inside
      }
      
      // Top boundary check
      if (this.y < boundsCheck.topBound + buffer) {
        reflectionNeeded = true;
        normal = { x: 0, y: 1 }; // Normal pointing down
        this.y = boundsCheck.topBound + buffer; // Force position to be inside
      }
      // Bottom boundary check
      else if (this.y > boundsCheck.bottomBound - buffer) {
        reflectionNeeded = true;
        normal = { x: 0, y: -1 }; // Normal pointing up
        this.y = boundsCheck.bottomBound - buffer; // Force position to be inside
      }
      
      // If we need to reflect, update position and perform reflection
      if (reflectionNeeded) {
        console.log('Forcing laser reflection at boundary');
        
        // Update physics body position
        this.scene.matter.body.setPosition(this.body, {
          x: this.x,
          y: this.y
        });
        
        // Perform reflection
        this.reflectWithNormal(normal);
        
        // Increment reflection count
        this.reflectionCount++;
      }
    }
    
    updateLaserBeam() {
      if (this.points.length < 2) return;
      
      // Update laser line based on the last two points
      const lastPoint = this.points[this.points.length - 1];
      const prevPoint = this.points[this.points.length - 2];
      
      this.line.setTo(prevPoint.x, prevPoint.y, lastPoint.x, lastPoint.y);
      
      // Draw a line between all points for the trail
      if (this.points.length > 2) {
        if (!this.trail) {
          this.trail = this.scene.add.graphics();
        } else {
          this.trail.clear();
        }
        
        this.trail.lineStyle(2, 0xff0000, 0.5);
        this.trail.beginPath();
        this.trail.moveTo(this.points[0].x, this.points[0].y);
        
        for (let i = 1; i < this.points.length; i++) {
          this.trail.lineTo(this.points[i].x, this.points[i].y);
        }
        
        this.trail.strokePath();
      }
    }
    
    setupCollisions() {
      // Handle collisions with reflection logic
      this.scene.matter.world.on('collisionstart', (event) => {
        const pairs = event.pairs;
        
        for (const pair of pairs) {
          // Check if this laser is involved in the collision
          if ((pair.bodyA === this.body || pair.bodyB === this.body) && this.active) {
            // Get the other body
            const otherBody = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
            
            // Collision point
            const collisionPoint = pair.collision.supports.length > 0 
              ? pair.collision.supports[0] 
              : { x: this.x, y: this.y };
            
            // Check for target collision - game complete
            if (otherBody.label === 'target') {
              console.log('Laser collision with target detected!');
              this.scene.onLaserHitTarget(this);
              return;
            }
            
            // Handle collision with custom mirror
            if (otherBody.label === 'mirror') {
              // Find the mirror that owns this body
              const mirror = this.scene.mirrors.find(m => m.body === otherBody);
              if (mirror) {
                this.reflectOffCustomMirror(mirror, collisionPoint);
              } else {
                // Regular boundary reflection as fallback
                this.reflectWithNormal(pair.collision.normal);
              }
            } else {
              // Regular boundary collision
              this.reflectWithNormal(pair.collision.normal);
            }
            
            // Increment reflection count
            this.reflectionCount++;
          }
        }
      });
    }
    
    reflectWithNormal(normal) {
      // Get current velocity
      const velocity = {
        x: this.body.velocity.x,
        y: this.body.velocity.y
      };
      
      // Calculate reflection using the formula: v' = v - 2(v·n)n
      const dotProduct = velocity.x * normal.x + velocity.y * normal.y;
      
      const reflectedVx = velocity.x - 2 * dotProduct * normal.x;
      const reflectedVy = velocity.y - 2 * dotProduct * normal.y;
      
      // Apply new velocity, maintaining speed
      const currentSpeed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
      const normalizedVx = reflectedVx / currentSpeed * this.speed;
      const normalizedVy = reflectedVy / currentSpeed * this.speed;
      
      this.scene.matter.body.setVelocity(this.body, {
        x: normalizedVx,
        y: normalizedVy
      });
    }
    
    reflectOffCustomMirror(mirror, collisionPoint) {
      // Get custom mirror's normal vector at the collision point
      const normal = mirror.getNormal(collisionPoint);
      
      // Get current velocity
      const velocity = {
        x: this.body.velocity.x,
        y: this.body.velocity.y
      };
      const velocityVector = new Phaser.Math.Vector2(velocity.x, velocity.y);
      
      // Calculate reflection
      const dotProduct = velocityVector.dot(normal);
      const reflectedVelocity = velocityVector.subtract(normal.scale(2 * dotProduct));
      
      // Normalize and apply speed
      reflectedVelocity.normalize().scale(this.speed);
      
      // Apply new velocity
      this.scene.matter.body.setVelocity(this.body, {
        x: reflectedVelocity.x,
        y: reflectedVelocity.y
      });
      
      // Optional: Add a visual flash at collision point
      this.addCollisionFlash(collisionPoint.x, collisionPoint.y);
    }
    
    addCollisionFlash(x, y) {
      // Add a small flash effect at collision point
      const flash = this.scene.add.circle(x, y, 3, 0xffffff, 1);
      
      // Fade out and destroy
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 2,
        duration: 200,
        onComplete: () => flash.destroy()
      });
    }
    
    destroy() {
      // Remove update listener
      if (this.scene && this.scene.events) {
        this.scene.events.off('update', this.update, this);
      }
      
      // Remove from physics world
      if (this.body && this.scene.matter.world) {
        this.scene.matter.world.remove(this.body);
      }
      
      // Destroy graphics
      if (this.line) {
        this.line.destroy();
      }
      
      if (this.trail) {
        this.trail.destroy();
      }
      
      // Set inactive
      this.active = false;
    }
}