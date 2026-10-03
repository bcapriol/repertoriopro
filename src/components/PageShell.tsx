import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  action,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b border-border bg-background px-5 pt-6 pb-6 text-foreground">
        <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-md"}`}>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            <ChevronLeftIcon className="size-4" />
            Início
          </Link>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {action}
          </div>
        </div>
      </header>
      <div className={`mx-auto w-full px-5 pt-6 ${wide ? "max-w-5xl" : "max-w-md"}`}>{children}</div>
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
