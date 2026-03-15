import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { computeHierarchicalLayout } from '@/lib/graphLayout';
import type { CodebaseGraph, AxonNode, AxonEdge, NodeType, RiskLevel, Language, FunctionEntry } from '@/types/graph';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawNode = Record<string, any>;

function toAxonNode(raw: RawNode, position: { x: number; y: number }): AxonNode {
  return {
    id: raw.id as string,
    type: (raw.type as NodeType) ?? 'file',
    label: (raw.label as string) ?? raw.id,
    metadata: {
      loc: (raw.loc as number) ?? 80,
      complexity: (raw.complexity as number) ?? 4,
      churn: (raw.churn as number) ?? 20,
      dependents: (raw.dependents as number) ?? 0,
      dependencies: (raw.dependencies as number) ?? 0,
      coverage: (raw.coverage as number) ?? 70,
      semanticSummary: raw.semanticSummary as string | undefined,
      author: (raw.author as string) ?? 'unknown',
      path: (raw.path as string) ?? raw.id,
      language: (raw.language as Language) ?? 'typescript',
      lastModified: (raw.lastModified as string) ?? 'unknown',
      riskLevel: (raw.riskLevel as RiskLevel) ?? 'none',
      flags: (raw.flags as string[]) ?? [],
      isEntryPoint: (raw.isEntryPoint as boolean) ?? false,
      isOrphan: (raw.isOrphan as boolean) ?? false,
    },
    position,
  };
}

export function useAnalyzeRepo() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [graph, setGraph] = useState<CodebaseGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (repoUrl: string, token?: string): Promise<CodebaseGraph | null> => {
      setStatus('loading');
      setError(null);
      setGraph(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('analyze-repo', {
          body: { repoUrl, token },
        });

        if (fnError) throw new Error(fnError.message);
        if (!data) throw new Error('No data returned from analysis function');
        if (data.error) throw new Error(data.error as string);

        const rawNodes: RawNode[] = data.nodes ?? [];
        const rawEdges: Array<{ id: string; source: string; target: string; relation: string; strength?: number }> =
          data.edges ?? [];

        // Compute deterministic hierarchical positions
        const positions = computeHierarchicalLayout(
          rawNodes.map((n) => ({ id: n.id as string, type: n.type as string })),
          rawEdges.map((e) => ({ source: e.source, target: e.target })),
        );

        const nodes: AxonNode[] = rawNodes.map((raw) =>
          toAxonNode(raw, positions.get(raw.id as string) ?? { x: Math.random() * 800, y: Math.random() * 600 }),
        );

        const edges: AxonEdge[] = rawEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          relation: e.relation as AxonEdge['relation'],
          strength: e.strength ?? 0.7,
        }));

        const codebaseGraph: CodebaseGraph = {
          nodes,
          edges,
          version: (data.version as string) ?? 'main',
          repoUrl: (data.repoUrl as string) ?? repoUrl,
          language: (data.language as Language) ?? 'typescript',
          analyzedAt: (data.analyzedAt as string) ?? new Date().toISOString(),
          stats: {
            totalFiles: (data.stats?.totalFiles as number) ?? nodes.length,
            totalLines: (data.stats?.totalLines as number) ?? 0,
            avgComplexity: (data.stats?.avgComplexity as number) ?? 5,
            hotspots: (data.stats?.hotspots as number) ?? 0,
            orphans: (data.stats?.orphans as number) ?? 0,
            circularDeps: (data.stats?.circularDeps as number) ?? 0,
            testCoverage: (data.stats?.testCoverage as number) ?? 0,
            languages: (data.stats?.languages as Record<string, number>) ?? {},
          },
          summary: (data.summary as string) ?? '',
          entryPoints: (data.entryPoints as string[]) ?? [],
        };

        setGraph(codebaseGraph);
        setStatus('success');
        return codebaseGraph;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Analysis failed';
        setError(msg);
        setStatus('error');
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setGraph(null);
    setError(null);
  }, []);

  return { analyze, status, graph, error, reset };
}
