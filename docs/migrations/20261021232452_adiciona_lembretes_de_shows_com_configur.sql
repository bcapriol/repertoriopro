-- Adiciona lembretes de shows com configurações por banda e integração Median OneSignal
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-22T02:24:52.883Z

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.agenda_push_config (
 banda_id uuid PRIMARY KEY REFERENCES public.bandas(id) ON DELETE CASCADE,
 ativo boolean NOT NULL DEFAULT false,
 avisar_vespera boolean NOT NULL DEFAULT true,
 hora_vespera text NOT NULL DEFAULT '09:00' CHECK (hora_vespera ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 avisar_dia boolean NOT NULL DEFAULT true,
 hora_dia text NOT NULL DEFAULT '09:00' CHECK (hora_dia ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 fuso text NOT NULL DEFAULT 'America/Sao_Paulo',
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.agenda_push_usuarios (
 usuario_id uuid PRIMARY KEY REFERENCES public.app_usuarios(id) ON DELETE CASCADE,
 ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.agenda_push_aparelhos (
 assinatura uuid PRIMARY KEY,
 usuario_id uuid NOT NULL REFERENCES public.app_usuarios(id) ON DELETE CASCADE,
 token_hash text NOT NULL,
 ativo boolean NOT NULL DEFAULT true,
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.agenda_push_envios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 evento_id uuid NOT NULL REFERENCES public.agenda_eventos(id) ON DELETE CASCADE,
 usuario_id uuid NOT NULL REFERENCES public.app_usuarios(id) ON DELETE CASCADE,
 data_show date NOT NULL,
 momento text NOT NULL CHECK (momento IN ('vespera','dia')),
 previsto_em timestamptz NOT NULL,
 estado text NOT NULL DEFAULT 'processando' CHECK (estado IN ('processando','enviado','falhou','ignorado')),
 tentativas integer NOT NULL DEFAULT 0,
 reservado_ate timestamptz,
 enviado_em timestamptz,
 erro text,
 onesignal_id text,
 criado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE (evento_id, usuario_id, data_show, momento)
);
CREATE TABLE IF NOT EXISTS public.agenda_push_servico (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 url text NOT NULL,
 atualizado_em timestamptz NOT NULL DEFAULT now(),
 ultima_execucao timestamptz,
 ultimo_erro text
);
CREATE INDEX IF NOT EXISTS agenda_push_aparelhos_usuario_idx ON public.agenda_push_aparelhos(usuario_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS agenda_push_envios_usuario_idx ON public.agenda_push_envios(usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS agenda_shows_push_idx ON public.agenda_eventos(data, usuario_id) WHERE tipo = 'show' AND status = 'agendado';
ALTER TABLE public.agenda_push_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_push_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_push_aparelhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_push_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_push_servico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agenda_push_config_servidor ON public.agenda_push_config;
CREATE POLICY agenda_push_config_servidor ON public.agenda_push_config FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agenda_push_usuarios_servidor ON public.agenda_push_usuarios;
CREATE POLICY agenda_push_usuarios_servidor ON public.agenda_push_usuarios FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agenda_push_aparelhos_servidor ON public.agenda_push_aparelhos;
CREATE POLICY agenda_push_aparelhos_servidor ON public.agenda_push_aparelhos FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agenda_push_envios_servidor ON public.agenda_push_envios;
CREATE POLICY agenda_push_envios_servidor ON public.agenda_push_envios FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agenda_push_servico_servidor ON public.agenda_push_servico;
CREATE POLICY agenda_push_servico_servidor ON public.agenda_push_servico FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.agenda_push_config, public.agenda_push_usuarios, public.agenda_push_aparelhos, public.agenda_push_envios, public.agenda_push_servico FROM anon, authenticated;
GRANT ALL ON public.agenda_push_config, public.agenda_push_usuarios, public.agenda_push_aparelhos, public.agenda_push_envios, public.agenda_push_servico TO service_role;

CREATE OR REPLACE FUNCTION public.agenda_push_disparar() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_token text; v_url text;
BEGIN
 SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'agenda_push_token';
 SELECT url INTO v_url FROM public.agenda_push_servico WHERE id = true;
 IF v_token IS NULL OR v_url IS NULL THEN RETURN; END IF;
 PERFORM net.http_post(url := v_url, headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_token), body := '{"acao":"enviar"}'::jsonb, timeout_milliseconds := 55000);
END; $$;

CREATE OR REPLACE FUNCTION public.agenda_push_configurar(p_url text, p_token text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
 IF p_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/agenda-lembretes$' OR length(p_token) < 32 THEN
  RAISE EXCEPTION 'Endereço ou chave de agendamento inválidos.';
 END IF;
 SELECT id INTO v_id FROM vault.secrets WHERE name = 'agenda_push_token';
 IF v_id IS NULL THEN
  PERFORM vault.create_secret(p_token, 'agenda_push_token');
 ELSE
  PERFORM vault.update_secret(v_id, p_token);
 END IF;
 INSERT INTO public.agenda_push_servico(id, url) VALUES (true, p_url)
 ON CONFLICT(id) DO UPDATE SET url = EXCLUDED.url, atualizado_em = now();
 PERFORM cron.schedule('agenda-push-shows', '*/5 * * * *', 'SELECT public.agenda_push_disparar()');
 RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.agenda_push_status() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object('agendadorAtivo', EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'agenda-push-shows' AND active), 'ultimaExecucao', (SELECT ultima_execucao FROM public.agenda_push_servico WHERE id = true), 'erro', (SELECT ultimo_erro FROM public.agenda_push_servico WHERE id = true));
$$;

CREATE OR REPLACE FUNCTION public.agenda_push_pendentes() RETURNS SETOF public.agenda_push_envios LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT pg_try_advisory_xact_lock(74821503) THEN RETURN; END IF;
 INSERT INTO public.agenda_push_envios(evento_id, usuario_id, data_show, momento, previsto_em)
 SELECT e.id, e.usuario_id, e.data, lembrete.momento, lembrete.horario
 FROM public.agenda_eventos e
 JOIN public.app_usuarios u ON u.id = e.usuario_id AND u.pode_agenda
 JOIN public.agenda_push_config c ON c.banda_id = u.banda_id AND c.ativo
 LEFT JOIN public.agenda_push_usuarios pu ON pu.usuario_id = u.id
 CROSS JOIN LATERAL (VALUES
  ('vespera', ((e.data - 1) + c.hora_vespera::time) AT TIME ZONE c.fuso, c.avisar_vespera, e.data - 1),
  ('dia', (e.data + c.hora_dia::time) AT TIME ZONE c.fuso, c.avisar_dia, e.data)
 ) AS lembrete(momento, horario, ativo, dia)
 WHERE e.tipo = 'show' AND e.status = 'agendado' AND COALESCE(pu.ativo, true)
 AND e.data BETWEEN current_date - 1 AND current_date + 2
 AND lembrete.ativo AND lembrete.horario <= now() AND lembrete.horario > now() - interval '2 hours'
 AND lembrete.dia = (now() AT TIME ZONE c.fuso)::date
 AND (CASE WHEN e.hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN (e.data + e.hora_inicio::time) AT TIME ZONE c.fuso ELSE (e.data + 1)::timestamp AT TIME ZONE c.fuso END) > now()
 AND EXISTS(SELECT 1 FROM public.agenda_push_aparelhos a WHERE a.usuario_id = u.id AND a.ativo)
 ORDER BY lembrete.horario LIMIT 100
 ON CONFLICT(evento_id, usuario_id, data_show, momento) DO NOTHING;
 RETURN QUERY
 WITH candidatos AS (
 SELECT s.id FROM public.agenda_push_envios s
 JOIN public.agenda_eventos e ON e.id = s.evento_id AND e.data = s.data_show AND e.status = 'agendado' AND e.tipo = 'show'
 JOIN public.app_usuarios u ON u.id = s.usuario_id AND u.pode_agenda
 JOIN public.agenda_push_config c ON c.banda_id = u.banda_id AND c.ativo
 LEFT JOIN public.agenda_push_usuarios pu ON pu.usuario_id = u.id
 WHERE s.estado IN ('processando','falhou') AND s.tentativas < 5
 AND COALESCE(pu.ativo, true) AND (CASE s.momento WHEN 'vespera' THEN c.avisar_vespera ELSE c.avisar_dia END)
 AND (s.reservado_ate IS NULL OR s.reservado_ate < now()) AND s.previsto_em > now() - interval '2 hours'
 AND (CASE s.momento WHEN 'vespera' THEN e.data - 1 ELSE e.data END) = (now() AT TIME ZONE c.fuso)::date
 AND (CASE WHEN e.hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN (e.data + e.hora_inicio::time) AT TIME ZONE c.fuso ELSE (e.data + 1)::timestamp AT TIME ZONE c.fuso END) > now()
 ORDER BY s.previsto_em LIMIT 30 FOR UPDATE OF s SKIP LOCKED
 ) UPDATE public.agenda_push_envios s SET reservado_ate = now() + interval '3 minutes', tentativas = s.tentativas + 1, estado = 'processando'
 FROM candidatos WHERE s.id = candidatos.id RETURNING s.*;
END; $$;
REVOKE ALL ON FUNCTION public.agenda_push_disparar(), public.agenda_push_configurar(text,text), public.agenda_push_status(), public.agenda_push_pendentes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agenda_push_disparar(), public.agenda_push_configurar(text,text), public.agenda_push_status(), public.agenda_push_pendentes() TO service_role;
