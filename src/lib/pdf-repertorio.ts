import type { Setlist, Song } from "./repertorio-store";

const formatarData = (iso: string) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
};

const semArquivo = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "repertorio";

/** Gera e baixa o PDF com a ordem das músicas do repertório. */
export async function exportarRepertorioPdf(rep: Setlist, songsById: Record<string, Song>) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();
  const margem = 48;
  let y = margem;

  const novaPagina = () => {
    doc.addPage();
    y = margem;
  };
  const garantirEspaco = (altura: number) => {
    if (y + altura > alturaPagina - margem) novaPagina();
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(rep.nome, margem, y);
  y += 22;

  const sub = [rep.local, formatarData(rep.data), `${rep.songIds.length} música(s)`]
    .filter(Boolean)
    .join("  ·  ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(sub, margem, y);
  y += 16;
  doc.setDrawColor(200);
  doc.line(margem, y, larguraPagina - margem, y);
  y += 20;
  doc.setTextColor(0);

  rep.songIds.forEach((id, i) => {
    const song = songsById[id];
    if (!song) return;
    garantirEspaco(46);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const numero = `${String(i + 1).padStart(2, "0")}.`;
    doc.text(numero, margem, y);
    const linhas = doc.splitTextToSize(song.titulo, larguraPagina - margem * 2 - 34) as string[];
    doc.text(linhas, margem + 26, y);
    y += 14 * linhas.length;

    const detalhes = [
      song.artista,
      song.tom && `Tom ${song.tom}`,
      song.bpm && `${song.bpm} BPM`,
      song.ritmo,
    ]
      .filter(Boolean)
      .join("  ·  ");
    if (detalhes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(detalhes, margem + 26, y + 2);
      doc.setTextColor(0);
      y += 14;
    }

    if (song.observacoes) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(140);
      const obs = doc.splitTextToSize(
        song.observacoes,
        larguraPagina - margem * 2 - 26,
      ) as string[];
      garantirEspaco(12 * obs.length);
      doc.text(obs.slice(0, 4), margem + 26, y + 2);
      doc.setTextColor(0);
      y += 12 * Math.min(obs.length, 4);
    }

    y += 10;
    doc.setDrawColor(230);
    doc.line(margem, y - 5, larguraPagina - margem, y - 5);
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Repertório Fácil · Desenvolvido por Bruno Capriolli  |  Página ${p} de ${total}`,
      larguraPagina / 2,
      alturaPagina - 24,
      { align: "center" },
    );
  }

  doc.save(`${semArquivo(rep.nome)}.pdf`);
}
