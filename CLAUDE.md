@AGENTS.md

# Project Rules

## ARCHITECTURE
- All Cognee backend calls go through ONE service file: `src/services/cognee.ts`. No screen or component calls the API directly.
- Screens in `src/screens/`, reusable components in `src/components/`, types in `src/types/`, config in `src/config.ts`.
- One responsibility per file. Keep files focused and small.

## CODE STYLE
- TypeScript strict. No `any` — define real types in `src/types/`.
- Functional components with hooks only. Named exports (except screen default exports).
- Every async API function returns a typed result and handles errors explicitly.

## PATTERNS
- Loading and error states are mandatory for every async UI action.
- No hardcoded URLs or secrets — everything goes in `src/config.ts`.
- Comment the *why*, not the *what*.

## PROCESS
- Before adding a feature, state your plan in 2-3 lines and wait for confirmation.
- One feature per change. After each change, state exactly what to test.
