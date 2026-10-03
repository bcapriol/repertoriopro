import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConta } from "@/lib/banda-local";
import { contratosListar, contratosStatus } from "@/lib/nuvem.functions";
import { STATUS_CONTRATO, TIPOS_EVENTO, TRANSICOES_CONTRATO, type ResumoContrato, type StatusContrato } from "@/lib/contratos";

export const Route = createFileRoute("/contratos/")({ component: Contratos });
const moeda = (v?: string) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const campo = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";
function Contratos() {
  const { conta, pronto } = useConta();
  const listar = useServerFn(contratosListar);
  const alterar = useServerFn(contratosStatus);
  const [itens, setItens] = useState<ResumoContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  useEffect(() => {
    if (!pronto) return;
    let ativo = true;
    setItens([]);
    setCarregando(true);
    if (!conta) { setCarregando(false); return; }
    listar({ data: { usuario: conta.usuario, senha: conta.senha } })
      .then((resultado) => { if (ativo) setItens(resultado); })
      .catch((e) => { if (ativo) toast.error(e instanceof Error ? e.message : "Falha ao carregar contratos."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, conta?.usuario, conta?.senha]);
  const filtrados = useMemo(() => itens.filter((i) => {
    const texto = `${i.numero} ${i.dados?.contratante?.nome ?? ""} ${i.dados?.contratante?.documento ?? ""}`.toLocaleLowerCase("pt-BR");
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const documento = (i.dados?.contratante?.documento ?? "").replace(/\D/g, "");
    return (!termo || texto.includes(termo) || (!!termo.replace(/\D/g, "") && documento.includes(termo.replace(/\D/g, ""))))
      && (!tipo || i.dados?.tipoEvento === tipo) && (!status || i.status === status)
      && (!de || i.criadoEm.slice(0, 10) >= de) && (!ate || i.criadoEm.slice(0, 10) <= ate)
      && (!dataEvento || i.dados?.dataEvento === dataEvento);
  }), [itens, busca, tipo, status, de, ate, dataEvento]);
  const mudarStatus = async (item: ResumoContrato, destino: StatusContrato) => {
    if (!conta?.podeEditar || ocupado) return;
    if (destino === "Cancelado" && !window.confirm(`Cancelar o contrato ${item.numero}? O histórico será preservado.`)) return;
    setOcupado(item.id);
    try {
      await alterar({ data: { usuario: conta.usuario, senha: conta.senha, id: item.id, status: destino } });
      setItens(await listar({ data: { usuario: conta.usuario, senha: conta.senha } }));
      toast.success(`Contrato atualizado: ${destino}.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível alterar o status."); }
    finally { setOcupado(null); }
  };
  return <PageShell title="Contratos de Eventos" subtitle="Contratos de Prestação de Serviços — Banda Multivibe" wide action={conta?.podeEditar ? <Button asChild><Link to="/contratos/editar" search={{ id: undefined }}>Novo contrato</Link></Button> : null}>
    {!pronto || carregando ? <p>Carregando…</p> : !conta ? <EmptyState title="Acesso restrito" hint="Faça login para consultar os contratos da banda." /> : <div className="space-y-4">
      {conta.podeEditar && <Link to="/contratos/configuracoes" className="text-sm font-semibold text-primary underline">Configurações dos contratos</Link>}
      <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold">Buscar nome, CPF/CNPJ ou número<Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar contratos" /></label>
        <label className="text-sm font-semibold">Tipo de evento<select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos</option>{TIPOS_EVENTO.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="text-sm font-semibold">Status<select className={campo} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{STATUS_CONTRATO.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="text-sm font-semibold">Criado a partir de<Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="text-sm font-semibold">Criado até<Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <label className="text-sm font-semibold">Data do evento<Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} /></label>
      </div>
      <p className="text-sm text-muted-foreground">{filtrados.length} de {itens.length} contratos</p>
      {!itens.length ? <EmptyState title="Nenhum contrato cadastrado" hint="Crie um novo contrato para começar." /> : !filtrados.length ? <EmptyState title="Nenhum resultado" hint="Ajuste os filtros para encontrar contratos." /> : <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-muted"><tr>{["Número / versão", "Contratante", "Tipo de evento", "Data do evento", "Valor", "Status", "Criado em", "Responsável", "Ações"].map((h) => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{filtrados.map((i) => <tr key={i.id} className="border-t border-border"><td className="p-3">{i.numero} · v{i.versao}</td><td className="p-3">{i.dados?.contratante?.nome || "—"}</td><td className="p-3">{i.dados?.tipoEvento || "—"}</td><td className="p-3">{i.dados?.dataEvento || "—"}</td><td className="p-3">{moeda(i.dados?.valorTotal)}</td><td className="p-3">{i.status}</td><td className="p-3">{new Date(i.criadoEm).toLocaleDateString("pt-BR")}</td><td className="p-3">{i.responsavel}</td><td className="p-3"><div className="flex flex-col items-start gap-2">{["Rascunho", "Aguardando revisão"].includes(i.status) && conta.podeEditar && <Link to="/contratos/editar" search={{ id: i.id }} className="text-primary underline">Continuar</Link>}<Link to="/contratos/revisar" search={{ id: i.id }} className="text-primary underline">{i.pdfCaminho ? "Ver contrato / PDF" : "Revisar"}</Link><Link to="/contratos/historico" search={{ id: i.id }} className="text-primary underline">Histórico e versões</Link>{conta.podeEditar && (TRANSICOES_CONTRATO[i.status as StatusContrato] ?? []).map((destino) => <button key={destino} type="button" disabled={!!ocupado} onClick={() => void mudarStatus(i, destino)} className="text-left text-primary underline disabled:opacity-50">Marcar como {destino}</button>)}</div></td></tr>)}</tbody></table></div>}
    </div>}
  </PageShell>;
}
