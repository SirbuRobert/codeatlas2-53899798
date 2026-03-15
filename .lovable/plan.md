
## What the user wants

Two things:
1. **Auth system** — sign up / log in, with a profile page where users can store their GitHub PAT (replacing the current localStorage-only flow)
2. **Billing page fix** — remove Enterprise, move current Pro features → Free, move current Enterprise features → Pro

---

## Auth system design

No complex user data needed beyond the GitHub token, so: `profiles` table with `github_token` column (encrypted at rest by Postgres).

### Database migration
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_token text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### New files / pages

| File | Purpose |
|---|---|
| `src/hooks/useAuth.ts` | Supabase auth state + profile helpers |
| `src/pages/Auth.tsx` | Sign up / Log in page (tabs) |
| `src/components/AccountPanel.tsx` | Slide-out drawer: avatar/email, GitHub token field, log out |

### Flow

1. App wraps with an `AuthProvider` (or inline hook) — `onAuthStateChange` listener
2. LandingPage shows avatar/login button in top-right corner (user-circle icon)
3. Clicking it opens `AccountPanel` if logged in, navigates to `/auth` if not
4. `AccountPanel` has a GitHub Token section — loads from `profiles` table, saves back on change
5. When `analyze` is called in `Index.tsx`, token is read **from the profile** (falling back to localStorage for guests)
6. Route `/auth` — public, email/password signup + login with tabs

### Token handling improvement
- If user is logged in: read `github_token` from `profiles` table via `useAuth`
- If guest: fall back to `localStorage` (existing behavior preserved)

---

## Billing page redesign

Current → New:
- **Free** keeps price $0, gets what Pro has now (unlimited analyses, private repos, all views, AI summaries, etc.) but **without** multi-repo — making it a generous free tier
- **Pro** ($29) gets what Enterprise has now (team dashboards, SSO, RBAC, audit logs, priority support + SLA, dedicated success manager) — reframed as "Pro" not "Enterprise"
- Enterprise card: **removed entirely** — only 2 cards remain

New `PLANS` array:

```ts
Free: [
  'Unlimited repo analyses',
  'Public repos',
  'All views (Topology, Solar, Treemap)',
  'AI semantic summaries',
  'Blast Radius & Security Topology',
  'Business Insights panel',
  'GitHub PAT for private repos',
  'Community support',
]

Pro ($29): [
  'Everything in Free',
  '✦ Multi-Repo Analysis',
  'Team dashboards',
  'SSO / SAML integration',
  'Role-based access control',
  'Audit logs',
  'Priority support + SLA',
  'Dedicated success manager',
]
```

---

## Files to create / modify

| File | Action |
|---|---|
| DB migration | `profiles` table + RLS + trigger |
| `src/hooks/useAuth.ts` | New — auth state + profile load/save |
| `src/pages/Auth.tsx` | New — login/signup page |
| `src/components/AccountPanel.tsx` | New — slide-out account drawer |
| `src/App.tsx` | Add `/auth` route |
| `src/pages/Index.tsx` | Read github_token from profile when logged in |
| `src/components/LandingPage.tsx` | Add user avatar/login button in header |
| `src/pages/Billing.tsx` | Redesign PLANS (2 cards, no Enterprise) |
