export const TIPOS_EVENTO = ["Casamento (cerimônia + festa)", "Festa de casamento", "Bodas de casamento", "Corporativo", "Particular", "Estabelecimento", "Organização Governamental", "ONG"] as const;
export const SERVICOS = ["Entretenimento Musical", "Som compatível", "Iluminação", "Pirotecnia", "Música ambiente (Spotify)"] as const;
export const FINALIDADES = ["Redes sociais da Banda Multivibe", "Site da Banda Multivibe", "Portfólio", "Material promocional", "Divulgação comercial"] as const;
export const MOMENTOS = ["Entrada", "Primeira dança", "Homenagem", "Momento especial", "Encerramento", "Outra"] as const;
export const PAGAMENTOS = ["À vista", "50% na reserva + 50% até a data do evento", "30% na reserva + 70% até a data do evento", "Parcelado", "Outra condição"] as const;
export const CLAUSULA_CANCELAMENTO = `A confirmação da contratação e a reserva da data do evento ficam condicionadas ao pagamento do valor de reserva de data indicado neste instrumento.\n\nO valor pago para reserva da data tem por finalidade confirmar a contratação e retirar a respectiva data da disponibilidade comercial da CONTRATADA, que passa a organizar sua agenda, equipe, logística e disponibilidade de equipamentos em razão do compromisso assumido.\n\nEm caso de cancelamento solicitado pela CONTRATANTE, o valor pago a título de reserva de data poderá ser retido pela CONTRATADA, observadas a natureza da contratação, as circunstâncias do cancelamento, os serviços e despesas já assumidos e a legislação aplicável, especialmente as normas de proteção ao consumidor.\n\nCaso a CONTRATADA, sem motivo de força maior ou caso fortuito devidamente justificável, seja responsável pelo cancelamento da contratação, o valor efetivamente pago pela CONTRATANTE a título de reserva de data deverá ser integralmente restituído, sem prejuízo dos demais direitos eventualmente assegurados pela legislação aplicável.\n\nAs partes procurarão solucionar eventual cancelamento ou alteração contratual de forma consensual, observando a boa-fé, o equilíbrio contratual e a legislação vigente.`;

