import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { admNotificacoesLer, admNotificacoesSalvar, admNotificacoesAtivarServico, type ConfigNotificacoes } from "@/lib/notificacoes.functions";

type Dados = Awaited<ReturnType<typeof admNotificacoesLer>>;
const FUSOS = [
  ["America/Sao_Paulo", "Brasília / São Paulo"], ["America/Bahia", "Bahia"],
  ["America/Fortaleza", "Fortaleza"], ["America/Belem", "Belém"],
  ["America/Manaus", "Manaus"], ["America/Cuiaba", "Cuiabá"],
  ["America/Porto_Velho", "Porto Velho"], ["America/Boa_Vista", "Boa Vista"],
  ["America/Rio_Branco", "Rio Branco"], ["America/Noronha", "Fernando de Noronha"],
];

export function NotificacoesAdm({ senha, bandaId }: { senha: string; bandaId: string }) {
  const ler = useServerFn(admNotificacoesLer);
  const salvar = useServerFn(admNotificacoesSalvar);
  const ativar = useServerFn(admNotificacoesAtivarServico);
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const carregar = async () => {
    setOcupado(true); setErro("");
    try { setDados(await ler({ data: { senha, bandaId } })); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível carregar os avisos."); }
    finally { setOcupado(false); }
  };
  useEffect(() => { if (aberto) void carregar(); }, [aberto, bandaId, senha]);
  function campo<K extends keyof ConfigNotificacoes>(nome: K, valor: ConfigNotificacoes[K]) {
    setDados((d) => d ? { ...d, config: { ...d.config, [nome]: valor } } : d);
  }
  const executar = async (acao: "salvar" | "ativar") => {
    if (!dados || ocupado) return;
    setOcupado(true); setErro("");
    try {
      if (acao === "ativar") {
        await ativar({ data: { senha } });
        setDados(await ler({ data: { senha, bandaId } }));
        toast.success("Verificação automática ativada a cada 5 minutos.");
      } else {
        setDados(await salvar({ data: { senha, bandaId, config: dados.config, usuarios: dados.usuarios.map((u) => ({ id: u.id, ativo: u.ativo })) } }));
        toast.success("Preferências de notificações salvas.");
      }
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setOcupado(false); }
  };
  return (
    <div className="rounded-xl border border-border bg-background">
      <button type="button" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="flex w-full items-center gap-2 p-3 text-left text-sm font-bold text-foreground">
        <BellIcon className="size-4 text-primary" /> Notificações da agenda <span className="ml-auto text-muted-foreground">{aberto ? "−" : "+"}</span>
      </button>
      {aberto && <div className="space-y-4 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">Avisos de cada show agendado, somente para o dono da agenda. Não inclui folgas, compromissos particulares, shows cancelados ou concluídos.</p>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {!dados && <Button variant="outline" disabled={ocupado} onClick={carregar}>{ocupado ? "Carregando…" : "Tentar novamente"}</Button>}
        {dados && <>
          <div className="space-y-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{dados.servico.configurado && dados.servico.agendadorAtivo ? "Serviço de envio ativado" : "Configuração do envio pendente"}</p>
            <p>O aplicativo Median precisa estar integrado ao OneSignal. No Lovable, publique a função agenda-lembretes e configure ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY e AGENDA_PUSH_TOKEN (chave aleatória com 32 caracteres ou mais).</p>
            {dados.servico.faltantes.length > 0 && <p>Falta configurar: {dados.servico.faltantes.join(", ")}</p>}
            {dados.servico.erro && <p role="status">{dados.servico.erro}</p>}
            <p>Última verificação: {dados.servico.ultimaExecucao ? new Date(dados.servico.ultimaExecucao).toLocaleString("pt-BR") : "aguardando primeira execução"}.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={ocupado || !dados.servico.configurado} onClick={() => executar("ativar")}>{dados.servico.agendadorAtivo ? "Revalidar serviço" : "Ativar serviço automático"}</Button>
              <Button variant="ghost" size="sm" disabled={ocupado} onClick={carregar}>Atualizar situação</Button>
            </div>
          </div>
          <fieldset disabled={ocupado} className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold"><input className="size-4 accent-primary" type="checkbox" checked={dados.config.ativo} onChange={(e) => campo("ativo", e.target.checked)} /> Ativar avisos desta banda</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm"><input className="size-4 accent-primary" type="checkbox" checked={dados.config.avisar_vespera} onChange={(e) => campo("avisar_vespera", e.target.checked)} /> Um dia antes</label>
                <Input type="time" aria-label="Horário do aviso na véspera" value={dados.config.hora_vespera} onChange={(e) => campo("hora_vespera", e.target.value)} />
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm"><input className="size-4 accent-primary" type="checkbox" checked={dados.config.avisar_dia} onChange={(e) => campo("avisar_dia", e.target.checked)} /> No dia do show</label>
                <Input type="time" aria-label="Horário do aviso no dia" value={dados.config.hora_dia} onChange={(e) => campo("hora_dia", e.target.value)} />
              </div>
            </div>
            <label className="block space-y-1 text-sm"><span>Fuso horário dos shows</span><select className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground" value={dados.config.fuso} onChange={(e) => campo("fuso", e.target.value)}>{FUSOS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></label>
            <p className="text-xs text-muted-foreground">Horário padrão: 9h. O envio pode levar até 5 minutos; avisos do dia não são enviados depois do início do show.</p>
            <div className="space-y-2"><p className="text-sm font-semibold">Quem recebe</p>
              {dados.usuarios.map((u) => <label key={u.id} className="flex items-start gap-2 text-sm"><input className="mt-1 size-4 accent-primary" type="checkbox" disabled={!u.podeAgenda} checked={u.ativo && u.podeAgenda} onChange={(e) => { const ativo = e.target.checked; setDados((d) => d ? { ...d, usuarios: d.usuarios.map((x) => x.id === u.id ? { ...x, ativo } : x) } : d); }} /><span>{u.usuario}<small className="block text-muted-foreground">{u.podeAgenda ? `${u.aparelhos} aparelho(s) vinculado(s)` : "Sem acesso à agenda"}</small></span></label>)}
            </div>
            <Button className="w-full" onClick={() => executar("salvar")}>{ocupado ? "Salvando…" : "Salvar notificações"}</Button>
          </fieldset>
          <p className="text-xs text-muted-foreground">Para testar: entre com o usuário no aplicativo instalado, abra Agenda → Avisos de shows e ative o aparelho. Após um minuto, toque em “Enviar teste”.</p>
          {dados.envios.length > 0 && <div className="space-y-1 border-t border-border pt-3"><p className="text-sm font-semibold">Últimos envios</p>{dados.envios.map((e) => <div key={e.id} className="rounded bg-muted p-2 text-xs"><p>{e.data_show.split("-").reverse().join("/")} · {e.momento === "dia" ? "No dia" : "Véspera"} · {({ enviado: "Aceito pelo OneSignal", falhou: "Falhou", ignorado: "Não enviado", processando: "Em processamento" } as Record<string, string>)[e.estado] ?? e.estado}</p>{e.erro && <p className="text-muted-foreground">{e.erro}</p>}</div>)}<p className="text-xs text-muted-foreground">Aceito pelo serviço não confirma a entrega no aparelho.</p></div>}
        </>}
      </div>}
    </div>
  );
}
