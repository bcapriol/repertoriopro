-- Adiciona configurações, formulário e rascunhos de contratos de eventos
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-03T16:38:39.740Z

CREATE TABLE IF NOT EXISTS public.contratos_configuracoes (banda_id uuid PRIMARY KEY REFERENCES public.bandas(id), dados jsonb NOT NULL DEFAULT '{}'::jsonb, atualizado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.contratos_eventos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), banda_id uuid NOT NULL REFERENCES public.bandas(id), usuario_id uuid NOT NULL REFERENCES public.app_usuarios(id), numero text NOT NULL, ano integer NOT NULL, sequencia integer NOT NULL, status text NOT NULL DEFAULT 'Rascunho', dados jsonb NOT NULL DEFAULT '{}'::jsonb, criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS contratos_eventos_banda_ano_seq_idx ON public.contratos_eventos (banda_id, ano, sequencia);
CREATE INDEX IF NOT EXISTS contratos_eventos_banda_criado_idx ON public.contratos_eventos (banda_id, criado_em DESC);
ALTER TABLE public.contratos_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_eventos ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.contratos_configuracoes IS 'Acesso apenas por funções autenticadas no servidor; sem acesso direto do navegador.';
COMMENT ON TABLE public.contratos_eventos IS 'Acesso apenas por funções autenticadas no servidor; sem acesso direto do navegador.';

ALTER TABLE public.contratos_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contratos_configuracoes_servidor ON public.contratos_configuracoes;
CREATE POLICY contratos_configuracoes_servidor ON public.contratos_configuracoes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS contratos_eventos_servidor ON public.contratos_eventos;
CREATE POLICY contratos_eventos_servidor ON public.contratos_eventos FOR ALL TO service_role USING (true) WITH CHECK (true);
