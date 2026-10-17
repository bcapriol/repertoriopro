import { AnexosViewer } from "@/components/AnexoView";
import type { Song } from "@/lib/repertorio-store";

export function MusicaPalco({ musica }: { musica: Song }) {
  const anexos = musica.anexos ?? [];
  return anexos.length ? (
    <AnexosViewer key={musica.id} anexos={anexos} fit />
  ) : (
    <div key={musica.id} className="h-full overflow-auto px-2 py-2">
      <div aria-hidden="true" className="float-right h-32 w-12" />
      <h1 className="text-2xl leading-tight font-black text-foreground sm:text-3xl">{musica.titulo}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {[
          musica.artista,
          musica.tom && `Tom ${musica.tom}`,
          musica.bpm && `${musica.bpm} BPM`,
          musica.ritmo,
        ].filter(Boolean).join(" · ") || "—"}
      </p>
      <pre className="mt-2 font-sans text-[28px] leading-snug break-words whitespace-pre-wrap text-foreground">
        {musica.letra || "Sem letra nem anexo cadastrado."}
      </pre>
    </div>
  );
}
