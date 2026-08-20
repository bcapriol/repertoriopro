import { useCallback, useEffect, useState } from "react";

export type Anexo = {
  id: string;
  nome: string;
  tipo: string;
  dados: string;
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

export function writeData(entrada: AppData) {
  const anterior = readData();
  const agora = Date.now();
  const next: AppData = {
    songs: carimbar(anterior.songs, entrada.songs, agora),
    setlists: carimbar(anterior.setlists, entrada.setlists, agora),
  };
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
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
    writeData(fn(readData()));
  }, []);

  return { data, update };
}

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

