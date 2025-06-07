class Laser {
    constructor(scene, x, y, direction, speed = .001) {
      this.scene = scene;
      
      // Set starting position
      this.x = x;
      this.y = y;
      
      // NYT-style color palette
      this.colors = {
        primary: 0x1a1a1a,
        secondary: 0x6c757d,
        accent: 0x121212,
        success: 0x4ade80,
        trail: 0x6c757d
      };
      
      // Load style from CSS
      this.loadStyleFromCSS();
      
      // Get scaled speed
      this.baseSpeed = speed;
      this.speed = this.scene.scalingManager ? 
                   this.scene.scalingManager.getScaledValue(speed) : 
                   speed;
      
      // Physics settings for Matter.js - ultra-precise collisions
      this.body = scene.matter.add.circle(x, y, 1, {
        frictionAir: 0,
        friction: 0,
        restitution: 1,
        label: 'laser',
        collisionFilter: {
          category: 0x0001,
          mask: 0x0002 | 0x0004 | 0x0008
        }
      });
      
      // Remove default Matter.js rendering
      this.body.render.visible = false;
      
      // Direction vector
      this.direction = new Phaser.Math.Vector2(direction.x, direction.y).normalize();
      
      // Set velocity
      scene.matter.body.setVelocity(this.body, {
        x: this.direction.x * this.speed,
        y: this.direction.y * this.speed
      });
      
      // Disable rotation and other forces
      scene.matter.body.setInertia(this.body, Infinity);
      scene.matter.body.setAngularVelocity(this.body, 0);
      
      // Create visual line for laser beam - clean and minimal
      this.line = scene.add.line(0, 0, 0, 0, 0, 0, this.style.color)
        .setLineWidth(this.style.lineWidth)
        .setDepth(20);
      
      // Points for trail with performance optimization
      this.points = [];
      this.maxPoints = this.scene.scalingManager ? 
                      Math.max(30, Math.floor(60 * this.scene.scalingManager.responsiveScale)) : 
                      50;
      
      // Update position on each frame
      scene.events.on('update', this.update, this);
      
      // Track reflections
      this.reflectionCount = 0;
      
      // Setup collision handlers
      this.setupCollisions();
      
      // Store active state
      this.active = true;
      
      // Listen for scale changes
      this.scene.events.on('scale-changed', this.onScaleChanged, this);
    }
    
    loadStyleFromCSS() {
      // Default NYT-style settings
      this.style = {
        color: this.colors.primary,
        trailAlpha: 0.6,
        lineWidth: 2,
        flashColor: this.colors.success,
        trailColor: this.colors.trail
      };
      
      try {
        // Get styles from CSS classes for customization
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
      const tempElement = document.createElement('div');
      tempElement.className = className;
      document.body.appendChild(tempElement);
      
      const style = window.getComputedStyle(tempElement);
      const result = {
        stroke: style.getPropertyValue('stroke'),
        'stroke-width': style.getPropertyValue('stroke-width'),
        'stroke-opacity': style.getPropertyValue('stroke-opacity'),
        fill: style.getPropertyValue('fill')
      };
      
      document.body.removeChild(tempElement);
      return result;
    }
    
    // Helper function to convert CSS color to hex
    cssColorToHex(color) {
      if (!color) return null;
      
      if (color.startsWith('#')) {
        return parseInt(color.substring(1), 16);
      }
      
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return (r << 16) + (g << 8) + b;
      }
      
      if (color.match(/^[a-z]+$/i)) {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        const hexColor = ctx.fillStyle;
        if (hexColor.startsWith('#')) {
          return parseInt(hexColor.substring(1), 16);
        }
      }
      
      return this.colors.primary;
    }
    
    update() {
      if (!this.active) return;
      
      // Update position based on physics body
      this.x = this.body.position.x;
      this.y = this.body.position.y;
      
      // Check boundaries and force reflection if needed
      this.checkBoundaries();
      
      // Add current position to points array for trail
      this.points.push({
        x: this.x,
        y: this.y,
        time: this.scene.time.now
      });
      
      // Limit points array length for performance
      if (this.points.length > this.maxPoints) {
        this.points.shift();
      }
      
      // Update laser trail with optimized rendering
      this.updateLaserBeam();
    }
    
    // Enhanced boundary checking with proper reflection
    checkBoundaries() {
      let bounds;
      if (this.scene.scalingManager) {
        bounds = this.scene.scalingManager.gameBounds;
      } else {
        bounds = {
          left: this.scene.leftBound,
          right: this.scene.rightBound,
          top: this.scene.topBound,
          bottom: this.scene.bottomBound
        };
      }
      
      let reflectionNeeded = false;
      let normal = { x: 0, y: 0 };
      
      const buffer = 2;
      
      // Check boundaries with proper normal calculation
      if (this.x < bounds.left + buffer) {
        reflectionNeeded = true;
        normal = { x: 1, y: 0 };
        this.x = bounds.left + buffer;
      } else if (this.x > bounds.right - buffer) {
        reflectionNeeded = true;
        normal = { x: -1, y: 0 };
        this.x = bounds.right - buffer;
      }
      
      if (this.y < bounds.top + buffer) {
        reflectionNeeded = true;
        normal = { x: 0, y: 1 };
        this.y = bounds.top + buffer;
      } else if (this.y > bounds.bottom - buffer) {
        reflectionNeeded = true;
        normal = { x: 0, y: -1 };
        this.y = bounds.bottom - buffer;
      }
      
      if (reflectionNeeded) {
        this.scene.matter.body.setPosition(this.body, {
          x: this.x,
          y: this.y
        });
        
        this.reflectWithNormal(normal);
        this.reflectionCount++;
        
        // Add visual feedback for reflection
        this.addReflectionEffect(this.x, this.y);
      }
    }
    
    updateLaserBeam() {
      if (this.points.length < 2) return;
      
      // Update main laser line
      const lastPoint = this.points[this.points.length - 1];
      const prevPoint = this.points[this.points.length - 2];
      
      this.line.setTo(prevPoint.x, prevPoint.y, lastPoint.x, lastPoint.y);
      
      // Create optimized trail
      this.updateTrail();
    }
    
    updateTrail() {
      // Remove old trail
      if (this.trail) {
        this.trail.destroy();
      }
      
      if (this.points.length < 3) return;
      
      // Create new trail graphics
      this.trail = this.scene.add.graphics();
      this.trail.setDepth(15);
      
      // Filter points for smoother trail
      const minDistance = this.scene.scalingManager ? 
                          this.scene.scalingManager.getScaledValue(3) : 3;
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
      
      // Draw smooth trail with gradient effect
      if (filteredPoints.length > 2) {
        const trailColor = this.style.trailColor || this.style.color;
        const lineWidth = this.scene.scalingManager ? 
                         this.scene.scalingManager.getScaledValue(1.5) : 1.5;
        
        // Draw trail with varying opacity
        for (let i = 1; i < filteredPoints.length; i++) {
          const alpha = (i / filteredPoints.length) * this.style.trailAlpha;
          const width = lineWidth * (i / filteredPoints.length);
          
          this.trail.lineStyle(width, trailColor, alpha);
          this.trail.beginPath();
          this.trail.moveTo(filteredPoints[i-1].x, filteredPoints[i-1].y);
          this.trail.lineTo(filteredPoints[i].x, filteredPoints[i].y);
          this.trail.strokePath();
        }
      }
    }
    
    setupCollisions() {
      this.scene.matter.world.on('collisionstart', (event) => {
        const pairs = event.pairs;
        
        for (const pair of pairs) {
          if ((pair.bodyA === this.body || pair.bodyB === this.body) && this.active) {
            const otherBody = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
            
            const collisionPoint = pair.collision.supports.length > 0 
              ? pair.collision.supports[0] 
              : { x: this.x, y: this.y };
            
            // Handle target collision
            if (otherBody.label === 'target') {
              console.log('Laser collision with target detected!');
              this.scene.onLaserHitTarget(this);
              return;
            }
            
            // Handle mirror collision
            if (otherBody.label === 'mirror') {
              const mirrors = this.scene.mirrors || 
                            (this.scene.levelManager && this.scene.levelManager.mirrors) || 
                            [];
              const mirror = mirrors.find(m => m.body === otherBody);
              
              if (mirror) {
                this.reflectOffCustomMirror(mirror, collisionPoint);
              } else {
                this.reflectWithNormal(pair.collision.normal);
              }
            } else {
              // Boundary collision
              this.reflectWithNormal(pair.collision.normal);
            }
            
            this.reflectionCount++;
          }
        }
      });
    }
    
    reflectWithNormal(normal) {
      // Normalize the normal vector
      const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      if (normalLength === 0) return;
      
      const normalizedNormal = {
        x: normal.x / normalLength,
        y: normal.y / normalLength
      };
      
      // Get current velocity
      const velocity = {
        x: this.body.velocity.x,
        y: this.body.velocity.y
      };
      
      // Calculate reflection: v' = v - 2(v·n)n
      const dotProduct = velocity.x * normalizedNormal.x + velocity.y * normalizedNormal.y;
      const reflectedVx = velocity.x - 2 * dotProduct * normalizedNormal.x;
      const reflectedVy = velocity.y - 2 * dotProduct * normalizedNormal.y;
      
      // Maintain constant speed
      const reflectedSpeed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
      
      if (reflectedSpeed === 0) return;
      
      const normalizedVx = reflectedVx / reflectedSpeed * this.speed;
      const normalizedVy = reflectedVy / reflectedSpeed * this.speed;
      
      // Apply new velocity
      this.scene.matter.body.setVelocity(this.body, {
        x: normalizedVx,
        y: normalizedVy
      });
      
      // Small displacement to prevent multiple reflections
      const displacementDistance = this.scene.scalingManager ? 
                                  this.scene.scalingManager.getScaledValue(4) : 4;
      const newX = this.x + normalizedVx * displacementDistance / this.speed;
      const newY = this.y + normalizedVy * displacementDistance / this.speed;
      
      this.scene.matter.body.setPosition(this.body, {
        x: newX,
        y: newY
      });
    }
    
    reflectOffCustomMirror(mirror, collisionPoint) {
      const normal = mirror.getNormal(collisionPoint);
      this.reflectWithNormal(normal);
      this.addCollisionFlash(collisionPoint.x, collisionPoint.y);
    }
    
    addCollisionFlash(x, y) {
      // Clean, minimal flash effect
      const flashSize = this.scene.scalingManager ? 
                       this.scene.scalingManager.getScaledValue(4) : 4;
      
      const flash = this.scene.add.circle(x, y, flashSize, this.style.flashColor, 0.8);
      flash.setDepth(25);
      
      // Smooth fade out animation
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 2.5,
        duration: 300,
        ease: 'Cubic.out',
        onComplete: () => flash.destroy()
      });
    }
    
    addReflectionEffect(x, y) {
      // Subtle effect for boundary reflections
      const effectSize = this.scene.scalingManager ? 
                        this.scene.scalingManager.getScaledValue(3) : 3;
      
      const effect = this.scene.add.circle(x, y, effectSize, this.style.color, 0.4);
      effect.setDepth(20);
      
      this.scene.tweens.add({
        targets: effect,
        alpha: 0,
        scale: 1.8,
        duration: 200,
        ease: 'Cubic.out',
        onComplete: () => effect.destroy()
      });
    }
    
    // Handle scale changes
    onScaleChanged(scaleData) {
      // Update speed based on new scale
      this.speed = scaleData.scaleFactor * this.baseSpeed;
      
      // Update max points for trail
      this.maxPoints = Math.max(30, Math.floor(60 * scaleData.responsiveScale));
      
      // Update line width
      const newLineWidth = scaleData.scaleFactor * this.style.lineWidth;
      this.line.setLineWidth(Math.max(1, newLineWidth));
    }
    
    destroy() {
      // Remove scale change listener
      this.scene.events.off('scale-changed', this.onScaleChanged, this);
      
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