import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { enviarAnexo, obterAnexo, sincronizarNuvem } from "@/lib/nuvem.functions";
import { readData, writeData, type Anexo, type AppData, type Song } from "@/lib/repertorio-store";
import { guardarLegadoOffline, prepararCopiaOffline } from "@/lib/anexo-cache";
import { lerConta, salvarBanda, salvarConta, type Conta } from "@/lib/banda-local";

let emAndamento = false;

/** Operação completa usada pelo único botão de sincronização, na tela inicial. */
export function useSincronizacao() {
  const sincronizar = useServerFn(sincronizarNuvem);
  const enviarArquivo = useServerFn(enviarAnexo);
  const obterArquivo = useServerFn(obterAnexo);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const executar = async () => {
    if (emAndamento) return;
    if (!navigator.onLine) {
      toast.error("Conecte-se à internet para sincronizar. Os dados já salvos continuam disponíveis sem rede.");
      return;
    }
    const conta = lerConta();
    if (!conta) {
      toast.error("Entre na sua conta da banda antes de sincronizar.");
      return;
    }
    const { usuario, senha } = conta;
    emAndamento = true;
    setOcupado(true);
    setMensagem("Enviando alterações e recebendo os dados da banda…");
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
                data: { usuario, senha, id: anexo.id, nome: anexo.nome, tipo: anexo.tipo, dados: anexo.dados },
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
      const r = await sincronizar({ data: { usuario, senha, dados: localMigrado.dados } });
      const remotoMigrado = await migrarAnexos(r.dados);
      let dadosFinais: AppData = remotoMigrado.dados;
      if (localMigrado.alterou || remotoMigrado.alterou) {
        const atualizado = await sincronizar({ data: { usuario, senha, dados: dadosFinais } });
        dadosFinais = atualizado.dados;
      }
      await writeData(dadosFinais, true);
      salvarBanda(r.banda);
      const nova: Conta = {
        usuario, senha, banda: r.banda,
        podeApagar: r.podeApagar,
        podeBackup: r.podeBackup,
        podeEditar: r.podeEditar,
        podeAgenda: r.podeAgenda,
        podeAdicionarShows: r.podeAdicionarShows,
      };
      salvarConta(nova);
      setMensagem("Salvando anexos e preparando as telas e o leitor de PDF… Mantenha o app aberto.");
      const copia = await prepararCopiaOffline(dadosFinais, async (anexo) => {
        const { url } = await obterArquivo({ data: { usuario, senha, caminho: anexo.caminho! } });
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error("Não foi possível baixar o anexo.");
        return resposta.blob();
      });
      const resumo = `${dadosFinais.songs.length} música(s), ${dadosFinais.setlists.length} repertório(s) e ${copia.disponiveis} arquivo(s) salvos neste aparelho.`;
      if (copia.pendentes || !copia.telasProntas) {
        const pendencias = [
          copia.pendentes ? `Faltam ${copia.pendentes} anexo(s).` : "",
          !copia.telasProntas ? "O preparo das telas offline não foi concluído; consulte o aviso abaixo." : "",
        ].filter(Boolean).join(" ");
        const aviso = `Dados sincronizados: ${resumo} ${pendencias} Tente sincronizar novamente com internet antes de desconectar.`;
        setMensagem(aviso);
        toast.warning(aviso);
      } else {
        const sucesso = `Sincronização concluída. ${resumo} Telas e leitor de PDF preparados para uso offline.`;
        setMensagem(sucesso);
        toast.success(sucesso);
        return true;
      }
    } catch (e) {
      const erro = e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Sem espaço para sincronizar. Libere espaço no aparelho e tente novamente."
        : e instanceof Error ? e.message : "Não foi possível sincronizar.";
      setMensagem(erro);
      toast.error(erro);
    } finally {
      emAndamento = false;
      setOcupado(false);
    }
  };

  return { executar, ocupado, mensagem };
}
