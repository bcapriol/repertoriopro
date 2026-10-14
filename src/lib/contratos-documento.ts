import { temAnexoRepertorio, type ClausulaContrato, type ContratoDados, type Pessoa, type TrechoClausula } from "./contratos";

export type LinhaClausula = { id: string; rotulo: string; texto: string; nivel: number };
export type BlocoContrato = { titulo: string; paragrafos: string[]; clausula?: ClausulaContrato; linhas?: LinhaClausula[]; anexo?: boolean; repertorio?: ContratoDados["repertorio"] };

// A mesma numeração é utilizada no editor, na revisão e no PDF.
function numerarClausulas(clausulas: ClausulaContrato[]): BlocoContrato[] {
  let artigo = 0;
  return clausulas.map((clausula, indice) => {
    const linhas: LinhaClausula[] = [];
    const percorrer = (trechos: TrechoClausula[], caminho: number[], nivel: number) => {
      let paragrafo = 0, item = 0;
      for (const [posicao, trecho] of trechos.entries()) {
        let rotulo = "";
        let proximo = [...caminho, posicao + 1];
        if (trecho.tipo === "artigo") rotulo = `Art. ${++artigo}º — `;
        if (trecho.tipo === "paragrafo") rotulo = `§ ${++paragrafo}º — `;
        if (trecho.tipo === "item") { proximo = [...caminho, ++item]; rotulo = `${proximo.join(".")}. `; }
        linhas.push({ id: trecho.id, rotulo, texto: trecho.texto, nivel });
        if (trecho.filhos?.length) percorrer(trecho.filhos, proximo, nivel + 1);
      }
    };
    percorrer(clausula.trechos, [indice + 1], 0);
    return { titulo: `CLÁUSULA ${indice + 1} — ${clausula.titulo}`, clausula, linhas, paragrafos: linhas.map((l) => `${l.rotulo}${l.texto}`) };
  });
}

