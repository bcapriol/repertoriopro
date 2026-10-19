import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { AfinadorPainel } from "@/components/AfinadorPainel";

export const Route = createFileRoute("/afinador")({
  head: () => ({ meta: [{ title: "Afinador — Repertório Fácil" }] }),
  component: Afinador,
});

function Afinador() {
  return (
    <PageShell title="Afinador" subtitle="Sua nota em destaque. Uma corda de cada vez.">
      <AfinadorPainel />
    </PageShell>
  );
}
