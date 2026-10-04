import type { Anexo, AppData } from "./repertorio-store";

const DB = "repertorio-facil-anexos";
const STORE = "arquivos";

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Não foi possível abrir os anexos offline."));
  });
}

export async function guardarAnexoOffline(id: string, blob: Blob): Promise<void> {
  const db = await abrir();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Não foi possível salvar o arquivo neste aparelho."));
    });
  } finally {
    db.close();
  }
}

export async function lerAnexoOffline(id: string): Promise<Blob | null> {
  const db = await abrir();
  const resultado = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return resultado ?? null;
}

function dataUrlParaBlob(anexo: Anexo): Blob | null {
  if (!anexo.dados) return null;
  try {
    const base64 = anexo.dados.includes(",") ? anexo.dados.split(",")[1] : anexo.dados;
    if (!base64) return null;
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Blob([bytes], { type: anexo.tipo });
  } catch {
    return null;
  }
}

export async function guardarLegadoOffline(dados: AppData): Promise<void> {
  for (const musica of dados.songs) {
    for (const anexo of musica.anexos ?? []) {
      const blob = dataUrlParaBlob(anexo);
      if (blob) await guardarAnexoOffline(anexo.id, blob);
    }
  }
}

/** Remove arquivos que não pertencem mais a nenhuma música do aparelho. */
export async function limparAnexosOffline(dados: AppData): Promise<void> {
  const manter = new Set(dados.songs.flatMap((musica) => (musica.anexos ?? []).map((anexo) => anexo.id)));
  const db = await abrir();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const cursor = tx.objectStore(STORE).openCursor();
      cursor.onsuccess = () => {
        const item = cursor.result;
        if (!item) return;
        if (!manter.has(String(item.key))) item.delete();
        item.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export type CopiaOffline = { total: number; disponiveis: number; pendentes: number };

/** Só considera disponível o arquivo gravado na memória local. */
export async function prepararCopiaOffline(
  dados: AppData,
  baixar?: (anexo: Anexo) => Promise<Blob>,
): Promise<CopiaOffline> {
  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    try { await navigator.storage.persist(); } catch { /* O navegador decide se permite persistência. */ }
  }
  await guardarLegadoOffline(dados);
  const anexos = new Map(dados.songs.flatMap((musica) => (musica.anexos ?? []).map((anexo) => [anexo.id, anexo] as const)));
  let disponiveis = 0;
  for (const anexo of anexos.values()) {
    if (await lerAnexoOffline(anexo.id)) {
      disponiveis++;
      continue;
    }
    if (!baixar || !anexo.caminho) continue;
    let blob: Blob;
    try {
      blob = await baixar(anexo);
    } catch {
      // Uma falha de rede fica pendente para a próxima tentativa.
      continue;
    }
    // Erros de armazenamento não podem ser confundidos com download concluído.
    await guardarAnexoOffline(anexo.id, blob);
    disponiveis++;
  }
  // A cópia dos dados não basta: também prepara as telas para reabrir o app.
  const { prepararTelasOffline } = await import("./offline-app");
  await prepararTelasOffline(dados);
  window.dispatchEvent(new Event("repertorio-copia-atualizada"));
  return { total: anexos.size, disponiveis, pendentes: anexos.size - disponiveis };
}

/** Inclui os arquivos no envio sem internet, não apenas os endereços da nuvem. */
export async function criarDadosPortateis(dados: AppData): Promise<AppData> {
  const songs: AppData["songs"] = [];
  for (const musica of dados.songs) {
    const anexos: Anexo[] = [];
    for (const anexo of musica.anexos ?? []) {
      if (anexo.dados) {
        anexos.push(anexo);
        continue;
      }
      const blob = await lerAnexoOffline(anexo.id);
      if (!blob) throw new Error(`O arquivo “${anexo.nome}” não está neste aparelho. Sincronize por Wi-Fi antes de enviar.`);
      const conteudo = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result));
        leitor.onerror = () => reject(leitor.error);
        leitor.onabort = () => reject(new Error("Leitura do arquivo cancelada."));
        leitor.readAsDataURL(blob);
      });
      anexos.push({ ...anexo, dados: conteudo });
    }
    songs.push({ ...musica, anexos });
  }
  return { ...dados, songs };
}