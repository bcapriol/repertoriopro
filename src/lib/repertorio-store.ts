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
};

export type Setlist = {
  id: string;
  nome: string;
  local: string;
  data: string;
  songIds: string[];
  criadoEm: number;
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

export function writeData(next: AppData) {
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

