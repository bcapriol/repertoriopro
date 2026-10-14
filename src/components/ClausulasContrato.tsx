import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClausulaContrato, EdicaoClausulas, TrechoClausula } from "@/lib/contratos";
import type { BlocoContrato, LinhaClausula } from "@/lib/contratos-documento";

const tipos = { texto: "Texto livre", artigo: "Artigo", paragrafo: "Parágrafo", item: "Item" } as const;
const vazio = (): EdicaoClausulas => ({ personalizadas: {}, removidas: [], adicionais: [] });
const novoTrecho = (tipo: TrechoClausula["tipo"]): TrechoClausula => ({ id: crypto.randomUUID(), tipo, texto: "" });

function TrechosEditor({ trechos, linhas, onChange, nivel = 0 }: { trechos: TrechoClausula[]; linhas: LinhaClausula[]; onChange: (valor: TrechoClausula[]) => void; nivel?: number }) {
  const mudar = (id: string, valor: Partial<TrechoClausula>) => onChange(trechos.map((t) => t.id === id ? { ...t, ...valor } : t));
  const mover = (i: number, direcao: number) => {
    const copia = [...trechos];
    const a = copia[i], b = copia[i + direcao];
    if (!a || !b) return;
    copia[i] = b; copia[i + direcao] = a; onChange(copia);
  };
  return <div className="space-y-3">
    {trechos.map((t, i) => <div key={t.id} className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{linhas.find((l) => l.id === t.id)?.rotulo || `Texto ${i + 1}`}</span>
        <select aria-label="Tipo do trecho" className="rounded-md border border-input bg-background p-2 text-sm" value={t.tipo} onChange={(e) => mudar(t.id, { tipo: e.target.value as TrechoClausula["tipo"] })}>{Object.entries(tipos).map(([tipo, nome]) => <option key={tipo} value={tipo}>{nome}</option>)}</select>
        <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => mover(i, -1)}>Subir</Button>
        <Button type="button" size="sm" variant="outline" disabled={i === trechos.length - 1} onClick={() => mover(i, 1)}>Descer</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { if (window.confirm("Remover este trecho e seus subitens?")) onChange(trechos.filter((v) => v.id !== t.id)); }}>Remover trecho</Button>
      </div>
      <Textarea aria-label={`Conteúdo: ${tipos[t.tipo]}`} rows={4} value={t.texto} onChange={(e) => mudar(t.id, { texto: e.target.value })} placeholder="Digite o conteúdo sem numeração" />
      {nivel < 3 && <div className="border-l-2 border-border pl-2"><TrechosEditor trechos={t.filhos ?? []} linhas={linhas} nivel={nivel + 1} onChange={(filhos) => mudar(t.id, { filhos })} /></div>}
    </div>)}
    <div className="flex flex-wrap gap-2">{(Object.keys(tipos) as TrechoClausula["tipo"][]).filter((tipo) => nivel === 0 || tipo !== "artigo").map((tipo) => <Button key={tipo} type="button" size="sm" variant="outline" onClick={() => onChange([...trechos, novoTrecho(tipo)])}>+ {nivel ? "Subtrecho: " : ""}{tipos[tipo]}</Button>)}</div>
  </div>;
}

function ClausulaEditor({ bloco, editavel, personalizada, onChange, onRemove, onRestore }: { bloco: BlocoContrato; editavel: boolean; personalizada: boolean; onChange: (valor: ClausulaContrato) => void; onRemove: () => void; onRestore: () => void }) {
  const [aberta, setAberta] = useState(false);
  const clausula = bloco.clausula!;
  return <section className="space-y-3 rounded-lg border border-border p-4">
    <h2 className="font-bold">{bloco.titulo}</h2>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={!editavel} onClick={() => setAberta(!aberta)}>{aberta ? "Concluir edição" : "Editar cláusula"}</Button>
      <Button type="button" size="sm" variant="outline" disabled={!editavel} onClick={() => { if (window.confirm(`Remover ${bloco.titulo}? A numeração será ajustada.`)) onRemove(); }}>Remover cláusula</Button>
      {personalizada && <Button type="button" size="sm" variant="outline" disabled={!editavel} onClick={() => { if (window.confirm("Descartar a personalização e usar o texto automático com os dados atuais?")) { onRestore(); setAberta(false); } }}>Restaurar texto automático</Button>}
    </div>
    {aberta && editavel ? <div className="space-y-4">
      <label className="block space-y-1 font-semibold">Título (sem número)<Input value={clausula.titulo} onChange={(e) => onChange({ ...clausula, titulo: e.target.value })} /></label>
      <p className="text-xs text-muted-foreground">O texto personalizado fica fixo; confira valores e datas se alterar os dados do evento. Não digite números: eles são calculados automaticamente.</p>
      <TrechosEditor trechos={clausula.trechos} linhas={bloco.linhas ?? []} onChange={(trechos) => onChange({ ...clausula, trechos })} />
    </div> : bloco.paragrafos.map((texto, i) => <p key={i} className="whitespace-pre-wrap">{texto}</p>)}
  </section>;
}

