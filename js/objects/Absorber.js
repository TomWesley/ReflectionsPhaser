class Absorber extends Phaser.Physics.Matter.Image {
    constructor(scene, x, y) {
      super(scene.matter.world, x, y, 'absorber');
      
      // Set up physics body
      this.setFriction(0);
      this.setFrictionAir(0);
      
      // Make it static (doesn't move when hit)
      this.setStatic(true);
      
      // Make draggable before game starts
      this.setInteractive({ draggable: true });
      
      // Set up collision sensors
      this.setSensor(true); // Allows objects to pass through while detecting collision
      
      // Collision settings
      this.setCollisionCategory(0x0004); // Category 3: absorbers
      
      // Add to scene
      scene.add.existing(this);
      
      // Setup for tracking absorbed lasers
      this.absorbedLasers = 0;
      
      // Track dragging state
      this.isDragging = false;
    }
    
    // Enable dragging (called from scene's dragstart handler)
    startDrag() {
      if (this.scene.isGameStarted) return; // Can't drag once game started
      this.isDragging = true;
      this.setTint(0xffaaaa); // Visual feedback when dragging
    }
    
    // Disable dragging (called from scene's dragend handler)
    stopDrag() {
      if (this.scene.isGameStarted) return;
      this.isDragging = false;
      this.clearTint();
      
      // Optional: Snap to grid
      this.x = Math.round(this.x / 10) * 10;
      this.y = Math.round(this.y / 10) * 10;
    }
    
    // Called when a laser is absorbed
    absorbLaser() {
      this.absorbedLasers++;
      
      // Visual feedback
      this.scene.tweens.add({
        targets: this,
        scale: { from: 1.2, to: 1 },
        duration: 200,
        ease: 'Cubic.out'
      });
      
      // Particle effect (optional)
      this.createAbsorptionEffect();
    }
    
    createAbsorptionEffect() {
      // Create a simple particle effect when absorbing a laser
      const particles = this.scene.add.particles('laser');
      
      const emitter = particles.createEmitter({
        speed: 100,
        scale: { start: 0.2, end: 0 },
        blendMode: 'ADD',
        lifespan: 300
      });
      
      // Emit particles at absorber position
      emitter.explode(20, this.x, this.y);
      
      // Destroy the particle system after a short time
      this.scene.time.delayedCall(500, () => {
        particles.destroy();
      });
    }
    
    // Lock the absorber once the game starts
    lock() {
      this.disableInteractive();
    }
  }