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

  useEffect(() => {
    let cancelado = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

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
          const escala = (largura / base.width) * Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: escala });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        }
      } catch {
        if (!cancelado) setErro(true);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [anexo.dados]);

  if (erro) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <a href={anexo.dados} target="_blank" rel="noreferrer" className="text-primary underline">
          Abrir {anexo.nome}
        </a>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full bg-white" />;
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