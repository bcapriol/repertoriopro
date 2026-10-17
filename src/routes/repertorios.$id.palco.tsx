import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LibraryIcon,
  ListIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MusicaPalco } from "@/components/MusicaPalco";
import { Metronomo } from "@/components/Metronomo";
import { useAppData } from "@/lib/repertorio-store";
import { useProgressoPalco } from "@/hooks/use-progresso-palco";

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
  const { pronto, progresso, salvar } = useProgressoPalco(id);
  const [listaAberta, setListaAberta] = useState<"repertorio" | "base" | null>(null);
  const [buscaLista, setBuscaLista] = useState("");
  const [consultaId, setConsultaId] = useState<string | null>(null);

  const alternarLista = (lista: "repertorio" | "base") => {
    setBuscaLista("");
    setListaAberta((atual) => atual === lista ? null : lista);
  };

  const rep = data.setlists.find((r) => r.id === id);
  const musicas = useMemo(() => {
    if (!rep) return [];
    const porId = new Map(data.songs.map((s) => [s.id, s]));
    return rep.songIds.map((sid) => porId.get(sid)).filter((s) => !!s);
  }, [rep, data.songs]);

  const musicasDaLista = useMemo(() => {
    const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const busca = normalizar(buscaLista.trim());
    const origem = listaAberta === "base" ? data.songs : musicas;
    return origem.filter((s) => !busca || normalizar(`${s.titulo} ${s.artista}`).includes(busca))
      .sort((a, b) =>
        a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base", numeric: true }) ||
        a.artista.localeCompare(b.artista, "pt-BR", { sensitivity: "base" }));
  }, [data.songs, musicas, listaAberta, buscaLista]);
  const consulta = data.songs.find((s) => s.id === consultaId);
  const total = musicas.length;
  const indiceSalvo = musicas.findIndex((s) => s.id === progresso?.musicaId);
  const index = indiceSalvo >= 0 ? indiceSalvo : Math.min(progresso?.indice ?? 0, Math.max(total - 1, 0));
  const atual = musicas[index];

  const selecionar = useCallback((indice: number) => {
    const musica = musicas[indice];
    if (pronto && musica) salvar({ musicaId: musica.id, indice });
  }, [musicas, pronto, salvar]);

  const avancar = useCallback((delta: number) => {
    selecionar(Math.min(Math.max(index + delta, 0), Math.max(total - 1, 0)));
  }, [index, total, selecionar]);

  useEffect(() => {
    if (pronto && atual && (!progresso || progresso.musicaId !== atual.id || progresso.indice !== index)) {
      salvar({ musicaId: atual.id, indice: index });
    }
  }, [pronto, atual, index, progresso, salvar]);

  const sair = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    void navigate({ to: "/repertorios/$id", params: { id } });
  }, [navigate, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (listaAberta) setListaAberta(null);
        else if (consulta) setConsultaId(null);
        else sair();
        return;
      }
      if (consulta || listaAberta || !pronto ||
        (e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, select"))) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        avancar(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        avancar(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [avancar, sair, consulta, listaAberta, pronto]);

  useEffect(() => {
    const anterior = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "contain";
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.body.style.overscrollBehavior = anterior;
    };
  }, []);

  if (!pronto) {
    return <main className="flex h-dvh items-center justify-center bg-background p-8 text-muted-foreground" role="status">Preparando modo palco…</main>;
  }

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
      <div className="absolute top-[calc(0.5rem+env(safe-area-inset-top))] right-2 z-[60] flex flex-col items-center gap-2">
        {consulta ? (
          <Button autoFocus variant="ghost" size="icon" className="size-9 min-h-9 border border-border bg-card/80 backdrop-blur-sm" title="Fechar e voltar ao repertório" aria-label="Fechar e voltar à música do repertório" onClick={() => setConsultaId(null)}><XIcon /></Button>
        ) : (
          <>
            <Button variant="ghost" size="icon" className="size-9 min-h-9 border border-border bg-card/80 backdrop-blur-sm" title="Músicas do repertório · A–Z" aria-label="Músicas do repertório em ordem alfabética" aria-expanded={listaAberta === "repertorio"} onClick={() => alternarLista("repertorio")}><ListIcon /></Button>
            <Button variant="ghost" size="icon" className="size-9 min-h-9 border border-border bg-card/80 backdrop-blur-sm" title="Todas as músicas · A–Z" aria-label="Todas as músicas em ordem alfabética" aria-expanded={listaAberta === "base"} onClick={() => alternarLista("base")}><LibraryIcon /></Button>
          </>
        )}
        <Metronomo key={(consulta ?? atual).id} musica={consulta ?? atual} />
      </div>
      <section aria-hidden={!!consulta} className={`h-full overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))] ${consulta ? "invisible" : ""}`}>
        <MusicaPalco key={atual.id} musica={atual} />
      </section>

      {consulta ? (
        <section aria-label="Consulta de música da base" className="absolute inset-0 z-40 overflow-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <MusicaPalco key={consulta.id} musica={consulta} />
        </section>
      ) : null}

      {listaAberta ? (
        <nav aria-label={listaAberta === "base" ? "Todas as músicas em ordem alfabética" : "Músicas do repertório em ordem alfabética"} className="absolute inset-x-3 top-[calc(9rem+env(safe-area-inset-top))] z-20 mx-auto max-w-md border border-border bg-card/95 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1">
            <p className="text-sm font-semibold">{listaAberta === "base" ? "Todas as músicas · A–Z" : "Músicas do repertório · A–Z"}</p>
            <Button variant="ghost" size="icon" aria-label="Fechar lista" onClick={() => setListaAberta(null)}><XIcon /></Button>
          </div>
          <div className="px-3 pt-2">
            <Input
              autoFocus
              type="search"
              aria-label="Buscar por título ou artista"
              placeholder="Digite o título ou artista…"
              value={buscaLista}
              onChange={(e) => setBuscaLista(e.target.value)}
            />
          </div>
          <ol className="max-h-[45dvh] overflow-auto p-2">
            {musicasDaLista.map((s) => (
              <li key={s.id}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (listaAberta === "base") setConsultaId(s.id);
                    else selecionar(musicas.findIndex((musica) => musica.id === s.id));
                    setListaAberta(null);
                  }}
                  className={`h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left ${
                    listaAberta === "repertorio" && s.id === atual.id ? "bg-primary/10 font-bold text-primary" : "text-foreground"
                  }`}
                >
                  {s.titulo}
                </Button>
              </li>
            ))}
          </ol>
          {musicasDaLista.length === 0 ? <p role="status" className="px-3 pb-3 text-sm text-muted-foreground">Nenhuma música encontrada.</p> : null}
          <div className="border-t border-border p-2"><Button variant="ghost" onClick={sair} className="w-full justify-start"><XIcon /> Sair do modo palco</Button></div>
        </nav>
      ) : null}

      <footer aria-hidden={!!consulta} className="absolute inset-x-0 bottom-0 z-20 bg-card/80 pb-[env(safe-area-inset-bottom)] text-foreground backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between gap-1 px-2 py-1">
          <Button variant="ghost" size="icon" className="size-11 shrink-0" title="Música anterior" aria-label="Música anterior" disabled={!!consulta || index === 0} onClick={() => avancar(-1)}><ChevronLeftIcon /></Button>
          <Button variant="ghost" size="icon" className="size-11 shrink-0" title="Próxima música" aria-label="Próxima música" disabled={!!consulta || index >= total - 1} onClick={() => avancar(1)}><ChevronRightIcon /></Button>
        </div>
      </footer>
    </main>
  );
}