export type Pessoa = { nome: string; documento: string; endereco: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string; cep: string; telefone: string; email: string };
export const pessoaVazia = (): Pessoa => ({ nome: "", documento: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", cep: "", telefone: "", email: "" });
export type ConfigContratos = { contratado: Pessoa; logo: string; dadosBancarios: string; clausulaCancelamento: string; foro: string; rodape: string; condicoesPagamento: string; observacoesPadrao: string };
export const configInicial = (): ConfigContratos => ({ contratado: { ...pessoaVazia(), nome: "Banda Multivibe" }, logo: "/multivibe-logo.jpg", dadosBancarios: "", clausulaCancelamento: CLAUSULA_CANCELAMENTO, foro: "", rodape: "", condicoesPagamento: "", observacoesPadrao: "" });
export type MusicaContrato = { idOriginal: string; titulo: string; artista: string; ordem: number; momento: string; observacao: string };
export type TrechoClausula = { id: string; tipo: "texto" | "artigo" | "paragrafo" | "item"; texto: string; filhos?: TrechoClausula[] };
export type ClausulaContrato = { id: string; titulo: string; trechos: TrechoClausula[] };
export type EdicaoClausulas = { personalizadas: Record<string, ClausulaContrato>; removidas: string[]; adicionais: ClausulaContrato[] };
export type ContratoDados = {
  clausulas?: EdicaoClausulas;
  alteradoEm?: string;
  tipoEvento: string; tipoPessoa: "Pessoa Física" | "Pessoa Jurídica"; contratante: Pessoa; representante: string; cpfRepresentante: string; cargoRepresentante: string;
  contratado: Pessoa; configSnapshot: ConfigContratos;
  nomeEvento: string; dataEvento: string; localEvento: string; enderecoEvento: string; horaEvento: string; horaInicio: string; horaFim: string; servicos: string[];
  removerAntes: string; estilo: string; equipeAlimentacao: string; observacoesAlimentacao: string;
  montagem: string; horaMontagem: string; localMontagem: string; observacoesMontagem: string;
  valorTotal: string; valorReserva: string; dataReserva: string; dataSaldo: string; pagamento: string; parcelas: string; valorParcela: string; vencimentos: string; outraCondicao: string;
  alteraData: string; autorizacaoImagem: string; finalidades: string[]; observacoes: string;
  repertorio: MusicaContrato[]; musicasVetadas: string; artistasVetados: string; observacoesRepertorio: string;
};
export const contratoInicial = (config: ConfigContratos = configInicial()): ContratoDados => ({
  tipoEvento: "", tipoPessoa: "Pessoa Física", contratante: pessoaVazia(), representante: "", cpfRepresentante: "", cargoRepresentante: "",
  contratado: { ...config.contratado }, configSnapshot: structuredClone(config),
  nomeEvento: "", dataEvento: "", localEvento: "", enderecoEvento: "", horaEvento: "", horaInicio: "", horaFim: "", servicos: [],
  removerAntes: "", estilo: "", equipeAlimentacao: "", observacoesAlimentacao: "", montagem: "", horaMontagem: "", localMontagem: "", observacoesMontagem: "",
  valorTotal: "", valorReserva: "", dataReserva: "", dataSaldo: "", pagamento: "", parcelas: "", valorParcela: "", vencimentos: "", outraCondicao: config.condicoesPagamento,
  alteraData: "", autorizacaoImagem: "", finalidades: [], observacoes: config.observacoesPadrao,
  repertorio: [], musicasVetadas: "", artistasVetados: "", observacoesRepertorio: "",
});
export const STATUS_CONTRATO = ["Rascunho", "Aguardando revisão", "Pronto para envio", "Enviado", "Aceito", "Cancelado", "Concluído"] as const;
export type StatusContrato = typeof STATUS_CONTRATO[number];
export const TRANSICOES_CONTRATO: Record<StatusContrato, readonly StatusContrato[]> = {
  "Rascunho": ["Aguardando revisão", "Cancelado"],
  "Aguardando revisão": ["Rascunho", "Cancelado"],
  "Pronto para envio": ["Enviado", "Cancelado"],
  "Enviado": ["Aceito", "Cancelado"],
  "Aceito": ["Concluído"],
  "Cancelado": [],
  "Concluído": [],
};
export type VersaoContrato = { versao: number; dados: ContratoDados; pdfCaminho: string; pdfEmissao: string; criadoEm: string };
export type HistoricoContrato = { versao: number; anterior: string; novo: string; criadoEm: string; usuario: string };
export type ResumoContrato = { id: string; numero: string; versao: number; status: string; criadoEm: string; atualizadoEm: string; responsavel: string; dados: ContratoDados; pdfCaminho: string | null; pdfEmissao: string | null };
export function numeroValido(documento: string): boolean {
  const s = documento.replace(/\D/g, "");
  if (s.length === 11 && !/^(\d)\1+$/.test(s)) {
    const dig = (n: number) => { const soma = [...s.slice(0, n)].reduce((acc, v, i) => acc + Number(v) * (n + 1 - i), 0); const resto = (soma * 10) % 11; return resto === 10 ? 0 : resto; };
    return dig(9) === Number(s[9]) && dig(10) === Number(s[10]);
  }
  if (s.length === 14 && !/^(\d)\1+$/.test(s)) {
    const dig = (n: number) => { const pesos = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; const resto = [...s.slice(0, n)].reduce((acc, v, i) => acc + Number(v) * (pesos[i] ?? 0), 0) % 11; return resto < 2 ? 0 : 11 - resto; };
    return dig(12) === Number(s[12]) && dig(13) === Number(s[13]);
  }
  return false;
}
export function validarContrato(d: ContratoDados): string[] {
  const erros: string[] = [];
  for (const [nome, p] of [["Contratante", d.contratante], ["Contratado", d.contratado]] as const) {
    if (!p.nome.trim()) erros.push(`Informe o nome de ${nome}.`);
    if (!numeroValido(p.documento) || (nome === "Contratante" && p.documento.replace(/\D/g, "").length !== (d.tipoPessoa === "Pessoa Jurídica" ? 14 : 11))) erros.push(`Informe um CPF/CNPJ válido: ${nome}.`);
    if (p.email.trim() && !/^\S+@\S+\.\S+$/.test(p.email.trim())) erros.push(`E-mail inválido: ${nome}.`);
    if (p.telefone.trim() && ![10, 11].includes(p.telefone.replace(/\D/g, "").length)) erros.push(`Telefone inválido: ${nome}.`);
    if (p.cep.trim() && p.cep.replace(/\D/g, "").length !== 8) erros.push(`CEP inválido: ${nome}.`);
  }
  if (d.cpfRepresentante.trim() && (d.cpfRepresentante.replace(/\D/g, "").length !== 11 || !numeroValido(d.cpfRepresentante))) erros.push("CPF do representante inválido.");
  const dataValida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime()) && new Date(`${v}T12:00:00`).toISOString().slice(0, 10) === v;
  for (const [rotulo, valor] of [["evento", d.dataEvento], ["pagamento da reserva", d.dataReserva], ["pagamento do saldo", d.dataSaldo]] as const) {
    if (valor && !dataValida(valor)) erros.push(`Data inválida para ${rotulo}.`);
  }
  if (d.horaInicio && d.horaFim && d.horaFim <= d.horaInicio) erros.push("O término deve ser após o início da atividade.");
  if (d.equipeAlimentacao && (!Number.isInteger(Number(d.equipeAlimentacao)) || Number(d.equipeAlimentacao) < 0)) erros.push("Quantidade da equipe deve ser um número inteiro não negativo.");
  for (const [rotulo, valor] of [["total", d.valorTotal], ["da reserva", d.valorReserva], ["da parcela", d.valorParcela]] as const) {
    const n = Number(valor);
    if (valor.trim() && (!Number.isFinite(n) || n < 0 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001)) erros.push(`Valor ${rotulo} inválido; use reais e centavos não negativos.`);
  }
  const total = Number(d.valorTotal), reserva = Number(d.valorReserva);
  if (d.valorTotal && d.valorReserva && reserva > total) erros.push("A reserva não pode superar o valor total.");
  if (d.valorTotal && d.valorReserva && d.pagamento === PAGAMENTOS[1] && Math.round(reserva * 100) !== Math.round(total * 50)) erros.push("Na condição 50% + 50%, a reserva deve ser metade do valor total.");
  if (d.valorTotal && d.valorReserva && d.pagamento === PAGAMENTOS[2] && Math.round(reserva * 100) !== Math.round(total * 30)) erros.push("Na condição 30% + 70%, a reserva deve corresponder a 30% do valor total.");
  if (d.parcelas && (!Number.isInteger(Number(d.parcelas)) || Number(d.parcelas) < 2)) erros.push("O número de parcelas deve ser um inteiro a partir de 2.");
  if (d.vencimentos.trim()) {
    const vencimentos = d.vencimentos.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean);
    if (vencimentos.some((v) => !dataValida(v))) erros.push("Informe os vencimentos no formato AAAA-MM-DD, com datas válidas.");
    if (d.parcelas && vencimentos.length !== Number(d.parcelas)) erros.push("A quantidade de vencimentos deve corresponder ao número de parcelas informado.");
  }
  if (d.pagamento === "Parcelado" && d.valorTotal && d.parcelas && d.valorParcela && Math.round(Number(d.valorParcela) * 100) * Number(d.parcelas) !== Math.round((total - reserva) * 100)) erros.push("O total das parcelas deve corresponder ao saldo após a reserva.");
  return erros;
}
