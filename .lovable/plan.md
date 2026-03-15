
## Two problems to fix

### 1. Sign In button still blocked — second overlay div
The top glow div at `LandingPage.tsx` line 251-254 also uses `absolute inset-0` (it covers the full page) without `pointer-events-none`. It sits over the top-right corner where the Sign In button lives. Fix: add `pointer-events-none` to it.

```diff
// line 252 — LandingPage.tsx
- className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-[0.06]"
+ className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-[0.06] pointer-events-none"
```

### 2. Auth button missing from Dashboard
`Dashboard.tsx` top bar has no Sign In / Account button. Users on a public repo analysis have no way to access their account. Fix: import `useAuth` + `AccountPanel` into Dashboard, add an auth button at the right end of the toolbar (after the "New Repo" button), mirroring the same logic as LandingPage.

```text
[CodeAtlas] [Topology|Treemap|Solar] [...mode badges...] [Search][Ask AI][Business View][Explain Repo][TOUR][Commands][Export][Plans][New Repo] | [Sign In / Account avatar]
```

## Files changed

| File | Change |
|---|---|
| `src/components/LandingPage.tsx` | Line 252 — add `pointer-events-none` to the glow div |
| `src/components/Dashboard.tsx` | Import `useAuth`, `AccountPanel`, `LogIn` — add auth button + `AccountPanel` to the toolbar |
