import { createServerFn } from "@tanstack/react-start";
import type { AppData } from "./repertorio-store";

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
  .inputValidator((d: { senha: string; id: string; podeApagar: boolean; podeBackup: boolean }) => d)
  .handler(async ({ data }) => {
    const m = await import("./nuvem.server");
    m.conferirSenhaAdm(data.senha);
    await m.definirPrivilegios(data.id, {
      podeApagar: data.podeApagar,
      podeBackup: data.podeBackup,
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
