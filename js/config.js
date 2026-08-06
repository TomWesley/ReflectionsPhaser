// Game Configuration
export const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 20,
    SHOW_GRID: true,
    CENTER_RADIUS: 20,
    MIRROR_MIN_SIZE: 20, // 1x1 grid cells
    MIRROR_MAX_SIZE: 120, // 6x6 grid cells
    MAX_MIRRORS: 15, // Safety limit to prevent infinite loops
    LASER_SPEED: 8, 
    LASER_RADIUS: 2,
    TARGET_RADIUS: 50, // Aligns hexagon top/bottom vertices with grid lines
    // Mirror-free zone around the core (validation + the drawn red zone). Was
    // TARGET_RADIUS + 40 = 90; bumped +10% to 99 so it's harder to pack mirrors
    // tightly around the center. Single source of truth for both.
    CORE_EXCLUSION_RADIUS: 99,
    EDGE_MARGIN: 40,
    ANGLE_INCREMENT: 1, // degrees
    MIRROR_COUNT: 8,
    MAX_GAME_TIME: 300, // 5 minutes - perfect score threshold
    PHYSICS_DT: 1 / 60 // Fixed simulation timestep (shared by the live loop and server verification)
};