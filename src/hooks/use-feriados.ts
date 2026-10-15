import { useEffect, useMemo, useState } from "react";
import { consultarFeriadosNacionais, feriadosDoAno, type Feriado } from "@/lib/feriados";

type Consulta = { status: "consultado" | "indisponivel"; feriados: Feriado[] };

export function useFeriados(anos: number[]) {
  const chaveAnos = [...new Set(anos)].sort((a, b) => a - b).join(",");
  const [consultas, setConsultas] = useState<Record<number, Consulta>>({});

  useEffect(() => {
    let ativo = true;
    const controles: AbortController[] = [];
    const temporizadores: ReturnType<typeof setTimeout>[] = [];
    for (const ano of chaveAnos.split(",").map(Number)) {
      const controle = new AbortController();
      controles.push(controle);
      const temporizador = setTimeout(() => controle.abort(), 10000);
      temporizadores.push(temporizador);
      consultarFeriadosNacionais(ano, controle.signal)
        .then((feriados) => {
          if (ativo) setConsultas((anteriores) => ({ ...anteriores, [ano]: { status: "consultado", feriados } }));
        })
        .catch(() => {
          if (ativo) setConsultas((anteriores) => ({ ...anteriores, [ano]: { status: "indisponivel", feriados: [] } }));
        })
        .finally(() => clearTimeout(temporizador));
    }
    return () => {
      ativo = false;
      controles.forEach((controle) => controle.abort());
      temporizadores.forEach(clearTimeout);
    };
  }, [chaveAnos]);

  const porData = useMemo(() => {
    const resultado: Record<string, Feriado[]> = {};
    for (const ano of chaveAnos.split(",").map(Number)) {
      const nacionais = consultas[ano]?.feriados ?? [];
      for (const feriado of feriadosDoAno(ano)) {
        const dado = nacionais.find((f) => f.data === feriado.data) ?? feriado;
        (resultado[dado.data] ??= []).push(dado);
      }
    }
    return resultado;
  }, [chaveAnos, consultas]);

  return { porData, consultas };
}
