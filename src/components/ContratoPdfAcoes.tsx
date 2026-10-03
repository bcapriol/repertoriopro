import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConta } from "@/lib/banda-local";
import { contratosPdfUrl } from "@/lib/nuvem.functions";

type Acao = "visualizar" | "baixar" | "imprimir" | "enviar";
export function ContratoPdfAcoes({ id, numero }: { id: string; numero: string }) {
  const { conta } = useConta();
  const urlPdf = useServerFn(contratosPdfUrl);
  const [ocupado, setOcupado] = useState<Acao | null>(null);
  const agir = async (acao: Acao) => {
    if (!conta || ocupado) return;
    // Abra a aba em resposta direta ao clique para que o navegador não bloqueie o PDF.
    const aba = acao === "visualizar" || acao === "imprimir" ? window.open("", "_blank") : null;
    setOcupado(acao);
    try {
      const { url, nome } = await urlPdf({ data: { usuario: conta.usuario, senha: conta.senha, id } });
      if (acao === "visualizar" || acao === "imprimir") {
        if (!aba) { toast.error("Permita janelas adicionais para abrir o PDF."); return; }
        aba.location.href = url;
        if (acao === "imprimir") toast.info("Na aba do PDF, use o botão de impressão do navegador.");
      } else if (acao === "baixar" || acao === "enviar") {
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error("Não foi possível transferir o PDF.");
        const blob = await resposta.blob();
        const arquivo = new File([blob], nome, { type: "application/pdf" });
        if (acao === "enviar" && navigator.share && navigator.canShare?.({ files: [arquivo] })) {
          await navigator.share({ title: `Contrato ${numero}`, files: [arquivo] });
        } else {
          const objeto = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objeto;
          link.download = nome;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(objeto), 60000);
          if (acao === "enviar") toast.info("PDF baixado. Anexe o arquivo no aplicativo de sua preferência para enviá-lo.");
        }
      }
    } catch (e) {
      if (aba && !aba.closed) aba.close();
      if (e instanceof Error && e.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Não foi possível acessar o PDF.");
    } finally { setOcupado(null); }
  };
  return <div className="flex flex-wrap gap-2">
    <Button type="button" variant="outline" disabled={!!ocupado} onClick={() => void agir("visualizar")}>Visualizar PDF</Button>
    <Button type="button" variant="outline" disabled={!!ocupado} onClick={() => void agir("baixar")}>Baixar PDF</Button>
    <Button type="button" variant="outline" disabled={!!ocupado} onClick={() => void agir("imprimir")}>Imprimir</Button>
    <Button type="button" variant="outline" disabled={!!ocupado} onClick={() => void agir("enviar")}>Enviar PDF</Button>
  </div>;
}
