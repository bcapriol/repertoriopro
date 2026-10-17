import { AnexosViewer } from "@/components/AnexoView";
import type { Song } from "@/lib/repertorio-store";

export function MusicaPalco({ musica }: { musica: Song }) {
  const anexos = musica.anexos ?? [];
  return anexos.length ? (
    <AnexosViewer key={musica.id} anexos={anexos} fit />
  ) : (
    <div key={musica.id} className="h-full overflow-auto px-5 py-6">
      <h1 className="pr-12 text-3xl leading-tight font-black text-foreground">{musica.titulo}</h1>
      <p className="mt-1 text-base text-muted-foreground">
        {[
          musica.artista,
          musica.tom && `Tom ${musica.tom}`,
          musica.bpm && `${musica.bpm} BPM`,
          musica.ritmo,
        ].filter(Boolean).join(" · ") || "—"}
      </p>
      <pre className="mt-5 font-sans text-[28px] leading-relaxed break-words whitespace-pre-wrap text-foreground">
        {musica.letra || "Sem letra nem anexo cadastrado."}
      </pre>
      <div className="h-24" />
    </div>
  );
}
