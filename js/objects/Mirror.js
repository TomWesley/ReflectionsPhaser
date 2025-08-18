// Custom Mirror class with realistic mirror design and grid snapping
class Mirror {
    constructor(scene, x, y, shapeType = null) {
        this.scene = scene;
        
        // Initialize grid manager if not available
        if (!this.scene.gridManager) {
            this.scene.gridManager = new GridManager(this.scene.scalingManager);
        }
        
        // Snap initial position to grid
        const gridPos = this.scene.gridManager.snapToGrid(x, y);
        this.x = gridPos.x;
        this.y = gridPos.y;
        
        // Store the requested shape type if provided
        this.requestedShapeType = shapeType;
        
        // Realistic mirror color palette
        this.colors = {
          mirror: 0xc0c0c0,       // Silver mirror surface
          mirrorHighlight: 0xf0f0f0, // Bright reflection
          mirrorShadow: 0x808080,    // Shadow areas
          frame: 0x2a2a2a,          // Dark frame
          frameHighlight: 0x4a4a4a,  // Frame highlight
          hover: 0xe0e0e0,          // Hover state
          active: 0xffffff,         // Active/dragging state
          locked: 0x9ca3af,         // Locked state
          reflection: 0xffffff       // Reflection effect
        };
        
        // Load appearance settings from CSS classes
        this.loadStyleFromCSS();
        
        // Create the physics body for the requested shape
        this.createPhysicsBody();
        
        // No rotation for testing - keep mirrors square and aligned
        if (this.body) {
          this.initialRotation = 0;
          this.scene.matter.body.setAngle(this.body, this.initialRotation);
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
        this.isHovered = false;
        
        // Listen for scale changes
        this.scene.events.on('scale-changed', this.onScaleChanged, this);
      }
    
    // Load style settings from CSS classes
    loadStyleFromCSS() {
      // Realistic mirror style settings
      this.style = {
        mirrorColor: this.colors.mirror,
        frameColor: this.colors.frame,
        frameWidth: 3,
        reflectionColor: this.colors.reflection,
        highlightColor: this.colors.mirrorHighlight,
        shadowColor: this.colors.mirrorShadow,
        hoverColor: this.colors.hover,
        dragColor: this.colors.active,
        lockedColor: this.colors.locked,
        reflectionAlpha: 0.3,
        shadowAlpha: 0.6
      };
      
      try {
        // Get styles from CSS classes for customization
        const mirrorStyle = this.getComputedStyleForClass('mirror');
        const mirrorHoverStyle = this.getComputedStyleForClass('mirror-hover');
        const mirrorDragStyle = this.getComputedStyleForClass('mirror-drag');
        const mirrorLockedStyle = this.getComputedStyleForClass('mirror-locked');
        
        // Apply custom styles if available
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
        try {
          const ctx = document.createElement('canvas').getContext('2d');
          ctx.fillStyle = color;
          const hexColor = ctx.fillStyle;
          if (hexColor.startsWith('#')) {
            return parseInt(hexColor.substring(1), 16);
          }
        } catch (e) {
          // Fallback
        }
      }
      
      return this.colors.primary;
    }
    
    createPhysicsBody() {
        // Get size from scaling manager
        const scalingManager = this.scene.scalingManager;
        let minSize, maxSize;
        
        if (scalingManager) {
          minSize = scalingManager.elementSizes.mirrorMin;
          maxSize = scalingManager.elementSizes.mirrorMax;
        } else {
          minSize = 40;
          maxSize = 60;
        }
        
        // Generate grid-aligned size
        if (!this.baseSizeRatio) {
          this.baseSizeRatio = Math.random();
        }
        
        // Get grid-constrained size bounds
        const gridBounds = this.scene.gridManager.getShapeGridBounds(this.shapeType || 'rectangle');
        const size = this.getGridAlignedSize(gridBounds);
        
        // Force all shapes to be rectangles for testing
        this.shapeType = 'rectangle';
        
        // Generate vertices based on shape type
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
            console.warn(`Unknown shape type: ${this.shapeType}, falling back to rectangle`);
            this.shapeType = 'rectangle';
            verts = this.createRectangle(size);
        }
        
        try {
          // Create the physics body with exact size matching visual
          this.body = this.scene.matter.add.fromVertices(
            this.x, this.y,
            verts,
            {
              isStatic: true,
              label: 'mirror',
              friction: 0,
              frictionAir: 0,
              restitution: 1,
              collisionFilter: {
                category: 0x0002,
                mask: 0x0001
              }
            }
          );
          
          console.log('Created mirror body at', this.x, this.y, 'with vertices:', verts);
          
          if (!this.body) {
            console.error(`Failed to create body for ${this.shapeType}, using fallback`);
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
          this.shapeType = 'rectangle';
          try {
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
          } catch (fallbackError) {
            console.error('Mirror creation failed completely:', fallbackError);
          }
        }
        
        if (this.body) {
          this.body.render.visible = false;
        }
      }
      
      // Generate shape vertices (same as before but with better proportions)
      createRightTriangle(size) {
        return [
          { x: -size/2, y: -size/2 },
          { x: size/2, y: -size/2 },
          { x: -size/2, y: size/2 }
        ];
      }
      
      createIsoscelesTriangle(size) {
        return [
          { x: 0, y: -size/2 },
          { x: -size/2, y: size/2 },
          { x: size/2, y: size/2 }
        ];
      }
      
      createRectangle(size) {
        const gridSize = this.scene.gridManager.gridSize;
        
        // Force perfect squares for testing
        this.rectangleAspectRatio = 1;
        
        // Make squares exactly 2 grid cells in size for easy testing
        const squareSize = gridSize * 2;
        
        return [
          { x: -squareSize/2, y: -squareSize/2 },
          { x: squareSize/2, y: -squareSize/2 },
          { x: squareSize/2, y: squareSize/2 },
          { x: -squareSize/2, y: squareSize/2 }
        ];
      }
      
      createTrapezoid(size) {
        if (!this.trapezoidRatios) {
          this.trapezoidRatios = {
            topWidthRatio: Phaser.Math.FloatBetween(0.5, 0.8),
            heightRatio: Phaser.Math.FloatBetween(0.8, 1.2)
          };
        }
        
        const topWidth = size * this.trapezoidRatios.topWidthRatio;
        const bottomWidth = size;
        const height = size * this.trapezoidRatios.heightRatio;
        
        return [
          { x: -topWidth/2, y: -height/2 },
          { x: topWidth/2, y: -height/2 },
          { x: bottomWidth/2, y: height/2 },
          { x: -bottomWidth/2, y: height/2 }
        ];
      }
      
      createSemicircle(size) {
        const points = [];
        const segments = 8;
        
        points.push({ x: 0, y: 0 });
        
        for (let i = 0; i <= segments; i++) {
          const angle = Math.PI * i / segments;
          const x = size/2 * Math.cos(angle);
          const y = -size/2 * Math.sin(angle);
          points.push({ x, y });
        }
        
        return points;
      }
    
    // Get grid-aligned size based on shape bounds
    getGridAlignedSize(gridBounds) {
      const gridSize = this.scene.gridManager.gridSize;
      
      if (gridBounds.minWidth && gridBounds.maxWidth) {
        // For rectangles
        const targetWidth = gridBounds.minWidth + (gridBounds.maxWidth - gridBounds.minWidth) * this.baseSizeRatio;
        return Math.round(targetWidth / gridSize) * gridSize;
      } else if (gridBounds.baseSize) {
        // For triangles and other shapes
        const targetSize = gridBounds.baseSize + (gridBounds.maxSize - gridBounds.baseSize) * this.baseSizeRatio;
        return Math.round(targetSize / gridSize) * gridSize;
      } else {
        // Default grid-aligned size
        return gridSize * (1 + Math.floor(this.baseSizeRatio * 3));
      }
    }
    
    // Draw the mirror with realistic mirror appearance
    drawFromPhysics() {
        this.graphics.clear();
        
        let vertices;
        if (this.body.parts && this.body.parts.length > 1) {
          vertices = this.body.parts[1].vertices;
        } else {
          vertices = this.body.vertices;
        }
        
        if (!vertices || vertices.length < 3) {
          console.warn('Not enough vertices to draw mirror:', this.shapeType);
          return;
        }
        
        // Draw shadow first (for depth)
        if (!this.isLocked) {
          const shadowOffset = this.scene.scalingManager ? 
                              this.scene.scalingManager.getSpacing('xs') : 2;
          
          this.graphics.fillStyle(this.style.shadowColor, this.style.shadowAlpha);
          this.graphics.beginPath();
          this.graphics.moveTo(vertices[0].x + shadowOffset, vertices[0].y + shadowOffset);
          
          for (let i = 1; i < vertices.length; i++) {
            this.graphics.lineTo(vertices[i].x + shadowOffset, vertices[i].y + shadowOffset);
          }
          
          this.graphics.closePath();
          this.graphics.fillPath();
        }
        
        // Draw mirror surface with metallic appearance
        let mirrorColor = this.style.mirrorColor;
        if (this.isLocked) {
          mirrorColor = this.style.lockedColor;
        } else if (this.isDragging) {
          mirrorColor = this.style.dragColor;
        } else if (this.isHovered) {
          mirrorColor = this.style.hoverColor;
        }
        
        this.graphics.fillStyle(mirrorColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(vertices[0].x, vertices[0].y);
        
        for (let i = 1; i < vertices.length; i++) {
          this.graphics.lineTo(vertices[i].x, vertices[i].y);
        }
        
        this.graphics.closePath();
        this.graphics.fillPath();
        
        // Add highlight gradient effect to simulate reflection
        this.drawReflectionEffect(vertices);
        
        // Draw frame border
        const frameWidth = this.scene.scalingManager ? 
                          this.scene.scalingManager.getScaledValue(this.style.frameWidth) : 
                          this.style.frameWidth;
        
        this.graphics.lineStyle(frameWidth, this.style.frameColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(vertices[0].x, vertices[0].y);
        
        for (let i = 1; i < vertices.length; i++) {
          this.graphics.lineTo(vertices[i].x, vertices[i].y);
        }
        
        this.graphics.closePath();
        this.graphics.strokePath();
      }
    
    // Draw reflection effect to make it look more mirror-like
    drawReflectionEffect(vertices) {
      // Create a subtle highlight along one edge to simulate light reflection
      const center = this.getPolygonCenter(vertices);
      
      // Find the "top" edge for highlight (assuming light comes from top-left)
      let topEdge = null;
      let maxY = -Infinity;
      
      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        const midY = (v1.y + v2.y) / 2;
        
        if (midY > maxY) {
          maxY = midY;
          topEdge = { v1, v2 };
        }
      }
      
      if (topEdge) {
        // Draw highlight line along top edge
        const highlightWidth = this.scene.scalingManager ? 
                              this.scene.scalingManager.getScaledValue(2) : 2;
        
        this.graphics.lineStyle(highlightWidth, this.style.highlightColor, this.style.reflectionAlpha);
        this.graphics.beginPath();
        this.graphics.moveTo(topEdge.v1.x, topEdge.v1.y);
        this.graphics.lineTo(topEdge.v2.x, topEdge.v2.y);
        this.graphics.strokePath();
      }
      
      // Add a small bright spot to simulate specular reflection
      const spotSize = this.scene.scalingManager ? 
                      this.scene.scalingManager.getScaledValue(3) : 3;
      
      // Position spot slightly off-center toward top-left
      const spotX = center.x - spotSize;
      const spotY = center.y - spotSize;
      
      this.graphics.fillStyle(this.style.reflectionColor, this.style.reflectionAlpha);
      this.graphics.fillCircle(spotX, spotY, spotSize);
    }
    
    // Set up interactivity with better touch handling
    makeInteractive() {
      this.updateHitArea();
      this.setupEventHandlers();
    }
    
    // Update hit area to match current physics body
    updateHitArea() {
      if (!this.graphics || !this.body) return;
      
      let vertices = [];
      
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
      
      const polygonPoints = [];
      for (const vertex of vertices) {
        polygonPoints.push(vertex.x);
        polygonPoints.push(vertex.y);
      }
      
      const hitArea = new Phaser.Geom.Polygon(polygonPoints);
      
      // If already interactive, just update the hit area
      if (this.graphics.input) {
        this.graphics.input.hitArea = hitArea;
      } else {
        // Enhanced interactive setup for better mobile support
        this.graphics.setInteractive({
          hitArea: hitArea,
          hitAreaCallback: Phaser.Geom.Polygon.Contains,
          useHandCursor: true,
          draggable: true
        });
      }
    }
    
    // Set up event handlers (separated for clarity)
    setupEventHandlers() {
      if (!this.graphics) return;
      
      // Improved touch/mouse handlers
      this.graphics.on('pointerover', () => {
        if (!this.isDragging && !this.isLocked) {
          this.isHovered = true;
          this.drawFromPhysics();
          
          // Subtle scale animation
          this.scene.tweens.add({
            targets: this.graphics,
            scaleX: 1.02,
            scaleY: 1.02,
            duration: 150,
            ease: 'Cubic.out'
          });
        }
      });
      
      this.graphics.on('pointerout', () => {
        if (!this.isDragging && !this.isLocked) {
          this.isHovered = false;
          this.drawFromPhysics();
          
          // Reset scale
          this.scene.tweens.add({
            targets: this.graphics,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
            ease: 'Cubic.out'
          });
        }
      });
      
      this.graphics.on('dragstart', (pointer) => {
        if (!this.isLocked) {
          this.dragOffsetX = this.x - pointer.x;
          this.dragOffsetY = this.y - pointer.y;
          this.startDrag();
        }
      });
      
      this.graphics.on('drag', (pointer, dragX, dragY) => {
        if (!this.isLocked && this.isDragging) {
          const adjustedX = pointer.x + (this.dragOffsetX || 0);
          const adjustedY = pointer.y + (this.dragOffsetY || 0);
          this.drag(adjustedX, adjustedY);
        }
      });
      
      this.graphics.on('dragend', () => {
        if (!this.isLocked && this.isDragging) {
          this.stopDrag();
          delete this.dragOffsetX;
          delete this.dragOffsetY;
        }
      });
    }
    
    // Enhanced drag handling with visual feedback
    startDrag() {
      if (this.isLocked) return;
      
      this.isDragging = true;
      this.scene.matter.body.setStatic(this.body, false);
      this.drawFromPhysics();
      
      // Subtle lift effect
      this.scene.tweens.add({
        targets: this.graphics,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Cubic.out'
      });
    }
    
    drag(dragX, dragY) {
      if (this.isLocked || !this.isDragging) return;
      
      const scalingManager = this.scene.scalingManager;
      
      if (scalingManager) {
        const mirrorRadius = this.getMirrorRadius();
        const clampedPos = scalingManager.clampToGameBounds(
          dragX,
          dragY,
          scalingManager.placementConstraints.wallSafeMargin + mirrorRadius
        );
        
        dragX = clampedPos.x;
        dragY = clampedPos.y;
      }
      
      const isValidPosition = this.isPositionValid(dragX, dragY);
      
      if (isValidPosition) {
        this.scene.matter.body.setPosition(this.body, {
          x: dragX,
          y: dragY
        });
        
        this.x = dragX;
        this.y = dragY;
        
        this.drawFromPhysics();
        this.updateHitArea();
      } else {
        // Show invalid position feedback
        if (this.scene.gameArea && this.scene.gameArea.showPositionFeedback) {
          this.scene.gameArea.showPositionFeedback(dragX, dragY, false);
        }
      }
    }
    
    stopDrag() {
      if (this.isLocked || !this.isDragging) return;
      
      this.isDragging = false;
      
      // Snap to grid for clean positioning
      const snapped = this.scene.gridManager.snapToGrid(this.x, this.y);
      const newX = snapped.x;
      const newY = snapped.y;
      
      let finalPos = { x: newX, y: newY };
      
      if (!this.isPositionValid(newX, newY)) {
        // Use grid manager to find nearest valid position
        const bounds = this.scene.scalingManager.gameBounds;
        const constraints = this.scene.scalingManager.placementConstraints;
        finalPos = this.scene.gridManager.findNearestValidGridPosition(
          newX, newY, bounds, constraints
        );
      }
      
      // Smooth movement to final position
      this.scene.tweens.add({
        targets: this.body.position,
        x: finalPos.x,
        y: finalPos.y,
        duration: 200,
        ease: 'Cubic.out',
        onUpdate: () => {
          this.x = this.body.position.x;
          this.y = this.body.position.y;
          this.drawFromPhysics();
        },
        onComplete: () => {
          this.scene.matter.body.setStatic(this.body, true);
          this.updateHitArea();
          
          // Reset scale
          this.scene.tweens.add({
            targets: this.graphics,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Cubic.out'
          });
          
          // Show valid position feedback
          if (this.scene.gameArea && this.scene.gameArea.showPositionFeedback) {
            this.scene.gameArea.showPositionFeedback(finalPos.x, finalPos.y, true);
          }
        }
      });
      
      this.x = finalPos.x;
      this.y = finalPos.y;
    }
    
    // Get the maximum radius of the mirror from its center
    getMirrorRadius() {
      let vertices = [];
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
      
      let maxRadius = 0;
      for (const vertex of vertices) {
        const dist = Math.sqrt(
          Math.pow(vertex.x - this.x, 2) + Math.pow(vertex.y - this.y, 2)
        );
        maxRadius = Math.max(maxRadius, dist);
      }
      
      return maxRadius;
    }
    
    // Enhanced position validation
    isPositionValid(x, y) {
      if (this.scene.isGameStarted || (this.scene.gameState && this.scene.gameState.isPlaying())) {
        return true;
      }
      
      if (this.scene.gameArea && this.scene.gameArea.isValidMirrorPosition) {
        if (!this.scene.gameArea.isValidMirrorPosition(x, y)) {
          return false;
        }
      }
      
      return !this.wouldOverlapOtherMirrors(x, y);
    }
    
    findNearestValidPosition(x, y) {
      if (this.scene.levelManager && this.scene.levelManager.findValidMirrorPosition) {
        return this.scene.levelManager.findValidMirrorPosition(this);
      }
      
      const constraints = this.scene.placementConstraints || {
        targetSafeRadius: 100,
        wallSafeMargin: 50
      };
      
      const distanceFromCenter = Math.sqrt(x * x + y * y);
      if (distanceFromCenter < constraints.targetSafeRadius * 1.5) {
        const angle = Math.atan2(y, x);
        x = Math.cos(angle) * (constraints.targetSafeRadius * 1.5);
        y = Math.sin(angle) * (constraints.targetSafeRadius * 1.5);
      }
      
      if (this.scene.scalingManager) {
        const mirrorRadius = this.getMirrorRadius();
        const clampedPos = this.scene.scalingManager.clampToGameBounds(
          x, y,
          constraints.wallSafeMargin + mirrorRadius
        );
        x = clampedPos.x;
        y = clampedPos.y;
      }
      
      return { x, y };
    }
    
    
    // Get normal vector for laser reflection
    getNormal(collisionPoint) {
      let closestEdge = null;
      let minDistance = Infinity;
      
      let vertices;
      if (this.body.parts && this.body.parts.length > 1) {
        vertices = this.body.parts[1].vertices;
      } else {
        vertices = this.body.vertices;
      }
      
      for (let i = 0; i < vertices.length; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % vertices.length];
        
        const closest = this.closestPointOnLine(collisionPoint, start, end);
        const distance = Phaser.Math.Distance.Between(
          collisionPoint.x, collisionPoint.y,
          closest.x, closest.y
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestEdge = { start, end };
        }
      }
      
      if (closestEdge) {
        const dx = closestEdge.end.x - closestEdge.start.x;
        const dy = closestEdge.end.y - closestEdge.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const edgeX = dx / length;
        const edgeY = dy / length;
        
        const midpoint = {
          x: (closestEdge.start.x + closestEdge.end.x) / 2,
          y: (closestEdge.start.y + closestEdge.end.y) / 2
        };
        
        const toCollision = {
          x: collisionPoint.x - midpoint.x,
          y: collisionPoint.y - midpoint.y
        };
        
        const normal1 = { x: -edgeY, y: edgeX };
        const normal2 = { x: edgeY, y: -edgeX };
        
        const dot1 = toCollision.x * normal1.x + toCollision.y * normal1.y;
        const normal = (dot1 > 0) ? normal1 : normal2;
        
        const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        return new Phaser.Math.Vector2(normal.x / normalLength, normal.y / normalLength);
      }
      
      return new Phaser.Math.Vector2(0, -1);
    }
    
    closestPointOnLine(point, lineStart, lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      const lengthSquared = dx * dx + dy * dy;
      
      if (lengthSquared === 0) return lineStart;
      
      const t = Math.max(0, Math.min(1, (
        (point.x - lineStart.x) * dx + 
        (point.y - lineStart.y) * dy
      ) / lengthSquared));
      
      return {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy
      };
    }
    
    // Lock the mirror when game starts
    lock() {
      this.isLocked = true;
      this.isDragging = false;
      this.isHovered = false;
      
      this.scene.matter.body.setStatic(this.body, true);
      
      if (this.graphics && this.graphics.input) {
        this.graphics.disableInteractive();
      }
      
      // Reset any transforms
      this.graphics.setScale(1);
      this.drawFromPhysics();
    }
    
    // Handle scale changes - simplified since we restart scenes for major changes
    onScaleChanged(scaleData) {
      // Just redraw for minor changes
      this.drawFromPhysics();
    }
    
    // Simple update that just redraws
    updateScale(newScaleFactor) {
      this.drawFromPhysics();
    }
    
    // Check for overlaps with other mirrors
    wouldOverlapOtherMirrors(x, y) {
      const mirrors = this.scene.mirrors || 
                      (this.scene.levelManager && this.scene.levelManager.mirrors) || 
                      [];
      
      if (mirrors.length <= 1) return false;
      
      const offsetX = x - this.x;
      const offsetY = y - this.y;
      
      let ourVertices = [];
      if (this.body) {
        if (this.body.parts && this.body.parts.length > 1) {
          ourVertices = this.body.parts[1].vertices;
        } else {
          ourVertices = this.body.vertices;
        }
        
        const ourNewVertices = ourVertices.map(vertex => ({
          x: vertex.x + offsetX,
          y: vertex.y + offsetY
        }));
        
        for (const otherMirror of mirrors) {
          if (otherMirror === this || !otherMirror.body) continue;
          
          let otherVertices = [];
          if (otherMirror.body.parts && otherMirror.body.parts.length > 1) {
            otherVertices = otherMirror.body.parts[1].vertices;
          } else {
            otherVertices = otherMirror.body.vertices;
          }
          
          if (this.doPolygonsOverlap(ourNewVertices, otherVertices)) {
            return true;
          }
        }
      }
      
      return false;
    }
    
    // Simple overlap detection - no buffer for testing precise placement
    doPolygonsOverlap(poly1, poly2) {
      const center1 = this.getPolygonCenter(poly1);
      const center2 = this.getPolygonCenter(poly2);
      
      const distance = Math.sqrt(
        Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
      );
      
      const radius1 = this.getPolygonRadius(poly1, center1);
      const radius2 = this.getPolygonRadius(poly2, center2);
      
      // Remove buffer to allow mirrors to touch
      const buffer = 0;
      
      return distance < (radius1 + radius2 + buffer);
    }
    
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
    
    // Cleanup
    destroy() {
      // Remove scale change listener
      this.scene.events.off('scale-changed', this.onScaleChanged, this);
      
      // Remove graphics
      if (this.graphics) {
        this.graphics.clear();
        this.graphics.destroy();
        this.graphics = null;
      }
      
      // Remove physics body
      if (this.body && this.scene.matter.world) {
        this.scene.matter.world.remove(this.body);
        this.body = null;
      }
    }
  }