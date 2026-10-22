import { notificacoesRevogar, notificacoesVincular } from "./notificacoes.functions";
import { lerConta } from "./banda-local";

type Info = {
  oneSignalUserId?: string; oneSignalSubscribed?: boolean;
  subscriptionId?: string; isSubscribed?: boolean;
  pushSubscription?: { id?: string; optedIn?: boolean };
};
type Bridge = { info: (opcoes: { callback: (info: Info) => void }) => void; register?: () => void };
type NativeWindow = Window & { median?: { onesignal?: Bridge }; gonative?: { onesignal?: Bridge } };
type Vinculo = { usuario: string; assinatura: string; token: string };
const CHAVE = "rf-avisos-aparelho";
const PENDENTES = "rf-avisos-revogacoes";
export const EVENTO_AVISOS = "rf-avisos-atualizados";

export function bridgeNotificacoes() {
  const w = window as NativeWindow;
  return w.median?.onesignal ?? w.gonative?.onesignal;
}
export function lerVinculo(): Vinculo | null {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Vinculo | null;
    return v?.token && v.usuario && v.assinatura ? v : null;
  } catch { return null; }
}
function pendentes(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(PENDENTES) ?? "[]");
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
  } catch { return []; }
}
function avisar() { window.dispatchEvent(new Event(EVENTO_AVISOS)); }
export async function limparRevogacoes() {
  for (const token of pendentes()) {
    await notificacoesRevogar({ data: { token } });
    localStorage.setItem(PENDENTES, JSON.stringify(pendentes().filter((t) => t !== token)));
  }
}
export function consultarAparelho(): Promise<{ assinatura: string; permitido: boolean }> {
  return new Promise((resolve, reject) => {
    const bridge = bridgeNotificacoes();
    if (!bridge?.info) { reject(new Error("Abra o aplicativo Median com a integração OneSignal habilitada. O navegador e o atalho instalado não recebem estes avisos.")); return; }
    const timer = setTimeout(() => reject(new Error("O aplicativo não respondeu. Confira a integração OneSignal no Median e tente novamente.")), 8000);
    try {
      bridge.info({ callback: (info) => {
        clearTimeout(timer);
        if (!info || typeof info !== "object") { reject(new Error("Não foi possível consultar as notificações do aparelho.")); return; }
        const assinatura = info.pushSubscription?.id ?? info.subscriptionId ?? info.oneSignalUserId ?? "";
        const permitido = info.pushSubscription?.optedIn ?? info.isSubscribed ?? info.oneSignalSubscribed ?? false;
        resolve({ assinatura, permitido: permitido === true });
      } });
    } catch { clearTimeout(timer); reject(new Error("Não foi possível consultar o OneSignal neste aplicativo.")); }
  });
}
export async function desativarAparelho() {
  const v = lerVinculo();
  if (v) {
    localStorage.setItem(PENDENTES, JSON.stringify([...new Set([...pendentes(), v.token])]));
    localStorage.removeItem(CHAVE);
    avisar();
  }
  await limparRevogacoes();
}
export async function ativarAparelho() {
  const conta = lerConta();
  if (!conta?.podeAgenda) throw new Error("Entre com um usuário que tenha acesso à agenda.");
  if (!navigator.onLine) throw new Error("Conecte-se à internet para ativar os avisos.");
  // Confere o armazenamento antes de criar uma autorização que precise ser revogada depois.
  localStorage.setItem(PENDENTES, JSON.stringify(pendentes()));
  await limparRevogacoes();
  const bridge = bridgeNotificacoes();
  if (!bridge?.info) throw new Error("Use o aplicativo Median integrado ao OneSignal; o navegador não está habilitado para estes avisos.");
  let info = await consultarAparelho();
  if (!info.permitido || !info.assinatura) {
    bridge.register?.();
    for (let tentativa = 0; tentativa < 12; tentativa++) {
      await new Promise((r) => setTimeout(r, 1500));
      info = await consultarAparelho();
      if (info.permitido && info.assinatura) break;
    }
  }
  if (!info.permitido || !info.assinatura) throw new Error("Autorize as notificações nas configurações do celular, aguarde alguns segundos e tente novamente.");
  if (lerConta()?.usuario !== conta.usuario) throw new Error("A conta mudou. Tente novamente.");
  const anterior = lerVinculo();
  if (anterior) await desativarAparelho();
  const { token } = await notificacoesVincular({ data: { usuario: conta.usuario, senha: conta.senha, assinatura: info.assinatura } });
  if (lerConta()?.usuario !== conta.usuario) {
    localStorage.setItem(PENDENTES, JSON.stringify([...pendentes(), token]));
    await limparRevogacoes();
    throw new Error("A conta mudou. Ative os avisos com a nova conta.");
  }
  localStorage.setItem(CHAVE, JSON.stringify({ usuario: conta.usuario, assinatura: info.assinatura, token } satisfies Vinculo));
  avisar();
}

export async function conferirVinculo() {
  await limparRevogacoes();
  const v = lerVinculo();
  if (!v) return;
  const conta = lerConta();
  if (!conta || conta.usuario !== v.usuario || !conta.podeAgenda) { await desativarAparelho(); return; }
  if (!bridgeNotificacoes()?.info) return;
  const info = await consultarAparelho();
  if (!info.permitido || (info.assinatura && info.assinatura !== v.assinatura)) await desativarAparelho();
}
