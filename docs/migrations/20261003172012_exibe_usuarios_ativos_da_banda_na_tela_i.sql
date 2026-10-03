-- Exibe usuários ativos da banda na tela inicial
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-03T20:20:12.905Z

CREATE TABLE IF NOT EXISTS public.presencas_online (
  usuario_id uuid NOT NULL REFERENCES public.app_usuarios(id) ON DELETE CASCADE,
  sessao_id uuid NOT NULL,
  banda_id uuid NOT NULL REFERENCES public.bandas(id) ON DELETE CASCADE,
  visto_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, sessao_id)
);
CREATE INDEX IF NOT EXISTS presencas_online_banda_visto_idx ON public.presencas_online (banda_id, visto_em DESC);
ALTER TABLE public.presencas_online ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Somente servidor gerencia presencas" ON public.presencas_online;
CREATE POLICY "Somente servidor gerencia presencas" ON public.presencas_online FOR ALL TO service_role USING (true) WITH CHECK (true);
