import { motion } from 'framer-motion';
import { ArrowLeft, Copy, CheckCircle, Terminal, Globe, Zap, Code, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/public-analyze',
    title: 'Analyze Repository',
    description: 'Analyze any public GitHub repository and get a full codebase graph in JSON.',
    params: [
      { name: 'repo_url', type: 'string', required: true, desc: 'Full GitHub repository URL' },
      { name: 'github_token', type: 'string', required: false, desc: 'GitHub PAT for private repos (optional)' },
    ],
    example: `curl -X POST ${BASE_URL}/public-analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "repo_url": "https://github.com/facebook/react"
  }'`,
    response: `{
  "success": true,
  "api_version": "1.0",
  "repo_url": "https://github.com/facebook/react",
  "analyzed_at": "2026-03-15T10:00:00.000Z",
  "graph": {
    "repoUrl": "https://github.com/facebook/react",
    "version": "main",
    "summary": "A declarative UI library...",
    "stats": { "totalNodes": 42, "totalEdges": 87, ... },
    "nodes": [ { "id": "...", "label": "ReactDOM", ... } ],
    "edges": [ { "source": "...", "target": "...", ... } ]
  }
}`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded font-mono text-[9px] bg-surface-3 border border-border text-foreground-dim hover:text-foreground transition-all"
    >
      {copied ? <CheckCircle className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function ApiDocs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'curl' | 'response'>('curl');

  const handleTryIt = async () => {
    toast({
      title: 'API Request',
      description: 'Open your terminal and paste the curl command above to try the API live.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface-1 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="font-mono text-xs font-bold text-foreground">PUBLIC API</span>
        <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-success/15 text-success border border-success/30">
          v1.0 · LIVE
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-mono text-2xl font-bold text-foreground">CodeAtlas Public API</h1>
              <p className="font-mono text-xs text-foreground-dim">Analyze any GitHub repository programmatically</p>
            </div>
          </div>
          <p className="font-mono text-sm text-foreground-muted max-w-2xl leading-relaxed">
            The CodeAtlas API lets you integrate codebase analysis into your CI/CD pipeline, internal tooling, or any external service.
            No authentication required for public repositories.
          </p>

          {/* Base URL */}
          <div className="mt-6 relative">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-3.5 h-3.5 text-foreground-dim" />
              <span className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider">Base URL</span>
            </div>
            <div className="relative bg-surface-2 border border-border rounded-xl p-4 font-mono text-sm text-primary">
              {BASE_URL}
              <CopyButton text={BASE_URL} />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          {[
            { icon: Zap, label: 'No Auth Required', desc: 'Public repos need no token' },
            { icon: Code, label: 'JSON Response', desc: 'Full graph schema returned' },
            { icon: Globe, label: 'CORS Enabled', desc: 'Call from any origin' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-surface-1 border border-border rounded-xl p-4">
              <Icon className="w-4 h-4 text-primary mb-2" />
              <div className="font-mono text-[11px] font-bold text-foreground">{label}</div>
              <div className="font-mono text-[10px] text-foreground-dim mt-0.5">{desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Endpoints */}
        {ENDPOINTS.map((ep, i) => (
          <motion.div
            key={ep.path}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
            className="mb-8 bg-surface-1 border border-border rounded-2xl overflow-hidden"
          >
            {/* Endpoint header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
              <span className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-success/15 text-success border border-success/25">
                {ep.method}
              </span>
              <code className="font-mono text-sm text-foreground">{ep.path}</code>
              <span className="ml-auto font-mono text-[10px] text-foreground-dim">{ep.title}</span>
            </div>

            <div className="p-6 space-y-6">
              <p className="font-mono text-[11px] text-foreground-muted leading-relaxed">{ep.description}</p>

              {/* Parameters */}
              <div>
                <h3 className="font-mono text-[10px] font-bold text-foreground uppercase tracking-wider mb-3">Parameters</h3>
                <div className="space-y-2">
                  {ep.params.map((p) => (
                    <div key={p.name} className="flex items-start gap-3 bg-surface-2 rounded-lg px-4 py-3">
                      <code className="font-mono text-[11px] text-primary flex-shrink-0">{p.name}</code>
                      <span className="font-mono text-[10px] text-foreground-dim flex-shrink-0">{p.type}</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                        p.required ? 'bg-alert/10 text-alert border border-alert/20' : 'bg-surface-3 text-foreground-dim border border-border'
                      }`}>
                        {p.required ? 'required' : 'optional'}
                      </span>
                      <span className="font-mono text-[10px] text-foreground-dim">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example / Response tabs */}
              <div>
                <div className="flex gap-1 mb-3">
                  {(['curl', 'response'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`font-mono text-[10px] px-3 py-1.5 rounded-lg transition-all ${
                        activeTab === tab
                          ? 'bg-surface-3 border border-border-bright text-foreground'
                          : 'text-foreground-dim hover:text-foreground'
                      }`}
                    >
                      {tab === 'curl' ? '$ cURL Example' : '↩ Response Schema'}
                    </button>
                  ))}
                </div>
                <div className="relative bg-surface-3 rounded-xl p-4 overflow-x-auto">
                  <pre className="font-mono text-[11px] text-foreground-muted leading-relaxed whitespace-pre-wrap">
                    {activeTab === 'curl' ? ep.example : ep.response}
                  </pre>
                  <CopyButton text={activeTab === 'curl' ? ep.example : ep.response} />
                </div>
              </div>

              <button
                onClick={handleTryIt}
                className="flex items-center gap-1.5 font-mono text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open in terminal
              </button>
            </div>
          </motion.div>
        ))}

        {/* Rate limits note */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-8 bg-warning/5 border border-warning/20 rounded-xl p-5"
        >
          <h3 className="font-mono text-[11px] font-bold text-warning mb-2">Rate Limits</h3>
          <p className="font-mono text-[11px] text-foreground-dim leading-relaxed">
            The public API inherits GitHub's rate limits: 60 requests/hour unauthenticated, 5000/hour with a GitHub PAT.
            Pass <code className="text-primary px-1 bg-surface-3 rounded">github_token</code> in your request to increase limits.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
