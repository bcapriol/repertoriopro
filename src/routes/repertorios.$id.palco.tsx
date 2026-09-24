import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PalcoPage,
});

function PalcoPage() {
  const { id } = Route.useParams();
  const { data } = useAppData();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [avancar, sair]);

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
    <main className="relative h-dvh overflow-hidden bg-background">
      <Button variant="ghost" size="icon" className="absolute top-3 right-3 z-30 size-9 border border-border bg-card/80 backdrop-blur-sm" title="Ir para música" aria-label="Ir para música" aria-expanded={listaAberta} onClick={() => setListaAberta((v) => !v)}><ListIcon /></Button>
      <section className="h-full overflow-hidden">
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
            <pre
              className="mt-5 font-sans text-[28px] leading-relaxed break-words whitespace-pre-wrap text-foreground"
            >
              {atual.letra || "Sem letra nem anexo cadastrado."}
            </pre>
            <div className="h-24" />
          </div>
        )}

      </section>

      {listaAberta ? (
        <nav aria-label="Lista de músicas" className="absolute inset-x-3 top-14 z-20 mx-auto max-w-md border border-border bg-card/95 shadow-lg backdrop-blur">
          <ol className="max-h-[60dvh] overflow-auto p-2">
            {musicas.map((s, i) => (
              <li key={s.id}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIndex(i);
                    setListaAberta(false);
                  }}
                  className={`h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left ${
                    i === index ? "bg-primary/10 font-bold text-primary" : "text-foreground"
                  }`}
                >
                  {s.titulo}
                </Button>
              </li>
            ))}
          </ol>
          <div className="border-t border-border p-2"><Button variant="ghost" onClick={sair} className="w-full justify-start"><XIcon /> Sair do modo palco</Button></div>
        </nav>
      ) : null}

      <footer className="absolute inset-x-0 bottom-0 z-20 bg-card/80 pb-[env(safe-area-inset-bottom)] text-foreground backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between gap-1 px-2 py-1">
          <Button variant="ghost" size="icon" className="size-11 shrink-0" title="Música anterior" aria-label="Música anterior" disabled={index === 0} onClick={() => avancar(-1)}><ChevronLeftIcon /></Button>
          <Button variant="ghost" size="icon" className="size-11 shrink-0" title="Próxima música" aria-label="Próxima música" disabled={index >= total - 1} onClick={() => avancar(1)}><ChevronRightIcon /></Button>
        </div>
      </footer>
    </main>
  );
}
