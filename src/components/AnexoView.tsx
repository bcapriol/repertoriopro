import { useEffect, useRef, useState } from "react";
import type { Anexo } from "@/lib/repertorio-store";

function dataUrlToUint8(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function PdfView({ anexo }: { anexo: Anexo }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setErro(false);
    setCarregando(true);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = (
          await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
        ).default;
        const doc = await pdfjs.getDocument({ data: dataUrlToUint8(anexo.dados) }).promise;
        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelado) return;
          const page = await doc.getPage(n);
          const largura = container.clientWidth || 800;
          const base = page.getViewport({ scale: 1 });
          let escala = (largura / base.width) * Math.min(window.devicePixelRatio || 1, 2);
          // limites de canvas em celulares: evita tela branca em PDFs grandes
          const MAX_LADO = 4096;
          const MAX_AREA = 4_000_000;
          const ladoMax = Math.max(base.width, base.height) * escala;
          if (ladoMax > MAX_LADO) escala *= MAX_LADO / ladoMax;
          const area = base.width * escala * base.height * escala;
          if (area > MAX_AREA) escala *= Math.sqrt(MAX_AREA / area);
          const viewport = page.getViewport({ scale: escala });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (!cancelado) setCarregando(false);
        }
        if (!cancelado) setCarregando(false);
      } catch (e) {
        (window as any).__pdfErro = String((e as any)?.message ?? e);
        if (!cancelado) {
          setErro(true);
          setCarregando(false);
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [anexo.dados]);

  if (erro) {
    return (
      <div className="w-full">
        <object data={anexo.dados} type="application/pdf" className="h-[80vh] w-full">
          <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-slate-700">
            <span>Não foi possível exibir este PDF aqui.</span>
            <a
              href={anexo.dados}
              target="_blank"
              rel="noreferrer"
              download={anexo.nome}
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Abrir {anexo.nome}
            </a>
          </div>
        </object>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      {carregando && (
        <div className="p-6 text-center text-sm text-slate-500">Carregando PDF…</div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

export function AnexoView({ anexo }: { anexo: Anexo }) {
  if (anexo.tipo.startsWith("image/")) {
    return <img src={anexo.dados} alt={anexo.nome} className="w-full" />;
  }
  return <PdfView anexo={anexo} />;
}

export function AnexosViewer({ anexos }: { anexos: Anexo[] }) {
  return (
    <div className="h-full w-full overflow-auto bg-white">
      {anexos.map((a) => (
        <AnexoView key={a.id} anexo={a} />
      ))}
    </div>
  );
}