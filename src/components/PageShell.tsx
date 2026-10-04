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
    <main className="min-h-dvh bg-background pb-[max(4rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 border-b border-border bg-background px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 text-foreground sm:px-6">
        <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            <ChevronLeftIcon className="size-4" />
            Início
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 basis-48">
              <h1 className="break-words text-2xl font-extrabold">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {action ? <div className="flex max-w-full flex-wrap items-center gap-2">{action}</div> : null}
          </div>
        </div>
      </header>
      <div className={`mx-auto w-full px-4 pt-6 sm:px-6 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>{children}</div>
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
