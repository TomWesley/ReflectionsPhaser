# REFLECTIONS - Development Guide for Claude

## Project Overview

**REFLECTIONS** is a geometric laser defense puzzle game built with vanilla JavaScript and HTML5 Canvas 2D API (no game engine).

### Core Game Objective
**PREVENT lasers from hitting the center core for as long as possible.**
- Longer survival time = BETTER score
- Time survived is the player's score (not "completion time")
- Use language like "Final Score", "Survival Time", never "Completed in"

### Game Modes
1. **Free Play**: Random mirror configurations with exactly 84 surface area units (uniform for fair scoring)
2. **Daily Challenge**: Date-based seeded puzzles with NO surface area limit (3-12 mirrors, any sizes), more spawners (6-10), unique mint green visual theme

---

## Coding Standards

### General Principles
- **No emojis** in code or UI unless explicitly requested by the user
- Use **iconoir icons** for all visual indicators throughout the game
- ES6 modules with import/export
- Object-oriented architecture with clear separation of concerns
- Prefer editing existing files over creating new ones

### File Operations Best Practices
- **Always use Read tool before editing** - never edit without reading first
- Use specialized tools over bash:
  - `Read` for reading files (not cat/head/tail)
  - `Edit` for modifying files (not sed/awk)
  - `Write` for creating files (not echo/cat with heredoc)
  - `Grep` for searching (not grep/rg commands)
  - `Glob` for file patterns (not find/ls)
- Only use Bash for actual terminal operations (git, npm, docker, etc.)

### Code Structure
- **Classes over functions** for game entities (Mirror, Laser, Spawner, etc.)
- Each class should have a single responsibility
- Use composition: GameRenderer delegates to specialized renderers
- Keep vertex calculations in the shape classes themselves
- Store canonical state (e.g., `this.vertices` array is source of truth for mirrors)

### Naming Conventions
- Classes: PascalCase (e.g., `GameRenderer`, `LaserCollisionHandler`)
- Files: PascalCase matching class name (e.g., `GameRenderer.js`)
- Methods: camelCase (e.g., `updateVertices()`, `checkCollision()`)
- Constants: UPPER_SNAKE_CASE in CONFIG object
- Folders: lowercase (e.g., `js/classes/`, `js/rendering/`)

### Mirror System
- **No grid snapping** - mirrors can be placed anywhere with pixel-perfect control
- **Forbidden zones**: Center circle + edge borders (check both vertices AND edges for overlap)
- **Validation**: Use `SimpleValidator` for free play (no grid alignment requirements)
- **Daily challenges**: Mirrors marked with `isDailyChallenge = true` for mint green glow

### Daily Challenge System
- **Seeded generation**: Date-based (YYYY-MM-DD) for worldwide consistency
- **No surface area limit**: Unlike free play's 84 units
- **Freeze frame**: Save mirrors AND lasers when core is hit, display exact final state on revisit
- **One attempt per day**: Store completion in localStorage
- **Visual distinction**: Mint green glow on mirrors/spawners, subtle canvas tint, "DAILY CHALLENGE" text

