import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownUpIcon,
  BluetoothIcon,
  EraserIcon,
  FileDownIcon,
  LogOutIcon,
  RefreshCwIcon,
  WifiIcon,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sincronizarNuvem } from "@/lib/nuvem.functions";
import { readData, writeData, type AppData } from "@/lib/repertorio-store";
import { mesclarDados } from "@/lib/sync-merge";
import { enviarPorBluetooth } from "@/lib/bluetooth-sync";
import { validarBackup } from "@/lib/backup";
import { lerConta, salvarBanda, salvarConta, useBanda } from "@/lib/banda-local";

export const Route = createFileRoute("/sincronizar")({
  head: () => ({
    meta: [
      { title: "Sincronizar repertórios | Repertório Fácil" },
      {
        name: "description",
        content:
          "Sincronize seus repertórios por Wi-Fi, envie por Bluetooth para outro aparelho ou use exportar e importar.",
      },
      { property: "og:title", content: "Sincronizar repertórios | Repertório Fácil" },
      {
        property: "og:description",
        content:
          "Sincronize seus repertórios por Wi-Fi, envie por Bluetooth para outro aparelho ou use exportar e importar.",
      },
    ],
  }),
  component: SincronizarPage,
});

function SincronizarPage() {
  const banda = useBanda();
  const sincronizar = useServerFn(sincronizarNuvem);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [conta, setConta] = useState<{ usuario: string; senha: string } | null>(null);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setConta(lerConta());
  }, []);

  const rodarSincronia = async (u: string, s: string) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("Sem internet. Use a sincronização Bluetooth.");
      return;
    }
    setOcupado(true);
    try {
      const r = await sincronizar({ data: { usuario: u, senha: s, dados: readData() } });
      writeData(r.dados);
      salvarBanda(r.banda);
      salvarConta({ usuario: u, senha: s });
      setConta({ usuario: u, senha: s });
      toast.success(
        `Sincronizado: ${r.dados.songs.length} música(s) e ${r.dados.setlists.length} repertório(s).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível sincronizar.");
    } finally {
      setOcupado(false);
    }
  };

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
      toast.error("Não foi possível iniciar o envio.");
    } finally {
      setOcupado(false);
    }
  };

  const receberArquivo = async (file: File) => {
    setOcupado(true);
    try {
      const bruto = JSON.parse(await file.text());
      const check = validarBackup(bruto);
      if (!check.ok || !check.dados) {
        toast.error(check.erros[0] ?? "Arquivo inválido.");
        return;
      }
      const mesclado = mesclarDados(readData(), check.dados as AppData);
      writeData(mesclado);
      toast.success(
        `Recebido: ${mesclado.songs.length} música(s) e ${mesclado.setlists.length} repertório(s).`,
      );
    } catch {
      toast.error("Não foi possível ler o arquivo recebido.");
    } finally {
      setOcupado(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  };

  return (
    <PageShell title="Sincronização e transferência" subtitle="Wi-Fi, Bluetooth ou arquivo">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          {banda
            ? `Aparelho ligado à banda: ${banda}.`
            : "Entre uma vez com seu usuário da banda para liberar a sincronização por Wi-Fi."}
        </p>

        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <WifiIcon className="size-4" /> Sincronizar repertórios Wi-Fi
          </h2>
          <p className="text-sm text-muted-foreground">
            Envia o que mudou neste aparelho e baixa o que mudou nos outros. Vale a versão mais
            recente de cada música e repertório.
          </p>
          {conta ? (
            <>
              <Button
                onClick={() => rodarSincronia(conta.usuario, conta.senha)}
                disabled={ocupado}
                className="h-14 rounded-xl text-base font-bold"
              >
                <RefreshCwIcon /> SINCRONIZAR REPERTÓRIOS WI-FI
              </Button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                onClick={() => {
                  salvarConta(null);
                  setConta(null);
                  toast.success("Aparelho desconectado da banda.");
                }}
              >
                <LogOutIcon className="size-4" /> Sair de {conta.usuario}
              </button>
            </>
          ) : (
            <>
              <Input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuário"
                autoComplete="username"
                className="h-12 text-base"
              />
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className="h-12 text-base"
              />
              <Button
                onClick={() => {
                  if (!usuario.trim() || !senha) {
                    toast.error("Informe usuário e senha.");
                    return;
                  }
                  rodarSincronia(usuario.trim(), senha);
                }}
                disabled={ocupado}
                className="h-14 rounded-xl text-base font-bold"
              >
                <RefreshCwIcon /> SINCRONIZAR REPERTÓRIOS WI-FI
              </Button>
            </>
          )}
        </section>

        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <BluetoothIcon className="size-4" /> Sincronizar repertórios Bluetooth
          </h2>
          <p className="text-sm text-muted-foreground">
            Transfere os repertórios direto para um aparelho próximo, sem internet.
          </p>
          <Button
            onClick={porBluetooth}
            disabled={ocupado}
            variant="secondary"
            className="h-14 rounded-xl text-base font-bold"
          >
            <BluetoothIcon /> SINCRONIZAR REPERTÓRIOS BLUETOOTH
          </Button>
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
            recebe toque em "Receber de outro aparelho" e abra o que chegou. Nada é perdido: os dois
            aparelhos ficam com tudo.
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
            onClick={() => {
              if (!window.confirm("Apagar todas as músicas e repertórios deste aparelho?")) return;
              writeData({ songs: [], setlists: [] });
              salvarBanda("");
              salvarConta(null);
              setConta(null);
              toast.success("Aparelho limpo.");
            }}
          >
            Limpar este aparelho
          </Button>
        </section>
      </div>
    </PageShell>
  );
}
