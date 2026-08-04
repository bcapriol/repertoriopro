import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { EmptyState, PageShell } from "@/components/PageShell";
import { AnexosViewer } from "@/components/AnexoView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/lib/repertorio-store";

export const Route = createFileRoute("/musicas")({
  head: () => ({
    meta: [
      { title: "Músicas Salvas | Repertório Fácil" },
      { name: "description", content: "Sua biblioteca de músicas com tom, andamento e letra." },
      { property: "og:title", content: "Músicas Salvas | Repertório Fácil" },
      {
        property: "og:description",
        content: "Sua biblioteca de músicas com tom, andamento e letra.",
      },
    ],
  }),
  component: MusicasPage,
});

type Ordem = "titulo" | "artista" | "recentes";

const ORDENS: { valor: Ordem; label: string }[] = [
  { valor: "titulo", label: "Título A-Z" },
  { valor: "artista", label: "Artista A-Z" },
  { valor: "recentes", label: "Mais recentes" },
];

function MusicasPage() {
  const { data, update } = useAppData();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("titulo");
  const [aberta, setAberta] = useState<string | null>(null);
  const songAberta = data.songs.find((s) => s.id === aberta) ?? null;

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = termo
      ? data.songs.filter((s) =>
          `${s.titulo} ${s.artista} ${s.tom} ${s.ritmo ?? ""}`.toLowerCase().includes(termo),
        )
      : [...data.songs];
    return filtradas.sort((a, b) => {
      if (ordem === "recentes") return b.criadoEm - a.criadoEm;
      if (ordem === "artista")
        return (
          a.artista.localeCompare(b.artista, "pt-BR") ||
          a.titulo.localeCompare(b.titulo, "pt-BR")
        );
      return a.titulo.localeCompare(b.titulo, "pt-BR");
    });
  }, [data.songs, busca, ordem]);

  const excluir = (id: string) => {
    update((prev) => ({
      songs: prev.songs.filter((s) => s.id !== id),
      setlists: prev.setlists.map((r) => ({
        ...r,
        songIds: r.songIds.filter((sid) => sid !== id),
      })),
    }));
    toast.success("Música excluída.");
  };

  return (
    <PageShell title="Músicas Salvas" subtitle={`${data.songs.length} música(s) na biblioteca`}>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, artista ou tom"
            className="h-12 pl-9 text-base"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Ordenar
          </span>
          {ORDENS.map((o) => (
            <button
              key={o.valor}
              onClick={() => setOrdem(o.valor)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                ordem === o.valor
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <Button asChild className="h-12 w-full rounded-xl font-bold">
          <Link to="/cadastrar" search={{ id: undefined }}>
            <PlusIcon /> Nova música
          </Link>
        </Button>

        {lista.length === 0 ? (
          <EmptyState
            title="Nenhuma música encontrada"
            hint="Cadastre sua primeira música para começar o repertório."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {lista.map((song) => (
              <li key={song.id} className="surface-tile rounded-2xl border border-border">
                <div className="flex items-center gap-1 pr-2">
                  <button
                    onClick={() => setAberta(song.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left"
                  >
                    <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-foreground">{song.titulo}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[
                        song.artista,
                        song.tom && `Tom ${song.tom}`,
                        song.bpm && `${song.bpm} BPM`,
                        song.ritmo,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sem detalhes"}
                    </span>
                    </span>
                  </button>
                  <Button asChild variant="ghost" size="icon" aria-label="Editar música">
                    <Link to="/cadastrar" search={{ id: song.id }}>
                      <PencilIcon />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir música"
                    onClick={() => excluir(song.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {songAberta ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <button
            onClick={() => setAberta(null)}
            aria-label="Fechar"
            className="pointer-events-auto absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-sm"
          >
            <XIcon />
          </button>
          <div className="flex-1 overflow-auto">
            {songAberta.anexos?.length ? (
              <AnexosViewer anexos={songAberta.anexos} />
            ) : (
              <div className="px-5 py-6">
                <h2 className="text-2xl font-black text-foreground">{songAberta.titulo}</h2>
                <pre className="mt-4 font-sans text-lg leading-relaxed whitespace-pre-wrap text-foreground">
                  {songAberta.letra || "Sem letra nem anexo cadastrado."}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
