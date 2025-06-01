class Laser {
    constructor(scene, x, y, direction, speed = 5) {
      // Store reference to the scene
      this.scene = scene;
      
      // Set starting position
      this.x = x;
      this.y = y;
      
      // Load style from CSS
      this.loadStyleFromCSS();
      
      // Get scaled speed
      this.baseSpeed = speed;
      this.speed = this.scene.scalingManager ? 
                   this.scene.scalingManager.getScaledValue(speed) : 
                   speed;
      
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
      
      // Remove default Matter.js rendering of the body
      this.body.render.visible = false;
      
      // Direction vector
      this.direction = new Phaser.Math.Vector2(direction.x, direction.y).normalize();
      
      // Set velocity based on direction and speed - use direct velocity setting
      scene.matter.body.setVelocity(this.body, {
        x: this.direction.x * this.speed,
        y: this.direction.y * this.speed
      });
      
      // Disable gravity, rotation, and other forces that might cause curved paths
      scene.matter.body.setInertia(this.body, Infinity); // Prevents rotation
      scene.matter.body.setAngularVelocity(this.body, 0); // No initial rotation
      
      // Create line for laser beam
      this.line = scene.add.line(0, 0, 0, 0, 0, 0, this.style.color).setLineWidth(this.style.lineWidth);
      
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
    
    loadStyleFromCSS() {
      // Default style settings
      this.style = {
        color: 0xff0000,         // Red laser
        trailAlpha: 0.5,         // Semi-transparent trail
        lineWidth: 2,            // Thickness of laser beam
        flashColor: 0xffffff     // Color of collision flash
      };
      
      try {
        // Get styles from CSS classes
        const laserStyle = this.getComputedStyleForClass('laser');
        const laserTrailStyle = this.getComputedStyleForClass('laser-trail');
        const laserFlashStyle = this.getComputedStyleForClass('laser-flash');
        
        // Apply laser styles
        if (laserStyle) {
          if (laserStyle.stroke) {
            this.style.color = this.cssColorToHex(laserStyle.stroke);
          }
          if (laserStyle['stroke-width']) {
            this.style.lineWidth = parseInt(laserStyle['stroke-width']);
          }
        }
        
        // Apply trail styles
        if (laserTrailStyle) {
          if (laserTrailStyle.stroke) {
            // Trail color can be different from main laser
            const trailColor = this.cssColorToHex(laserTrailStyle.stroke);
            if (trailColor !== null) {
              this.style.trailColor = trailColor;
            }
          }
          if (laserTrailStyle['stroke-opacity']) {
            this.style.trailAlpha = parseFloat(laserTrailStyle['stroke-opacity']);
          }
        }
        
        // Apply flash styles
        if (laserFlashStyle && laserFlashStyle.fill) {
          this.style.flashColor = this.cssColorToHex(laserFlashStyle.fill);
        }
      } catch (e) {
        console.warn('Could not load laser styles from CSS, using defaults.', e);
      }
    }
    
    // Helper method to get computed style for a CSS class
    getComputedStyleForClass(className) {
      // Create a temporary element to apply the class
      const tempElement = document.createElement('div');
      tempElement.className = className;
      document.body.appendChild(tempElement);
      
      // Get computed style
      const style = window.getComputedStyle(tempElement);
      
      // Extract relevant properties
      const result = {
        stroke: style.getPropertyValue('stroke'),
        'stroke-width': style.getPropertyValue('stroke-width'),
        'stroke-opacity': style.getPropertyValue('stroke-opacity'),
        fill: style.getPropertyValue('fill')
      };
      
      // Clean up
      document.body.removeChild(tempElement);
      
      return result;
    }
    
    // Helper function to convert CSS color to hex
    cssColorToHex(color) {
      if (!color) return null;
      
      // For hex values
      if (color.startsWith('#')) {
        return parseInt(color.substring(1), 16);
      }
      
      // For rgb/rgba values
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return (r << 16) + (g << 8) + b;
      }
      
      // Create a temporary canvas to convert named colors
      if (color.match(/^[a-z]+$/i)) {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        const hexColor = ctx.fillStyle;
        if (hexColor.startsWith('#')) {
          return parseInt(hexColor.substring(1), 16);
        }
      }
      
      // Default fallback
      return 0xff0000; // Red
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
      // Get bounds from scaling manager if available
      let bounds;
      if (this.scene.scalingManager) {
        bounds = this.scene.scalingManager.gameBounds;
      } else {
        // Fallback to scene bounds
        bounds = {
          left: this.scene.leftBound,
          right: this.scene.rightBound,
          top: this.scene.topBound,
          bottom: this.scene.bottomBound
        };
      }
      
      let reflectionNeeded = false;
      let normal = { x: 0, y: 0 };
      
      // Check against each boundary with a small buffer to ensure we're inside
      const buffer = 2;
      
      // Left boundary check
      if (this.x < bounds.left + buffer) {
        reflectionNeeded = true;
        normal = { x: 1, y: 0 }; // Normal pointing right
        this.x = bounds.left + buffer; // Force position to be inside
      }
      // Right boundary check
      else if (this.x > bounds.right - buffer) {
        reflectionNeeded = true;
        normal = { x: -1, y: 0 }; // Normal pointing left
        this.x = bounds.right - buffer; // Force position to be inside
      }
      
      // Top boundary check
      if (this.y < bounds.top + buffer) {
        reflectionNeeded = true;
        normal = { x: 0, y: 1 }; // Normal pointing down
        this.y = bounds.top + buffer; // Force position to be inside
      }
      // Bottom boundary check
      else if (this.y > bounds.bottom - buffer) {
        reflectionNeeded = true;
        normal = { x: 0, y: -1 }; // Normal pointing up
        this.y = bounds.bottom - buffer; // Force position to be inside
      }
      
      // If we need to reflect, update position and perform reflection
      if (reflectionNeeded) {
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
      
      // Remove any points that are too close to each other to avoid jagged lines
      // This helps create smoother trails
      const minDistance = this.scene.scalingManager ? 
                          this.scene.scalingManager.getScaledValue(5) : 5;
      let filteredPoints = [this.points[0]];
      
      for (let i = 1; i < this.points.length; i++) {
        const prevFilteredPoint = filteredPoints[filteredPoints.length - 1];
        const currentPoint = this.points[i];
        
        const distance = Phaser.Math.Distance.Between(
          prevFilteredPoint.x, prevFilteredPoint.y,
          currentPoint.x, currentPoint.y
        );
        
        if (distance >= minDistance) {
          filteredPoints.push(currentPoint);
        }
      }
      
      // Draw a line between all filtered points for the trail
      if (filteredPoints.length > 2) {
        if (!this.trail) {
          this.trail = this.scene.add.graphics();
        } else {
          this.trail.clear();
        }
        
        const trailColor = this.style.trailColor || this.style.color;
        const lineWidth = this.scene.scalingManager ? 
                         this.scene.scalingManager.getScaledValue(2) : 2;
        
        this.trail.lineStyle(lineWidth, trailColor, this.style.trailAlpha);
        this.trail.beginPath();
        this.trail.moveTo(filteredPoints[0].x, filteredPoints[0].y);
        
        for (let i = 1; i < filteredPoints.length; i++) {
          this.trail.lineTo(filteredPoints[i].x, filteredPoints[i].y);
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
              const mirrors = this.scene.mirrors || 
                            (this.scene.levelManager && this.scene.levelManager.mirrors) || 
                            [];
              const mirror = mirrors.find(m => m.body === otherBody);
              
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
      // Normalize the normal vector to ensure it's a unit vector
      const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      if (normalLength === 0) return; // Avoid division by zero
      
      const normalizedNormal = {
        x: normal.x / normalLength,
        y: normal.y / normalLength
      };
      
      // Get current velocity
      const velocity = {
        x: this.body.velocity.x,
        y: this.body.velocity.y
      };
      
      // Calculate the dot product between velocity and normal
      const dotProduct = velocity.x * normalizedNormal.x + velocity.y * normalizedNormal.y;
      
      // Calculate reflection using the formula: v' = v - 2(v·n)n
      const reflectedVx = velocity.x - 2 * dotProduct * normalizedNormal.x;
      const reflectedVy = velocity.y - 2 * dotProduct * normalizedNormal.y;
      
      // Get the current speed (magnitude of velocity)
      const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      // Normalize the reflected velocity and scale to maintain constant speed
      const reflectedSpeed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
      
      // Avoid division by zero
      if (reflectedSpeed === 0) return;
      
      const normalizedVx = reflectedVx / reflectedSpeed * this.speed;
      const normalizedVy = reflectedVy / reflectedSpeed * this.speed;
      
      // Apply the new velocity - ensure we use a constant speed
      this.scene.matter.body.setVelocity(this.body, {
        x: normalizedVx,
        y: normalizedVy
      });
      
      // Add a small displacement in the reflection direction to prevent multiple reflections
      const displacementDistance = this.scene.scalingManager ? 
                                  this.scene.scalingManager.getScaledValue(3) : 3;
      const newX = this.x + normalizedVx * displacementDistance / this.speed;
      const newY = this.y + normalizedVy * displacementDistance / this.speed;
      
      this.scene.matter.body.setPosition(this.body, {
        x: newX,
        y: newY
      });
    }
    
    reflectOffCustomMirror(mirror, collisionPoint) {
      // Get custom mirror's normal vector at the collision point
      const normal = mirror.getNormal(collisionPoint);
      
      // Reflect using the improved reflection method
      this.reflectWithNormal(normal);
      
      // Add a visual flash at collision point
      this.addCollisionFlash(collisionPoint.x, collisionPoint.y);
    }
    
    addCollisionFlash(x, y) {
      // Add a small flash effect at collision point
      const flashSize = this.scene.scalingManager ? 
                       this.scene.scalingManager.getScaledValue(3) : 3;
      const flash = this.scene.add.circle(x, y, flashSize, this.style.flashColor, 1);
      
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