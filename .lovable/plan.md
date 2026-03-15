
## Ce se construiește

Un buton **"Suggest Fix"** în `NodeInspector`, vizibil doar pe nodurile cu flags sau riskLevel `critical/high/medium`. Când e apăsat, face un call AI (non-streaming, prin edge function existentă `chat-repo-dual` sau o funcție nouă simplă) și returnează în limbaj natural:
1. **Care este exact problema** — bazată pe flags, complexity, coverage, semanticSummary
2. **Ce propunere concretă** are AI-ul pentru rezolvare

Rezultatul apare ca un drawer/panel expandabil direct în NodeInspector, sub secțiunea "Risk Flags".

---

## Abordare tehnică

### 1. Edge Function nouă: `suggest-fix`
Funcție simplă, non-streaming, care primește:
```json
{
  "node": { ...nodeData },
  "repoUrl": "github.com/owner/repo"
}
```
Și returnează:
```json
{
  "problem": "Explicație clară a problemei în limbaj natural",
  "suggestion": "Propunere concretă de rezolvare",
  "priority": "high | medium | low"
}
```

Folosește tool calling pentru a extrage structurat `problem` + `suggestion` (nu format JSON liber).

### 2. NodeInspector — buton + panel UI
- Buton **"✦ Suggest Fix"** (violet, lângă "RUN BLAST RADIUS") — vizibil dacă `flags.length > 0 || riskLevel !== 'none'`
- State: `fixState: 'idle' | 'loading' | 'done' | 'error'`
- Panel animat care apare sub Risk Flags cu:
  - Secțiunea **"⚠ Problema detectată"** — text roșu/portocaliu
  - Secțiunea **"✦ Propunere AI"** — text violet cu bullet points
  - Buton Copy

---

## Fișiere modificate

| Fișier | Schimbare |
|---|---|
| `supabase/functions/suggest-fix/index.ts` | Nouă edge function cu tool calling |
| `src/components/NodeInspector.tsx` | Buton + panel "Suggest Fix" |
| `supabase/config.toml` | Înregistrare funcție nouă |

---

## Schema vizuală

```text
NodeInspector (footer actions)
├── [RUN BLAST RADIUS]          ← existent
├── [VIEW SOURCE]               ← existent
└── [✦ SUGGEST FIX]            ← NOU — violet, activ pe noduri cu probleme

    ↓ după click

┌─────────────────────────────────┐
│ ⚠ PROBLEMĂ DETECTATĂ           │
│ "Modulul auth-middleware are    │
│  complexitate ridicată (16) și  │
│  acoperire scăzută de teste     │
│  (42%), crescând riscul de      │
│  regresii de securitate..."     │
│                                 │
│ ✦ PROPUNERE DE REZOLVARE       │
│ • Extrage logica de validare... │
│ • Adaugă teste unitare pentru   │
│   fiecare ramură de decizie...  │
│ • Consideră să separi...        │
└─────────────────────────────────┘
```

---

## Detalii prompt AI

Sistemul primește nodl complet (flags, complexity, coverage, semanticSummary, dependents) și returnează două câmpuri structurate prin tool calling — fără format liber. Răspunde în limba utilizatorului (română/engleză auto-detect pe baza `navigator.language`).
