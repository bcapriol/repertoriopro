-- Adiciona revisão contratual e geração de PDF A4 com anexo de repertório
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-03T16:44:49.774Z

ALTER TABLE public.contratos_eventos ADD COLUMN IF NOT EXISTS pdf_caminho text;
ALTER TABLE public.contratos_eventos ADD COLUMN IF NOT EXISTS pdf_emissao date;
