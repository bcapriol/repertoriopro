import { jsPDF } from "jspdf";
import type { ContratoDados } from "./contratos";
import { redigirContrato } from "./contratos-documento";

// A4 em milímetros. Os blocos são medidos antes da impressão para evitar títulos órfãos.
export function gerarPdfContrato(dados: ContratoDados, numero: string, emissao: string): Uint8Array {
  const documento = redigirContrato(dados, numero, emissao);
  const pdf = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const largura = 210, altura = 297, margem = 20, topo = 30, limite = 267, linha = 5.1;
  let y = topo;
  const limpar = (texto: string) => texto.replace(/\u2014/g, "-").replace(/\u2013/g, "-").replace(/\u2019/g, "'").replace(/\u201c|\u201d/g, '"').replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, "");
  const novaPagina = () => { pdf.addPage(); y = topo; };
  const garantir = (espaco: number) => { if (y + espaco > limite) novaPagina(); };
  const escrever = (texto: string, tamanho = 10, negrito = false, recuo = 0) => {
    pdf.setFont("helvetica", negrito ? "bold" : "normal");
    pdf.setFontSize(tamanho);
    const linhas: string[] = pdf.splitTextToSize(limpar(texto), largura - 2 * margem - recuo);
    // Uma linha longa pode continuar na página seguinte, mas nunca sobrepor o rodapé.
    for (const l of linhas) { garantir(linha); pdf.text(l, margem + recuo, y); y += linha; }
    y += 1.8;
  };
  pdf.setTextColor(35, 40, 46);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(documento.cabecalho[0] ?? "", largura / 2, y, { align: "center" }); y += 9;
  documento.cabecalho.slice(1).forEach((texto) => escrever(texto, 9, true));
  y += 5;
  for (const parte of documento.partes) { garantir(15); escrever(parte, 10); y += 3; }
  const assinaturas = () => {
    garantir(58);
    escrever(documento.assinaturas[0] ?? "", 10, true);
    escrever(documento.assinaturas[1] ?? "", 10);
    y += 12;
    for (const nome of documento.assinaturas.slice(2)) {
      garantir(16);
      pdf.setDrawColor(80, 80, 80);
      pdf.line(margem, y, margem + 75, y);
      y += 5;
      escrever(nome, 9);
      y += 5;
    }
  };
  let assinou = false;
  for (const bloco of documento.blocos) {
    if (bloco.anexo && !assinou) { assinaturas(); novaPagina(); assinou = true; }
    // Mantenha o título junto ao primeiro parágrafo sempre que ele couber numa página.
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    const primeiraParte = pdf.splitTextToSize(limpar(bloco.paragrafos[0] ?? ""), largura - 2 * margem) as string[];
    garantir(Math.min(limite - topo, 14 + primeiraParte.length * linha + 4));
    y += 3;
    pdf.setDrawColor(220, 225, 230); pdf.line(margem, y - 2, largura - margem, y - 2);
    escrever(bloco.titulo, 10, true);
    y += 1;
    if (bloco.repertorio) {
      const cabecalhoTabela = () => {
        garantir(9);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
        pdf.setFillColor(240, 241, 242); pdf.rect(margem, y - 4, largura - margem * 2, 8, "F");
        pdf.text("Nº", margem + 2, y); pdf.text("Música", margem + 16, y); pdf.text("Artista/Cantor", margem + 94, y);
        y += 9;
      };
      cabecalhoTabela();
      bloco.repertorio.forEach((musica, i) => {
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
        const titulo = pdf.splitTextToSize(limpar(musica.titulo), 75) as string[];
        const artista = pdf.splitTextToSize(limpar(musica.artista), 55) as string[];
        const nota = [musica.momento, musica.observacao].filter(Boolean).join(" · ");
        const observacao = nota ? pdf.splitTextToSize(limpar(nota), 134) as string[] : [];
        const alturaLinha = Math.max(titulo.length, artista.length) * 4.8 + observacao.length * 4.8 + 4;
        if (y + alturaLinha > limite) { novaPagina(); cabecalhoTabela(); }
        pdf.text(String(i + 1).padStart(2, "0"), margem + 2, y);
        titulo.forEach((texto, pos) => pdf.text(texto, margem + 16, y + pos * 4.8));
        artista.forEach((texto, pos) => pdf.text(texto, margem + 94, y + pos * 4.8));
        y += Math.max(titulo.length, artista.length) * 4.8;
        observacao.forEach((texto, pos) => pdf.text(texto, margem + 16, y + pos * 4.8));
        y += observacao.length * 4.8 + 4;
        pdf.setDrawColor(225, 225, 225); pdf.line(margem, y - 2, largura - margem, y - 2);
      });
      continue;
    }
    for (const paragrafo of bloco.paragrafos) {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      const linhas = pdf.splitTextToSize(limpar(paragrafo), largura - 2 * margem) as string[];
      if (linhas.length * linha + 4 <= limite - topo) garantir(linhas.length * linha + 4);
      for (let i = 0; i < linhas.length; i++) {
        if (y + linha > limite) novaPagina();
        pdf.text(linhas[i] ?? "", margem, y); y += linha;
      }
      y += 4;
    }
  }
  if (!assinou) assinaturas();
  const total = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    pdf.setPage(pagina);
    pdf.setTextColor(100, 108, 116); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.text(`BANDA MULTIVIBE  |  CONTRATO ${limpar(numero)}  |  ${limpar(dados.nomeEvento)}`, margem, 15, { maxWidth: largura - 2 * margem });
    pdf.setDrawColor(210, 210, 210); pdf.line(margem, 18, largura - margem, 18); pdf.line(margem, 277, largura - margem, 277);
    pdf.text(limpar(dados.configSnapshot?.rodape || "Banda Multivibe · Contrato de prestação de serviços"), margem, 284, { maxWidth: 125 });
    pdf.text(`Página ${pagina} de ${total}`, largura - margem, 284, { align: "right" });
  }
  return new Uint8Array(pdf.output("arraybuffer"));
}
