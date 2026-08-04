import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnexosViewer } from "@/components/AnexoView";
import { useAppData } from "@/lib/repertorio-store";

export const Route = createFileRoute("/repertorios/$id/palco")({
  head: () => ({
    meta: [
      { title: "Modo Palco | Repertório Fácil" },
      {
        name: "description",
        content: "Apresentação em tela cheia com letra grande e avanço rápido entre as músicas.",
      },
      { property: "og:title", content: "Modo Palco | Repertório Fácil" },
      {
        property: "og:description",
        content: "Apresentação em tela cheia com letra grande e avanço rápido entre as músicas.",
      },
    ],
  }),
  component: PalcoPage,
});

function PalcoPage() {
  const { id } = Route.useParams();
  const { data } = useAppData();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [fonte, setFonte] = useState(28);
  const [fullscreen, setFullscreen] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);

  const rep = data.setlists.find((r) => r.id === id);
  const musicas = useMemo(() => {
    if (!rep) return [];
    const porId = new Map(data.songs.map((s) => [s.id, s]));
    return rep.songIds.map((sid) => porId.get(sid)).filter((s) => !!s);
  }, [rep, data.songs]);

  const total = musicas.length;
  const atual = musicas[Math.min(index, Math.max(total - 1, 0))];
  const anexos = atual?.anexos ?? [];

  const avancar = useCallback(
    (delta: number) => setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0))),
    [total],
  );

  const sair = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    void navigate({ to: "/repertorios/$id", params: { id } });
  }, [navigate, id]);

  const alternarFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        avancar(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        avancar(-1);
      } else if (e.key === "Escape") {
        sair();
      } else if (e.key.toLowerCase() === "f") {
        alternarFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [avancar, sair, alternarFullscreen]);

  useEffect(() => {
    const anterior = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overscrollBehavior = anterior;
    };
  }, []);

  if (!rep || total === 0 || !atual) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Nada para apresentar</h1>
        <p className="text-muted-foreground">
          Adicione músicas a este repertório para usar o modo palco.
        </p>
        <Link to="/repertorios/$id" params={{ id }}>
          <Button className="h-12 rounded-xl font-bold">Voltar ao repertório</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
        <Button variant="ghost" size="icon" aria-label="Sair do modo palco" onClick={sair}>
          <XIcon />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{rep.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {index + 1} de {total}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Diminuir letra"
          onClick={() => setFonte((f) => Math.max(16, f - 3))}
        >
          <MinusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Aumentar letra"
          onClick={() => setFonte((f) => Math.min(64, f + 3))}
        >
          <PlusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Lista de músicas"
          onClick={() => setListaAberta((v) => !v)}
        >
          <ListIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          onClick={alternarFullscreen}
        >
          {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
        </Button>
      </header>

      {listaAberta ? (
        <nav className="border-b border-border bg-card">
          <ol className="max-h-64 overflow-auto p-2">
            {musicas.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setIndex(i);
                    setListaAberta(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${
                    i === index ? "bg-primary/10 font-bold text-primary" : "text-foreground"
                  }`}
                >
                  <span className="w-6 shrink-0 text-sm text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{s.titulo}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <section className="relative flex-1 overflow-hidden">
        {anexos.length ? (
          <AnexosViewer key={atual.id} anexos={anexos} />
        ) : (
          <div className="h-full overflow-auto px-5 py-6">
            <h1 className="text-3xl leading-tight font-black text-foreground">{atual.titulo}</h1>
            <p className="mt-1 text-base text-muted-foreground">
              {[
                atual.artista,
                atual.tom && `Tom ${atual.tom}`,
                atual.bpm && `${atual.bpm} BPM`,
                atual.ritmo,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            {atual.observacoes ? (
              <p className="mt-3 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                {atual.observacoes}
              </p>
            ) : null}
            <pre
              className="mt-5 font-sans leading-relaxed break-words whitespace-pre-wrap text-foreground"
              style={{ fontSize: `${fonte}px` }}
            >
              {atual.letra || "Sem letra nem anexo cadastrado."}
            </pre>
            <div className="h-24" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Música anterior"
            disabled={index === 0}
            onClick={() => avancar(-1)}
            className="pointer-events-auto size-11 rounded-full border border-white/20 bg-black/45 text-white opacity-70 shadow-lg backdrop-blur-sm hover:bg-black/60 hover:opacity-100 disabled:opacity-20"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próxima música"
            disabled={index >= total - 1}
            onClick={() => avancar(1)}
            className="pointer-events-auto size-11 rounded-full border border-white/20 bg-black/45 text-white opacity-70 shadow-lg backdrop-blur-sm hover:bg-black/60 hover:opacity-100 disabled:opacity-20"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </section>
    </main>
  );
}
