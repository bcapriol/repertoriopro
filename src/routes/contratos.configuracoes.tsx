import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConta } from "@/lib/banda-local";
import { contratosConfigLer, contratosConfigSalvar } from "@/lib/nuvem.functions";
import { configInicial, type ConfigContratos, type Pessoa } from "@/lib/contratos";

export const Route = createFileRoute("/contratos/configuracoes")({ component: Configuracoes });
const campos: { key: keyof Pessoa; label: string }[] = [
  { key: "nome", label: "Nome / Razão Social da Banda" }, { key: "documento", label: "CPF/CNPJ" }, { key: "endereco", label: "Endereço" }, { key: "numero", label: "Número" }, { key: "complemento", label: "Complemento" }, { key: "bairro", label: "Bairro" }, { key: "cidade", label: "Cidade" }, { key: "estado", label: "Estado" }, { key: "cep", label: "CEP" }, { key: "telefone", label: "Telefone" }, { key: "email", label: "E-mail" },
];
function Configuracoes() {
  const { conta, pronto } = useConta();
  const ler = useServerFn(contratosConfigLer);
  const salvar = useServerFn(contratosConfigSalvar);
  const [config, setConfig] = useState<ConfigContratos>(configInicial);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    if (!pronto) return;
    let ativo = true;
    setCarregando(true);
    if (!conta?.podeEditar) { setCarregando(false); return; }
    ler({ data: { usuario: conta.usuario, senha: conta.senha } })
      .then((resultado) => { if (ativo) setConfig(resultado); })
      .catch((e) => { if (ativo) toast.error(e instanceof Error ? e.message : "Erro ao carregar configurações."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, conta?.usuario, conta?.senha, conta?.podeEditar]);
  const atualizar = (campo: keyof Pessoa, valor: string) => setConfig((c) => ({ ...c, contratado: { ...c.contratado, [campo]: valor } }));
  const enviar = async () => {
    if (!conta || ocupado) return;
    setOcupado(true);
    try { await salvar({ data: { usuario: conta.usuario, senha: conta.senha, config } }); toast.success("Configurações salvas."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar."); }
    finally { setOcupado(false); }
  };
  return <PageShell title="Configurações dos contratos" subtitle="Dados padrão para novos contratos" wide>
    {!pronto || carregando ? <p>Carregando…</p> : !conta?.podeEditar ? <EmptyState title="Acesso restrito" hint="Peça permissão de edição ao administrador." /> : <div className="space-y-6">
      <p className="rounded-lg border border-border bg-accent p-4 text-sm font-semibold">Este modelo contratual deve ser revisado por profissional jurídico antes de sua utilização comercial definitiva.</p>
      <section className="grid gap-4 sm:grid-cols-2"><h2 className="text-lg font-bold sm:col-span-2">Dados da contratada</h2>{campos.map(({ key, label }) => <label key={key} className="space-y-1 text-sm font-semibold">{label}<Input value={config.contratado[key]} onChange={(e) => atualizar(key, e.target.value)} /></label>)}</section>
      <section className="space-y-4"><h2 className="text-lg font-bold">Documento e cláusulas padrão</h2>
        <label className="block text-sm font-semibold">Logo (endereço da imagem)<Input value={config.logo} onChange={(e) => setConfig({ ...config, logo: e.target.value })} /></label>
        {([ ["dadosBancarios", "Dados bancários"], ["foro", "Foro"], ["rodape", "Rodapé"], ["condicoesPagamento", "Condições de pagamento padrão"], ["observacoesPadrao", "Observações padrão"], ["clausulaCancelamento", "Reserva de data e cancelamento"] ] as const).map(([key, label]) => <label key={key} className="block space-y-1 text-sm font-semibold">{label}<Textarea rows={key === "clausulaCancelamento" ? 12 : 3} value={config[key]} onChange={(e) => setConfig({ ...config, [key]: e.target.value })} /></label>)}
      </section><Button onClick={enviar} disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar configurações"}</Button>
    </div>}
  </PageShell>;
}
