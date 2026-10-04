import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { guardarLegadoOffline, limparAnexosOffline } from "./anexo-cache";

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

export type Exclusao = { id: string; atualizadoEm: number };
export type AppData = { songs: Song[]; setlists: Setlist[]; deletedSongs?: Exclusao[]; deletedSetlists?: Exclusao[] };

const KEY = "repertorio-facil-data";
const EMPTY: AppData = { songs: [], setlists: [] };

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: AppData | null = null;
let carregando: Promise<void> | null = null;
let fila: Promise<void> = Promise.resolve();

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let concluido = false;
    const timer = window.setTimeout(() => {
      concluido = true;
      reject(new Error("A memória do aparelho demorou para responder. Feche outras abas do aplicativo e tente novamente, sem limpar os dados."));
    }, 15000);
    try {
      const req = indexedDB.open("repertorio-facil-dados", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("dados")) req.result.createObjectStore("dados");
      };
      req.onblocked = () => {
        window.clearTimeout(timer);
        concluido = true;
        reject(new Error("Outra aba está impedindo a abertura dos dados. Feche as outras abas do aplicativo e tente novamente, sem limpar os dados."));
      };
      req.onsuccess = () => {
        if (concluido) { req.result.close(); return; }
        window.clearTimeout(timer);
        concluido = true;
        resolve(req.result);
      };
      req.onerror = () => {
        window.clearTimeout(timer);
        concluido = true;
        reject(req.error ?? new Error("Não foi possível abrir a memória do aparelho."));
      };
    } catch (error) {
      window.clearTimeout(timer);
      reject(error);
    }
  });
}

async function bancoLer(): Promise<AppData | undefined> {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    let finalizado = false;
    const finalizar = (erro?: unknown, dados?: AppData) => {
      if (finalizado) return;
      finalizado = true;
      window.clearTimeout(timer);
      db.close();
      if (erro) reject(erro);
      else resolve(dados);
    };
    const timer = window.setTimeout(() => finalizar(new Error("A leitura dos dados demorou para responder. Feche outras abas do aplicativo e tente novamente, sem limpar os dados.")), 15000);
    try {
      const tx = db.transaction("dados", "readonly");
      const req = tx.objectStore("dados").get("atual");
      let dados: AppData | undefined;
      req.onsuccess = () => { dados = req.result as AppData | undefined; };
      tx.oncomplete = () => finalizar(undefined, dados);
      tx.onerror = () => finalizar(tx.error ?? new Error("Falha ao ler os dados salvos."));
      tx.onabort = () => finalizar(tx.error ?? new Error("Leitura dos dados interrompida."));
    } catch (erro) { finalizar(erro); }
  });
}

async function bancoSalvar(data: AppData): Promise<void> {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    let finalizado = false;
    const finalizar = (erro?: unknown) => {
      if (finalizado) return;
      finalizado = true;
      window.clearTimeout(timer);
      db.close();
      if (erro) reject(erro);
      else resolve();
    };
    const timer = window.setTimeout(() => finalizar(new Error("A gravação dos dados demorou para responder. Feche outras abas do aplicativo e tente novamente, sem limpar os dados.")), 15000);
    try {
      const tx = db.transaction("dados", "readwrite");
      tx.objectStore("dados").put(data, "atual");
      tx.oncomplete = () => finalizar();
      tx.onerror = () => finalizar(tx.error ?? new Error("Falha ao salvar os dados."));
      tx.onabort = () => finalizar(tx.error ?? new Error("Gravação dos dados interrompida."));
    } catch (erro) { finalizar(erro); }
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
    })().catch((error: unknown) => {
      carregando = null;
      if (error instanceof Error && error.message) throw error;
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
      deletedSongs: Array.isArray(parsed.deletedSongs) ? parsed.deletedSongs : [],
      deletedSetlists: Array.isArray(parsed.deletedSetlists) ? parsed.deletedSetlists : [],
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

export function writeData(entrada: AppData, preservarVersoes = false): Promise<void> {
  const anterior = readData();
  const agora = Date.now();
  const excluidas = (anteriores: { id: string }[], proximos: { id: string }[], atuais: Exclusao[] = [], recebidas: Exclusao[] = []) => {
    const mapa = new Map<string, Exclusao>();
    for (const item of [...atuais, ...recebidas]) {
      if (!mapa.has(item.id) || mapa.get(item.id)!.atualizadoEm < item.atualizadoEm) mapa.set(item.id, item);
    }
    const ids = new Set(proximos.map((item) => item.id));
    for (const item of anteriores) {
      if (!ids.has(item.id)) mapa.set(item.id, { id: item.id, atualizadoEm: agora });
    }
    return [...mapa.values()];
  };
  const next: AppData = {
    songs: preservarVersoes ? entrada.songs : carimbar(anterior.songs, entrada.songs, agora),
    setlists: preservarVersoes ? entrada.setlists : carimbar(anterior.setlists, entrada.setlists, agora),
    deletedSongs: preservarVersoes ? entrada.deletedSongs ?? [] : excluidas(anterior.songs, entrada.songs, anterior.deletedSongs, entrada.deletedSongs),
    deletedSetlists: preservarVersoes ? entrada.deletedSetlists ?? [] : excluidas(anterior.setlists, entrada.setlists, anterior.deletedSetlists, entrada.deletedSetlists),
  };
  if (typeof window === "undefined") return Promise.resolve();
  const salvar = fila.catch(() => {}).then(async () => {
    await guardarLegadoOffline(next);
    await bancoSalvar(next);
    cache = next;
    try { window.localStorage.removeItem(KEY); } catch { /* storage indisponível */ }
    listeners.forEach((l) => l());
    try {
      await limparAnexosOffline(next);
    } catch {
      toast.warning("Músicas salvas, mas não foi possível remover os arquivos antigos deste aparelho. Tente novamente ao atualizar ou sincronizar.");
    }
  });
  fila = salvar;
  return salvar;
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

