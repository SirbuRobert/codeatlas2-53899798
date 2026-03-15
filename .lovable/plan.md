
## Problema

`OnboardingTour` are clasa `fixed bottom-24 left-1/2 -translate-x-1/2 w-[500px] z-50` — deci e centrat pe ecran. NodeInspector și celelalte panouri (AI Summary, Business Insights, Chat) apar în **dreapta**, deci tour-ul se suprapune cu ele.

## Fix

Schimb poziționarea din centrat → ancorare în **stânga**, cu un offset fix de la marginea stângă:

```diff
- className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[500px] z-50"
+ className="fixed bottom-24 left-6 w-[460px] z-50"
```

`left-6` = 24px de la marginea stângă — suficient să nu fie tăiat de nimic. Lățimea redusă ușor la `460px` pentru a se încadra bine pe ecrane de 1280px fără să se apropie prea mult de centru.

Animația `y` rămâne neschimbată. Nicio altă modificare necesară.

## Fișier de modificat

| Fișier | Linie | Schimbare |
|---|---|---|
| `src/components/OnboardingTour.tsx` | 232 | `left-1/2 -translate-x-1/2 w-[500px]` → `left-6 w-[460px]` |
