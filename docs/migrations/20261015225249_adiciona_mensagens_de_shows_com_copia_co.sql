-- Adiciona mensagens de shows com cópia controlada por privilégio na agenda
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-16T01:52:49.022Z

ALTER TABLE public.app_usuarios
  ADD COLUMN IF NOT EXISTS pode_copiar_mensagens_shows boolean NOT NULL DEFAULT false;

ALTER TABLE public.agenda_eventos
  ADD COLUMN IF NOT EXISTS cliente text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cidade text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS consumacao_pessoas integer CHECK (consumacao_pessoas >= 0),
  ADD COLUMN IF NOT EXISTS mensagem_contratante text NOT NULL DEFAULT '';
