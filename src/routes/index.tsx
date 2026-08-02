import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MusicIcon,
  ListMusicIcon,
  LibraryIcon,
  ArrowDownUpIcon,
  MoonStarIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";

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

function ActionTile({
  label,
  hint,
  Icon,
  onClick,
}: {
  label: string;
  hint: string;
  Icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="surface-tile group flex w-full items-center gap-4 rounded-2xl border border-border px-5 py-5 text-left transition-transform duration-150 active:scale-[0.98] hover:border-primary/40"
    >
      <span className="gradient-stage flex size-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm">
        <Icon className="size-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold tracking-wide uppercase text-foreground">
          {label}
        </span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function Index() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rf-theme");
    const isDark =
      stored === "dark" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleTheme = () => {
    setDark((d) => {
      localStorage.setItem("rf-theme", !d ? "dark" : "light");
      return !d;
    });
  };

  return (
    <main className="min-h-screen bg-background px-5 pt-12 pb-14">
      <div className="mx-auto w-full max-w-md">
        <header className="text-center">
          <span className="gradient-accent mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl text-accent-foreground">
            <MusicIcon className="size-7" strokeWidth={2.4} />
          </span>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-foreground">
            Repertório Fácil
          </h1>
          <p className="mt-1 text-lg font-semibold text-primary">Bruno Capriolli</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerenciador de Repertórios Musicais
          </p>
        </header>

        <nav className="mt-10 flex flex-col gap-4">
          <ActionTile
            label="Cadastrar Música"
            hint="Adicione título, tom e letra"
            Icon={MusicIcon}
          />
          <ActionTile
            label="Músicas Salvas"
            hint="Sua biblioteca completa"
            Icon={ListMusicIcon}
          />
          <ActionTile
            label="Repertórios"
            hint="Monte listas para cada show"
            Icon={LibraryIcon}
          />
          <ActionTile
            label="Exportar / Importar"
            hint="Faça backup dos seus dados"
            Icon={ArrowDownUpIcon}
          />
          <ActionTile
            label={dark ? "Modo Claro" : "Modo Escuro"}
            hint="Ajuste a tela para o palco"
            Icon={dark ? SunIcon : MoonStarIcon}
            onClick={toggleTheme}
          />
        </nav>
      </div>
    </main>
  );
}
