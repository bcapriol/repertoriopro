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

  const tentarNovamente = async <T,>(acao: () => Promise<T>, etapa: string): Promise<T> => {
    for (let tentativa = 1; ; tentativa++) {
      setMensagem(`${etapa} Mantenha o app aberto até a confirmação final.`);
      try {
        return await acao();
      } catch (erro) {
        const texto = erro instanceof Error ? erro.message : "Falha de conexão.";
        const definitivo = erro instanceof DOMException && erro.name === "QuotaExceededError"
          || /inválid|não autorizado|não autorizada|limite de 3 MB|arquivo está vazio|apenas PDF/i.test(texto);
        if (definitivo || tentativa >= 5) throw erro;
        setMensagem(`${etapa} Ainda não terminou. Tentando novamente (${tentativa + 1}/5)…${navigator.onLine ? "" : " Reconecte a internet."}`);
        await new Promise<void>((resolve) => window.setTimeout(resolve, Math.min(1000 * 2 ** (tentativa - 1), 8000)));
      }
    }
  };

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
      const enviados = new Map<string, { dados: string; caminho: string }>();
      const migrarAnexos = async (entrada: AppData) => {
        await guardarLegadoOffline(entrada);
        const total = new Set(entrada.songs.flatMap((song) => (song.anexos ?? []).filter((anexo) => anexo.dados).map((anexo) => anexo.id))).size;
        const concluidos = new Set<string>();
        let alterou = false;
        const songs: Song[] = [];
        for (const song of entrada.songs) {
          const anexos: Anexo[] = [];
          let alterouMusica = false;
          for (const anexo of song.anexos ?? []) {
            if (anexo.dados) {
              const anterior = enviados.get(anexo.id);
              const remoto = anterior?.dados === anexo.dados ? anterior : await tentarNovamente(
                () => enviarArquivo({
                  data: { usuario, senha, id: anexo.id, nome: anexo.nome, tipo: anexo.tipo, dados: anexo.dados! },
                }),
                `Subindo arquivo ${concluidos.size + 1} de ${total}: ${anexo.nome}.`,
              );
              enviados.set(anexo.id, { dados: anexo.dados, caminho: remoto.caminho });
              concluidos.add(anexo.id);
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
      const r = await tentarNovamente(
        () => sincronizar({ data: { usuario, senha, dados: localMigrado.dados } }),
        "Enviando todas as músicas e repertórios e confirmando a gravação na nuvem…",
      );
      const remotoMigrado = await migrarAnexos(r.dados);
      let dadosFinais: AppData = remotoMigrado.dados;
      if (localMigrado.alterou || remotoMigrado.alterou) {
        const dadosParaEnviar = dadosFinais;
        const atualizado = await tentarNovamente(
          () => sincronizar({ data: { usuario, senha, dados: dadosParaEnviar } }),
          "Confirmando os arquivos enviados e concluindo a atualização da banda…",
        );
        dadosFinais = atualizado.dados;
      }
      setMensagem("Envio confirmado na nuvem. Salvando a cópia neste aparelho…");
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
      let copia = await prepararCopiaOffline(dadosFinais, (anexo) => tentarNovamente(async () => {
        const { url } = await obterArquivo({ data: { usuario, senha, caminho: anexo.caminho! } });
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error(`Não foi possível baixar o anexo “${anexo.nome}”.`);
        return resposta.blob();
      }, `Baixando e salvando o arquivo: ${anexo.nome}.`));
      for (let tentativa = 1; !copia.telasProntas && tentativa < 3; tentativa++) {
        setMensagem(`Os dados já subiram. Concluindo o preparo offline (${tentativa + 1}/3)… Mantenha o app aberto.`);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
        const { prepararTelasOffline } = await import("@/lib/offline-app");
        copia = { ...copia, telasProntas: await prepararTelasOffline(dadosFinais) };
      }
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
      const aviso = `Sincronização não concluída. ${erro} Seus dados locais foram mantidos. Verifique a conexão e o espaço disponível e tente novamente; o aviso de 100% só aparece após terminar todas as etapas.`;
      setMensagem(aviso);
      toast.error(aviso);
    } finally {
      emAndamento = false;
      setOcupado(false);
    }
  };

  return { executar, ocupado, mensagem };
}
