class Laser {
    constructor(scene, x, y, direction, speed = 5) {
      // Store reference to the scene
      this.scene = scene;
      
      // Set starting position
      this.x = x;
      this.y = y;
      
      // Physics settings for Matter.js - create a simple circle body
      this.body = scene.matter.add.circle(x, y, 5, {
        frictionAir: 0,
        friction: 0,
        restitution: 1, // Perfect bounce
        label: 'laser',
        collisionFilter: {
          category: 0x0001, // Category 1: lasers
          mask: 0x0002 | 0x0004 | 0x0008 // Collide with mirrors, targets, and boundaries
        }
      });
      
      // Remove default Matter.js rendering of the body
      this.body.render.visible = false;
      
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
      this.maxPoints = 100; // Reduced max points for better performance
      
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
            
            // Check for target collision - game complete
            if (otherBody.label === 'target') {
              console.log('Laser collision with target detected!');
              this.scene.onLaserHitTarget(this);
              return;
            }
            
            // Handle collision with mirror
            if (otherBody.gameObject instanceof Mirror) {
              this.reflectOffMirror(otherBody.gameObject);
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
    
    reflectOffMirror(mirror) {
      // Get mirror's normal vector
      const normal = mirror.getNormal();
      
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