import { z } from "zod";

export const formatosDivulgacao = {
  instagram: { nome: "Instagram · quadrado", proporcao: "1:1", largura: 1080, altura: 1080, tamanhoIA: "1024x1024" },
  status: { nome: "Status do WhatsApp · vertical", proporcao: "9:16", largura: 1080, altura: 1920, tamanhoIA: "1024x1536" },
  tv: { nome: "TV · horizontal", proporcao: "16:9", largura: 1920, altura: 1080, tamanhoIA: "1536x1024" },
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
export const credDivulgacaoSchema = z.object({ usuario: z.string().min(1).max(100), senha: z.string().min(1).max(500) });
export const pedidoDivulgacaoSchema = credDivulgacaoSchema.extend({
  campos: camposDivulgacaoSchema,
  imagens: z.array(imagemDivulgacaoSchema).max(3).refine((itens) => new Set(itens.map((i) => i.papel)).size === itens.length),
  anterior: z.string().max(12000).default(""),
});
export const pedidoArteSchema = pedidoDivulgacaoSchema.omit({ anterior: true }).extend({ prompt: z.string().trim().min(20).max(12000) });
export type PedidoDivulgacao = z.infer<typeof pedidoDivulgacaoSchema>;
export type PedidoArte = z.infer<typeof pedidoArteSchema>;
