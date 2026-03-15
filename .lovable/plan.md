
## Analiză completă

### Probleme identificate

**1. GitHub API rate limit (principala cauza erorii)**
- `analyze-repo` face 3-4 request-uri GitHub la fiecare analiză (repo info, contributors, file tree, 10-14 file contents). Fără token: limita e 60 req/oră per IP. Edge functions rulează pe IP-uri partajate — un singur utilizator activ poate epuiza întreaga cotă a serverului.
- Nu există nici un delay/retry între fetch-urile de conținut fișiere — `Promise.all()` trimite 14 request-uri simultan, consumând rapid rata.

**2. Nicio limitare per user** pe `analyze-repo`
- Un utilizator (sau bot) poate triggera zeci de analize consecutive fără restricție.

**3. `public-analyze` este complet neprotejat**
- Zero autentificare, zero rate limit. Oricine poate abuza endpoint-ul public și epuiza githubul serverului.

**4. GitHub file fetches sunt în `Promise.all`**
- 14 request-uri simultane → dacă IP-ul serverului are 60 req/oră, o singură analiză consumă ~17 din ele instant.

---

### Plan de implementare

#### Fix 1 — `analyze-repo/index.ts`: Serial fetch + retry cu exponential backoff pentru GitHub

Înlocuiesc `Promise.all` pentru file contents cu fetch serial în batch-uri de 3, cu 300ms delay între batch-uri. Adaug retry (max 2 încercări) cu 1s delay pe 429/403.

```text
fetchFileContent (14 files) cu Promise.all
        ↓
batchFetch (batch size=3, delay=300ms între batch-uri)
  + retry 2x cu 1s delay pe 429/403
```

#### Fix 2 — `analyze-repo/index.ts`: Per-user rate limit în memorie

Deoarece Edge Functions sunt stateless, folosesc un Map în-memorie cu sliding window:
- **Per user (JWT sub)**: max 5 analize / 15 minute
- **Per IP (fallback fără auth)**: max 3 analize / 15 minute

```text
Req → extract userId sau IP → check Map → dacă depășit → 429
```

Aceasta este suficientă pentru protecție rezonabilă. Nu e persistent (se resetează la cold start), dar e exactă pentru sesiunile active.

#### Fix 3 — `public-analyze/index.ts`: Rate limit pe IP

- Max 3 req / 15 minute per IP pentru endpoint-ul public
- Același mecanism in-memory Map

#### Fix 4 — `analyze-repo/index.ts`: Reduce numărul de file fetches

Scade max key files de la 14 → 10 pentru a reduce presiunea pe GitHub API. Prioritizează fișierele mai importante și sare fișierele mici (< 1KB estimat).

---

### Fișiere modificate

| Fișier | Schimbare |
|---|---|
| `supabase/functions/analyze-repo/index.ts` | Serial batch fetch + retry, per-user rate limit, reducere file fetches |
| `supabase/functions/public-analyze/index.ts` | Rate limit pe IP |

---

### Schema rate limiter (in-memory)

```text
Map<string, { count: number; windowStart: number }>

key = userId sau IP
WINDOW = 15 min (900_000 ms)
MAX_ANALYZE = 5 per user / 3 per IP (public)

On request:
  now = Date.now()
  if (now - entry.windowStart > WINDOW) reset entry
  if (entry.count >= MAX) return 429 "Too many analyses. Try again in X minutes."
  entry.count++
```
