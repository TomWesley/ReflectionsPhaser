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
    LASER_SPEED: 2.64, // 20% faster than 2.2 (2.2 * 1.2 = 2.64)
    LASER_RADIUS: 2,
    TARGET_RADIUS: 50, // Aligns hexagon top/bottom vertices with grid lines
    EDGE_MARGIN: 40,
    ANGLE_INCREMENT: 15, // degrees
    MIRROR_COUNT: 8,
    MAX_GAME_TIME: 300 // 5 minutes - perfect score threshold
};