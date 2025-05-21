// Custom Mirror class with shapes drawn directly from physics body
class Mirror {
    constructor(scene, x, y, shapeType = null) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        
        // Store the requested shape type if provided
        this.requestedShapeType = shapeType;
        
        // Load appearance settings from CSS classes
        this.loadStyleFromCSS();
        
        // Create the physics body for the requested shape
        this.createPhysicsBody();
        
        // Apply a random rotation to make the mirror more interesting
        if (this.body) {
          // Random rotation angle in radians
          const randomAngle = Math.random() * Math.PI * 2;
          this.scene.matter.body.setAngle(this.body, randomAngle);
        }
        
        // Create the graphics object for drawing
        this.graphics = scene.add.graphics();
        
        // Draw the mirror based on physics body
        this.drawFromPhysics();
        
        // Setup interactivity after drawing
        this.makeInteractive();
        
        // Track state
        this.isDragging = false;
        this.isLocked = false;
      }
    
    // Load style settings from CSS classes
    loadStyleFromCSS() {
      // Default style settings
      this.style = {
        strokeColor: 0x00ff00,     // Green outline
        strokeWidth: 2,            // Line thickness
        fillColor: 0x000000,       // Black fill
        fillAlpha: 0.3,            // Transparency for fill
        hoverStrokeColor: 0x44aaff, // Blue outline when hovering
        dragStrokeColor: 0xaaaaff,  // Light blue when dragging
        lockedStrokeColor: 0x999999 // Gray when locked (game started)
      };
      
      try {
        // Get styles from CSS classes
        const mirrorStyle = this.getComputedStyleForClass('mirror');
        const mirrorHoverStyle = this.getComputedStyleForClass('mirror-hover');
        const mirrorDragStyle = this.getComputedStyleForClass('mirror-drag');
        const mirrorLockedStyle = this.getComputedStyleForClass('mirror-locked');
        
        // Apply basic mirror styles
        if (mirrorStyle) {
          if (mirrorStyle.stroke) {
            this.style.strokeColor = this.cssColorToHex(mirrorStyle.stroke);
          }
          if (mirrorStyle['stroke-width']) {
            this.style.strokeWidth = parseInt(mirrorStyle['stroke-width']);
          }
          if (mirrorStyle.fill) {
            this.style.fillColor = this.cssColorToHex(mirrorStyle.fill);
          }
          if (mirrorStyle['fill-opacity']) {
            this.style.fillAlpha = parseFloat(mirrorStyle['fill-opacity']);
          }
        }
        
        // Apply hover styles
        if (mirrorHoverStyle && mirrorHoverStyle.stroke) {
          this.style.hoverStrokeColor = this.cssColorToHex(mirrorHoverStyle.stroke);
        }
        
        // Apply drag styles
        if (mirrorDragStyle && mirrorDragStyle.stroke) {
          this.style.dragStrokeColor = this.cssColorToHex(mirrorDragStyle.stroke);
        }
        
        // Apply locked styles
        if (mirrorLockedStyle && mirrorLockedStyle.stroke) {
          this.style.lockedStrokeColor = this.cssColorToHex(mirrorLockedStyle.stroke);
        }
      } catch (e) {
        console.warn('Could not load mirror styles from CSS, using defaults.', e);
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
      
      // For named colors
      if (color.match(/^[a-z]+$/i)) {
        try {
          const ctx = document.createElement('canvas').getContext('2d');
          ctx.fillStyle = color;
          const hexColor = ctx.fillStyle;
          if (hexColor.startsWith('#')) {
            return parseInt(hexColor.substring(1), 16);
          }
        } catch (e) {
          // If canvas method fails, fall back to default
        }
      }
      
      // Default fallback
      return 0x00ff00; // Green
    }
    
    createPhysicsBody() {
        // Min and max size for the shape
        const minSize = 70;
        const maxSize = 150;
        
        // Random size for this mirror
        const size = Phaser.Math.Between(minSize, maxSize);
        
        // Choose a random shape type from the specified options, or use requested type
        const shapeTypes = [
          'rightTriangle',
          'isoscelesTriangle',
          'rectangle',
          'trapezoid',
          'semicircle',
          
        ];
        
        // Use the requested shape type if provided, otherwise pick randomly
        this.shapeType = this.requestedShapeType || Phaser.Utils.Array.GetRandom(shapeTypes);
        
        // Debug log the selected shape type
        console.log(`Creating mirror with shape type: ${this.shapeType}`);
        
        // Generate vertices based on the chosen shape type
        let verts = [];
        
        switch (this.shapeType) {
          case 'rightTriangle':
            verts = this.createRightTriangle(size);
            break;
          case 'isoscelesTriangle':
            verts = this.createIsoscelesTriangle(size);
            break;
          case 'rectangle':
            verts = this.createRectangle(size);
            break;
          case 'trapezoid':
            verts = this.createTrapezoid(size);
            break;
          case 'semicircle':
            verts = this.createSemicircle(size);
            break;
          
          default:
            // Fallback to rectangle if the shape type is unknown
            console.warn(`Unknown shape type: ${this.shapeType}, falling back to rectangle`);
            this.shapeType = 'rectangle';
            verts = this.createRectangle(size);
        }
        
        // Debug log the vertex count
        console.log(`Shape ${this.shapeType} has ${verts.length} vertices`);
        
        try {
          // Create the physics body
          this.body = this.scene.matter.add.fromVertices(
            this.x, this.y,
            verts,
            {
              isStatic: true,
              label: 'mirror',
              friction: 0,
              frictionAir: 0,
              restitution: 1, // Perfect bounce
              collisionFilter: {
                category: 0x0002, // Category 2: mirrors
                mask: 0x0001 // Only collide with lasers
              }
            }
          );
          
          // Check if the body was created successfully
          if (!this.body) {
            console.error(`Failed to create body for ${this.shapeType}, falling back to rectangle`);
            this.shapeType = 'rectangle';
            verts = this.createRectangle(size);
            this.body = this.scene.matter.add.fromVertices(this.x, this.y, verts, {
              isStatic: true,
              label: 'mirror',
              friction: 0,
              frictionAir: 0,
              restitution: 1,
              collisionFilter: {
                category: 0x0002,
                mask: 0x0001
              }
            });
          }
        } catch (e) {
          console.error(`Error creating physics body for ${this.shapeType}:`, e);
          // Fallback to a simple rectangle if there's an error
          this.shapeType = 'rectangle';
          verts = this.createRectangle(size);
          try {
            this.body = this.scene.matter.add.fromVertices(this.x, this.y, verts, {
              isStatic: true,
              label: 'mirror',
              friction: 0,
              frictionAir: 0,
              restitution: 1,
              collisionFilter: {
                category: 0x0002,
                mask: 0x0001
              }
            });
          } catch (fallbackError) {
            console.error('Even rectangle fallback failed, using basic rectangle:', fallbackError);
            this.body = this.scene.matter.add.rectangle(this.x, this.y, size, size, {
              isStatic: true,
              label: 'mirror',
              friction: 0,
              frictionAir: 0,
              restitution: 1,
              collisionFilter: {
                category: 0x0002,
                mask: 0x0001
              }
            });
          }
        }
      }
      
      // Generate a right triangle with a 90-degree angle
      createRightTriangle(size) {
        // Basic right triangle
        return [
          { x: -size/2, y: -size/2 }, // Top left
          { x: size/2, y: -size/2 },  // Top right
          { x: -size/2, y: size/2 }   // Bottom left (forms the right angle)
        ];
      }
      
      // Generate an isosceles triangle (two equal sides)
      createIsoscelesTriangle(size) {
        return [
          { x: 0, y: -size/2 },         // Top
          { x: -size/2, y: size/2 },    // Bottom left
          { x: size/2, y: size/2 }      // Bottom right
        ];
      }
      
      // Generate a rectangle (might be a square if height is similar to width)
      createRectangle(size) {
        // Determine if it should be a square (25% chance)
        const isSquare = Math.random() < 0.25;
        
        // For non-square rectangles, use a random height
        const height = isSquare ? size : Phaser.Math.Between(size * 0.5, size * 1.5);
        const width = size;
        
        return [
          { x: -width/2, y: -height/2 }, // Top left
          { x: width/2, y: -height/2 },  // Top right
          { x: width/2, y: height/2 },   // Bottom right
          { x: -width/2, y: height/2 }   // Bottom left
        ];
      }
      
      // Generate a symmetrical trapezoid
      createTrapezoid(size) {
        // Top width is smaller than bottom width
        const topWidth = size * Phaser.Math.FloatBetween(0.4, 0.7);
        const bottomWidth = size;
        const height = size * Phaser.Math.FloatBetween(0.8, 1.2);
        
        return [
          { x: -topWidth/2, y: -height/2 },    // Top left
          { x: topWidth/2, y: -height/2 },     // Top right
          { x: bottomWidth/2, y: height/2 },   // Bottom right
          { x: -bottomWidth/2, y: height/2 }   // Bottom left
        ];
      }
      
      // Generate a semicircle (approximated with vertices)
      createSemicircle(size) {
        // A semicircle needs to be simplified for Matter.js to handle it properly
        // We'll use a polygon approximation with fewer points
        const points = [];
        const segments = 8; // Fewer segments for better physics compatibility
        
        // Add the center point at the bottom
        points.push({ x: 0, y: 0 });
        
        // Add points along the semicircle arc
        for (let i = 0; i <= segments; i++) {
          // Calculate angle from 0 to PI (half circle)
          const angle = Math.PI * i / segments;
          const x = size/2 * Math.cos(angle);
          const y = -size/2 * Math.sin(angle); // Negative to make it face upward
          points.push({ x, y });
        }
        
        return points;
      }
      
    
    // Draw the mirror based on its physics body
    drawFromPhysics() {
        // Clear any existing graphics
        this.graphics.clear();
        
        // Get the vertices from the physics body
        let vertices;
        
        if (this.body.parts && this.body.parts.length > 1) {
          // For compound bodies, use the first part after the parent
          vertices = this.body.parts[1].vertices;
        } else {
          // For simple bodies
          vertices = this.body.vertices;
        }
        
        // Ensure we have vertices to draw
        if (!vertices || vertices.length < 3) {
          console.warn('Not enough vertices to draw mirror:', this.shapeType);
          return;
        }
        
        // Draw fill
        this.graphics.fillStyle(this.style.fillColor, this.style.fillAlpha);
        this.graphics.beginPath();
        
        // Start at the first vertex
        this.graphics.moveTo(vertices[0].x, vertices[0].y);
        
        // Draw lines to each subsequent vertex
        for (let i = 1; i < vertices.length; i++) {
          this.graphics.lineTo(vertices[i].x, vertices[i].y);
        }
        
        // Close the path back to the first vertex (ensures complete shape)
        this.graphics.closePath();
        this.graphics.fillPath();
        
        // Draw outline with default color
        this.graphics.lineStyle(this.style.strokeWidth, this.style.strokeColor);
        this.graphics.beginPath();
        
        // Start at the first vertex again
        this.graphics.moveTo(vertices[0].x, vertices[0].y);
        
        // Draw lines to each vertex again for the outline
        for (let i = 1; i < vertices.length; i++) {
          this.graphics.lineTo(vertices[i].x, vertices[i].y);
        }
        
        // Ensure the outline is properly closed
        this.graphics.closePath();
        this.graphics.strokePath();
        
        // Add debug info if needed
        if (this.scene.matter.world.debugGraphic) {
          // Log shape type and vertex count
          console.log(`Mirror: ${this.shapeType}, Vertices: ${vertices.length}`);
        }
      }
    
    // Set up the mirror for interactivity
    makeInteractive() {
      // Get vertices from the physics body for hit testing
      let vertices = [];
      
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
      
      // Create polygon points array for Phaser
      const polygonPoints = [];
      for (const vertex of vertices) {
        polygonPoints.push(vertex.x);
        polygonPoints.push(vertex.y);
      }
      
      // Create polygon for hit area
      const hitArea = new Phaser.Geom.Polygon(polygonPoints);
      
      // Make the graphics object interactive with properly defined callback
      this.graphics.setInteractive({
        hitArea: hitArea,
        hitAreaCallback: Phaser.Geom.Polygon.Contains,
        useHandCursor: true,
        draggable: true
      });
      
      // Add input handlers
      this.graphics.on('pointerover', () => {
        if (!this.isDragging && !this.isLocked) {
          this.setColor(this.style.hoverStrokeColor);
        }
      });
      
      this.graphics.on('pointerout', () => {
        if (!this.isDragging && !this.isLocked) {
          this.setColor(this.style.strokeColor);
        }
      });
      
      // Drag start - store initial pointer position relative to mirror
      this.graphics.on('dragstart', (pointer) => {
        if (!this.isLocked) {
          // Store offset between pointer and mirror center to maintain during drag
          this.dragOffsetX = this.x - pointer.x;
          this.dragOffsetY = this.y - pointer.y;
          this.startDrag();
        }
      });
      
      // Drag - use the stored offset to maintain relative position
      this.graphics.on('drag', (pointer, dragX, dragY) => {
        if (!this.isLocked && this.isDragging) {
          // Apply the offset to keep the mirror position relative to the pointer
          const adjustedX = pointer.x + (this.dragOffsetX || 0);
          const adjustedY = pointer.y + (this.dragOffsetY || 0);
          
          // Constrain to game boundaries
          const bounds = this.scene;
          let finalX = adjustedX;
          let finalY = adjustedY;
          
          if (bounds.leftBound !== undefined && bounds.rightBound !== undefined) {
            finalX = Phaser.Math.Clamp(adjustedX, bounds.leftBound + 30, bounds.rightBound - 30);
          }
          if (bounds.topBound !== undefined && bounds.bottomBound !== undefined) {
            finalY = Phaser.Math.Clamp(adjustedY, bounds.topBound + 30, bounds.bottomBound - 30);
          }
          
          this.drag(finalX, finalY);
        }
      });
      
      // Drag end
      this.graphics.on('dragend', () => {
        if (!this.isLocked && this.isDragging) {
          this.stopDrag();
          // Clear drag offsets
          delete this.dragOffsetX;
          delete this.dragOffsetY;
        }
      });
    }
    
    // Change color (for hover, drag, etc.)
    setColor(color) {
      // Clear and redraw with new color
      this.graphics.clear();
      
      // Get the vertices from the physics body
      let vertices;
      
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
      
      // Draw fill
      this.graphics.fillStyle(this.style.fillColor, this.style.fillAlpha);
      this.graphics.beginPath();
      
      this.graphics.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.graphics.lineTo(vertices[i].x, vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
      
      // Draw outline with the new color
      this.graphics.lineStyle(this.style.strokeWidth, color);
      this.graphics.beginPath();
      
      this.graphics.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.graphics.lineTo(vertices[i].x, vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    }
    
    // Start dragging
    startDrag() {
      if (this.isLocked) return;
      
      console.log('Mirror drag started');
      this.isDragging = true;
      this.scene.matter.body.setStatic(this.body, false);
      this.setColor(this.style.dragStrokeColor);
    }
    
    // During drag - update position
    drag(dragX, dragY) {
      if (this.isLocked || !this.isDragging) return;
      
      // Check if the position is within valid placement bounds
      if (this.isPositionValid(dragX, dragY)) {
        // Move the physics body to the new position
        this.scene.matter.body.setPosition(this.body, {
          x: dragX,
          y: dragY
        });
        
        // Update our stored position
        this.x = dragX;
        this.y = dragY;
        
        // Redraw at the new position
        this.drawFromPhysics();
        
        // Update the hit area to match the new position
        this.updateHitArea();
        
        // Reset to normal drag color
        this.setColor(this.style.dragStrokeColor);
      } else {
        // Invalid position - show visual feedback (red)
        this.setColor(0xff0000);
      }
    }
    
    // Check if a position is valid (outside no-go zones)
    // Check if a position is valid (outside no-go zones)
// Check if a position is valid (outside no-go zones)
    // Check if a position is valid (outside no-go zones and not overlapping other mirrors)
isPositionValid(x, y) {
    // Only apply constraints before game starts
    if (this.scene.isGameStarted) return true;
    
    // Get constraints from scene if available
    const constraints = this.scene.placementConstraints;
    if (!constraints) return true; // No constraints defined
    
    // Instead of just checking the center point, we need to check all vertices of the mirror
    // Get vertices from the physics body - we'll simulate where they would be at the new position
    let vertices = [];
    
    if (this.body) {
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
    
      // Calculate the offset from current position to proposed position
      const offsetX = x - this.x;
      const offsetY = y - this.y;
      
      // Check if any vertex would be in a restricted zone after moving
      for (const vertex of vertices) {
        // Calculate new vertex position
        const newVertexX = vertex.x + offsetX;
        const newVertexY = vertex.y + offsetY;
        
        // Check distance from center (target)
        const distanceFromCenter = Math.sqrt(newVertexX * newVertexX + newVertexY * newVertexY);
        if (distanceFromCenter < constraints.targetSafeRadius) {
          console.log(`Invalid position: vertex too close to target (${distanceFromCenter} < ${constraints.targetSafeRadius})`);
          return false; // Vertex too close to target
        }
        
        // Check wall margins
        const margin = constraints.wallSafeMargin;
        
        // Get game area boundaries
        const leftBound = this.scene.leftBound;
        const rightBound = this.scene.rightBound;
        const topBound = this.scene.topBound;
        const bottomBound = this.scene.bottomBound;
        
        // Too close to walls?
        if (newVertexX < leftBound + margin || newVertexX > rightBound - margin ||
            newVertexY < topBound + margin || newVertexY > bottomBound - margin) {
          console.log(`Invalid position: vertex too close to wall`);
          return false;
        }
      }
      
      // Check for overlap with other mirrors
      if (this.wouldOverlapOtherMirrors(x, y)) {
        console.log(`Invalid position: would overlap with another mirror`);
        return false;
      }
      
      // If no vertices are in restricted zones and no overlaps, position is valid
      return true;
    } else {
      // If body doesn't exist yet, just check center point distance from target
      const distanceFromCenter = Math.sqrt(x * x + y * y);
      const safeRadius = constraints.targetSafeRadius * 1.2; // Add extra buffer
      
      if (distanceFromCenter < safeRadius) {
        console.log(`Initial check: position too close to center (${distanceFromCenter} < ${safeRadius})`);
        return false;
      }
      
      // Check wall margins
      const margin = constraints.wallSafeMargin;
      const leftBound = this.scene.leftBound;
      const rightBound = this.scene.rightBound;
      const topBound = this.scene.topBound;
      const bottomBound = this.scene.bottomBound;
      
      if (x < leftBound + margin || x > rightBound - margin ||
          y < topBound + margin || y > bottomBound - margin) {
        console.log(`Initial check: position too close to wall`);
        return false;
      }
      
      return true;
    }
  }
    
    // Update the hit area to match the current physics body
    updateHitArea() {
      if (!this.graphics || !this.graphics.input || !this.body) return;
      
      // Get vertices from the physics body
      let vertices = [];
      
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
      
      // Create polygon points array for Phaser
      const polygonPoints = [];
      for (const vertex of vertices) {
        polygonPoints.push(vertex.x);
        polygonPoints.push(vertex.y);
      }
      
      // Create new polygon for hit area
      const hitArea = new Phaser.Geom.Polygon(polygonPoints);
      
      // Update the hit area
      this.graphics.input.hitArea = hitArea;
    }
    
    // End dragging
    stopDrag() {
      if (this.isLocked || !this.isDragging) return;
      
      console.log('Mirror drag ended');
      this.isDragging = false;
      
      // Optional: Snap to grid
      const gridSize = 10;
      const newX = Math.round(this.x / gridSize) * gridSize;
      const newY = Math.round(this.y / gridSize) * gridSize;
      
      // Check if the final position is valid
      if (this.isPositionValid(newX, newY)) {
        // Move the physics body to the snapped position
        this.scene.matter.body.setPosition(this.body, {
          x: newX,
          y: newY
        });
        
        // Update our stored position
        this.x = newX;
        this.y = newY;
        
        // Make static again
        this.scene.matter.body.setStatic(this.body, true);
        
        // Redraw at the final position
        this.drawFromPhysics();
        
        // Update the hit area to match the final position
        this.updateHitArea();
        
        // Reset to normal color
        this.setColor(this.style.strokeColor);
      } else {
        // If position is invalid, find a valid position nearby
        const validPos = this.findNearestValidPosition(newX, newY);
        
        // Move to valid position
        this.scene.matter.body.setPosition(this.body, {
          x: validPos.x,
          y: validPos.y
        });
        
        // Update our stored position
        this.x = validPos.x;
        this.y = validPos.y;
        
        // Make static again
        this.scene.matter.body.setStatic(this.body, true);
        
        // Redraw at the final position
        this.drawFromPhysics();
        
        // Update the hit area
        this.updateHitArea();
        
        // Reset to normal color
        this.setColor(this.style.strokeColor);
      }
    }
    
    // Find nearest valid position if current position is invalid
    // Find nearest valid position if current position is invalid
    // Find nearest valid position if current position is invalid
findNearestValidPosition(x, y) {
    // Get constraints and boundaries
    const constraints = this.scene.placementConstraints;
    const leftBound = this.scene.leftBound;
    const rightBound = this.scene.rightBound;
    const topBound = this.scene.topBound;
    const bottomBound = this.scene.bottomBound;
    
    // If no constraints, return original position
    if (!constraints) return { x, y };
    
    // Get vertices from the physics body
    let vertices = [];
    if (this.body.parts && this.body.parts.length > 1) {
      vertices = this.body.parts[1].vertices;
    } else {
      vertices = this.body.vertices;
    }
    
    // Start with proposed position
    let validX = x;
    let validY = y;
    
    // Try different directions with increasing distance until we find a valid position
    const directions = [
      { x: 1, y: 0 },    // right
      { x: 0, y: 1 },    // down
      { x: -1, y: 0 },   // left
      { x: 0, y: -1 },   // up
      { x: 1, y: 1 },    // down-right
      { x: -1, y: 1 },   // down-left
      { x: -1, y: -1 },  // up-left
      { x: 1, y: -1 }    // up-right
    ];
    
    // If too close to target, first try moving directly outward
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    if (distanceFromCenter < constraints.targetSafeRadius * 1.5) {
      // Calculate direction vector from center to mirror
      const angle = Math.atan2(y, x);
      // Start at safe distance in same direction
      validX = Math.cos(angle) * (constraints.targetSafeRadius * 1.5);
      validY = Math.sin(angle) * (constraints.targetSafeRadius * 1.5);
      
      // If this position is valid, return it
      if (this.isPositionValid(validX, validY)) {
        return { x: validX, y: validY };
      }
    }
    
    // Try increasingly larger offsets until we find a valid position
    for (let dist = 20; dist <= 300; dist += 20) { // Increased distance increments to avoid mirrors
      for (const dir of directions) {
        validX = x + dir.x * dist;
        validY = y + dir.y * dist;
        
        // Check if this position is valid (including no overlap with other mirrors)
        if (this.isPositionValid(validX, validY)) {
          return { x: validX, y: validY };
        }
      }
    }
    
    // If still no valid position found, try placing along the edges of the safe zone
    const edgePositions = [
      // Top edge of safe zone
      { x: 0, y: -(constraints.targetSafeRadius * 1.5) },
      // Bottom edge of safe zone
      { x: 0, y: constraints.targetSafeRadius * 1.5 },
      // Left edge of safe zone
      { x: -(constraints.targetSafeRadius * 1.5), y: 0 },
      // Right edge of safe zone
      { x: constraints.targetSafeRadius * 1.5, y: 0 },
      // Diagonal positions
      { x: constraints.targetSafeRadius * 1.2, y: constraints.targetSafeRadius * 1.2 },
      { x: -constraints.targetSafeRadius * 1.2, y: constraints.targetSafeRadius * 1.2 },
      { x: -constraints.targetSafeRadius * 1.2, y: -constraints.targetSafeRadius * 1.2 },
      { x: constraints.targetSafeRadius * 1.2, y: -constraints.targetSafeRadius * 1.2 }
    ];
    
    for (const pos of edgePositions) {
      if (this.isPositionValid(pos.x, pos.y)) {
        return pos;
      }
    }
    
    // Fallback to a safe default position if no valid position found
    return { 
      x: Math.sign(x || 1) * (constraints.targetSafeRadius + 100), 
      y: Math.sign(y || 1) * (constraints.targetSafeRadius + 100) 
    };
  }
    
    // Get normal vector for the closest edge to the collision point
    getNormal(collisionPoint) {
      // Find the closest edge to the collision point
      let closestEdge = null;
      let minDistance = Infinity;
      
      // Get vertices from the physics body
      let vertices;
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
      
      // Check each edge
      for (let i = 0; i < vertices.length; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % vertices.length];
        
        // Calculate the closest point on this edge to the collision point
        const closest = this.closestPointOnLine(collisionPoint, start, end);
        
        // Calculate distance
        const distance = Phaser.Math.Distance.Between(
          collisionPoint.x, collisionPoint.y,
          closest.x, closest.y
        );
        
        // Update closest edge if this is closer
        if (distance < minDistance) {
          minDistance = distance;
          closestEdge = { start, end };
        }
      }
      
      // Calculate the normal of the closest edge
      if (closestEdge) {
        // Find the edge direction
        const dx = closestEdge.end.x - closestEdge.start.x;
        const dy = closestEdge.end.y - closestEdge.start.y;
        
        // Edge length
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Normalized edge direction
        const edgeX = dx / length;
        const edgeY = dy / length;
        
        // Get the midpoint of the edge
        const midpoint = {
          x: (closestEdge.start.x + closestEdge.end.x) / 2,
          y: (closestEdge.start.y + closestEdge.end.y) / 2
        };
        
        // Vector from midpoint to collision point
        const toCollision = {
          x: collisionPoint.x - midpoint.x,
          y: collisionPoint.y - midpoint.y
        };
        
        // Possible normals (perpendicular to edge)
        const normal1 = { x: -edgeY, y: edgeX };   // 90 degrees counterclockwise
        const normal2 = { x: edgeY, y: -edgeX };   // 90 degrees clockwise
        
        // Dot product to determine which normal faces outward
        const dot1 = toCollision.x * normal1.x + toCollision.y * normal1.y;
        
        // Choose the normal that gives positive dot product with vector to collision
        const normal = (dot1 > 0) ? normal1 : normal2;
        
        // Normalize and return
        const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        return new Phaser.Math.Vector2(normal.x / normalLength, normal.y / normalLength);
      }
      
      // Fallback if no edge found (shouldn't happen)
      return new Phaser.Math.Vector2(0, -1);
    }
    
    // Helper to find closest point on a line segment
    closestPointOnLine(point, lineStart, lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      
      const lengthSquared = dx * dx + dy * dy;
      
      // If the line has zero length, return the start point
      if (lengthSquared === 0) return lineStart;
      
      // Calculate the projection of the point onto the line
      const t = Math.max(0, Math.min(1, (
        (point.x - lineStart.x) * dx + 
        (point.y - lineStart.y) * dy
      ) / lengthSquared));
      
      return {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy
      };
    }
    
    // Lock the mirror once game starts
    lock() {
      this.isLocked = true;
      this.isDragging = false; // Ensure dragging is stopped
      
      // Make sure it's static and not draggable
      this.scene.matter.body.setStatic(this.body, true);
      
      // Disable interaction
      if (this.graphics && this.graphics.input) {
        this.graphics.disableInteractive();
      }
      
      // Change color to locked state
      this.setColor(this.style.lockedStrokeColor);
      
      console.log('Mirror locked');
    }
    
    // Clean up when destroying
    destroy() {
      // Remove graphics
      if (this.graphics) {
        this.graphics.clear();
        this.graphics.destroy();
      }
      
      // Remove physics body
      if (this.body && this.scene.matter.world) {
        this.scene.matter.world.remove(this.body);
      }
    }
    // Check if moving to a position would overlap with other mirrors
wouldOverlapOtherMirrors(x, y) {
    // Get all mirrors from the scene
    if (!this.scene.mirrors || this.scene.mirrors.length <= 1) {
      return false; // No other mirrors to check
    }
    
    // Calculate the offset from current position to proposed position
    const offsetX = x - this.x;
    const offsetY = y - this.y;
    
    // Get our vertices at the new position
    let ourVertices = [];
    if (this.body) {
      if (this.body.parts && this.body.parts.length > 1) {
        ourVertices = this.body.parts[1].vertices;
      } else {
        ourVertices = this.body.vertices;
      }
      
      // Transform our vertices to the new position
      const ourNewVertices = ourVertices.map(vertex => ({
        x: vertex.x + offsetX,
        y: vertex.y + offsetY
      }));
      
      // Check against all other mirrors
      for (const otherMirror of this.scene.mirrors) {
        // Skip checking against ourselves
        if (otherMirror === this || !otherMirror.body) continue;
        
        // Get other mirror's vertices
        let otherVertices = [];
        if (otherMirror.body.parts && otherMirror.body.parts.length > 1) {
          otherVertices = otherMirror.body.parts[1].vertices;
        } else {
          otherVertices = otherMirror.body.vertices;
        }
        
        // Check if our new position would overlap with this other mirror
        if (this.doPolygonsOverlap(ourNewVertices, otherVertices)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Check if two polygons overlap using Separating Axis Theorem (SAT)
  doPolygonsOverlap(poly1, poly2) {
    // Simple bounding box check first for performance
    const bounds1 = this.getPolygonBounds(poly1);
    const bounds2 = this.getPolygonBounds(poly2);
    
    // Check if bounding boxes don't overlap
    if (bounds1.right < bounds2.left || bounds2.right < bounds1.left ||
        bounds1.bottom < bounds2.top || bounds2.bottom < bounds1.top) {
      return false; // No overlap possible
    }
    
    // More detailed check using distance between centers and minimum separation
    const center1 = this.getPolygonCenter(poly1);
    const center2 = this.getPolygonCenter(poly2);
    
    const distance = Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
    );
    
    // Use a simple radius-based approach for performance
    // Calculate approximate radius for each polygon
    const radius1 = this.getPolygonRadius(poly1, center1);
    const radius2 = this.getPolygonRadius(poly2, center2);
    
    // Add a small buffer to prevent mirrors from being too close
    const buffer = 10;
    
    return distance < (radius1 + radius2 + buffer);
  }
  
  // Get bounding box of a polygon
  getPolygonBounds(vertices) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const vertex of vertices) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }
    
    return { left: minX, right: maxX, top: minY, bottom: maxY };
  }
  
  // Get center point of a polygon
  getPolygonCenter(vertices) {
    let sumX = 0, sumY = 0;
    
    for (const vertex of vertices) {
      sumX += vertex.x;
      sumY += vertex.y;
    }
    
    return {
      x: sumX / vertices.length,
      y: sumY / vertices.length
    };
  }
  
  // Get approximate radius of a polygon from its center
  getPolygonRadius(vertices, center) {
    let maxDistance = 0;
    
    for (const vertex of vertices) {
      const distance = Math.sqrt(
        Math.pow(vertex.x - center.x, 2) + Math.pow(vertex.y - center.y, 2)
      );
      maxDistance = Math.max(maxDistance, distance);
    }
    
    return maxDistance;
  }
  }