# REFLECTIONS Test Suite

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

## Test Structure

Tests are organized by functionality:

- **`seeded-random.test.js`** - Tests for deterministic random generation
- **`daily-challenge.test.js`** - Tests for date-based puzzle generation and persistence
- **`validation.test.js`** - Tests for mirror placement validation and forbidden zones

## Writing New Tests

### Basic Test Structure

```javascript
import { describe, test, assert } from './run-tests.js';

describe('Feature Name', () => {
    test('should do something specific', () => {
        const result = someFunction();
        assert.equal(result, expected, 'Description of what should happen');
    });
});
```

### Available Assertions

- `assert.equal(actual, expected, message)` - Strict equality (===)
- `assert.notEqual(actual, expected, message)` - Strict inequality (!==)
- `assert.ok(value, message)` - Truthy check
- `assert.deepEqual(actual, expected, message)` - Deep object/array comparison
- `assert.throws(fn, message)` - Check if function throws error

### Example Test

```javascript
describe('Mirror Placement', () => {
    test('mirrors should have vertices', () => {
        const mirror = createMirror(100, 100, 'square');
        assert.ok(mirror.vertices, 'Mirror should have vertices array');
        assert.ok(mirror.vertices.length > 0, 'Vertices array should not be empty');
    });

    test('vertices should update on rotation', () => {
        const mirror = createMirror(100, 100, 'square');
        const originalVertices = [...mirror.vertices];

        mirror.rotation = 45;
        mirror.updateVertices();

        assert.notEqual(
            JSON.stringify(mirror.vertices),
            JSON.stringify(originalVertices),
            'Vertices should change after rotation'
        );
    });
});
```

## Testing Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Mock external dependencies** - Use mock localStorage, mock CONFIG, etc.
3. **Test one thing at a time** - Clear, focused test cases
4. **Use descriptive names** - Test names should explain what they verify
5. **Include edge cases** - Test boundary conditions
6. **Test failure cases** - Not just happy paths

## Coverage Goals

### Critical Areas to Test

- [x] Seeded random generation (deterministic)
- [x] Daily challenge generation consistency
- [x] Daily challenge localStorage persistence
- [x] Forbidden zone validation
- [ ] Mirror-laser collision detection
- [ ] Mirror overlap detection
- [ ] Laser reflection physics
- [ ] Target collision detection
- [ ] Mirror vertex calculations
- [ ] Edge-forbidden zone intersection

## Running Specific Tests

To run a specific test file, you can modify `run-tests.js` or directly import:

```bash
node tests/seeded-random.test.js  # Won't work directly - needs runner
```

Instead, temporarily comment out other imports in `run-tests.js`.

## Debugging Tests

Add console logs in your test:

```javascript
test('debug example', () => {
    const value = someFunction();
    console.log('Debug value:', value);  // Will appear in test output
    assert.equal(value, expected);
});
```

## CI/CD Integration

These tests are designed to run in Node.js and can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test
```

## Adding Mocks

When testing browser-specific code, add mocks at the top of your test file:

```javascript
// Mock localStorage
global.localStorage = {
    storage: {},
    getItem(key) { return this.storage[key] || null; },
    setItem(key, value) { this.storage[key] = value; },
    clear() { this.storage = {}; }
};

// Mock Canvas context
global.CanvasRenderingContext2D = class {
    fillRect() {}
    strokeRect() {}
    // ... other methods
};
```

## Test Output

Passing tests show green checkmarks:
```
✓ Same seed produces same sequence
✓ Different seeds produce different sequences
```

Failing tests show red X with details:
```
✗ Should calculate correctly
  Expected: 42
  Actual:   43
```

## Questions?

Refer to `.claude/claude.md` for full development guidelines and coding standards.
