import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { AxonNode } from '@/types/graph';

interface SearchBarProps {
  nodes: AxonNode[];
  onResults: (matchedIds: Set<string>, query: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function scoreNode(node: AxonNode, words: string[]): number {
  let score = 0;
  const fnNames = (node.metadata.functions ?? []).map(f => f.name.toLowerCase());
  const haystack = [
    node.label.toLowerCase(),
    node.type.toLowerCase(),
    (node.metadata.path ?? '').toLowerCase(),
    (node.metadata.semanticSummary ?? '').toLowerCase(),
    ...node.metadata.flags.map(f => f.toLowerCase()),
    node.metadata.author.toLowerCase(),
    ...fnNames,
  ].join(' ');

  for (const word of words) {
    if (!word) continue;
    // Function name exact match — highest priority (user searched for a specific function)
    if (fnNames.some(fn => fn === word)) score += 8;
    // Function name partial match — high priority
    else if (fnNames.some(fn => fn.includes(word))) score += 5;
    // Node label match
    if (node.label.toLowerCase().includes(word)) score += 4;
    if (node.type.toLowerCase() === word) score += 3;
    if (haystack.includes(word)) score += 1;
  }
  return score;
}

export default function SearchBar({ nodes, onResults, onClose, isOpen }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setMatchCount(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const runSearch = useCallback(
    (q: string) => {
      if (!q.trim()) {
        onResults(new Set(), '');
        setMatchCount(0);
        return;
      }
      const words = q.toLowerCase().trim().split(/\s+/);
      const matched = new Set<string>();
      for (const node of nodes) {
        if (scoreNode(node, words) > 0) matched.add(node.id);
      }
      onResults(matched, q);
      setMatchCount(matched.size);
    },
    [nodes, onResults],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    runSearch(v);
  };

  const handleClear = () => {
    setQuery('');
    onResults(new Set(), '');
    setMatchCount(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onResults(new Set(), '');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-16px)] sm:w-[480px] max-w-[calc(100vw-16px)]"
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-1/95 backdrop-blur-xl border border-border"
            style={{ boxShadow: '0 0 0 1px rgba(0,255,255,0.12), 0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <Search className="w-4 h-4 text-cyan flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder='Search nodes…'
              className="flex-1 min-w-0 bg-transparent border-none outline-none font-mono text-sm text-foreground placeholder:text-foreground-dim"
            />

            {/* Match count */}
            <AnimatePresence>
              {query && (
                <motion.span
                  key="count"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="font-mono text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: matchCount > 0 ? 'rgba(0,255,255,0.12)' : 'rgba(239,68,68,0.12)',
                    color: matchCount > 0 ? '#00ffff' : '#ef4444',
                    border: `1px solid ${matchCount > 0 ? 'rgba(0,255,255,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}
                >
                  {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'no match'}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Clear */}
            {query && (
              <button onClick={handleClear} className="text-foreground-dim hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close */}
            <button onClick={() => { onResults(new Set(), ''); onClose(); }} className="flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground-dim hover:text-foreground transition-colors">
              <kbd className="font-mono text-[9px] bg-surface-3 px-1.5 py-0.5 rounded border border-border text-foreground-dim">ESC</kbd>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
