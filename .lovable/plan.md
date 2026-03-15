
## Problema reală

`meshStandardMaterial` depinde de lumini pentru a calcula culoarea finală a pixelilor. Chiar și cu `ambientLight intensity={3.5}` și 5 `pointLight`-uri, Three.js aplică un calcul PBR care "mănâncă" din saturație și luminozitate. `roughness=0.0` + `metalness=0.0` face sfera să arate ca sticlă, nu ca o bilă luminoasă colorată.

## Fix

Înlocuiesc `meshStandardMaterial` cu `meshBasicMaterial` pe sfera principală. `meshBasicMaterial` nu calculează iluminare deloc — culoarea este exact cea setată, 100% saturată. Este exact ce folosesc toruses și halo-urile, de aceea ele arată mereu bine.

Ține emissive glow halo (opacity 0.18 → 0.35) ca efect de bloom vizual.

```
meshStandardMaterial  →  meshBasicMaterial
(depinde de lumini)       (culoare pură, fără lighting)
```

Parametrii noi:
- `meshBasicMaterial color={effectiveColor}` — sfera are culoarea exactă, saturată
- `transparent opacity={opacity}` — păstrat pentru dimming
- Glow halo opacity: 0.18 → 0.35 (și mai vizibil)
- Un al doilea halo mai mare la opacity 0.08 pentru un efect de aură mai profund
- `Stars` count: 2000 → 4000 (fundal mai dens pentru contrast)

## Fișier

Un singur fișier: `src/components/graph/SolarSystemView.tsx`

Schimbări:
1. Linia 358–366: `meshStandardMaterial` → `meshBasicMaterial` (elimină `emissive`, `emissiveIntensity`, `roughness`, `metalness`)
2. Linia 344–346: halo opacity 0.18 → 0.35
3. Adaugă un al doilea halo la `size * 2.8` cu opacity 0.07
4. `ambientLight` rămâne pentru alte materiale (torus rings folosesc `meshBasicMaterial` deja)
