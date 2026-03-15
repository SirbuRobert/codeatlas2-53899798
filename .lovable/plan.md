
## Problema

Luminozitatea scăzută vine din 4 surse simultane:
1. `ambientLight intensity={0.25}` — extrem de slab
2. Un singur `pointLight` cu `distance={60}` și `decay={2}` — se stinge rapid, nodurile depărtate de centru sunt negre
3. `emissiveIntensity={0.55}` la repaus — insuficient
4. Glow halo transparent la `opacity={0.06}` — invizibil
5. `roughness={0.45}` + `metalness={0.3}` — absoarbe lumina

## Fix-uri (un singur fișier: `src/components/graph/SolarSystemView.tsx`)

### 1. Lumini — `ForceScene` (linia 483–484)
```
ambientLight intensity: 0.25 → 1.2
pointLight (centru): intensity 2 → 6, distance 60 → 120, decay 2 → 1.5
+ 4 pointLight-uri adiționale la colțuri (sus/jos/față/spate) intensity=3 fiecare
  pentru a ilumina uniform nodurile depărtate de centru
```

### 2. Materialul sferelor — `meshStandardMaterial` (linia 358–366)
```
emissiveIntensity idle: 0.55 → 1.2
emissiveIntensity hovered/selected: 1.4 → 2.2
roughness: 0.45 → 0.2   (reflectă mai multă lumină)
metalness: 0.3 → 0.15   (mai puțin metalic = mai saturate culorile)
```

### 3. Glow halo (linia 343–346)
```
opacity: 0.06 → 0.18    (halo vizibil)
size multiplier: 1.5 → 1.8
```

### 4. Culorile edge-urilor (liniile 28–35)
```
imports:  '#334155' → '#2d4a6a'  (albastru mai vizibil)
calls:    '#1e3a5f' → '#1e4a7a'
+ opacity edge-uri normale: 0.28 → 0.45
```

### 5. `meshStandardMaterial` pentru orphan nodes
```
roughness: 0.9 → 0.5   (nici orphan-ii să nu fie complet negri)
```

Un singur fișier de modificat: `src/components/graph/SolarSystemView.tsx`.
