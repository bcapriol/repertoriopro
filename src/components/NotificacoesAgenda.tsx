import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellIcon, CalendarClockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConta } from "@/lib/banda-local";
import { notificacoesSituacao, notificacoesTestar } from "@/lib/notificacoes.functions";
import { ativarAparelho, desativarAparelho, conferirVinculo, lerVinculo, bridgeNotificacoes, EVENTO_AVISOS } from "@/lib/notificacoes-aparelho";
import type { EventoAgenda } from "@/lib/nuvem.server";

type Situacao = Awaited<ReturnType<typeof notificacoesSituacao>>;

/** Mantém a autorização alinhada à conta, mesmo fora da página Agenda. */
export function NotificacoesVinculo() {
  const { conta, pronto } = useConta();
  useEffect(() => {
    if (!pronto) return;
    const conferir = () => { void conferirVinculo().catch(() => {}); };
    const visivel = () => { if (document.visibilityState === "visible") conferir(); };
    conferir();
    window.addEventListener("online", conferir);
    document.addEventListener("visibilitychange", visivel);
    return () => { window.removeEventListener("online", conferir); document.removeEventListener("visibilitychange", visivel); };
  }, [pronto, conta?.usuario, conta?.podeAgenda]);
  return null;
}

export function NotificacoesAgenda({ eventos, cred }: { eventos: EventoAgenda[]; cred: { usuario: string; senha: string } }) {
  const situacao = useServerFn(notificacoesSituacao);
  const testar = useServerFn(notificacoesTestar);
  const [dados, setDados] = useState<Situacao | null>(null);
  const [nativo, setNativo] = useState(false);
  const [assinatura, setAssinatura] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [agora, setAgora] = useState("");
  const [aberto, setAberto] = useState(false);
  const carregar = async () => {
    setNativo(Boolean(bridgeNotificacoes()?.info));
    const vinculo = lerVinculo();
    setAssinatura(vinculo?.usuario === cred.usuario ? vinculo.assinatura : "");
    try { setDados(await situacao({ data: cred })); setErro(""); }
    catch (e) { setErro(e instanceof Error ? e.message : "Conecte-se para consultar os avisos."); }
  };
  useEffect(() => {
    void carregar();
    const atualizar = () => { void carregar(); };
    const visivel = () => { if (document.visibilityState === "visible") atualizar(); };
    window.addEventListener(EVENTO_AVISOS, atualizar);
    window.addEventListener("online", atualizar);
    document.addEventListener("visibilitychange", visivel);
    return () => {
      window.removeEventListener(EVENTO_AVISOS, atualizar);
      window.removeEventListener("online", atualizar);
      document.removeEventListener("visibilitychange", visivel);
    };
  }, [cred.usuario, cred.senha]);
  useEffect(() => {
    const atualizar = () => {
      const partes = new Intl.DateTimeFormat("en-CA", { timeZone: dados?.config.fuso ?? "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
      setAgora(`${p["year"]}-${p["month"]}-${p["day"]}T${p["hour"]}:${p["minute"]}`);
    };
    atualizar();
    const timer = setInterval(atualizar, 60000);
    return () => clearInterval(timer);
  }, [dados?.config.fuso]);
  const proximo = agora ? eventos.filter((e) => e.tipo === "show" && e.status === "agendado" && `${e.data}T${e.horaInicio || "23:59"}` >= agora).sort((a, b) => `${a.data}T${a.horaInicio}`.localeCompare(`${b.data}T${b.horaInicio}`))[0] : undefined;
  const vinculado = Boolean(assinatura && dados?.assinaturas.includes(assinatura));
  const habilitado = vinculado && dados?.permitido && dados.config.ativo && dados.servicoAtivo;
  const executar = async (acao: "ativar" | "desativar" | "teste") => {
    if (ocupado) return;
    setOcupado(true); setErro("");
    try {
      if (acao === "ativar") { await ativarAparelho(); toast.success("Aparelho vinculado. Aguarde um minuto para enviar o teste."); }
      else if (acao === "desativar") { await desativarAparelho(); toast.success("Avisos desativados neste aparelho."); }
      else { await testar({ data: { ...cred, assinatura } }); toast.success("Teste aceito pelo OneSignal. Confira as notificações do celular."); }
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível concluir."); }
    finally { setOcupado(false); }
  };
  return <section className="mb-5 space-y-3 rounded-2xl border border-border bg-background p-4">
    {proximo && <div className="flex items-start gap-3"><CalendarClockIcon className="mt-1 size-5 shrink-0 text-primary" /><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximo show</p><p className="font-bold text-foreground">{proximo.data.split("-").reverse().join("/")}{proximo.horaInicio ? ` às ${proximo.horaInicio}` : " · Horário a definir"}</p><p className="text-sm text-muted-foreground">{[proximo.cliente, proximo.local, proximo.cidade].filter(Boolean).join(" · ") || "Confira os detalhes no calendário"}</p></div></div>}
    <button type="button" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="flex w-full items-center gap-2 text-left text-sm font-semibold"><BellIcon className="size-4 text-primary" /><span>Avisos de shows<small className="block font-normal text-muted-foreground">{habilitado ? "Aparelho vinculado · envio automático configurado" : "Configure os lembretes neste aparelho"}</small></span><span className="ml-auto">{aberto ? "−" : "+"}</span></button>
    {aberto && <div className="space-y-3 border-t border-border pt-3 text-sm">
      <p className="text-muted-foreground">Receba avisos na véspera e no dia, mesmo com o aplicativo fechado. É necessário o aplicativo Median integrado ao OneSignal e a permissão de notificações do celular.</p>
      {dados && <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground"><p>{dados.config.ativo && dados.permitido ? "Avisos autorizados pelo administrador." : "O administrador precisa ativar os avisos para sua banda e seu usuário."}</p><p>{dados.config.avisar_vespera ? `Véspera: ${dados.config.hora_vespera}. ` : ""}{dados.config.avisar_dia ? `No dia: ${dados.config.hora_dia}. ` : ""}Fuso: {dados.config.fuso}.</p><p>{dados.servicoAtivo ? "Verificação a cada 5 minutos." : "Serviço automático ainda não ativado no administrador."}</p>{dados.erro && <p>O serviço registrou um problema; avise o administrador.</p>}</div>}
      {!nativo && <p className="text-xs text-muted-foreground">No navegador e no atalho instalado, estes avisos não estão disponíveis. Abra a versão gerada pelo Median com OneSignal habilitado.</p>}
      {erro && <p role="alert" className="text-destructive">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={ocupado || !nativo} onClick={() => executar("ativar")}>{ocupado ? "Aguarde…" : vinculado ? "Revalidar aparelho" : "Ativar neste aparelho"}</Button>
        <Button variant="outline" disabled={ocupado || !vinculado} onClick={() => executar("teste")}>Enviar teste</Button>
        {assinatura && <Button variant="ghost" disabled={ocupado} onClick={() => executar("desativar")}>Desativar neste aparelho</Button>}
        <Button variant="ghost" disabled={ocupado} onClick={carregar}>Atualizar situação</Button>
      </div>
      <p className="text-xs text-muted-foreground">O teste fica disponível um minuto após a ativação. A entrega depende da internet e das permissões do celular; modo silencioso, economia de bateria e encerramento forçado podem afetar os avisos.</p>
    </div>}
  </section>;
}
