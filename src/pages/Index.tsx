import { useState, useCallback, useRef } from 'react';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';
import { useAnalyzeRepo } from '@/hooks/useAnalyzeRepo';
import type { CodebaseGraph } from '@/types/graph';
import type { SessionStats } from '@/components/LiveStatsBar';

type AppStage = 'landing' | 'analyzing' | 'ready' | 'dashboard';

export default function Index() {
  const [stage, setStage] = useState<AppStage>('landing');
  const [repoUrl, setRepoUrl] = useState('');
  const { analyze, status, graph, error, reset } = useAnalyzeRepo();
  // Track whether the cosmetic animation has finished
  const animationDoneRef = useRef(false);
  const graphRef = useRef<CodebaseGraph | null>(null);

  const handleAnalyze = useCallback(
    async (url: string) => {
      setRepoUrl(url);
      setStage('analyzing');
      animationDoneRef.current = false;
      graphRef.current = null;

      // Start real analysis (non-blocking)
      const result = await analyze(url);
      graphRef.current = result;

      // If animation already finished, go straight to dashboard
      if (animationDoneRef.current) {
        if (result) setStage('dashboard');
        else setStage('landing'); // error — go back so landing can show the error
      }
      // else: wait for animation to call handleAnimationComplete
    },
    [analyze],
  );

  const handleAnimationComplete = useCallback(() => {
    animationDoneRef.current = true;
    if (graphRef.current) {
      setStage('dashboard');
    } else if (status === 'error') {
      // stay on landing — error will be shown there
      setStage('landing');
    }
    // else: API still running — Index will react when analyze() resolves
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
    />
  );
}
