import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CodebaseGraph } from '@/types/graph';

export interface CustomCommand {
  id: string;
  name: string;
  description: string;
  color: string;
  repoUrl: string;
  createdAt: string;
}

const COMMAND_COLORS = [
  '#00ffff', '#a855f7', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#f97316', '#06b6d4',
];

export function useCustomCommands(repoUrl: string | null) {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCommands = useCallback(async () => {
    if (!repoUrl) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('repo_commands')
      .select('*')
      .eq('user_id', user.id)
      .eq('repo_url', repoUrl)
      .order('created_at', { ascending: true });

    if (data) {
      setCommands(data.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        color: r.color,
        repoUrl: r.repo_url,
        createdAt: r.created_at,
      })));
    }
  }, [repoUrl]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  const createCommand = useCallback(async (name: string, description: string): Promise<CustomCommand | null> => {
    if (!repoUrl) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Pick a color based on index
    const color = COMMAND_COLORS[commands.length % COMMAND_COLORS.length];

    const { data, error } = await supabase
      .from('repo_commands')
      .insert({ user_id: user.id, repo_url: repoUrl, name, description, color })
      .select()
      .single();

    if (error || !data) return null;

    const newCmd: CustomCommand = {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      repoUrl: data.repo_url,
      createdAt: data.created_at,
    };
    setCommands(prev => [...prev, newCmd]);
    return newCmd;
  }, [repoUrl, commands.length]);

  const deleteCommand = useCallback(async (id: string) => {
    await supabase.from('repo_commands').delete().eq('id', id);
    setCommands(prev => prev.filter(c => c.id !== id));
  }, []);

  const executeCommand = useCallback(async (
    command: CustomCommand,
    graph: CodebaseGraph,
  ): Promise<Set<string>> => {
    setLoading(true);
    try {
      const nodeCatalog = graph.nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        path: n.metadata.path,
        semanticSummary: n.metadata.semanticSummary,
        flags: n.metadata.flags,
      }));

      const { data, error } = await supabase.functions.invoke('execute-command', {
        body: { description: command.description, nodes: nodeCatalog },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const ids: string[] = data?.nodeIds ?? [];
      return new Set(ids);
    } finally {
      setLoading(false);
    }
  }, []);

  return { commands, loading, fetchCommands, createCommand, deleteCommand, executeCommand };
}
