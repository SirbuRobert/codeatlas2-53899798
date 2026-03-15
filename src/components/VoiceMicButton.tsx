import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import type { VoiceCommandResult } from '@/hooks/useVoiceCommand';
import type { CodebaseGraph } from '@/types/graph';

interface VoiceMicButtonProps {
  graph: CodebaseGraph;
  onResult: (result: VoiceCommandResult) => void;
}

export default function VoiceMicButton({ graph, onResult }: VoiceMicButtonProps) {
  const { status, transcript, lastResult, startListening, stopListening, isListening } =
    useVoiceCommand(graph, onResult);

  const handleClick = useCallback(() => {
    if (isListening || status === 'processing') {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, status, startListening, stopListening]);

  const isActive = isListening || status === 'processing';

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={handleClick}
        title={
          status === 'unsupported'
            ? 'Voice commands not supported in this browser'
            : isListening
            ? 'Listening… click to stop'
            : status === 'processing'
            ? 'Processing…'
            : 'Voice command (hold and speak)'
        }
        disabled={status === 'unsupported'}
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[10px] transition-all whitespace-nowrap overflow-hidden ${
          status === 'unsupported'
            ? 'bg-surface-2 border-border text-foreground-dim/40 cursor-not-allowed'
            : isActive
            ? 'bg-alert/10 border-alert/50 text-alert'
            : 'bg-surface-2 border-border text-foreground-dim hover:text-foreground hover:border-border-bright'
        }`}
      >
        {/* Animated pulse ring when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-lg animate-ping bg-alert/20 pointer-events-none" />
        )}

        {status === 'processing' ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-3 h-3" />
        ) : (
          <Mic className="w-3 h-3" />
        )}
        <span>
          {status === 'processing' ? 'Thinking…' : isListening ? 'Listening…' : 'Speak Up'}
        </span>
      </button>

      {/* Floating transcript / result toast */}
      <AnimatePresence>
        {(isListening && transcript) || status === 'processing' || status === 'done' || status === 'error' ? (
          <motion.div
            key={status + transcript}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 z-50 pointer-events-none"
          >
            <div
              className="rounded-xl px-3 py-2.5 font-mono text-[10px] leading-relaxed"
              style={{
                background: 'hsl(var(--surface-1) / 0.95)',
                border: '1px solid hsl(var(--border-bright) / 0.6)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Waveform bars when listening */}
              {isListening && (
                <div className="flex items-center gap-0.5 mb-2 justify-center">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <motion.span
                      key={i}
                      className="w-0.5 rounded-full bg-alert"
                      animate={{ height: ['4px', `${6 + Math.random() * 12}px`, '4px'] }}
                      transition={{ duration: 0.4 + i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ display: 'block', minHeight: '4px' }}
                    />
                  ))}
                </div>
              )}

              {status === 'error' && (
                <p className="text-alert text-center">Couldn't catch that — try again?</p>
              )}

              {(isListening || status === 'processing') && transcript && (
                <p className="text-foreground-muted italic text-center">"{transcript}"</p>
              )}

              {status === 'processing' && (
                <p className="text-foreground-dim text-center mt-1">Interpreting…</p>
              )}

              {status === 'done' && lastResult && (
                <div className="space-y-1">
                  <p className="text-foreground text-center">{lastResult.humanReadable}</p>
                  {lastResult.confidence < 0.5 && (
                    <p className="text-foreground-dim text-center text-[9px]">Low confidence — try rephrasing</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
