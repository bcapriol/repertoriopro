import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, LoaderCircleIcon, PencilIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { DivulgacaoFormulario } from "@/components/DivulgacaoFormulario";
import { useConta } from "@/lib/banda-local";
import { camposIniciais, montarPromptDivulgacao, nomesImagens, type CamposDivulgacao, type ImagemDivulgacao } from "@/lib/divulgacao";
import { prepararImagemDivulgacao } from "@/lib/divulgacao-imagens";

export const Route = createFileRoute("/divulgacao")({
  head: () => ({ meta: [{ title: "Divulgação · Banda Multivibe" }] }),
  component: Divulgacao,
});

function Divulgacao() {
  const { conta, pronto } = useConta();
  const [campos, setCampos] = useState<CamposDivulgacao>({ ...camposIniciais });
  const [imagens, setImagens] = useState<ImagemDivulgacao[]>([]);
  const [prompt, setPrompt] = useState("");
  const [aprovado, setAprovado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [desatualizado, setDesatualizado] = useState(false);
  const [atividade, setAtividade] = useState<"upload" | "copiar" | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const bloqueio = useRef(false);
  const variacao = useRef(0);
  const resultadoRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const ocupado = atividade !== null;
  const podeMontar = Boolean(conta) && !ocupado;

  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => { window.removeEventListener("online", atualizar); window.removeEventListener("offline", atualizar); };
  }, []);

  useEffect(() => {
    if (editando) promptRef.current?.focus();
  }, [editando]);

  function invalidar() {
    setAprovado(false);
    setDesatualizado(Boolean(prompt));
    setAviso("");
  }

  function mudarCampo<K extends keyof CamposDivulgacao>(campo: K, valor: CamposDivulgacao[K]) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
    invalidar();
  }

  async function adicionarImagem(papel: ImagemDivulgacao["papel"], arquivo: File) {
    if (bloqueio.current) return;
    bloqueio.current = true;
    setAtividade("upload");
    setErro("");
    try {
      const dados = await prepararImagemDivulgacao(arquivo, papel === "fotoBanda");
      setImagens((atuais) => [...atuais.filter((i) => i.papel !== papel), { papel, dados }]);
      invalidar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível preparar a imagem.");
    } finally { bloqueio.current = false; setAtividade(null); }
  }

  function montar(refazer: boolean) {
    if (!podeMontar || bloqueio.current) return;
    variacao.current = refazer ? (variacao.current + 1) % 3 : 0;
    setPrompt(montarPromptDivulgacao(campos, imagens, variacao.current));
    setAprovado(false);
    setEditando(false);
    setDesatualizado(false);
    setErro("");
    setAviso("");
    requestAnimationFrame(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function copiarPrompt(abrirChat = false) {
    if (!prompt.trim() || bloqueio.current || (abrirChat && (!aprovado || desatualizado || online === false))) return;
    bloqueio.current = true;
    setAtividade("copiar");
    setErro("");
    let aba: Window | null = null;
    try {
      // Inicia a cópia e reserva a aba durante o clique, antes de qualquer await.
      const copia = navigator.clipboard?.writeText(prompt);
      if (abrirChat) {
        aba = window.open("about:blank", "_blank");
        if (aba) { aba.opener = null; aba.location.replace("https://chatgpt.com/"); }
      }
      if (!copia) throw new Error("Cópia indisponível");
      await copia;
      setAviso(abrirChat
        ? `Prompt copiado. ${aba ? "No ChatGPT," : "Se a nova aba não abriu, use o link Abrir ChatGPT abaixo; depois"} cole o texto, anexe as referências se houver e pressione Enter ou toque em Enviar.`
        : "Prompt copiado. Cole no ChatGPT e envie quando estiver pronto.");
    } catch {
      promptRef.current?.focus();
      promptRef.current?.select();
      setAviso("O navegador não permitiu copiar automaticamente. O prompt está disponível abaixo: selecione e copie o texto manualmente, abra o ChatGPT pelo link, cole, anexe as referências e envie.");
    } finally { bloqueio.current = false; setAtividade(null); }
  }

  return (
    <PageShell title="Divulgação" subtitle="Monte as instruções aqui e crie sua arte no site do ChatGPT.">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-accent p-4 text-sm space-y-2">
          <p className="font-semibold">Sem chave de API</p>
          <p>O aplicativo reúne os dados e as orientações em um prompt no próprio aparelho. Você revisa, aprova e usa o botão para copiar o texto e abrir o ChatGPT.</p>
          <p>No ChatGPT, faça login se necessário, cole o prompt, anexe as imagens e pressione Enter ou toque em Enviar. Por segurança, este site não consegue colar, anexar ou enviar automaticamente em outro site.</p>
          <p className="text-muted-foreground">A criação e o download da arte acontecem no ChatGPT, conforme os recursos e limites da sua conta. Os campos e imagens desta tela não são salvos ao sair.</p>
        </section>
        {online === false && <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">Sem internet: você pode montar, editar e copiar o prompt. Conecte-se para usar o ChatGPT.</p>}
        {!pronto ? <p role="status">Carregando…</p> : !conta ? <p>Entre na sua conta pela tela inicial para usar a Divulgação.</p> : <>
          <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-bold">1. Dados da divulgação</h2>
            <p className="text-sm text-muted-foreground">Todos os campos e imagens são opcionais. As imagens ficam neste aparelho; não são enviadas ao ChatGPT automaticamente.</p>
            <DivulgacaoFormulario campos={campos} imagens={imagens} disabled={ocupado}
              onCampo={mudarCampo} onImagem={adicionarImagem}
              onRemover={(papel) => { setImagens((atuais) => atuais.filter((i) => i.papel !== papel)); invalidar(); }} />
            <Button type="button" disabled={!podeMontar} onClick={() => montar(false)} className="w-full">
              {atividade === "upload" ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}Montar prompt
            </Button>
          </section>
          {erro && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{erro}</p>}
          <div ref={resultadoRef} className="scroll-mt-40">
            {prompt !== "" || editando ? <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-lg font-bold">2. Revise e aprove o prompt</h2>
              <p className="text-sm text-muted-foreground">Texto montado automaticamente a partir do formulário, sem chamada de IA. Refazer alterna entre três sugestões de estilo e substitui as edições manuais.</p>
              {desatualizado && <p role="status" className="rounded-lg bg-muted p-3 text-sm">Os dados ou imagens mudaram. Clique em Montar prompt ou Refazer prompt para atualizar antes de aprovar.</p>}
              <label htmlFor="prompt-divulgacao" className="block text-sm font-medium">Prompt para o ChatGPT</label>
              <textarea id="prompt-divulgacao" ref={promptRef} value={prompt} readOnly={!editando || ocupado} rows={16} maxLength={16000}
                className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(e) => { setPrompt(e.target.value); setAprovado(false); setAviso(""); }} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={ocupado || desatualizado} onClick={() => { setEditando(true); setAprovado(false); setAviso(""); }}><PencilIcon />Alterar prompt</Button>
                <Button type="button" variant="outline" disabled={ocupado} onClick={() => montar(true)}><RefreshCwIcon />Refazer prompt</Button>
                <Button type="button" disabled={ocupado || desatualizado || !prompt.trim() || aprovado} onClick={() => { setAprovado(true); setEditando(false); setAviso(""); }}><CheckIcon />{aprovado ? "Aprovado" : "Aprovar"}</Button>
              </div>
              <h2 className="pt-2 text-lg font-bold">3. Continue no ChatGPT</h2>
              {imagens.length > 0 && <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
                <p className="font-semibold">Anexe estas referências no ChatGPT</p>
                <p>Baixe as imagens preparadas abaixo e anexe cada arquivo à conversa antes de enviar o prompt. Elas não são incluídas na cópia do texto.</p>
                <div className="flex flex-wrap gap-2">
                  {imagens.map((imagem) => <Button key={imagem.papel} variant="outline" asChild>
                    <a href={imagem.dados} download={`${imagem.papel}.${imagem.dados.startsWith("data:image/jpeg") ? "jpg" : "png"}`}><DownloadIcon />{nomesImagens[imagem.papel]}</a>
                  </Button>)}
                </div>
              </div>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={ocupado || desatualizado || !prompt.trim()} variant="outline" onClick={() => void copiarPrompt()}><CopyIcon />Copiar prompt</Button>
                <Button type="button" disabled={ocupado || !aprovado || desatualizado || online === false} onClick={() => void copiarPrompt(true)}>
                  {atividade === "copiar" ? <LoaderCircleIcon className="animate-spin" /> : <ExternalLinkIcon />}Copiar e abrir ChatGPT
                </Button>
              </div>
              {!aprovado && <p className="text-xs text-muted-foreground">Aprove o prompt para liberar o botão Copiar e abrir ChatGPT.</p>}
              {aviso && <p role="status" className="rounded-lg bg-accent p-3 text-sm">{aviso}</p>}
              <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline"><ExternalLinkIcon className="size-4" />Abrir ChatGPT manualmente</a>
              <p className="text-xs text-muted-foreground">Se o navegador bloquear a cópia ou a nova aba, selecione o prompt, copie manualmente e use o link acima. Revise os textos e as imagens da arte no ChatGPT antes de publicar.</p>
            </section> : null}
          </div>
        </>}
      </div>
    </PageShell>
  );
}
