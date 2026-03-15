
## Goal

Add `@react-three/postprocessing` Bloom effect inside the `<Canvas>` in `SolarSystemView.tsx` so planets and their halos emit visible light blooms.

## Key findings from research

- `@react-three/postprocessing` Bloom works by selecting which materials glow via `luminanceThreshold`. Anything with emissive intensity > threshold glows.
- Since we use `meshBasicMaterial` (no emissive support), the cleanest approach is `luminanceThreshold={0}` + `mipmapBlur={true}` + moderate `intensity` — this makes everything above a brightness threshold glow. Our bright cyan/red/purple node colors will trigger it naturally.
- Alternative selective approach: wrap glowing meshes in `<Layers>` but that's complex. The `luminanceThreshold` approach is simpler and correct here.

## Package to install

`@react-three/postprocessing` — not currently installed. Must add to `package.json`.

The compatible version with `@react-three/fiber@^8` and `three@^0.160` is `^2.16`.

## Implementation plan

### 1. Install package

Add `"@react-three/postprocessing": "^2.16"` to `dependencies` in `package.json`.

### 2. Import in `SolarSystemView.tsx`

```ts
import { EffectComposer, Bloom } from '@react-three/postprocessing';
```

### 3. Add `<EffectComposer>` with `<Bloom>` inside `<Canvas>`

Place it at the bottom of the `ForceScene` component's return (after `<OrbitControls>`):

```tsx
<EffectComposer>
  <Bloom
    intensity={1.2}
    luminanceThreshold={0.3}
    luminanceSmoothing={0.9}
    mipmapBlur
    radius={0.8}
  />
</EffectComposer>
```

Parameters chosen:
- `intensity={1.2}` — visible glow without washing out labels
- `luminanceThreshold={0.3}` — catches our bright node colors (cyan `#00ffff`, red `#ef4444`, amber `#f59e0b`) but not dimmed/orphan nodes (dark `#475569`)
- `luminanceSmoothing={0.9}` — smooth falloff, no harsh edges
- `mipmapBlur` — modern high-quality bloom algorithm, replaces old `blurPass`
- `radius={0.8}` — spread of the bloom halo

### 4. Enable `gl={{ toneMapped: false }}` on Canvas

The Canvas currently has `gl={{ antialias: true, alpha: false }}`. Add `toneMapping: THREE.NoToneMapping` (or set it via `gl` prop) so the raw HDR colors feed into the bloom compositor correctly:

```tsx
<Canvas
  camera={{ position: [0, 12, 32], fov: 55, near: 0.1, far: 300 }}
  gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping }}
  dpr={[1, 1.5]}
>
```

This is the critical step — without disabling tone mapping, Three.js clamps colors to 0–1 before postprocessing sees them, killing the bloom.

## Files to modify

| File | Change |
|---|---|
| `package.json` | Add `"@react-three/postprocessing": "^2.16"` |
| `src/components/graph/SolarSystemView.tsx` | Import + add `<EffectComposer><Bloom /></EffectComposer>` in `ForceScene`, update `gl` prop on `Canvas` |
