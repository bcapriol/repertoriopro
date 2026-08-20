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

const KEY_CONTA = "repertorio-facil-conta";

export type Conta = { usuario: string; senha: string };

export function lerConta(): Conta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_CONTA);
    return raw ? (JSON.parse(raw) as Conta) : null;
  } catch {
    return null;
  }
}

export function salvarConta(conta: Conta | null) {
  try {
    if (conta) window.localStorage.setItem(KEY_CONTA, JSON.stringify(conta));
    else window.localStorage.removeItem(KEY_CONTA);
  } catch {
    // ignora
  }
  ouvintes.forEach((f) => f());
}
