import { createServerFn } from "@tanstack/react-start";
import type { AppData } from "./repertorio-store";
import type { EventoAgenda } from "./nuvem.server";

export const admBandas = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    return m.listarBandas();
  });

export const admCriarBanda = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; nome: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    const nome = data.nome.trim().slice(0, 80);
    if (!nome) throw new Error("Informe o nome da banda.");
    await m.criarBanda(nome);
    return m.listarBandas();
  });

export const admExcluirBanda = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; id: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    await m.excluirBanda(data.id);
    return m.listarBandas();
  });

export const admCriarUsuario = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; bandaId: string; usuario: string; senhaUsuario: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    const usuario = data.usuario.trim().toLowerCase().slice(0, 40);
    if (usuario.length < 3) throw new Error("Usuário precisa de ao menos 3 caracteres.");
    if (data.senhaUsuario.length < 4) throw new Error("Senha precisa de ao menos 4 caracteres.");
    await m.criarUsuario(data.bandaId, usuario, data.senhaUsuario);
    return m.listarBandas();
  });

export const admAlterarSenhaUsuario = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; id: string; novaSenha: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    if (data.novaSenha.length < 4) throw new Error("Senha precisa de ao menos 4 caracteres.");
    await m.alterarSenhaUsuario(data.id, data.novaSenha);
    return m.listarBandas();
  });

export const admExcluirUsuario = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; id: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    await m.excluirUsuario(data.id);
    return m.listarBandas();
  });

export const admDefinirPrivilegios = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; id: string; podeApagar: boolean; podeBackup: boolean; podeEditar: boolean; podeAgenda: boolean; podeAdicionarShows: boolean }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    await m.definirPrivilegios(data.id, {
      podeApagar: data.podeApagar,
      podeBackup: data.podeBackup,
      podeEditar: data.podeEditar,
      podeAgenda: data.podeAgenda,
      podeAdicionarShows: data.podeAdicionarShows,
    });
    return m.listarBandas();
  });

export const admPublicarShow = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; bandaId: string; dados: AppData }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    return m.publicarShow(data.bandaId, data.dados);
  });

export const sincronizarNuvem = createServerFn({ method: "POST" })
  .inputValidator((d: { usuario: string; senha: string; dados: AppData }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    return m.sincronizar(data.usuario, data.senha, data.dados);
  });

export const entrarComUsuario = createServerFn({ method: "POST" })
  .inputValidator((d: { usuario: string; senha: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    return m.entrarUsuario(data.usuario, data.senha);
  });

export const marcarPresenca = createServerFn({ method: "POST" })
  .inputValidator((d: { usuario: string; senha: string; sessaoId: string }) => d)
  .handler(async ({ data }) => (await import("./nuvem.server")).atualizarPresenca(data.usuario, data.senha, data.sessaoId));

export const removerPresenca = createServerFn({ method: "POST" })
  .inputValidator((d: { usuario: string; senha: string; sessaoId: string }) => d)
  .handler(async ({ data }) => (await import("./nuvem.server")).sairDaPresenca(data.usuario, data.senha, data.sessaoId));

export const usuariosOnline = createServerFn({ method: "POST" })
  .inputValidator((d: { usuario: string; senha: string }) => d)
  .handler(async ({ data }) => (await import("./nuvem.server")).listarPresencas(data.usuario, data.senha));

export const enviarAnexo = createServerFn({ method: "POST" })
  .inputValidator((d: { usuario: string; senha: string; id: string; nome: string; tipo: string; dados: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    return m.enviarAnexo(data);
  });

export const obterAnexo = createServerFn({ method: "POST" })
  .inputValidator((d: { usuario: string; senha: string; caminho: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    return m.obterUrlAnexo(data.usuario, data.senha, data.caminho);
  });

type Cred = { usuario: string; senha: string };

export const contratosListar = createServerFn({ method: "POST" })
  .inputValidator((d: Cred) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).listarContratos(data));

export const contratosConfigLer = createServerFn({ method: "POST" })
  .inputValidator((d: Cred) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).lerConfiguracao(data));

export const contratosConfigSalvar = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { config: import("./contratos").ConfigContratos }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).salvarConfiguracao(data, data.config));

export const contratosSalvar = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { dados: import("./contratos").ContratoDados; id?: string }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).salvarRascunho(data, data.dados, data.id));

export const contratosNovo = createServerFn({ method: "POST" })
  .inputValidator((d: Cred) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).novoContrato(data));

export const contratosGerar = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).gerarContrato(data, data.id));

export const contratosPdfUrl = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).urlPdfContrato(data, data.id));

export const contratosStatus = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string; status: import("./contratos").StatusContrato }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).alterarStatusContrato(data, data.id, data.status));

export const contratosNovaVersao = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).iniciarNovaVersao(data, data.id));

export const contratosHistorico = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).historicoContrato(data, data.id));

export const contratosPdfVersaoUrl = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string; versao: number }) => d)
  .handler(async ({ data }) => (await import("./contratos.server")).urlPdfVersao(data, data.id, data.versao));

export const agendaListar = createServerFn({ method: "POST" })
  .inputValidator((d: Cred) => d)
  .handler(async ({ data }) => (await import("./nuvem.server")).listarAgenda(data.usuario, data.senha));

export const agendaSalvar = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { evento: Omit<EventoAgenda, "id" | "status"> & { id?: string | undefined }; confirmarConflito?: boolean }) => d)
  .handler(async ({ data }) => (await import("./nuvem.server")).salvarEvento(data.usuario, data.senha, data.evento, data.confirmarConflito));

export const agendaExcluir = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string }) => d)
  .handler(async ({ data }) => (await import("./nuvem.server")).excluirEvento(data.usuario, data.senha, data.id));

export const agendaStatus = createServerFn({ method: "POST" })
  .inputValidator((d: Cred & { id: string; status: EventoAgenda["status"] }) => d)
  .handler(async ({ data }) => (await import("./nuvem.server")).statusEvento(data.usuario, data.senha, data.id, data.status));
