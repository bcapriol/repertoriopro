type DadosMensagemShow = {
  cliente: string;
  cidade: string;
  data: string;
  horaInicio: string;
  valor: number | null;
  tipoValor: "cache" | "couvert";
  consumacaoPessoas: number | null;
  consumacaoValor: number | null;
};

export function criarMensagemShow(
  show: DadosMensagemShow,
  tipo: "agendamento" | "alteracao" | "cancelamento",
  anterior?: Pick<DadosMensagemShow, "data" | "horaInicio">,
) {
  const dataBR = (data: string) => data.split("-").reverse().join("/");
  const hora = (dados: Pick<DadosMensagemShow, "horaInicio">) => dados.horaInicio || "A combinar";
  const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const consumacao = show.consumacaoValor !== null
    ? moeda(show.consumacaoValor)
    : show.consumacaoPessoas !== null
      ? `${show.consumacaoPessoas} ${show.consumacaoPessoas === 1 ? "pessoa" : "pessoas"}`
      : "A combinar";
  const titulo = tipo === "cancelamento"
    ? "❌ CANCELAMENTO DE SHOW - BANDA MULTIVIBE"
    : tipo === "alteracao"
      ? "📅 ALTERAÇÃO DE AGENDAMENTO - BANDA MULTIVIBE"
      : "🎵 Banda Multivibe - Agendamento de Show";
  const linhas = [titulo, ""];
  if (tipo === "cancelamento") linhas.push("Informamos o cancelamento do show abaixo.", "");
  if (tipo === "alteracao") {
    linhas.push("Confira os dados atualizados do show:");
    if (anterior && (anterior.data !== show.data || anterior.horaInicio !== show.horaInicio)) {
      linhas.push(`Data anterior: ${dataBR(anterior.data)} · Hora anterior: ${hora(anterior)}`);
    }
    linhas.push("");
  }
  linhas.push(
    `👤 Cliente: ${show.cliente || "Não informado"} · Cidade: ${show.cidade || "Não informada"}`,
    `📅 Data: ${dataBR(show.data)} · Hora de início: ${hora(show)}`,
    `💰 ${show.tipoValor === "couvert" ? "Couvert" : "Cachê"}: ${show.valor === null ? "A combinar" : moeda(show.valor)}`,
    `🍽️ Consumação: ${consumacao}`,
    "",
    "🙏 Agradecemos a preferência!",
  );
  return linhas.join("\n");
}
