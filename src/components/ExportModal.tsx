import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileDown, Printer, Copy, Check, FileText } from 'lucide-react';
import type { CodebaseGraph } from '@/types/graph';
import { analyzeGraphSecurity } from '@/lib/securityAnalysis';

// ─── Report Generator ──────────────────────────────────────────────────────

function generateMarkdown(graph: CodebaseGraph): string {
  const security = analyzeGraphSecurity(graph);
  const now = new Date().toISOString().split('T')[0];
  const riskNodes = graph.nodes
    .filter(n => n.metadata.riskLevel === 'critical' || n.metadata.riskLevel === 'high')
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return order[a.metadata.riskLevel] - order[b.metadata.riskLevel];
    })
    .slice(0, 5);

  const orphans = graph.nodes.filter(n => n.metadata.isOrphan);
  const langBreakdown = Object.entries(graph.stats.languages ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([lang, count]) => `  - ${lang}: ${count} file${count !== 1 ? 's' : ''}`)
    .join('\n') || '  - (no language data)';

  const nodeTypeCount = graph.nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});
  const nodeTypeLines = Object.entries(nodeTypeCount)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `  - ${type}: ${count}`)
    .join('\n');

  const severityEmoji: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡'
  };

  const findingLines = security.findings.length > 0
    ? security.findings.map(f =>
        `### ${severityEmoji[f.severity] ?? '⚪'} [${f.severity.toUpperCase()}] ${f.label}\n${f.detail}`
      ).join('\n\n')
    : '_No security findings detected._';

  const riskNodeLines = riskNodes.length > 0
    ? riskNodes.map(n =>
        `### ${n.metadata.riskLevel === 'critical' ? '🔴' : '🟠'} ${n.label}\n` +
        `- **Path:** \`${n.metadata.path}\`\n` +
        `- **Risk:** ${n.metadata.riskLevel.toUpperCase()}\n` +
        `- **Complexity:** ${n.metadata.complexity} | **Coverage:** ${n.metadata.coverage}% | **Churn:** ${n.metadata.churn}\n` +
        (n.metadata.semanticSummary ? `- **Summary:** ${n.metadata.semanticSummary}\n` : '') +
        (n.metadata.flags.length > 0 ? `- **Flags:** ${n.metadata.flags.join(', ')}\n` : '')
      ).join('\n')
    : '_No critical or high risk nodes found._';

  const orphanLines = orphans.length > 0
    ? orphans.map(n => `- \`${n.metadata.path}\` _(${n.type})_`).join('\n')
    : '_No dead code detected._';

  // Architecture inference
  const hasService = graph.nodes.some(n => n.type === 'service');
  const hasDb = graph.nodes.some(n => n.type === 'database');
  const hasApi = graph.nodes.some(n => n.type === 'api');
  const archStyle = hasService && hasDb && hasApi
    ? 'Service-Oriented Architecture with API layer and database persistence'
    : hasApi && hasDb
    ? 'Monolithic API with direct database access'
    : hasService
    ? 'Microservice-style modular architecture'
    : 'Component-based frontend architecture';

  return `# CodeAtlas AXON — Repository Intelligence Report

> Generated on **${now}** by CodeAtlas AXON  
> Repository: **${graph.repoUrl}**  
> Git SHA: \`${graph.version}\`  
> Analyzed at: \`${graph.analyzedAt}\`

---

## 1. Repository Overview

| Property | Value |
|----------|-------|
| Repository | ${graph.repoUrl} |
| Version | \`${graph.version}\` |
| Primary Language | ${graph.language} |
| Architecture Style | ${archStyle} |
| Analyzed | ${graph.analyzedAt} |
| Report Date | ${now} |

---

## 2. AI Summary

${graph.summary || '_No AI summary available for this repository._'}

---

## 3. Key Metrics

| Metric | Value |
|--------|-------|
| Total Files | ${graph.stats.totalFiles} |
| Total Lines | ${graph.stats.totalLines.toLocaleString()} |
| Avg Complexity | ${graph.stats.avgComplexity.toFixed(1)} |
| Hotspot Files | ${graph.stats.hotspots} |
| Dead Code Nodes | ${graph.stats.orphans} |
| Test Coverage | ${graph.stats.testCoverage}% |
| Circular Deps | ${graph.stats.circularDeps} |
| Total Edges | ${graph.edges.length} |
| Total Nodes | ${graph.nodes.length} |

---

## 4. Architecture Diagram Description

**Style:** ${archStyle}

**Node Type Composition:**
${nodeTypeLines}

**Language Breakdown:**
${langBreakdown}

**Entry Points:** ${graph.entryPoints.length > 0
  ? graph.entryPoints.map(id => {
      const n = graph.nodes.find(n => n.id === id);
      return n ? `\`${n.metadata.path}\`` : `\`${id}\``;
    }).join(', ')
  : '_None identified_'}

---

## 5. Top Risk Nodes

${riskNodeLines}

---

## 6. Security Findings

**Summary:** ${security.findings.filter(f => f.severity === 'critical').length} critical, ${security.findings.filter(f => f.severity === 'high').length} high, ${security.findings.filter(f => f.severity === 'medium').length} medium

${findingLines}

---

## 7. Dead Code (Orphan Nodes)

${orphanLines}

---

## 8. Language Breakdown

