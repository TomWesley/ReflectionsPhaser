// Custom Target class that uses drawn graphics directly matching its hitbox
class Target {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    
    // Load appearance settings from CSS variables if available
    this.loadStyleFromCSS();
    
    // Create the physics body first to define the exact hitbox size
    this.createPhysicsBody();
    
    // Then create visual representation exactly matching the physics body
    this.createVisual();
    
    // Start pulsing animation
    this.startPulseAnimation();
  }
  
  // Load style settings from CSS classes
  loadStyleFromCSS() {
    // Default style settings
    this.style = {
      color: 0x00ff00,            // Green by default
      alpha: 0.6,                 // Semi-transparent
      strokeWidth: 2,             // Outline thickness
      pulseColor: 0x00ff00,       // Color of pulse animation
      hitEffectColor: 0xffffff,   // Color of hit particle effect
      size: 0.08                  // Target size as proportion of game size
    };
    
    try {
      // Get styles from CSS classes
      const targetStyle = this.getComputedStyleForClass('target');
      const targetPulseStyle = this.getComputedStyleForClass('target-pulse');
      const targetHitStyle = this.getComputedStyleForClass('target-hit');
      
      // Apply basic target styles
      if (targetStyle) {
        if (targetStyle.fill) {
          this.style.color = this.cssColorToHex(targetStyle.fill);
        }
        if (targetStyle['fill-opacity']) {
          this.style.alpha = parseFloat(targetStyle['fill-opacity']);
        }
        if (targetStyle['stroke-width']) {
          this.style.strokeWidth = parseInt(targetStyle['stroke-width']);
        }
      }
      
      // Apply pulse styles
      if (targetPulseStyle && targetPulseStyle.fill) {
        this.style.pulseColor = this.cssColorToHex(targetPulseStyle.fill);
      }
      
      // Apply hit effect styles
      if (targetHitStyle && targetHitStyle.fill) {
        this.style.hitEffectColor = this.cssColorToHex(targetHitStyle.fill);
      }
    } catch (e) {
      console.warn('Could not load target styles from CSS, using defaults.', e);
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
      fill: style.getPropertyValue('fill'),
      'fill-opacity': style.getPropertyValue('fill-opacity')
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
    return 0x00ff00; // Green
  }
  
  createPhysicsBody() {
    // Get target size from scaling manager if available
    if (this.scene.scalingManager) {
      this.visualSize = this.scene.scalingManager.elementSizes.target;
    } else {
      // Fallback calculation
      const gameSize = Math.min(this.scene.cameras.main.height, this.scene.cameras.main.width);
      this.visualSize = gameSize * this.style.size;
    }
    
    // The collision radius is the EXACT same as the visual size 
    // to ensure perfect matching of hitbox and visual
    this.collisionRadius = this.visualSize / 2;
    
    // Create physics body
    this.body = this.scene.matter.add.circle(this.x, this.y, this.collisionRadius, { 
      isSensor: true, // Make it a sensor so it doesn't affect physics
      isStatic: true, // Don't move when hit
      label: 'target',
      collisionFilter: {
        category: 0x0004, // Category 3: target
        mask: 0x0001 // Only collide with lasers (category 1)
      }
    });
  }
  
  createVisual() {
    // Create graphics object for the target - EXACTLY matching the hitbox
    this.graphics = this.scene.add.graphics();
    
    // Get scaled stroke width
    const strokeWidth = this.scene.scalingManager ? 
                       this.scene.scalingManager.getScaledValue(this.style.strokeWidth) :
                       this.style.strokeWidth;
    
    // Draw the target circle matching the physics body
    this.graphics.fillStyle(this.style.color, this.style.alpha);
    this.graphics.fillCircle(this.x, this.y, this.collisionRadius);
    
    // Draw the outline
    this.graphics.lineStyle(strokeWidth, this.style.color, 1);
    this.graphics.strokeCircle(this.x, this.y, this.collisionRadius);
    
    // Add inner circle for visual interest
    this.graphics.lineStyle(strokeWidth * 0.5, this.style.color, 0.8);
    this.graphics.strokeCircle(this.x, this.y, this.collisionRadius * 0.7);
    
    // Add a dot in the center
    this.graphics.fillStyle(this.style.color, 1);
    this.graphics.fillCircle(this.x, this.y, this.collisionRadius * 0.2);
  }
  
  startPulseAnimation() {
    // Create a container for the pulse effect
    this.pulseContainer = this.scene.add.container(this.x, this.y);
    
    // Create a circle for pulsing - matching the collision radius
    const pulseCircle = this.scene.add.circle(0, 0, this.collisionRadius, this.style.pulseColor, 0.4);
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
    const particles = this.scene.add.particles('particle');
    
    // Use a custom particle if 'particle' texture doesn't exist
    if (!particles.texture || !particles.texture.key) {
      // Clean up failed particles
      particles.destroy();
      
      // Create explosion effect with graphics instead
      const explosionGraphics = this.scene.add.graphics();
      explosionGraphics.fillStyle(this.style.hitEffectColor, 1);
      
      // Draw bursting circles
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.visualSize;
        const size = Math.random() * 5 + 2;
        
        // Scale the size if scaling manager is available
        const scaledSize = this.scene.scalingManager ? 
                          this.scene.scalingManager.getScaledValue(size) : size;
        
        const x = this.x + Math.cos(angle) * distance;
        const y = this.y + Math.sin(angle) * distance;
        
        explosionGraphics.fillCircle(x, y, scaledSize);
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
      lifespan: 800,
      tint: this.style.hitEffectColor
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
  }
  
  setAlpha(alpha) {
    // Update the graphics alpha
    if (this.graphics) {
      this.graphics.alpha = alpha;
    }
    
    // Update the pulse container alpha
    if (this.pulseContainer) {
      this.pulseContainer.alpha = alpha;
    }
    
    return this;
  }
}