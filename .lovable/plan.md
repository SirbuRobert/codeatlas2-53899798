
## Ce vrea utilizatorul

Suportarea unui URL de forma:
```
https://codeatlas2.lovable.app/?url=https://github.com/owner/repo
```
…astfel încât la refresh pagina re-analizează automat repo-ul fără să fie nevoie să-l re-introduci manual.

## Problema actuală

`Index.tsx` citește deja `?repo=owner/repo&auto=true` (format Chrome Extension), dar nu citește `?url=FULL_URL`. La refresh, `searchParams` există, dar codul nu știe să trateze parametrul `url`.

## Fix — 1 singur fișier

### `src/pages/Index.tsx`

Adaugă un al doilea bloc `useEffect` (sau extinde cel existent) care:

1. Citește `searchParams.get('url')` — URL complet GitHub
2. Dacă există și `autoTriggeredRef.current === false`, declanșează `handleAnalyze(url)` direct (fără a construi URL din `owner/repo`)
3. Setează `autoTriggeredRef.current = true` să evite double-trigger

**În plus**, după ce analiza e gata și `stage === 'dashboard'`, actualizează URL-ul browserului cu `?url=REPO_URL` folosind `useSearchParams` setter sau `window.history.replaceState` — astfel la refresh URL-ul e prezent și re-analiza pornește automat.

### Flow complet:
```
User tip URL în input → handleAnalyze() → analysis done → replaceState(?url=...) 
                                                               ↓
Refresh → useEffect citește ?url= → handleAnalyze() → dashboard restaurat
```

### Schimbări concrete în `Index.tsx`:

1. Destructurează `setSearchParams` din `useSearchParams()`
2. Extinde efectul existent să citească și `?url=` (URL complet):
   ```ts
   const urlParam = searchParams.get('url');
   if (urlParam && !autoTriggeredRef.current) {
     autoTriggeredRef.current = true;
     handleAnalyze(urlParam);
   }
   ```
3. Adaugă `useEffect` care se declanșează când `stage` devine `'dashboard'`:
   ```ts
   useEffect(() => {
     if (stage === 'dashboard' && repoUrl) {
       setSearchParams({ url: repoUrl }, { replace: true });
     }
   }, [stage, repoUrl, setSearchParams]);
   ```
4. În `handleReset`, curăță parametrul: `setSearchParams({}, { replace: true })`

## Fișiere modificate
| Fișier | Schimbare |
|---|---|
| `src/pages/Index.tsx` | Citește `?url=`, setează `?url=` la dashboard ready, curăță la reset |

