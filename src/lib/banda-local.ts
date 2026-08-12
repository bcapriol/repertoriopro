import { useEffect, useState } from "react";

const KEY = "repertorio-facil-banda";
const ouvintes = new Set<() => void>();

export function lerBanda(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function salvarBanda(nome: string) {
  try {
    if (nome) window.localStorage.setItem(KEY, nome);
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignora
  }
  ouvintes.forEach((f) => f());
}

export function useBanda() {
  const [nome, setNome] = useState("");
  useEffect(() => {
    const atualizar = () => setNome(lerBanda());
    atualizar();
    ouvintes.add(atualizar);
    return () => {
      ouvintes.delete(atualizar);
    };
  }, []);
  return nome;
}
