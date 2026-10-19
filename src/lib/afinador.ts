export const NOTAS_AFINADOR = [
  { nome: "C", alternativa: "", label: "C · Dó" },
  { nome: "C#", alternativa: "Db", label: "C# / Db" },
  { nome: "D", alternativa: "", label: "D · Ré" },
  { nome: "D#", alternativa: "Eb", label: "D# / Eb" },
  { nome: "E", alternativa: "", label: "E · Mi" },
  { nome: "F", alternativa: "", label: "F · Fá" },
  { nome: "F#", alternativa: "Gb", label: "F# / Gb" },
  { nome: "G", alternativa: "", label: "G · Sol" },
  { nome: "G#", alternativa: "Ab", label: "G# / Ab" },
  { nome: "A", alternativa: "", label: "A · Lá" },
  { nome: "A#", alternativa: "Bb", label: "A# / Bb" },
  { nome: "B", alternativa: "", label: "B · Si" },
];

export function frequenciaDaNota(midi: number, referencia: number) {
  return referencia * 2 ** ((midi - 69) / 12);
}

export function notaDaFrequencia(frequencia: number, referencia: number) {
  const midi = Math.round(69 + 12 * Math.log2(frequencia / referencia));
  return { ...NOTAS_AFINADOR[((midi % 12) + 12) % 12], midi, oitava: Math.floor(midi / 12) - 1 };
}

export function diferencaEmCents(frequencia: number, alvo: number) {
  return 1200 * Math.log2(frequencia / alvo);
}

// YIN: primeira periodicidade confiável, com interpolação subamostra.
// A redução de amostragem mantém o processamento leve em celulares.
export function criarDetectorAfinacao(sampleRate: number, tamanho = 4096) {
  const passo = Math.max(1, Math.floor(sampleRate / 12000));
  const taxa = sampleRate / passo;
  const sinal = new Float32Array(Math.floor(tamanho / passo));
  const janela = Math.floor(sinal.length / 2);
  const maxLag = Math.min(janela - 1, Math.ceil(taxa / 25));
  const minLag = Math.max(2, Math.floor(taxa / 2200));
  const diferencas = new Float32Array(maxLag + 1);

  return (entrada: Float32Array): { frequencia: number | null; nivel: number } => {
    let media = 0;
    for (let i = 0; i < sinal.length; i++) {
      let soma = 0;
      for (let j = 0; j < passo; j++) soma += entrada[i * passo + j];
      sinal[i] = soma / passo;
      media += sinal[i];
    }
    media /= sinal.length;
    let energia = 0;
    for (let i = 0; i < sinal.length; i++) {
      sinal[i] -= media;
      energia += sinal[i] * sinal[i];
    }
    const nivel = Math.sqrt(energia / sinal.length);
    if (nivel < 0.006) return { frequencia: null, nivel };

    let acumulada = 0;
    diferencas[0] = 1;
    for (let lag = 1; lag <= maxLag; lag++) {
      let soma = 0;
      for (let i = 0; i < janela; i++) {
        const delta = sinal[i] - sinal[i + lag];
        soma += delta * delta;
      }
      acumulada += soma;
      diferencas[lag] = acumulada > 0 ? (soma * lag) / acumulada : 1;
    }
    for (let lag = minLag; lag < maxLag; lag++) {
      if (diferencas[lag] >= 0.12) continue;
      while (lag + 1 <= maxLag && diferencas[lag + 1] < diferencas[lag]) lag++;
      if (lag >= maxLag) return { frequencia: null, nivel };
      const esquerda = diferencas[lag - 1];
      const centro = diferencas[lag];
      const direita = diferencas[lag + 1];
      const divisor = esquerda - 2 * centro + direita;
      const ajuste = divisor ? Math.max(-1, Math.min(1, (esquerda - direita) / (2 * divisor))) : 0;
      const frequencia = taxa / (lag + ajuste);
      return { frequencia: frequencia >= 25 && frequencia <= 2200 ? frequencia : null, nivel };
    }
    return { frequencia: null, nivel };
  };
}
