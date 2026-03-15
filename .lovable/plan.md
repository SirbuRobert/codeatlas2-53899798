
## What needs to be built

A full forgot password + reset password flow in 3 steps:

1. **"Forgot password?" link** on the login tab in `src/pages/Auth.tsx` — switches to a `forgot` view inside the same card (no new route needed)
2. **Forgot view** inside `Auth.tsx` — email input + "Send reset link" button that calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: window.location.origin + '/reset-password'`, then shows a "Check your email" confirmation state
3. **`/reset-password` page** — new `src/pages/ResetPassword.tsx` registered in `App.tsx` at `/reset-password`. Detects the `type=recovery` hash fragment, shows a new password form, calls `supabase.auth.updateUser({ password })`, then redirects to `/auth` on success

## Files to modify/create

| File | Change |
|---|---|
| `src/pages/Auth.tsx` | Add `'forgot'` to the Tab type, add forgot view state + form + confirmation, add "Forgot password?" link under password field on login tab |
| `src/pages/ResetPassword.tsx` | New page — detects recovery session, new password form, updateUser call |
| `src/App.tsx` | Register `<Route path="/reset-password" element={<ResetPassword />} />` |
| `src/hooks/useAuth.ts` | Add `resetPassword(email)` helper that calls `supabase.auth.resetPasswordForEmail` |

## UI design

The forgot flow lives **inside the existing Auth card** — same visual style, same font-mono aesthetic. It replaces the form content via `AnimatePresence` just like the signup confirmation already does. No extra pages needed for this view.

The ResetPassword page reuses the exact same card layout, background grid, and brand header as Auth.tsx for visual consistency.
