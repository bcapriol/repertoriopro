-- Habilita acesso offline e sincronização de exclusões entre aparelhos
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-03T19:43:32.730Z

CREATE TABLE IF NOT EXISTS public.cloud_exclusoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES public.bandas(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('song', 'setlist')),
  atualizado_em timestamptz NOT NULL,
  UNIQUE (banda_id, tipo, item_id)
);
CREATE INDEX IF NOT EXISTS cloud_exclusoes_banda_idx ON public.cloud_exclusoes (banda_id);
ALTER TABLE public.cloud_exclusoes ENABLE ROW LEVEL SECURITY;
-- O aplicativo usa somente as funções autenticadas do servidor para ler e gravar exclusões.
-- Sem políticas públicas: somente a chave interna do servidor acessa estas linhas.

ALTER TABLE public.cloud_exclusoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Somente servidor gerencia exclusoes" ON public.cloud_exclusoes;
CREATE POLICY "Somente servidor gerencia exclusoes" ON public.cloud_exclusoes FOR ALL TO service_role USING (true) WITH CHECK (true);
