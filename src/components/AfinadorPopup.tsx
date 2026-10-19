import { useState } from "react";
import { AfinadorPainel } from "@/components/AfinadorPainel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AfinadorPopup() {
  const [aberto, setAberto] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Abrir afinador"
          title="Afinador"
          className="flex size-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3v8a4 4 0 0 0 8 0V3M12 15v6M9 21h6" />
            <path d="M4 6v4M20 6v4" strokeWidth="1.2" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-2xl p-3 sm:p-5" onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader className="pr-10 text-left">
          <DialogTitle>Afinador</DialogTitle>
          <DialogDescription>Uma corda de cada vez. Fechar esta janela desliga o microfone.</DialogDescription>
        </DialogHeader>
        {aberto && <AfinadorPainel />}
      </DialogContent>
    </Dialog>
  );
}
