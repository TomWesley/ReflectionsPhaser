class Target {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    
    // Target size - increased for better hit detection
    const size = Math.min(scene.cameras.main.height, scene.cameras.main.width) * 0.08;
    
    // Create visual representation (a circle)
    this.graphics = scene.add.circle(x, y, size/2, 0x00ff00, 0.6)
      .setStrokeStyle(2, 0x00ff00);
    
    // Create physics body with larger collision radius
    this.body = scene.matter.add.circle(x, y, size, { // Using larger radius for collision
      isSensor: true, // Make it a sensor so it doesn't affect physics
      isStatic: true, // Don't move when hit
      label: 'target',
      collisionFilter: {
        category: 0x0004, // Category 3: target
        mask: 0x0001 // Only collide with lasers (category 1)
      }
    });
    
    // Associate this object with the body for collision reference
    this.body.gameObject = this;
    
    // Play a pulsing animation for visibility
    scene.tweens.add({
      targets: this.graphics,
      alpha: 0.8,
      scale: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }
  
  // Called when a laser hits the target
  onHit() {
    // Visual feedback
    this.scene.tweens.add({
      targets: this.graphics,
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
    // Add a simple particle effect when the target is hit
    const particles = this.scene.add.particles('laser');
    
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
  }
}