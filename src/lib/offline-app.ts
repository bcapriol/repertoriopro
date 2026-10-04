import { useEffect, useState } from "react";
import type { AppData } from "./repertorio-store";

type CopiaTelas = { preparedAt: number; pages: number };
type EstadoOffline = { preparando: boolean; copia: CopiaTelas | null; erro: string };
let estado: EstadoOffline = { preparando: false, copia: null, erro: "" };
const ouvintes = new Set<() => void>();
let registro: Promise<ServiceWorker> | null = null;
let preparando: Promise<boolean> | null = null;

function publicar(next: Partial<EstadoOffline>) {
  estado = { ...estado, ...next };
  ouvintes.forEach((fn) => fn());
}

export function useOfflineApp() {
  const [value, setValue] = useState<EstadoOffline>({ preparando: false, copia: null, erro: "" });
  useEffect(() => {
    const atualizar = () => setValue(estado);
    atualizar();
    ouvintes.add(atualizar);
    return () => { ouvintes.delete(atualizar); };
  }, []);
  return value;
}

function comPrazo<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("O acesso offline não respondeu. Reabra o app com internet e tente novamente.")), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

async function registrarWorker(): Promise<ServiceWorkerRegistration> {
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch (erroArquivo) {
    // Alguns ambientes não entregam o arquivo público; usa o mesmo código pelo servidor.
    try {
      return await navigator.serviceWorker.register("/offline-worker", { scope: "/", updateViaCache: "none" });
    } catch (erroServidor) {
      console.warn("Falha ao instalar a abertura offline", { erroArquivo, erroServidor });
      if (!navigator.onLine) {
        throw new Error("Conecte-se à internet para preparar a abertura offline neste aparelho.");
      }
      const previa = window.location.hostname.startsWith("id-preview-") && window.location.hostname.endsWith(".lovable.app");
      throw new Error(previa
        ? "A prévia não conseguiu carregar o recurso de abertura offline. Publique esta atualização, abra o endereço publicado neste aparelho e toque em SINCRONIZAR P/ OFFLINE. A abertura sem internet ainda não está confirmada."
        : "Não foi possível carregar o recurso de abertura offline. Reabra o app com internet e tente novamente. Se persistir, confira se a atualização foi publicada. A abertura sem internet ainda não está confirmada.");
    }
  }
}

async function worker(): Promise<ServiceWorker> {
  if (!registro) {
    registro = (async () => {
      if (!window.isSecureContext || !("serviceWorker" in navigator)) {
        throw new Error("Este navegador ou APK não permite preparar a abertura offline. Verifique a configuração do aplicativo no Median.");
      }
      const existente = await navigator.serviceWorker.getRegistration("/");
      const registration = !navigator.onLine && existente?.active
        ? existente
        : await registrarWorker().catch((error) => {
          if (existente?.active) return existente;
          throw error;
        });
      const installing = registration.installing ?? registration.waiting;
      if (installing && installing.state !== "activated") {
        await comPrazo(new Promise<void>((resolve, reject) => {
          const changed = () => {
            if (installing.state === "activated" || installing.state === "redundant") {
              installing.removeEventListener("statechange", changed);
              if (installing.state === "activated") resolve();
              else reject(new Error("Não foi possível instalar a versão offline. Tente novamente."));
            }
          };
          installing.addEventListener("statechange", changed);
          changed();
        }));
      }
      const ready = await comPrazo(navigator.serviceWorker.ready);
      if (!ready.active) throw new Error("A cópia offline ainda não está disponível.");
      return ready.active;
    })().catch((error) => { registro = null; throw error; });
  }
  return comPrazo(registro);
}

async function mensagem<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
  const active = await worker();
  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error("O preparo offline demorou demais. Mantenha o app aberto com internet e tente novamente."));
    }, type === "PREPARE_OFFLINE" ? 240000 : 15000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timer);
      channel.port1.close();
      if (data.ok) resolve(data.result as T);
      else reject(new Error(data.error));
    };
    active.postMessage({ type, ...payload }, [channel.port2]);
  });
}

export async function verificarTelasOffline() {
  try { publicar({ copia: await mensagem<CopiaTelas | null>("OFFLINE_STATUS"), erro: "" }); }
  catch (error) { publicar({ erro: error instanceof Error ? error.message : "Não foi possível verificar a abertura offline." }); }
}

export function prepararTelasOffline(dados: AppData): Promise<boolean> {
  // Uma sincronização pode trazer repertórios enquanto a cópia inicial ainda está em andamento.
  if (preparando) return preparando.then(() => prepararTelasOffline(dados));
  preparando = (async () => {
    publicar({ preparando: true, erro: "" });
    try {
      if (!navigator.onLine) { await verificarTelasOffline(); return !!estado.copia; }
      const workerPdf = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      const paths = ["/", "/musicas", "/repertorios", "/sincronizar", "/dados", "/cadastrar"];
      for (const rep of dados.setlists) {
        paths.push(`/repertorios/${encodeURIComponent(rep.id)}`, `/repertorios/${encodeURIComponent(rep.id)}/palco`);
      }
      const assets = [workerPdf.default, ...Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src],link[rel=stylesheet],link[rel=modulepreload]"), (el) => el instanceof HTMLScriptElement ? el.src : el.href)];
      const copia = await mensagem<CopiaTelas>("PREPARE_OFFLINE", { paths, assets });
      publicar({ copia, erro: "" });
      return true;
    } catch (error) {
      publicar({ erro: error instanceof Error ? error.message : "Não foi possível preparar as telas offline. Libere espaço e tente novamente." });
      return false;
    } finally { preparando = null; publicar({ preparando: false }); }
  })();
  return preparando;
}
