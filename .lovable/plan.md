
## Problema exactă

Stripe API `2025-08-27.basil` (versiunea foarte nouă folosită) a schimbat structura obiectului Subscription. `sub.current_period_end` poate fi `undefined` sau `null` în anumite contexte ale acestei versiuni, ceea ce face:

```ts
new Date(undefined * 1000).toISOString() // → throws "Invalid time value"
```

Funcția aruncă excepție → returnează 500 → frontend `catch` ignoră → `subscribed` rămâne `false` → apare Free plan deși plata a mers.

**Dovadă din logs:**
```
[CHECK-SUBSCRIPTION] User authenticated  ← ok
[CHECK-SUBSCRIPTION] ERROR - {"message":"Invalid time value"}  ← crash înainte să returneze subscribed:true
```

---

## Fix în 2 locuri

### 1. `supabase/functions/check-subscription/index.ts`

**Problema:** `sub.current_period_end` e undefined în API-ul nou.

**Fix:** Citim `subscriptionEnd` defensiv — dacă e undefined/null/NaN, setăm `null` în loc să aruncăm excepție. Adăugăm și log detaliat pentru `sub` ca să vedem structura exactă.

```ts
// Înainte (crash):
subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();

// După (defensiv):
const periodEnd = sub.current_period_end;
if (periodEnd && typeof periodEnd === 'number' && !isNaN(periodEnd)) {
  subscriptionEnd = new Date(periodEnd * 1000).toISOString();
} else {
  // Fallback: look in items or billing_cycle_anchor
  const anchor = sub.billing_cycle_anchor;
  subscriptionEnd = anchor ? new Date((anchor + 30 * 86400) * 1000).toISOString() : null;
}
```

**Tot fix-ul important:** Logăm și structura sub-ului la nivel de debug ca să vedem exact ce câmpuri returnează Stripe:
```ts
logStep("Subscription object keys", { keys: Object.keys(sub) });
```

### 2. `src/pages/Billing.tsx`

**Problema secundară:** Frontend-ul ignoră complet erorile din `check-subscription` (catch bloc gol `// ignore`).

**Fix:** Când funcția returnează eroare 500, logăm în consolă ca să putem debug mai ușor. Nu schimbăm comportamentul UI — rămâne pe Free în caz de eroare, corect.

```ts
} catch (e) {
  console.warn('[Billing] check-subscription error:', e);
}
```

---

## Fișiere modificate

1. `supabase/functions/check-subscription/index.ts` — fix defensiv pentru `current_period_end` + logging suplimentar
2. `src/pages/Billing.tsx` — log warning în catch ca să fie vizibil în devtools

---

## Flow după fix

```text
Checkout completat în Stripe Sandbox
         ↓
User revine pe /billing?success=true
         ↓
checkSubscription() apelat după 2s delay
         ↓
check-subscription function:
  - găsește customer după email ✓
  - găsește subscription active ✓  
  - citește current_period_end defensiv ✓ (nu mai crasha)
  - returnează { subscribed: true, product_id: "prod_U9UXjFYfVVytEE" }
         ↓
Frontend: setSubscribed(true) → afișează "PRO ACTIVE" ✓
```
