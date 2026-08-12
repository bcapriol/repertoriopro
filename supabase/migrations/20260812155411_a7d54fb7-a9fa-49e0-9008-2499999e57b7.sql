CREATE TABLE public.bandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  keygen text NOT NULL UNIQUE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bandas TO service_role;
ALTER TABLE public.bandas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES public.bandas(id) ON DELETE CASCADE,
  usuario text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_usuarios TO service_role;
ALTER TABLE public.app_usuarios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cloud_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES public.bandas(id) ON DELETE CASCADE,
  song_id text NOT NULL,
  titulo text NOT NULL,
  artista text NOT NULL DEFAULT '',
  tom text NOT NULL DEFAULT '',
  bpm text NOT NULL DEFAULT '',
  ritmo text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  letra text NOT NULL DEFAULT '',
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (banda_id, song_id)
);
GRANT ALL ON public.cloud_songs TO service_role;
ALTER TABLE public.cloud_songs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cloud_setlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES public.bandas(id) ON DELETE CASCADE,
  setlist_id text NOT NULL,
  nome text NOT NULL,
  local text NOT NULL DEFAULT '',
  data text NOT NULL DEFAULT '',
  song_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (banda_id, setlist_id)
);
GRANT ALL ON public.cloud_setlists TO service_role;
ALTER TABLE public.cloud_setlists ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cloud_songs_banda ON public.cloud_songs(banda_id);
CREATE INDEX idx_cloud_setlists_banda ON public.cloud_setlists(banda_id);
CREATE INDEX idx_app_usuarios_banda ON public.app_usuarios(banda_id);