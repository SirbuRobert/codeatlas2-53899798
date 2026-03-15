
## Analiza stării actuale

### Ce există deja (din iterațiile anterioare):
1. `fireWebhooks()` în `useAnalyzeRepo.ts` — există, cheamă `webhook-notify` după analiză ✓
2. `webhookResult` state expus din hook ✓
3. `useEffect` în `Index.tsx` care arată un toast când `webhookResult.sent > 0` ✓

### Problema reală:
Toastul din `Index.tsx` apare pe landing page, dar **după ce analiza se termină, user-ul este redirectat la `Dashboard`** — deci toastul nu e niciodată vizibil în Dashboard. Mai mult, edge function `webhook-notify` folosește `supabase.auth.getClaims(token)` care **nu există în supabase-js v2** — aceasta este metoda corectă `supabase.auth.getUser(token)` sau decodând manual JWT-ul. Asta face ca webhook-ul să întoarcă 401 mereu.

### Fix necesar:

**1. Edge function `webhook-notify/index.ts`** — înlocuiește `getClaims` (care nu există) cu `getUser`:
```ts
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) → return 401
const userId = user.id;
```

**2. `src/hooks/useAnalyzeRepo.ts`** — expune și `webhookResult` în return (deja există)

**3. `src/components/Dashboard.tsx`** — Dashboard nu primește nicio notificare că un webhook a plecat. Trebuie:
- Adaugă prop opțional `webhookResult` la Dashboard
- Adaugă un `useEffect` care afișează un toast vizibil în Dashboard (toast e globar prin Toaster, deci funcționează)
- Sau mai simplu: **mută logica de toast din `Index.tsx` să fie chemat și DUPĂ ce stage devine 'dashboard'**

De fapt cel mai simplu fix: problema e că toastul e chemat în `Index.tsx` dar componenta `Dashboard` e renderată în locul `LandingPage` — `Toaster` este montat în `App.tsx` deci toastul e global și AR trebui să apară. Să verific dacă `Toaster` e în `App.tsx`.

**Fluxul actual:**
- `analyze()` se termină → `fireWebhooks()` e fire-and-forget → setează `webhookResult`
- `useEffect` în `Index.tsx` detectează `webhookResult.sent > 0` → cheamă `toast()`
- Dar `setStage('dashboard')` → Dashboard se renderează
- Toasterul ar trebui să funcționeze dacă e în `App.tsx`...

**Concluzia reală:** Problema principală este că `webhook-notify` întoarce 401 pentru că `supabase.auth.getClaims` nu există. Fix-ul principal e în edge function. Secundar, adaugă un indicator vizual persistent în Dashboard (nu doar toast care dispare) — un badge "📡 Webhook dispatched" în toolbar.

### Plan de implementare:

**1. Fix `supabase/functions/webhook-notify/index.ts`**
- Înlocuiește `getClaims` cu `getUser` — asta fixează 401-ul
- Fix principal pentru ca webhook-ul să funcționeze efectiv

**2. Fix `src/pages/Index.tsx`**  
- Pasează `webhookResult` ca prop la `<Dashboard>` sau folosește un `ref` pentru a păstra rezultatul și a-l afișa după ce dashboard-ul e montat

**3. `src/components/Dashboard.tsx`**
- Adaugă prop `webhookResult?: { sent: number; results?: Array<{url: string; status: string}> } | null`
- Adaugă `useEffect` care cheamă `toast()` când `webhookResult?.sent > 0`
- Adaugă un badge persistent vizibil în toolbar: `📡 Webhook sent (N)` cu detalii — similar cu badge-urile BLAST/SECURITY existente, dispare la click

## Fișiere modificate

| Fișier | Ce se schimbă |
|---|---|
| `supabase/functions/webhook-notify/index.ts` | Înlocuiește `getClaims` cu `getUser` — fix principal |
| `src/pages/Index.tsx` | Pasează `webhookResult` la Dashboard |
| `src/components/Dashboard.tsx` | Primește `webhookResult` prop + toast + badge vizibil în toolbar |

## Vizual badge în toolbar

```text
Top bar Row 1 — după overlay badges existente:
┌─────────────────────────────────────────────────────┐
│ ⚡ BLAST — click to clear  │  📡 Webhook sent (1) ×  │
└─────────────────────────────────────────────────────┘
                                ^^ NOU — verde, dismissable
```

Badge apare imediat când webhook-ul e confirmat trimis, poate fi închis la click. Toastul rămâne ca notificare secundară.