### Visual Design
- **Free Play colors**: Sunset theme (purple #8338EC, coral #FF8FA3, orange #FF6B35)
- **Daily Challenge colors**: Mint green theme (#32FFB4, #7FFFD4)
- **No emojis**: Use iconoir icons instead
- **Smooth animations**: Use Math.sin() for pulsing effects
- **Glows and shadows**: Canvas shadowBlur and shadowColor for effects

---

## Architecture Patterns

### Main Components
```
Game.js                 - Main game controller, orchestrates all systems
├── GameRenderer.js     - Rendering orchestrator
│   ├── GridRenderer.js
│   ├── TargetRenderer.js
│   ├── ZoneRenderer.js
│   └── ValidationRenderer.js
├── CollisionSystem.js  - Handles all collision detection
├── MirrorGenerator.js  - Generates mirror configurations
├── SpawnerGenerator.js - Generates laser spawners
└── GameModeManager.js  - Manages free play vs daily challenge
```

### State Management
- Game state lives in `Game.js` (mirrors, lasers, spawners, gameTime, etc.)
- Mode state in `GameModeManager.js`
- Daily challenge state in `DailyChallenge.js` with localStorage persistence
- No global state - pass dependencies explicitly

### Rendering Pipeline
1. Clear canvas
2. Draw background effects (mint tint for daily challenges)
3. Draw grid
4. Draw center target
5. Draw spawners
6. Draw mirrors (with glows if daily challenge)
7. Draw lasers (frozen or active)
8. Draw forbidden zones (setup phase only)
9. Draw validation violations (setup phase only)
10. Draw daily challenge indicator (if applicable)

---

## Testing Requirements

### Critical Test Areas
1. **Collision Detection**
   - Mirror-laser collisions
   - Laser-target collisions
   - Mirror overlap detection
   - Forbidden zone validation (vertices AND edges)

2. **Daily Challenge System**
   - Seeded random generation (same seed = same output)
   - Freeze frame save/load
   - Date-based uniqueness
   - localStorage persistence

3. **Mirror Placement**
   - Vertex calculation accuracy
   - Rotation handling
   - No overlap validation
   - Forbidden zone checks

4. **Validation System**
   - SimpleValidator: forbidden zones + overlap only
   - Edge intersection with forbidden zones
   - Mirror-to-mirror overlap

### Test Execution Workflow
**ALWAYS run tests after making code changes:**
```bash
npm test
```

If tests don't exist yet, create them in `/tests` directory with clear naming:
- `/tests/collision.test.js`
- `/tests/daily-challenge.test.js`
- `/tests/mirror-placement.test.js`
- `/tests/validation.test.js`

### Test Isolation
- Tests must NOT modify game state
- Use independent test data
- Mock localStorage for daily challenge tests
- Each test file should be runnable independently

---

## Development Workflow

### Before Writing Code
1. Understand the game objective (prevent lasers from hitting center)
2. Read relevant existing code
3. Check if similar functionality exists elsewhere
4. Plan changes to maintain architectural consistency

### When Writing Code
1. Use TodoWrite tool to track tasks
2. Read files before editing (mandatory)
3. Maintain existing code style
4. Update vertices after modifying mirror properties
5. Mark daily challenge objects with appropriate flags

### After Writing Code
1. **Run all tests** - `npm test`
2. Fix any failing tests
3. Add new tests for new functionality
4. Test in browser for visual/gameplay changes
5. Check console for errors/warnings

### Git Workflow
- Only commit when user explicitly requests
- Never use `--amend` unless user requests or adding pre-commit hook edits
- **Pre-commit hook installed**: Tests run automatically before every commit
  - If tests fail, commit is blocked
  - Fix failing tests before committing
  - Hook located at `.git/hooks/pre-commit`
- Include meaningful commit messages
- Use format:
  ```
  Brief description of changes

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

---

## Common Patterns

### Creating a New Mirror
```javascript
const mirror = MirrorCreationHelper.createMirror(x, y, shape);
mirror.size = 40;
mirror.width = 40;
mirror.height = 40;
mirror.rotation = 0;
mirror.updateVertices();  // Always call after property changes
```

### Checking Forbidden Zones
```javascript
// Check both vertices AND edges
for (let vertex of mirror.vertices) {
    if (MirrorPlacementValidation.isPointInForbiddenZone(vertex)) {
        return { valid: false, reason: 'Mirror vertex in forbidden zone' };
    }
}

// Check edge intersections
for (let i = 0; i < vertices.length; i++) {
    const next = (i + 1) % vertices.length;
    if (MirrorPlacementValidation.doesLineIntersectForbiddenZone(
        vertices[i], vertices[next]
    )) {
        return { valid: false, reason: 'Mirror edge crosses forbidden zone' };
    }
}
```

### Daily Challenge Seeding
```javascript
const today = DailyChallenge.getTodayString(); // YYYY-MM-DD
const rng = new SeededRandom(today);
const randomValue = rng.nextFloat(0, 100);
const randomChoice = rng.choice(['a', 'b', 'c']);
```

### Saving Daily Challenge State
```javascript
DailyChallenge.markCompleted(gameTime, timeString, mirrors, lasers);
// Saves to localStorage: daily_challenge_YYYY-MM-DD, daily_mirrors_YYYY-MM-DD, daily_lasers_YYYY-MM-DD
```

---

## Performance Considerations

- Canvas operations are expensive - minimize draw calls
- Use `ctx.save()` and `ctx.restore()` to isolate rendering state
- Cache calculated values (e.g., vertices) rather than recalculating
- Limit trail lengths (e.g., 80 points max for laser trails)
- Use `requestAnimationFrame` for smooth 60fps rendering

---

## Common Pitfalls to Avoid

1. **Don't forget to call `updateVertices()`** after changing mirror properties
2. **Don't check only vertices** for forbidden zones - check edges too
3. **Don't use "completed"** language for scores - it's survival time (longer = better)
4. **Don't add emojis** without explicit user request
5. **Don't create new files** when you can edit existing ones
6. **Don't skip reading files** before editing
7. **Don't forget to run tests** after code changes
8. **Don't modify global state** - keep state in appropriate managers

---

## Quick Reference

### Key Files
- `js/classes/Game.js` - Main game controller
- `js/validation/SimpleValidator.js` - Free play validation (no grid snapping)
- `js/validation/DailyChallenge.js` - Daily challenge generation and persistence
- `js/rendering/GameRenderer.js` - Main rendering orchestrator
- `js/config.js` - Game configuration constants

### Key Constants (CONFIG)
- `CANVAS_WIDTH: 800`, `CANVAS_HEIGHT: 600`
- `GRID_SIZE: 20` (visual only, no snapping)
- `TARGET_RADIUS: 50` (center forbidden zone)
- `EDGE_MARGIN: 40` (edge forbidden zones)
- `LASER_SPEED: 2.64`

### Testing Commands
```bash
npm test              # Run all tests
npm test -- --watch   # Run tests in watch mode
```

---

Remember: The goal is to help players **survive as long as possible** by strategically placing mirrors to deflect lasers away from the center core!
