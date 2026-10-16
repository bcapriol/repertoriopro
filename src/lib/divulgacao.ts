import { z } from "zod";

export const formatosDivulgacao = {
  instagram: { nome: "Instagram · quadrado", proporcao: "1:1", largura: 1080, altura: 1080 },
  status: { nome: "Status do WhatsApp · vertical", proporcao: "9:16", largura: 1080, altura: 1920 },
  tv: { nome: "TV · horizontal", proporcao: "16:9", largura: 1920, altura: 1080 },
} as const;
export type FormatoDivulgacao = keyof typeof formatosDivulgacao;
export const instagramBanda = "@multivibe.banda";
export const camposDivulgacaoSchema = z.object({
  data: z.string().max(10).default(""),
  hora: z.string().max(5).default(""),
  endereco: z.string().trim().max(500).default(""),
  entrada: z.string().trim().max(120).default(""),
  adicional: z.string().trim().max(2000).default(""),
  ajuda: z.string().trim().max(2000).default(""),
  formato: z.enum(["instagram", "status", "tv"]).default("instagram"),
});
export type CamposDivulgacao = z.infer<typeof camposDivulgacaoSchema>;
export const camposIniciais: CamposDivulgacao = {
  data: "", hora: "", endereco: "", entrada: "", adicional: "", ajuda: "", formato: "instagram",
};
export const imagemDivulgacaoSchema = z.object({
  papel: z.enum(["logoBanda", "logoLocal", "fotoBanda"]),
  dados: z.string().max(2_800_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
});
export type ImagemDivulgacao = z.infer<typeof imagemDivulgacaoSchema>;
export const nomesImagens = {
  logoBanda: "Logotipo da banda",
  logoLocal: "Logotipo do local",
  fotoBanda: "Foto da banda",
} as const;
const direcoesVisuais = [
  "Atmosfera de show com iluminação de palco, paleta harmoniosa e contraste forte. Composição dinâmica com destaque para a banda e os dados do evento.",
  "Visual elegante e minimalista, fundo discreto, tipografia marcante e bastante espaço entre os elementos. Dê destaque à identidade da banda.",
  "Visual de pôster musical contemporâneo, com formas gráficas e iluminação vibrante. Distribua o conteúdo em uma hierarquia clara e equilibrada.",
];

/** Monta as instruções no próprio aparelho, sem IA, credenciais ou chamadas de rede. */
export function montarPromptDivulgacao(campos: CamposDivulgacao, imagens: ImagemDivulgacao[], variacao = 0): string {
  const formato = formatosDivulgacao[campos.formato];
  const data = campos.data ? campos.data.split("-").reverse().join("/") : "";
  const textos = ["Banda Multivibe", data, campos.hora, campos.endereco, campos.entrada, campos.adicional, instagramBanda]
    .map((texto) => texto.trim()).filter(Boolean);
  const referencias = imagens.map((imagem) => `${nomesImagens[imagem.papel]} (arquivo identificado por ${imagem.papel}).`);
  return [
    "Crie uma única arte final de divulgação de show da Banda Multivibe. Gere a imagem, não apenas uma descrição ou outro prompt.",
    `Formato: ${formato.nome}; proporção ${formato.proporcao}; dimensões desejadas de ${formato.largura} × ${formato.altura} pixels.`,
    "Textos que devem aparecer na arte, com a grafia exata (as aspas e os marcadores abaixo são apenas delimitadores):",
    ...textos.map((texto) => `• ${JSON.stringify(texto)}`),
    "Não imprima os títulos dos campos, como Data, Hora início, Endereço, Valor de Entrada, Informação importante adicional ou Ajuda no prompt. Omita informações ausentes. Não invente data, horário, local, preço, atrações ou patrocínios.",
    `Direção visual: ${direcoesVisuais[variacao % direcoesVisuais.length]}`,
    campos.ajuda.trim() ? `Orientações visuais adicionais do usuário (não imprimir este texto na arte): ${campos.ajuda.trim()}` : "",
    "Use tipografia legível, bom contraste, margens de segurança e hierarquia visual. Mantenha todos os textos, rostos e logotipos longe das bordas, com leitura confortável em celular e TV.",
    referencias.length
      ? `Referências que anexarei nesta conversa: ${referencias.join(" ")} Preserve a identidade dos logotipos e dos integrantes, sem inventar pessoas ou alterar rostos. Se alguma dessas imagens não estiver anexada, peça que eu a envie antes de gerar a arte.`
      : "Não há imagens de referência fornecidas. Não invente logotipos nem fotos dos integrantes; trabalhe com elementos gráficos e o nome da banda.",
    "Não inclua na arte estas instruções de produção. Entregue a imagem final para download, preferencialmente em PNG.",
  ].filter(Boolean).join("\n\n");
}
