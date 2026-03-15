
## Root cause identificat

Butonul Sign In are `z-10` (`absolute top-6 right-6 z-10` — linia 256). Dar div-ul conținutului principal de la linia 281 are și el `relative z-10` și acoperă întreaga pagină, inclusiv colțul dreapta-sus unde stă butonul.

Ambele au același z-index (`z-10`), iar div-ul de conținut venind **după** butonul în DOM îl suprascrie — stacking context-ul CSS face ca elementele cu același z-index care apar mai târziu în DOM să fie "deasupra". Deci div-ul de conținut blochează click-urile pe buton.

## Fix

O singură schimbare în `src/components/LandingPage.tsx`:

```diff
- <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
+ <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
```

Ridicând containerul butonului la `z-20`, acesta va fi întotdeauna deasupra div-ului de conținut cu `z-10`.

## Fișier de modificat

| Fișier | Linie | Schimbare |
|---|---|---|
| `src/components/LandingPage.tsx` | 256 | `z-10` → `z-20` pe containerul butonului auth |
