
## Goal
Add an Export feature to the Dashboard that generates either a **Markdown** report (download as `.md` file) or a **PDF** (via browser `window.print()` with a print-optimized layout). No new npm packages needed — Markdown uses the Blob API, PDF uses `window.print()`.

## What the report contains
1. **Repository Overview** — repo URL, version, analyzed date, architecture style
2. **AI Summary** — full `graph.summary` text
3. **Key Metrics** — files, lines, avg complexity, hotspots, orphans, coverage, circular deps
4. **Architecture Diagram Description** — inferred arch style + node type composition (textual)
5. **Top Risk Nodes** — top 5 critical/high nodes with risk level, path, semantic summary, flags
6. **Security Findings** — runs `analyzeGraphSecurity(graph)` and lists all findings with severity/detail
7. **Dead Code** — orphan node list
8. **Language Breakdown**

## Implementation

### New file: `src/components/ExportModal.tsx`
- Modal triggered from Dashboard with two format tabs: **Markdown** and **PDF**
- Live preview of the report content in a scrollable `<pre>` block (Markdown format)
- Two action buttons: "Download .md" and "Print to PDF"
- `generateMarkdown(graph)` pure function that builds the full report string
- `exportAsPDF()` opens a `window.print()` on a hidden `<div id="print-area">` with inline styles (white bg, black text) injected via a `<style>` tag with `@media print`

### `generateMarkdown(graph, securityAnalysis)` function
```
# CodeAtlas AXON — Repository Report
...all sections as Markdown headings and lists...
```

### Trigger in Dashboard
- Add `Export` button (FileDown icon) to the top bar right section  
- Add `exportOpen` state → renders `<ExportModal>`

### Files to modify
| File | Change |
|---|---|
| `src/components/Dashboard.tsx` | Add `exportOpen` state + `<ExportModal>` + Export button in top bar |
| `src/components/ExportModal.tsx` | **New** — full export modal |

### No new dependencies
- Markdown export: `URL.createObjectURL(new Blob([...], { type: 'text/markdown' }))` + `<a download>`
- PDF export: `window.print()` using `@media print` CSS injected into `<head>` to show only the report div, hide everything else

### PDF approach detail
Inject a `<style id="axon-print-style">` into `document.head` before calling `window.print()`, remove it after. The style:
```css
@media print {
  body > * { display: none !important; }
  #axon-print-report { display: block !important; }
}
```
Render a hidden `<div id="axon-print-report">` in the modal with full report formatted as simple HTML.

### UI design
- Trigger: "Export" button with `FileDown` icon in the Dashboard top bar (right side, near Plans button)
- Modal: centered overlay, `w-[600px]`, tabs for Markdown/PDF preview, monospace font preview pane, download/print action buttons at bottom
- Report preview shows the exact markdown that will be downloaded

### Implementation order
1. Create `ExportModal.tsx` with `generateMarkdown`, modal UI, download and print handlers
2. Wire into `Dashboard.tsx` — add button + state + component render
