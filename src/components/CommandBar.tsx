import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Shield, GitPullRequest, Route, HelpCircle, Search, Ghost, Plus, Sparkles, Trash2, Loader2 } from 'lucide-react';
import type { CustomCommand } from '@/hooks/useCustomCommands';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
  isCustom?: boolean;
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  commands: SlashCommand[];
  customCommands?: CustomCommand[];
  onExecuteCustom?: (cmd: CustomCommand) => void;
  onCreateCustom?: (name: string, description: string) => Promise<void>;
  onDeleteCustom?: (id: string) => void;
  isLoggedIn?: boolean;
}

type TabMode = 'commands' | 'new';

export default function CommandBar({
  isOpen, onClose, commands,
  customCommands = [], onExecuteCustom, onCreateCustom, onDeleteCustom,
  isLoggedIn = false,
}: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState<TabMode>('commands');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(''); setSelectedIdx(0); setTab('commands');
      setNewName(''); setNewDesc(''); setCreateError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (tab === 'new') setTimeout(() => descRef.current?.focus(), 50);
    else setTimeout(() => inputRef.current?.focus(), 50);
  }, [tab]);

  // All commands merged (built-in + custom rendered as SlashCommand-like)
  const builtIn = query
    ? commands.filter(c =>
        c.name.toLowerCase().includes(query.replace(/^\//, '').toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const filteredCustom = query
    ? customCommands.filter(c =>
        c.name.toLowerCase().includes(query.replace(/^\//, '').toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : customCommands;

  const totalFiltered = builtIn.length + filteredCustom.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (tab !== 'commands') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, totalFiltered - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      if (selectedIdx < builtIn.length) {
        builtIn[selectedIdx].action(); onClose();
      } else {
        const custom = filteredCustom[selectedIdx - builtIn.length];
        if (custom) { onExecuteCustom?.(custom); onClose(); }
      }
    }
    else if (e.key === 'Escape') { onClose(); }
  };

  const handleCreate = async () => {
    const nameClean = newName.replace(/[^a-z0-9-]/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');
    if (!nameClean) { setCreateError('Command name required'); return; }
    if (!newDesc.trim()) { setCreateError('Description required — tell the AI what to highlight'); return; }
    setCreateError('');
    setCreating(true);
    try {
      await onCreateCustom?.(nameClean, newDesc.trim());
      setNewName(''); setNewDesc('');
      setTab('commands');
    } catch {
      setCreateError('Failed to save command');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[580px] max-w-[calc(100vw-24px)] z-50"
          >
            <div
              className="bg-surface-1/90 backdrop-blur-xl rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6)' }}
            >
              {/* ── Header ── */}
              {tab === 'commands' ? (
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <span className="font-mono text-sm text-cyan font-bold select-none">AXON_</span>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type /command or search…"
                    className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-foreground placeholder:text-foreground-dim"
                  />
                  <div className="flex items-center gap-2">
                    {isLoggedIn && (
                      <button
                        onClick={() => setTab('new')}
                        title="Create custom command"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan/10 border border-cyan/25 font-mono text-[10px] text-cyan hover:bg-cyan/15 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        New
                      </button>
                    )}
                    <kbd className="font-mono text-[9px] bg-surface-3 px-1.5 py-0.5 rounded text-foreground-dim border border-border">ESC</kbd>
                    <button onClick={onClose}><X className="w-4 h-4 text-foreground-dim hover:text-foreground transition-colors" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <Sparkles className="w-4 h-4 text-cyan flex-shrink-0" />
                  <span className="font-mono text-sm text-foreground font-semibold flex-1">New Custom Command</span>
                  <button
                    onClick={() => setTab('commands')}
                    className="font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
                  >
                    ← Back
                  </button>
                  <button onClick={onClose}><X className="w-4 h-4 text-foreground-dim hover:text-foreground transition-colors" /></button>
                </div>
              )}

              {/* ── Commands list ── */}
              {tab === 'commands' && (
                <div className="py-1.5 max-h-[380px] overflow-y-auto">

                  {/* Custom commands section */}
                  {filteredCustom.length > 0 && (
                    <>
                      <div className="px-4 pt-2 pb-1">
                        <span className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase">Custom Commands</span>
                      </div>
                      {filteredCustom.map((cmd, idx) => {
                        const globalIdx = builtIn.length + idx;
                        return (
                          <div
                            key={cmd.id}
                            className={`flex items-center gap-3 px-4 py-2.5 group transition-colors duration-100
                              ${globalIdx === selectedIdx ? 'bg-surface-3' : 'hover:bg-surface-2'}`}
                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                          >
                            <button
                              className="flex items-center gap-3 flex-1 text-left min-w-0"
                              onClick={() => { onExecuteCustom?.(cmd); onClose(); }}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `${cmd.color}15`, border: `1px solid ${cmd.color}25` }}
                              >
                                <span style={{ color: cmd.color }}><Sparkles className="w-4 h-4" /></span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-mono text-xs font-semibold text-foreground">/{cmd.name}</span>
                                <p className="font-mono text-[10px] text-foreground-dim mt-0.5 truncate">{cmd.description}</p>
                              </div>
                            </button>
                            {globalIdx === selectedIdx && (
                              <kbd className="font-mono text-[9px] bg-surface-3 px-1.5 py-0.5 rounded text-foreground-dim border border-border flex-shrink-0">↵</kbd>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); onDeleteCustom?.(cmd.id); }}
                              title="Delete command"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-3 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3 text-foreground-dim hover:text-alert transition-colors" />
                            </button>
                          </div>
                        );
                      })}
                      {builtIn.length > 0 && (
                        <div className="px-4 pt-3 pb-1">
                          <span className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase">Built-in Commands</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Built-in commands */}
                  {builtIn.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => { cmd.action(); onClose(); }}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 text-left
                          ${idx === selectedIdx ? 'bg-surface-3' : 'hover:bg-surface-2'}`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${cmd.color}15`, border: `1px solid ${cmd.color}25` }}
                        >
                          <span style={{ color: cmd.color }}><Icon className="w-4 h-4" /></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs font-semibold text-foreground">/{cmd.name}</span>
                          <p className="font-mono text-[10px] text-foreground-dim mt-0.5 truncate">{cmd.description}</p>
                        </div>
                        {idx === selectedIdx && (
                          <kbd className="font-mono text-[9px] bg-surface-3 px-1.5 py-0.5 rounded text-foreground-dim border border-border flex-shrink-0">↵</kbd>
                        )}
                      </button>
                    );
                  })}

                  {totalFiltered === 0 && query && (
                    <div className="py-6 text-center">
                      <HelpCircle className="w-8 h-8 text-foreground-dim mx-auto mb-2" />
                      <p className="font-mono text-xs text-foreground-dim">No command matched "{query}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── New command form ── */}
              {tab === 'new' && (
                <div className="px-5 py-4 space-y-4">
                  {/* Description first — most important field */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-foreground-dim tracking-widest uppercase">
                      What should the AI highlight?
                    </label>
                    <textarea
                      ref={descRef}
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="e.g. nodes that handle transactions and payments, highlight auth-related files, show database models and ORM layers…"
                      rows={3}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-foreground-dim outline-none focus:border-cyan/50 resize-none transition-colors"
                    />
                    <p className="font-mono text-[9px] text-foreground-dim">
                      Describe in plain English — the AI will figure out which nodes match each time you run it.
                    </p>
                  </div>

                  {/* Command name */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-foreground-dim tracking-widest uppercase">
                      Command name
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-cyan font-bold select-none flex-shrink-0">/</span>
                      <input
                        ref={nameRef}
                        value={newName}
                        onChange={e => setNewName(e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase())}
                        placeholder="transaction-nodes"
                        className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 font-mono text-xs text-foreground placeholder:text-foreground-dim outline-none focus:border-cyan/50 transition-colors"
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                      />
                    </div>
                    <p className="font-mono text-[9px] text-foreground-dim">
                      Lowercase letters, numbers, dashes only.
                    </p>
                  </div>

                  {createError && (
                    <p className="font-mono text-[10px] text-alert">{createError}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan/10 border border-cyan/30 font-mono text-xs text-cyan hover:bg-cyan/15 transition-colors disabled:opacity-50"
                    >
                      {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {creating ? 'Saving…' : 'Create command'}
                    </button>
                    <button
                      onClick={() => setTab('commands')}
                      className="px-4 py-2 rounded-xl font-mono text-xs text-foreground-dim hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ── Footer ── */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-border">
                {tab === 'commands' ? (
                  <>
                    <span className="font-mono text-[9px] text-foreground-dim">↑↓ navigate</span>
                    <span className="font-mono text-[9px] text-foreground-dim">↵ execute</span>
                    {!isLoggedIn && (
                      <span className="font-mono text-[9px] text-foreground-dim/60 ml-auto">Sign in to create custom commands</span>
                    )}
                    <span className="font-mono text-[9px] text-foreground-dim ml-auto">{totalFiltered} commands</span>
                  </>
                ) : (
                  <span className="font-mono text-[9px] text-foreground-dim">Commands are saved per repository</span>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Default slash commands factory ──────────────────────────────────────────

export function buildSlashCommands(callbacks: {
  onBlastRadius: () => void;
  onSecurityReview: () => void;
  onTour: () => void;
  onReviewPR: () => void;
  onSearch: () => void;
  onGhostCity: () => void;
}): SlashCommand[] {
  return [
    {
      id: 'blast-radius',
      name: 'blast-radius',
      description: 'Select a node to highlight all upstream dependents and impact radius',
      icon: Zap, color: '#ef4444',
      action: callbacks.onBlastRadius,
    },
    {
      id: 'security-review',
      name: 'security-review',
      description: 'Analyze auth chains, permission boundaries, and exploitable paths',
      icon: Shield, color: '#a855f7',
      action: callbacks.onSecurityReview,
    },
    {
      id: 'search',
      name: 'search',
      description: 'Natural language search — "auth logic", "database queries", "entry point"',
      icon: Search, color: '#00ffff',
      action: callbacks.onSearch,
    },
    {
      id: 'ghost-city',
      name: 'ghost-city',
      description: 'Highlight orphaned / dead code — files nothing calls',
      icon: Ghost, color: '#64748b',
      action: callbacks.onGhostCity,
    },
    {
      id: 'review-pr',
      name: 'review-pr',
      description: 'Compare current branch vs main — visualize diffs and regressions',
      icon: GitPullRequest, color: '#3b82f6',
      action: callbacks.onReviewPR,
    },
    {
      id: 'tour',
      name: 'tour',
      description: 'Guided camera tour through entry points, core logic, and data layer',
      icon: Route, color: '#22c55e',
      action: callbacks.onTour,
    },
  ];
}
