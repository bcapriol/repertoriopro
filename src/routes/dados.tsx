import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { readData, useAppData, writeData, type AppData } from "@/lib/repertorio-store";

export const Route = createFileRoute("/dados")({
  head: () => ({
    meta: [
      { title: "Exportar / Importar | Repertório Fácil" },
      { name: "description", content: "Faça backup e restaure suas músicas e repertórios." },
      { property: "og:title", content: "Exportar / Importar | Repertório Fácil" },
      {
        property: "og:description",
        content: "Faça backup e restaure suas músicas e repertórios.",
      },
    ],
  }),
  component: DadosPage,
});

function DadosPage() {
  const { data } = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const blob = new Blob([JSON.stringify(readData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repertorio-facil-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado!");
  };

  const importar = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (!Array.isArray(parsed.songs) || !Array.isArray(parsed.setlists)) {
        throw new Error("formato");
      }
      const atual = readData();
      const songIds = new Set(atual.songs.map((s) => s.id));
      const setIds = new Set(atual.setlists.map((s) => s.id));
      writeData({
        songs: [...atual.songs, ...parsed.songs.filter((s) => !songIds.has(s.id))],
        setlists: [...atual.setlists, ...parsed.setlists.filter((s) => !setIds.has(s.id))],
      });
      toast.success("Backup importado com sucesso!");
    } catch {
      toast.error("Arquivo inválido. Use um backup gerado pelo app.");
    }
  };

  return (
    <PageShell title="Exportar / Importar" subtitle="Backup dos seus dados">
      <div className="flex flex-col gap-5">
        <div className="surface-tile rounded-2xl border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Você tem <strong className="text-foreground">{data.songs.length}</strong> música(s) e{" "}
            <strong className="text-foreground">{data.setlists.length}</strong> repertório(s)
            salvos neste dispositivo.
          </p>
        </div>

        <Button onClick={exportar} className="h-14 rounded-2xl text-base font-bold">
          <DownloadIcon /> Exportar backup (.json)
        </Button>

        <Button
          variant="secondary"
          className="h-14 rounded-2xl text-base font-bold"
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon /> Importar backup
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importar(file);
            e.target.value = "";
          }}
        />

        <p className="text-center text-xs text-muted-foreground">
          A importação adiciona os itens do arquivo sem apagar o que já está salvo.
        </p>
      </div>
    </PageShell>
  );
}
