import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2, RotateCcw, Mic, MicOff, GitCompare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { CodebaseGraph, AxonNode } from '@/types/graph';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DualMessage {
  role: 'user' | 'dual';
  content: string;
  gemini?: string;
  gpt?: string;
}

// ── Voice Input Hook ──────────────────────────────────────────────────────────
const SpeechRecognitionAPI: any =
  typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
    : null;

function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isSupported = SpeechRecognitionAPI !== null;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    if (isListening) {
      stop();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = navigator.language?.startsWith('ro') ? 'ro-RO' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalSoFar = '';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) finalSoFar += final;
      onTranscript(finalSoFar || interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      finalSoFar = '';
    };

    recognition.onerror = () => {
      setIsListening(false);
      finalSoFar = '';
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, stop, onTranscript]);

  // cleanup on unmount
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { isListening, toggleListening, isSupported };
}

interface RepoChatPanelProps {
  graph: CodebaseGraph;
  isOpen: boolean;
  onClose: () => void;
  onNodeFocus: (nodeId: string) => void;
}

// Build compact graph context (keep under ~6000 chars)
function buildGraphContext(graph: CodebaseGraph) {
  // Derive contributor stats from node authors (mirrors BusinessInsightsPanel logic)
  const authorCounts = new Map<string, number>();
  for (const n of graph.nodes) {
    const a = n.metadata.author;
    authorCounts.set(a, (authorCounts.get(a) ?? 0) + 1);
  }
  const contributors = [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, nodeCount]) => ({
      name,
      nodeCount,
      pct: Math.round((nodeCount / graph.nodes.length) * 100),
    }));

  return {
    repoUrl: graph.repoUrl,
    summary: graph.summary,
    stats: graph.stats,
    contributors,
    nodes: graph.nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      path: n.metadata.path,
      summary: n.metadata.semanticSummary,
      risk: n.metadata.riskLevel,
      flags: n.metadata.flags,
      functions: (n.metadata.functions ?? []).map(f => f.name),
      isEntryPoint: n.metadata.isEntryPoint,
      author: n.metadata.author,
    })),
    edges: graph.edges.map(e => ({ s: e.source, t: e.target, r: e.relation })),
  };
}

// Find node labels mentioned in AI response text
function findMentionedNodes(text: string, nodes: AxonNode[]): AxonNode[] {
  const found: AxonNode[] = [];
  for (const node of nodes) {
    // Match exact label (case-insensitive) surrounded by word boundaries or backticks
    const escaped = node.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(\`${escaped}\`|\\b${escaped}\\b)`, 'i');
    if (re.test(text)) found.push(node);
  }
  return found.slice(0, 5); // cap at 5 chips per message
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-repo`;
const DUAL_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-repo-dual`;

async function fetchDualChat({
  messages,
  graphContext,
}: {
  messages: Message[];
  graphContext: object;
}): Promise<{ gemini: string; gpt: string }> {
  const resp = await fetch(DUAL_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, graphContext }),
  });

  if (!resp.ok) {
    const json = await resp.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(json.error ?? `Error ${resp.status}`);
  }

  return resp.json();
}



