import { randomBytes } from "node:crypto";
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { conferirSenhaAdm, entrarUsuario, hashSenha } from "./nuvem.server";
import type { ConfigNotificacoes } from "./notificacoes.functions";

const PADRAO: ConfigNotificacoes = { ativo: false, avisar_vespera: true, hora_vespera: "09:00", avisar_dia: true, hora_dia: "09:00", fuso: "America/Sao_Paulo" };
const uuid = (v: string) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
type Cred = { usuario: string; senha: string };
type Servico = { disponivel: boolean; configurado: boolean; agendadorAtivo: boolean; ultimaExecucao: string | null; erro: string | null; faltantes: string[] };

async function servico(body: Record<string, unknown>) {
  const { data, error } = await db.functions.invoke("agenda-lembretes", { body });
  if (error || !data || data.erro) {
    let mensagem = typeof data?.erro === "string" ? data.erro : "";
    const respostaHttp = error?.context instanceof Response ? error.context : null;
    // Preserva orientações do serviço (por exemplo, aguardar entre testes).
    if (!mensagem && respostaHttp) {
      try {
        const resposta = await respostaHttp.json();
        if (typeof resposta?.erro === "string") mensagem = resposta.erro;
      } catch { /* Não expõe respostas técnicas, credenciais ou cabeçalhos. */ }
    }
    if (respostaHttp?.status === 404) {
      mensagem = "A consulta retornou 404: serviço de avisos não encontrado. No Lovable, confira se a função agenda-lembretes foi publicada no mesmo projeto do aplicativo.";
    } else if (respostaHttp?.status === 401 || respostaHttp?.status === 403) {
      mensagem = "A consulta ao serviço de avisos não foi autorizada. No Lovable, confira as credenciais do servidor e a publicação da função agenda-lembretes com a configuração de autenticação deste projeto.";
    }
    throw new Error(mensagem || "Não foi possível consultar o serviço de avisos. Isso não confirma se as chaves estão configuradas. No Lovable, confira a publicação e os registros da função agenda-lembretes; depois tente atualizar a situação.");
  }
  return data;
}
async function contaAgenda(cred: Cred) {
  const conta = await entrarUsuario(cred.usuario, cred.senha);
  if (!conta.podeAgenda) throw new Error("Você não tem acesso à agenda.");
  return conta;
}

export async function lerConfiguracao(d: { senha: string; bandaId: string }) {
  conferirSenhaAdm(d.senha);
  if (!uuid(d.bandaId)) throw new Error("Banda inválida.");
  const [config, usuarios, preferencias, aparelhos, historico] = await Promise.all([
    db.from("agenda_push_config").select("*").eq("banda_id", d.bandaId).maybeSingle(),
    db.from("app_usuarios").select("id, usuario, pode_agenda").eq("banda_id", d.bandaId),
    db.from("agenda_push_usuarios").select("usuario_id, ativo"),
    db.from("agenda_push_aparelhos").select("usuario_id").eq("ativo", true),
    db.rpc("agenda_push_status"),
  ]);
  for (const r of [config, usuarios, preferencias, aparelhos, historico]) if (r.error) throw new Error("Não foi possível consultar as notificações.");
  const statusBanco = historico.data as { agendadorAtivo?: boolean; ultimaExecucao?: string | null } | null;
  let estado: Servico;
  try { estado = { ...await servico({ acao: "status" }), disponivel: true }; }
  catch (e) {
    estado = {
      disponivel: false, configurado: false,
      agendadorAtivo: statusBanco?.agendadorAtivo ?? false,
      ultimaExecucao: statusBanco?.ultimaExecucao ?? null,
      erro: e instanceof Error ? e.message : "Serviço indisponível.", faltantes: [],
    };
  }
  const ids = (usuarios.data ?? []).map((u) => u.id);
  const envios = ids.length ? await db.from("agenda_push_envios").select("id, estado, momento, data_show, enviado_em, erro, criado_em").in("usuario_id", ids).order("criado_em", { ascending: false }).limit(8) : { data: [] };
  return {
    config: (config.data ?? PADRAO) as ConfigNotificacoes, servico: estado,
    usuarios: (usuarios.data ?? []).map((u) => ({ id: u.id, usuario: u.usuario, podeAgenda: u.pode_agenda, ativo: preferencias.data?.find((p) => p.usuario_id === u.id)?.ativo ?? true, aparelhos: aparelhos.data?.filter((a) => a.usuario_id === u.id).length ?? 0 })),
    envios: envios.data ?? [],
  };
}

