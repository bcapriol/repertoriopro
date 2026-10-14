import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ContratoPdfAcoes } from "@/components/ContratoPdfAcoes";
import { ClausulasContrato } from "@/components/ClausulasContrato";
import { useConta } from "@/lib/banda-local";
import { contarRestricoes, dataAlteracaoContrato, redigirContrato } from "@/lib/contratos-documento";
import { temAnexoRepertorio, validarContrato, type ResumoContrato } from "@/lib/contratos";
import { contratosGerar, contratosListar, contratosNovaVersao, contratosSalvar } from "@/lib/nuvem.functions";

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
  const reabrir = useServerFn(contratosNovaVersao);
  const [contrato, setContrato] = useState<ResumoContrato | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [conferido, setConferido] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [clausulaPendente, setClausulaPendente] = useState(false);
  useEffect(() => {
    if (!pronto) return;
    let ativo = true;
    setCarregando(true); setContrato(null); setConferido(false); setAlterado(false);
    if (!conta || !id) { setCarregando(false); return; }
    listar({ data: { usuario: conta.usuario, senha: conta.senha } })
      .then((itens) => { if (ativo) setContrato(itens.find((item) => item.id === id) ?? null); })
      .catch((e) => { if (ativo) toast.error(e instanceof Error ? e.message : "Falha ao carregar contrato."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, id, conta?.usuario, conta?.senha]);
  useEffect(() => {
    if (!alterado && !clausulaPendente) return;
    const avisar = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado, clausulaPendente]);
  const pendencias = useMemo(() => contrato ? validarContrato(contrato.dados) : [], [contrato]);
  const documento = useMemo(() => contrato ? redigirContrato(contrato.dados, contrato.numero, contrato.pdfEmissao ?? new Date().toISOString().slice(0, 10)) : null, [contrato]);
  const atualizar = async () => {
    if (!conta) return;
    const atual = (await listar({ data: { usuario: conta.usuario, senha: conta.senha } })).find((c) => c.id === id);
    if (atual) setContrato(atual);
  };
  const gravar = async (finalizar = false) => {
    if (!conta?.podeEditar || !contrato || ocupado || (finalizar && (!conferido || pendencias.length))) return;
    if (clausulaPendente) { toast.error("Há uma cláusula adicional ainda não incluída. Clique em Adicionar cláusula ao contrato ou limpe os campos antes de salvar."); return; }
    setOcupado(true);
    try {
      if (alterado) {
        await salvar({ data: { usuario: conta.usuario, senha: conta.senha, id, dados: contrato.dados } });
        setAlterado(false);
      }
      if (finalizar) await gerar({ data: { usuario: conta.usuario, senha: conta.senha, id } });
      await atualizar();
      toast.success(finalizar ? "PDF gerado com as cláusulas revisadas." : "Alterações salvas.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar ou gerar o contrato."); }
    finally { setOcupado(false); }
  };
  const habilitarEdicao = async () => {
    if (!conta?.podeEditar || !contrato || ocupado) return;
    if (!window.confirm("Reabrir para edição? O contrato voltará a rascunho. Se já houver PDF, ele será preservado no histórico e uma nova versão será criada.")) return;
    setOcupado(true);
    try {
      await reabrir({ data: { usuario: conta.usuario, senha: conta.senha, id } });
      await atualizar(); setConferido(false);
      toast.success("Edição liberada. Revise os dados e as cláusulas antes de gerar o novo PDF.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível reabrir o contrato."); }
    finally { setOcupado(false); }
  };
  if (!pronto || carregando) return <PageShell title="Revisão do contrato"><p>Carregando…</p></PageShell>;
  if (!conta || !contrato || !documento) return <PageShell title="Revisão do contrato"><EmptyState title="Contrato não encontrado" hint="Volte à lista para selecionar um contrato da sua banda." /></PageShell>;
  const rascunho = ["Rascunho", "Aguardando revisão"].includes(contrato.status) && !contrato.pdfCaminho;
  const editavel = rascunho && conta.podeEditar;
  const sair = (evento: { preventDefault: () => void }) => { if ((alterado || clausulaPendente) && !window.confirm("Sair sem salvar as alterações nas cláusulas?")) evento.preventDefault(); };
  return <PageShell title={`Revisão · ${contrato.numero}`} subtitle={`Versão ${contrato.versao} · ${contrato.status}`} wide>
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/contratos" onClick={sair} className="text-sm text-primary underline">Voltar aos contratos</Link>
        <Link to="/contratos/historico" search={{ id }} onClick={sair} className="text-sm text-primary underline">Histórico e versões</Link>
        {editavel && <Button asChild variant="outline" disabled={ocupado}><Link to="/contratos/editar" search={{ id }} onClick={sair}>Editar dados do contrato</Link></Button>}
        {!rascunho && conta.podeEditar && <Button variant="outline" disabled={ocupado} onClick={() => void habilitarEdicao()}>Rever e editar contrato</Button>}
        {contrato.pdfCaminho && <ContratoPdfAcoes id={id} numero={contrato.numero} />}
      </div>
      <section className="space-y-2 rounded-lg border border-border bg-muted p-4 text-sm">
        <h2 className="font-bold">Confira antes de gerar o arquivo</h2>
        <p>Contratante: {contrato.dados.contratante.nome || "Não informado"} · Evento: {contrato.dados.nomeEvento || "Não informado"}</p>
        <p>{temAnexoRepertorio(contrato.dados) ? `Com Anexo I — ${contrato.dados.repertorio.length} música(s) selecionada(s)` : "Sem Anexo I — a lista de músicas não será incluída no PDF"} · {contarRestricoes(contrato.dados.musicasVetadas)} músicas vetadas · {contarRestricoes(contrato.dados.artistasVetados)} artistas vetados</p>
        <p>Todas as cláusulas estão abaixo. O próximo PDF gerado usará o texto e a numeração desta revisão. Para consultar o documento já emitido, use “Visualizar PDF”.</p>
        {!rascunho && conta.podeEditar && <p>Use “Rever e editar contrato” para alterar qualquer contrato, inclusive enviado, aceito, cancelado ou concluído. Documentos já emitidos permanecem no histórico; a nova versão precisará ser revisada e enviada novamente.</p>}
        {alterado && <p role="status" className="font-semibold">Há alterações não salvas. Salve antes de sair desta página.</p>}
      </section>
      {pendencias.length > 0 && <section role="alert" className="rounded-lg border border-destructive p-4 text-sm"><h2 className="font-bold">Pendências para gerar o contrato</h2><ul className="list-disc pl-5">{pendencias.map((p) => <li key={p}>{p}</li>)}</ul></section>}
      <article className="space-y-6 rounded-lg border border-border bg-background p-4 text-sm text-foreground sm:p-6">
        <header className="space-y-2 text-center">{documento.cabecalho.map((linha, i) => <p key={i} className={i === 0 ? "text-lg font-bold" : "font-semibold"}>{linha}</p>)}</header>
        <section className="space-y-3">{documento.partes.map((parte, i) => <p key={i}>{parte}</p>)}</section>
        <ClausulasContrato key={id} blocos={documento.blocos} valor={contrato.dados.clausulas} editavel={editavel && !ocupado} onPendingChange={setClausulaPendente} onChange={(clausulas) => {
          setContrato({ ...contrato, dados: { ...contrato.dados, clausulas } });
          setAlterado(true); setConferido(false);
        }} />
        <section className="space-y-4 border-t border-border pt-4">{documento.assinaturas.map((linha, i) => <p key={i} className={i > 1 ? "pt-8 font-semibold" : ""}>{linha}</p>)}</section>
        {documento.blocos.filter((b) => b.anexo).map((bloco, i) => <section key={i} className="space-y-3 border-t border-border pt-4"><h2 className="font-bold">{bloco.titulo}</h2>{bloco.paragrafos.map((texto, p) => <p key={p} className="whitespace-pre-wrap">{texto}</p>)}</section>)}
        <footer className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>{contrato.dados.configSnapshot?.rodape || "Banda Multivibe · Contrato de prestação de serviços"}</p>
          {dataAlteracaoContrato(contrato.dados) && <p>Última alteração: {dataAlteracaoContrato(contrato.dados)}</p>}
          {alterado && <p>A data da alteração será atualizada ao salvar.</p>}
          <p>O PDF terá “Página X de Y” e a data de alteração em todas as páginas, quando houver alterações salvas. A paginação é calculada ao gerar o arquivo.</p>
        </footer>
      </article>
      {editavel && <section className="space-y-4 rounded-lg border border-border p-4">
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={conferido} disabled={ocupado} onChange={(e) => setConferido(e.target.checked)} />Revisei os dados, todas as cláusulas e o repertório e confirmo a geração do PDF.</label>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={ocupado || !alterado} onClick={() => void gravar()}>{ocupado ? "Aguarde…" : "Salvar alterações"}</Button>
          <Button disabled={ocupado || !conferido || pendencias.length > 0} onClick={() => void gravar(true)}>{ocupado ? "Aguarde…" : "Salvar e gerar PDF"}</Button>
        </div>
      </section>}
    </div>
  </PageShell>;
}
