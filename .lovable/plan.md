
## Root cause

`src/components/LandingPage.tsx` linia 244 — div-ul grid background are `absolute inset-0` fără `pointer-events-none`. Interceptează toate mouse event-urile, inclusiv click-ul pe butonul Sign In din colțul dreapta sus (care are `z-10` dar problema nu e z-index, ci pointer events).

## Fix

O singură schimbare:

```diff
- className="absolute inset-0 opacity-[0.03]"
+ className="absolute inset-0 opacity-[0.03] pointer-events-none"
```

## Fișier de modificat

| Fișier | Linie | Schimbare |
|---|---|---|
| `src/components/LandingPage.tsx` | 244 | Adaugă `pointer-events-none` pe div-ul grid background |
