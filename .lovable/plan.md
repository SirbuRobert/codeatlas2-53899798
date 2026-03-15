
## Problema

`isSecurityNode()` în `src/lib/securityAnalysis.ts` face un simplu `String.includes()` pe label și path față de o listă de 22 de keywords. Orice nod cu `token`, `session`, `cors`, `middleware`, `hash`, `validate`, `policy`, `salt` în path sau label e tratat ca "security node" — indiferent de context. Un fișier `validate-form.ts`, `session-storage.ts`, `cors-headers.ts`, `middleware/logger.ts` devine automat "security-critical" și generează findings false.

## Soluție: matching inteligent pe baza contextului, nu substring simplu

### 1. Înlocuire `isSecurityNode()` cu matching contextual

**Regulile noi:**
- Keywords cu risc real (jwt, oauth, crypto, password, encrypt, decrypt, hash+salt+bcrypt în combinație, csrf, certificate) → contează oriunde în label/path
- Keywords ambigue (token, session, auth, cors, middleware, guard, policy, validate, sanitize, hash, salt, permission) → contează **doar dacă** există un context real de securitate, nu doar apariție izolată:
  - `validate` singur = fals negativ (e vorba de validare formular) → nu marchează
  - `auth` + `validate` = marchează (context real)
  - `middleware` fără alt indiciu = skip
  - `cors` fără alt auth context = skip (e doar config HTTP)

**Strategie concretă:**
```
DEFINITE_SECURITY = ['jwt', 'oauth', 'crypto', 'password', 'bcrypt', 'encrypt', 'decrypt', 'csrf', 'certificate']
CONTEXT_SECURITY = ['auth', 'session', 'token', 'permission', 'rbac', 'acl', 'login', 'logout', 'signup']
AMBIGUOUS = ['middleware', 'guard', 'policy', 'validate', 'sanitize', 'hash', 'salt', 'cors', 'helmet', 'firewall', 'verify']
```

- Dacă label/path conține orice din `DEFINITE_SECURITY` → **security node** (fără condiții)
- Dacă label/path conține orice din `CONTEXT_SECURITY` → **security node** (fără condiții, sunt specifice)
- Dacă label/path conține doar keyword(uri) din `AMBIGUOUS` → **security node numai dacă** ≥2 ambiguous keywords prezente **sau** există cel puțin un keyword din `CONTEXT_SECURITY`/`DEFINITE_SECURITY` în oricare nod vecin (dep edges)
- `metadata.flags.includes('security-critical')` → **mereu security node** (explicit din AI)

### 2. Excluderi explicite pentru false-positives comune

Anumite path-uri sunt predictibil safe și nu au ce căuta în security overlay:
```
SAFE_PATH_PATTERNS = [
  /cors[.-]?(header|config|option)/i,     // cors-headers.ts, cors-config.ts
  /validate[.-]?(form|schema|input|field)/i, // validate-form.ts, validate-input.ts
  /middleware[.-]?(log|error|rate|cache|compress)/i, // logger middleware
  /session[.-]?(storage|persist|cache)/i, // client-side session storage
  /hash[.-]?(map|table|router|util)/i,    // data structure hash map
  /sanitize[.-]?(html|input|string)/i,    // XSS sanitization (nu auth!)
]
```

Dacă path-ul unui nod matches oricare pattern de mai sus → **nu e security node** (chiar dacă conține keyword ambiguu).

### 3. Rafinare findings: nu mai genera "Complex Auth Logic" / "Low Test Coverage" pe false positives

Adaug un `confidenceScore` pe fiecare security node (1 = definit, 0.5 = contextual, 0.3 = ambiguous):
- Findings de "Low Coverage" se generează **numai** dacă `confidenceScore >= 0.7`
- Findings de "Complex Auth Logic" se generează **numai** dacă `confidenceScore >= 0.5`
- Exposed API și Unprotected DB rămân neschimbate (se bazează pe graph topology, nu pe keyword matching)

## Fișier modificat

| Fișier | Schimbare |
|---|---|
| `src/lib/securityAnalysis.ts` | `isSecurityNode()` complet rescris cu 3-tier classification + safe path excludes + confidence score pe findings |

## Vizual

```text
Înainte (false positive):
  middleware/logger.ts → include "middleware" → security node
  validate-form.ts     → include "validate"   → security node
  session-storage.ts   → include "session"    → security node
  cors-config.ts       → include "cors"       → security node

După (corect):
  middleware/logger.ts → ambiguous only, 1 keyword → NOT security node
  validate-form.ts     → safe path pattern match    → NOT security node
  session-storage.ts   → safe path pattern match    → NOT security node
  cors-config.ts       → safe path pattern match    → NOT security node

  auth-service.ts      → CONTEXT_SECURITY "auth"    → security node ✓
  jwt-utils.ts         → DEFINITE "jwt"              → security node ✓
  password-hash.ts     → DEFINITE "password"+"hash"  → security node ✓
  login.controller.ts  → CONTEXT_SECURITY "login"    → security node ✓
```

Modificarea este **pur client-side** — un singur fișier, zero backend changes, zero migrații.
