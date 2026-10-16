-- Ajusta agendamento de shows com cachê ou couvert e consumação em reais
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-16T02:05:54.335Z

ALTER TABLE public.agenda_eventos
  ADD COLUMN IF NOT EXISTS tipo_valor text NOT NULL DEFAULT 'cache' CHECK (tipo_valor IN ('cache', 'couvert')),
  ADD COLUMN IF NOT EXISTS consumacao_valor numeric(12,2) CHECK (consumacao_valor >= 0);
