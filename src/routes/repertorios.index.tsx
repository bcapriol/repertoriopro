import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, ChevronRightIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { EmptyState, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newId, useAppData, type Setlist } from "@/lib/repertorio-store";

export const Route = createFileRoute("/repertorios/")({
  head: () => ({
    meta: [
      { title: "Repertórios | Repertório Fácil" },
      { name: "description", content: "Monte listas de músicas para cada show ou ensaio." },
      { property: "og:title", content: "Repertórios | Repertório Fácil" },
      {
        property: "og:description",
        content: "Monte listas de músicas para cada show ou ensaio.",
      },
    ],
  }),
  component: RepertoriosPage,
});

function RepertoriosPage() {
  const { data, update } = useAppData();
  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [dataShow, setDataShow] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");

  const criar = () => {
    if (!nome.trim()) {
      toast.error("Dê um nome ao repertório.");
      return;
    }
    const novo: Setlist = {
      id: newId(),
      nome: nome.trim(),
      local: local.trim(),
      data: dataShow,
      songIds: [],
      criadoEm: Date.now(),
    };
    update((prev) => ({ ...prev, setlists: [novo, ...prev.setlists] }));
    setNome("");
    setLocal("");
    setDataShow("");
    toast.success("Repertório criado!");
  };

  const excluir = (id: string) => {
    update((prev) => ({ ...prev, setlists: prev.setlists.filter((r) => r.id !== id) }));
    toast.success("Repertório excluído.");
  };

  const iniciarRenomear = (r: Setlist) => {
    setEditandoId(r.id);
    setNovoNome(r.nome);
  };

  const salvarNome = (id: string) => {
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }
    update((prev) => ({
      ...prev,
      setlists: prev.setlists.map((r) => (r.id === id ? { ...r, nome: nomeLimpo } : r)),
    }));
    setEditandoId(null);
    toast.success("Repertório renomeado!");
  };

  return (
    <PageShell title="Repertórios" subtitle={`${data.setlists.length} repertório(s)`}>
      <div className="flex flex-col gap-6">
        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="font-bold text-foreground">Novo repertório</h2>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome (ex.: Show Bar do Zé)"
            className="h-12 text-base"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Local"
              className="h-12 text-base"
            />
            <Input
              type="date"
              value={dataShow}
              onChange={(e) => setDataShow(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <Button onClick={criar} className="h-12 rounded-xl font-bold">
            <PlusIcon /> Criar repertório
          </Button>
        </section>

        {data.setlists.length === 0 ? (
          <EmptyState
            title="Nenhum repertório ainda"
            hint="Crie um repertório e adicione músicas da sua biblioteca."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.setlists.map((r) => (
              <li
                key={r.id}
                className="surface-tile flex items-center gap-2 rounded-2xl border border-border pr-2"
              >
                {editandoId === r.id ? (
                  <div className="flex flex-1 items-center gap-2 py-2 pl-3">
                    <Input
                      value={novoNome}
                      autoFocus
                      onChange={(e) => setNovoNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") salvarNome(r.id);
                        if (e.key === "Escape") setEditandoId(null);
                      }}
                      className="h-11 text-base"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Salvar nome"
                      onClick={() => salvarNome(r.id)}
                    >
                      <CheckIcon />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Cancelar"
                      onClick={() => setEditandoId(null)}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ) : (
                  <>
                <Link
                  to="/repertorios/$id"
                  params={{ id: r.id }}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-foreground">{r.nome}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[r.local, r.data, `${r.songIds.length} música(s)`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => iniciarRenomear(r)}
                  aria-label={`Renomear ${r.nome}`}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => excluir(r.id)}
                  aria-label={`Excluir ${r.nome}`}
                >
                  <Trash2Icon />
                </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
