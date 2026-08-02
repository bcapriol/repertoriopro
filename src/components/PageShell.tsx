import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="gradient-stage sticky top-0 z-10 px-5 pt-6 pb-6 text-primary-foreground">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium opacity-90 hover:opacity-100"
          >
            <ChevronLeftIcon className="size-4" />
            Início
          </Link>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm opacity-85">{subtitle}</p> : null}
            </div>
            {action}
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-md px-5 pt-6">{children}</div>
    </main>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="surface-tile rounded-2xl border border-border border-dashed px-6 py-12 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
