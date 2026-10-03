-- Completa gestão, filtros e histórico versionado dos contratos
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-03T16:59:54.374Z

ALTER TABLE public.contratos_eventos ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS public.contratos_versoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contrato_id uuid NOT NULL REFERENCES public.contratos_eventos(id), banda_id uuid NOT NULL REFERENCES public.bandas(id), versao integer NOT NULL, dados jsonb NOT NULL, pdf_caminho text NOT NULL, pdf_emissao date NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE (contrato_id, versao));
CREATE TABLE IF NOT EXISTS public.contratos_historico (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contrato_id uuid NOT NULL REFERENCES public.contratos_eventos(id), banda_id uuid NOT NULL REFERENCES public.bandas(id), usuario_id uuid NOT NULL REFERENCES public.app_usuarios(id), versao integer NOT NULL, status_anterior text NOT NULL, status_novo text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS contratos_versoes_contrato_idx ON public.contratos_versoes(contrato_id, versao DESC);
CREATE INDEX IF NOT EXISTS contratos_historico_contrato_idx ON public.contratos_historico(contrato_id, criado_em DESC);
ALTER TABLE public.contratos_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_historico ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.contratos_registrar_versao() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.pdf_caminho IS NOT NULL AND NEW.pdf_caminho IS DISTINCT FROM OLD.pdf_caminho THEN INSERT INTO public.contratos_versoes(contrato_id,banda_id,versao,dados,pdf_caminho,pdf_emissao) VALUES (NEW.id,NEW.banda_id,NEW.versao,NEW.dados,NEW.pdf_caminho,NEW.pdf_emissao); END IF; IF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.contratos_historico(contrato_id,banda_id,usuario_id,versao,status_anterior,status_novo) VALUES (NEW.id,NEW.banda_id,NEW.usuario_id,OLD.versao,OLD.status,NEW.status); END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS contratos_registrar_versao_trigger ON public.contratos_eventos;
CREATE TRIGGER contratos_registrar_versao_trigger AFTER UPDATE ON public.contratos_eventos FOR EACH ROW EXECUTE FUNCTION public.contratos_registrar_versao();
CREATE OR REPLACE FUNCTION public.contratos_proxima_versao(p_id uuid, p_banda uuid, p_usuario uuid) RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$ BEGIN UPDATE public.contratos_eventos SET versao = versao + 1, status = 'Rascunho', pdf_caminho = NULL, pdf_emissao = NULL, usuario_id = p_usuario, atualizado_em = now() WHERE id = p_id AND banda_id = p_banda AND status = 'Aceito' AND pdf_caminho IS NOT NULL AND EXISTS (SELECT 1 FROM public.contratos_versoes WHERE contrato_id = p_id AND versao = contratos_eventos.versao); RETURN FOUND; END $$;
CREATE OR REPLACE FUNCTION public.contratos_versoes_imutaveis() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'Versões emitidas não podem ser alteradas ou excluídas'; END $$;
DROP TRIGGER IF EXISTS contratos_versoes_imutaveis_trigger ON public.contratos_versoes;
CREATE TRIGGER contratos_versoes_imutaveis_trigger BEFORE UPDATE OR DELETE ON public.contratos_versoes FOR EACH ROW EXECUTE FUNCTION public.contratos_versoes_imutaveis();

ALTER TABLE public.contratos_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso somente pelo servidor" ON public.contratos_versoes;
CREATE POLICY "Acesso somente pelo servidor" ON public.contratos_versoes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Acesso somente pelo servidor" ON public.contratos_historico;
CREATE POLICY "Acesso somente pelo servidor" ON public.contratos_historico FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.contratos_versoes (contrato_id, banda_id, versao, dados, pdf_caminho, pdf_emissao, criado_em)
SELECT id, banda_id, versao, dados, pdf_caminho, pdf_emissao, atualizado_em
FROM public.contratos_eventos
WHERE pdf_caminho IS NOT NULL AND pdf_emissao IS NOT NULL
ON CONFLICT (contrato_id, versao) DO NOTHING;
