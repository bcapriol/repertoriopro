import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId, readData, writeData, type Song } from "@/lib/repertorio-store";

export const Route = createFileRoute("/cadastrar")({
  head: () => ({
    meta: [
      { title: "Cadastrar Música | Repertório Fácil" },
      {
        name: "description",
        content: "Cadastre título, artista, tom, andamento e letra das suas músicas.",
      },
      { property: "og:title", content: "Cadastrar Música | Repertório Fácil" },
      {
        property: "og:description",
        content: "Cadastre título, artista, tom, andamento e letra das suas músicas.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search['id'] === "string" ? (search['id'] as string) : undefined,
  }),
  component: CadastrarPage,
});

const vazio = {
  titulo: "",
  artista: "",
  tom: "",
  bpm: "",
  ritmo: "",
  observacoes: "",
  letra: "",
};

function CadastrarPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [form, setForm] = useState(vazio);

  useEffect(() => {
    if (!id) {
      setForm(vazio);
      return;
    }
    const song = readData().songs.find((s) => s.id === id);
    if (song) {
      setForm({
        titulo: song.titulo,
        artista: song.artista,
        tom: song.tom,
        bpm: song.bpm,
        ritmo: song.ritmo ?? "",
        observacoes: song.observacoes,
        letra: song.letra,
      });
    }
  }, [id]);

  const set = (key: keyof typeof vazio) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const salvar = () => {
    if (!form.titulo.trim()) {
      toast.error("Informe o título da música.");
      return;
    }
    const data = readData();
    if (id) {
      writeData({
        ...data,
        songs: data.songs.map((s) => (s.id === id ? { ...s, ...form } : s)),
      });
      toast.success("Música atualizada!");
    } else {
      const song: Song = { id: newId(), criadoEm: Date.now(), ...form };
      writeData({ ...data, songs: [song, ...data.songs] });
      toast.success("Música cadastrada!");
    }
    navigate({ to: "/musicas" });
  };

  return (
    <PageShell
      title={id ? "Editar Música" : "Cadastrar Música"}
      subtitle="Preencha os dados da música"
    >
      <div className="flex flex-col gap-5">
        <Field label="Título *">
          <Input
            value={form.titulo}
            onChange={(e) => set("titulo")(e.target.value)}
            placeholder="Ex.: Wonderwall"
            className="h-12 text-base"
          />
        </Field>
        <Field label="Artista">
          <Input
            value={form.artista}
            onChange={(e) => set("artista")(e.target.value)}
            placeholder="Ex.: Oasis"
            className="h-12 text-base"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tom">
            <Input
              value={form.tom}
              onChange={(e) => set("tom")(e.target.value)}
              placeholder="Ex.: G"
              className="h-12 text-base"
            />
          </Field>
          <Field label="Andamento (BPM)">
            <Input
              value={form.bpm}
              onChange={(e) => set("bpm")(e.target.value)}
              placeholder="Ex.: 88"
              inputMode="numeric"
              className="h-12 text-base"
            />
          </Field>
        </div>
        <Field label="Ritmo">
          <Input
            value={form.ritmo}
            onChange={(e) => set("ritmo")(e.target.value)}
            placeholder="Ex.: Sertanejo, Samba, Balada"
            className="h-12 text-base"
          />
        </Field>
        <Field label="Observações">
          <Input
            value={form.observacoes}
            onChange={(e) => set("observacoes")(e.target.value)}
            placeholder="Ex.: entrada com capotraste na 2ª casa"
            className="h-12 text-base"
          />
        </Field>
        <Field label="Letra / Cifra">
          <Textarea
            value={form.letra}
            onChange={(e) => set("letra")(e.target.value)}
            placeholder="Cole aqui a letra ou a cifra..."
            className="min-h-52 text-base"
          />
        </Field>
        <Button onClick={salvar} className="h-14 w-full rounded-2xl text-base font-bold">
          {id ? "Salvar alterações" : "Salvar música"}
        </Button>
      </div>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
