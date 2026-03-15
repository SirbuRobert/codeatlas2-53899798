import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';
import { useAnalyzeRepo } from '@/hooks/useAnalyzeRepo';
import { toast } from '@/hooks/use-toast';
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
  const { analyze, status, graph, error, reset, webhookResult } = useAnalyzeRepo();
  const animationDoneRef = useRef(false);
  const graphRef = useRef<CodebaseGraph | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoTriggeredRef = useRef(false);

  const handleAnalyze = useCallback(
    async (url: string) => {
      setRepoUrl(url);
      setStage('analyzing');
      animationDoneRef.current = false;
      graphRef.current = null;

      // Token is resolved server-side from encrypted DB — just pass the URL
      const result = await analyze(url);
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

  // Auto-analyze from ?url=FULL_GITHUB_URL (shareable/refresh-safe link)
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      // Skip animation when auto-loading from URL param
      animationDoneRef.current = true;
      handleAnalyze(urlParam);
      return;
    }
    // Legacy Chrome extension format: ?repo=owner/repo&auto=true
    const repoParam = searchParams.get('repo');
    const autoParam = searchParams.get('auto');
    if (repoParam && autoParam === 'true' && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      animationDoneRef.current = true;
      handleAnalyze(`https://github.com/${repoParam}`);
    }
  }, [searchParams, handleAnalyze]);

  // Update URL to ?url=REPO when dashboard is ready (enables refresh & sharing)
  useEffect(() => {
    if (stage === 'dashboard' && repoUrl) {
      setSearchParams({ url: repoUrl }, { replace: true });
    }
  }, [stage, repoUrl, setSearchParams]);

  // Show toast when a webhook fires successfully after analysis
  useEffect(() => {
    if (!webhookResult || webhookResult.sent === 0) return;
    const urls = webhookResult.results?.map(r => r.url).join(', ') ?? '';
    toast({
      title: `📡 Webhook sent (${webhookResult.sent})`,
      description: urls ? `Notified: ${urls.length > 60 ? urls.slice(0, 57) + '…' : urls}` : 'analysis.complete event delivered',
    });
  }, [webhookResult]);

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
    setSearchParams({}, { replace: true });
    animationDoneRef.current = false;
    graphRef.current = null;
    autoTriggeredRef.current = false;
  }, [reset, setSearchParams]);

  if (stage === 'dashboard' && graph) {
    return <Dashboard graph={graph} repoUrl={repoUrl} onReset={handleReset} webhookResult={webhookResult} />;
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
