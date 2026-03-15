import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CodebaseGraph } from '@/types/graph';

export type VoiceAction =
  | 'blast-radius'
  | 'security-review'
  | 'ghost-city'
  | 'switch-view'
  | 'search'
  | 'show-summary'
  | 'clear'
  | 'open-chat'
  | 'unknown';

export interface VoiceCommandResult {
  action: VoiceAction;
  target: string | null;   // view name for switch-view, query for search, etc.
  nodeId: string | null;   // resolved node id for blast-radius
  confidence: number;
  humanReadable: string;
}

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'done' | 'error' | 'unsupported';

interface UseVoiceCommandReturn {
  status: VoiceStatus;
  transcript: string;
  lastResult: VoiceCommandResult | null;
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyWindow = any;

export function useVoiceCommand(
  graph: CodebaseGraph | null,
  onResult: (result: VoiceCommandResult) => void,
): UseVoiceCommandReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const recognitionRef = useRef<any>(null);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim() || !graph) return;
    setStatus('processing');

    try {
      const nodeCatalog = graph.nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        path: n.metadata.path,
      }));

      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: { transcript: text, nodes: nodeCatalog },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const result: VoiceCommandResult = {
        action: data.action ?? 'unknown',
        target: data.target ?? null,
        nodeId: data.nodeId ?? null,
        confidence: data.confidence ?? 0,
        humanReadable: data.humanReadable ?? text,
      };

      setLastResult(result);
      setStatus('done');

      if (result.confidence > 0.4 && result.action !== 'unknown') {
        onResult(result);
      }
    } catch {
      setStatus('error');
    }
  }, [graph, onResult]);

  const startListening = useCallback(() => {
    const w = window as AnyWindow;
    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setStatus('unsupported');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus('listening');
      setTranscript('');
      setLastResult(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) {
        recognition.stop();
        processTranscript(final);
      }
    };

    recognition.onerror = () => {
      setStatus('error');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [processTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus('idle');
  }, []);

  return {
    status,
    transcript,
    lastResult,
    startListening,
    stopListening,
    isListening: status === 'listening',
  };
}
