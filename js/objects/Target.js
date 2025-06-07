// Custom Target class with NYT-style design
class Target {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    
    // NYT-style color palette
    this.colors = {
      primary: 0x1a1a1a,
      secondary: 0x6c757d,
      success: 0x4ade80,
      surface: 0xffffff,
      accent: 0x121212,
      warning: 0xf59e0b,
      border: 0xe5e7eb
    };
    
    // Load appearance settings from CSS variables if available
    this.loadStyleFromCSS();
    
    // Create the physics body first to define the exact hitbox size
    this.createPhysicsBody();
    
    // Then create visual representation exactly matching the physics body
    this.createVisual();
    
    // Start subtle pulse animation
    this.startPulseAnimation();
    
    // Listen for scale changes
    this.scene.events.on('scale-changed', this.onScaleChanged, this);
  }
  
  // Load style settings from CSS classes
  loadStyleFromCSS() {
    // Default NYT-style settings
    this.style = {
      color: this.colors.primary,
      alpha: 0.9,
      strokeWidth: 2,
      pulseColor: this.colors.accent,
      hitEffectColor: this.colors.success,
      size: 0.06 // Target size as proportion of game size
    };
    
    try {
      // Get styles from CSS classes for customization
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
    const tempElement = document.createElement('div');
    tempElement.className = className;
    document.body.appendChild(tempElement);
    
    const style = window.getComputedStyle(tempElement);
    const result = {
      stroke: style.getPropertyValue('stroke'),
      'stroke-width': style.getPropertyValue('stroke-width'),
      fill: style.getPropertyValue('fill'),
      'fill-opacity': style.getPropertyValue('fill-opacity')
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
  
  createPhysicsBody() {
    // Get target size from scaling manager
    if (this.scene.scalingManager) {
      this.visualSize = this.scene.scalingManager.elementSizes.target;
    } else {
      const gameSize = Math.min(this.scene.cameras.main.height, this.scene.cameras.main.width);
      this.visualSize = gameSize * this.style.size;
    }
    
    // The collision radius matches the visual size exactly
    this.collisionRadius = this.visualSize / 2;
    
    // Create physics body
    this.body = this.scene.matter.add.circle(this.x, this.y, this.collisionRadius, { 
      isSensor: true,
      isStatic: true,
      label: 'target',
      collisionFilter: {
        category: 0x0004,
        mask: 0x0001
      }
    });
    
    // Hide Matter.js rendering
    if (this.body) {
      this.body.render.visible = false;
    }
  }
  
  createVisual() {
    // Create graphics container for the target
    this.graphics = this.scene.add.graphics();
    
    // Get scaled stroke width
    const strokeWidth = this.scene.scalingManager ? 
                       this.scene.scalingManager.getScaledValue(this.style.strokeWidth) :
                       this.style.strokeWidth;
    
    // Draw the main target circle - modern minimalist design
    this.graphics.fillStyle(this.style.color, this.style.alpha);
    this.graphics.fillCircle(this.x, this.y, this.collisionRadius);
    
    // Draw clean outline
    this.graphics.lineStyle(strokeWidth, this.style.color, 1);
    this.graphics.strokeCircle(this.x, this.y, this.collisionRadius);
    
    // Add concentric circles for classic target look
    const innerRadius1 = this.collisionRadius * 0.7;
    const innerRadius2 = this.collisionRadius * 0.4;
    const centerRadius = this.collisionRadius * 0.15;
    
    // Outer ring
    this.graphics.lineStyle(Math.max(1, strokeWidth * 0.5), this.style.color, 0.6);
    this.graphics.strokeCircle(this.x, this.y, innerRadius1);
    
    // Inner ring
    this.graphics.strokeCircle(this.x, this.y, innerRadius2);
    
    // Center dot
    this.graphics.fillStyle(this.style.color, 1);
    this.graphics.fillCircle(this.x, this.y, centerRadius);
    
    // Set appropriate depth
    this.graphics.setDepth(10);
  }
  
  startPulseAnimation() {
    // Create a subtle pulse effect container
    this.pulseContainer = this.scene.add.container(this.x, this.y);
    this.pulseContainer.setDepth(5); // Behind the main target
    
    // Create pulse circle with NYT-style subtle animation
    const pulseCircle = this.scene.add.circle(0, 0, this.collisionRadius, this.style.pulseColor, 0.15);
    this.pulseContainer.add(pulseCircle);
    
    // Gentle, modern pulse animation
    this.pulseAnimation = this.scene.tweens.add({
      targets: pulseCircle,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.05,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }
  
  // Called when a laser hits the target
  onHit() {
    // Stop the pulse animation
    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
    }
    
    // Success visual feedback - clean and modern
    this.scene.tweens.add({
      targets: this.graphics,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Back.out',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // Change color to success color
        this.updateVisualForSuccess();
      }
    });
    
    // Create clean hit effect
    this.createHitEffect();
    
    // Hide pulse container
    if (this.pulseContainer) {
      this.scene.tweens.add({
        targets: this.pulseContainer,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.out'
      });
    }
  }
  
  updateVisualForSuccess() {
    // Redraw target with success color
    this.graphics.clear();
    
    const strokeWidth = this.scene.scalingManager ? 
                       this.scene.scalingManager.getScaledValue(this.style.strokeWidth) :
                       this.style.strokeWidth;
    
    // Draw with success color
    this.graphics.fillStyle(this.style.hitEffectColor, this.style.alpha);
    this.graphics.fillCircle(this.x, this.y, this.collisionRadius);
    
    this.graphics.lineStyle(strokeWidth, this.style.hitEffectColor, 1);
    this.graphics.strokeCircle(this.x, this.y, this.collisionRadius);
    
    // Concentric circles with success color
    const innerRadius1 = this.collisionRadius * 0.7;
    const innerRadius2 = this.collisionRadius * 0.4;
    const centerRadius = this.collisionRadius * 0.15;
    
    this.graphics.lineStyle(Math.max(1, strokeWidth * 0.5), this.style.hitEffectColor, 0.8);
    this.graphics.strokeCircle(this.x, this.y, innerRadius1);
    this.graphics.strokeCircle(this.x, this.y, innerRadius2);
    
    this.graphics.fillStyle(this.style.hitEffectColor, 1);
    this.graphics.fillCircle(this.x, this.y, centerRadius);
  }
  
  createHitEffect() {
    // Clean, modern particle effect
    const particleCount = 12;
    const baseRadius = this.collisionRadius * 1.5;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = baseRadius + Math.random() * this.collisionRadius;
      
      const startX = this.x + Math.cos(angle) * this.collisionRadius;
      const startY = this.y + Math.sin(angle) * this.collisionRadius;
      const endX = this.x + Math.cos(angle) * distance;
      const endY = this.y + Math.sin(angle) * distance;
      
      // Create particle as small circle
      const particleSize = this.scene.scalingManager ? 
                          this.scene.scalingManager.getScaledValue(3) : 3;
      
      const particle = this.scene.add.circle(startX, startY, particleSize, this.style.hitEffectColor, 0.8);
      particle.setDepth(15);
      
      // Animate particle outward
      this.scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        ease: 'Cubic.out',
        onComplete: () => particle.destroy()
      });
    }
    
    // Add central burst effect
    const burstSize = this.collisionRadius * 2;
    const burst = this.scene.add.circle(this.x, this.y, burstSize, this.style.hitEffectColor, 0.3);
    burst.setDepth(12);
    
    this.scene.tweens.add({
      targets: burst,
      scale: 2,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.out',
      onComplete: () => burst.destroy()
    });
  }
  
  // Handle scale changes
  onScaleChanged(scaleData) {
    this.updateScale();
  }
  
  updateScale() {
    // Store current state
    const wasHit = this.graphics && this.graphics.fillColor === this.style.hitEffectColor;
    
    // Remove old physics body
    if (this.body && this.scene.matter.world) {
      this.scene.matter.world.remove(this.body);
      this.body = null;
    }
    
    // Recreate physics body with new scale
    this.createPhysicsBody();
    
    // Clear and recreate visual
    if (this.graphics) {
      this.graphics.clear();
    }
    
    if (wasHit) {
      this.updateVisualForSuccess();
    } else {
      this.createVisual();
    }
    
    // Update pulse container position and scale
    if (this.pulseContainer) {
      this.pulseContainer.setPosition(this.x, this.y);
      
      // Update pulse circle scale
      const pulseCircle = this.pulseContainer.getAt(0);
      if (pulseCircle) {
        const newRadius = this.collisionRadius;
        pulseCircle.setRadius(newRadius);
      }
    }
  }
  
  destroy() {
    // Remove scale change listener
    this.scene.events.off('scale-changed', this.onScaleChanged, this);
    
    // Stop animations
    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
      this.pulseAnimation = null;
    }
    
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