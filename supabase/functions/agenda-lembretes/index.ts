import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const env = () => ({ app: Deno.env.get("ONESIGNAL_APP_ID") ?? "", key: Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "", token: Deno.env.get("AGENDA_PUSH_TOKEN") ?? "" });
const faltantes = () => {
  const e = env();
  return [!e.app && "ONESIGNAL_APP_ID", !e.key && "ONESIGNAL_REST_API_KEY", e.token.length < 32 && "AGENDA_PUSH_TOKEN (mínimo 32 caracteres)"].filter(Boolean);
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
async function igual(a: string, b: string) {
  if (!a || !b) return false;
  const hash = async (v: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
  const [x, y] = await Promise.all([hash(a), hash(b)]);
  let diferente = 0;
  for (let i = 0; i < x.length; i++) diferente |= x[i] ^ y[i];
  return diferente === 0;
}
async function enviar(assinaturas: string[], titulo: string, texto: string, chave: string, eventoId?: string) {
  if (!assinaturas.length) throw new Error("Nenhum aparelho autorizado.");
  const e = env();
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST", signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json", Authorization: `Key ${e.key}` },
    body: JSON.stringify({ app_id: e.app, include_subscription_ids: assinaturas,
      headings: { en: titulo, pt: titulo }, contents: { en: texto, pt: texto },
      target_channel: "push", idempotency_key: chave, ttl: 7200,
      data: { tela: "agenda", ...(eventoId ? { eventoId } : {}) },
    }),
  });
  const resultado = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OneSignal recusou o envio (${response.status}). Confira as chaves e a configuração do aplicativo.`);
  if (!resultado.id) throw new Error("OneSignal não encontrou aparelhos habilitados. Abra o aplicativo e autorize as notificações novamente.");
  return String(resultado.id);
}
async function processar(item: { id: string; evento_id: string; usuario_id: string; data_show: string; momento: string }) {
  try {
    const [evento, usuario, pref, aparelhos] = await Promise.all([
      db.from("agenda_eventos").select("data, tipo, status, usuario_id, hora_inicio, local, cidade, cliente").eq("id", item.evento_id).maybeSingle(),
      db.from("app_usuarios").select("banda_id, pode_agenda").eq("id", item.usuario_id).maybeSingle(),
      db.from("agenda_push_usuarios").select("ativo").eq("usuario_id", item.usuario_id).maybeSingle(),
      db.from("agenda_push_aparelhos").select("assinatura").eq("usuario_id", item.usuario_id).eq("ativo", true),
    ]);
    if ([evento, usuario, pref, aparelhos].some((r) => r.error)) throw new Error("Não foi possível conferir o show e seus destinatários.");
    const ev = evento.data, u = usuario.data;
    const ignorar = async () => {
      const r = await db.from("agenda_push_envios").update({ estado: "ignorado", reservado_ate: null, erro: "Show ou autorização alterados antes do envio." }).eq("id", item.id);
      if (r.error) throw new Error("Falha ao registrar verificação.");
    };
    if (!ev || !u?.pode_agenda || pref.data?.ativo === false || ev.tipo !== "show" || ev.status !== "agendado" || ev.data !== item.data_show || ev.usuario_id !== item.usuario_id || !aparelhos.data?.length) return await ignorar();
    const c = await db.from("agenda_push_config").select("*").eq("banda_id", u.banda_id).maybeSingle();
    if (c.error) throw new Error("Não foi possível conferir os horários.");
    if (!c.data?.ativo || !(item.momento === "vespera" ? c.data.avisar_vespera : c.data.avisar_dia)) return await ignorar();
    const partes = new Intl.DateTimeFormat("en-CA", { timeZone: c.data.fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
    const hoje = `${p.year}-${p.month}-${p.day}`, hora = `${p.hour}:${p.minute}`;
    const dataAviso = item.momento === "dia" ? ev.data : new Date(Date.parse(`${ev.data}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const horaAviso = item.momento === "dia" ? c.data.hora_dia : c.data.hora_vespera;
    if (hoje !== dataAviso || (hoje === ev.data && ev.hora_inicio && ev.hora_inicio <= hora)) return await ignorar();
    if (hora < horaAviso) throw new Error("Horário alterado; aguardando o novo horário configurado.");
    const titulo = item.momento === "vespera" ? "Amanhã tem show!" : "Hoje tem show!";
    const texto = [ev.hora_inicio && `Às ${ev.hora_inicio}`, ev.cliente, ev.local, ev.cidade].filter(Boolean).join(" · ") || "Confira os detalhes na sua agenda.";
    const providerId = await enviar(aparelhos.data.map((a) => a.assinatura), titulo, texto.slice(0, 600), item.id, item.evento_id);
    const resultado = await db.from("agenda_push_envios").update({ estado: "enviado", enviado_em: new Date().toISOString(), reservado_ate: null, erro: null, onesignal_id: providerId }).eq("id", item.id);
    if (resultado.error) throw new Error("Envio aceito; confirmação pendente. A repetição usa a mesma identificação para evitar duplicidade.");
  } catch (e) {
    const erro = e instanceof Error ? e.message.slice(0, 300) : "Falha no envio.";
    await db.from("agenda_push_envios").update({ estado: "falhou", erro, reservado_ate: new Date(Date.now() + 240000).toISOString() }).eq("id", item.id);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const isAdmin = await igual(bearer, serviceKey) || await igual(req.headers.get("apikey") ?? "", serviceKey);
  const isCron = await igual(bearer, env().token);
  if (!isAdmin && !isCron) return json({ erro: "Não autorizado." }, 401);
  let acao = "";
  try {
    const body = await req.json();
    acao = body.acao;
    if (acao !== "enviar" && !isAdmin) return json({ erro: "Não autorizado." }, 403);
    if (acao === "status") {
      const r = await db.rpc("agenda_push_status");
      if (r.error) throw new Error("Não foi possível consultar o agendador.");
      return json({ ...r.data, configurado: faltantes().length === 0, faltantes: faltantes() });
    }
    if (faltantes().length) throw new Error(`Configure no Lovable: ${faltantes().join(", ")}.`);
    if (acao === "ativar") {
      const r = await db.rpc("agenda_push_configurar", { p_url: `${url}/functions/v1/agenda-lembretes`, p_token: env().token });
      if (r.error) throw new Error("Não foi possível ativar o agendador.");
      return json({ ok: true });
    }
    if (acao === "teste") {
      if (typeof body.usuarioId !== "string" || typeof body.assinatura !== "string") return json({ erro: "Aparelho inválido." }, 400);
      const [a, u] = await Promise.all([
        db.from("agenda_push_aparelhos").select("assinatura").eq("assinatura", body.assinatura).eq("usuario_id", body.usuarioId).eq("ativo", true).maybeSingle(),
        db.from("app_usuarios").select("pode_agenda").eq("id", body.usuarioId).maybeSingle(),
      ]);
      if (a.error || u.error || !a.data || !u.data?.pode_agenda) return json({ erro: "Aparelho não autorizado para esta agenda." }, 403);
      // Limite de um teste por minuto e aparelho, inclusive em chamadas simultâneas.
      const limite = await db.from("agenda_push_aparelhos")
        .update({ atualizado_em: new Date().toISOString() }).eq("assinatura", body.assinatura)
        .eq("usuario_id", body.usuarioId).eq("ativo", true)
        .lt("atualizado_em", new Date(Date.now() - 60000).toISOString()).select("assinatura");
      if (limite.error) throw new Error("Não foi possível autorizar o teste.");
      if (!limite.data?.length) return json({ erro: "Aguarde um minuto após ativar o aparelho ou enviar o último teste." }, 429);
      await enviar([body.assinatura], "Avisos da agenda", "Teste do Repertório Fácil: este aparelho está pronto para receber avisos de shows.", crypto.randomUUID());
      return json({ ok: true });
    }
    if (acao !== "enviar") return json({ erro: "Ação inválida." }, 400);
    const pendentes = await db.rpc("agenda_push_pendentes");
    if (pendentes.error) throw new Error("Não foi possível consultar os lembretes pendentes.");
    const itens = pendentes.data ?? [];
    // Grupos pequenos: menos de 50 segundos mesmo se o provedor demorar.
    for (let i = 0; i < itens.length; i += 10) await Promise.all(itens.slice(i, i + 10).map(processar));
    const r = await db.from("agenda_push_servico").update({ ultima_execucao: new Date().toISOString(), ultimo_erro: null }).eq("id", true);
    if (r.error) throw new Error("Não foi possível registrar a execução.");
    return json({ ok: true, processados: itens.length });
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha ao processar avisos.";
    if (acao === "enviar") await db.from("agenda_push_servico").update({ ultima_execucao: new Date().toISOString(), ultimo_erro: erro.slice(0, 300) }).eq("id", true);
    return json({ erro }, 500);
  }
});
