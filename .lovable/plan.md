
## Problema

Pe landing page există două mecanisme paralele de GitHub token, care se contrazic:

1. **`GitHubTokenModal`** — un modal local în LandingPage care salvează token-ul **doar în localStorage** (nu în cont). Complet separat de AccountPanel.
2. **Butonul "Connect GitHub" / "GitHub Connected"** — apare deasupra input-ului, controlat de starea `ghConnected` care citește doar din `localStorage`, nu din `profile.github_token`.

Rezultat: utilizatorul are token salvat pe cont (în profil), dar `ghConnected` verifică `localStorage` → arată butonul "Connect GitHub" în loc de "GitHub Connected". Și invers — un utilizator neautentificat poate vedea "GitHub Connected" dacă are ceva în localStorage.

## Soluția

### 1. Eliminare completă a butonului "Connect GitHub" / "GitHub Connected" de pe landing page
Toată zona `{/* GitHub connect chip */}` (liniile 344–369) dispare. Token-ul se gestionează **exclusiv din AccountPanel** (icon-ul de cont din colțul dreapta-sus).

### 2. Eliminare `GitHubTokenModal` din LandingPage
Componenta `GitHubTokenModal` (liniile 15–113) și tot ce o folosește (`ghModalOpen`, `ghConnected`, `handleModalClose`, `handleDisconnect`, starea locală) se elimină complet. Nu mai e nevoie de ea.

### 3. Curățare imports
Eliminare imports neutilizate după curățare: `Lock`, `Github`, `Check`, `Eye`, `EyeOff`, `X`, `ExternalLink` (dacă nu mai sunt folosite altundeva în fișier).

## Fișiere modificate

| Fișier | Schimbare |
|---|---|
| `src/components/LandingPage.tsx` | Elimină `GitHubTokenModal`, starea `ghConnected`/`ghModalOpen`, butonul "Connect GitHub", imports neutilizate |

Niciun alt fișier nu se schimbă — AccountPanel rămâne neatins, token-ul continuă să fie gestionat acolo corect.
