// Custom Mirror class with shapes drawn directly from physics body
class Mirror {
    constructor(scene, x, y) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      
      // Load appearance settings from CSS classes
      this.loadStyleFromCSS();
      
      // Randomly determine if this will be a triangle or quadrilateral
      this.isTriangle = Math.random() < 0.5;
      
      // First, create the physics body
      this.createPhysicsBody();
      
      // Then, create the graphics object for drawing
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
      const minSize = 40;
      const maxSize = 90;
      
      // Random size for this mirror
      const size = Phaser.Math.Between(minSize, maxSize);
      
      // Generate physics body based on shape type
      if (this.isTriangle) {
        // Create a random triangle physics body
        const verts = [];
        
        // Create a base triangle
        const baseTriangle = [
          { x: 0, y: -size },                // Top
          { x: -size * 0.866, y: size * 0.5 }, // Bottom left
          { x: size * 0.866, y: size * 0.5 }   // Bottom right
        ];
        
        // Add random variation to each vertex
        for (let i = 0; i < 3; i++) {
          const variationX = Phaser.Math.Between(-size * 0.3, size * 0.3);
          const variationY = Phaser.Math.Between(-size * 0.3, size * 0.3);
          verts.push({ 
            x: baseTriangle[i].x + variationX, 
            y: baseTriangle[i].y + variationY 
          });
        }
        
        // Create the body
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
      } else {
        // Create a random quadrilateral physics body
        const verts = [];
        
        // Create a base rectangle with random height
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
          verts.push({ 
            x: baseRect[i].x + variationX, 
            y: baseRect[i].y + variationY 
          });
        }
        
        // Create the body
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
      }
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
      
      // Draw fill
      this.graphics.fillStyle(this.style.fillColor, this.style.fillAlpha);
      this.graphics.beginPath();
      
      // Draw the shape
      this.graphics.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.graphics.lineTo(vertices[i].x, vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
      
      // Draw outline
      this.graphics.lineStyle(this.style.strokeWidth, this.style.strokeColor);
      this.graphics.beginPath();
      
      this.graphics.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.graphics.lineTo(vertices[i].x, vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
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
isPositionValid(x, y) {
    // Only apply constraints before game starts
    if (this.scene.isGameStarted) return true;
    
    // Get constraints from scene if available
    const constraints = this.scene.placementConstraints;
    if (!constraints) return true; // No constraints defined
    
    // Instead of just checking the center point, we need to check all vertices of the mirror
    // Get vertices from the physics body - we'll simulate where they would be at the new position
    let vertices = [];
    
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
        return false;
      }
    }
    
    // If no vertices are in restricted zones, position is valid
    return true;
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
    for (let dist = 10; dist <= 200; dist += 10) {
      for (const dir of directions) {
        validX = x + dir.x * dist;
        validY = y + dir.y * dist;
        
        // Check if this position is valid
        if (this.isPositionValid(validX, validY)) {
          return { x: validX, y: validY };
        }
      }
    }
    
    // Fallback to a safe default position if no valid position found
    return { 
      x: 0, 
      y: Math.sign(y) * (constraints.targetSafeRadius + 50) 
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
  }