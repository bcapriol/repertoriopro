ALTER TABLE public.app_usuarios ADD COLUMN pode_agenda boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_usuarios ADD COLUMN pode_adicionar_shows boolean NOT NULL DEFAULT false;
CREATE TABLE public.agenda_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.app_usuarios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('show','particular','folga')),
  data date NOT NULL,
  hora_inicio text NOT NULL DEFAULT '',
  hora_fim text NOT NULL DEFAULT '',
  local text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  valor numeric(12,2),
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','concluido','cancelado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.agenda_eventos TO service_role;
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
CREATE INDEX agenda_eventos_usuario_data ON public.agenda_eventos(usuario_id, data);