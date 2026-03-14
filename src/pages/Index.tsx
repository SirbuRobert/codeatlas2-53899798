import { useState, useCallback, useRef } from 'react';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';
import { useAnalyzeRepo } from '@/hooks/useAnalyzeRepo';
import type { CodebaseGraph } from '@/types/graph';
import type { SessionStats } from '@/components/LiveStatsBar';

type AppStage = 'landing' | 'analyzing' | 'ready' | 'dashboard';

const BASELINE_STATS: SessionStats = {
  reposAnalyzed: 247,
  nodesMapped: 48392,
  riskFlags: 1204,
};

export default function Index() {
  const [stage, setStage] = useState<AppStage>('landing');
  const [repoUrl, setRepoUrl] = useState('');
  const [sessionStats, setSessionStats] = useState<SessionStats>(BASELINE_STATS);
  const { analyze, status, graph, error, reset } = useAnalyzeRepo();
  const animationDoneRef = useRef(false);
  const graphRef = useRef<CodebaseGraph | null>(null);

  const handleAnalyze = useCallback(
    async (url: string) => {
      setRepoUrl(url);
      setStage('analyzing');
      animationDoneRef.current = false;
      graphRef.current = null;

      // Automatically include GitHub PAT if available
      const token = localStorage.getItem('axon_gh_token') ?? undefined;
      const result = await analyze(url, token);
      graphRef.current = result;

      if (result) {
        // Increment session stats when a real analysis completes
        setSessionStats((prev) => ({
          reposAnalyzed: prev.reposAnalyzed + 1,
          nodesMapped: prev.nodesMapped + result.nodes.length,
          riskFlags: prev.riskFlags + result.stats.hotspots,
        }));
      }

      if (animationDoneRef.current) {
        if (result) setStage('dashboard');
        else setStage('landing');
      }
    },
    [analyze],
  );

  const handleAnimationComplete = useCallback(() => {
    animationDoneRef.current = true;
    if (graphRef.current) {
      setStage('dashboard');
    } else if (status === 'error') {
      setStage('landing');
    }
  }, [status]);

  const handleReset = useCallback(() => {
    reset();
    setStage('landing');
    setRepoUrl('');
    animationDoneRef.current = false;
    graphRef.current = null;
  }, [reset]);

  if (stage === 'dashboard' && graph) {
    return <Dashboard graph={graph} repoUrl={repoUrl} onReset={handleReset} />;
  }

  return (
    <LandingPage
      onAnalyze={handleAnalyze}
      isAnalyzing={stage === 'analyzing'}
      analysisError={status === 'error' ? error : null}
      onAnimationComplete={handleAnimationComplete}
      sessionStats={sessionStats}
    />
  );
}
