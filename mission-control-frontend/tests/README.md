# Autonomy System Test Suite

Comprehensive automated testing for the mission control autonomy system.

## Overview

This test suite covers all major autonomy features without modifying existing code. Tests document functionality, verify behavior, and track known issues.

## Test Structure

```
tests/
├── unit/                           # Unit tests (pure functions, utilities)
│   ├── coordinate-conversion.test.ts  # GPS/UTM/pixel conversions
│   ├── robot-position.test.ts         # ROS message parsing
│   └── map-transform-sync.test.ts     # Canvas/Three.js sync
├── integration/                    # Integration tests (ROS services, API)
│   ├── pathmap-crud.test.ts          # PathMap CRUD operations
│   └── path-recording.test.ts        # Path recording workflow
├── validation/                     # Known issues tracking
│   └── known-issues.test.ts          # 5 documented known issues
├── mocks/                          # Mock implementations
│   ├── rosMock.ts                    # ROS bridge mock
│   └── apiMock.ts                    # API mock
├── fixtures/                       # Test data
│   ├── test-coordinates.json         # GPS/map/pixel test points
│   ├── test-pathmap.json             # Sample PathMaps
│   └── test-ros-messages.json        # ROS message templates
└── setup.ts                        # Test environment setup
```

## Running Tests

### All Tests
```bash
npm test                    # Run all tests in watch mode
npm run test:run            # Run all tests once
```

### By Category
```bash
npm run test:unit           # Run unit tests only
npm run test:integration    # Run integration tests only
npm run test:validation     # Run known issues validation
```

### With UI
```bash
npm run test:ui             # Open Vitest UI in browser
```

### With Coverage
```bash
npm run test:coverage       # Run tests with coverage report
```

### Watch Mode
```bash
npm run test:watch          # Run tests in watch mode (auto-rerun on changes)
```

## Test Categories

### Unit Tests

**Coordinate Conversion** (`unit/coordinate-conversion.test.ts`)
- GPS (lat/lng) → UTM conversion
- UTM → map coordinates (affine transform)
- Map coordinates → pixel coordinates
- Complete pipeline (GPS → pixel)
- Edge cases and boundary conditions
- Path distance validation

**Robot Position** (`unit/robot-position.test.ts`)
- ROS `/mmr/meta_pose` message parsing
- GPS coordinates (latLng) extraction
- LIDAR map coordinates (mapXY) extraction
- Yaw extraction
- Default test position (0, 0) fallback
- Coordinate system conversions

**Map Transform Sync** (`unit/map-transform-sync.test.ts`)
- LIDAR overlay store state management
- Canvas pan/zoom calculations
- Three.js camera projection sync
- Offset/scale synchronization
- Coordinate space conversions
- Edge case handling

### Integration Tests

**PathMap CRUD** (`integration/pathmap-crud.test.ts`)
- Create GPS PathMap (frame: "utm")
- Create LIDAR PathMap (linked to LIDAR map)
- Create Non-RTK PathMap (custom frame)
- Fetch all PathMaps
- Fetch PathMap by ID
- Update paths and stations
- Delete PathMap
- Add boundaries and obstacles
- Frame reference filtering

**Path Recording** (`integration/path-recording.test.ts`)
- Start path recording (`/start_recording_path`)
- Stop path recording (`/stop_recording_path`)
- Path validation (minimum 3 points, 1 meter distance)
- Total distance calculation
- Error handling
- Different frame references

### Validation Tests

**Known Issues** (`validation/known-issues.test.ts`)
Documents 5 known issues (tests marked with `.fails()` - expected to fail until fixed):

1. **Station drag-drop on LIDAR map** (Medium severity)
   - Drag-drop works on Google Maps but not LIDAR map

2. **Boundary/obstacle mapping in LIDAR mode** (High severity)
   - Boundary/obstacle mapping fails in LIDAR mode

3. **Path recording in LIDAR mode** (High severity)
   - Path recording may have coordinate issues in LIDAR mode

