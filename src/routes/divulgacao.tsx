import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon, ImageIcon, LoaderCircleIcon, PencilIcon, RefreshCwIcon, SendIcon, SparklesIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { DivulgacaoFormulario } from "@/components/DivulgacaoFormulario";
import { useConta } from "@/lib/banda-local";
import { camposIniciais, formatosDivulgacao, type CamposDivulgacao, type ImagemDivulgacao } from "@/lib/divulgacao";
import { divulgacaoArte, divulgacaoPrompt, divulgacaoStatus } from "@/lib/divulgacao.functions";
import { ajustarArteDivulgacao, prepararImagemDivulgacao } from "@/lib/divulgacao-imagens";

export const Route = createFileRoute("/divulgacao")({
  head: () => ({ meta: [{ title: "Divulgação · Banda Multivibe" }] }),
  component: Divulgacao,
});

function Divulgacao() {
  const { conta, pronto } = useConta();
  const gerarPrompt = useServerFn(divulgacaoPrompt);
  const gerarArte = useServerFn(divulgacaoArte);
  const consultarStatus = useServerFn(divulgacaoStatus);
  const [campos, setCampos] = useState<CamposDivulgacao>({ ...camposIniciais });
  const [imagens, setImagens] = useState<ImagemDivulgacao[]>([]);
  const [prompt, setPrompt] = useState("");
  const [aprovado, setAprovado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [desatualizado, setDesatualizado] = useState(false);
  const [arte, setArte] = useState<{ src: string; ajustada: boolean } | null>(null);
  const [atividade, setAtividade] = useState<"prompt" | "arte" | "upload" | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [configurada, setConfigurada] = useState<boolean | null>(null);
  const bloqueio = useRef(false);
  const resultadoRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const ocupado = atividade !== null;
  const podeEnviar = Boolean(conta) && online !== false && configurada !== false && !ocupado;

  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => { window.removeEventListener("online", atualizar); window.removeEventListener("offline", atualizar); };
  }, []);

  useEffect(() => {
    if (!conta || !online) return;
    let ativo = true;
    consultarStatus({ data: { usuario: conta.usuario, senha: conta.senha } })
      .then((r) => { if (ativo) setConfigurada(r.configurada); })
      .catch(() => { if (ativo) setConfigurada(null); });
    return () => { ativo = false; };
  }, [conta?.usuario, conta?.senha, online, consultarStatus]);

  useEffect(() => {
    if (editando) promptRef.current?.focus();
  }, [editando]);

  function invalidar() {
    setAprovado(false);
    setDesatualizado(Boolean(prompt));
    setArte(null);
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

  async function enviar(refazer: boolean) {
    if (!conta || !podeEnviar || bloqueio.current) return;
    bloqueio.current = true;
    setAtividade("prompt");
    setErro("");
    setAviso("");
    try {
      const r = await gerarPrompt({ data: { usuario: conta.usuario, senha: conta.senha, campos, imagens, anterior: refazer ? prompt : "" } });
      setPrompt(r.prompt);
      setAprovado(false);
      setEditando(false);
      setDesatualizado(false);
      setArte(null);
      setConfigurada(true);
      requestAnimationFrame(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o prompt. Tente novamente.");
    } finally { bloqueio.current = false; setAtividade(null); }
  }

  async function criarArte() {
    if (!conta || !podeEnviar || !aprovado || desatualizado || bloqueio.current) return;
    if (arte && !window.confirm("Gerar outra arte usa novos créditos da API OpenAI. Continuar?")) return;
    bloqueio.current = true;
    setAtividade("arte");
    setErro("");
    setAviso("");
    try {
      const r = await gerarArte({ data: { usuario: conta.usuario, senha: conta.senha, campos, imagens, prompt } });
      try {
        setArte({ src: await ajustarArteDivulgacao(r.imagem, campos.formato), ajustada: true });
      } catch {
        setArte({ src: r.imagem, ajustada: false });
        setAviso("A arte foi gerada, mas este aparelho não conseguiu ajustar as dimensões. Você pode baixar a imagem original abaixo.");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar a arte. Seu prompt foi mantido.");
    } finally { bloqueio.current = false; setAtividade(null); }
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setAviso("Prompt copiado.");
    } catch { setAviso("Não foi possível copiar automaticamente. Selecione o texto do prompt e copie manualmente."); }
  }

  const formato = formatosDivulgacao[campos.formato];
  return (
    <PageShell title="Divulgação" subtitle="Da ideia à arte: prepare, revise e gere com IA." wide>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-accent p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><SparklesIcon className="size-5" />Assistente OpenAI · tecnologia do ChatGPT</p>
          <p className="mt-2 text-muted-foreground">1. Preencha o que quiser → 2. Revise e aprove o prompt → 3. Gere sua arte.</p>
          <p className="mt-2 text-xs text-muted-foreground">Todos os campos e uploads são opcionais. Ao enviar, o texto e as imagens serão compartilhados com a OpenAI. Use apenas imagens que você tem autorização para utilizar.</p>
          <p className="mt-2 text-xs text-muted-foreground">Requer internet e uma chave da API OpenAI com créditos. Cada geração pode ter custo; a assinatura do ChatGPT não inclui os créditos da API. Os dados e resultados ficam somente nesta tela: copie o prompt e baixe a arte antes de sair.</p>
        </div>
        {pronto && !conta && <p role="alert" className="rounded-lg border border-border p-4">Entre na sua conta pela tela inicial para usar a IA.</p>}
        {online === false && <p role="status" className="rounded-lg border border-border p-4 text-sm">Você está sem internet. Pode preencher os campos, mas precisa se conectar para gerar o prompt ou a arte.</p>}
        {configurada === false && (
          <div role="status" className="space-y-3 rounded-lg border border-border bg-muted p-4 text-sm">
            <p>A IA ainda não foi ativada. O administrador precisa cadastrar o segredo <strong>OPENAI_API_KEY</strong> no servidor do projeto no Lovable, com uma chave da API OpenAI com créditos. Não coloque a chave nos campos abaixo.</p>
            <Button type="button" variant="outline" disabled={ocupado || online === false} onClick={async () => {
              if (!conta) return;
              setErro("");
              try { const r = await consultarStatus({ data: { usuario: conta.usuario, senha: conta.senha } }); setConfigurada(r.configurada); }
              catch { setErro("Não foi possível verificar a configuração. Confira a conexão e tente novamente."); }
            }}>Verificar ativação</Button>
          </div>
        )}
        <form className="surface-tile space-y-5 rounded-lg border border-border p-4 sm:p-6" onSubmit={(e) => { e.preventDefault(); void enviar(false); }}>
          <div><h2 className="text-lg font-bold">Informações da divulgação</h2><p className="mt-1 text-sm text-muted-foreground">Deixe em branco o que não deve aparecer. Só o conteúdo preenchido será usado, sem os títulos dos campos.</p></div>
          <DivulgacaoFormulario campos={campos} imagens={imagens} disabled={ocupado} onCampo={mudarCampo} onImagem={adicionarImagem} onRemover={(papel) => { setImagens((atuais) => atuais.filter((i) => i.papel !== papel)); invalidar(); }} />
          <Button type="submit" disabled={!podeEnviar}><SendIcon />Enviar e gerar prompt</Button>
        </form>
        {atividade && <p role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm"><LoaderCircleIcon className="size-5 animate-spin" />{atividade === "upload" ? "Preparando imagem…" : atividade === "prompt" ? "A IA está preparando seu prompt…" : "Gerando sua arte… Isso pode levar alguns minutos. Mantenha esta tela aberta."}</p>}
        {erro && <p role="alert" className="rounded-lg border border-destructive bg-card p-4 text-sm">{erro}</p>}
        {aviso && <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm">{aviso}</p>}
        {(prompt || editando) && (
          <section ref={resultadoRef} className="surface-tile scroll-mt-40 space-y-4 rounded-lg border border-border p-4 sm:p-6" aria-labelledby="titulo-prompt">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="titulo-prompt" className="text-lg font-bold">Seu prompt</h2>
              <span className="rounded-full bg-accent px-3 py-1 text-xs text-primary">{desatualizado ? "Informações alteradas" : aprovado ? "Aprovado" : editando ? "Em edição" : "Aguardando aprovação"}</span>
            </div>
            {desatualizado && <p className="text-sm text-muted-foreground">Você alterou as informações ou imagens. Envie novamente ou refaça o prompt para incluir as mudanças antes de aprovar.</p>}
            <label htmlFor="prompt-final" className="block text-sm text-muted-foreground">Revise os dados e a direção visual antes de gerar a arte.</label>
            <textarea id="prompt-final" ref={promptRef} value={prompt} rows={14} maxLength={12000} readOnly={!editando || ocupado} className="w-full rounded-lg border border-input bg-background p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring read-only:bg-muted/40" onChange={(e) => {
              setPrompt(e.target.value); setAprovado(false); setArte(null); setAviso("");
            }} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={ocupado || aprovado || desatualizado || prompt.trim().length < 20} onClick={() => { setAprovado(true); setEditando(false); setAviso("Prompt aprovado. Agora você pode gerar a arte."); }}><CheckIcon />{aprovado ? "Aprovado" : "Aprovar"}</Button>
              <Button type="button" variant="outline" disabled={ocupado} onClick={() => { setEditando(true); setAprovado(false); setAviso(""); }}><PencilIcon />Alterar prompt</Button>
              <Button type="button" variant="outline" disabled={!podeEnviar} onClick={() => void enviar(true)}><RefreshCwIcon />Refazer prompt</Button>
              <Button type="button" variant="outline" disabled={ocupado} onClick={() => void copiarPrompt()}><CopyIcon />Copiar</Button>
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <Button type="button" disabled={!podeEnviar || !aprovado || desatualizado} onClick={() => void criarArte()}><ImageIcon />{arte ? "Gerar outra arte" : "Gerar arte"}</Button>
              <p className="text-xs text-muted-foreground">A geração usa créditos da API OpenAI. Aprovar o prompt não gera a imagem automaticamente.</p>
            </div>
          </section>
        )}
        {arte && (
          <section className="surface-tile space-y-4 rounded-lg border border-border p-4 sm:p-6" aria-labelledby="titulo-arte">
            <h2 id="titulo-arte" className="text-lg font-bold">Sua arte</h2>
            <p className="text-sm text-muted-foreground">{arte.ajustada ? `${formato.nome} · ${formato.largura} × ${formato.altura} px` : "Imagem original da IA"}</p>
            <img src={arte.src} alt="Arte de divulgação da Banda Multivibe gerada com IA" className="mx-auto max-h-[75vh] max-w-full rounded-lg border border-border object-contain" />
            <p className="text-xs text-muted-foreground">Confira textos, datas, logotipos e rostos antes de publicar: a IA pode alterá-los. Nos formatos vertical e horizontal, as bordas são completadas com um fundo desfocado para não cortar o conteúdo.</p>
            <Button asChild><a href={arte.src} download={`multivibe-${campos.formato}-${campos.data || "divulgacao"}.png`}><DownloadIcon />Baixar arte em PNG</a></Button>
          </section>
        )}
      </div>
    </PageShell>
  );
}
