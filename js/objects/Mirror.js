class Mirror extends Phaser.Physics.Matter.Image {
    constructor(scene, x, y, type) {
      super(scene.matter.world, x, y, `mirror${type}`);
      
      // Set the mirror scale
      this.setScale(0.58);
      
      // Physics properties
      this.setFriction(0);
      this.setFrictionAir(0);
      this.setBounce(1); // Perfect bounce
      this.setMass(Infinity); // Infinite mass to prevent movement when lasers collide
      
      // Make mirror draggable before game starts
      this.setInteractive({ draggable: true });
      
      // Set static physics body
      this.setStatic(true);
      
      // Create a polygon shape that follows the exact edges of the sprite
      // The shape points will depend on the mirror type
      this.createExactHitbox(type);
      
      // Set collision category and group for collision filtering
      this.setCollisionCategory(0x0002); // Category 2: mirrors
      this.setCollidesWith(0x0001); // Only collide with lasers
      
      // Add to scene
      scene.add.existing(this);
      
      // Store type for reference
      this.mirrorType = type;
      
      // Track dragging state
      this.isDragging = false;
      
      // Add visual feedback on hover
      this.on('pointerover', () => {
        if (!scene.isGameStarted) {
          this.setTint(0x88aaff);
        }
      });
      
      this.on('pointerout', () => {
        if (!scene.isGameStarted && !this.isDragging) {
          this.clearTint();
        }
      });
    }
    
    // Create a precise hitbox that matches the sprite's visible edges
    createExactHitbox(type) {
      // Get the dimensions of the sprite after scaling
      const width = this.width * this.scaleX;
      const height = this.height * this.scaleY;
      
      // For all mirror types, create a thin rectangle that matches the sprite's visible line
      // We'll create a custom shape depending on the mirror type
      
      // Remove the existing physics body
      if (this.body) {
        this.scene.matter.world.remove(this.body);
      }
      
      let vertices;
      const thickness = 4; // Thin thickness for the mirror collision
      
      // Define vertices based on mirror type
      switch (type) {
        case 1: // Forward slash (/)
          vertices = [
            { x: -width/2 + thickness, y: height/2 }, // Bottom left
            { x: -width/2, y: height/2 - thickness }, // Bottom left inner
            { x: width/2 - thickness, y: -height/2 }, // Top right inner
            { x: width/2, y: -height/2 + thickness }  // Top right
          ];
          break;
        
        case 2: // Backslash (\)
          vertices = [
            { x: -width/2, y: -height/2 + thickness }, // Top left
            { x: -width/2 + thickness, y: -height/2 }, // Top left inner
            { x: width/2, y: height/2 - thickness },   // Bottom right inner
            { x: width/2 - thickness, y: height/2 }    // Bottom right
          ];
          break;
        
        case 3: // Horizontal (-)
          vertices = [
            { x: -width/2, y: -thickness/2 }, // Left middle
            { x: width/2, y: -thickness/2 },  // Right middle
            { x: width/2, y: thickness/2 },   // Right middle inner
            { x: -width/2, y: thickness/2 }   // Left middle inner
          ];
          break;
        
        case 4: // Vertical (|)
          vertices = [
            { x: -thickness/2, y: -height/2 }, // Top middle
            { x: thickness/2, y: -height/2 },  // Top middle inner
            { x: thickness/2, y: height/2 },   // Bottom middle inner
            { x: -thickness/2, y: height/2 }   // Bottom middle
          ];
          break;
        
        default: // Fallback to a rectangle
          vertices = [
            { x: -width/2, y: -thickness/2 },
            { x: width/2, y: -thickness/2 },
            { x: width/2, y: thickness/2 },
            { x: -width/2, y: thickness/2 }
          ];
      }
      
      // Create the physics body with the custom shape
      this.setBody({
        type: 'fromVerts',
        verts: vertices,
        flagInternal: true
      });
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