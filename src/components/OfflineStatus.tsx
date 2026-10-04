import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { useAppData } from "@/lib/repertorio-store";
import { lerAnexoOffline } from "@/lib/anexo-cache";
import { prepararTelasOffline, useOfflineApp } from "@/lib/offline-app";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function OfflineStatus() {
  const { data } = useAppData();
  const { preparando, copia, erro } = useOfflineApp();
  const [online, setOnline] = useState<boolean | null>(null);
  const [arquivos, setArquivos] = useState<{ total: number; salvos: number } | null>(null);
  const [falha, setFalha] = useState(false);

  useEffect(() => {
    let ativo = true;
    let versao = 0;
    const conferir = async () => {
      const atual = ++versao;
      try {
        const anexos = new Map(data.songs.flatMap((s) => (s.anexos ?? []).map((a) => [a.id, a] as const)));
        let salvos = 0;
        for (const anexo of anexos.values()) {
          if (anexo.dados || await lerAnexoOffline(anexo.id)) salvos++;
        }
        if (ativo && atual === versao) { setArquivos({ total: anexos.size, salvos }); setFalha(false); }
      } catch { if (ativo) setFalha(true); }
    };
    const atualizar = () => { setOnline(navigator.onLine); void conferir(); };
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    window.addEventListener("repertorio-copia-atualizada", atualizar);
    return () => {
      ativo = false;
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
      window.removeEventListener("repertorio-copia-atualizada", atualizar);
    };
  }, [data]);

  return (
    <section aria-label="Acesso sem internet" className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <Button variant="outline" disabled={preparando || online !== true} className="min-h-11 min-w-0 flex-1 whitespace-normal sm:flex-none" onClick={() => void prepararTelasOffline(data)}>
          <RefreshCwIcon aria-hidden="true" className={preparando ? "animate-spin" : ""} /> SINCRONIZAR P/ OFFLINE
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Info sobre o acesso sem internet" title="Info">
              <AlertCircleIcon aria-hidden="true" className="size-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Info</AlertDialogTitle>
              <AlertDialogDescription className="text-left leading-relaxed">
                Para o acesso sem internet: após atualizar ou sincronizar, aguarde o preparo das telas e dos anexos antes de desconectar. Agenda, contratos e serviços da nuvem precisam de internet. Não limpe os dados do aplicativo: isso apaga a cópia local.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction className="min-h-11">OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div role="status" aria-live="polite" className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p>Neste aparelho: {data.songs.length} música(s) e {data.setlists.length} repertório(s).</p>
        <p>{copia ? `Última atualização das telas: ${new Date(copia.preparedAt).toLocaleString("pt-BR")}.` : "A abertura offline ainda não foi confirmada neste aparelho."}</p>
        <p>{arquivos && !falha ? `Anexos: ${arquivos.salvos} de ${arquivos.total} salvos.` : "Verificando anexos…"}</p>
        {preparando ? <p>Preparando as telas e o leitor de PDF… Mantenha o app aberto.</p> : null}
      </div>
      {erro ? <p role="alert" className="mt-3 text-sm text-destructive">{erro} {copia ? "A última cópia completa foi mantida." : ""}</p> : null}
      {falha ? <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível verificar os anexos. Confira o espaço disponível no aparelho.</p> : null}
      {arquivos && arquivos.salvos < arquivos.total ? (
        <p className="mt-3 text-sm text-muted-foreground">Faltam {arquivos.total - arquivos.salvos} arquivo(s). <Link to="/sincronizar" className="inline-flex min-h-11 items-center font-medium text-primary underline">Sincronize com internet para baixar.</Link></p>
      ) : null}
      {online === false ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Sem conexão: consulte Músicas Salvas e Repertórios. Não saia da sua conta.</p> : null}
    </section>
  );
}
