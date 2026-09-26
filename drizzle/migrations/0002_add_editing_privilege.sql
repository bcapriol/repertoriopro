ALTER TABLE public.app_usuarios
ADD COLUMN IF NOT EXISTS pode_editar boolean NOT NULL DEFAULT false;