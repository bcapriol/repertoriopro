import { createHash, timingSafeEqual } from "node:crypto";
import type { AppData, Anexo, Setlist, Song } from "./repertorio-store";
import { mesclarDados } from "./sync-merge";
import { criarMensagemShow } from "./agenda-mensagem";

export type BandaResumo = {
  id: string;
  nome: string;
  usuarios: { id: string; usuario: string; senha: string; podeApagar: boolean; podeBackup: boolean; podeEditar: boolean; podeAgenda: boolean; podeAdicionarShows: boolean; podeCopiarMensagensShows: boolean }[];
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
    db.from("app_usuarios").select("id, usuario, senha_visivel, banda_id, pode_apagar, pode_backup, pode_editar, pode_agenda, pode_adicionar_shows, pode_copiar_mensagens_shows"),
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
        podeCopiarMensagensShows: u.pode_copiar_mensagens_shows ?? false,
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
  privilegios: { podeApagar: boolean; podeBackup: boolean; podeEditar: boolean; podeAgenda: boolean; podeAdicionarShows: boolean; podeCopiarMensagensShows: boolean },
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
      pode_copiar_mensagens_shows: privilegios.podeCopiarMensagensShows === true,
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

  // Lê até a última página, sem limitar a sincronização ao máximo de uma consulta.
  const lerTodas = async <T,>(pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>) => {
    const data: T[] = [];
    const tamanho = 500;
    for (let de = 0; ; de += tamanho) {
      const resultado = await pagina(de, de + tamanho - 1);
      if (resultado.error) throw resultado.error;
      const itens = resultado.data ?? [];
      data.push(...itens);
      if (itens.length < tamanho) break;
    }
    return { data, error: null };
  };
  const [musicas, repertorios, exclusoes] = await Promise.all([
    lerTodas((de, ate) => db.from("cloud_songs").select("*").eq("banda_id", banda.id).order("ordem").order("id").range(de, ate)),
    lerTodas((de, ate) => db.from("cloud_setlists").select("*").eq("banda_id", banda.id).order("ordem").order("id").range(de, ate)),
    lerTodas((de, ate) => db.from("cloud_exclusoes").select("tipo, item_id, atualizado_em").eq("banda_id", banda.id).order("id").range(de, ate)),
  ]);
  if (musicas.error) throw musicas.error;
  if (repertorios.error) throw repertorios.error;
  if (exclusoes.error) throw exclusoes.error;

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

  return {
    songs,
    setlists,
    deletedSongs: (exclusoes.data ?? []).filter((e) => e.tipo === "song").map((e) => ({ id: e.item_id, atualizadoEm: new Date(e.atualizado_em).getTime() })),
    deletedSetlists: (exclusoes.data ?? []).filter((e) => e.tipo === "setlist").map((e) => ({ id: e.item_id, atualizadoEm: new Date(e.atualizado_em).getTime() })),
  } as AppData;
}

const PRESENCA_VALIDADE_MS = 75_000;

/** O acesso à presença passa sempre pela conta do aplicativo, nunca pelo cliente público. */
export async function atualizarPresenca(usuario: string, senha: string, sessaoId: string) {
  const conta = await entrarUsuario(usuario, senha);
  const db = await admin();
  const agora = new Date();
  const { error } = await db.from("presencas_online").upsert({
    usuario_id: conta.usuarioId,
    banda_id: conta.bandaId,
    sessao_id: sessaoId,
    visto_em: agora.toISOString(),
  });
  if (error) throw error;
  await db.from("presencas_online").delete()
    .eq("banda_id", conta.bandaId)
    .lt("visto_em", new Date(agora.getTime() - PRESENCA_VALIDADE_MS).toISOString());
}

export async function sairDaPresenca(usuario: string, senha: string, sessaoId: string) {
  const conta = await entrarUsuario(usuario, senha);
  const db = await admin();
  const { error } = await db.from("presencas_online").delete()
    .eq("usuario_id", conta.usuarioId).eq("sessao_id", sessaoId);
  if (error) throw error;
}

