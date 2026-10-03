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
import { enviarAnexo, obterAnexo, sincronizarNuvem } from "@/lib/nuvem.functions";
import { readData, writeData, type Anexo, type AppData, type Song } from "@/lib/repertorio-store";
import { guardarLegadoOffline, prepararCopiaOffline, type CopiaOffline } from "@/lib/anexo-cache";
import { mesclarDados } from "@/lib/sync-merge";
import { enviarPorBluetooth } from "@/lib/bluetooth-sync";
import { validarBackup } from "@/lib/backup";
import { lerConta, salvarBanda, salvarConta, useBanda, type Conta } from "@/lib/banda-local";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SincronizarPage,
});

function SincronizarPage() {
  const banda = useBanda();
  const sincronizar = useServerFn(sincronizarNuvem);
  const enviarArquivo = useServerFn(enviarAnexo);
  const obterArquivo = useServerFn(obterAnexo);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [conta, setConta] = useState<Conta | null>(null);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [copiaOffline, setCopiaOffline] = useState<CopiaOffline | null>(null);

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
      const migrarAnexos = async (entrada: AppData) => {
        await guardarLegadoOffline(entrada);
        let alterou = false;
        const songs: Song[] = [];
        for (const song of entrada.songs) {
          const anexos: Anexo[] = [];
          let alterouMusica = false;
          for (const anexo of song.anexos ?? []) {
            if (anexo.dados) {
              const remoto = await enviarArquivo({
                data: { usuario: u, senha: s, id: anexo.id, nome: anexo.nome, tipo: anexo.tipo, dados: anexo.dados },
              });
              anexos.push({ id: anexo.id, nome: anexo.nome, tipo: anexo.tipo, caminho: remoto.caminho });
              alterou = true;
              alterouMusica = true;
            } else {
              anexos.push(anexo);
            }
          }
          songs.push(alterouMusica ? { ...song, anexos, atualizadoEm: Date.now() } : { ...song, anexos });
        }
        return { dados: { ...entrada, songs } as AppData, alterou };
      };

      const localMigrado = await migrarAnexos(readData());
      const r = await sincronizar({ data: { usuario: u, senha: s, dados: localMigrado.dados } });
      const remotoMigrado = await migrarAnexos(r.dados);
      let dadosFinais: AppData = remotoMigrado.dados;
      if (localMigrado.alterou || remotoMigrado.alterou) {
        const atualizado = await sincronizar({ data: { usuario: u, senha: s, dados: dadosFinais } });
        dadosFinais = atualizado.dados;
      }
      await writeData(dadosFinais, true);
      const copia = await prepararCopiaOffline(dadosFinais, async (anexo) => {
        const { url } = await obterArquivo({ data: { usuario: u, senha: s, caminho: anexo.caminho! } });
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error("Não foi possível baixar o anexo.");
        return resposta.blob();
      });
      setCopiaOffline(copia);
      salvarBanda(r.banda);
      const nova: Conta = {
        usuario: u,
        senha: s,
        banda: r.banda,
        podeApagar: r.podeApagar,
        podeBackup: r.podeBackup,
        podeEditar: r.podeEditar,
        podeAgenda: r.podeAgenda,
        podeAdicionarShows: r.podeAdicionarShows,
      };
      salvarConta(nova);
      setConta(nova);
      if (copia.pendentes) {
        toast.warning(`Músicas sincronizadas. Faltam ${copia.pendentes} arquivo(s) para uso offline; sincronize novamente com internet.`);
      } else {
        toast.success(`Sincronizado e salvo neste aparelho: ${dadosFinais.songs.length} música(s), ${dadosFinais.setlists.length} repertório(s) e ${copia.disponiveis} arquivo(s).`);
      }
    } catch (e) {
      toast.error(e instanceof DOMException && e.name === "QuotaExceededError" ? "Sem espaço para sincronizar. Libere espaço no aparelho e tente novamente." : e instanceof Error ? e.message : "Não foi possível sincronizar.");
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
      if (copia.pendentes) {
        toast.warning(`Músicas recebidas e salvas. Faltam ${copia.pendentes} arquivo(s) neste aparelho; sincronize por Wi-Fi para baixá-los.`);
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
            Envia as mudanças e salva músicas, repertórios e anexos na memória deste aparelho
            para consulta sem internet. Exclusões também são sincronizadas e removem a cópia local.
          </p>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {ocupado
              ? "Aguarde a conclusão da transferência e da cópia offline…"
              : copiaOffline
                ? copiaOffline.pendentes
                  ? `Cópia incompleta: ${copiaOffline.disponiveis} de ${copiaOffline.total} arquivos disponíveis offline. Sincronize novamente com internet para concluir.`
                  : `Cópia offline pronta neste aparelho: músicas, repertórios e ${copiaOffline.disponiveis} arquivo(s).`
                : "Aguarde a confirmação de cópia offline pronta antes de desconectar a internet."}
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