async function streamChat({
  messages,
  graphContext,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: Message[];
  graphContext: object;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, graphContext }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const json = await resp.json().catch(() => ({ error: 'Unknown error' }));
    onError(json.error ?? `Error ${resp.status}`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }

  // flush remainder
  if (buf.trim()) {
    for (let raw of buf.split('\n')) {
      if (!raw.startsWith('data: ')) continue;
      const js = raw.slice(6).trim();
      if (js === '[DONE]') continue;
      try {
        const p = JSON.parse(js);
        const c = p.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch { /* ignore */ }
    }
  }
  onDone();
}

const SUGGESTIONS = [
  'Which file is the entry point and why?',
  'What are the highest-risk files in this codebase?',
  'Are there any circular dependencies?',
  'Which file handles authentication?',
  'What does the database layer look like?',
];

export default function RepoChatPanel({ graph, isOpen, onClose, onNodeFocus }: RepoChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const graphContext = useMemo(() => buildGraphContext(graph), [graph]);
  const repoSlug = graph.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '');

  const { isListening, toggleListening, isSupported: voiceSupported } = useVoiceInput((transcript) => {
    setInput(transcript);
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    abortRef.current = new AbortController();
    let assistantSoFar = '';

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        graphContext,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err}` }]);
          setIsLoading(false);
        },
        signal: abortRef.current.signal,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Failed to reach AI. Please try again.' }]);
      }
      setIsLoading(false);
    }
  }, [messages, graphContext, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 340 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 340 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          className="fixed right-0 top-0 bottom-0 w-[380px] z-50 flex flex-col"
          style={{
            background: 'hsl(var(--surface-1))',
            borderLeft: '1px solid hsl(var(--border))',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
            <div className="w-6 h-6 rounded-md bg-cyan/10 border border-cyan/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[11px] font-bold text-foreground">Ask your codebase</p>
              <p className="font-mono text-[9px] text-foreground-dim truncate">{repoSlug}</p>
            </div>
            <button
              onClick={reset}
              title="Clear conversation"
              className="text-foreground-dim hover:text-foreground transition-colors p-1 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="text-foreground-dim hover:text-foreground transition-colors p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="font-mono text-[10px] text-foreground-dim text-center pt-4">
                  Ask anything about this codebase
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-border bg-surface-2 font-mono text-[10px] text-foreground-dim hover:text-foreground hover:border-border-bright transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                nodes={graph.nodes}
                onNodeFocus={onNodeFocus}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 text-foreground-dim">
                <div className="w-6 h-6 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-cyan" />
                </div>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan" />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-border">
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{
                background: 'hsl(var(--surface-2))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about architecture, functions, risk…"
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none resize-none font-mono text-[11px] text-foreground placeholder:text-foreground-dim leading-relaxed max-h-[120px] overflow-y-auto disabled:opacity-50"
                style={{ minHeight: '20px' }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
              />
              {voiceSupported && (
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  title={isListening ? 'Stop recording' : 'Voice input'}
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none ${
                    isListening
                      ? 'bg-destructive/20 border border-destructive/50 text-destructive animate-pulse'
                      : 'bg-surface-3 border border-border text-foreground-dim hover:text-foreground hover:border-border-bright'
                  }`}
                >
                  {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                </button>
              )}
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center text-cyan hover:bg-cyan/20 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
            <p className="font-mono text-[9px] text-foreground-dim mt-1.5 text-center">
              Enter to send · Shift+Enter for newline{voiceSupported ? ' · 🎙 mic to speak' : ''}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChatMessage({ message, nodes, onNodeFocus }: { message: Message; nodes: AxonNode[]; onNodeFocus: (id: string) => void }) {
  const isUser = message.role === 'user';
  const mentionedNodes = useMemo(
    () => (isUser ? [] : findMentionedNodes(message.content, nodes)),
    [message.content, nodes, isUser]
  );

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? 'bg-surface-3 border border-border' : 'bg-cyan/10 border border-cyan/20'
      }`}>
        {isUser ? <User className="w-3 h-3 text-foreground-dim" /> : <Bot className="w-3 h-3 text-cyan" />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        <div
          className={`rounded-xl px-3 py-2 font-mono text-[11px] leading-relaxed max-w-full ${
            isUser
              ? 'bg-surface-3 text-foreground border border-border'
              : 'bg-cyan/5 text-foreground border border-cyan/10'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-xs prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_code]:bg-surface-3 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-surface-3 [&_pre]:p-2 [&_pre]:rounded-lg [&_h1]:text-[13px] [&_h2]:text-[12px] [&_h3]:text-[11px] [&_strong]:text-foreground">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Node chips */}
        {mentionedNodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mentionedNodes.map(node => (
              <button
                key={node.id}
                onClick={() => onNodeFocus(node.id)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] transition-all hover:scale-105"
                style={{
                  background: node.metadata.riskLevel === 'critical' || node.metadata.riskLevel === 'high'
                    ? 'rgba(239,68,68,0.1)' : 'rgba(0,255,255,0.08)',
                  border: `1px solid ${node.metadata.riskLevel === 'critical' || node.metadata.riskLevel === 'high'
                    ? 'rgba(239,68,68,0.3)' : 'rgba(0,255,255,0.2)'}`,
                  color: node.metadata.riskLevel === 'critical' || node.metadata.riskLevel === 'high'
                    ? '#ef4444' : '#00ffff',
                }}
                title={`Focus ${node.label} in graph`}
              >
                <span>⬡</span>
                {node.label}
                <span style={{ opacity: 0.6 }}>· {node.metadata.riskLevel}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
