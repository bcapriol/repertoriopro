import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type Anexo = {
  id: string;
  nome: string;
  tipo: string;
  dados?: string;
  caminho?: string;
};

export type Song = {
  id: string;
  titulo: string;
  artista: string;
  tom: string;
  bpm: string;
  ritmo?: string;
  observacoes: string;
  letra: string;
  anexos?: Anexo[];
  criadoEm: number;
  atualizadoEm?: number;
};

export type Setlist = {
  id: string;
  nome: string;
  local: string;
  data: string;
  songIds: string[];
  criadoEm: number;
  atualizadoEm?: number;
};

export type AppData = { songs: Song[]; setlists: Setlist[] };

const KEY = "repertorio-facil-data";
const EMPTY: AppData = { songs: [], setlists: [] };

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: AppData | null = null;
let carregando: Promise<void> | null = null;
let fila: Promise<void> = Promise.resolve();

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("repertorio-facil-dados", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("dados");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Não foi possível abrir a memória do aparelho."));
  });
}

async function bancoLer(): Promise<AppData | undefined> {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("dados", "readonly");
    const req = tx.objectStore("dados").get("atual");
    req.onsuccess = () => resolve(req.result as AppData | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function bancoSalvar(data: AppData): Promise<void> {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("dados", "readwrite");
    tx.objectStore("dados").put(data, "atual");
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

/** Migra os dados antigos sem removê-los antes de confirmar que a cópia foi salva. */
export function prepararDados(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!carregando) {
    carregando = (async () => {
      const guardado = await bancoLer();
      if (guardado) {
        cache = guardado;
      } else {
        const antigo = readData();
        await bancoSalvar(antigo);
        cache = antigo;
      }
      try { window.localStorage.removeItem(KEY); } catch { /* storage indisponível */ }
      listeners.forEach((l) => l());
    })().catch(() => {
      carregando = null;
      throw new Error("Não foi possível acessar os dados deste aparelho. Tente liberar espaço e abrir novamente.");
    });
  }
  return carregando;
}

export function readData(): AppData {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as AppData) : EMPTY;
    cache = {
      songs: Array.isArray(parsed.songs) ? parsed.songs : [],
      setlists: Array.isArray(parsed.setlists) ? parsed.setlists : [],
    };
  } catch {
    cache = EMPTY;
  }
  return cache;
}

type Carimbavel = { id: string; atualizadoEm?: number };

function carimbar<T extends Carimbavel>(anteriores: T[], proximos: T[], agora: number): T[] {
  const antes = new Map(anteriores.map((i) => [i.id, i]));
  return proximos.map((item) => {
    const velho = antes.get(item.id);
    const igual =
      velho &&
      JSON.stringify({ ...velho, atualizadoEm: 0 }) === JSON.stringify({ ...item, atualizadoEm: 0 });
    if (igual) return { ...item, atualizadoEm: velho.atualizadoEm } as T;
    return { ...item, atualizadoEm: agora } as T;
  });
}

export function writeData(entrada: AppData): Promise<void> {
  const anterior = readData();
  const agora = Date.now();
  const next: AppData = {
    songs: carimbar(anterior.songs, entrada.songs, agora),
    setlists: carimbar(anterior.setlists, entrada.setlists, agora),
  };
  if (typeof window === "undefined") return Promise.resolve();
  const salvar = fila.catch(() => {}).then(() => bancoSalvar(next));
  fila = salvar;
  return salvar.then(() => {
    cache = next;
    try { window.localStorage.removeItem(KEY); } catch { /* storage indisponível */ }
    listeners.forEach((l) => l());
  });
}

export function useAppData() {
  const [data, setData] = useState<AppData>(EMPTY);

  useEffect(() => {
    setData(readData());
    const listener = () => setData({ ...readData() });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((fn: (prev: AppData) => AppData) => {
    void writeData(fn(readData())).catch(() => {
      toast.error("Não foi possível salvar. Libere espaço no aparelho e tente novamente.");
    });
  }, []);

  return { data, update };
}

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

