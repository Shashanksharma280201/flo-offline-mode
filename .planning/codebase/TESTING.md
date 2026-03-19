# Testing Patterns

**Analysis Date:** 2026-03-19

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts` in mission-control-frontend root

**Assertion Library:**
- Vitest native assertions (`expect`, `describe`, `it`, `beforeEach`, `afterEach`)
- `@testing-library/jest-dom` for DOM assertions

**Run Commands:**
```bash
npm test                    # Run tests in watch mode
npm run test:ui            # Launch Vitest UI
npm run test:run           # Run all tests once
npm run test:coverage      # Generate coverage report
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:validation    # Run validation tests only
npm run test:watch         # Watch mode
```

## Test File Organization

**Location:**
- Tests in dedicated `tests/` directory (not co-located)
- Subdirectories: `tests/unit/`, `tests/integration/`, `tests/validation/`
- Setup file: `tests/setup.ts`
- Mocks: `tests/mocks/`
- Fixtures: `tests/fixtures/`

**Naming:**
- Pattern: `{feature-name}.test.ts` or `{feature-name}.test.tsx`
- Descriptive kebab-case: `proximity-detection.test.ts`, `pathmap-crud.test.ts`
- Unit tests: `coordinate-conversion.test.ts`, `lidar-operations.test.ts`
- Integration tests: `path-recording.test.ts`

**Structure:**
```
tests/
├── setup.ts
├── mocks/
│   ├── apiMock.ts
│   └── rosMock.ts
├── fixtures/
│   ├── test-coordinates.json
│   ├── test-pathmap.json
│   └── test-ros-messages.json
├── unit/
│   ├── proximity-detection.test.ts
│   ├── coordinate-conversion.test.ts
│   └── robot-position.test.ts
├── integration/
│   ├── pathmap-crud.test.ts
│   └── path-recording.test.ts
└── validation/
    └── known-issues.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('Feature Name Tests', () => {
    describe('Subfeature/Scenario', () => {
        it('should do specific thing', () => {
            // Arrange
            const input = setupData();

            // Act
            const result = performAction(input);

            // Assert
            expect(result).toBe(expected);
        });
    });
});
```

**Patterns:**
- Nested `describe` blocks for logical grouping
- Clear test names: `'should calculate distance using Google Maps overlay API'`
- Arrange-Act-Assert structure (implicit, not commented)
- Edge cases in dedicated `describe('Edge Cases')` block
- Parametric testing with `forEach`: `testScenarios.forEach(scenario => { it(...) })`

**Example:**
```typescript
describe('Proximity Detection Tests', () => {
    describe('Google Maps Mode (GPS/Odom)', () => {
        it('should calculate distance using Google Maps overlay API', () => {
            const mockOverlay = { /* mock implementation */ };
            const station = { lat: 12.9716, lng: 77.5946 };
            const robotLatLng = { lat: 12.97160045, lng: 77.5946 };

            const distance = calculateDistance(station, robotLatLng);

            expect(distance).toBeLessThan(1.0);
        });
    });
});
```

## Mocking

**Framework:** Vitest `vi.fn()` and `vi.mock()`

**API Mocking Pattern:**
```typescript
import { vi } from 'vitest';

export const createMockPathMapApi = () => {
    let pathMaps = [...mockPathMaps];

    const createPathMapFn = vi.fn(async (name, owner, frame) => {
        const newPathMap = { /* create mock */ };
        pathMaps.push(newPathMap);
        return { createdPathMap: newPathMap };
    });

    return {
        createPathMapFn,
        fetchPathMaps: vi.fn(async () => pathMaps),
        reset: () => { pathMaps = []; }
    };
};
```

**Browser API Mocking (in `tests/setup.ts`):**
```typescript
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        /* ... */
    }))
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
} as any;
```

**What to Mock:**
- External APIs (Google Maps, backend endpoints)
- Browser APIs (matchMedia, IntersectionObserver, ResizeObserver, Canvas)
- WebGL/Three.js contexts (Canvas.getContext)
- Complex dependencies (ROS, MQTT)

**What NOT to Mock:**
- Pure functions (coordinate calculations, distance formulas)
- Simple utilities
- Type definitions
- Business logic under test

## Fixtures and Factories

**Test Data:**
- JSON fixtures in `tests/fixtures/`: `test-pathmap.json`, `test-coordinates.json`
- Inline factories in mock files: `createMockPathMapApi()`
- Auto-incrementing IDs: `id: \`pathmap-${idCounter++}\``

