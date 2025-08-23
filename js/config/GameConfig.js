// Game Configuration
const GameConfig = {
    // Canvas Settings
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    
    // Grid System
    GRID_SIZE: 20,
    
    // Game Objects
    MIRROR_SIZE: 40, // 2x2 grid cells
    MIRROR_COUNT: 8,
    TARGET_RADIUS: 30, // 3x2 grid cells for better visibility
    
    // Physics
    LASER_SPEED: 2,
    LASER_RADIUS: 2,
    ANGLE_INCREMENT: 15, // degrees
    
    // Layout
    EDGE_MARGIN: 40,
    
    // Visual Settings
    COLORS: {
        // Grid
        GRID_LINE: '#ddd',
        
        // Mirror
        MIRROR_SURFACE: '#c0c0c0',
        MIRROR_SURFACE_DRAGGING: '#d0d0d0',
        MIRROR_HIGHLIGHT: '#f0f0f0',
        MIRROR_HIGHLIGHT_DRAGGING: '#ffffff',
        MIRROR_FRAME: '#333',
        MIRROR_FRAME_DRAGGING: '#000',
        MIRROR_GLOW: '#ffff00',
        
        // Target
        TARGET_NORMAL: '#4CAF50',
        TARGET_HIT: '#ff4444',
        TARGET_CROSSHAIR: 'white',
        
        // Laser
        LASER_BEAM: '#ff0000',
        LASER_TRAIL: 'rgba(255, 0, 0, 0.3)',
        
        // Spawner
        SPAWNER_BODY: '#333',
        SPAWNER_ARROW: '#666',
        
        // Zones
        FORBIDDEN_ZONE: 'rgba(255, 0, 0, 0.1)'
    },
    
    // Gameplay Settings
    SPAWNER_COUNT: 3,
    LASER_ANGLE_VARIATION: 120, // ±60 degrees from center direction
    LASER_TRAIL_LENGTH: 80,
    
    // Collision Settings
    TARGET_SAFE_RADIUS: 100, // Increased for larger target
    
    // Visual Effects
    GLOW_SIZE: 15,
    SHADOW_BLUR: 15,
    DRAG_BORDER_THICKNESS: 3,
    NORMAL_BORDER_THICKNESS: 2,
    
    // Debug Settings
    SHOW_DEBUG_INFO: false,
    SHOW_COLLISION_BOUNDS: false
};