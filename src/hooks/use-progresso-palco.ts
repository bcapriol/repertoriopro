import { useCallback, useEffect, useState } from "react";

export type ProgressoPalco = { musicaId: string; indice: number };
const chave = (id: string) => `repertorio-facil-palco:${id}`;
const memoria = new Map<string, ProgressoPalco>();

export function reiniciarProgressoPalco(id: string) {
  memoria.delete(id);
  try { window.localStorage.removeItem(chave(id)); } catch { /* mantém o modo palco disponível */ }
}

export function useProgressoPalco(id: string) {
  const [estado, setEstado] = useState<{ id: string; progresso: ProgressoPalco | null } | null>(null);

  useEffect(() => {
    let progresso = memoria.get(id) ?? null;
    try {
      const raw = window.localStorage.getItem(chave(id));
      const salvo: unknown = raw ? JSON.parse(raw) : null;
      if (salvo && typeof salvo === "object" && "musicaId" in salvo && "indice" in salvo &&
        typeof salvo.musicaId === "string" && typeof salvo.indice === "number" &&
        Number.isInteger(salvo.indice) && salvo.indice >= 0) {
        progresso = { musicaId: salvo.musicaId, indice: salvo.indice };
        memoria.set(id, progresso);
      }
    } catch { /* usa a posição desta sessão se o armazenamento estiver indisponível */ }
    setEstado({ id, progresso });
  }, [id]);

  const salvar = useCallback((progresso: ProgressoPalco) => {
    memoria.set(id, progresso);
    try { window.localStorage.setItem(chave(id), JSON.stringify(progresso)); } catch { /* mantém em memória */ }
    setEstado({ id, progresso });
  }, [id]);

  return {
    pronto: estado?.id === id,
    progresso: estado?.id === id ? estado.progresso : null,
    salvar,
  };
}
