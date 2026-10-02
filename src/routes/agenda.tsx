import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MicVocalIcon,
  PinIcon,
  PalmtreeIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
  Trash2Icon,
  RotateCcwIcon,
  type LucideIcon,
} from "lucide-react";
import { PageShell, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agendaExcluir, agendaListar, agendaSalvar, agendaStatus } from "@/lib/nuvem.functions";
import { salvarConta, useConta } from "@/lib/banda-local";
import type { EventoAgenda } from "@/lib/nuvem.server";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda | Repertório Fácil" },
      { name: "description", content: "Agenda de shows, compromissos particulares e folgas." },
      { property: "og:title", content: "Agenda | Repertório Fácil" },
      { property: "og:description", content: "Agenda de shows, compromissos particulares e folgas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

type Tipo = EventoAgenda["tipo"];
const TIPOS: Record<Tipo, { rotulo: string; Icon: LucideIcon; ponto: string; chip: string }> = {
  show: { rotulo: "Show", Icon: MicVocalIcon, ponto: "bg-primary", chip: "border-primary/60 bg-primary/15 text-primary" },
  particular: { rotulo: "Compromisso Particular", Icon: PinIcon, ponto: "bg-foreground", chip: "border-foreground/40 bg-foreground/10 text-foreground" },
  folga: { rotulo: "Folga", Icon: PalmtreeIcon, ponto: "bg-muted-foreground", chip: "border-dashed border-muted-foreground/60 bg-muted/40 text-muted-foreground" },
};
const STATUS: Record<EventoAgenda["status"], string> = { agendado: "Agendado", concluido: "Concluído", cancelado: "Cancelado" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dataBR = (s: string) => s.split("-").reverse().join("/");
const moeda = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const horario = (e: EventoAgenda) => (e.horaInicio ? `${e.horaInicio}${e.horaFim ? `–${e.horaFim}` : ""}` : "—");

type Form = { id?: string; tipo: Tipo; data: string; horaInicio: string; horaFim: string; local: string; descricao: string; valor: string };

function AgendaPage() {
  const { conta, pronto } = useConta();
  const listar = useServerFn(agendaListar);
  const salvar = useServerFn(agendaSalvar);
  const excluir = useServerFn(agendaExcluir);
  const mudar = useServerFn(agendaStatus);

  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [podeShows, setPodeShows] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [semAcesso, setSemAcesso] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [dia, setDia] = useState(iso(hoje));
  const [form, setForm] = useState<Form | null>(null);

  const cred = conta ? { usuario: conta.usuario, senha: conta.senha } : null;

  const aplicar = useCallback(
    (r: { eventos: EventoAgenda[]; podeAgenda: boolean; podeAdicionarShows: boolean }) => {
      setEventos(r.eventos);
      setPodeShows(r.podeAdicionarShows);
      if (conta && (conta.podeAgenda !== r.podeAgenda || conta.podeAdicionarShows !== r.podeAdicionarShows)) {
        salvarConta({ ...conta, podeAgenda: r.podeAgenda, podeAdicionarShows: r.podeAdicionarShows });
      }
    },
    [conta],
  );

  useEffect(() => {
    if (!pronto || !conta) return;
    listar({ data: { usuario: conta.usuario, senha: conta.senha } })
      .then(aplicar)
      .catch((e) => {
        setSemAcesso(true);
        toast.error(e instanceof Error ? e.message : "Não foi possível abrir a agenda.");
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);

  const rodar = async (fn: () => Promise<Parameters<typeof aplicar>[0]>, msg: string) => {
    setOcupado(true);
    try {
      aplicar(await fn());
      toast.success(msg);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou.");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const porDia = useMemo(() => {
    const m = new Map<string, EventoAgenda[]>();
    for (const e of eventos) m.set(e.data, [...(m.get(e.data) ?? []), e]);
    return m;
  }, [eventos]);

  const celulas = useMemo(() => {
    const ini = new Date(mes);
    ini.setDate(1 - mes.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + i));
  }, [mes]);

  const shows = eventos.filter((e) => e.tipo === "show");
  const doDia = porDia.get(dia) ?? [];

  const novo = (tipo: Tipo) =>
    setForm({ tipo, data: dia, horaInicio: "", horaFim: "", local: "", descricao: "", valor: "" });

  const enviar = async () => {
    if (!form || !cred) return;
    const valor = form.valor.trim() ? Number(form.valor.replace(/\./g, "").replace(",", ".")) : null;
    if (valor !== null && !Number.isFinite(valor)) { toast.error("Valor inválido."); return; }
    const ok = await rodar(
      () =>
        salvar({
          data: {
            ...cred,
            evento: { id: form.id, tipo: form.tipo, data: form.data, horaInicio: form.horaInicio, horaFim: form.horaFim, local: form.local, descricao: form.descricao, valor },
          },
        }),
      form.id ? "Evento alterado." : "Evento adicionado.",
    );
    if (ok) {
      setDia(form.data);
      setForm(null);
    }
  };

  if (!pronto || carregando) return <PageShell title="Agenda"><p className="text-center text-sm text-muted-foreground">Carregando…</p></PageShell>;
  if (semAcesso || !conta)
    return (
      <PageShell title="Agenda">
        <EmptyState title="Acesso restrito" hint="Peça ao administrador o privilégio “Agenda de shows”." />
      </PageShell>
    );

  const podeMexer = (e: EventoAgenda) => e.tipo !== "show" || podeShows;

  return (
    <PageShell title="Agenda" subtitle={`${shows.length} show(s) cadastrado(s)`}>
      <Tabs defaultValue="calendario">
        <TabsList className="mb-5 grid w-full grid-cols-2">
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório de Shows</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="flex flex-col gap-5">
          <section className="surface-tile rounded-2xl border border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>
                <ChevronLeftIcon />
              </Button>
              <p className="font-bold text-foreground">{MESES[mes.getMonth()]} {mes.getFullYear()}</p>
              <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>
                <ChevronRightIcon />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
              {SEMANA.map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {celulas.map((d) => {
                const k = iso(d);
                const evs = porDia.get(k) ?? [];
                const fora = d.getMonth() !== mes.getMonth();
                const sel = k === dia;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDia(k)}
                    className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-colors ${
                      sel ? "border-primary bg-primary/15 font-bold text-foreground" : "border-transparent hover:bg-muted/50"
                    } ${fora ? "text-muted-foreground/50" : "text-foreground"} ${k === iso(hoje) && !sel ? "underline decoration-primary underline-offset-4" : ""}`}
                  >
                    {d.getDate()}
                    <span className="flex h-1.5 gap-0.5">
                      {(["show", "particular", "folga"] as Tipo[])
                        .filter((t) => evs.some((e) => e.tipo === t))
                        .map((t) => <span key={t} className={`size-1.5 rounded-full ${TIPOS[t].ponto}`} />)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                <span key={t} className="flex items-center gap-1"><span className={`size-2 rounded-full ${TIPOS[t].ponto}`} />{TIPOS[t].rotulo}</span>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold text-foreground">{dataBR(dia)}</h2>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TIPOS) as Tipo[])
                .filter((t) => t !== "show" || podeShows)
                .map((t) => {
                  const { Icon, rotulo } = TIPOS[t];
                  return (
                    <Button key={t} variant="outline" className="h-auto flex-col gap-1 rounded-xl py-3 text-xs font-bold" onClick={() => novo(t)}>
                      <PlusIcon className="size-4" /><Icon className="size-5" />{t === "particular" ? "Compromisso" : rotulo}
                    </Button>
                  );
                })}
            </div>
            {doDia.length === 0 ? (
              <EmptyState title="Nenhum evento" hint="Toque em um dos botões acima para adicionar." />
            ) : (
              doDia.map((e) => {
                const { Icon, rotulo, chip } = TIPOS[e.tipo];
                return (
                  <article key={e.id} className={`rounded-2xl border p-4 ${chip}`}>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Icon className="size-4" />{rotulo}
                      {e.tipo === "show" ? <span className="ml-auto rounded-full border border-current px-2 py-0.5 text-xs">{STATUS[e.status]}</span> : null}
                    </div>
                    <p className="mt-2 font-semibold text-foreground">
                      {e.tipo === "show" ? e.local : e.descricao || (e.tipo === "folga" ? "Dia de folga" : "")}
                    </p>
                    {e.tipo !== "folga" ? <p className="text-sm text-muted-foreground">{horario(e)}{e.tipo === "show" ? ` · ${moeda(e.valor)}` : ""}</p> : null}
                    {podeMexer(e) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {e.tipo === "show" ? (
                          e.status === "agendado" ? (
                            <>
                              <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => rodar(() => mudar({ data: { ...cred!, id: e.id, status: "concluido" } }), "Show concluído.")}><CheckIcon /> Concluído</Button>
                              <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => rodar(() => mudar({ data: { ...cred!, id: e.id, status: "cancelado" } }), "Show cancelado.")}><XIcon /> Cancelado</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => rodar(() => mudar({ data: { ...cred!, id: e.id, status: "agendado" } }), "Show reaberto.")}><RotateCcwIcon /> Reabrir</Button>
                          )
                        ) : null}
                        <Button size="sm" variant="outline" disabled={ocupado} onClick={() => setForm({ id: e.id, tipo: e.tipo, data: e.data, horaInicio: e.horaInicio, horaFim: e.horaFim, local: e.local, descricao: e.descricao, valor: e.valor === null ? "" : String(e.valor).replace(".", ",") })}><PencilIcon /> Alterar</Button>
                        <Button size="sm" variant="outline" className="text-destructive" disabled={ocupado} onClick={() => { if (confirm("Excluir este evento?")) rodar(() => excluir({ data: { ...cred!, id: e.id } }), "Evento excluído."); }}><Trash2Icon /> Excluir</Button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
        </TabsContent>

        <TabsContent value="relatorio">
          {shows.length === 0 ? (
            <EmptyState title="Nenhum show" hint="Os shows cadastrados aparecem aqui." />
          ) : (
            <div className="surface-tile overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>{["Data", "Horário", "Local", "Valor", "Status"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {shows.map((e) => (
                    <tr key={e.id} className="border-t border-border text-foreground">
                      <td className="px-3 py-2 whitespace-nowrap">{dataBR(e.data)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{horario(e)}</td>
                      <td className="px-3 py-2">{e.local}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{moeda(e.valor)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{STATUS[e.status]}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-bold text-primary">
                    <td className="px-3 py-2" colSpan={3}>Total concluído</td>
                    <td className="px-3 py-2 whitespace-nowrap" colSpan={2}>{moeda(shows.filter((s) => s.status === "concluido").reduce((a, s) => a + (s.valor ?? 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form ? (
            <>
              <DialogHeader><DialogTitle>{form.id ? "Alterar" : "Novo"}: {TIPOS[form.tipo].rotulo}</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-3">
                {form.tipo === "show" ? (
                  <Campo rotulo="Local"><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className="h-11 text-base" /></Campo>
                ) : null}
                {form.tipo === "particular" ? (
                  <Campo rotulo="Descrição do compromisso"><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="h-11 text-base" /></Campo>
                ) : null}
                <Campo rotulo="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="h-11 text-base" /></Campo>
                {form.tipo !== "folga" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Hora de início"><Input type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} className="h-11 text-base" /></Campo>
                    <Campo rotulo="Hora de fim"><Input type="time" value={form.horaFim} onChange={(e) => setForm({ ...form, horaFim: e.target.value })} className="h-11 text-base" /></Campo>
                  </div>
                ) : null}
                {form.tipo === "show" ? (
                  <Campo rotulo="Valor (R$)"><Input inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="h-11 text-base" /></Campo>
                ) : null}
                {form.tipo === "folga" ? (
                  <Campo rotulo="Observação (opcional)"><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Campo>
                ) : null}
                <Button disabled={ocupado} className="h-12 rounded-xl font-bold" onClick={enviar}>Salvar</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
      {rotulo}
      {children}
    </label>
  );
}
