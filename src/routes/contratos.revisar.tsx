import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ContratoPdfAcoes } from "@/components/ContratoPdfAcoes";
import { useConta } from "@/lib/banda-local";
import { contarRestricoes, redigirContrato } from "@/lib/contratos-documento";
import { validarContrato, type ResumoContrato } from "@/lib/contratos";
import { contratosGerar, contratosListar, contratosSalvar } from "@/lib/nuvem.functions";

export const Route = createFileRoute("/contratos/revisar")({
  validateSearch: (search: Record<string, unknown>) => ({ id: typeof search.id === "string" ? search.id : "" }),
  component: RevisaoContrato,
});
function RevisaoContrato() {
  const { id } = Route.useSearch();
  const { conta, pronto } = useConta();
  const listar = useServerFn(contratosListar);
  const salvar = useServerFn(contratosSalvar);
  const gerar = useServerFn(contratosGerar);
  const [contrato, setContrato] = useState<ResumoContrato | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [conferido, setConferido] = useState(false);
  useEffect(() => {
    if (!pronto) return;
    let ativo = true;
    setCarregando(true);
    setContrato(null);
    setConferido(false);
    if (!conta || !id) { setCarregando(false); return; }
    listar({ data: { usuario: conta.usuario, senha: conta.senha } })
      .then((itens) => { if (ativo) setContrato(itens.find((item) => item.id === id) ?? null); })
      .catch((e) => { if (ativo) toast.error(e instanceof Error ? e.message : "Falha ao carregar contrato."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, id, conta?.usuario, conta?.senha]);
  const pendencias = useMemo(() => contrato ? validarContrato(contrato.dados) : [], [contrato]);
  const documento = useMemo(() => contrato ? redigirContrato(contrato.dados, contrato.numero, contrato.pdfEmissao ?? new Date().toISOString().slice(0, 10)) : null, [contrato]);
  const finalizar = async () => {
    if (!conta || !contrato || pendencias.length || !conferido || ocupado) return;
    setOcupado(true);
    try {
      await gerar({ data: { usuario: conta.usuario, senha: conta.senha, id: contrato.id } });
      const atualizado = (await listar({ data: { usuario: conta.usuario, senha: conta.senha } })).find((item) => item.id === contrato.id);
      if (atualizado) setContrato(atualizado);
      toast.success("Contrato e Anexo I gerados no mesmo PDF.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível gerar o PDF."); }
    finally { setOcupado(false); }
  };
  const salvarRascunho = async () => {
    if (!conta || !contrato || ocupado) return;
    setOcupado(true);
    try {
      await salvar({ data: { usuario: conta.usuario, senha: conta.senha, id: contrato.id, dados: contrato.dados } });
      toast.success("Rascunho salvo.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setOcupado(false); }
  };
  if (!pronto || carregando) return <PageShell title="Revisão do contrato"><p>Carregando…</p></PageShell>;
  if (!conta || !contrato || !documento) return <PageShell title="Revisão do contrato"><EmptyState title="Contrato não encontrado" hint="Volte à lista para selecionar um contrato da sua banda." /></PageShell>;
  const rascunho = contrato.status === "Rascunho";
  return <PageShell title={`Revisão do contrato ${contrato.numero}`} subtitle="Confira a redação completa antes de gerar o PDF" wide>
    <div className="space-y-5 pb-12">
      <Link to="/contratos" className="text-sm text-primary underline">Voltar à lista</Link>
      <div className="rounded-lg border border-border bg-muted p-4 text-sm">
        <p>Repertório selecionado: <strong>{contrato.dados.repertorio.length} músicas</strong></p>
        <p>Músicas não autorizadas: <strong>{contarRestricoes(contrato.dados.musicasVetadas)}</strong></p>
        <p>Artistas não autorizados: <strong>{contarRestricoes(contrato.dados.artistasVetados)}</strong></p>
        <p>Status: {contrato.status}</p>
      </div>
      {pendencias.length > 0 && <div role="alert" className="rounded-lg border border-destructive p-4 text-sm"><p className="font-bold">Pendências antes da geração:</p><ul className="list-disc pl-5">{pendencias.map((e) => <li key={e}>{e}</li>)}</ul></div>}
      <div className="flex flex-wrap gap-3">
        {rascunho && conta.podeEditar && <><Button asChild variant="outline"><Link to="/contratos/editar" search={{ id: contrato.id }}>Editar / Voltar</Link></Button><Button type="button" variant="outline" disabled={ocupado} onClick={() => void salvarRascunho()}>Salvar rascunho</Button></>}
        {contrato.pdfCaminho && <ContratoPdfAcoes id={contrato.id} numero={contrato.numero} />}
      </div>
      <article className="mx-auto max-w-[800px] space-y-6 rounded-lg border border-border bg-background px-5 py-8 text-sm leading-relaxed shadow-sm sm:px-10">
        <header className="space-y-2 border-b border-border pb-5 text-center">{documento.cabecalho.map((linha, i) => <p key={i} className={i === 0 ? "text-xl font-bold" : "font-semibold"}>{linha}</p>)}</header>
        {documento.partes.map((parte) => <p key={parte}>{parte}</p>)}
        {documento.blocos.filter((bloco) => !bloco.anexo).map((bloco) => <section key={bloco.titulo} className="space-y-3"><h2 className="font-bold">{bloco.titulo}</h2>{bloco.paragrafos.map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>)}</section>)}
        <div className="space-y-5 pt-5">{documento.assinaturas.map((linha, i) => <p key={i} className={i > 1 ? "border-t border-border pt-2" : ""}>{linha}</p>)}</div>
        {documento.blocos.some((bloco) => bloco.anexo) && <div className="space-y-5 border-t-2 border-border pt-8">{documento.blocos.filter((bloco) => bloco.anexo).map((bloco) => <section key={bloco.titulo} className="space-y-2"><h2 className="font-bold">{bloco.titulo}</h2>{bloco.paragrafos.map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>)}</section>)}</div>}
      </article>
      {rascunho && conta.podeEditar && <div className="space-y-4 rounded-lg border border-border p-4"><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={conferido} onChange={(e) => setConferido(e.target.checked)} />Declaro que conferi os dados e autorizo a geração deste contrato.</label><Button type="button" disabled={!conferido || ocupado || pendencias.length > 0} onClick={() => void finalizar()}>{ocupado ? "Gerando…" : "GERAR PDF DO CONTRATO"}</Button><p className="text-xs text-muted-foreground">Após a geração, este rascunho deixa de ser editável. Confira os dados e consulte um profissional jurídico antes do uso comercial.</p></div>}
    </div>
  </PageShell>;
}
