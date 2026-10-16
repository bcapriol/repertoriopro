type DadosMensagemShow = {
  cliente: string;
  cidade: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  valor: number | null;
  consumacaoPessoas: number | null;
};

export function criarMensagemShow(
  show: DadosMensagemShow,
  tipo: "agendamento" | "alteracao" | "cancelamento",
  anterior?: Pick<DadosMensagemShow, "data" | "horaInicio" | "horaFim">,
) {
  const dataBR = (data: string) => data.split("-").reverse().join("/");
  const hora = (dados: Pick<DadosMensagemShow, "horaInicio" | "horaFim">) =>
    dados.horaInicio ? `${dados.horaInicio}${dados.horaFim ? ` às ${dados.horaFim}` : ""}` : "A combinar";
  const titulo = tipo === "cancelamento"
    ? "❌ CANCELAMENTO DE SHOW - BANDA MULTIVIBE"
    : tipo === "alteracao"
      ? "📅 ALTERAÇÃO DE DATA - BANDA MULTIVIBE"
      : "🎵 Banda Multivibe - Agendamento de Show";
  const linhas = [titulo, ""];
  if (tipo === "cancelamento") linhas.push("Informamos o cancelamento do show abaixo.", "");
  if (tipo === "alteracao") {
    linhas.push("Confira os dados atualizados do show:");
    if (anterior && (anterior.data !== show.data || anterior.horaInicio !== show.horaInicio || anterior.horaFim !== show.horaFim)) {
      linhas.push(`Data anterior: ${dataBR(anterior.data)} · Hora anterior: ${hora(anterior)}`);
    }
    linhas.push("");
  }
  linhas.push(
    `👤 Cliente: ${show.cliente || "Não informado"} · Cidade: ${show.cidade || "Não informada"}`,
    `📅 Data: ${dataBR(show.data)} · Hora: ${hora(show)}`,
    ...(show.local ? [`📍 Local: ${show.local}`] : []),
    `💰 Valor Show: ${show.valor === null ? "A combinar" : show.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    `🍽️ Consumação para: ${show.consumacaoPessoas === null ? "A combinar" : `${show.consumacaoPessoas} ${show.consumacaoPessoas === 1 ? "pessoa" : "pessoas"}`}`,
    "",
    "🙏 Agradecemos a preferência!",
  );
  return linhas.join("\n");
}
