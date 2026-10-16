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


