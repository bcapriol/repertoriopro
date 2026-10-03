import type { AppData, Exclusao, Setlist, Song } from "./repertorio-store";

type Item = { id: string; criadoEm: number; atualizadoEm?: number };

const quando = (i: Item) => i.atualizadoEm ?? i.criadoEm ?? 0;

function mesclarLista<T extends Item>(a: T[], b: T[], exclusoes: Exclusao[]): T[] {
  const mapa = new Map<string, T>();
  const apagados = new Map(exclusoes.map((item) => [item.id, item.atualizadoEm]));
  for (const item of [...a, ...b]) {
    if ((apagados.get(item.id) ?? -1) >= quando(item)) continue;
    const atual = mapa.get(item.id);
    if (!atual || quando(item) >= quando(atual)) mapa.set(item.id, item);
  }
  return Array.from(mapa.values()).sort((x, y) => quando(y) - quando(x));
}

function mesclarExclusoes(a: Exclusao[] = [], b: Exclusao[] = []) {
  const mapa = new Map<string, Exclusao>();
  for (const item of [...a, ...b]) {
    if (!mapa.has(item.id) || mapa.get(item.id)!.atualizadoEm < item.atualizadoEm) mapa.set(item.id, item);
  }
  return [...mapa.values()];
}

/** Junta versões e exclusões: uma exclusão só perde para uma edição posterior. */
export function mesclarDados(local: AppData, nuvem: AppData): AppData {
  const deletedSongs = mesclarExclusoes(local.deletedSongs, nuvem.deletedSongs);
  const deletedSetlists = mesclarExclusoes(local.deletedSetlists, nuvem.deletedSetlists);
  return {
    songs: mesclarLista<Song>(local.songs ?? [], nuvem.songs ?? [], deletedSongs),
    setlists: mesclarLista<Setlist>(local.setlists ?? [], nuvem.setlists ?? [], deletedSetlists),
    deletedSongs,
    deletedSetlists,
  };
}
