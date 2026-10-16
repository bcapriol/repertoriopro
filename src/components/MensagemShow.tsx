import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { agendaMensagem } from "@/lib/nuvem.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function MensagemShow({ id, texto, cred, fechar }: {
  id: string;
  texto: string;
  cred: { usuario: string; senha: string };
  fechar: () => void;
}) {
  const obter = useServerFn(agendaMensagem);
  const [mensagem, setMensagem] = useState(texto);
  const [ocupado, setOcupado] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);

  const copiar = async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      // Confere novamente o privilégio e usa a versão salva mais recente.
      const atual = await obter({ data: { ...cred, id } });
      setMensagem(atual);
      try {
        await navigator.clipboard.writeText(atual);
        toast.success("Mensagem copiada! Cole na conversa com o contratante.");
      } catch {
        // Alguns navegadores bloqueiam o clipboard após uma requisição.
        if (campo.current) {
          campo.current.value = atual;
          campo.current.focus();
          campo.current.select();
          campo.current.setSelectionRange(0, atual.length);
        }
        toast.info("A cópia automática foi bloqueada. Copie o texto selecionado.");
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível acessar a mensagem.");
      fechar();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && fechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mensagem.split("\n")[0]}</DialogTitle>
          <DialogDescription>Confira os dados, copie e cole na conversa com o contratante. Nada é enviado automaticamente.</DialogDescription>
        </DialogHeader>
        <Textarea ref={campo} aria-label="Mensagem para o contratante" readOnly value={mensagem} className="min-h-72 text-sm" />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={fechar}>Fechar</Button>
          <Button disabled={ocupado} onClick={() => void copiar()}><CopyIcon />{ocupado ? "Copiando…" : "Copiar mensagem"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
