import { createHash, timingSafeEqual } from "node:crypto";
import type { AppData, Anexo, Setlist, Song } from "./repertorio-store";
import { mesclarDados } from "./sync-merge";

export type BandaResumo = {
  id: string;
  nome: string;
  usuarios: { id: string; usuario: string; senha: string; podeApagar: boolean; podeBackup: boolean; podeEditar: boolean; podeAgenda: boolean; podeAdicionarShows: boolean }[];
  totalMusicas: number;
  totalRepertorios: number;
};

function sha256(v: string) {
  return createHash("sha256").update(v, "utf8").digest();
}

export function hashSenha(v: string) {
  return sha256(v).toString("hex");
}

export function conferirSenhaAdm(senha: string) {
  const esperado = process.env["ADMIN_SENHA"];
  if (!esperado) throw new Error("Senha de ADM não configurada.");
  if (!timingSafeEqual(sha256(senha), sha256(esperado))) {
    throw new Error("Senha incorreta.");
  }
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function gerarKeygen() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const bruto = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
  return `${bruto.slice(0, 4)}-${bruto.slice(4, 8)}-${bruto.slice(8, 12)}`;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function listarBandas(): Promise<BandaResumo[]> {
  const db = await admin();
  const [bandas, usuarios, musicas, repertorios] = await Promise.all([
    db.from("bandas").select("id, nome, criado_em").order("criado_em", { ascending: false }),
    db.from("app_usuarios").select("id, usuario, senha_visivel, banda_id, pode_apagar, pode_backup, pode_editar, pode_agenda, pode_adicionar_shows"),
    db.from("cloud_songs").select("banda_id"),
    db.from("cloud_setlists").select("banda_id"),
  ]);
  if (bandas.error) throw bandas.error;
  const conta = (linhas: { banda_id: string }[] | null, id: string) =>
    (linhas ?? []).filter((l) => l.banda_id === id).length;
  return (bandas.data ?? []).map((b) => ({
    id: b.id,
    nome: b.nome,
    usuarios: (usuarios.data ?? [])
      .filter((u) => u.banda_id === b.id)
      .map((u) => ({
        id: u.id,
        usuario: u.usuario,
        senha: u.senha_visivel ?? "",
        podeApagar: u.pode_apagar ?? false,
        podeBackup: u.pode_backup ?? false,
        podeEditar: u.pode_editar ?? false,
        podeAgenda: u.pode_agenda ?? false,
        podeAdicionarShows: u.pode_adicionar_shows ?? false,
      })),
    totalMusicas: conta(musicas.data, b.id),
    totalRepertorios: conta(repertorios.data, b.id),
  }));
}

export async function criarBanda(nome: string) {
  const db = await admin();
  const { error } = await db.from("bandas").insert({ nome, keygen: gerarKeygen() });
  if (error) throw error;
}

export async function excluirBanda(id: string) {
  const db = await admin();
  const { error } = await db.from("bandas").delete().eq("id", id);
  if (error) throw error;
}

export async function criarUsuario(bandaId: string, usuario: string, senha: string) {
  const db = await admin();
  const { error } = await db
    .from("app_usuarios")
    .insert({ banda_id: bandaId, usuario, senha_hash: hashSenha(senha), senha_visivel: senha });
  if (error) {
    throw new Error(error.code === "23505" ? "Esse usuário já existe." : error.message);
  }
}

export async function alterarSenhaUsuario(id: string, senha: string) {
  const db = await admin();
  const { error } = await db
    .from("app_usuarios")
    .update({ senha_hash: hashSenha(senha), senha_visivel: senha })
    .eq("id", id);
  if (error) throw error;
}

export async function definirPrivilegios(
  id: string,
  privilegios: { podeApagar: boolean; podeBackup: boolean; podeEditar: boolean; podeAgenda: boolean; podeAdicionarShows: boolean },
) {
  const db = await admin();
  const { error } = await db
    .from("app_usuarios")
    .update({
      pode_apagar: privilegios.podeApagar,
      pode_backup: privilegios.podeBackup,
      pode_editar: privilegios.podeEditar,
      pode_agenda: privilegios.podeAgenda,
      pode_adicionar_shows: privilegios.podeAdicionarShows,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function excluirUsuario(id: string) {
  const db = await admin();
  const { error } = await db.from("app_usuarios").delete().eq("id", id);
  if (error) throw error;
}

export async function publicarShow(bandaId: string, dados: AppData) {
  const db = await admin();
  await db.from("cloud_songs").delete().eq("banda_id", bandaId);
  await db.from("cloud_setlists").delete().eq("banda_id", bandaId);

  if (dados.songs.length) {
    const { error } = await db.from("cloud_songs").insert(
      dados.songs.map((s, i) => ({
        banda_id: bandaId,
        song_id: s.id,
        titulo: s.titulo,
        artista: s.artista ?? "",
        tom: s.tom ?? "",
        bpm: s.bpm ?? "",
        ritmo: s.ritmo ?? "",
        observacoes: s.observacoes ?? "",
        letra: s.letra ?? "",
        anexos: (s.anexos ?? []) as unknown as never,
        atualizado_em: new Date(s.atualizadoEm ?? s.criadoEm ?? Date.now()).toISOString(),
        ordem: i,
      })),
    );
    if (error) throw error;
  }
  if (dados.setlists.length) {
    const { error } = await db.from("cloud_setlists").insert(
      dados.setlists.map((r, i) => ({
        banda_id: bandaId,
        setlist_id: r.id,
        nome: r.nome,
        local: r.local ?? "",
        data: r.data ?? "",
        song_ids: r.songIds as unknown as never,
        atualizado_em: new Date(r.atualizadoEm ?? r.criadoEm ?? Date.now()).toISOString(),
        ordem: i,
      })),
    );
    if (error) throw error;
  }
  return { musicas: dados.songs.length, repertorios: dados.setlists.length };
}

export async function baixarDaBanda(bandaId: string) {
  const db = await admin();
  const banda = { id: bandaId };

  const [musicas, repertorios] = await Promise.all([
    db.from("cloud_songs").select("*").eq("banda_id", banda.id).order("ordem"),
    db.from("cloud_setlists").select("*").eq("banda_id", banda.id).order("ordem"),
  ]);

  const songs: Song[] = (musicas.data ?? []).map((m) => ({
    id: m.song_id,
    titulo: m.titulo,
    artista: m.artista,
    tom: m.tom,
    bpm: m.bpm,
    ritmo: m.ritmo,
    observacoes: m.observacoes,
    letra: m.letra,
    anexos: (m.anexos ?? []) as unknown as Anexo[],
    criadoEm: new Date(m.criado_em).getTime(),
    atualizadoEm: new Date(m.atualizado_em ?? m.criado_em).getTime(),
  }));
  const setlists: Setlist[] = (repertorios.data ?? []).map((r) => ({
    id: r.setlist_id,
    nome: r.nome,
    local: r.local,
    data: r.data,
    songIds: (r.song_ids ?? []) as unknown as string[],
    criadoEm: new Date(r.criado_em).getTime(),
    atualizadoEm: new Date(r.atualizado_em ?? r.criado_em).getTime(),
  }));

  return { songs, setlists } as AppData;
}

export async function entrarUsuario(usuario: string, senha: string) {
  const db = await admin();
  const { data } = await db
    .from("app_usuarios")
    .select("id, usuario, senha_hash, banda_id, pode_apagar, pode_backup, pode_editar, pode_agenda, pode_adicionar_shows, bandas(nome)")
    .eq("usuario", usuario.trim().toLowerCase())
    .maybeSingle();
  if (!data || data.senha_hash !== hashSenha(senha)) throw new Error("Usuário ou senha inválidos.");
  const banda = data.bandas as unknown as { nome: string } | null;
  if (!banda) throw new Error("Usuário sem banda vinculada.");
  return {
    banda: banda.nome,
    bandaId: data.banda_id as string,
    podeApagar: data.pode_apagar ?? false,
    podeBackup: data.pode_backup ?? false,
    podeEditar: data.pode_editar ?? false,
    podeAgenda: data.pode_agenda ?? false,
    podeAdicionarShows: data.pode_adicionar_shows ?? false,
    usuarioId: data.id as string,
  };
}

/** Sincronização bidirecional: junta o que veio do aparelho com o que está na nuvem. */
export async function sincronizar(usuario: string, senha: string, locais: AppData) {
  const conta = await entrarUsuario(usuario, senha);
  const nuvem = await baixarDaBanda(conta.bandaId);
  const permitidos = conta.podeEditar
    ? locais
    : {
        songs: locais.songs.map((song) => nuvem.songs.find((salva) => salva.id === song.id) ?? song),
        setlists: locais.setlists.map(
          (setlist) => nuvem.setlists.find((salvo) => salvo.id === setlist.id) ?? setlist,
        ),
      };
  const mesclado = mesclarDados(permitidos, nuvem);
  await publicarShow(conta.bandaId, mesclado);
  return {
    banda: conta.banda,
    podeApagar: conta.podeApagar,
    podeBackup: conta.podeBackup,
    podeEditar: conta.podeEditar,
    podeAgenda: conta.podeAgenda,
    podeAdicionarShows: conta.podeAdicionarShows,
    dados: mesclado,
  };
}

const TIPOS_ANEXO = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function enviarAnexo(entrada: {
  usuario: string;
  senha: string;
  id: string;
  nome: string;
  tipo: string;
  dados: string;
}) {
  const conta = await entrarUsuario(entrada.usuario, entrada.senha);
  if (!TIPOS_ANEXO.has(entrada.tipo)) throw new Error("Envie apenas PDF ou imagem.");
  const base64 = entrada.dados.includes(",") ? entrada.dados.split(",")[1] : entrada.dados;
  if (!base64) throw new Error("O arquivo está vazio.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("O arquivo ultrapassa o limite de 3 MB.");
  const extensao = entrada.tipo === "application/pdf" ? "pdf" : entrada.tipo.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const caminho = `${conta.bandaId}/${entrada.id}.${extensao}`;
  const db = await admin();
  const { error } = await db.storage.from("anexos").upload(caminho, bytes, {
    contentType: entrada.tipo,
    upsert: true,
  });
  if (error) throw new Error("Não foi possível enviar o anexo para a nuvem.");
  return { caminho };
}

export async function obterUrlAnexo(usuario: string, senha: string, caminho: string) {
  const conta = await entrarUsuario(usuario, senha);
  if (!caminho.startsWith(`${conta.bandaId}/`)) throw new Error("Anexo não autorizado.");
  const db = await admin();
  const { data, error } = await db.storage.from("anexos").createSignedUrl(caminho, 300);
  if (error || !data?.signedUrl) throw new Error("Não foi possível abrir o anexo.");
  return { url: data.signedUrl };
}

export type EventoAgenda = {
  id: string;
  tipo: "show" | "particular" | "folga";
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  descricao: string;
  valor: number | null;
  status: "agendado" | "concluido" | "cancelado";
};

async function contaAgenda(usuario: string, senha: string) {
  const conta = await entrarUsuario(usuario, senha);
  if (!conta.podeAgenda) throw new Error("Você não tem acesso à agenda.");
  return conta;
}

export async function listarAgenda(usuario: string, senha: string) {
  const conta = await contaAgenda(usuario, senha);
  const db = await admin();
  const { data, error } = await db
    .from("agenda_eventos")
    .select("*")
    .eq("usuario_id", conta.usuarioId)
    .order("data")
    .order("hora_inicio");
  if (error) throw error;
  const eventos: EventoAgenda[] = (data ?? []).map((e) => ({
    id: e.id,
    tipo: e.tipo as EventoAgenda["tipo"],
    data: e.data,
    horaInicio: e.hora_inicio,
    horaFim: e.hora_fim,
    local: e.local,
    descricao: e.descricao,
    valor: e.valor === null ? null : Number(e.valor),
    status: e.status as EventoAgenda["status"],
  }));
  return { eventos, podeAgenda: conta.podeAgenda, podeAdicionarShows: conta.podeAdicionarShows };
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$|^$/;

export async function salvarEvento(usuario: string, senha: string, ev: Omit<EventoAgenda, "id" | "status"> & { id?: string | undefined }) {
  const conta = await contaAgenda(usuario, senha);
  const db = await admin();
  if (!["show", "particular", "folga"].includes(ev.tipo)) throw new Error("Tipo inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.data)) throw new Error("Informe a data.");
  if (!HORA.test(ev.horaInicio) || !HORA.test(ev.horaFim)) throw new Error("Horário inválido.");
  if (ev.tipo === "show") {
    if (!conta.podeAdicionarShows) throw new Error("Você não tem privilégio para adicionar shows.");
    if (!ev.local.trim()) throw new Error("Informe o local do show.");
  }
  if (ev.tipo === "particular" && !ev.descricao.trim()) throw new Error("Informe a descrição.");
  if (ev.id) {
    const { data: atual } = await db.from("agenda_eventos").select("tipo").eq("id", ev.id).eq("usuario_id", conta.usuarioId).maybeSingle();
    if (!atual) throw new Error("Evento não encontrado.");
    if (atual.tipo === "show" && !conta.podeAdicionarShows) throw new Error("Você não tem privilégio para alterar shows.");
  }
  const linha = {
    usuario_id: conta.usuarioId,
    tipo: ev.tipo,
    data: ev.data,
    hora_inicio: ev.tipo === "folga" ? "" : ev.horaInicio,
    hora_fim: ev.tipo === "folga" ? "" : ev.horaFim,
    local: ev.tipo === "show" ? ev.local.trim().slice(0, 200) : "",
    descricao: ev.tipo === "show" ? "" : ev.descricao.trim().slice(0, 500),
    valor: ev.tipo === "show" && ev.valor !== null && Number.isFinite(ev.valor) ? Math.max(0, ev.valor) : null,
    atualizado_em: new Date().toISOString(),
  };
  const r = ev.id
    ? await db.from("agenda_eventos").update(linha).eq("id", ev.id).eq("usuario_id", conta.usuarioId)
    : await db.from("agenda_eventos").insert(linha);
  if (r.error) throw r.error;
  return listarAgenda(usuario, senha);
}

async function eventoDoUsuario(usuario: string, senha: string, id: string) {
  const conta = await contaAgenda(usuario, senha);
  const db = await admin();
  const { data } = await db.from("agenda_eventos").select("tipo").eq("id", id).eq("usuario_id", conta.usuarioId).maybeSingle();
  if (!data) throw new Error("Evento não encontrado.");
  if (data.tipo === "show" && !conta.podeAdicionarShows) throw new Error("Você não tem privilégio para alterar shows.");
  return { conta, db, tipo: data.tipo };
}

export async function excluirEvento(usuario: string, senha: string, id: string) {
  const { conta, db } = await eventoDoUsuario(usuario, senha, id);
  const { error } = await db.from("agenda_eventos").delete().eq("id", id).eq("usuario_id", conta.usuarioId);
  if (error) throw error;
  return listarAgenda(usuario, senha);
}

export async function statusEvento(usuario: string, senha: string, id: string, status: EventoAgenda["status"]) {
  if (!["agendado", "concluido", "cancelado"].includes(status)) throw new Error("Status inválido.");
  const { conta, db, tipo } = await eventoDoUsuario(usuario, senha, id);
  if (tipo !== "show") throw new Error("Status só se aplica a shows.");
  const { error } = await db.from("agenda_eventos").update({ status, atualizado_em: new Date().toISOString() }).eq("id", id).eq("usuario_id", conta.usuarioId);
  if (error) throw error;
  return listarAgenda(usuario, senha);
}
