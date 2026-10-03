import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConta } from "@/lib/banda-local";
import { useAppData } from "@/lib/repertorio-store";
import { contratosListar, contratosNovo, contratosSalvar } from "@/lib/nuvem.functions";
import { FINALIDADES, MOMENTOS, PAGAMENTOS, SERVICOS, TIPOS_EVENTO, validarContrato, type ContratoDados, type Pessoa, type MusicaContrato } from "@/lib/contratos";

export const Route = createFileRoute("/contratos/editar")({
  validateSearch: (search: Record<string, unknown>) => ({ id: typeof search.id === "string" ? search.id : undefined }),
  component: EditarContrato,
});
type Chave = keyof ContratoDados;
const pessoaCampos: { key: keyof Pessoa; label: string }[] = [
  { key: "nome", label: "Nome completo / Razão Social" }, { key: "documento", label: "CPF/CNPJ" },
  { key: "endereco", label: "Endereço" }, { key: "numero", label: "Número" }, { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" }, { key: "cidade", label: "Cidade" }, { key: "estado", label: "Estado" },
  { key: "cep", label: "CEP" }, { key: "telefone", label: "Telefone" }, { key: "email", label: "E-mail" },
];
const opcao = (itens: readonly string[]) => <>{itens.map((v) => <option key={v} value={v}>{v}</option>)}</>;
const estiloCampo = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";
function EditarContrato() {
  const { id } = Route.useSearch();
  const { conta, pronto } = useConta();
  const { data: biblioteca } = useAppData();
  const listar = useServerFn(contratosListar);
  const novo = useServerFn(contratosNovo);
  const salvar = useServerFn(contratosSalvar);
  const [dados, setDados] = useState<ContratoDados | null>(null);
  const [numero, setNumero] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState("");
  const [abrirMusicas, setAbrirMusicas] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  useEffect(() => {
    if (!pronto) return;
    let ativo = true;
    setCarregando(true);
    setDados(null);
    setNumero("");
    if (!conta?.podeEditar) { setCarregando(false); return; }
    const cred = { usuario: conta.usuario, senha: conta.senha };
    const carregar = async () => {
      if (id) {
        const contrato = (await listar({ data: cred })).find((c) => c.id === id);
        if (!contrato || contrato.status !== "Rascunho") throw new Error("Rascunho não encontrado ou não editável.");
        if (ativo) { setNumero(contrato.numero); setDados(contrato.dados); }
      } else {
        const inicial = await novo({ data: cred });
        if (ativo) setDados(inicial);
      }
    };
    carregar().catch((e) => { if (ativo) toast.error(e instanceof Error ? e.message : "Falha ao carregar contrato."); }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, id, conta?.usuario, conta?.senha, conta?.podeEditar]);
  const mudar = (key: Chave, value: string) => setDados((d) => d ? { ...d, [key]: value, ...(key === "autorizacaoImagem" && value !== "AUTORIZO" ? { finalidades: [] } : {}) } : d);
  const mudarPessoa = (tipo: "contratante" | "contratado", key: keyof Pessoa, value: string) => setDados((d) => d ? { ...d, [tipo]: { ...d[tipo], [key]: value } } : d);
  const alternar = (key: "servicos" | "finalidades", value: string) => setDados((d) => d ? { ...d, [key]: d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value] } : d);
  const campo = (key: Chave, label: string, type = "text") => <label className="block space-y-1 text-sm font-semibold">{label}<Input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? (key === "equipeAlimentacao" || key === "parcelas" ? "1" : "0.01") : undefined} value={String(dados?.[key] ?? "")} onChange={(e) => mudar(key, e.target.value)} /></label>;
  const texto = (key: Chave, label: string) => <label className="block space-y-1 text-sm font-semibold">{label}<Textarea value={String(dados?.[key] ?? "")} onChange={(e) => mudar(key, e.target.value)} /></label>;
  const selecao = (key: Chave, label: string, items: readonly string[]) => <label className="block space-y-1 text-sm font-semibold">{label}<select className={estiloCampo} value={String(dados?.[key] ?? "")} onChange={(e) => mudar(key, e.target.value)}><option value="">Selecione</option>{opcao(items)}</select></label>;
  const pessoa = (tipo: "contratante" | "contratado") => <div className="grid gap-3 sm:grid-cols-2">{pessoaCampos.map(({ key, label }) => <label key={key} className="block space-y-1 text-sm font-semibold">{label}<Input value={dados?.[tipo][key] ?? ""} onChange={(e) => mudarPessoa(tipo, key, e.target.value)} /></label>)}</div>;
  const filtradas = useMemo(() => biblioteca.songs.filter((s) => (!lista || biblioteca.setlists.find((r) => r.id === lista)?.songIds.includes(s.id)) && `${s.titulo} ${s.artista}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))), [biblioteca, busca, lista]);
  const adicionar = (s: typeof biblioteca.songs[number]) => setDados((d) => d && !d.repertorio.some((m) => m.idOriginal === s.id) ? { ...d, repertorio: [...d.repertorio, { idOriginal: s.id, titulo: s.titulo, artista: s.artista, ordem: d.repertorio.length + 1, momento: "", observacao: "" }] } : d);
  const mudarMusica = (i: number, changes: Partial<MusicaContrato>) => setDados((d) => d ? { ...d, repertorio: d.repertorio.map((m, index) => index === i ? { ...m, ...changes } : m) } : d);
  const mover = (i: number, direction: number) => setDados((d) => { if (!d || i + direction < 0 || i + direction >= d.repertorio.length) return d; const arr = [...d.repertorio]; const atual = arr[i], vizinha = arr[i + direction]; if (!atual || !vizinha) return d; arr[i] = vizinha; arr[i + direction] = atual; return { ...d, repertorio: arr.map((m, index) => ({ ...m, ordem: index + 1 })) }; });
  const remover = (i: number) => setDados((d) => d ? { ...d, repertorio: d.repertorio.filter((_, index) => index !== i).map((m, index) => ({ ...m, ordem: index + 1 })) } : d);
  const gravar = async () => {
    if (!dados || !conta || ocupado) return;
    setOcupado(true);
    try {
      const salvo = await salvar({ data: { usuario: conta.usuario, senha: conta.senha, dados, ...(id ? { id } : {}) } });
      setNumero(salvo.numero); toast.success("Rascunho salvo. Número: " + salvo.numero);
      window.location.assign(`/contratos/editar?id=${encodeURIComponent(salvo.id)}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar contrato."); }
    finally { setOcupado(false); }
  };
  if (!pronto || carregando) return <PageShell title="Contrato de Eventos"><p>Carregando…</p></PageShell>;
  if (!conta?.podeEditar || !dados) return <PageShell title="Contrato de Eventos"><EmptyState title="Acesso restrito" hint="É necessária permissão de edição e um rascunho válido." /></PageShell>;
  return <PageShell title={numero ? `Contrato ${numero}` : "Novo Contrato"} subtitle="Preencha os dados e salve um rascunho" wide>
    <div className="space-y-8 pb-10">
      <Link to="/contratos" className="text-sm text-primary underline">Voltar à lista</Link>
      <section className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"><h2 className="text-lg font-bold sm:col-span-2">Evento e contratante</h2>
        {selecao("tipoEvento", "Tipo de evento *", TIPOS_EVENTO)}{selecao("tipoPessoa", "Tipo de contratante *", ["Pessoa Física", "Pessoa Jurídica"])}
        <div className="sm:col-span-2">{pessoa("contratante")}</div>
        {dados.tipoPessoa === "Pessoa Jurídica" && <>{campo("representante", "Nome do representante legal")}{campo("cpfRepresentante", "CPF do representante")}{campo("cargoRepresentante", "Cargo/função")}</>}
      </section>
      <section className="space-y-3 rounded-lg border border-border p-4"><h2 className="text-lg font-bold">Contratado — confira os dados da Banda</h2>{pessoa("contratado")}</section>
      <section className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"><h2 className="text-lg font-bold sm:col-span-2">Dados do evento</h2>
        {campo("nomeEvento", "Nome do evento *")}{campo("dataEvento", "Data prevista *", "date")}{campo("localEvento", "Local do evento *")}{campo("enderecoEvento", "Endereço do evento *")}{campo("horaEvento", "Horário previsto do evento *", "time")}{campo("horaInicio", "Início da atividade *", "time")}{campo("horaFim", "Término da atividade *", "time")}
        <div className="sm:col-span-2">{texto("estilo", "Estilo / características do evento")}</div>
      </section>
      <section className="space-y-3 rounded-lg border border-border p-4"><h2 className="text-lg font-bold">Modalidade de contrato *</h2>
        <div className="grid gap-2 sm:grid-cols-2">{SERVICOS.map((s) => <label key={s} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dados.servicos.includes(s)} onChange={() => alternar("servicos", s)} />{s}</label>)}</div>
        {selecao("removerAntes", "É possível remover equipamentos antes do término? *", ["Sim", "Não"])}
      </section>
      <section className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"><h2 className="text-lg font-bold sm:col-span-2">Montagem, equipe e alimentação</h2>
        {selecao("montagem", "Quando deverá ser realizada a montagem? *", ["No dia do evento", "Dia anterior", "Na semana"])}
        {campo("horaMontagem", "Horário previsto para montagem", "time")}{campo("localMontagem", "Local para montagem")}
        <div className="sm:col-span-2">{texto("observacoesMontagem", "Observações sobre montagem")}</div>
        {campo("equipeAlimentacao", "Quantidade de pessoas da equipe", "number")}
        <div className="sm:col-span-2">{texto("observacoesAlimentacao", "Observações sobre alimentação e bebidas")}</div>
      </section>
      <section className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"><h2 className="text-lg font-bold sm:col-span-2">Valores e condições de pagamento</h2>
        {campo("valorTotal", "Valor total (R$) *", "number")}{campo("valorReserva", "Valor da reserva (R$) *", "number")}
        <p className="sm:col-span-2 text-sm font-semibold">Valor restante: {Math.max(0, Number(dados.valorTotal || 0) - Number(dados.valorReserva || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        {campo("dataReserva", "Data do pagamento da reserva", "date")}{campo("dataSaldo", "Data prevista para pagamento do saldo", "date")}
        {selecao("pagamento", "Condição de pagamento *", PAGAMENTOS)}
        {dados.pagamento === "Parcelado" && <>{campo("parcelas", "Número de parcelas", "number")}{campo("valorParcela", "Valor de cada parcela do saldo (R$)", "number")}<div className="sm:col-span-2">{texto("vencimentos", "Vencimentos das parcelas (AAAA-MM-DD, um por linha)")}</div></>}
        {dados.pagamento === "Outra condição" && texto("outraCondicao", "Descrição da condição de pagamento")}
        {selecao("alteraData", "Permite alteração da data do evento? *", ["Sim", "Não"])}
      </section>
      <section className="space-y-3 rounded-lg border border-border p-4"><h2 className="text-lg font-bold">Autorização para uso de imagem</h2>
        {selecao("autorizacaoImagem", "A contratante autoriza o uso de imagem? *", ["AUTORIZO", "NÃO AUTORIZO"])}
        {dados.autorizacaoImagem === "AUTORIZO" && <div className="grid gap-2 sm:grid-cols-2">{FINALIDADES.map((f) => <label key={f} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dados.finalidades.includes(f)} onChange={() => alternar("finalidades", f)} />{f}</label>)}</div>}
        {texto("observacoes", "Observações e condições especiais")}
      </section>
      <section className="space-y-4 rounded-lg border border-border p-4"><h2 className="text-lg font-bold">Anexo I — Repertório escolhido</h2>
        <p className="text-sm text-muted-foreground">Seleção da biblioteca existente neste aparelho. O título e artista são registrados no rascunho para preservar o histórico.</p>
        <Button type="button" variant="outline" onClick={() => setAbrirMusicas(!abrirMusicas)}>SELECIONAR REPERTÓRIO</Button>
        {abrirMusicas && <div className="space-y-3 rounded-lg border border-border p-3"><Input placeholder="Pesquisar música ou artista" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className={estiloCampo} value={lista} onChange={(e) => setLista(e.target.value)}><option value="">Todas as categorias / repertórios</option>{biblioteca.setlists.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          <div className="max-h-64 space-y-2 overflow-y-auto">{filtradas.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhuma música encontrada. Confira a busca ou sincronize a biblioteca da banda na página inicial.</p>}{filtradas.map((s) => <div key={s.id} className="flex items-center justify-between gap-2 border-b border-border py-1 text-sm"><span>{s.titulo} — {s.artista}</span><Button size="sm" variant="outline" type="button" disabled={dados.repertorio.some((m) => m.idOriginal === s.id)} onClick={() => adicionar(s)}>Selecionar</Button></div>)}</div>
        </div>}
        <p className="font-semibold">{dados.repertorio.length} música(s) selecionada(s)</p>
        {dados.repertorio.map((m, i) => <div key={`${m.idOriginal}-${i}`} className="space-y-2 rounded-lg border border-border p-3 text-sm"><p className="font-semibold">{String(i + 1).padStart(2, "0")}. {m.titulo} — {m.artista}</p>
          <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => mover(i, -1)}>Subir</Button><Button type="button" size="sm" variant="outline" disabled={i === dados.repertorio.length - 1} onClick={() => mover(i, 1)}>Descer</Button><Button type="button" size="sm" variant="outline" onClick={() => remover(i)}>Remover</Button></div>
          <select className={estiloCampo} value={m.momento} onChange={(e) => mudarMusica(i, { momento: e.target.value })}><option value="">Sem momento especial</option>{opcao(MOMENTOS)}</select>
          <Input placeholder="Observação da música" value={m.observacao} onChange={(e) => mudarMusica(i, { observacao: e.target.value })} /></div>)}
        {texto("musicasVetadas", "Músicas que não deverão ser tocadas (uma por linha)")}
        {texto("artistasVetados", "Artistas/cantores que não deverão ser tocados (um por linha)")}
        {texto("observacoesRepertorio", "Observações especiais sobre o repertório")}
      </section>
      <div className="flex flex-wrap gap-3"><Button onClick={gravar} disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar rascunho"}</Button><Button type="button" variant="outline" onClick={() => { const problemas = validarContrato(dados); setErros(problemas); if (!problemas.length) toast.success("Dados completos para a etapa de revisão, disponível na próxima fase."); }}>{"Verificar dados"}</Button></div>
      {erros.length > 0 && <div role="alert" className="rounded-lg border border-destructive p-4 text-sm"><p className="font-bold">Pendências para gerar o contrato:</p><ul className="mt-2 list-disc pl-5">{erros.map((e) => <li key={e}>{e}</li>)}</ul></div>}
    </div>
  </PageShell>;
}