export const dataAlteracaoContrato = (dados: ContratoDados) => dados.alteradoEm
  ? new Date(dados.alteradoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
export type DocumentoContrato = { cabecalho: string[]; partes: string[]; blocos: BlocoContrato[]; assinaturas: string[] };
const dataBR = (valor: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor; const [ano, mes, dia] = valor.split("-"); return `${dia}/${mes}/${ano}`; };
const informado = (valor: string) => valor.trim() || "não informado";
const dinheiro = (valor: number | string) => typeof valor === "string" && !valor.trim() ? "não informado" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const itens = (texto: string) => texto.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
const endereco = (p: Pessoa) => [p.endereco, p.numero, p.complemento, p.bairro, [p.cidade, p.estado].filter(Boolean).join("/"), p.cep && `CEP ${p.cep}`].filter(Boolean).join(", ");
const identificacao = (p: Pessoa) => [
  `${p.nome}, inscrito(a) sob CPF/CNPJ nº ${p.documento}`,
  endereco(p) && `com endereço em ${endereco(p)}`,
  p.telefone && `telefone ${p.telefone}`,
  p.email && `e-mail ${p.email}`,
].filter(Boolean).join(", ") + ".";

export function redigirContrato(d: ContratoDados, numero: string, emissao: string): DocumentoContrato {
  const blocos: BlocoContrato[] = [];
  const clausulas: ClausulaContrato[] = [];
  const clausula = (titulo: string, ...paragrafos: (string | undefined | false)[]) => {
    const id = `padrao:${titulo}`;
    if (d.clausulas?.removidas.includes(id)) return;
    clausulas.push(d.clausulas?.personalizadas[id] ?? { id, titulo, trechos: paragrafos.filter((p): p is string => typeof p === "string" && !!p.trim()).map<TrechoClausula>((texto, i) => ({ id: `${id}:${i}`, tipo: i === 0 ? "texto" : "paragrafo", texto })) });
  };
  const reserv = Number(d.valorReserva), total = Number(d.valorTotal);
  const contratado = d.contratado;
  const foro = d.configSnapshot?.foro?.trim();
  const cancelamento = d.configSnapshot?.clausulaCancelamento?.trim();
  const partes = [
    `CONTRATANTE (${d.tipoPessoa.toUpperCase()}): ${identificacao(d.contratante)}${d.tipoPessoa === "Pessoa Jurídica" && d.representante.trim() ? ` Neste ato representada por ${d.representante}${d.cpfRepresentante ? `, CPF ${d.cpfRepresentante}` : ""}${d.cargoRepresentante ? `, na função de ${d.cargoRepresentante}` : ""}.` : ""}`,
    `CONTRATADA: ${identificacao(contratado)}`,
  ];
  clausula("DO OBJETO", `A CONTRATADA prestará à CONTRATANTE os serviços de ${d.servicos.join(", ") || "modalidade não informada"} para o evento ${informado(d.nomeEvento)}, conforme as condições expressamente registradas neste instrumento.`);
  clausula("DO EVENTO", `Evento: ${informado(d.nomeEvento)}. Tipo: ${informado(d.tipoEvento)}. Data prevista: ${informado(dataBR(d.dataEvento))}. Local: ${informado(d.localEvento)}. Endereço: ${informado(d.enderecoEvento)}. Horário previsto: ${informado(d.horaEvento)}. Início da atividade: ${informado(d.horaInicio)}. Término: ${informado(d.horaFim)}.`, d.estilo.trim() && `As características e o perfil informados para o evento são: ${d.estilo.trim()}.`);
  if (d.servicos.length) clausula("DOS SERVIÇOS CONTRATADOS", `Integram o objeto deste contrato exclusivamente os seguintes serviços selecionados: ${d.servicos.join("; ")}. A execução observará as condições técnicas e operacionais do local e o planejamento acordado.`);
  if (d.montagem || d.horaMontagem || d.localMontagem || d.observacoesMontagem.trim() || d.removerAntes) clausula("DA MONTAGEM E DOS EQUIPAMENTOS", `Montagem: ${informado(d.montagem.toLowerCase())}${d.horaMontagem ? `, às ${d.horaMontagem}` : ""}${d.localMontagem ? `, em ${d.localMontagem}` : ""}.`, d.observacoesMontagem.trim() && `Quanto à montagem: ${d.observacoesMontagem.trim()}.`, d.removerAntes === "Sim" ? "A retirada de equipamentos antes do término previsto do evento poderá ocorrer mediante planejamento operacional da CONTRATADA, observadas as condições de segurança, logística e funcionamento do evento." : d.removerAntes === "Não" && "Os equipamentos permanecerão disponíveis até o término previsto da atividade, ressalvadas situações de força maior, questões de segurança, determinação das autoridades competentes ou outras circunstâncias que impossibilitem a permanência dos equipamentos.");
  clausula("DA EQUIPE", "A CONTRATADA poderá utilizar, conforme as necessidades técnicas e operacionais do evento, músicos, técnicos, operadores, auxiliares, carregadores, montadores e demais profissionais próprios ou contratados necessários à execução, montagem, operação e desmontagem dos serviços contratados.");
  if (d.equipeAlimentacao || d.observacoesAlimentacao.trim()) clausula("DA ALIMENTAÇÃO DA EQUIPE", `A CONTRATANTE deverá disponibilizar alimentação e bebidas adequadas para a equipe da CONTRATADA${d.equipeAlimentacao ? `, composta para esta finalidade por ${d.equipeAlimentacao} pessoa(s),` : ""} quando essa condição fizer parte da contratação.`, d.observacoesAlimentacao.trim() && `Condições acordadas: ${d.observacoesAlimentacao.trim()}.`);
  const pagamento = d.pagamento === "Parcelado" ? `Condição de pagamento: parcelado. Quantidade de parcelas: ${informado(d.parcelas)}. Valor de cada parcela: ${dinheiro(d.valorParcela)}. Vencimentos: ${itens(d.vencimentos).map(dataBR).join(", ") || "não informados"}.` : d.pagamento === "Outra condição" ? `A condição de pagamento acordada é: ${informado(d.outraCondicao)}.` : `Condição de pagamento: ${informado(d.pagamento)}.${d.outraCondicao.trim() ? ` Condições adicionais: ${d.outraCondicao.trim()}.` : ""}`;
  const saldo = d.valorTotal.trim() && d.valorReserva.trim() ? dinheiro(total - reserv) : "não informado";
  clausula("DO VALOR E DAS CONDIÇÕES DE PAGAMENTO", `Valor total: ${dinheiro(d.valorTotal)}. Valor da reserva de data: ${dinheiro(d.valorReserva)}${d.dataReserva ? `, com pagamento em ${dataBR(d.dataReserva)}` : ""}. Saldo: ${saldo}${d.dataSaldo ? `, com pagamento previsto para ${dataBR(d.dataSaldo)}` : ""}.`, pagamento);
  if (d.valorReserva.trim() && reserv > 0) clausula("DA RESERVA DE DATA E DO CANCELAMENTO", ...(cancelamento || "A confirmação da contratação fica condicionada ao pagamento da reserva de data.").split(/\n\s*\n/));
  else clausula("DA RESERVA DE DATA E DO CANCELAMENTO", d.valorReserva.trim() ? "Não foi estipulado valor a título de reserva de data neste instrumento." : "O valor da reserva de data não foi informado neste instrumento.", "Em caso de cancelamento, as partes buscarão solução consensual, observadas as despesas assumidas, a boa-fé e a legislação aplicável, especialmente as normas de proteção ao consumidor.");
  if (d.alteraData === "Sim") clausula("DA ALTERAÇÃO DA DATA", "As partes poderão solicitar alteração da data do evento, desde que haja disponibilidade da CONTRATADA e concordância entre as partes quanto às novas condições. A solicitação de alteração não será automaticamente considerada cancelamento.");
  clausula("DAS RESPONSABILIDADES DA CONTRATADA", "A CONTRATADA deverá executar os serviços contratados, disponibilizar os equipamentos acordados e equipe compatível, realizar montagem e desmontagem conforme planejamento, observar os horários acordados, utilizar equipamentos em condições adequadas e cumprir este contrato.");
  clausula("DAS RESPONSABILIDADES DA CONTRATANTE", "A CONTRATANTE deverá fornecer informações corretas, disponibilizar acesso, espaço adequado e condições seguras no local, prover alimentação quando acordada, pagar nos prazos previstos, comunicar alterações relevantes e respeitar os horários de montagem, execução e desmontagem.");
  clausula("DO CASO FORTUITO E DA FORÇA MAIOR", "Não serão consideradas inadimplentes as partes quando o cumprimento das obrigações for impossibilitado por caso fortuito ou força maior, entendidos como eventos imprevisíveis ou inevitáveis que impeçam a realização do evento ou a execução dos serviços, observada a legislação aplicável.", "Nessas situações, as partes deverão buscar, de boa-fé, solução adequada, podendo avaliar a remarcação da data, manutenção dos valores já pagos para nova data ou outra solução consensual.");
  if (d.servicos.includes("Pirotecnia")) clausula("DA PIROTECNIA", "A execução de serviços envolvendo efeitos pirotécnicos ficará condicionada à possibilidade técnica e legal de realização no local do evento, às autorizações eventualmente exigidas, às condições de segurança e às normas das autoridades competentes.", "A CONTRATADA poderá recusar ou interromper a utilização de efeitos pirotécnicos caso identifique risco à segurança das pessoas, do patrimônio ou impossibilidade de cumprimento das exigências legais e técnicas.");
  if (d.servicos.includes("Música ambiente (Spotify)")) clausula("DA MÚSICA AMBIENTE", "O serviço de música ambiente consiste na reprodução de música conforme as condições contratadas. As autorizações e obrigações relativas à execução pública deverão ser observadas pelas partes conforme a legislação aplicável, sem presunção de licenças não verificadas.");
  clausula("DO TRATAMENTO DE DADOS PESSOAIS", "Os dados pessoais fornecidos pelas partes serão tratados para finalidades relacionadas à elaboração, execução, administração e comprovação deste contrato, atendimento às obrigações legais e exercício regular de direitos, observadas as bases legais previstas na Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD).", "A CONTRATADA deverá utilizar os dados pessoais de forma compatível com as finalidades informadas, adotando medidas razoáveis de segurança e respeitando os direitos dos titulares previstos na legislação aplicável.");
  clausula("DA AUTORIZAÇÃO DE USO DE IMAGEM", "A CONTRATANTE declara estar ciente de que poderão ser realizadas fotografias e/ou gravações audiovisuais durante a execução do evento.", d.autorizacaoImagem === "AUTORIZO" ? (d.finalidades.length ? `A CONTRATANTE AUTORIZA a utilização de imagens e registros audiovisuais do evento exclusivamente para: ${d.finalidades.join("; ")}.` : "A opção de autorização de imagem foi selecionada, mas nenhuma finalidade foi informada. Este instrumento não concede autorização de divulgação sem a definição expressa das finalidades pelas partes.") : d.autorizacaoImagem === "NÃO AUTORIZO" ? "A CONTRATANTE NÃO AUTORIZA a utilização das imagens do evento para divulgação institucional ou comercial." : "A autorização de uso de imagem não foi informada. Este instrumento não concede autorização para divulgação das imagens do evento.", "A utilização deverá respeitar a legislação aplicável, inclusive as normas relativas ao direito de imagem, privacidade e proteção de dados pessoais.");
  clausula("DAS DISPOSIÇÕES GERAIS", d.observacoes.trim() && `As partes acordam ainda as seguintes condições especiais: ${d.observacoes.trim()}.`, "Este instrumento registra os serviços e condições expressamente acordados pelas partes; eventuais alterações deverão ser formalizadas de comum acordo.");
  if (foro) clausula("DO FORO", `Para dirimir controvérsias relativas a este contrato, fica indicado o foro de ${foro}, ressalvadas as regras legais de competência aplicáveis, inclusive as de proteção ao consumidor.`);
  const incluirAnexo = temAnexoRepertorio(d);
  clausula("DA ESCOLHA DO REPERTÓRIO", "Quando a escolha do repertório for deixada a seu critério pela CONTRATANTE, a CONTRATADA poderá definir as músicas e a sequência da apresentação de acordo com o perfil e a dinâmica do evento, respeitando as preferências, restrições e demais condições expressamente acordadas entre as partes.", "A CONTRATADA poderá consultar a CONTRATANTE e, em eventos de casamento, os noivos, sobre artistas e/ou músicas específicas que desejem ou não que sejam executados ou reproduzidos. As solicitações serão alinhadas entre as partes, considerando a disponibilidade do repertório e as condições técnicas da apresentação, sem afastar as restrições expressamente acordadas.", incluirAnexo && "O Anexo I — Repertório escolhido integra este contrato e registra as seleções e orientações musicais nele indicadas.");
  if (!incluirAnexo && (itens(d.musicasVetadas).length || itens(d.artistasVetados).length)) clausula("DAS RESTRIÇÕES DE REPERTÓRIO", "A CONTRATANTE informa que as seguintes músicas e/ou artistas não deverão ser executados durante o evento:", itens(d.musicasVetadas).length && `Músicas: ${itens(d.musicasVetadas).join("; ")}.`, itens(d.artistasVetados).length && `Artistas/cantores: ${itens(d.artistasVetados).join("; ")}.`);
  if (!incluirAnexo && d.observacoesRepertorio.trim()) clausula("DAS ORIENTAÇÕES MUSICAIS", `As partes registram as seguintes orientações sobre o repertório: ${d.observacoesRepertorio.trim()}.`);
  blocos.push(...numerarClausulas([...clausulas, ...(d.clausulas?.adicionais ?? [])]));
  if (incluirAnexo) {
    const anexos: BlocoContrato[] = [
      { titulo: "ANEXO I — REPERTÓRIO ESCOLHIDO", paragrafos: [`Contrato ${numero} · Evento: ${d.nomeEvento} · Data: ${dataBR(d.dataEvento)}`], anexo: true },
      { titulo: "REPERTÓRIO", paragrafos: d.repertorio.map((m, i) => `${String(i + 1).padStart(2, "0")}. ${m.titulo} — ${m.artista}${m.momento ? ` · ${m.momento}` : ""}${m.observacao ? ` · ${m.observacao}` : ""}`), repertorio: d.repertorio, anexo: true },
    ];
    if (itens(d.musicasVetadas).length || itens(d.artistasVetados).length) anexos.push({ titulo: "MÚSICAS E ARTISTAS NÃO AUTORIZADOS", paragrafos: ["A CONTRATANTE informa que as músicas e/ou artistas abaixo relacionados não deverão ser executados durante o evento, conforme orientação fornecida no momento da contratação.", ...(itens(d.musicasVetadas).length ? [`Músicas: ${itens(d.musicasVetadas).join("; ")}`] : []), ...(itens(d.artistasVetados).length ? [`Artistas/cantores: ${itens(d.artistasVetados).join("; ")}`] : [])], anexo: true });
    if (d.observacoesRepertorio.trim()) anexos.push({ titulo: "OBSERVAÇÕES ESPECIAIS", paragrafos: [d.observacoesRepertorio.trim()], anexo: true });
    anexos.push({ titulo: "DA ATUALIZAÇÃO DO REPERTÓRIO", paragrafos: ["O repertório apresentado neste anexo corresponde às músicas selecionadas no momento da contratação e representa uma referência das preferências musicais da CONTRATANTE para o evento.", "A CONTRATADA poderá, até a data do evento, ampliar, atualizar ou enriquecer seu repertório com novas músicas, conforme a evolução natural de seu trabalho artístico e a disponibilidade de seus músicos, desde que sejam respeitadas as preferências e restrições expressamente registradas neste contrato.", "A inclusão de novas músicas no repertório geral da CONTRATADA não implica alteração automática deste contrato nem obrigação de execução de qualquer música que não tenha sido previamente selecionada, salvo se houver acordo entre as partes.", "As músicas e artistas expressamente indicados como não autorizados pela CONTRATANTE deverão ser respeitados pela CONTRATADA, dentro das possibilidades técnicas e operacionais da apresentação."], anexo: true });
    blocos.push(...anexos);
  }
  return { cabecalho: ["CONTRATO DE PRESTAÇÃO DE SERVIÇOS", "MODALIDADE: ENTRETENIMENTO MUSICAL — BANDA MULTIVIBE", `TIPO DE EVENTO: ${d.tipoEvento.toUpperCase()}`, `Contrato nº ${numero} · Emissão: ${dataBR(emissao)}`], partes, blocos, assinaturas: ["E, por estarem de acordo, as partes firmam o presente instrumento.", `${[contratado.cidade, contratado.estado].filter(Boolean).join("/") || "Local não informado"}, ${dataBR(emissao)}.`, `CONTRATANTE: ${d.contratante.nome}`, `CONTRATADA: ${contratado.nome}`] };
}
export const contarRestricoes = (texto: string) => itens(texto).length;
