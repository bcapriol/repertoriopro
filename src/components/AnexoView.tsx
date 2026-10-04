import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Anexo } from "@/lib/repertorio-store";
import { lerConta } from "@/lib/banda-local";
import { guardarAnexoOffline, lerAnexoOffline } from "@/lib/anexo-cache";
import { obterAnexo } from "@/lib/nuvem.functions";

function dataUrlToUint8(dataUrl: string) {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function useFonteAnexo(anexo: Anexo) {
  const obter = useServerFn(obterAnexo);
  const [fonte, setFonte] = useState(anexo.dados ?? "");
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    let urlLocal = "";
    setFalhou(false);
    setFonte("");
    if (anexo.dados) {
      setFonte(anexo.dados);
      return () => {};
    }
    void (async () => {
      try {
        let blob = await lerAnexoOffline(anexo.id);
        const caminho = anexo.caminho;
        if (!blob && caminho) {
          if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
          const conta = lerConta();
          if (!conta) throw new Error("sem conta");
          const { url } = await obter({ data: { usuario: conta.usuario, senha: conta.senha, caminho } });
          const resposta = await fetch(url);
          if (!resposta.ok) throw new Error("download");
          blob = await resposta.blob();
          await guardarAnexoOffline(anexo.id, blob);
        }
        if (!ativo) return;
        if (!blob) throw new Error("Arquivo não disponível neste aparelho.");
        urlLocal = URL.createObjectURL(blob);
        setFonte(urlLocal);
      } catch {
        if (ativo) setFalhou(true);
      }
    })();
    return () => {
      ativo = false;
      if (urlLocal) URL.revokeObjectURL(urlLocal);
    };
  }, [anexo, obter]);

  return { fonte, falhou };
}

function PdfView({ anexo, fonte, falhou, fit = false }: { anexo: Anexo; fonte: string; falhou: boolean; fit?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [dimensoes, setDimensoes] = useState(0);

  // Recalcula a resolução ao girar o celular ou redimensionar a janela no tablet.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: ReturnType<typeof setTimeout>;
    let largura = container.clientWidth;
    const atualizar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setDimensoes((n) => n + 1), 180);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (container.clientWidth === largura) return;
      largura = container.clientWidth;
      atualizar();
    });
    observer?.observe(container);
    window.addEventListener("resize", atualizar);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener("resize", atualizar);
    };
  }, []);

  // URL de blob (fallback nativo do navegador)
  useEffect(() => {
    let url: string | null = null;
    try {
      if (!fonte) return;
      const bytes = fonte.startsWith("data:") ? dataUrlToUint8(fonte) : null;
      if (!bytes) {
        setBlobUrl(fonte);
        return;
      }
      url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }));
      setBlobUrl(url);
    } catch {
      setBlobUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [fonte]);

  useEffect(() => {
    let cancelado = false;
    let paginasOk = 0;
    let tarefa: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    setEstado("carregando");

    (async () => {
      try {
        const container = containerRef.current;
        if (!container) throw new Error("sem container");
        container.innerHTML = "";

        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        if (!fonte || cancelado) return;
        const entrada = fonte.startsWith("data:") ? { data: dataUrlToUint8(fonte) } : { url: fonte };
        tarefa = pdfjs.getDocument(entrada);
        const doc = await tarefa.promise;
        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelado) return;
          const page = await doc.getPage(n);
          const largura = container.clientWidth || window.innerWidth || 800;
          const base = page.getViewport({ scale: 1 });
          const altura = fit ? Math.max(200, window.innerHeight - 65) : Infinity;
          let escala = Math.min(largura / base.width, altura / base.height) * Math.min(window.devicePixelRatio || 1, 2);
          const ladoMax = Math.max(base.width, base.height) * escala;
          if (ladoMax > 4096) escala *= 4096 / ladoMax;
          const area = base.width * escala * (base.height * escala);
          if (area > 4_000_000) escala *= Math.sqrt(4_000_000 / area);

          const viewport = page.getViewport({ scale: escala });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = fit ? "auto" : "100%";
          canvas.style.maxWidth = "100%";
          canvas.style.height = fit ? "100%" : "auto";
          canvas.style.maxHeight = fit ? `${altura}px` : "none";
          canvas.style.display = "block";
          if (fit) canvas.style.margin = "auto";
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("sem canvas 2d");
          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
          paginasOk++;
          if (!cancelado) setEstado("pronto");
        }
        if (!cancelado) setEstado("pronto");
      } catch {
        if (!cancelado && paginasOk === 0) setEstado("erro");
      }
    })();

    return () => {
      cancelado = true;
      void tarefa?.destroy().catch(() => {});
    };
  }, [fonte, fit, dimensoes]);

  return (
    <div className="w-full bg-background">
      {(estado === "carregando" || !fonte) && !falhou && (
        <div className="p-6 text-center text-sm text-muted-foreground">Carregando PDF…</div>
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
              href={blobUrl ?? fonte}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Abrir {anexo.nome}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnexoView({ anexo, fit = false }: { anexo: Anexo; fit?: boolean }) {
  const { fonte, falhou } = useFonteAnexo(anexo);
  if (falhou) return <p className="p-6 text-center text-sm text-muted-foreground">Arquivo indisponível neste aparelho. Conecte-se à internet e sincronize novamente para concluir a cópia offline.</p>;
  if (anexo.tipo.startsWith("image/")) {
    if (!fonte) return <p className="p-6 text-center text-sm text-muted-foreground">Carregando imagem…</p>;
    return <img src={fonte} alt={anexo.nome} className={fit ? "h-full max-h-full w-full object-contain" : "w-full"} />;
  }
  return <PdfView anexo={anexo} fonte={fonte} falhou={falhou} fit={fit} />;
}

export function AnexosViewer({ anexos, fit = false }: { anexos: Anexo[]; fit?: boolean }) {
  return (
    <div className="h-full w-full overflow-auto overscroll-contain bg-background">
      {anexos.map((a) => (
        <AnexoView key={a.id} anexo={a} fit={fit} />
      ))}
    </div>
  );
}
