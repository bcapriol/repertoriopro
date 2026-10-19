import { diferencaEmCents, frequenciaDaNota, notaDaFrequencia } from "@/lib/afinador";

type Props = {
  frequencia: number | null;
  referencia: number | null;
  alvoMidi: number;
  automatico: boolean;
  ouvindo: boolean;
  nivel: number;
};

export function VisorAfinador({ frequencia, referencia, alvoMidi, automatico, ouvindo, nivel }: Props) {
  const nota = frequencia !== null && referencia !== null ? notaDaFrequencia(frequencia, referencia) : null;
  const alvo = referencia !== null && (!automatico || nota) ? frequenciaDaNota(automatico ? nota!.midi : alvoMidi, referencia) : null;
  const cents = frequencia !== null && alvo !== null ? diferencaEmCents(frequencia, alvo) : null;
  const direcao = cents === null ? null : Math.abs(cents) <= 3 ? "afinado" : cents < 0 ? "apertar" : "soltar";
  // Frequência baixa aponta à DIREITA: apertar. Frequência alta, à ESQUERDA: soltar.
  const angulo = cents === null ? 0 : -Math.max(-50, Math.min(50, cents)) * 1.5;
  const mensagem = !ouvindo ? "Pronto para afinar" : referencia === null ? "Ajuste a referência em Hz" : direcao === "afinado" ? "Afinado" : direcao === "apertar" ? "Apertar a corda" : direcao === "soltar" ? "Soltar a corda" : "Toque uma corda";
  const formatar = (valor: number) => valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card px-3 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${ouvindo ? "bg-metronomo-verde" : "bg-muted-foreground/40"}`} aria-hidden="true" />{ouvindo ? "CAPTANDO ÁUDIO" : "CAPTURA PARADA"}</span>
        <span>{automatico ? "CROMÁTICO" : "NOTA ALVO"}</span>
      </div>
      <p className="mt-5 text-center text-xs tracking-widest text-muted-foreground">NOTA CAPTADA</p>
      <div className="flex min-h-32 items-center justify-center gap-2 text-foreground" aria-label={nota ? `Nota captada: ${nota.nome}${nota.alternativa ? ` ou ${nota.alternativa}` : ""}, oitava ${nota.oitava}` : "Nenhuma nota captada"}>
        <span className="text-[clamp(5rem,20vw,8rem)] leading-none font-black tracking-tight">{nota?.nome ?? "—"}</span>
        {nota?.alternativa && <span className="text-4xl font-bold sm:text-5xl">/ {nota.alternativa}</span>}
        {nota && <span className="self-end pb-4 text-sm text-muted-foreground">oitava {nota.oitava}</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm tabular-nums text-muted-foreground">
        <span>Captado: <span className="font-bold">{frequencia === null ? "—" : formatar(frequencia)} Hz</span></span>
        <span>Desvio: <span className="font-bold">{cents === null ? "—" : `${cents > 0 ? "+" : ""}${formatar(cents)}`} cents</span></span>
      </div>
      <svg viewBox="0 0 360 195" className="mx-auto mt-3 w-full max-w-lg" aria-hidden="true">
        <path d="M 40 160 A 140 140 0 0 1 320 160" fill="none" stroke="currentColor" strokeWidth="14" className="text-muted" strokeLinecap="round" />
        <path d="M 169 20.5 A 140 140 0 0 1 191 20.5" fill="none" stroke="currentColor" strokeWidth="14" className="text-metronomo-verde" />
        {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((valor) => {
          const radianos = (-valor * 1.5 * Math.PI) / 180;
          const x = (raio: number) => 180 + Math.sin(radianos) * raio;
          const y = (raio: number) => 160 - Math.cos(radianos) * raio;
          return <g key={valor}>
            <line x1={x(123)} y1={y(123)} x2={x(135)} y2={y(135)} stroke="currentColor" strokeWidth={valor === 0 ? 3 : 1.5} className="text-muted-foreground" />
            {valor % 20 === 0 && <text x={x(105)} y={y(105) + 4} textAnchor="middle" fill="currentColor" fontSize="12" className="text-muted-foreground">{valor > 0 ? `+${valor}` : valor}</text>}
          </g>;
        })}
        <g transform={`rotate(${angulo} 180 160)`} style={{ transition: "transform 120ms ease-out", opacity: cents === null ? 0.2 : 1 }}>
          <path d="M 180 33 L 174 160 L 186 160 Z" fill="currentColor" className={direcao === "afinado" ? "text-metronomo-verde" : "text-destructive"} />
        </g>
        <circle cx="180" cy="160" r="10" fill="currentColor" className="text-foreground" />
        <text x="40" y="186" textAnchor="middle" fill="currentColor" fontSize="11" className="text-muted-foreground">MAIS ALTO</text>
        <text x="320" y="186" textAnchor="middle" fill="currentColor" fontSize="11" className="text-muted-foreground">MAIS BAIXO</text>
      </svg>
      <div className="grid grid-cols-3 gap-2 text-center">
        {([['soltar', 'SOLTAR', '←'], ['afinado', 'AFINADO', '●'], ['apertar', 'APERTAR', '→']] as const).map(([id, texto, seta]) => (
          <div key={id} className={`rounded-xl border px-1 py-3 ${direcao === id ? id === "afinado" ? "border-metronomo-verde bg-metronomo-verde/10" : "border-destructive bg-destructive/10" : "border-border bg-muted/40"}`}>
            <span aria-hidden="true" className={`mx-auto mb-2 block size-4 rounded-full border ${direcao === id ? id === "afinado" ? "border-metronomo-verde bg-metronomo-verde shadow-md" : "border-destructive bg-destructive shadow-md" : "border-border bg-muted"}`} />
            <span className="text-xs font-bold sm:text-sm">{seta} {texto}</span>
          </div>
        ))}
      </div>
      <p role="status" className="mt-4 text-center text-xl font-bold">{mensagem}</p>
      <p className="mt-1 min-h-5 text-center text-xs text-muted-foreground">{cents !== null && Math.abs(cents) > 50 ? "Ponteiro no limite da escala (±50 cents)." : "Centro verde: diferença de até 3 cents."}</p>
      {cents !== null && Math.abs(cents) > 100 && <p className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm">Muito distante do alvo. Confira a nota e a oitava antes de apertar ou soltar a corda.</p>}
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Sinal</span>
        <div role="meter" aria-label="Nível da entrada de áudio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(nivel * 100)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${nivel * 100}%` }} />
        </div>
        <span>Áudio local</span>
      </div>
    </div>
  );
}
