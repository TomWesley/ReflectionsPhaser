// Custom Mirror class with randomly generated shapes
class Mirror {
    constructor(scene, x, y) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      
      // Load appearance settings from CSS variables if available
      this.loadStyleFromCSS();
      
      // Randomly determine if this will be a triangle or quadrilateral
      this.isTriangle = Math.random() < 0.5;
      
      // Create the shape
      this.createRandomShape();
      
      // Setup input handlers in the scene directly
      this.setupInteractivity();
      
      // Create the physics body
      this.createPhysicsBody();
      
      // Track dragging state
      this.isDragging = false;
      this.isLocked = false;
    }
    
    // Load style settings from CSS variables if available
    loadStyleFromCSS() {
      // Default style settings - used if CSS variables not available
      this.style = {
        lineColor: 0x00ff00,    // Green outline
        lineThickness: 2,       // Line thickness
        fillColor: 0x000000,    // Black fill
        fillAlpha: 0.2,         // Slight transparency for fill
        hoverLineColor: 0x44aaff, // Blue outline when hovering
        dragLineColor: 0xaaaaff,  // Light blue when dragging
        lockedLineColor: 0x999999 // Gray when locked (game started)
      };
      
      // Try to get style from CSS variables
      try {
        // Get CSS variables from :root or html element
        const computedStyle = getComputedStyle(document.documentElement);
        
        // Helper function to convert CSS color to hex
        const cssColorToHex = (color) => {
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
          
          // Return default if cannot parse
          return null;
        };
        
        // Get CSS variables with fallbacks
        const getVar = (name, defaultValue) => {
          const value = computedStyle.getPropertyValue(name).trim();
          return value ? value : defaultValue;
        };
        
        // Update style settings from CSS if available
        const mirrorLineColor = getVar('--mirror-line-color', null);
        if (mirrorLineColor) {
          this.style.lineColor = cssColorToHex(mirrorLineColor) || this.style.lineColor;
        }
        
        const mirrorLineThickness = getVar('--mirror-line-thickness', null);
        if (mirrorLineThickness) {
          this.style.lineThickness = parseInt(mirrorLineThickness) || this.style.lineThickness;
        }
        
        const mirrorFillColor = getVar('--mirror-fill-color', null);
        if (mirrorFillColor) {
          this.style.fillColor = cssColorToHex(mirrorFillColor) || this.style.fillColor;
        }
        
        const mirrorFillAlpha = getVar('--mirror-fill-alpha', null);
        if (mirrorFillAlpha) {
          this.style.fillAlpha = parseFloat(mirrorFillAlpha) || this.style.fillAlpha;
        }
        
        const mirrorHoverColor = getVar('--mirror-hover-color', null);
        if (mirrorHoverColor) {
          this.style.hoverLineColor = cssColorToHex(mirrorHoverColor) || this.style.hoverLineColor;
        }
        
        const mirrorDragColor = getVar('--mirror-drag-color', null);
        if (mirrorDragColor) {
          this.style.dragLineColor = cssColorToHex(mirrorDragColor) || this.style.dragLineColor;
        }
        
        const mirrorLockedColor = getVar('--mirror-locked-color', null);
        if (mirrorLockedColor) {
          this.style.lockedLineColor = cssColorToHex(mirrorLockedColor) || this.style.lockedLineColor;
        }
      } catch (e) {
        console.warn('Could not load mirror styles from CSS, using defaults.', e);
      }
    }
    
    createRandomShape() {
      // Min and max size for the shape - increased by ~30%
      const minSize = 40;  // Increased from 30
      const maxSize = 90;  // Increased from 70
      
      // Random size for this mirror
      const size = Phaser.Math.Between(minSize, maxSize);
      
      // Generate vertices based on shape type
      this.vertices = [];
      
      if (this.isTriangle) {
        // Create a random triangle
        // We'll use a base triangle and then randomly offset each vertex
        const baseTriangle = [
          { x: 0, y: -size },            // Top
          { x: -size * 0.866, y: size * 0.5 }, // Bottom left
          { x: size * 0.866, y: size * 0.5 }   // Bottom right
        ];
        
        // Add random variation to each vertex
        for (let i = 0; i < 3; i++) {
          const variationX = Phaser.Math.Between(-size * 0.3, size * 0.3);
          const variationY = Phaser.Math.Between(-size * 0.3, size * 0.3);
          this.vertices.push({
            x: this.x + baseTriangle[i].x + variationX,
            y: this.y + baseTriangle[i].y + variationY
          });
        }
      } else {
        // Create a random quadrilateral
        // We'll create a base rectangle and then randomly offset each vertex
        const width = size;
        const height = Phaser.Math.Between(size * 0.5, size * 1.5);
        
        const baseRect = [
          { x: -width / 2, y: -height / 2 }, // Top left
          { x: width / 2, y: -height / 2 },  // Top right
          { x: width / 2, y: height / 2 },   // Bottom right
          { x: -width / 2, y: height / 2 }   // Bottom left
        ];
        
        // Add random variation to each vertex
        for (let i = 0; i < 4; i++) {
          const variationX = Phaser.Math.Between(-size * 0.2, size * 0.2);
          const variationY = Phaser.Math.Between(-size * 0.2, size * 0.2);
          this.vertices.push({
            x: this.x + baseRect[i].x + variationX,
            y: this.y + baseRect[i].y + variationY
          });
        }
      }
      
      // Create the graphics object
      this.graphics = this.scene.add.graphics();
      this.redraw();
    }
    
    setupInteractivity() {
      // Make sure the graphics object is interactive
      this.graphics.setInteractive({
        hitArea: new Phaser.Geom.Polygon(this.vertices),
        hitAreaCallback: Phaser.Geom.Polygon.Contains,
        draggable: true,
        useHandCursor: true,
        pixelPerfect: false // No need for pixel perfect detection
      });
      
      // Hover effects
      this.graphics.on('pointerover', () => {
        if (!this.isDragging && !this.isLocked) {
          this.redraw(this.style.hoverLineColor);
        }
      });
      
      this.graphics.on('pointerout', () => {
        if (!this.isDragging && !this.isLocked) {
          this.redraw(this.style.lineColor);
        }
      });
    }
    
    createPhysicsBody() {
      // Create physics body using the exact same vertices as the visual shape
      // Format the vertices for Matter.js
      const physicsVertices = [];
      for (const vert of this.vertices) {
        physicsVertices.push({ x: vert.x - this.x, y: vert.y - this.y });
      }
      
      // Create the body
      this.body = this.scene.matter.add.fromVertices(
        this.x, this.y,
        physicsVertices,
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
      
      // Important: DON'T set gameObject property on the body
      // This causes issues with Phaser's event system
    }
    
    redraw(lineColor = this.style.lineColor) {
      this.graphics.clear();
      
      // Draw fill
      this.graphics.fillStyle(this.style.fillColor, this.style.fillAlpha);
      this.graphics.beginPath();
      
      this.graphics.moveTo(this.vertices[0].x, this.vertices[0].y);
      for (let i = 1; i < this.vertices.length; i++) {
        this.graphics.lineTo(this.vertices[i].x, this.vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
      
      // Draw outline
      this.graphics.lineStyle(this.style.lineThickness, lineColor);
      this.graphics.beginPath();
      
      this.graphics.moveTo(this.vertices[0].x, this.vertices[0].y);
      for (let i = 1; i < this.vertices.length; i++) {
        this.graphics.lineTo(this.vertices[i].x, this.vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    }
    
    // Start dragging
    startDrag() {
      if (this.isLocked) return;
      
      this.isDragging = true;
      this.scene.matter.body.setStatic(this.body, false);
      this.redraw(this.style.dragLineColor);
    }
    
    // During drag - update position
    drag(dragX, dragY) {
      if (this.isLocked || !this.isDragging) return;
      
      // Calculate movement delta
      const deltaX = dragX - this.x;
      const deltaY = dragY - this.y;
      
      // Update stored position
      this.x = dragX;
      this.y = dragY;
      
      // Update all vertices
      for (let i = 0; i < this.vertices.length; i++) {
        this.vertices[i].x += deltaX;
        this.vertices[i].y += deltaY;
      }
      
      // Update physics body position
      this.scene.matter.body.setPosition(this.body, {
        x: this.x,
        y: this.y
      });
      
      // Redraw with updated position
      this.redraw(this.style.dragLineColor);
    }
    
    // End dragging
    stopDrag() {
      if (this.isLocked) return;
      
      this.isDragging = false;
      this.scene.matter.body.setStatic(this.body, true);
      this.redraw(this.style.lineColor);
      
      // Optional: Snap to grid
      const gridSize = 10;
      const newX = Math.round(this.x / gridSize) * gridSize;
      const newY = Math.round(this.y / gridSize) * gridSize;
      
      // Calculate the distance to move
      const deltaX = newX - this.x;
      const deltaY = newY - this.y;
      
      // Update position
      this.x = newX;
      this.y = newY;
      
      // Move physics body
      this.scene.matter.body.setPosition(this.body, {
        x: this.x,
        y: this.y
      });
      
      // Update all vertices
      for (const vertex of this.vertices) {
        vertex.x += deltaX;
        vertex.y += deltaY;
      }
      
      // Redraw with updated position
      this.redraw();
      
      // IMPORTANT: Update the hit area to match the new position
      // This was the key issue preventing multiple drags
      this.updateHitArea();
    }
    
    // Update the interactive hit area after movement
    updateHitArea() {
      // Create a new polygon from the current vertices
      const polygon = new Phaser.Geom.Polygon(this.vertices);
      
      // Update the hit area
      this.graphics.input.hitArea = polygon;
      this.graphics.input.hitAreaCallback = Phaser.Geom.Polygon.Contains;
    }
    
    // Lock mirror once game starts
    lock() {
      this.isLocked = true;
      this.graphics.disableInteractive();
      this.scene.matter.body.setStatic(this.body, true);
      this.redraw(this.style.lockedLineColor);
    }
    
    // Get normal vector for the closest edge to the collision point
    getNormal(collisionPoint) {
      // Find the closest edge to the collision point
      let closestEdge = null;
      let minDistance = Infinity;
      
      for (let i = 0; i < this.vertices.length; i++) {
        const start = this.vertices[i];
        const end = this.vertices[(i + 1) % this.vertices.length];
        
        // Calculate the closest point on this edge to the collision point
        const closest = this.closestPointOnLine(collisionPoint, start, end);
        
        // Calculate distance
        const distance = Phaser.Math.Distance.Between(
          collisionPoint.x, collisionPoint.y,
          closest.x, closest.y
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestEdge = { start, end };
        }
      }
      
      // Calculate the normal of the closest edge
      if (closestEdge) {
        const dx = closestEdge.end.x - closestEdge.start.x;
        const dy = closestEdge.end.y - closestEdge.start.y;
        
        // Perpendicular vector (normal to the edge)
        const normalX = -dy;
        const normalY = dx;
        
        // Normalize
        const length = Math.sqrt(normalX * normalX + normalY * normalY);
        return new Phaser.Math.Vector2(normalX / length, normalY / length);
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
  }