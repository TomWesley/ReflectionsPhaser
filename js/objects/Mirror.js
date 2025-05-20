class Mirror extends Phaser.Physics.Matter.Image {
    constructor(scene, x, y, type) {
      super(scene.matter.world, x, y, `mirror${type}`);
      
      // Make mirrors 3 times bigger than the previous size
      this.setScale(0.58); // Increased from 0.06 (0.06 * 3 = 0.18)
      
      // Set up physics body
      this.setFriction(0);
      this.setFrictionAir(0);
      this.setBounce(1); // Perfect bounce
      this.setMass(Infinity); // Infinite mass to prevent movement when lasers collide
      
      // Make mirror draggable before game starts
      this.setInteractive({ draggable: true });
      
      // Set static physics body
      this.setStatic(true);
      
      // Set collision category and group for collision filtering
      this.setCollisionCategory(0x0002); // Category 2: mirrors
      this.setCollidesWith(0x0001); // Only collide with lasers
      
      // Add to scene
      scene.add.existing(this);
      
      // Store type for reference
      this.mirrorType = type;
      
      // Track dragging state
      this.isDragging = false;
    }
    
    // Enable dragging (called from scene's dragstart handler)
    startDrag() {
      if (this.scene.isGameStarted) return; // Can't drag once game started
      this.isDragging = true;
      this.setStatic(false);
      this.setTint(0xaaaaff); // Visual feedback when dragging
    }
    
    // Disable dragging (called from scene's dragend handler)
    stopDrag() {
      if (this.scene.isGameStarted) return;
      this.isDragging = false;
      this.setStatic(true);
      this.clearTint();
      
      // Optional: Snap to grid
      this.x = Math.round(this.x / 10) * 10;
      this.y = Math.round(this.y / 10) * 10;
    }
    
    // Get the normal vector of this mirror for reflection calculations
    getNormal() {
      // Calculate the normal based on the mirror's rotation
      // This is perpendicular to the mirror's surface
      const angleRadians = this.rotation;
      const normalVector = new Phaser.Math.Vector2(
        Math.cos(angleRadians + Math.PI/2),
        Math.sin(angleRadians + Math.PI/2)
      );
      return normalVector.normalize();
    }
    
    // Lock the mirror once the game starts
    lock() {
      this.disableInteractive();
      this.setStatic(true);
    }
}