# REFLECTIONS - Precision Laser Defense

A strategic laser defense game where you position mirrors to deflect incoming laser threats away from a central core.

## File Structure

```
ReflectionsPhaser/
├── index.html              # Main game HTML file
├── styles/
│   └── game.css            # Game styling and visual effects
├── js/
│   ├── config.js           # Game configuration constants
│   ├── main.js             # Game initialization
│   └── classes/
│       ├── Game.js         # Main game class with all logic
│       ├── Mirror.js       # Mirror class with rendering and physics
│       ├── Laser.js        # Laser class with movement and trails
│       └── Spawner.js      # Spawner class with preview rendering
```

## How to Play

1. **Setup Phase**: Drag mirrors around the game area to position them strategically
2. **Grid Alignment**: Mirrors automatically snap to grid intersections for precise positioning
3. **Launch**: Click "Launch Lasers" to start the defense sequence
4. **Objective**: Deflect all lasers away from the central computer chip core
5. **Game Over**: If any laser hits the center, the mission fails

## Features

### Mirror Types
- **Squares**: Basic reflective surfaces
- **Rectangles**: Larger reflective surfaces with different orientations
- **Right Triangles**: Angled surfaces for complex deflection patterns
- **Isosceles Triangles**: Symmetrical triangular mirrors

### Game Mechanics
- **Grid-Based Positioning**: Ensures strategic precision
- **Physics-Based Reflections**: Realistic laser bouncing
- **Multiple Spawners**: Lasers come from random edge positions
- **Collision Detection**: Accurate hit detection for all shapes
- **Visual Effects**: Glowing trails, powder blue drag indicators, neon styling

### Technical Features
- **Modular Architecture**: Clean separation of concerns
- **ES6 Modules**: Modern JavaScript structure
- **Responsive Design**: Works on desktop and mobile
- **Canvas Rendering**: Smooth 60fps gameplay
- **Grid Alignment System**: Perfect positioning for strategic gameplay

## Configuration

All game parameters can be adjusted in `js/config.js`:
- Canvas dimensions
- Grid size and mirror sizing
- Laser speed and physics
- Visual effect parameters
- Spawn rules and forbidden zones

## Browser Requirements

Requires a modern browser with ES6 module support (Chrome, Firefox, Safari, Edge).

## Development

The modular structure makes it easy to:
- Modify individual game components
- Add new mirror types or laser effects
- Adjust game physics and rules
- Test individual classes
- Extend functionality

Each class is self-contained and focused on a single responsibility, making the codebase maintainable and extensible.