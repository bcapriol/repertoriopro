import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MusicIcon,
  ListMusicIcon,
  LibraryIcon,
  ArrowDownUpIcon,
  RefreshCwIcon,
  LockIcon,
  CalendarDaysIcon,
  FileTextIcon,
  type LucideIcon,
} from "lucide-react";
import { useAppData } from "@/lib/repertorio-store";
import { useBanda, useConta } from "@/lib/banda-local";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Repertório Fácil - Bruno Capriolli" },
      {
        name: "description",
        content:
          "Cadastre músicas, monte repertórios e acesse tudo rapidamente durante suas apresentações.",
      },
      { property: "og:title", content: "Repertório Fácil - Bruno Capriolli" },
      {
        property: "og:description",
        content:
          "Cadastre músicas, monte repertórios e acesse tudo rapidamente durante suas apresentações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const tileClass =
  "surface-tile group flex min-h-36 w-full flex-col items-start justify-between gap-5 rounded-lg border border-border px-5 py-5 text-left transition-all duration-150 active:scale-[0.98] hover:border-primary/50 hover:shadow-md";

function TileBody({ label, hint, Icon }: { label: string; hint: string; Icon: LucideIcon }) {
  return (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold text-primary uppercase">
          {label}
        </span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </>
  );
}

function Index() {
  const { data } = useAppData();
  const banda = useBanda();
  const { conta } = useConta();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background px-5 pt-10 pb-14">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex justify-end">
          <Link
            to="/adm"
            aria-label="Área do administrador"
            className="flex size-10 items-center justify-center rounded-lg border border-border text-primary transition-colors hover:bg-accent"
          >
            <LockIcon className="size-4" />
          </Link>
        </div>
        <header className="text-center">
          {online !== null && (
            <div role="status" className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
              <span className={`size-2 rounded-full ${online ? "bg-green-600" : "bg-red-600"}`} aria-hidden="true" />
              {online ? "ONLINE" : "OFFLINE"}
            </div>
          )}
          <img
            src="/multivibe-logo.jpg"
            alt="Logotipo Multivibe"
            className="mx-auto mb-5 size-32 object-contain"
          />
          <h1 className="text-3xl leading-tight font-extrabold text-[oklch(0.62_0.24_250)]">
            {banda ? `Repertório ${banda}` : "Repertório Fácil"}
          </h1>
          <p className="mt-2 text-base font-semibold text-muted-foreground">
            Gerenciador de Repertórios Musicais
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Desenvolvido por Bruno Capriolli | ® Direitos Reservados
          </p>
        </header>

        <nav className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!banda && data.songs.length === 0 && data.setlists.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-5 py-4 text-center text-sm text-muted-foreground sm:col-span-2">
              Aparelho vazio. Use{" "}
              <span className="font-semibold text-foreground">Sincronizar Repertórios</span> para
              trazer as músicas e repertórios da sua banda.
            </p>
          ) : null}
          <Link to="/cadastrar" search={{ id: undefined }} className={tileClass}>
            <TileBody
              label="Cadastrar Música"
              hint="Título, artista, tom, letra e cifra"
              Icon={MusicIcon}
            />
          </Link>
          <Link to="/musicas" className={tileClass}>
            <TileBody
              label="Músicas Salvas"
              hint={`${data.songs.length} música(s) na biblioteca`}
              Icon={ListMusicIcon}
            />
          </Link>
          <Link to="/repertorios" className={tileClass}>
            <TileBody
              label="Repertórios"
              hint={`${data.setlists.length} lista(s) montada(s)`}
              Icon={LibraryIcon}
            />
          </Link>
          <Link to="/agenda" className={tileClass}>
            <TileBody
              label="Agenda"
              hint={conta?.podeAgenda ? "Shows, compromissos e folgas" : "Requer liberação do administrador"}
              Icon={CalendarDaysIcon}
            />
          </Link>
          <Link to="/contratos" className={tileClass}>
            <TileBody label="Contratos de Eventos" hint="Contratos de Prestação de Serviços — Banda Multivibe" Icon={FileTextIcon} />
          </Link>
          <Link to="/sincronizar" className={tileClass}>
            <TileBody
              label="Sincronizar Repertórios"
              hint={banda ? `Banda atual: ${banda}` : "Wi-Fi, Bluetooth ou arquivo"}
              Icon={RefreshCwIcon}
            />
          </Link>
          <Link to="/dados" className={tileClass}>
            <TileBody
              label="Exportar / Importar"
              hint="Faça backup dos seus dados"
              Icon={ArrowDownUpIcon}
            />
          </Link>
        </nav>
      </div>
    </main>
  );
}
