import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HardDriveIcon, RefreshCwIcon } from "lucide-react";
import { useAppData } from "@/lib/repertorio-store";
import { lerAnexoOffline } from "@/lib/anexo-cache";
import { prepararTelasOffline, useOfflineApp } from "@/lib/offline-app";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="flex items-center gap-2 text-base font-bold"><HardDriveIcon className="size-5 shrink-0" /> Acesso sem internet</h2>
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {preparando ? "Preparando as telas e o leitor de PDF… Mantenha o app aberto."
              : copia ? `Telas salvas em ${new Date(copia.preparedAt).toLocaleString("pt-BR")}.`
                : "A abertura offline ainda não foi confirmada neste aparelho."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Neste aparelho: {data.songs.length} música(s) e {data.setlists.length} repertório(s).
            {arquivos && !falha ? ` Anexos: ${arquivos.salvos} de ${arquivos.total} salvos.` : " Verificando anexos…"}
          </p>
        </div>
        <Button variant="outline" disabled={preparando || online !== true} className="min-h-11 whitespace-normal" onClick={() => void prepararTelasOffline(data)}>
          <RefreshCwIcon className={preparando ? "animate-spin" : ""} /> {preparando ? "Preparando…" : "Preparar telas offline"}
        </Button>
      </div>
      {erro ? <p role="alert" className="mt-3 text-sm text-destructive">{erro} {copia ? "A última cópia completa foi mantida." : ""}</p> : null}
      {falha ? <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível verificar os anexos. Confira o espaço disponível no aparelho.</p> : null}
      {arquivos && arquivos.salvos < arquivos.total ? (
        <p className="mt-3 text-sm text-muted-foreground">Faltam {arquivos.total - arquivos.salvos} arquivo(s). <Link to="/sincronizar" className="inline-flex min-h-11 items-center font-medium text-primary underline">Sincronize com internet para baixar.</Link></p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {online === false ? "Sem conexão: consulte Músicas Salvas e Repertórios. Não saia da sua conta. " : "Após atualizar ou sincronizar, aguarde o preparo das telas e dos anexos antes de desconectar. "}
        Agenda, contratos e serviços da nuvem precisam de internet. Não limpe os dados do aplicativo: isso apaga a cópia local.
      </p>
    </section>
  );
}
