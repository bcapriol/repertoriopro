import { useCallback, useEffect, useRef, useState } from "react";

// Agenda o áudio pelo relógio de áudio, não pelo tempo de renderização do React.
export function useMetronomo(bpm: number) {
  const [tocando, setTocando] = useState(false);
  const [batida, setBatida] = useState(-1);
  const [som, setSom] = useState(true);
  const [erro, setErro] = useState("");
  const andamento = useRef(bpm);
  const audivel = useRef(som);
  const contexto = useRef<AudioContext | null>(null);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);
  const quadro = useRef<number | null>(null);
  const geracao = useRef(0);

  useEffect(() => { andamento.current = bpm; }, [bpm]);
  useEffect(() => { audivel.current = som; }, [som]);

  const limpar = useCallback(() => {
    geracao.current += 1;
    if (intervalo.current !== null) clearInterval(intervalo.current);
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    intervalo.current = null;
    quadro.current = null;
    const anterior = contexto.current;
    contexto.current = null;
    if (anterior && anterior.state !== "closed") void anterior.close().catch(() => {});
  }, []);

  const parar = useCallback(() => {
    limpar();
    setTocando(false);
    setBatida(-1);
  }, [limpar]);

  useEffect(() => {
    if (bpm <= 0) parar();
  }, [bpm, parar]);

  const iniciar = useCallback(async () => {
    limpar();
    setErro("");
    if (andamento.current <= 0) {
      setTocando(false);
      setBatida(-1);
      setErro("Defina um BPM entre 30 e 300 para iniciar.");
      return;
    }
    const versao = geracao.current;
    try {
      const Audio = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Audio) throw new Error("Áudio indisponível");
      const audio = new Audio();
      contexto.current = audio;
      await audio.resume();
      if (geracao.current !== versao) return;
      let proximo = audio.currentTime + 0.05;
      let indice = 0;
      const fila: { tempo: number; lado: number }[] = [];
      const agendar = () => {
        if (audio.state !== "running") return;
        // Não reproduzir uma rajada de batidas após o app ficar suspenso.
        if (proximo < audio.currentTime) proximo = audio.currentTime + 0.03;
        while (proximo < audio.currentTime + 0.12) {
          const lado = indice % 2;
          fila.push({ tempo: proximo, lado });
          if (audivel.current) {
            const oscilador = audio.createOscillator();
            const volume = audio.createGain();
            oscilador.frequency.value = 1100;
            volume.gain.setValueAtTime(0.0001, proximo);
            volume.gain.exponentialRampToValueAtTime(0.22, proximo + 0.002);
            volume.gain.exponentialRampToValueAtTime(0.0001, proximo + 0.035);
            oscilador.connect(volume);
            volume.connect(audio.destination);
            oscilador.start(proximo);
            oscilador.stop(proximo + 0.04);
            oscilador.onended = () => { oscilador.disconnect(); volume.disconnect(); };
          }
          proximo += 60 / andamento.current;
          indice += 1;
        }
      };
      const desenhar = () => {
        let lado: number | undefined;
        while (fila.length && fila[0]!.tempo <= audio.currentTime) lado = fila.shift()!.lado;
        if (lado !== undefined) setBatida(lado);
        quadro.current = requestAnimationFrame(desenhar);
      };
      agendar();
      intervalo.current = setInterval(agendar, 25);
      quadro.current = requestAnimationFrame(desenhar);
      setTocando(true);
    } catch {
      if (geracao.current !== versao) return;
      parar();
      setErro("Não foi possível iniciar. Toque em reproduzir para tentar novamente.");
    }
  }, [limpar, parar]);

  useEffect(() => {
    const aoOcultar = () => { if (document.hidden) parar(); };
    document.addEventListener("visibilitychange", aoOcultar);
    return () => { document.removeEventListener("visibilitychange", aoOcultar); limpar(); };
  }, [limpar, parar]);

  return { tocando, batida, som, setSom, erro, iniciar, parar };
}
