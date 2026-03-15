CREATE TABLE public.repo_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repo_url text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  color text NOT NULL DEFAULT '#00ffff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, repo_url, name)
);

ALTER TABLE public.repo_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own commands"
  ON public.repo_commands
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_repo_commands_updated_at
  BEFORE UPDATE ON public.repo_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();