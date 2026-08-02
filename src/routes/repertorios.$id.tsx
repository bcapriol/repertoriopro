import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { EmptyState, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/lib/repertorio-store";

export const Route = createFileRoute("/repertorios/$id")({
  head: () => ({
    meta: [
      { title: "Repertório | Repertório Fácil" },
      { name: "description", content: "Ordem das músicas do seu show, pronta para o palco." },
      { property: "og:title", content: "Repertório | Repertório Fácil" },
      {
        property: "og:description",
        content: "Ordem das músicas do seu show, pronta para o palco.",
      },
    ],
  }),
  component: RepertorioDetalhe,
});

function RepertorioDetalhe() {
  const { id } = Route.useParams();
  const { data, update } = useAppData();
  const [busca, setBusca] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  const rep = data.setlists.find((r) => r.id === id);
  const songsById = useMemo(
    () => Object.fromEntries(data.songs.map((s) => [s.id, s])),
    [data.songs],
  );

  const disponiveis = useMemo(() => {
    if (!rep) return [];
    const termo = busca.trim().toLowerCase();
    return data.songs
      .filter((s) => !rep.songIds.includes(s.id))
      .filter((s) => !termo || `${s.titulo} ${s.artista}`.toLowerCase().includes(termo));
  }, [data.songs, rep, busca]);

  if (!rep) {
    return (
      <PageShell title="Repertório">
        <EmptyState title="Repertório não encontrado" hint="Ele pode ter sido excluído." />
      </PageShell>
    );
  }

  const setSongIds = (fn: (ids: string[]) => string[]) =>
    update((prev) => ({
      ...prev,
      setlists: prev.setlists.map((r) => (r.id === id ? { ...r, songIds: fn(r.songIds) } : r)),
    }));

  const mover = (index: number, delta: number) =>
    setSongIds((ids) => {
      const next = [...ids];
      const alvo = index + delta;
      if (alvo < 0 || alvo >= next.length) return ids;
      [next[index], next[alvo]] = [next[alvo], next[index]];
      return next;
    });

  return (
    <PageShell
      title={rep.nome}
      subtitle={[rep.local, rep.data, `${rep.songIds.length} música(s)`]
        .filter(Boolean)
        .join(" · ")}
    >
      <div className="flex flex-col gap-5">
        <Button
          className="h-12 rounded-xl font-bold"
          onClick={() => setAdicionando((v) => !v)}
          variant={adicionando ? "secondary" : "default"}
        >
          {adicionando ? (
            <>
              <XIcon /> Fechar
            </>
          ) : (
            <>
              <PlusIcon /> Adicionar músicas
            </>
          )}
        </Button>

        {adicionando ? (
          <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar na biblioteca"
              className="h-12 text-base"
            />
            {disponiveis.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Nenhuma música disponível.{" "}
                <Link to="/cadastrar" className="font-semibold text-primary underline">
                  Cadastrar
                </Link>
              </p>
            ) : (
              <ul className="flex max-h-72 flex-col gap-2 overflow-auto">
                {disponiveis.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setSongIds((ids) => [...ids, s.id]);
                        toast.success(`"${s.titulo}" adicionada.`);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 text-left hover:border-primary/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">
                          {s.titulo}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {s.artista || "—"}
                        </span>
                      </span>
                      <PlusIcon className="size-4 shrink-0 text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {rep.songIds.length === 0 ? (
          <EmptyState
            title="Repertório vazio"
            hint="Adicione músicas da sua biblioteca para montar a ordem do show."
          />
        ) : (
          <ol className="flex flex-col gap-3">
            {rep.songIds.map((songId, index) => {
              const song = songsById[songId];
              if (!song) return null;
              return (
                <li
                  key={songId}
                  className="surface-tile flex items-center gap-3 rounded-2xl border border-border px-3 py-3"
                >
                  <span className="gradient-accent flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-accent-foreground">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-foreground">{song.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[song.artista, song.tom && `Tom ${song.tom}`].filter(Boolean).join(" · ") ||
                        "—"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Subir"
                      onClick={() => mover(index, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Descer"
                      onClick={() => mover(index, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover"
                      className="text-destructive"
                      onClick={() => setSongIds((ids) => ids.filter((x) => x !== songId))}
                    >
                      <XIcon />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </PageShell>
  );
}