**Location:**
- `tests/fixtures/` for static JSON data
- `tests/mocks/` for factory functions

**Example Factory:**
```typescript
export const createMockPathMapApi = () => {
    let pathMaps = [...mockPathMaps];
    let idCounter = 1;

    const createPathMapFn = vi.fn(async (name, owner, frame, lidarMapName?) => {
        const newPathMap: PathMap = {
            id: `pathmap-${idCounter++}`,
            name,
            owner,
            frame,
            lidarMapName: lidarMapName || null,
            stations: [],
            paths: {},
            boundaries: [],
            obstacles: [],
            missions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        pathMaps.push(newPathMap);
        return { createdPathMap: newPathMap };
    });

    return { createPathMapFn, /* other methods */ };
};
```

## Coverage

**Requirements:** Not enforced (no minimum threshold configured)

**View Coverage:**
```bash
npm run test:coverage
```

**Configuration:**
- Provider: `v8`
- Reporters: `['text', 'json', 'html']`
- Excluded:
  - `node_modules/`
  - `tests/`
  - `**/*.d.ts`
  - `**/*.config.*`
  - `**/mockData`
  - `dist/`

## Test Types

**Unit Tests:**
- Scope: Pure functions, calculations, transformations
- Location: `tests/unit/`
- Examples: Distance calculations, coordinate conversions, LIDAR operations
- No external dependencies or I/O

**Integration Tests:**
- Scope: Multi-component workflows, API interactions
- Location: `tests/integration/`
- Examples: PathMap CRUD operations, path recording workflows
- Mock external services but test integration between internal modules

**Validation Tests:**
- Scope: Known issue regression tests, edge cases
- Location: `tests/validation/`
- Examples: Known bugs, boundary conditions
- Used to prevent regressions

**E2E Tests:**
- Framework: Not currently used
- Future consideration: Playwright or Cypress

## Common Patterns

**Async Testing:**
```typescript
it('should create PathMap with frame "utm"', async () => {
    const result = await api.createPathMapFn('Test GPS PathMap', 'user-1', 'utm');

    expect(result.createdPathMap).toBeDefined();
    expect(result.createdPathMap.frame).toBe('utm');
});
```

**Error Testing:**
```typescript
it('should throw error when fetching non-existent PathMap', async () => {
    await expect(api.fetchPathMapById('non-existent-id')).rejects.toThrow(
        'PathMap with id non-existent-id not found'
    );
});
```

**Precision Testing:**
```typescript
it('should calculate Euclidean distance using x/y coordinates', () => {
    const distance = Math.sqrt(dx * dx + dy * dy);
    expect(distance).toBeCloseTo(0.583, 2); // 2 decimal places
});
```

**Boundary Testing:**
```typescript
it('should handle exact 1m distance as boundary case', () => {
    const distance = 1.0;
    expect(distance < 1.0).toBe(false); // At exactly 1.0m, should NOT trigger
});
```

**Parametric Testing:**
```typescript
const testScenarios = [
    { mode: 'google' as const, description: 'GPS mode' },
    { mode: 'lidar' as const, description: 'LIDAR mode' }
];

testScenarios.forEach(scenario => {
    it(`should detect proximity in ${scenario.description}`, () => {
        // Test logic using scenario
    });
});
```

**beforeEach Pattern:**
```typescript
describe('PathMap CRUD Integration Tests', () => {
    let api: ReturnType<typeof createMockPathMapApi>;

    beforeEach(() => {
        api = createMockPathMapApi();
    });

    it('should create GPS PathMap', async () => {
        const result = await api.createPathMapFn('Test', 'user-1', 'utm');
        expect(result.createdPathMap).toBeDefined();
    });
});
```

## Backend Testing

**Status:** No test suite detected in mission-control backend

**Test Script:** `package.json` has `"test": "echo \"Error: no test specified\" && exit 1"`

**Recommendation:** Backend currently relies on manual testing and production monitoring

## Setup and Teardown

**Global Setup (`tests/setup.ts`):**
- Import `@testing-library/jest-dom` for DOM matchers
- Configure cleanup after each test: `afterEach(() => cleanup())`
- Mock browser APIs globally (matchMedia, IntersectionObserver, ResizeObserver, Canvas)
- One-time setup, imported in `vitest.config.ts`

**Per-Test Setup:**
- Use `beforeEach` to reset state
- Create fresh mocks/factories in each test
- Clean up subscriptions/timers in `afterEach` if needed

---

*Testing analysis: 2026-03-19*