export async function salvarConfiguracao(d: { senha: string; bandaId: string; config: ConfigNotificacoes; usuarios: { id: string; ativo: boolean }[] }) {
  conferirSenhaAdm(d.senha);
  if (!uuid(d.bandaId) || !d.config || !Array.isArray(d.usuarios)) throw new Error("Configuração inválida.");
  const c = d.config;
  if (![c.ativo, c.avisar_dia, c.avisar_vespera].every((v) => typeof v === "boolean") || ![c.hora_dia, c.hora_vespera].every((v) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v))) throw new Error("Informe horários válidos.");
  const fusos = ["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "America/Bahia", "America/Fortaleza", "America/Belem", "America/Porto_Velho", "America/Boa_Vista"];
  if (!fusos.includes(c.fuso)) throw new Error("Selecione um fuso horário brasileiro.");
  if (c.ativo && !c.avisar_dia && !c.avisar_vespera) throw new Error("Escolha pelo menos um dos avisos.");
  const membros = await db.from("app_usuarios").select("id").eq("banda_id", d.bandaId);
  if (membros.error || d.usuarios.some((u) => typeof u.ativo !== "boolean" || !membros.data?.some((m) => m.id === u.id))) throw new Error("Usuário não pertence à banda.");
  const { error } = await db.from("agenda_push_config").upsert({ banda_id: d.bandaId, ativo: c.ativo, avisar_vespera: c.avisar_vespera, hora_vespera: c.hora_vespera, avisar_dia: c.avisar_dia, hora_dia: c.hora_dia, fuso: c.fuso, atualizado_em: new Date().toISOString() });
  if (error) throw new Error("Não foi possível salvar os horários.");
  if (d.usuarios.length) {
    const r = await db.from("agenda_push_usuarios").upsert(d.usuarios.map((u) => ({ usuario_id: u.id, ativo: u.ativo })));
    if (r.error) throw new Error("Horários salvos, mas as preferências dos usuários não foram salvas. Tente novamente.");
  }
  return lerConfiguracao(d);
}

export async function ativarServico(senha: string) {
  conferirSenhaAdm(senha);
  await servico({ acao: "ativar" });
  return { ok: true };
}

export async function situacaoUsuario(cred: Cred) {
  const conta = await contaAgenda(cred);
  const [c, p, a, s] = await Promise.all([
    db.from("agenda_push_config").select("*").eq("banda_id", conta.bandaId).maybeSingle(),
    db.from("agenda_push_usuarios").select("ativo").eq("usuario_id", conta.usuarioId).maybeSingle(),
    db.from("agenda_push_aparelhos").select("assinatura").eq("usuario_id", conta.usuarioId).eq("ativo", true),
    db.rpc("agenda_push_status"),
  ]);
  if (c.error || p.error || a.error || s.error) throw new Error("Não foi possível consultar os avisos.");
  const status = s.data as { agendadorAtivo?: boolean; ultimaExecucao?: string | null; erro?: string | null } | null;
  return { config: (c.data ?? PADRAO) as ConfigNotificacoes, permitido: p.data?.ativo ?? true, assinaturas: (a.data ?? []).map((x) => x.assinatura), servicoAtivo: status?.agendadorAtivo ?? false, ultimaExecucao: status?.ultimaExecucao ?? null, erro: status?.erro ?? null };
}

export async function vincularAparelho(d: Cred & { assinatura: string }) {
  const conta = await contaAgenda(d);
  if (!uuid(d.assinatura)) throw new Error("O aplicativo ainda não forneceu uma assinatura de notificações válida.");
  const token = randomBytes(32).toString("hex");
  const { error } = await db.from("agenda_push_aparelhos").upsert({ assinatura: d.assinatura, usuario_id: conta.usuarioId, token_hash: hashSenha(token), ativo: true, atualizado_em: new Date().toISOString() });
  if (error) throw new Error("Não foi possível vincular este aparelho.");
  return { token };
}

export async function revogarAparelho(token: string) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new Error("Autorização inválida.");
  const { error } = await db.from("agenda_push_aparelhos").update({ ativo: false, atualizado_em: new Date().toISOString() }).eq("token_hash", hashSenha(token));
  if (error) throw new Error("Não foi possível desativar este aparelho. Conecte-se e tente novamente.");
  return { ok: true };
}

export async function testarAparelho(d: Cred & { assinatura: string }) {
  const conta = await contaAgenda(d);
  if (!uuid(d.assinatura)) throw new Error("Ative este aparelho primeiro.");
  await servico({ acao: "teste", usuarioId: conta.usuarioId, assinatura: d.assinatura });
  return { ok: true };
}
