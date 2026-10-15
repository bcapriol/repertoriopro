import { createServerFn } from "@tanstack/react-start";
import { credDivulgacaoSchema, pedidoArteSchema, pedidoDivulgacaoSchema } from "./divulgacao";

export const divulgacaoStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credDivulgacaoSchema.parse(d))
  .handler(async ({ data }) => (await import("./divulgacao.server")).statusDivulgacao(data));

export const divulgacaoPrompt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pedidoDivulgacaoSchema.parse(d))
  .handler(async ({ data }) => (await import("./divulgacao.server")).criarPromptDivulgacao(data));

export const divulgacaoArte = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pedidoArteSchema.parse(d))
  .handler(async ({ data }) => (await import("./divulgacao.server")).criarArteDivulgacao(data));
