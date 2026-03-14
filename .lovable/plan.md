
## Problema: GitHub OAuth nu este suportat în Lovable Cloud

GitHub OAuth **nu este disponibil** ca provider în Lovable Cloud (suportă doar Google și Apple). Dar asta nu e o problemă — utilizatorul nu are nevoie de un login complet cu GitHub. Are nevoie de un **token GitHub** ca să acceseze repo-uri private.

**Soluția propusă: GitHub Personal Access Token (PAT) cu UX curat**

Edge function-ul deja acceptă un câmp `token` opțional. Tot ce lipsește este UI-ul pentru ca utilizatorul să-și adauge/salveze tokenul și să îl folosească la analiză.

---

## Ce construim

### 1. Modal „Connect GitHub" pe LandingPage
Un buton **CONNECT GITHUB** lângă câmpul de input. La click:
- Se deschide un mic modal/popover cu instrucțiuni clare:
  - Link direct la `github.com/settings/tokens/new` cu scope-urile necesare (`repo`)
  - Un câmp de input masked pentru PAT
  - Buton SAVE — tokenul se stochează în `localStorage` (nu în DB — nu e nevoie de auth)
- Când tokenul este setat, butonul devine verde cu un check: **✓ GitHub Connected**

### 2. Tokenul se trimite automat la analiză
`Index.tsx` → `handleAnalyze` → `analyze(url, token)` — tokenul din localStorage se injectează automat la fiecare analiză.

### 3. UX pentru repo privat
- Când un utilizator pune un repo privat fără token → eroarea de la GitHub API (`404`) declanșează un banner specific: **„This repo is private. Connect your GitHub token to unlock it."**
- Dacă tokenul e deja setat, analiza merge direct.

---

## Arhitectura

```
LandingPage
 ├─ GitHubTokenModal (nou, mic, popup)
 │   ├─ Instrucțiuni + link GitHub Settings
 │   ├─ Input (masked) pentru PAT
 │   └─ Save → localStorage.setItem('axon_gh_token', ...)
 │
 └─ handleSubmit → citește token din localStorage
                 → pasează la onAnalyze(url, token)

Index.tsx
 └─ handleAnalyze(url, token?)
     └─ analyze(url, token)   ← deja suportat în useAnalyzeRepo

LandingPage
 └─ Error state: dacă eroarea conține "private" → arată banner Connect GitHub
```

---

## Fișiere de modificat
- `src/components/LandingPage.tsx` — buton Connect GitHub, modal PAT, banner eroare privat, citire token la submit
- `src/pages/Index.tsx` — `handleAnalyze` primește token opțional, îl pasează la `analyze()`

**Niciun DB, niciun edge function, niciun secret nou.**
Token-ul stă în `localStorage` pe device-ul utilizatorului — nu pleacă nicăieri în afară de apelul direct la GitHub API din edge function.
