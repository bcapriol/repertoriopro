import { createHash, timingSafeEqual } from "node:crypto";
import type { AppData, Anexo, Setlist, Song } from "./repertorio-store";
import { mesclarDados } from "./sync-merge";

export type BandaResumo = {
  id: string;
  nome: string;
  usuarios: { id: string; usuario: string; senha: string; podeApagar: boolean; podeBackup: boolean }[];
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
    db.from("app_usuarios").select("id, usuario, senha_visivel, banda_id, pode_apagar, pode_backup"),
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
  privilegios: { podeApagar: boolean; podeBackup: boolean },
) {
  const db = await admin();
  const { error } = await db
    .from("app_usuarios")
    .update({ pode_apagar: privilegios.podeApagar, pode_backup: privilegios.podeBackup })
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
    .select("id, usuario, senha_hash, banda_id, pode_apagar, pode_backup, bandas(nome)")
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
  };
}

/** Sincronização bidirecional: junta o que veio do aparelho com o que está na nuvem. */
export async function sincronizar(usuario: string, senha: string, locais: AppData) {
  const conta = await entrarUsuario(usuario, senha);
  const nuvem = await baixarDaBanda(conta.bandaId);
  const mesclado = mesclarDados(locais, nuvem);
  await publicarShow(conta.bandaId, mesclado);
  return {
    banda: conta.banda,
    podeApagar: conta.podeApagar,
    podeBackup: conta.podeBackup,
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
