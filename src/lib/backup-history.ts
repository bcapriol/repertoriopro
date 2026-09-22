import type { AppData } from "./repertorio-store";

export type VersaoBackup = {
  id: string;
  criadoEm: number;
  origem: string;
  musicas: number;
  repertorios: number;
  dados: AppData;
};

const DB = "repertorio-facil-backups";
const STORE = "versoes";
const LIMITE = 12;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Este aparelho não guarda histórico de backups."));
      return;
    }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir o histórico."));
  });
}

function transacao<T>(modo: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, modo);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Falha no histórico de backups."));
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function listarVersoes(): Promise<VersaoBackup[]> {
  const todas = await transacao<VersaoBackup[]>("readonly", (s) => s.getAll());
  return todas.sort((a, b) => b.criadoEm - a.criadoEm);
}

export async function salvarVersao(dados: AppData, origem: string): Promise<VersaoBackup> {
  const versao: VersaoBackup = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: Date.now(),
    origem,
    musicas: dados.songs.length,
    repertorios: dados.setlists.length,
    dados,
  };
  await transacao("readwrite", (s) => s.put(versao));
  const todas = await listarVersoes();
  for (const velha of todas.slice(LIMITE)) await removerVersao(velha.id);
  return versao;
}

export async function removerVersao(id: string) {
  await transacao("readwrite", (s) => s.delete(id));
}

export async function limparVersoes() {
  await transacao("readwrite", (s) => s.clear());
}

export const formatarMomento = (ms: number) =>
  new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
