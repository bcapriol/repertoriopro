ALTER TABLE public.app_usuarios
  ADD COLUMN IF NOT EXISTS pode_apagar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_backup boolean NOT NULL DEFAULT false;