export function ClausulasContrato({ blocos, valor, editavel, onChange, onPendingChange }: { blocos: BlocoContrato[]; valor?: EdicaoClausulas; editavel: boolean; onChange: (valor: EdicaoClausulas) => void; onPendingChange: (pendente: boolean) => void }) {
  const edicao = valor ?? vazio();
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  useEffect(() => { onPendingChange(!!(titulo.trim() || conteudo.trim())); }, [titulo, conteudo, onPendingChange]);
  const mudar = (clausula: ClausulaContrato) => {
    const adicional = edicao.adicionais.some((c) => c.id === clausula.id);
    onChange(adicional ? { ...edicao, adicionais: edicao.adicionais.map((c) => c.id === clausula.id ? clausula : c) } : { ...edicao, personalizadas: { ...edicao.personalizadas, [clausula.id]: clausula } });
  };
  const remover = (id: string) => onChange(edicao.adicionais.some((c) => c.id === id)
    ? { ...edicao, adicionais: edicao.adicionais.filter((c) => c.id !== id) }
    : { ...edicao, removidas: [...edicao.removidas, id] });
  const restaurar = (id: string) => {
    const personalizadas = { ...edicao.personalizadas };
    delete personalizadas[id];
    onChange({ ...edicao, personalizadas, removidas: edicao.removidas.filter((r) => r !== id) });
  };
  const adicionar = () => {
    if (!editavel || !titulo.trim() || !conteudo.trim()) return;
    const clausula: ClausulaContrato = { id: `adicional:${crypto.randomUUID()}`, titulo: titulo.trim(), trechos: conteudo.trim().split(/\n\s*\n/).map((texto) => ({ ...novoTrecho("paragrafo"), texto })) };
    onChange({ ...edicao, adicionais: [...edicao.adicionais, clausula] });
    setTitulo(""); setConteudo("");
  };
  return <div className="space-y-5">
    <p className="text-xs text-muted-foreground">Cláusulas, artigos, parágrafos e itens são renumerados automaticamente. Artigos seguem sequência no contrato; parágrafos e itens seguem seu grupo. Revise também referências a números que você escrever dentro do texto.</p>
    {blocos.filter((b) => b.clausula).map((bloco) => <ClausulaEditor key={bloco.clausula!.id} bloco={bloco} editavel={editavel} personalizada={!!edicao.personalizadas[bloco.clausula!.id]} onChange={mudar} onRemove={() => remover(bloco.clausula!.id)} onRestore={() => restaurar(bloco.clausula!.id)} />)}
    {editavel && <section className="space-y-3 rounded-lg border border-border bg-muted p-4">
      <h2 className="font-bold">Cláusulas adicionais</h2>
      <label className="block space-y-1">Título da cláusula<Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Condições especiais" /></label>
      <label className="block space-y-1">Conteúdo<Textarea rows={5} value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Escreva sem números. Separe parágrafos com uma linha em branco." /></label>
      <Button type="button" variant="outline" disabled={!titulo.trim() || !conteudo.trim()} onClick={adicionar}>Adicionar cláusula ao contrato</Button>
      {(titulo || conteudo) && <p className="text-xs text-muted-foreground">Clique em Adicionar cláusula para incluir este conteúdo antes de salvar ou gerar o PDF.</p>}
    </section>}
    {editavel && edicao.removidas.length > 0 && <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-semibold">Cláusulas removidas ({edicao.removidas.length})</summary><div className="mt-3 flex flex-wrap gap-2">{edicao.removidas.map((id) => <Button key={id} type="button" variant="outline" size="sm" onClick={() => onChange({ ...edicao, removidas: edicao.removidas.filter((r) => r !== id) })}>Restaurar: {id.replace(/^padrao:/, "")}</Button>)}</div></details>}
  </div>;
}
