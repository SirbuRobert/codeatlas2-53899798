import { useState } from 'react';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';

export default function Index() {
  const [repoUrl, setRepoUrl] = useState<string | null>(null);

  if (repoUrl) {
    return <Dashboard repoUrl={repoUrl} onReset={() => setRepoUrl(null)} />;
  }

  return <LandingPage onAnalyze={setRepoUrl} />;
}
