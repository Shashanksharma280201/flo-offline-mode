# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- TypeScript files use camelCase: `baseStationController.ts`, `userModel.ts`, `errorMiddleware.ts`
- React components use PascalCase: `Button.tsx`, `Navbar.tsx`, `ErrorBoundary.tsx`
- Test files use descriptive kebab-case: `proximity-detection.test.ts`, `pathmap-crud.test.ts`
- Lowercase for framework config: `vitest.config.ts`, `tsconfig.json`

**Functions:**
- camelCase for all functions: `getBaseStations`, `registerBaseStation`, `createPathMapFn`
- Descriptive names that indicate action: `fetchPathMaps`, `updatePathMapFn`, `handleResize`
- Async handlers prefixed with action verb: `asyncHandler`

**Variables:**
- camelCase for local variables: `baseStations`, `pathMapId`, `windowDimensions`
- Constants use SCREAMING_SNAKE_CASE (in constants directories)
- Boolean variables use `is`, `has`, or question form: `isDevelopment`, `hasOverlay`, `online`

**Types:**
- PascalCase for interfaces and types: `BaseStationData`, `PathMap`, `ButtonProps`
- Type definitions in same file or adjacent `.d.ts` file
- Suffix with descriptive term: `Data`, `Props`, `Schema`

## Code Style

**Formatting:**
- Tool: Prettier
- Backend settings: `semi: true`, `singleQuote: false`, `printWidth: 80`, `trailingComma: "none"`, `endOfLine: "lf"`
- Frontend settings: Same as backend plus `tabWidth: 4` and `plugins: ["prettier-plugin-tailwindcss"]`
- Consistent 2-space indentation in backend, 4-space in frontend

**Linting:**
- Backend: ESLint with Airbnb base config (`airbnb-base`, `airbnb-typescript/base`)
- Frontend: ESLint with Airbnb React config (`airbnb`, `airbnb/hooks`, `airbnb-typescript`)
- TypeScript parser with strict type checking enabled
- Prettier integration via `eslint-plugin-prettier`

## Import Organization

**Order:**
1. External framework imports: `import { Request, Response } from "express"`
2. Third-party packages: `import asyncHandler from "express-async-handler"`
3. Local models/types: `import baseStationModel from "../models/baseStationModel"`
4. Local utilities/services: `import { redisClient } from "../services/redis"`
5. Relative imports sorted by proximity

**Path Aliases:**
- Frontend uses `@/*` for `./src/*`: `import { cn } from "@/lib/utils"`
- Backend uses relative imports: `import logger from "../utils/logger"`
- No default exports in frontend (ESLint rule: `import/no-default-export: "error"`), allowed in backend

## Error Handling

**Patterns:**
- Backend uses `express-async-handler` wrapper for async routes
- Throw errors with descriptive messages: `throw new Error("Missing required request parameters")`
- Set status code before throwing: `res.status(400); throw new Error(...)`
- Centralized error middleware in `backend/middlewares/errorMiddleware.ts`
- Frontend uses try-catch with specific error types

**Example:**
```typescript
export const getBaseStations = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await baseStationModel.find();
    if (!data) {
      res.status(400);
      throw new Error("No Fleets Found");
    }
    res.status(200).json(data);
  }
);
```

## Logging

**Framework:** Winston (backend), console (frontend)

**Backend Patterns:**
- Use logger utility: `import logger from "../utils/logger"`
- Log levels: `error`, `warn`, `info`, `http`, `data`, `debug`
- Structured logging with context: `logger.info(\`[${label}]Heap Used: ${memoryUsage}\`)`
- File-based logging to `logs/` directory with date-stamped filenames
- Console output with color-coding and timestamps (Asia/Kolkata timezone)

**Frontend Patterns:**
- Console methods allowed (ESLint: `no-console: "off"`)
- Debug logging with `console.debug` for diagnostics
- Error logging with `console.error` for exceptions

## Comments

**When to Comment:**
- JSDoc for exported functions and complex logic
- Inline comments for non-obvious business logic
- TODO/FIXME for technical debt (rare in this codebase)

**JSDoc Style:**
```typescript
/**
 * Get Base Stations
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns Base stations
 */
```

**TypeScript-First:**
- Prefer strong typing over comments where possible
- Comment "why" not "what" - code should be self-documenting

## Function Design

**Size:**
- Controllers: 20-100 lines typical
- Utilities: 10-40 lines typical
- Keep functions focused on single responsibility

**Parameters:**
- Use object destructuring for multiple params: `const { mac, location, online } = req.body`
- Type all parameters explicitly
- Use optional parameters with defaults: `online=false`

**Return Values:**
- Explicit return types preferred but TypeScript inference allowed
- Async functions return Promises
- Controllers send JSON responses: `res.status(200).json(data)`
- Hooks return objects or arrays: `return { width, height }`

## Module Design

**Exports:**
- Named exports preferred in frontend: `export { Button, buttonVariants }`
- Backend uses both default and named exports
- One primary export per file (model, controller, etc.)

**Barrel Files:**
- Not heavily used
- Components export individually: `import { Button } from "@/components/ui/Button"`

## React Conventions

**Component Structure:**
- Functional components with hooks
- `forwardRef` for reusable UI components that need refs
- Props interfaces defined inline or just above component

**Hooks:**
- Custom hooks prefixed with `use`: `useWindowDimensions`, `usePathMaps`
- Place in `src/hooks/` directory or feature-specific `hooks/` subdirectory
- Return objects or arrays, not single primitives

**State Management:**
- Zustand for global state (stores in `src/stores/`)
- Local state with `useState` for component-specific data
- React Query for server state

## TypeScript Conventions

**Strict Mode:**
- `strict: true`, `noImplicitAny: true` in both projects
- All types must be explicit or properly inferred
- No `any` usage without suppressions

**Type Definitions:**
- Interfaces for object shapes: `interface ButtonProps`
- Type aliases for unions/primitives: `type VariantProps`
- Mongoose models export both schema and type: `export type BaseStationData`

**ESLint Overrides:**
- `no-param-reassign: "off"` (backend) - Mongoose operations
- `no-underscore-dangle: "off"` (backend) - MongoDB `_id` field
- `import/prefer-default-export: "off"` (both)
- `react-hooks/exhaustive-deps: "warn"` (frontend) - Not error

---

*Convention analysis: 2026-03-19*
