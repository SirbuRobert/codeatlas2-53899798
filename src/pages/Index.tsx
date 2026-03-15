import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';
import { useAnalyzeRepo } from '@/hooks/useAnalyzeRepo';
import { useAuth } from '@/hooks/useAuth';
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
  const { getGithubToken } = useAuth();
  const animationDoneRef = useRef(false);
  const graphRef = useRef<CodebaseGraph | null>(null);
  const [searchParams] = useSearchParams();
  const autoTriggeredRef = useRef(false);

  const handleAnalyze = useCallback(
    async (url: string) => {
      setRepoUrl(url);
      setStage('analyzing');
      animationDoneRef.current = false;
      graphRef.current = null;

      // Prefer profile token, fall back to localStorage
      const token = getGithubToken();
      const result = await analyze(url, token || undefined);
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
    [analyze, getGithubToken],
  );

  // Auto-analyze when launched from Chrome extension with ?repo=owner/repo&auto=true
  useEffect(() => {
    const repoParam = searchParams.get('repo');
    const autoParam = searchParams.get('auto');
    if (repoParam && autoParam === 'true' && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      const fullUrl = `https://github.com/${repoParam}`;
      handleAnalyze(fullUrl);
    }
  }, [searchParams, handleAnalyze]);

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
    autoTriggeredRef.current = false;
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
