import { useCallback, useEffect, useRef, useState } from "react";
import { criarDetectorAfinacao } from "@/lib/afinador";

type Estado = "parado" | "iniciando" | "ouvindo";
type Recursos = {
  iniciando?: boolean;
  contexto?: AudioContext;
  stream?: MediaStream;
  fonte?: MediaStreamAudioSourceNode;
  analisador?: AnalyserNode;
  frame?: number;
};

function mensagemErro(erro: unknown) {
  const nome = erro instanceof Error ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "O aparelho ou o navegador não autorizou o microfone. Libere o acesso nas configurações e tente novamente abaixo. O afinador não consegue alterar essa permissão sozinho.";
  }
  if (nome === "AudioContextSuspended") {
    return "O aparelho está aguardando um toque para liberar o áudio. Toque em Tentar acesso novamente.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Entrada de áudio não encontrada. Conecte o microfone ou a interface e escolha a entrada padrão para tentar novamente.";
  }
  if (nome === "NotReadableError" || nome === "AbortError") {
    return "Não foi possível abrir a entrada. Verifique a conexão e se outro aplicativo está usando o microfone.";
  }
  return "Não foi possível iniciar o áudio. Tente novamente em um navegador atualizado, com permissão para usar o microfone.";
}

export function useAfinador() {
  const [estado, setEstado] = useState<Estado>("parado");
  const [frequencia, setFrequencia] = useState<number | null>(null);
  const [nivel, setNivel] = useState(0);
  const [erro, setErro] = useState("");
  const [entradas, setEntradas] = useState<MediaDeviceInfo[]>([]);
  const recursos = useRef<Recursos>({});
  const sessao = useRef(0);
  const montado = useRef(false);

  const liberar = useCallback(() => {
    const atual = recursos.current;
    recursos.current = {};
    if (atual.frame !== undefined) cancelAnimationFrame(atual.frame);
    atual.stream?.getTracks().forEach((track) => track.stop());
    atual.fonte?.disconnect();
    atual.analisador?.disconnect();
    if (atual.contexto && atual.contexto.state !== "closed") {
      void atual.contexto.close().catch(() => undefined);
    }
  }, []);

  const parar = useCallback(() => {
    sessao.current++;
    liberar();
    setEstado("parado");
    setFrequencia(null);
    setNivel(0);
  }, [liberar]);

  const atualizarEntradas = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      if (montado.current) setEntradas(dispositivos.filter((d) => d.kind === "audioinput" && d.deviceId));
    } catch { /* A lista é opcional: a entrada padrão continua disponível. */ }
  }, []);

  useEffect(() => {
    montado.current = true;
    void atualizarEntradas();
    // A janela de permissão nativa pode ocultar o WebView temporariamente.
    const aoOcultar = () => { if (document.hidden && !recursos.current.iniciando) parar(); };
    const dispositivos = navigator.mediaDevices;
    dispositivos?.addEventListener?.("devicechange", atualizarEntradas);
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", parar);
    return () => {
      montado.current = false;
      sessao.current++;
      liberar();
      dispositivos?.removeEventListener?.("devicechange", atualizarEntradas);
      document.removeEventListener("visibilitychange", aoOcultar);
      window.removeEventListener("pagehide", parar);
    };
  }, [atualizarEntradas, liberar, parar]);

  const iniciar = useCallback(async (entrada: string) => {
    if (!montado.current || document.hidden || recursos.current.iniciando) return;
    const id = ++sessao.current;
    liberar();
    setErro("");
    setFrequencia(null);
    setNivel(0);
    setEstado("iniciando");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErro("Este navegador não disponibilizou o microfone. Abra o app por HTTPS em um navegador atualizado; aplicativos que incorporam o site também precisam liberar o áudio.");
      setEstado("parado");
      return;
    }
    recursos.current.iniciando = true;
    try {
      const Audio = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) throw new Error("Áudio indisponível");
      const contexto = new Audio();
      recursos.current.contexto = contexto;
      // Não espere o áudio desbloquear para solicitar o microfone: em WebViews,
      // resume() pode ficar pendente até uma interação ou autorização do usuário.
      const retomada = contexto.resume().catch(() => undefined);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(entrada ? { deviceId: { exact: entrada } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (id !== sessao.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recursos.current.stream = stream;
      // Alguns aparelhos só liberam o contexto depois de autorizar a captura.
      if (contexto.state !== "running") {
        const novaRetomada = contexto.resume().catch(() => undefined);
        let limite: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            Promise.all([retomada, novaRetomada]),
            new Promise<void>((resolve) => { limite = setTimeout(resolve, 1500); }),
          ]);
        } finally {
          if (limite !== undefined) clearTimeout(limite);
        }
      }
      if (id !== sessao.current) return;
      if (contexto.state !== "running") {
        const falha = new Error("Áudio aguardando interação");
        falha.name = "AudioContextSuspended";
        throw falha;
      }
      if (document.hidden) { parar(); return; }
      recursos.current.iniciando = false;
      // A análise é local e nunca é conectada à saída de som (sem retorno).
      const fonte = contexto.createMediaStreamSource(stream);
      const analisador = contexto.createAnalyser();
      analisador.fftSize = contexto.sampleRate > 48000 ? 8192 : 4096;
      analisador.smoothingTimeConstant = 0;
      fonte.connect(analisador);
      recursos.current.fonte = fonte;
      recursos.current.analisador = analisador;
      const buffer = new Float32Array(analisador.fftSize);
      const detectar = criarDetectorAfinacao(contexto.sampleRate, buffer.length);
      let ultimaAnalise = -Infinity;
      let ultimoSinal = -Infinity;
      let historico: number[] = [];
      const analisar = (tempo: number) => {
        if (id !== sessao.current) return;
        if (contexto.state !== "running") {
          parar();
          setErro("A captura foi interrompida pelo aparelho. Feche e reabra o afinador para retomar.");
          return;
        }
        if (tempo - ultimaAnalise >= 65) {
          ultimaAnalise = tempo;
          analisador.getFloatTimeDomainData(buffer);
          const leitura = detectar(buffer);
          setNivel(Math.min(1, leitura.nivel * 5));
          if (leitura.frequencia !== null) {
            const anterior = historico[historico.length - 1];
            if (anterior && Math.abs(1200 * Math.log2(leitura.frequencia / anterior)) > 35) {
              historico = [];
              setFrequencia(null);
            }
            historico.push(leitura.frequencia);
            if (historico.length > 5) historico.shift();
            ultimoSinal = tempo;
            if (historico.length >= 3) {
              const ordenado = [...historico].sort((a, b) => a - b);
              setFrequencia(ordenado[Math.floor(ordenado.length / 2)]);
            }
          } else if (tempo - ultimoSinal > 200) {
            historico = [];
            setFrequencia(null);
          }
        }
        recursos.current.frame = requestAnimationFrame(analisar);
      };
      stream.getAudioTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (id !== sessao.current) return;
          parar();
          setErro("A entrada de áudio foi desconectada. Confira o cabo ou microfone e inicie novamente.");
        }, { once: true });
      });
      setEstado("ouvindo");
      void atualizarEntradas();
      recursos.current.frame = requestAnimationFrame(analisar);
    } catch (falha) {
      if (id !== sessao.current) return;
      parar();
      setErro(mensagemErro(falha));
    }
  }, [atualizarEntradas, liberar, parar]);

  return { estado, frequencia, nivel, erro, entradas, iniciar, parar };
}
