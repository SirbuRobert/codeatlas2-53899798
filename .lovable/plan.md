

## Problema

În `src/hooks/useAnalyzeRepo.ts`, linia 19:
```ts
churn: (raw.churn as number) ?? 20,
```

Când AI-ul analizează un repo și nu returnează explicit `churn` pentru un nod (câmpul nu e în `required` în schema), fallback-ul `?? 20` îl setează la `20` pentru toate nodurile. Dar de fapt, uneori AI-ul returnează `0` care e truthy pentru `??`, deci fallback nu s-ar activa... Problema reală e că AI-ul returnează literal `20` sau nu returnează deloc și fallback setează `20`.

## Soluția: 2 fix-uri

### 1. `src/hooks/useAnalyzeRepo.ts` — schimbă fallback-ul din `20` în `0`
```diff
- churn: (raw.churn as number) ?? 20,
+ churn: (raw.churn as number) ?? 0,
```
Astfel, dacă AI-ul omite câmpul, nodul arată `0` churn (neutru) în loc de `20` fals.

### 2. `supabase/functions/analyze-repo/index.ts` — adaugă `churn` în `required` și îmbunătățește instrucțiunile din prompt

Adaugă `"churn"` în array-ul `required` al schemei nodurilor (linia ~171), astfel AI-ul e forțat să genereze o valoare realistă pentru fiecare nod.

Îmbunătățește și descrierea câmpului `churn` în prompt:
```diff
- churn: { type: "number", description: "Change frequency estimate 0-100" },
+ churn: { type: "number", description: "Change frequency estimate 0-100. Base this on: how foundational the file is (core services = higher churn), how many features depend on it, and typical modification patterns. Entry points: 70-90. Core services: 40-80. Utilities: 5-20. Orphans: 0." },
```

## Fișiere de modificat

| Fișier | Schimbare |
|---|---|
| `src/hooks/useAnalyzeRepo.ts` | Fallback `?? 20` → `?? 0` |
| `supabase/functions/analyze-repo/index.ts` | `churn` adăugat în `required` + descriere mai detaliată |

