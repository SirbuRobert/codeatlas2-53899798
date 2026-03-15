
## Bug identificat

Există 3 locuri care creează problema de securitate:

**1. `AccountPanel.tsx` linia 35-38 — fallback la localStorage la deschidere:**
```ts
} else if (isOpen) {
  setToken(localStorage.getItem('axon_gh_token') ?? '');  // ← BUG: pune tokenul altui user
}
```
Când un user nou se loghează și `profile?.github_token` este `null`, câmpul se populează cu tokenul din localStorage al utilizatorului anterior.

**2. `AccountPanel.tsx` linia 50-51 — scriere în localStorage la salvare:**
```ts
localStorage.setItem('axon_gh_token', token.trim());  // ← BUG: rămâne după delogare
```

**3. `useAuth.ts` linia 109 — `getGithubToken` cade pe localStorage:**
```ts
return localStorage.getItem('axon_gh_token') ?? undefined;  // ← BUG: alt user vede tokenul
```

**4. `signOut` în `useAuth.ts` — nu șterge din localStorage.**

## Fix — 3 fișiere, schimbări minime

### `src/hooks/useAuth.ts`
- `getGithubToken` returnează **doar** `state.profile?.github_token` — fără fallback localStorage
- `signOut` apelează `localStorage.removeItem('axon_gh_token')` pentru a curăța eventuale resturi vechi
- În `onAuthStateChange`, când sesiunea se schimbă (alt user sau logout), șterge din localStorage

### `src/components/AccountPanel.tsx`
- Elimină complet `localStorage.getItem('axon_gh_token')` din `useEffect` — câmpul rămâne gol dacă profilul nu are token
- Elimină `localStorage.setItem(...)` din `handleSave` — tokenul se salvează **doar** în baza de date
- `handleRemove` deja apelează `localStorage.removeItem` — rămâne (pentru migrare de la versiuni vechi)

### Rezultat final:
- Token trăiește **exclusiv** în coloana `profiles.github_token` din baza de date
- La sign out, orice rest din localStorage este curățat
- La sign in pe cont nou, câmpul token este gol — nu vede tokenul altcuiva
- Pe alt dispozitiv unde nu există localStorage, totul funcționează corect oricum (tokenul vine din profil)

## Fișiere modificate
| Fișier | Schimbare |
|---|---|
| `src/hooks/useAuth.ts` | `getGithubToken` fără fallback localStorage; `signOut` curăță localStorage; `onAuthStateChange` curăță la SIGNED_OUT/USER_UPDATED |
| `src/components/AccountPanel.tsx` | Elimină citire și scriere localStorage pentru token |