${langBreakdown}

---

_Report generated by [CodeAtlas AXON](https://codeatlas2.lovable.app) — GitHub Intelligence Platform_
`;
}

// ─── Print HTML Generator ──────────────────────────────────────────────────

function generatePrintHTML(graph: CodebaseGraph): string {
  const md = generateMarkdown(graph);
  // Convert markdown to minimal HTML for printing
  const html = md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^_(.+?)_$/gm, '<em>$1</em>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>');
  return `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;color:#111;line-height:1.7">${html}</div>`;
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface ExportModalProps {
  graph: CodebaseGraph;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ExportModal({ graph, isOpen, onClose }: ExportModalProps) {
  const [tab, setTab] = useState<'markdown' | 'pdf'>('markdown');
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const markdownContent = useMemo(() => generateMarkdown(graph), [graph]);
  const printHTML = useMemo(() => generatePrintHTML(graph), [graph]);

  // ── Markdown Download ────────────────────────────────────────────────────
  function downloadMarkdown() {
    const slug = graph.repoUrl.split('/').slice(-2).join('-').replace(/[^a-z0-9-]/gi, '-');
    const filename = `codeatlas-report-${slug}-${new Date().toISOString().split('T')[0]}.md`;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Copy to clipboard ────────────────────────────────────────────────────
  async function copyToClipboard() {
    await navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── PDF via window.print() ────────────────────────────────────────────────
  function printReport() {
    // Inject print-only style
    const style = document.createElement('style');
    style.id = 'axon-print-style';
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #axon-print-report { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; }
      }
    `;
    document.head.appendChild(style);

    // Populate the hidden print div
    if (printAreaRef.current) {
      printAreaRef.current.innerHTML = printHTML;
    }

    window.print();

    // Cleanup after print dialog closes
    setTimeout(() => {
      const el = document.getElementById('axon-print-style');
      if (el) el.remove();
      if (printAreaRef.current) printAreaRef.current.innerHTML = '';
    }, 1000);
  }

  const repoLabel = graph.repoUrl.split('/').slice(-2).join('/') || graph.repoUrl;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop + centered modal wrapper */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 w-[680px] max-w-[96vw] max-h-[85vh] flex flex-col"
              style={{
                background: 'hsl(var(--surface-1))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'hsl(var(--cyan)/0.15)', border: '1px solid hsl(var(--cyan)/0.3)' }}
              >
                <FileText className="w-3.5 h-3.5" style={{ color: 'hsl(var(--cyan))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-bold text-foreground">Export Report</p>
                <p className="font-mono text-[10px] text-foreground-dim truncate">{repoLabel}</p>
              </div>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded flex items-center justify-center text-foreground-dim hover:text-foreground hover:bg-surface-2 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Format Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 pb-0 flex-shrink-0">
              {(['markdown', 'pdf'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[10px] transition-all duration-150 ${
                    tab === t
                      ? 'bg-surface-3 text-foreground border border-border-bright'
                      : 'text-foreground-dim hover:text-foreground'
                  }`}
                >
                  {t === 'markdown' ? <FileDown className="w-3 h-3" /> : <Printer className="w-3 h-3" />}
                  {t === 'markdown' ? 'Markdown (.md)' : 'PDF (Print)'}
                </button>
              ))}
              <div className="ml-auto font-mono text-[9px] text-foreground-dim">
                ~{Math.round(markdownContent.length / 1024)}KB report
              </div>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto mx-5 mt-3 mb-0 rounded-lg border border-border bg-surface-2 min-h-0">
              {tab === 'markdown' ? (
                <pre
                  className="font-mono text-[10px] leading-relaxed text-foreground-dim p-4 whitespace-pre-wrap break-words"
                  style={{ userSelect: 'text' }}
                >
                  {markdownContent}
                </pre>
              ) : (
                <div className="p-6">
                  <div
                    className="rounded-lg border border-border p-4 text-xs leading-relaxed"
                    style={{ background: '#ffffff', color: '#111111' }}
                    dangerouslySetInnerHTML={{ __html: printHTML }}
                  />
                  <p className="font-mono text-[9px] text-foreground-dim mt-3 text-center">
                    ↑ Print preview — use your browser's print dialog to save as PDF
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-border flex-shrink-0 mt-3">
              {tab === 'markdown' ? (
                <>
                  <button
                    onClick={downloadMarkdown}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] font-bold text-background transition-all"
                    style={{ background: 'hsl(var(--cyan))', boxShadow: '0 0 12px hsl(var(--cyan)/0.3)' }}
                  >
                    <FileDown className="w-3 h-3" />
                    Download .md
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-all"
                  >
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                </>
              ) : (
                <button
                  onClick={printReport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] font-bold text-background transition-all"
                  style={{ background: 'hsl(var(--cyan))', boxShadow: '0 0 12px hsl(var(--cyan)/0.3)' }}
                >
                  <Printer className="w-3 h-3" />
                  Open Print Dialog
                </button>
              )}
              <div className="ml-auto font-mono text-[9px] text-foreground-dim">
                {graph.nodes.length} nodes · {graph.edges.length} edges
            </div>
          </motion.div>
          </div>

          {/* Hidden print area */}
          <div
            id="axon-print-report"
            ref={printAreaRef}
            style={{ display: 'none' }}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
