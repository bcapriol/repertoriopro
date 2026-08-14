import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MusicIcon,
  ListMusicIcon,
  LibraryIcon,
  ArrowDownUpIcon,
  DownloadCloudIcon,
  LockIcon,
  type LucideIcon,
} from "lucide-react";
import { useAppData } from "@/lib/repertorio-store";
import { useBanda } from "@/lib/banda-local";

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
    ],
  }),
  component: Index,
});

const tileClass =
  "surface-tile group flex w-full items-center gap-4 rounded-2xl border border-border px-5 py-5 text-left transition-transform duration-150 active:scale-[0.98] hover:border-primary/40";

function TileBody({ label, hint, Icon }: { label: string; hint: string; Icon: LucideIcon }) {
  return (
    <>
      <span className="gradient-stage flex size-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm">
        <Icon className="size-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold tracking-wide text-foreground uppercase">
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

  return (
    <main className="min-h-screen bg-background px-5 pt-12 pb-14">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-end">
          <Link
            to="/adm"
            aria-label="Área do administrador"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <LockIcon className="size-4" />
          </Link>
        </div>
        <header className="text-center">
          <span className="gradient-accent mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl text-accent-foreground">
            <MusicIcon className="size-7" strokeWidth={2.4} />
          </span>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-foreground">
            {banda ? `Repertório ${banda}` : "Repertório Fácil"}
          </h1>
          <p className="mt-1 text-lg font-semibold text-primary">Bruno Capriolli</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerenciador de Repertórios Musicais
          </p>
        </header>

        <nav className="mt-10 flex flex-col gap-4">
          {!banda && data.songs.length === 0 && data.setlists.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-5 py-4 text-center text-sm text-muted-foreground">
              Aparelho vazio. Use <span className="font-semibold text-foreground">Carregar Show</span>{" "}
              com a chave da banda (ou um arquivo de backup) para trazer músicas e repertórios.
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
          <Link to="/dados" className={tileClass}>
            <TileBody
              label="Exportar / Importar"
              hint="Faça backup dos seus dados"
              Icon={ArrowDownUpIcon}
            />
          </Link>
          <Link to="/carregar" className={tileClass}>
            <TileBody
              label="Carregar Show"
              hint={banda ? `Banda atual: ${banda}` : "Baixe o repertório pela chave"}
              Icon={DownloadCloudIcon}
            />
          </Link>
        </nav>
      </div>
    </main>
  );
}
