import type { AppData } from "./repertorio-store";
import { baixarArquivo } from "./backup";

export type EnvioBluetooth = { ok: true; via: "compartilhar" | "arquivo" };

function nomeArquivo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `repertorio-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

export function bluetoothDisponivel() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Envia os repertórios para um aparelho próximo.
 * No celular abre a bandeja do sistema (onde o Bluetooth aparece como destino);
 * no computador salva o arquivo para enviar pelo Bluetooth do sistema.
 */
export async function enviarPorBluetooth(dados: AppData): Promise<EnvioBluetooth> {
  const conteudo = JSON.stringify({ versao: 1, ...dados }, null, 2);
  const nome = nomeArquivo();
  const arquivo = new File([conteudo], nome, { type: "application/json" });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    await nav.share({ files: [arquivo], title: "Repertórios" });
    return { ok: true, via: "compartilhar" };
  }

  baixarArquivo(conteudo, nome, "application/json");
  return { ok: true, via: "arquivo" };
}