export async function listarPresencas(usuario: string, senha: string): Promise<string[]> {
  const conta = await entrarUsuario(usuario, senha);
  const db = await admin();
  const { data, error } = await db.from("presencas_online")
    .select("usuario_id, app_usuarios(usuario)")
    .eq("banda_id", conta.bandaId)
    .gte("visto_em", new Date(Date.now() - PRESENCA_VALIDADE_MS).toISOString());
  if (error) throw error;
  return [...new Set((data ?? []).map((linha) =>
    (linha.app_usuarios as unknown as { usuario: string } | null)?.usuario,
  ).filter((nome): nome is string => Boolean(nome)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function entrarUsuario(usuario: string, senha: string) {
  const db = await admin();
  const { data } = await db
    .from("app_usuarios")
    .select("id, usuario, senha_hash, banda_id, pode_apagar, pode_backup, pode_editar, pode_agenda, pode_adicionar_shows, pode_copiar_mensagens_shows, bandas(nome)")
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
    podeCopiarMensagensShows: data.pode_copiar_mensagens_shows ?? false,
    usuarioId: data.id as string,
  };
}

/** Sincronização bidirecional: junta o que veio do aparelho com o que está na nuvem. */
export async function sincronizar(usuario: string, senha: string, locais: AppData) {
  const conta = await entrarUsuario(usuario, senha);
  const nuvem = await baixarDaBanda(conta.bandaId);
  const permitidos: AppData = {
    songs: conta.podeEditar
      ? locais.songs
      : locais.songs.map((song) => nuvem.songs.find((salva) => salva.id === song.id) ?? song),
    setlists: conta.podeEditar
      ? locais.setlists
      : locais.setlists.map((setlist) => nuvem.setlists.find((salvo) => salvo.id === setlist.id) ?? setlist),
    deletedSongs: conta.podeApagar ? locais.deletedSongs : [],
    deletedSetlists: conta.podeApagar ? locais.deletedSetlists : [],
  };
  const mesclado = mesclarDados(permitidos, nuvem);
  {
    const db = await admin();
    const musicasRemovidas = nuvem.songs.filter((s) => !mesclado.songs.some((item) => item.id === s.id));
    const listasRemovidas = nuvem.setlists.filter((s) => !mesclado.setlists.some((item) => item.id === s.id));
    if (musicasRemovidas.length) {
      const { error } = await db.from("cloud_songs").delete().eq("banda_id", conta.bandaId).in("song_id", musicasRemovidas.map((s) => s.id));
      if (error) throw error;
    }
    if (listasRemovidas.length) {
      const { error } = await db.from("cloud_setlists").delete().eq("banda_id", conta.bandaId).in("setlist_id", listasRemovidas.map((s) => s.id));
      if (error) throw error;
    }
    const alteradas = mesclado.songs.filter((s) => !nuvem.songs.some((n) => n.id === s.id && (n.atualizadoEm ?? n.criadoEm) >= (s.atualizadoEm ?? s.criadoEm)));
    for (let inicio = 0; inicio < alteradas.length; inicio += 100) {
      const { error } = await db.from("cloud_songs").upsert(alteradas.slice(inicio, inicio + 100).map((s, i) => ({
        banda_id: conta.bandaId, song_id: s.id, titulo: s.titulo, artista: s.artista ?? "", tom: s.tom ?? "",
        bpm: s.bpm ?? "", ritmo: s.ritmo ?? "", observacoes: s.observacoes ?? "", letra: s.letra ?? "",
        anexos: (s.anexos ?? []) as unknown as never, ordem: inicio + i,
        atualizado_em: new Date(s.atualizadoEm ?? s.criadoEm).toISOString(),
      })), { onConflict: "banda_id,song_id" });
      if (error) throw error;
    }
    const listasAlteradas = mesclado.setlists.filter((s) => !nuvem.setlists.some((n) => n.id === s.id && (n.atualizadoEm ?? n.criadoEm) >= (s.atualizadoEm ?? s.criadoEm)));
    for (let inicio = 0; inicio < listasAlteradas.length; inicio += 100) {
      const { error } = await db.from("cloud_setlists").upsert(listasAlteradas.slice(inicio, inicio + 100).map((s, i) => ({
        banda_id: conta.bandaId, setlist_id: s.id, nome: s.nome, local: s.local ?? "", data: s.data ?? "",
        song_ids: s.songIds as unknown as never, ordem: inicio + i,
        atualizado_em: new Date(s.atualizadoEm ?? s.criadoEm).toISOString(),
      })), { onConflict: "banda_id,setlist_id" });
      if (error) throw error;
    }
  }
  if (conta.podeApagar) {
    const exclusoes = [
      ...(mesclado.deletedSongs ?? []).map((e) => ({ banda_id: conta.bandaId, tipo: "song", item_id: e.id, atualizado_em: new Date(e.atualizadoEm).toISOString() })),
      ...(mesclado.deletedSetlists ?? []).map((e) => ({ banda_id: conta.bandaId, tipo: "setlist", item_id: e.id, atualizado_em: new Date(e.atualizadoEm).toISOString() })),
    ];
    const db = await admin();
    for (let inicio = 0; inicio < exclusoes.length; inicio += 100) {
      const { error } = await db.from("cloud_exclusoes").upsert(exclusoes.slice(inicio, inicio + 100), { onConflict: "banda_id,tipo,item_id" });
      if (error) throw error;
    }
  }
  // Só confirma o envio depois de reler todos os registros gravados.
  const confirmado = await baixarDaBanda(conta.bandaId);
  const conferir = <T extends { id: string; criadoEm: number; atualizadoEm?: number }>(esperados: T[], salvos: T[]) => {
    const versoes = new Map(salvos.map((item) => [item.id, item.atualizadoEm ?? item.criadoEm]));
    return esperados.every((item) => (versoes.get(item.id) ?? -1) >= (item.atualizadoEm ?? item.criadoEm));
  };
  const conferirExclusoes = (esperadas: AppData["deletedSongs"], salvas: AppData["deletedSongs"]) => {
    const versoes = new Map((salvas ?? []).map((item) => [item.id, item.atualizadoEm]));
    return (esperadas ?? []).every((item) => (versoes.get(item.id) ?? -1) >= item.atualizadoEm);
  };
  if (!conferir(mesclado.songs, confirmado.songs)
    || !conferir(mesclado.setlists, confirmado.setlists)
    || (conta.podeApagar && (!conferirExclusoes(mesclado.deletedSongs, confirmado.deletedSongs)
      || !conferirExclusoes(mesclado.deletedSetlists, confirmado.deletedSetlists)))) {
    throw new Error("O envio ainda não foi confirmado por completo. A sincronização precisa tentar novamente.");
  }
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
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  descricao: string;
  valor: number | null;
  cliente: string;
  cidade: string;
  consumacaoPessoas: number | null;
  consumacaoValor: number | null;
  tipoValor: "cache" | "couvert";
  mensagemContratante?: string;
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
  const eventos: EventoAgenda[] = (data ?? []).map((e) => {
    const evento = converterEventoAgenda(e);
    if (conta.podeCopiarMensagensShows && evento.tipo === "show") {
      evento.mensagemContratante = e.mensagem_contratante || criarMensagemShow(evento, evento.status === "cancelado" ? "cancelamento" : "agendamento");
    }
    return evento;
  });
  return { eventos, podeAgenda: conta.podeAgenda, podeAdicionarShows: conta.podeAdicionarShows, podeCopiarMensagensShows: conta.podeCopiarMensagensShows };
}

function converterEventoAgenda(e: import("@/integrations/supabase/types").Database["public"]["Tables"]["agenda_eventos"]["Row"]): EventoAgenda {
  return {
    id: e.id, tipo: e.tipo as EventoAgenda["tipo"], data: e.data,
    dataFim: e.data_fim ?? e.data, horaInicio: e.hora_inicio, horaFim: e.hora_fim,
    local: e.local, descricao: e.descricao, valor: e.valor === null ? null : Number(e.valor),
    cliente: e.cliente, cidade: e.cidade, consumacaoPessoas: e.consumacao_pessoas,
    consumacaoValor: e.consumacao_valor === null ? null : Number(e.consumacao_valor),
    tipoValor: e.tipo_valor === "couvert" ? "couvert" : "cache",
    status: e.status as EventoAgenda["status"],
  };
}

export async function mensagemEvento(usuario: string, senha: string, id: string) {
  const resultado = await listarAgenda(usuario, senha);
  if (!resultado.podeCopiarMensagensShows) throw new Error("Você não tem privilégio para copiar mensagens de shows.");
  const evento = resultado.eventos.find((e) => e.id === id && e.tipo === "show");
  if (!evento?.mensagemContratante) throw new Error("Show não encontrado.");
  return evento.mensagemContratante;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$|^$/;

export async function salvarEvento(usuario: string, senha: string, ev: Omit<EventoAgenda, "id" | "status"> & { id?: string | undefined }, confirmarConflito = false) {
  const conta = await contaAgenda(usuario, senha);
  const db = await admin();
  if (!["show", "particular", "folga"].includes(ev.tipo)) throw new Error("Tipo inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.data) || !Number.isFinite(Date.parse(`${ev.data}T00:00:00Z`))) throw new Error("Informe a data.");
  if (ev.tipo === "folga" && (!/^\d{4}-\d{2}-\d{2}$/.test(ev.dataFim) || !Number.isFinite(Date.parse(`${ev.dataFim}T00:00:00Z`)) || ev.dataFim < ev.data)) throw new Error("A data final da folga deve ser igual ou posterior à inicial.");
  if (!HORA.test(ev.horaInicio) || !HORA.test(ev.horaFim)) throw new Error("Horário inválido.");
  if (ev.tipo === "show") {
    if (!conta.podeAdicionarShows) throw new Error("Você não tem privilégio para adicionar shows.");
    if (!["cache", "couvert"].includes(ev.tipoValor)) throw new Error("Escolha cachê ou couvert.");
    if (ev.valor !== null && (!Number.isFinite(ev.valor) || ev.valor < 0 || ev.valor > 9999999999.99)) throw new Error("Informe um valor válido para o show.");
    if (ev.consumacaoValor != null && (!Number.isFinite(ev.consumacaoValor) || ev.consumacaoValor < 0 || ev.consumacaoValor > 9999999999.99)) throw new Error("Informe um valor válido para consumação.");
    if (ev.consumacaoValor != null && ev.consumacaoPessoas != null) throw new Error("Informe a consumação em pessoas ou em reais, não nas duas opções.");
  }
  if (ev.tipo === "particular" && !ev.descricao.trim()) throw new Error("Informe a descrição.");
  if (ev.tipo === "show" && ev.consumacaoPessoas != null && (!Number.isSafeInteger(ev.consumacaoPessoas) || ev.consumacaoPessoas < 0 || ev.consumacaoPessoas > 2147483647)) {
    throw new Error("Informe uma quantidade inteira e não negativa de pessoas para consumação.");
  }
  let dataAnterior: string | null = null;
  let eventoAnterior: EventoAgenda | undefined;
  if (ev.id) {
    const { data: atual, error } = await db.from("agenda_eventos").select("*").eq("id", ev.id).eq("usuario_id", conta.usuarioId).maybeSingle();
    if (error) throw error;
    if (!atual) throw new Error("Evento não encontrado.");
    if (atual.tipo === "show" && !conta.podeAdicionarShows) throw new Error("Você não tem privilégio para alterar shows.");
    dataAnterior = atual.data;
    eventoAnterior = converterEventoAgenda(atual);
  }
  if (ev.tipo === "show") {
    const { data: folgas, error: erroFolgas } = await db.from("agenda_eventos")
      .select("data, data_fim").eq("usuario_id", conta.usuarioId).eq("tipo", "folga").lte("data", ev.data);
    if (erroFolgas) throw erroFolgas;
    if (folgas?.some((folga) => (folga.data_fim ?? folga.data) >= ev.data)) {
      throw new Error("Esta data está bloqueada por uma folga. Não é possível agendar shows.");
    }
    if (dataAnterior !== ev.data) {
      const { data: showsDoDia, error: erroShows } = await db.from("agenda_eventos")
        .select("id").eq("usuario_id", conta.usuarioId).eq("tipo", "show").eq("data", ev.data).eq("status", "agendado").limit(2);
      if (erroShows) throw erroShows;
      if (!confirmarConflito && showsDoDia?.some((show) => show.id !== ev.id)) throw new Error("CONFLITO_SHOW");
    }
  }
  const linha = {
    usuario_id: conta.usuarioId,
    tipo: ev.tipo,
    data: ev.data,
    data_fim: ev.tipo === "folga" ? ev.dataFim : null,
    hora_inicio: ev.tipo === "folga" ? "" : ev.horaInicio,
    hora_fim: ev.tipo === "folga" ? "" : ev.horaFim,
    local: ev.tipo === "show" ? ev.local.trim().slice(0, 200) : "",
    descricao: ev.tipo === "show" ? "" : ev.descricao.trim().slice(0, 500),
    valor: ev.tipo === "show" && ev.valor !== null && Number.isFinite(ev.valor) ? Math.max(0, ev.valor) : null,
    cliente: ev.tipo === "show" ? (ev.cliente ?? "").trim().slice(0, 200) : "",
    cidade: ev.tipo === "show" ? (ev.cidade ?? "").trim().slice(0, 200) : "",
    consumacao_pessoas: ev.tipo === "show" ? ev.consumacaoPessoas ?? null : null,
    consumacao_valor: ev.tipo === "show" ? ev.consumacaoValor ?? null : null,
    tipo_valor: ev.tipo === "show" ? ev.tipoValor : "cache",
    atualizado_em: new Date().toISOString(),
  };
  const mensagem = ev.tipo === "show" ? criarMensagemShow({
    ...ev, cliente: linha.cliente, cidade: linha.cidade, local: linha.local,
    valor: linha.valor, consumacaoPessoas: linha.consumacao_pessoas, consumacaoValor: linha.consumacao_valor,
  }, eventoAnterior?.status === "cancelado" ? "cancelamento" : ev.id ? "alteracao" : "agendamento", eventoAnterior) : "";
  const dados = { ...linha, mensagem_contratante: mensagem };
  const r = ev.id
    ? await db.from("agenda_eventos").update(dados).eq("id", ev.id).eq("usuario_id", conta.usuarioId).select("id").single()
    : await db.from("agenda_eventos").insert(dados).select("id").single();
  if (r.error) throw r.error;
  return { ...await listarAgenda(usuario, senha), eventoId: r.data.id };
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
  const { data: atual, error: erroAtual } = await db.from("agenda_eventos").select("*").eq("id", id).eq("usuario_id", conta.usuarioId).single();
  if (erroAtual) throw erroAtual;
  const mensagem = status === "concluido" ? atual.mensagem_contratante : criarMensagemShow(converterEventoAgenda(atual), status === "cancelado" ? "cancelamento" : "agendamento");
  const { error } = await db.from("agenda_eventos").update({ status, mensagem_contratante: mensagem, atualizado_em: new Date().toISOString() }).eq("id", id).eq("usuario_id", conta.usuarioId);
  if (error) throw error;
  return listarAgenda(usuario, senha);
}
