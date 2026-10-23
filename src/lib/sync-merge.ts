import type { AppData, Setlist, Song } from "./repertorio-store";

type Item = { id: string; criadoEm: number; atualizadoEm?: number };

const quando = (i: Item) => i.atualizadoEm ?? i.criadoEm ?? 0;

function mesclarLista<T extends Item>(a: T[], b: T[]): T[] {
  const mapa = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const atual = mapa.get(item.id);
    if (!atual || quando(item) >= quando(atual)) mapa.set(item.id, item);
  }
  return Array.from(mapa.values()).sort((x, y) => quando(y) - quando(x));
}

/** Junta dois conjuntos de dados: para cada item, vence a versão alterada mais recentemente. */
export function mesclarDados(local: AppData, nuvem: AppData): AppData {
  return {
    songs: mesclarLista<Song>(local.songs ?? [], nuvem.songs ?? []),
    setlists: mesclarLista<Setlist>(local.setlists ?? [], nuvem.setlists ?? []),
  };
}
