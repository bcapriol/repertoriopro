import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileTextIcon, PaperclipIcon, XIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId, readData, writeData, type Anexo, type Song } from "@/lib/repertorio-store";

const MAX_BYTES = 3 * 1024 * 1024;

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
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const inputFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) {
      setForm(vazio);
      setAnexos([]);
      return;
    }
    const song = readData().songs.find((s) => s.id === id);
    if (song) {
      setAnexos(song.anexos ?? []);
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

  const adicionarArquivos = async (files: FileList | null) => {
    if (!files?.length) return;
    const novos: Anexo[] = [];
    for (const file of Array.from(files)) {
      const ok = file.type === "application/pdf" || file.type.startsWith("image/");
      if (!ok) {
        toast.error(`${file.name}: envie apenas PDF ou imagem.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: máximo de 3 MB por arquivo.`);
        continue;
      }
      const dados = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      novos.push({ id: newId(), nome: file.name, tipo: file.type, dados });
    }
    if (novos.length) {
      setAnexos((prev) => [...prev, ...novos]);
      toast.success(`${novos.length} anexo(s) adicionado(s).`);
    }
    if (inputFile.current) inputFile.current.value = "";
  };

  const salvar = () => {
    if (!form.titulo.trim()) {
      toast.error("Informe o título da música.");
      return;
    }
    const data = readData();
    try {
      if (id) {
        writeData({
          ...data,
          songs: data.songs.map((s) => (s.id === id ? { ...s, ...form, anexos } : s)),
        });
        toast.success("Música atualizada!");
      } else {
        const song: Song = { id: newId(), criadoEm: Date.now(), ...form, anexos };
        writeData({ ...data, songs: [song, ...data.songs] });
        toast.success("Música cadastrada!");
      }
    } catch {
      toast.error("Não foi possível salvar: espaço do dispositivo cheio. Remova alguns anexos.");
      return;
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
        <Field label="Anexos (PDF ou imagem, até 3 MB cada)">
          <div className="flex flex-col gap-3">
            <input
              ref={inputFile}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => void adicionarArquivos(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-12 w-full rounded-xl font-bold"
              onClick={() => inputFile.current?.click()}
            >
              <PaperclipIcon /> Anexar PDF ou imagem
            </Button>
            {anexos.length ? (
              <ul className="flex flex-col gap-2">
                {anexos.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2"
                  >
                    {a.tipo.startsWith("image/") ? (
                      <img
                        src={a.dados}
                        alt={a.nome}
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FileTextIcon className="size-5 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.nome}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${a.nome}`}
                      onClick={() => setAnexos((prev) => prev.filter((x) => x.id !== a.id))}
                    >
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum anexo. Suba a cifra em PDF ou foto.
              </p>
            )}
          </div>
        </Field>
        <Field label="Letra / Cifra (opcional)">
          <Textarea
            value={form.letra}
            onChange={(e) => set("letra")(e.target.value)}
            placeholder="Opcional — use os anexos acima se preferir."
            className="min-h-32 text-base"
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
