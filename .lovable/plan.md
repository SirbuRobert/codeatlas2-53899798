
## Cele 2 probleme identificate

### Problema 1 — Security Scan Panel nu e scrollable pe mobile
Panoul de Security Scan (`GraphCanvas.tsx`, liniile 368–511) e redat ca `Panel position="top-left"` din React Flow — un div cu `minWidth: 220, maxWidth: 280` fără height limit și fără overflow. Pe un telefon de 393px înălțime, cu toolbar-ul dublu (48px + 40px) + StatsHUD, rămân ~280px vizibili. Panoul are: header + 4 stat boxes + 5 findings cu butoane + legendă = depășește cu ușurință 400px → conținut tăiat, imposibil de scrollat.

### Problema 2 — SearchBar iese din ecran pe mobile + nu se poate închide
SearchBar (`SearchBar.tsx`, linia 100) folosește `className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[480px]"`. Pe un ecran de 393px, `w-[480px]` depășește complet viewport-ul → bara iese în dreapta, match count badge și butonul ESC/X nu se văd. Utilizatorul nu poate închide search.

---

## Soluții

### Fix 1 — Security Panel: scrollabil + înălțime limitată pe mobile
În `GraphCanvas.tsx`, panoul de security de la linia 369:
- Adăugăm `maxHeight` dinamic: `max-h-[calc(100vh-100px)]` și `overflow-y-auto` pe motion.div
- Pe mobile, reducem `maxWidth` la `min(280px, calc(100vw - 16px))` prin clase Tailwind: `w-[min(280px,calc(100vw-16px))]`
- Adăugăm `overscroll-contain` să nu propagă scroll-ul la canvas

### Fix 2 — SearchBar: full-width pe mobile cu butonul de close vizibil
În `SearchBar.tsx`, linia 100, schimbăm clasa container-ului:
- `w-[480px]` → `w-[calc(100vw-16px)] sm:w-[480px]` — ocupă aproape tot ecranul pe mobile
- `left-1/2 -translate-x-1/2` → rămâne (centrare), dar cu lățimea corectă nu mai iese din ecran
- Placeholder pe mobile scurtat: `sm:placeholder-shown:...` sau mai simplu un placeholder mai scurt direct
- Butonul ESC devine mai mare/proeminent pe mobile (minim `touch-target` de 36px)
- Adăugăm `max-w-[calc(100vw-16px)]` ca fallback

## Fișiere modificate

| Fișier | Schimbare |
|---|---|
| `src/components/SearchBar.tsx` | Linia 100: `w-[480px]` → `w-[calc(100vw-16px)] sm:w-[480px]`; placeholder mai scurt; ESC button touch target mărit |
| `src/components/graph/GraphCanvas.tsx` | Panoul security (liniile ~369-511): adăugare `max-h-[calc(100vh-100px)] overflow-y-auto overscroll-contain`; lățime responsivă |

Schimbări minime, chirurgicale — nu ating structura componentelor.
