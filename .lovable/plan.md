
## Goal
After the theme change (cyan → primary/indigo tokens), verify that **no functionality was broken** — add tests for all Dashboard features and remaining UI flows not yet covered.

## What the theme change actually touched
Only CSS class names (`text-cyan` → `text-primary`, `bg-cyan` → `bg-primary`, `border-cyan` → `border-primary`, etc.) and CSS variables in `index.css`. No logic, no props, no component structure changed.

## Existing test coverage (already passing)
| File | Covers |
|---|---|
| `graph.test.ts` | `calculateBlastRadius`, `detectCircularDeps` |
| `graphLayout.test.ts` | `computeHierarchicalLayout` |
| `securityAnalysis.test.ts` | `analyzeGraphSecurity` + findings sorting |
| `useCountUp.test.ts` | `useCountUp` hook animation |
| `Auth.test.tsx` | Login/signup/forgot password flows |
| `ResetPassword.test.tsx` | All 3 states: loading, expired, valid |
| `LandingPage.test.tsx` | Sign In button, hero text, ANALYZE button, repo chips |

## Gap — what is NOT tested yet

### Dashboard component
- Toolbar buttons render correctly
- View mode toggle (Topology / Treemap / Solar)
- Blast Radius active badge appears/clears
- Security overlay active badge appears/clears
- Ghost Mode badge appears/clears
- Search highlight badge appears/clears
- "New Repo" calls `onReset`
- Sign In button navigates to `/auth` when not logged in
- Account panel button opens when logged in

### SearchBar component
- Renders when `isOpen=true`, hidden when `false`
- Scoring: typing a query calls `onResults` with matching node IDs
- Clearing query calls `onResults` with empty set
- Escape / X closes via `onClose`

### StatsHUD component
- Renders all stat labels (FILES, HOTSPOTS, ORPHANS, etc.)
- Clicking a stat with matching nodes calls `onStatClick`
- Clicking already-active stat clears (toggle behavior)

### AccountPanel component
- Renders nothing when `isOpen=false`
- Renders user email when `isOpen=true` (mocked user)
- Sign out button calls `signOut`
- GitHub token input renders and accepts text

## Files to create

| File | What it tests |
|---|---|
| `src/test/Dashboard.test.tsx` | Toolbar renders, view mode toggle, overlay badges, Sign In nav, account button |
| `src/test/SearchBar.test.tsx` | Open/closed state, query → results, clear, close |
| `src/test/StatsHUD.test.tsx` | All stat labels render, click dispatches correct node IDs |
| `src/test/AccountPanel.test.tsx` | Closed → no content, open → email + sign out + token input |

## Mocking strategy (consistent with existing tests)
- `framer-motion` → passthrough proxy (same pattern as all other test files)
- `useAuth` → `vi.mock` returning controlled `{ user, signOut, profile, ... }`
- `react-router-dom` → `useNavigate` mocked via `vi.mock`
- `@/integrations/supabase/client` → `vi.mock` (for AccountPanel which calls `saveGithubToken`)
- `use-toast` → `vi.mock` returning `{ toast: vi.fn() }`
- Dashboard heavy child components (GraphCanvas, TreemapView, SolarSystemView, NodeInspector, etc.) → stubbed with `vi.mock` returning simple `<div data-testid="..." />`

## Key Dashboard test approach
Dashboard requires a `graph` prop. Use `mockGraph` from `@/data/mockGraph` — it's already used in `securityAnalysis.test.ts` and is the canonical realistic fixture.

```text
Dashboard
  ├── renders CodeAtlas brand text  ✓
  ├── renders 3 view mode buttons   ✓
  ├── clicking Treemap changes view  ✓
  ├── Sign In button (no user) → navigate('/auth')  ✓
  ├── user logged in → shows email chip, not Sign In  ✓
  ├── clicking New Repo calls onReset  ✓
  ├── blast radius badge hidden initially  ✓
  └── clicking Commands button opens CommandBar  ✓
```

## Total new tests: ~35 across 4 files
Combined with the existing 46, the suite will have **~81 tests** covering all major app flows.
