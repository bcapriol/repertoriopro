import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangleIcon, CheckCircle2Icon, DownloadIcon, UploadIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  baixarArquivo,
  csvToSongs,
  songsToCsv,
  validarBackup,
  type ImportResult,
} from "@/lib/backup";
import { readData, useAppData, writeData } from "@/lib/repertorio-store";
import { useConta } from "@/lib/banda-local";

export const Route = createFileRoute("/dados")({
  head: () => ({
    meta: [
      { title: "Exportar / Importar | Repertório Fácil" },
      {
        name: "description",
        content: "Exporte e importe suas músicas e repertórios em JSON ou CSV com validação.",
      },
      { property: "og:title", content: "Exportar / Importar | Repertório Fácil" },
      {
        property: "og:description",
        content: "Exporte e importe suas músicas e repertórios em JSON ou CSV com validação.",
      },
    ],
  }),
  component: DadosPage,
});

const hoje = () => new Date().toISOString().slice(0, 10);
const espera = () => new Promise((r) => setTimeout(r, 120));

function DadosPage() {
  const { data } = useAppData();
  const { conta } = useConta();
  const podeBackup = conta?.podeBackup ?? false;
  const jsonRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [etapa, setEtapa] = useState("");
  const [resultado, setResultado] = useState<ImportResult | null>(null);

  const exportarJson = () => {
    baixarArquivo(
      JSON.stringify(readData(), null, 2),
      `repertorio-facil-${hoje()}.json`,
      "application/json",
    );
    toast.success("Backup JSON exportado!");
  };

  const exportarCsv = () => {
    const atual = readData();
    if (atual.songs.length === 0) {
      toast.error("Você ainda não tem músicas para exportar.");
      return;
    }
    baixarArquivo(songsToCsv(atual.songs), `musicas-${hoje()}.csv`, "text/csv");
    toast.success("Músicas exportadas em CSV!");
  };

  const exportarRepertoriosCsv = () => {
    const atual = readData();
    if (atual.setlists.length === 0) {
      toast.error("Você ainda não tem repertórios para exportar.");
      return;
    }
    const porId = new Map(atual.songs.map((s) => [s.id, s]));
    const linhas = ["repertorio,local,data,ordem,musica,artista,tom"];
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    for (const r of atual.setlists) {
      if (r.songIds.length === 0) {
        linhas.push([r.nome, r.local, r.data, "", "", "", ""].map(esc).join(","));
        continue;
      }
      r.songIds.forEach((id, i) => {
        const s = porId.get(id);
        linhas.push(
          [r.nome, r.local, r.data, String(i + 1), s?.titulo ?? "", s?.artista ?? "", s?.tom ?? ""]
            .map(esc)
            .join(","),
        );
      });
    }
    baixarArquivo(linhas.join("\n"), `repertorios-${hoje()}.csv`, "text/csv");
    toast.success("Repertórios exportados em CSV!");
  };

  const rodarImportacao = async (
    file: File,
    tipo: "json" | "csv",
  ) => {
    setResultado(null);
    setProgresso(5);
    setEtapa("Lendo arquivo…");
    await espera();

    let texto = "";
    try {
      texto = await file.text();
    } catch {
      setProgresso(null);
      toast.error("Não foi possível ler o arquivo.");
      return;
    }

    setProgresso(35);
    setEtapa("Validando registros…");
    await espera();

    const atual = readData();
    let resumo: ImportResult = {
      songsAdicionadas: 0,
      repertoriosAdicionados: 0,
      ignorados: 0,
      erros: [],
    };

    if (tipo === "csv") {
      const { songs, erros } = csvToSongs(texto);
      if (songs.length === 0) {
        setProgresso(null);
        setResultado({ ...resumo, erros: erros.length ? erros : ["Nenhuma música válida no CSV."] });
        toast.error("Nenhuma música válida encontrada.");
        return;
      }
      setProgresso(70);
      setEtapa("Salvando músicas…");
      await espera();
      const existentes = new Set(
        atual.songs.map((s) => `${s.titulo.toLowerCase()}|${s.artista.toLowerCase()}`),
      );
      const novas = songs.filter(
        (s) => !existentes.has(`${s.titulo.toLowerCase()}|${s.artista.toLowerCase()}`),
      );
      writeData({ ...atual, songs: [...novas, ...atual.songs] });
      resumo = {
        songsAdicionadas: novas.length,
        repertoriosAdicionados: 0,
        ignorados: songs.length - novas.length,
        erros,
      };
    } else {
      let bruto: unknown;
      try {
        bruto = JSON.parse(texto);
      } catch {
        setProgresso(null);
        setResultado({ ...resumo, erros: ["O arquivo não é um JSON válido."] });
        toast.error("Arquivo JSON inválido.");
        return;
      }
      const { data: validado, erros } = validarBackup(bruto);
      if (!validado) {
        setProgresso(null);
        setResultado({ ...resumo, erros });
        toast.error("Arquivo inválido.");
        return;
      }
      setProgresso(70);
      setEtapa("Mesclando com seus dados…");
      await espera();
      const songIds = new Set(atual.songs.map((s) => s.id));
      const setIds = new Set(atual.setlists.map((s) => s.id));
      const novasSongs = validado.songs.filter((s) => !songIds.has(s.id));
      const novosReps = validado.setlists.filter((s) => !setIds.has(s.id));
      writeData({
        songs: [...atual.songs, ...novasSongs],
        setlists: [...atual.setlists, ...novosReps],
      });
      resumo = {
        songsAdicionadas: novasSongs.length,
        repertoriosAdicionados: novosReps.length,
        ignorados:
          validado.songs.length -
          novasSongs.length +
          (validado.setlists.length - novosReps.length),
        erros,
      };
    }

    setProgresso(100);
    setEtapa("Concluído");
    await espera();
    setProgresso(null);
    setResultado(resumo);
    toast.success(
      `Importação concluída: ${resumo.songsAdicionadas} música(s)` +
        (resumo.repertoriosAdicionados
          ? ` e ${resumo.repertoriosAdicionados} repertório(s)`
          : "") +
        " adicionada(s).",
    );
  };

  const importando = progresso !== null;

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

        {podeBackup ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Exportar
            </h2>
            <Button
              onClick={exportarJson}
              disabled={importando}
              className="h-14 rounded-2xl text-base font-bold"
            >
              <DownloadIcon /> Backup completo (.json)
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={exportarCsv}
                disabled={importando}
                className="h-12 rounded-xl font-bold"
              >
                <DownloadIcon /> Músicas (.csv)
              </Button>
              <Button
                variant="outline"
                onClick={exportarRepertoriosCsv}
                disabled={importando}
                className="h-12 rounded-xl font-bold"
              >
                <DownloadIcon /> Repertórios (.csv)
              </Button>
            </div>
          </section>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Enviar backup é um privilégio. Peça ao administrador para liberar essa opção na sua
            conta.
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Importar
          </h2>
          <Button
            variant="secondary"
            className="h-14 rounded-2xl text-base font-bold"
            disabled={importando}
            onClick={() => jsonRef.current?.click()}
          >
            <UploadIcon /> Importar backup (.json)
          </Button>
          <Button
            variant="secondary"
            className="h-14 rounded-2xl text-base font-bold"
            disabled={importando}
            onClick={() => csvRef.current?.click()}
          >
            <UploadIcon /> Importar músicas (.csv)
          </Button>
          <input
            ref={jsonRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void rodarImportacao(file, "json");
              e.target.value = "";
            }}
          />
          <input
            ref={csvRef}
            type="file"
            accept="text/csv,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void rodarImportacao(file, "csv");
              e.target.value = "";
            }}
          />
        </section>

        {importando ? (
          <div className="surface-tile flex flex-col gap-2 rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-foreground">{etapa}</p>
            <Progress value={progresso ?? 0} />
            <p className="text-xs text-muted-foreground">{progresso}%</p>
          </div>
        ) : null}

        {resultado && !importando ? (
          <div className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              {resultado.songsAdicionadas + resultado.repertoriosAdicionados > 0 ? (
                <CheckCircle2Icon className="size-4 text-primary" />
              ) : (
                <AlertTriangleIcon className="size-4 text-destructive" />
              )}
              Resultado da importação
            </p>
            <ul className="text-sm text-muted-foreground">
              <li>{resultado.songsAdicionadas} música(s) adicionada(s)</li>
              <li>{resultado.repertoriosAdicionados} repertório(s) adicionado(s)</li>
              <li>{resultado.ignorados} item(ns) já existente(s) ignorado(s)</li>
            </ul>
            {resultado.erros.length > 0 ? (
              <div className="flex flex-col gap-1 rounded-xl border border-destructive/40 p-3">
                <p className="text-xs font-bold text-destructive">
                  {resultado.erros.length} aviso(s) de validação
                </p>
                <ul className="max-h-40 list-disc overflow-auto pl-4 text-xs text-muted-foreground">
                  {resultado.erros.slice(0, 20).map((erro, i) => (
                    <li key={i}>{erro}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          A importação adiciona os itens do arquivo sem apagar o que já está salvo. Colunas aceitas
          no CSV: titulo, artista, tom, bpm, ritmo, observacoes, letra.
        </p>
      </div>
    </PageShell>
  );
}
