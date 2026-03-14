import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Shield, GitPullRequest, Route, HelpCircle } from 'lucide-react';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  commands: SlashCommand[];
}

export default function CommandBar({ isOpen, onClose, commands }: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = query.startsWith('/')
    ? commands.filter(c => c.name.toLowerCase().includes(query.slice(1).toLowerCase()))
    : query
    ? commands.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (filtered[selectedIdx]) {
        filtered[selectedIdx].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Command Bar */}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[540px] z-50"
          >
            <div
              className="bg-surface-1/90 backdrop-blur-xl rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6)' }}
            >
              {/* Input Row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <span className="font-mono text-sm text-cyan font-bold select-none">AXON_</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type /blast-radius, /security-review, /tour..."
                  className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-foreground placeholder:text-foreground-dim"
                />
                <div className="flex items-center gap-2">
                  <kbd className="font-mono text-[9px] bg-surface-3 px-1.5 py-0.5 rounded text-foreground-dim border border-border">
                    ESC
                  </kbd>
                  <button onClick={onClose}>
                    <X className="w-4 h-4 text-foreground-dim hover:text-foreground transition-colors" />
                  </button>
                </div>
              </div>

              {/* Command List */}
              {filtered.length > 0 && (
                <div className="py-1.5 max-h-[280px] overflow-y-auto">
                  {filtered.map((cmd, idx) => {
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
                          <Icon className="w-4 h-4" style={{ color: cmd.color } as React.CSSProperties} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs font-semibold text-foreground">/{cmd.name}</span>
                          <p className="font-mono text-[10px] text-foreground-dim mt-0.5 truncate">{cmd.description}</p>
                        </div>
                        {idx === selectedIdx && (
                          <kbd className="font-mono text-[9px] bg-surface-3 px-1.5 py-0.5 rounded text-foreground-dim border border-border flex-shrink-0">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {filtered.length === 0 && query && (
                <div className="py-6 text-center">
                  <HelpCircle className="w-8 h-8 text-foreground-dim mx-auto mb-2" />
                  <p className="font-mono text-xs text-foreground-dim">No command matched "{query}"</p>
                </div>
              )}

              {/* Footer hint */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-border">
                <span className="font-mono text-[9px] text-foreground-dim">↑↓ navigate</span>
                <span className="font-mono text-[9px] text-foreground-dim">↵ execute</span>
                <span className="font-mono text-[9px] text-foreground-dim ml-auto">
                  {filtered.length} commands
                </span>
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
}): SlashCommand[] {
  return [
    {
      id: 'blast-radius',
      name: 'blast-radius',
      description: 'Select a node to highlight all upstream dependents and impact radius',
      icon: Zap,
      color: '#ef4444',
      action: callbacks.onBlastRadius,
    },
    {
      id: 'security-review',
      name: 'security-review',
      description: 'Analyze auth chains, permission boundaries, and exploitable paths',
      icon: Shield,
      color: '#a855f7',
      action: callbacks.onSecurityReview,
    },
    {
      id: 'review-pr',
      name: 'review-pr',
      description: 'Compare current branch vs main — visualize diffs and regressions',
      icon: GitPullRequest,
      color: '#3b82f6',
      action: callbacks.onReviewPR,
    },
    {
      id: 'tour',
      name: 'tour',
      description: 'Guided camera tour through entry points, core logic, and data layer',
      icon: Route,
      color: '#22c55e',
      action: callbacks.onTour,
    },
  ];
}