4. **LIDAR 3D overlay alignment** (Low severity)
   - Minor precision issues at certain zoom levels

5. **Non-RTK coordinate conversion** (Medium severity)
   - Needs verification with real robot

## Test Fixtures

### `test-coordinates.json`
- Map config (resolution, origin, dimensions)
- 5 test points with known GPS/UTM/map/pixel values
- Path test data (valid/invalid paths)

### `test-pathmap.json`
- Sample GPS PathMap
- Sample LIDAR PathMap
- Sample Non-RTK PathMap
- Test missions

### `test-ros-messages.json`
- RobotMetaPose messages at different positions
- Service responses (success/failure)
- NDT scores

## Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../../src/util/yourUtil';

describe('Your Feature Tests', () => {
    it('should do something', () => {
        const result = yourFunction(input);
        expect(result).toBe(expected);
    });
});
```

### Integration Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockRosServiceCaller } from '../mocks/rosMock';

describe('Your Integration Tests', () => {
    let rosServiceCaller, setServiceResponse;

    beforeEach(() => {
        const mock = createMockRosServiceCaller();
        rosServiceCaller = mock.rosServiceCaller;
        setServiceResponse = mock.setServiceResponse;
    });

    it('should call ROS service', (done) => {
        setServiceResponse('/your/service', { success: true });

        rosServiceCaller('/your/service', 'Type', (result) => {
            expect(result.success).toBe(true);
            done();
        });
    });
});
```

## Known Issues Tracking

The validation tests document known issues without fixing them:

- Tests use `.fails()` marker (expected to fail)
- Each issue includes:
  - Description and severity
  - Affected components
  - Expected vs. current behavior
  - Possible causes
  - Workarounds
  - Testing steps

## Mocking

### ROS Bridge Mock
```typescript
import { createMockRosServiceCaller, createMockRosSubscribe } from '../mocks/rosMock';

// Mock service calls
const { rosServiceCaller, setServiceResponse } = createMockRosServiceCaller();
setServiceResponse('/service_name', { success: true });

// Mock topics
const { rosSubscribe, publishToTopic } = createMockRosSubscribe();
const subscriber = rosSubscribe('/topic', 'Type');
publishToTopic('/topic', message);
```

### API Mock
```typescript
import { createMockPathMapApi } from '../mocks/apiMock';

const api = createMockPathMapApi();
const pathMap = await api.createPathMapFn('name', 'owner', 'frame');
```

## CI/CD Integration

Tests are ready for CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run single test file
```bash
npx vitest run tests/unit/coordinate-conversion.test.ts
```

### Run tests matching pattern
```bash
npx vitest run -t "coordinate conversion"
```

### Debug mode
```bash
node --inspect-brk ./node_modules/.bin/vitest run
```

## Test Output

Tests generate:
- ✅ Pass/fail status for each test
- 📊 Coverage reports (text, JSON, HTML)
- 📝 Known issues documentation
- 🐛 Detailed error messages for failures

## Maintenance

- Add new tests when adding features
- Update fixtures when data changes
- Mark issues as resolved when fixed (remove `.fails()`)
- Keep mocks in sync with actual APIs
- Document new known issues

## Next Steps

1. ✅ Unit tests for coordinate conversions - **DONE**
2. ✅ Unit tests for robot position - **DONE**
3. ✅ Unit tests for map transform sync - **DONE**
4. ✅ Integration tests for PathMap CRUD - **DONE**
5. ✅ Integration tests for path recording - **DONE**
6. ⏳ Integration tests for mission execution - TODO
7. ⏳ Integration tests for LIDAR mode - TODO
8. ⏳ Integration tests for Non-RTK mode - TODO
9. ⏳ Integration tests for boundaries - TODO
10. ✅ Known issues validation - **DONE**

## Support

For questions or issues:
1. Check this README
2. Review test examples in `/tests`
3. Check Vitest documentation: https://vitest.dev/
