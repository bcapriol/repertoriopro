import { useEffect, useRef, useState } from "react";
import type { Anexo } from "@/lib/repertorio-store";

function dataUrlToUint8(dataUrl: string) {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function PdfView({ anexo }: { anexo: Anexo }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // URL de blob (fallback nativo do navegador)
  useEffect(() => {
    let url: string | null = null;
    try {
      const bytes = dataUrlToUint8(anexo.dados);
      url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }));
      setBlobUrl(url);
    } catch {
      setBlobUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [anexo.dados]);

  useEffect(() => {
    let cancelado = false;
    setEstado("carregando");

    (async () => {
      try {
        const container = containerRef.current;
        if (!container) throw new Error("sem container");
        container.innerHTML = "";

        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        const doc = await pdfjs.getDocument({ data: dataUrlToUint8(anexo.dados) }).promise;
        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelado) return;
          const page = await doc.getPage(n);
          const largura = container.clientWidth || window.innerWidth || 800;
          const base = page.getViewport({ scale: 1 });
          let escala = (largura / base.width) * Math.min(window.devicePixelRatio || 1, 2);
          const ladoMax = Math.max(base.width, base.height) * escala;
          if (ladoMax > 4096) escala *= 4096 / ladoMax;
          const area = base.width * escala * (base.height * escala);
          if (area > 4_000_000) escala *= Math.sqrt(4_000_000 / area);

          const viewport = page.getViewport({ scale: escala });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("sem canvas 2d");
          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (!cancelado) setEstado("pronto");
        }
        if (!cancelado) setEstado("pronto");
      } catch {
        if (!cancelado) setEstado("erro");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [anexo.dados]);

  return (
    <div className="w-full bg-white">
      {estado === "carregando" && (
        <div className="p-6 text-center text-sm text-slate-500">Carregando PDF…</div>
      )}
      {/* container do pdf.js sempre montado */}
      <div ref={containerRef} className={estado === "erro" ? "hidden" : "w-full"} />
      {estado === "erro" && (
        <div className="w-full">
          {blobUrl ? (
            <iframe src={blobUrl} title={anexo.nome} className="h-[85vh] w-full border-0" />
          ) : null}
          <div className="flex justify-center p-4">
            <a
              href={blobUrl ?? anexo.dados}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Abrir {anexo.nome}
            </a>
          </div>
        </div>
      )}
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
