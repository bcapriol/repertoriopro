import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useConta } from "@/lib/banda-local";
import { contratosListar } from "@/lib/nuvem.functions";
import type { ResumoContrato } from "@/lib/contratos";

export const Route = createFileRoute("/contratos/")({ component: Contratos });
const moeda = (v?: string) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function Contratos() {
  const { conta, pronto } = useConta();
  const listar = useServerFn(contratosListar);
  const [itens, setItens] = useState<ResumoContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
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
  return <PageShell title="Contratos de Eventos" subtitle="Contratos de Prestação de Serviços — Banda Multivibe" wide action={conta?.podeEditar ? <Button asChild><Link to="/contratos/editar" search={{ id: undefined }}>Novo contrato</Link></Button> : null}>
    {!pronto || carregando ? <p>Carregando…</p> : !conta ? <EmptyState title="Acesso restrito" hint="Faça login para consultar os contratos da banda." /> : <div className="space-y-4">
      {conta.podeEditar && <Link to="/contratos/configuracoes" className="text-sm font-semibold text-primary underline">Configurações dos contratos</Link>}
      {!itens.length ? <EmptyState title="Nenhum contrato cadastrado" hint="Crie um novo contrato para começar." /> : <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-muted"><tr>{["Número", "Contratante", "Tipo", "Data do evento", "Valor", "Status", "Criado em", "Ações"].map((h) => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{itens.map((i) => <tr key={i.id} className="border-t border-border"><td className="p-3">{i.numero}</td><td className="p-3">{i.dados?.contratante?.nome || "—"}</td><td className="p-3">{i.dados?.tipoEvento || "—"}</td><td className="p-3">{i.dados?.dataEvento || "—"}</td><td className="p-3">{moeda(i.dados?.valorTotal)}</td><td className="p-3">{i.status}</td><td className="p-3">{new Date(i.criadoEm).toLocaleDateString("pt-BR")}</td><td className="p-3"><div className="flex flex-wrap gap-2">{i.status === "Rascunho" && conta.podeEditar && <Link to="/contratos/editar" search={{ id: i.id }} className="text-primary underline">Continuar</Link>}<Link to="/contratos/revisar" search={{ id: i.id }} className="text-primary underline">{i.pdfCaminho ? "Ver PDF / contrato" : "Revisar"}</Link></div></td></tr>)}</tbody></table></div>}
    </div>}
  </PageShell>;
}
