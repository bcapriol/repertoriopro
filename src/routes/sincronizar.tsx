import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownUpIcon,
  BluetoothIcon,
  EraserIcon,
  FileDownIcon,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OfflineStatus } from "@/components/OfflineStatus";
import { Button } from "@/components/ui/button";
import { readData, writeData, type AppData } from "@/lib/repertorio-store";
import { prepararCopiaOffline, type CopiaOffline } from "@/lib/anexo-cache";
import { mesclarDados } from "@/lib/sync-merge";
import { enviarPorBluetooth } from "@/lib/bluetooth-sync";
import { validarBackup } from "@/lib/backup";
import { lerConta, salvarBanda, salvarConta, useBanda, type Conta } from "@/lib/banda-local";

export const Route = createFileRoute("/sincronizar")({
  head: () => ({
    meta: [
      { title: "Transferir entre aparelhos | Repertório Fácil" },
      {
        name: "description",
        content:
          "Transfira músicas e repertórios por Bluetooth, receba arquivos de outro aparelho ou use exportar e importar.",
      },
      { property: "og:title", content: "Transferir entre aparelhos | Repertório Fácil" },
      {
        property: "og:description",
        content:
          "Transfira músicas e repertórios por Bluetooth, receba arquivos de outro aparelho ou use exportar e importar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SincronizarPage,
});

function SincronizarPage() {
  const banda = useBanda();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [conta, setConta] = useState<Conta | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiaOffline, setCopiaOffline] = useState<CopiaOffline | null>(null);

  useEffect(() => {
    setConta(lerConta());
  }, []);

  const porBluetooth = async () => {
    setOcupado(true);
    try {
      const r = await enviarPorBluetooth(readData());
      toast.success(
        r.via === "compartilhar"
          ? "Escolha o Bluetooth na lista e envie para o outro aparelho."
          : "Arquivo gerado. Envie por Bluetooth pelo seu sistema.",
      );
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Não foi possível iniciar o envio.");
    } finally {
      setOcupado(false);
    }
  };

  const receberArquivo = async (file: File) => {
    setOcupado(true);
    try {
      const bruto = JSON.parse(await file.text());
      const check = validarBackup(bruto);
      if (!check.data) {
        toast.error(check.erros[0] ?? "Arquivo inválido.");
        return;
      }
      const mesclado = mesclarDados(readData(), check.data as AppData);
      await writeData(mesclado, true);
      const copia = await prepararCopiaOffline(mesclado);
      setCopiaOffline(copia);
      if (copia.pendentes || !copia.telasProntas) {
        toast.warning(`Músicas recebidas e salvas. ${copia.pendentes ? `Faltam ${copia.pendentes} arquivo(s). ` : ""}${!copia.telasProntas ? "As telas offline ainda não estão prontas. " : ""}Use Sincronizar Repertórios na tela inicial com internet para concluir.`);
      } else {
        toast.success(`Recebido e salvo para consulta offline: ${mesclado.songs.length} música(s), ${mesclado.setlists.length} repertório(s) e ${copia.disponiveis} arquivo(s).`);
      }
    } catch {
      toast.error("Não foi possível ler o arquivo recebido.");
    } finally {
      setOcupado(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  };

  return (
    <PageShell title="Transferir entre aparelhos" subtitle="Bluetooth, receber arquivo e backup">
      <div className="flex flex-col gap-6">
        <OfflineStatus />
        <p className="text-sm text-muted-foreground">
          {banda ? `Aparelho ligado à banda: ${banda}. ` : ""}
          A sincronização completa com a banda agora fica no botão Sincronizar Repertórios da tela inicial, por Wi-Fi ou internet móvel.
        </p>
        {ocupado || copiaOffline ? (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {ocupado
              ? "Aguarde a conclusão da transferência e do preparo offline…"
              : copiaOffline
                ? `Último recebimento: ${copiaOffline.disponiveis} de ${copiaOffline.total} arquivos salvos. ${copiaOffline.pendentes || !copiaOffline.telasProntas ? "Preparo offline incompleto. Use Sincronizar Repertórios na tela inicial com internet para concluir." : "Telas offline preparadas."}`
                : ""}
          </p>
        ) : null}

        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <BluetoothIcon className="size-4" /> Sincronizar repertórios Bluetooth
          </h2>
          <p className="text-sm text-muted-foreground">
            Transfere os repertórios direto para um aparelho próximo, sem internet.
          </p>
          {conta?.podeBackup ? (
            <Button
              onClick={porBluetooth}
              disabled={ocupado}
              variant="secondary"
              className="h-14 rounded-xl text-base font-bold"
            >
              <BluetoothIcon /> SINCRONIZAR REPERTÓRIOS BLUETOOTH
            </Button>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              Enviar backup é um privilégio liberado pelo administrador. Você ainda pode receber de
              outro aparelho.
            </p>
          )}
          <Button
            onClick={() => arquivoRef.current?.click()}
            disabled={ocupado}
            variant="outline"
            className="h-12 rounded-xl font-bold"
          >
            <FileDownIcon /> Receber de outro aparelho
          </Button>
          <input
            ref={arquivoRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) receberArquivo(f);
            }}
          />
          <p className="text-xs text-muted-foreground">
            No aparelho que envia toque em Bluetooth e escolha o outro celular; no aparelho que
            recebe toque em "Receber de outro aparelho" e abra o que chegou. Os anexos seguem no
            arquivo para consulta offline; exclusões também são aplicadas ao receber.
          </p>
        </section>

        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <ArrowDownUpIcon className="size-4" /> Exportar / Importar
          </h2>
          <p className="text-sm text-muted-foreground">
            Crie ou restaure um arquivo de backup dos seus repertórios.
          </p>
          <Link to="/dados">
            <Button variant="secondary" className="h-14 w-full rounded-xl text-base font-bold">
              EXPORTAR / IMPORTAR
            </Button>
          </Link>
        </section>

        {conta?.podeApagar ? (
          <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <EraserIcon className="size-4" /> Trocar de banda
            </h2>
            <p className="text-sm text-muted-foreground">
              Limpa todo o conteúdo deste aparelho e deixa o app zerado, pronto para a próxima banda.
            </p>
            <Button
              variant="destructive"
              className="h-12 rounded-xl font-bold"
              disabled={ocupado}
              onClick={async () => {
                if (!window.confirm("Apagar todas as músicas e repertórios deste aparelho?")) return;
                setOcupado(true);
                try {
                  await writeData({ songs: [], setlists: [], deletedSongs: [], deletedSetlists: [] }, true);
                  salvarBanda("");
                  salvarConta(null);
                  setConta(null);
                  setCopiaOffline(null);
                  toast.success("Aparelho limpo.");
                } catch {
                  toast.error("Não foi possível limpar os dados.");
                } finally {
                  setOcupado(false);
                }
              }}
            >
              Limpar este aparelho
            </Button>
          </section>
        ) : null}

      </div>
    </PageShell>
  );
}
