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
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
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
  const tarefas: Promise<void>[] = [];
  for (const musica of dados.songs) {
    for (const anexo of musica.anexos ?? []) {
      const blob = dataUrlParaBlob(anexo);
      if (blob) tarefas.push(guardarAnexoOffline(anexo.id, blob));
    }
  }
  await Promise.all(tarefas);
}