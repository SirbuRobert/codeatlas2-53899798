
## Analiză completă

### Situația actuală
- `profiles.github_token` — stocat plain text în baza de date, vizibil direct în dashboard-ul backend
- Citit în frontend via `useAuth.ts` → `getGithubToken()` → trimis ca `token` în `useAnalyzeRepo.ts` → body `analyze-repo` edge function
- Niciun strat de criptare existent

### Abordare: pgcrypto cu cheie simetrică (AES via `pgp_sym_encrypt`)

**De ce pgcrypto și nu Vault?**  
Vault Supabase este un serviciu Enterprise și nu e disponibil în Lovable Cloud. `pgcrypto` este deja inclus în fiecare proiect Supabase/Postgres și nu necesită configurare externă.

### Arhitectura soluției

```
SAVE TOKEN (frontend)
  → edge function "save-github-token"
  → pgp_sym_encrypt(token, ENCRYPTION_KEY) în DB

READ TOKEN (frontend afișare indicator ✓)
  → SELECT github_token IS NOT NULL  (nu se mai citește valoarea din frontend!)

USE TOKEN (la analiză)
  → edge function "analyze-repo" 
  → SELECT pgp_sym_decrypt(github_token::bytea, ENCRYPTION_KEY) direct din DB
  → folosește tokenul decriptat pentru GitHub API
```

**Principiu cheie**: tokenul decriptat nu mai ajunge NICIODATĂ în frontend. Frontend-ul vede doar `null` sau `'[encrypted]'` (un placeholder) — nu valoarea reală.

---

## Schimbări necesare

### 1. Migrație SQL — activare pgcrypto + secret encryption key
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Coloana rămâne TEXT, dar va stoca valoarea criptată (hex/bytea ca text)
```

### 2. Secret nou în Supabase — `GITHUB_TOKEN_ENCRYPTION_KEY`
O cheie secretă aleatorie de 32+ caractere, stocată ca secret în edge functions. **Nu se pune niciodată în cod.**

### 3. Edge function nouă: `save-github-token`
- Primește `{ token }` + JWT-ul userului (auth)
- Verifică sesiunea cu service role
- Execută `UPDATE profiles SET github_token = pgp_sym_encrypt($token, $ENCRYPTION_KEY)`
- Returnează doar `{ success: true }` — tokenul criptat nu iese din DB

### 4. Modificare `analyze-repo/index.ts`
- Când request-ul vine autentificat (JWT prezent), în loc să primească `token` din body, face el însuși:
  ```sql
  SELECT pgp_sym_decrypt(github_token::bytea, $KEY) FROM profiles WHERE id = $user_id
  ```
- Dacă request-ul vine fără auth (guest), acceptă `token` din body ca înainte (public API)

### 5. Modificare `useAuth.ts`
- `saveGithubToken()` — apelează `supabase.functions.invoke('save-github-token', ...)` în loc de update direct pe tabel
- `getGithubToken()` — returnează `undefined` mereu (tokenul nu se mai citește în frontend)
- `profile.github_token` — devine un placeholder `'[encrypted]'` sau `null`; frontend-ul verifică doar dacă e non-null (indicatorul verde)

### 6. Modificare `AccountPanel.tsx`
- Câmpul token input rămâne funcțional pentru a salva/șterge
- Indicatorul "Token active" verifică `profile.github_token !== null` (nu valoarea)
- La deschidere, câmpul e mereu gol (nu se mai pre-populează cu valoarea — nu există valoare decifrată)

### 7. Modificare `useAnalyzeRepo.ts`
- Nu mai trimite `token` în body — edge function îl extrage singură din DB
- Trimite doar `{ repoUrl }` (+ JWT via headers automat)

---

## Flux final de securitate

```
User salvează token → save-github-token EF → pgp_sym_encrypt → DB (criptat)
                                                                    ↓
User analizează repo → analyze-repo EF (cu JWT) → pgp_sym_decrypt din DB
                                                → GitHub API (token folosit intern)
                                                → răspuns fără token → frontend
```

Tokenul **nu mai traversează niciodată rețeaua** în clear text după salvare.

---

## Fișiere modificate / create

| Fișier | Schimbare |
|---|---|
| `supabase/migrations/XXXXXX.sql` | `CREATE EXTENSION pgcrypto` |
| `supabase/functions/save-github-token/index.ts` | Edge function nouă — salvare criptată |
| `supabase/functions/analyze-repo/index.ts` | Decriptare din DB când user autentificat |
| `src/hooks/useAuth.ts` | `saveGithubToken` → invoke EF; `getGithubToken` → undefined |
| `src/hooks/useAnalyzeRepo.ts` | Nu mai trimite `token` în body |
| `src/components/AccountPanel.tsx` | Input gol la deschidere (placeholder "token saved"); indicatorul verifică null |
