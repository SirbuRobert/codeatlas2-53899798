
## Overview

The user wants a comprehensive unit/integration test suite for the whole app — not just auth. The tests need to cover:

1. **Auth flow** — Sign In button navigates to `/auth`, forgot password flow, reset password page
2. **Core algorithms** — `calculateBlastRadius`, `detectCircularDeps` in `graph.ts`
3. **Graph layout** — `computeHierarchicalLayout` in `graphLayout.ts`
4. **Security analysis** — `analyzeGraphSecurity` in `securityAnalysis.ts`
5. **Hooks** — `useCountUp`, `useAnalyzeRepo` (mocked), `useAuth` (mocked)
6. **Pages** — `Auth.tsx` (renders tabs, forgot link, form submission), `ResetPassword.tsx` state transitions
7. **Landing Page** — Sign In button renders and is clickable, navigates to `/auth`

All tests use the **existing vitest + jsdom + @testing-library/react** setup already in place. No new dependencies needed.

## Files to create

| File | What it tests |
|---|---|
| `src/test/graph.test.ts` | `calculateBlastRadius`, `detectCircularDeps` pure functions |
| `src/test/graphLayout.test.ts` | `computeHierarchicalLayout` — empty graph, single node, multi-layer, circular |
| `src/test/securityAnalysis.test.ts` | `analyzeGraphSecurity` — exposed APIs, unprotected DB, auth chains |
| `src/test/useCountUp.test.ts` | `useCountUp` hook — initial value, animates toward target |
| `src/test/Auth.test.tsx` | Auth page renders login/signup tabs, "Forgot password?" link switches view, form fields present |
| `src/test/ResetPassword.test.tsx` | ResetPassword renders loading state, handles invalid session display |
| `src/test/LandingPage.test.tsx` | Sign In button is rendered and calls navigate('/auth') when clicked |

## Mocking strategy

- **Supabase client** (`@/integrations/supabase/client`) — vi.mock to prevent real network calls
- **React Router** (`react-router-dom`) — `MemoryRouter` wrapper for page-level tests + vi.mock `useNavigate`
- **framer-motion** — vi.mock with passthrough div to avoid animation issues in jsdom
- **`useAuth` hook** — vi.mock to return controlled `{ user: null, loading: false, signIn, signUp, resetPassword, ... }`

## Key test scenarios

**graph.test.ts** (pure functions, no mocking needed):
- `calculateBlastRadius` returns correct upstream/downstream sets given a known edge list
- `calculateBlastRadius` stops at max depth
- `detectCircularDeps` returns empty array for DAG; returns cycle for A→B→A

**graphLayout.test.ts**:
- Empty graph → empty Map
- Single node → position `{x:0, y:0}`
- Two connected nodes → different y layers
- All nodes get assigned a position

**securityAnalysis.test.ts** using `mockGraph`:
- `analyzeGraphSecurity(mockGraph)` returns `securityNodeIds` containing `auth-service`, `jwt-util`, `auth-middleware`
- Exposed API findings appear for `api-gateway` (it has no auth guard upstream)
- Severity is sorted correctly

**useCountUp.test.ts**:
- Returns target value eventually (after settling)
- Starts with the initial target value

**Auth.test.tsx**:
- Renders "SIGN IN" and "SIGN UP" tabs
- "Forgot password?" link is visible on login tab
- Clicking "Forgot password?" shows the "RESET PASSWORD" header
- Shows error when sign in fails

**ResetPassword.test.tsx**:
- Renders loading spinner when `validSession === null`
- Shows "Link expired" message when `validSession === false`
- Renders password form when `validSession === true`

**LandingPage.test.tsx**:
- "Sign In" button is present in the DOM when user is null
- Clicking "Sign In" calls `navigate('/auth')`

## Technical notes

- `LandingPage` uses `useNavigate` internally, so the test will wrap with `MemoryRouter` and mock `navigate`
- Auth page uses `useAuth` which calls Supabase, so that's mocked at module level
- `framer-motion` can be mocked as `{ motion: { div: 'div', form: 'form' }, AnimatePresence: ({ children }) => children }` to prevent issues with jsdom
- The test for the Sign In button z-index fix is behavioral: the button is present in the DOM with no overlapping pointer-events blocker — this is validated by the click handler firing
