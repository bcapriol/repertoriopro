import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { configInicial, contratoInicial, validarContrato, type ConfigContratos, type ContratoDados } from "./contratos";
import { gerarPdfContrato } from "./contratos-pdf.server";

type Cred = { usuario: string; senha: string };
async function autenticar(cred: Cred) {
  const { data, error } = await db.from("app_usuarios").select("id, banda_id, senha_hash, pode_editar, usuario").eq("usuario", cred.usuario.trim().toLowerCase()).maybeSingle();
  if (error) throw error;
  const hash = createHash("sha256").update(cred.senha, "utf8").digest();
  const esperado = Buffer.from(data?.senha_hash ?? "", "hex");
  if (!data || hash.length !== esperado.length || !timingSafeEqual(hash, esperado)) throw new Error("Usuário ou senha inválidos.");
  return data;
}
export async function listarContratos(cred: Cred) {
  const usuario = await autenticar(cred);
  const { data, error } = await db.from("contratos_eventos").select("id, numero, status, criado_em, atualizado_em, dados, pdf_caminho, pdf_emissao").eq("banda_id", usuario.banda_id).order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, numero: row.numero, status: row.status, criadoEm: row.criado_em, atualizadoEm: row.atualizado_em, dados: row.dados as unknown as ContratoDados, pdfCaminho: row.pdf_caminho, pdfEmissao: row.pdf_emissao }));
}
export async function lerConfiguracao(cred: Cred) {
  const usuario = await autenticar(cred);
  if (!usuario.pode_editar) throw new Error("Você não tem permissão para consultar as configurações dos contratos.");
  const { data, error } = await db.from("contratos_configuracoes").select("dados").eq("banda_id", usuario.banda_id).maybeSingle();
  if (error) throw error;
  const padrao = configInicial();
  const salvo = data?.dados as Partial<ConfigContratos> | undefined;
  return { ...padrao, ...salvo, contratado: { ...padrao.contratado, ...salvo?.contratado } };
}
export async function salvarConfiguracao(cred: Cred, config: ConfigContratos) {
  const usuario = await autenticar(cred);
  if (!usuario.pode_editar) throw new Error("Somente usuários com permissão de edição podem alterar as configurações.");
  if (!config || !config.contratado || JSON.stringify(config).length > 50000) throw new Error("Configurações inválidas ou muito grandes.");
  const { error } = await db.from("contratos_configuracoes").upsert({ banda_id: usuario.banda_id, dados: config as unknown as Json, atualizado_em: new Date().toISOString() });
  if (error) throw error;
  return true;
}
export async function salvarRascunho(cred: Cred, dados: ContratoDados, id?: string) {
  const usuario = await autenticar(cred);
  if (!usuario.pode_editar) throw new Error("Você não tem permissão para criar ou editar contratos.");
  if (!dados || JSON.stringify(dados).length > 200000) throw new Error("Dados do contrato muito grandes.");
  if (id) {
    const { data, error } = await db.from("contratos_eventos").update({ dados: dados as unknown as Json, atualizado_em: new Date().toISOString() }).eq("id", id).eq("banda_id", usuario.banda_id).eq("status", "Rascunho").select("id, numero").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Rascunho não encontrado ou não editável.");
    return data;
  }
  const ano = new Date().getFullYear();
  // Índice exclusivo assegura que tentativas concorrentes nunca reutilizem o mesmo número.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data: ultimo, error: erroBusca } = await db.from("contratos_eventos").select("sequencia").eq("banda_id", usuario.banda_id).eq("ano", ano).order("sequencia", { ascending: false }).limit(1);
    if (erroBusca) throw erroBusca;
    const sequencia = (ultimo?.[0]?.sequencia ?? 0) + 1;
    const numero = `ME-${ano}-${String(sequencia).padStart(4, "0")}`;
    const { data, error } = await db.from("contratos_eventos").insert({ banda_id: usuario.banda_id, usuario_id: usuario.id, ano, sequencia, numero, dados: dados as unknown as Json }).select("id, numero").single();
    if (!error && data) return data;
    if (!error) throw new Error("Não foi possível salvar o contrato.");
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não foi possível reservar o número do contrato. Tente novamente.");
}
export async function novoContrato(cred: Cred) {
  const config = await lerConfiguracao(cred);
  return contratoInicial(config);
}

export async function gerarContrato(cred: Cred, id: string) {
  const usuario = await autenticar(cred);
  if (!usuario.pode_editar) throw new Error("Você não tem permissão para gerar contratos.");
  const { data: contrato, error } = await db.from("contratos_eventos").select("id, numero, status, dados, pdf_caminho").eq("id", id).eq("banda_id", usuario.banda_id).maybeSingle();
  if (error) throw error;
  if (!contrato || contrato.status !== "Rascunho" || contrato.pdf_caminho) throw new Error("Apenas rascunhos ainda não gerados podem ser finalizados.");
  const dados = contrato.dados as unknown as ContratoDados;
  const pendencias = validarContrato(dados);
  if (pendencias.length) throw new Error(`Confira o contrato antes de gerar: ${pendencias.join(" ")}`);
  const emissao = new Date().toISOString().slice(0, 10);
  const bytes = gerarPdfContrato(dados, contrato.numero, emissao);
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("O PDF ultrapassa o limite de 3 MB. Reduza as observações ou o repertório.");
  const caminho = `${usuario.banda_id}/contratos/${id}/${randomUUID()}.pdf`;
  const { error: erroUpload } = await db.storage.from("anexos").upload(caminho, bytes, { contentType: "application/pdf", upsert: false });
  if (erroUpload) throw new Error("Não foi possível guardar o PDF. Tente novamente.");
  const { data: salvo, error: erroSalvar } = await db.from("contratos_eventos").update({ status: "Pronto para envio", pdf_caminho: caminho, pdf_emissao: emissao, atualizado_em: new Date().toISOString() }).eq("id", id).eq("banda_id", usuario.banda_id).eq("status", "Rascunho").is("pdf_caminho", null).select("id").maybeSingle();
  if (erroSalvar || !salvo) {
    await db.storage.from("anexos").remove([caminho]);
    throw new Error("O contrato foi alterado enquanto era gerado. Atualize a página e tente novamente.");
  }
  return true;
}

export async function urlPdfContrato(cred: Cred, id: string) {
  const usuario = await autenticar(cred);
  const { data: contrato, error } = await db.from("contratos_eventos").select("numero, pdf_caminho").eq("id", id).eq("banda_id", usuario.banda_id).maybeSingle();
  if (error) throw error;
  if (!contrato?.pdf_caminho || !contrato.pdf_caminho.startsWith(`${usuario.banda_id}/contratos/${id}/`)) throw new Error("PDF não encontrado para este contrato.");
  const { data, error: erroUrl } = await db.storage.from("anexos").createSignedUrl(contrato.pdf_caminho, 300);
  if (erroUrl || !data?.signedUrl) throw new Error("Não foi possível abrir o PDF.");
  return { url: data.signedUrl, nome: `${contrato.numero}.pdf` };
}
