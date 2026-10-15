import { formatosDivulgacao, type FormatoDivulgacao } from "./divulgacao";

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Não foi possível abrir esta imagem. Use JPG, PNG ou WebP."));
    imagem.src = src;
  });
}

export async function prepararImagemDivulgacao(arquivo: File, foto: boolean): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }
  if (arquivo.size > 10 * 1024 * 1024) throw new Error("Cada imagem pode ter até 10 MB.");
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = await carregarImagem(url);
    const canvas = document.createElement("canvas");
    let escala = Math.min(1, 1536 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Este aparelho não conseguiu preparar a imagem.");
      if (foto) { ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      const dados = canvas.toDataURL(foto ? "image/jpeg" : "image/png", 0.9);
      if (dados.length <= 2_800_000) return dados;
      escala *= 0.75;
    }
    throw new Error("A imagem ficou muito grande. Escolha uma versão menor.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A OpenAI não fornece 9:16/16:9 nativos: completa as bordas sem cortar texto ou rostos. */
export async function ajustarArteDivulgacao(src: string, formato: FormatoDivulgacao): Promise<string> {
  const imagem = await carregarImagem(src);
  const { largura, altura } = formatosDivulgacao[formato];
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível ajustar as dimensões da arte neste aparelho.");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, largura, altura);
  const fundo = Math.max(largura / imagem.naturalWidth, altura / imagem.naturalHeight) * 1.12;
  const fw = imagem.naturalWidth * fundo;
  const fh = imagem.naturalHeight * fundo;
  ctx.save();
  ctx.filter = "blur(32px)";
  ctx.drawImage(imagem, (largura - fw) / 2, (altura - fh) / 2, fw, fh);
  ctx.restore();
  const escala = Math.min(largura / imagem.naturalWidth, altura / imagem.naturalHeight);
  const w = imagem.naturalWidth * escala;
  const h = imagem.naturalHeight * escala;
  ctx.drawImage(imagem, (largura - w) / 2, (altura - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}
