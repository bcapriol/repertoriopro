import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { EmptyState, PageShell } from "@/components/PageShell";
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

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = termo
      ? data.songs.filter((s) =>
          `${s.titulo} ${s.artista} ${s.tom}`.toLowerCase().includes(termo),
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
                <button
                  onClick={() => setAberta(aberta === song.id ? null : song.id)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-foreground">{song.titulo}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[song.artista, song.tom && `Tom ${song.tom}`, song.bpm && `${song.bpm} BPM`]
                        .filter(Boolean)
                        .join(" · ") || "Sem detalhes"}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                      aberta === song.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {aberta === song.id ? (
                  <div className="border-t border-border px-4 py-4">
                    {song.observacoes ? (
                      <p className="mb-3 text-sm text-muted-foreground">{song.observacoes}</p>
                    ) : null}
                    {song.letra ? (
                      <pre className="mb-4 max-h-72 overflow-auto rounded-xl bg-muted p-3 font-mono text-sm whitespace-pre-wrap text-foreground">
                        {song.letra}
                      </pre>
                    ) : (
                      <p className="mb-4 text-sm text-muted-foreground">Sem letra cadastrada.</p>
                    )}
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" className="h-11 flex-1 rounded-xl">
                        <Link to="/cadastrar" search={{ id: song.id }}>
                          <PencilIcon /> Editar
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-11 rounded-xl"
                        onClick={() => excluir(song.id)}
                      >
                        <Trash2Icon /> Excluir
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
