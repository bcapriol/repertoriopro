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

export type Conta = {
  usuario: string;
  senha: string;
  banda?: string;
  podeApagar: boolean;
  podeBackup: boolean;
  podeEditar: boolean;
  podeAgenda: boolean;
  podeAdicionarShows: boolean;
};

export function lerConta(): Conta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_CONTA);
    if (!raw) return null;
    const conta = JSON.parse(raw) as Partial<Conta>;
    if (!conta.usuario || !conta.senha) return null;
    const normalizada: Conta = {
      usuario: conta.usuario,
      senha: conta.senha,
      podeApagar: conta.podeApagar ?? false,
      podeBackup: conta.podeBackup ?? false,
      podeEditar: conta.podeEditar ?? false,
      podeAgenda: conta.podeAgenda ?? false,
      podeAdicionarShows: conta.podeAdicionarShows ?? false,
    };
    if (conta.banda) normalizada.banda = conta.banda;
    return normalizada;
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

export function useConta() {
  const [conta, setConta] = useState<Conta | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const atualizar = () => {
      setConta(lerConta());
      setPronto(true);
    };
    atualizar();
    ouvintes.add(atualizar);
    return () => {
      ouvintes.delete(atualizar);
    };
  }, []);
  return { conta, pronto };
}

/** Atualiza os privilégios da conta salva no aparelho, sem pedir login de novo. */
export function useAtualizarPrivilegios() {
  const { conta, pronto } = useConta();
  useEffect(() => {
    if (!pronto || !conta) return;
    let vivo = true;
    import("./nuvem.functions")
      .then((m) => m.entrarComUsuario({ data: { usuario: conta.usuario, senha: conta.senha } }))
      .then((r) => {
        if (!vivo) return;
        const atual = lerConta();
        if (!atual) return;
        salvarConta({
          ...atual,
          banda: r.banda,
          podeApagar: r.podeApagar,
          podeBackup: r.podeBackup,
          podeEditar: r.podeEditar,
          podeAgenda: r.podeAgenda,
          podeAdicionarShows: r.podeAdicionarShows,
        });
      })
      .catch(() => {
        // sem internet ou sessão inválida: mantém os privilégios já salvos
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);
}
