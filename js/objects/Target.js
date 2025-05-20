// Custom Target class that uses drawn graphics for consistent hitbox
class Target {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    
    // Load appearance settings from CSS variables if available
    this.loadStyleFromCSS();
    
    // Create the visual representation
    this.createVisual();
    
    // Create the physics body
    this.createPhysicsBody();
    
    // Start pulsing animation
    this.startPulseAnimation();
  }
  
  // Load style settings from CSS variables if available
  loadStyleFromCSS() {
    // Default style settings - used if CSS variables not available
    this.style = {
      color: 0x00ff00,   // Green by default
      alpha: 0.6,        // Semi-transparent
      strokeWidth: 2,    // Outline thickness
      hitboxSize: 0.4    // Physics hitbox size as proportion of visual size (40%)
    };
    
    // Try to get style from CSS variables
    try {
      // Get CSS variables from :root or html element
      const computedStyle = getComputedStyle(document.documentElement);
      
      // Helper function to convert CSS color to hex
      const cssColorToHex = (color) => {
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
        
        return null;
      };
      
      // Get CSS variables with fallbacks
      const getVar = (name, defaultValue) => {
        const value = computedStyle.getPropertyValue(name).trim();
        return value ? value : defaultValue;
      };
      
      // Update style settings from CSS if available
      const targetColor = getVar('--target-color', null);
      if (targetColor) {
        this.style.color = cssColorToHex(targetColor) || this.style.color;
      }
      
      const targetAlpha = getVar('--target-alpha', null);
      if (targetAlpha) {
        this.style.alpha = parseFloat(targetAlpha) || this.style.alpha;
      }
    } catch (e) {
      console.warn('Could not load target styles from CSS, using defaults.', e);
    }
  }
  
  createVisual() {
    // Target size based on game dimensions
    const visualSize = Math.min(this.scene.cameras.main.height, this.scene.cameras.main.width) * 0.08;
    this.visualSize = visualSize;
    
    // Create graphics object for the target
    this.graphics = this.scene.add.graphics();
    
    // Draw the target (a circle with stroke)
    this.graphics.fillStyle(this.style.color, this.style.alpha);
    this.graphics.fillCircle(this.x, this.y, visualSize/2);
    
    this.graphics.lineStyle(this.style.strokeWidth, this.style.color, 1);
    this.graphics.strokeCircle(this.x, this.y, visualSize/2);
    
    // Add inner circle for visual interest
    this.graphics.lineStyle(1, this.style.color, 0.8);
    this.graphics.strokeCircle(this.x, this.y, visualSize/3);
    
    // Add a dot in the center
    this.graphics.fillStyle(this.style.color, 1);
    this.graphics.fillCircle(this.x, this.y, visualSize/10);
  }
  
  createPhysicsBody() {
    // Create physics body with more precise collision radius
    // Make the collision radius smaller than the visual size for better precision
    const collisionRadius = this.visualSize * this.style.hitboxSize; // 40% of visual size for tighter collision
    
    this.body = this.scene.matter.add.circle(this.x, this.y, collisionRadius, { 
      isSensor: true, // Make it a sensor so it doesn't affect physics
      isStatic: true, // Don't move when hit
      label: 'target', // Use label to identify in collisions
      collisionFilter: {
        category: 0x0004, // Category 3: target
        mask: 0x0001 // Only collide with lasers (category 1)
      }
    });
    
    // Important: Don't set gameObject property on the body
    // This causes issues with Phaser's event system
    
    // Create debug visualization of the hitbox if debug is enabled
    if (this.scene.matter.world.debugGraphic) {
      this.debugGraphics = this.scene.add.graphics({ lineStyle: { width: 1, color: 0xff00ff } });
      this.debugGraphics.strokeCircle(this.x, this.y, collisionRadius);
    }
  }
  
  startPulseAnimation() {
    // Create a container for the pulse effect
    this.pulseContainer = this.scene.add.container(this.x, this.y);
    
    // Create a circle for pulsing
    const pulseCircle = this.scene.add.circle(0, 0, this.visualSize/2, this.style.color, 0.4);
    this.pulseContainer.add(pulseCircle);
    
    // Add the pulse animation
    this.scene.tweens.add({
      targets: pulseCircle,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }
  
  // Called when a laser hits the target
  onHit() {
    // Stop the pulse animation
    this.scene.tweens.killTweensOf(this.pulseContainer.getAt(0));
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this.pulseContainer,
      alpha: 1,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      yoyo: true,
      repeat: 2
    });
    
    // Create a particle effect
    this.createHitEffect();
  }
  
  createHitEffect() {
    // Add a particle effect when the target is hit
    const particles = this.scene.add.particles('laser');
    
    // If 'laser' image is not available, use a basic circle
    if (!particles.texture.key) {
      console.warn("Laser texture not found, using fallback for particles");
      // Clean up failed particles
      particles.destroy();
      
      // Create explosion effect with graphics instead
      const explosionGraphics = this.scene.add.graphics();
      explosionGraphics.fillStyle(this.style.color, 1);
      
      // Draw bursting circles
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.visualSize;
        const size = Math.random() * 5 + 2;
        
        const x = this.x + Math.cos(angle) * distance;
        const y = this.y + Math.sin(angle) * distance;
        
        explosionGraphics.fillCircle(x, y, size);
      }
      
      // Fade out and remove
      this.scene.tweens.add({
        targets: explosionGraphics,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          explosionGraphics.destroy();
        }
      });
      
      return;
    }
    
    // Standard particle effect
    const emitter = particles.createEmitter({
      x: this.x,
      y: this.y,
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      blendMode: 'ADD',
      lifespan: 800
    });
    
    // Emit particles once
    emitter.explode(20, this.x, this.y);
    
    // Destroy the particle system after a short time
    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }
  
  destroy() {
    // Remove physics body
    if (this.body && this.scene.matter.world) {
      this.scene.matter.world.remove(this.body);
    }
    
    // Remove graphics
    if (this.graphics) {
      this.graphics.destroy();
    }
    
    // Remove pulse container
    if (this.pulseContainer) {
      this.pulseContainer.destroy();
    }
    
    // Remove debug graphics if they exist
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }
  }
}