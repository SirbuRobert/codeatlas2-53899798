
## Final confirmed plan — all 6 modules, single pass

### Summary of what gets built

1. **StatsHUD business tooltips** — each metric gets a hover tooltip with a plain-English business impact sentence using the existing Radix Tooltip component
2. **NodeInspector "Imported By / Exports To"** — two new collapsible sections at the bottom; `graph` prop added; Dashboard wired
3. **Solar dependency waves** — animated pulse particles travel along edges of the selected node; `positionsRef` shared map tracks live positions each frame
4. **BusinessInsightsPanel** — new slide-in panel with risk score gauge, bus factor bar chart, tech market context chips, tech lifecycle tags; toggled via new "📊 Business View" button in Dashboard toolbar
5. **PipelineExplainer** — `@xyflow/react` flow diagram modal showing the 8-step data pipeline; triggered by "How does this work?" on landing page
6. **Billing page** — `/billing` route with 3 plan cards (Free/Pro/Enterprise), mock payment form, "Test Mode" banner; linked from Dashboard

### Exact files

**Create:**
- `src/components/BusinessInsightsPanel.tsx`
- `src/components/PipelineExplainer.tsx`
- `src/pages/Billing.tsx`

**Modify:**
- `src/components/StatsHUD.tsx` — wrap each stat in Tooltip
- `src/components/NodeInspector.tsx` — add `graph?` prop, Imported By + Exports To sections
- `src/components/graph/SolarSystemView.tsx` — dependency wave particles in SceneWithBlast
- `src/components/Dashboard.tsx` — wire graph→NodeInspector, business panel toggle, billing nav button
- `src/components/LandingPage.tsx` — "How does this work?" button
- `src/App.tsx` — add `/billing` route

### Key technical decisions

**Dependency waves position tracking:** `OrbitingBody` and `SunBody` each receive a `positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>` and update their entry in `useFrame`. `DependencyWave` reads from this map each frame to get current world positions. This avoids re-renders and works correctly during auto-rotation.

**DependencyWave component:** For each edge connected to the selected node, render 3 staggered `WaveParticle` components. Each uses a `tRef = useRef(stagger)` incremented by `delta * 0.5` in `useFrame`, looping 0→1. Position = `lerpVectors(from, to, t % 1)`. Small sphere mesh r=0.07. Capped at 20 edges total. Only rendered when `!isDimmed`.

**BusinessInsightsPanel risk gauge:** Pure SVG arc. `circumference = 2πr`, stroke-dasharray trick. No additional library needed.

**PipelineExplainer:** Uses `@xyflow/react` with 8 custom nodes, `dagre`-style manual positions (left-to-right), animated edges. Wrapped in framer-motion `AnimatePresence` modal. No `dagre` package needed — manual x/y positions assigned.

**Billing mock form:** On submit, call `e.preventDefault()`, show a toast ("Payment processed — welcome to Pro!"), no real API call. "Test Mode" amber banner prominently displayed.

### No database changes required
No auth, no Supabase tables needed for this pass.
