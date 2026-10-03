import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageShell } from "@/components/PageShell";
import { ContratoPdfAcoes } from "@/components/ContratoPdfAcoes";
import { Button } from "@/components/ui/button";
import { useConta } from "@/lib/banda-local";
import { contratosHistorico, contratosListar, contratosNovaVersao } from "@/lib/nuvem.functions";
import type { HistoricoContrato, ResumoContrato, VersaoContrato } from "@/lib/contratos";

export const Route = createFileRoute("/contratos/historico")({
  validateSearch: (search: Record<string, unknown>) => ({ id: typeof search.id === "string" ? search.id : "" }),
  component: Historico,
});
function Historico() {
  const { id } = Route.useSearch();
  const { conta, pronto } = useConta();
  const listar = useServerFn(contratosListar);
  const consultar = useServerFn(contratosHistorico);
  const nova = useServerFn(contratosNovaVersao);
  const [contrato, setContrato] = useState<ResumoContrato | null>(null);
  const [versoes, setVersoes] = useState<VersaoContrato[]>([]);
  const [alteracoes, setAlteracoes] = useState<HistoricoContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    if (!pronto) return;
    let ativo = true;
    setCarregando(true);
    if (!conta || !id) { setCarregando(false); return; }
    const cred = { usuario: conta.usuario, senha: conta.senha };
    Promise.all([listar({ data: cred }), consultar({ data: { ...cred, id } })])
      .then(([itens, historico]) => { if (ativo) { setContrato(itens.find((i) => i.id === id) ?? null); setVersoes(historico.versoes); setAlteracoes(historico.historico); } })
      .catch((e) => { if (ativo) toast.error(e instanceof Error ? e.message : "Não foi possível carregar o histórico."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, conta?.usuario, conta?.senha, id]);
  const iniciar = async () => {
    if (!conta?.podeEditar || !contrato || ocupado || !window.confirm("Criar nova versão? O PDF aceito permanecerá no histórico e a nova versão começará como rascunho.")) return;
    setOcupado(true);
    try {
      await nova({ data: { usuario: conta.usuario, senha: conta.senha, id: contrato.id } });
      window.location.assign(`/contratos/editar?id=${encodeURIComponent(contrato.id)}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível iniciar a nova versão."); setOcupado(false); }
  };
  return <PageShell title={contrato ? `Histórico · ${contrato.numero}` : "Histórico de contratos"} subtitle="Versões e documentos preservados" wide>
    <div className="space-y-6 pb-10"><Link to="/contratos" className="text-sm text-primary underline">Voltar aos contratos</Link>
      {!pronto || carregando ? <p>Carregando…</p> : !contrato ? <EmptyState title="Contrato não encontrado" hint="Selecione um contrato da sua banda na listagem." /> : <>
        <div className="rounded-lg border border-border p-4"><p className="font-bold">{contrato.numero} · versão atual {contrato.versao} · {contrato.status}</p><p className="text-sm">{contrato.dados.contratante.nome} · {contrato.dados.nomeEvento}</p>
          {conta?.podeEditar && contrato.status === "Aceito" && <Button type="button" className="mt-4" disabled={ocupado} onClick={() => void iniciar()}>Criar nova versão</Button>}
          {["Rascunho", "Aguardando revisão"].includes(contrato.status) && conta?.podeEditar && <Button asChild variant="outline" className="mt-4"><Link to="/contratos/editar" search={{ id: contrato.id }}>Editar versão atual</Link></Button>}
        </div>
        <section className="space-y-3"><h2 className="text-lg font-bold">Documentos emitidos</h2>{!versoes.length && <p className="text-sm text-muted-foreground">Nenhum PDF emitido ainda.</p>}
          {versoes.map((v) => <div key={v.versao} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><div><p className="font-bold">Versão {v.versao} · emitida em {v.pdfEmissao}</p><p className="text-sm">{v.dados.contratante.nome} · {v.dados.nomeEvento} · {v.dados.dataEvento}</p><p className="text-xs text-muted-foreground">Repertório preservado: {v.dados.repertorio?.length ?? 0} músicas</p></div><ContratoPdfAcoes id={contrato.id} numero={contrato.numero} versao={v.versao} /></div>)}
        </section>
        <section className="space-y-3"><h2 className="text-lg font-bold">Alterações de status</h2>{!alteracoes.length && <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>}
          <ul className="space-y-2">{alteracoes.map((a, i) => <li key={`${a.criadoEm}-${i}`} className="rounded-lg border border-border p-3 text-sm">{new Date(a.criadoEm).toLocaleString("pt-BR")} · {a.usuario} · v{a.versao}: {a.anterior} → {a.novo}</li>)}</ul>
        </section>
      </>}
    </div>
  </PageShell>;
}
