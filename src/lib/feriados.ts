export type Feriado = {
  data: string;
  nome: string;
  abrangencia: "Nacional" | "Estadual · SP" | "Municipal · Botucatu";
  fonte: string;
};

export const FONTE_PREFEITURA = "https://www.botucatu.sp.gov.br/";
export const FONTE_SP = "https://www.al.sp.gov.br/repositorio/legislacao/lei/1997/lei-9497-05.03.1997.html";
export const fonteBrasilApi = (ano: number) => `https://brasilapi.com.br/api/feriados/v1/${ano}`;
const LEI_NACIONAIS = "https://www.planalto.gov.br/ccivil_03/leis/l0662.htm";
const LEI_APARECIDA = "https://www.planalto.gov.br/ccivil_03/leis/l6802.htm";
const LEI_CONSCIENCIA = "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm";
const LEI_CONSCIENCIA_SP = "https://www.al.sp.gov.br/repositorio/legislacao/lei/2023/lei-17746-12.09.2023.html";

// Cadastro de datas recorrentes, não de pontos facultativos ou emendas.
// A referência municipal é o portal da Prefeitura, não uma consulta automática
// a decretos: mudanças locais e feriados extraordinários exigem conferência.
const NACIONAIS = [
  ["01-01", "Confraternização Universal", LEI_NACIONAIS],
  ["04-21", "Tiradentes", LEI_NACIONAIS],
  ["05-01", "Dia do Trabalho", LEI_NACIONAIS],
  ["09-07", "Independência do Brasil", LEI_NACIONAIS],
  ["10-12", "Nossa Senhora Aparecida", LEI_APARECIDA],
  ["11-02", "Finados", LEI_NACIONAIS],
  ["11-15", "Proclamação da República", LEI_NACIONAIS],
  ["12-25", "Natal", LEI_NACIONAIS],
] as const;

const dataUTC = (d: Date) => d.toISOString().slice(0, 10);

// Computus gregoriano; UTC evita deslocamentos por fuso e horário de verão.
function pascoa(ano: number) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function feriadosDoAno(ano: number): Feriado[] {
  const feriados: Feriado[] = NACIONAIS.map(([data, nome, fonte]) => ({
    data: `${ano}-${data}`, nome, fonte, abrangencia: "Nacional",
  }));
  if (ano >= 2024) feriados.push({ data: `${ano}-11-20`, nome: "Dia Nacional de Zumbi e da Consciência Negra", abrangencia: "Nacional", fonte: LEI_CONSCIENCIA });
  if (ano === 2023) feriados.push({ data: `${ano}-11-20`, nome: "Dia da Consciência Negra", abrangencia: "Estadual · SP", fonte: LEI_CONSCIENCIA_SP });
  if (ano >= 1997) feriados.push({ data: `${ano}-07-09`, nome: "Revolução Constitucionalista de 1932", abrangencia: "Estadual · SP", fonte: FONTE_SP });
  for (const [data, nome] of [["04-14", "Aniversário de Botucatu"], ["07-26", "Sant’Ana — padroeira de Botucatu"]]) {
    feriados.push({ data: `${ano}-${data}`, nome, abrangencia: "Municipal · Botucatu", fonte: FONTE_PREFEITURA });
  }
  // Feriados religiosos locais, não feriados nacionais por lei federal.
  for (const [deslocamento, nome] of [[-2, "Sexta-feira da Paixão"], [60, "Corpus Christi"]] as const) {
    const data = pascoa(ano);
    data.setUTCDate(data.getUTCDate() + deslocamento);
    feriados.push({ data: dataUTC(data), nome, abrangencia: "Municipal · Botucatu", fonte: FONTE_PREFEITURA });
  }
  return feriados.sort((a, b) => a.data.localeCompare(b.data));
}

export async function consultarFeriadosNacionais(ano: number, signal: AbortSignal): Promise<Feriado[]> {
  const resposta = await fetch(fonteBrasilApi(ano), { signal });
  if (!resposta.ok) throw new Error("Consulta de feriados indisponível.");
  const dados: unknown = await resposta.json();
  if (!Array.isArray(dados)) throw new Error("Resposta de feriados inválida.");
  const nacionais = feriadosDoAno(ano).filter((f) => f.abrangencia === "Nacional");
  // A API também lista Carnaval e Corpus Christi como nacionais. Somente
  // as datas com previsão federal entram aqui; feriados religiosos são locais.
  return nacionais.map((feriado) => {
    const encontrado = dados.find((item: unknown) =>
      typeof item === "object" && item !== null && "date" in item && item.date === feriado.data &&
      "name" in item && typeof item.name === "string" && item.name.trim().length > 0,
    );
    if (!encontrado) throw new Error("A base consultada não retornou todos os feriados nacionais.");
    return { ...feriado, fonte: fonteBrasilApi(ano) };
  });
}
