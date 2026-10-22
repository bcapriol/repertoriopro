import { createServerFn } from "@tanstack/react-start";

export type ConfigNotificacoes = {
  ativo: boolean;
  avisar_vespera: boolean;
  hora_vespera: string;
  avisar_dia: boolean;
  hora_dia: string;
  fuso: string;
};
export const CONFIG_NOTIFICACOES: ConfigNotificacoes = {
  ativo: false, avisar_vespera: true, hora_vespera: "09:00",
  avisar_dia: true, hora_dia: "09:00", fuso: "America/Sao_Paulo",
};
type Cred = { usuario: string; senha: string };

export const admNotificacoesLer = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; bandaId: string }) => d)
  .handler(async ({ data }) => (await import("./notificacoes.server")).lerConfiguracao(data));

export const admNotificacoesSalvar = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; bandaId: string; config: ConfigNotificacoes; usuarios: { id: string; ativo: boolean }[] }) => d)
  .handler(async ({ data }) => (await import("./notificacoes.server")).salvarConfiguracao(data));

export const admNotificacoesAtivarServico = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string }) => d)
  .handler(async ({ data }) => (await import("./notificacoes.server")).ativarServico(data.senha));

export const notificacoesVincular = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { assinatura: string }) => d)
  .handler(async ({ data }) => (await import("./notificacoes.server")).vincularAparelho(data));

export const notificacoesRevogar = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => (await import("./notificacoes.server")).revogarAparelho(data.token));

export const notificacoesSituacao = createServerFn({ method: "POST" })
  .inputValidator((d: Cred) => d)
  .handler(async ({ data }) => (await import("./notificacoes.server")).situacaoUsuario(data));

export const notificacoesTestar = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { assinatura: string }) => d)
  .handler(async ({ data }) => (await import("./notificacoes.server")).testarAparelho(data));
