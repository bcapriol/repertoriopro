-- Adiciona folgas por intervalo e confirmação de shows na mesma data
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-03T15:05:10.845Z

ALTER TABLE public.agenda_eventos ADD COLUMN IF NOT EXISTS data_fim date;
