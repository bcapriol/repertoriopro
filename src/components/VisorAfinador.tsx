import { useEffect, useRef, useState } from "react";
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
  const destino = cents === null ? 0 : -Math.max(-50, Math.min(50, cents)) * 1.5;
  const ponteiro = useRef(0);
  const [angulo, setAngulo] = useState(0);

  useEffect(() => {
    let frame: number;
    let anterior = performance.now();
    const mover = (agora: number) => {
      const intervalo = Math.min(agora - anterior, 64);
      anterior = agora;
      // Amortecimento independente da taxa de quadros, sem saltos entre leituras.
      ponteiro.current += (destino - ponteiro.current) * (1 - Math.exp(-intervalo / 180));
      if (Math.abs(destino - ponteiro.current) < 0.03) {
        ponteiro.current = destino;
        setAngulo(destino);
        return;
      }
      setAngulo(ponteiro.current);
      frame = requestAnimationFrame(mover);
    };
    frame = requestAnimationFrame(mover);
    return () => cancelAnimationFrame(frame);
  }, [destino]);

  const mensagem = !ouvindo ? "Pronto para afinar" : referencia === null ? "Ajuste a referência em Hz" : direcao === "afinado" ? "Afinado" : direcao === "apertar" ? "Apertar a corda" : direcao === "soltar" ? "Soltar a corda" : "Toque uma corda";
  const formatar = (valor: number) => valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="afinador-visor overflow-hidden rounded-2xl border px-3 py-5 sm:px-6" data-direcao={direcao ?? "silencio"}>
      <div className="afinador-muted flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2"><span className="afinador-captura size-2 rounded-full" data-ativo={ouvindo} aria-hidden="true" />{ouvindo ? "CAPTANDO ÁUDIO" : "CAPTURA PARADA"}</span>
        <span>{automatico ? "CROMÁTICO" : "NOTA ALVO"}</span>
      </div>
      <p className="afinador-muted mt-5 text-center text-xs tracking-widest">NOTA CAPTADA</p>
      <div className="afinador-nota flex min-h-32 flex-wrap items-center justify-center gap-x-2" aria-label={nota ? `Nota captada: ${nota.nome}${nota.alternativa ? ` ou ${nota.alternativa}` : ""}, oitava ${nota.oitava}` : "Nenhuma nota captada"}>
        <span className="text-[clamp(5rem,20vw,8rem)] leading-none tracking-tight">{nota?.nome ?? "—"}</span>
        {nota?.alternativa && <span className="text-4xl sm:text-5xl">/ {nota.alternativa}</span>}
        {nota && <span className="afinador-muted w-full pb-2 text-center text-sm">oitava {nota.oitava}</span>}
      </div>
      <div className="afinador-muted flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm tabular-nums">
        <span>Captado: <span>{frequencia === null ? "—" : formatar(frequencia)} Hz</span></span>
        <span>Desvio: <span>{cents === null ? "—" : `${cents > 0 ? "+" : ""}${formatar(cents)}`} cents</span></span>
      </div>
      <svg viewBox="0 0 360 195" className="mx-auto mt-3 w-full max-w-lg overflow-visible" aria-hidden="true">
        <path d="M 40 160 A 140 140 0 0 1 320 160" fill="none" stroke="currentColor" strokeWidth="3" className="afinador-trilho" />
        <path d="M 169 20.5 A 140 140 0 0 1 191 20.5" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="afinador-centro afinador-brilho" />
        {Array.from({ length: 31 }, (_, index) => (index - 15) * 50 / 15).map((valor, index) => {
          const radianos = (-valor * 1.5 * Math.PI) / 180;
          const x = (raio: number) => 180 + Math.sin(radianos) * raio;
          const y = (raio: number) => 160 - Math.cos(radianos) * raio;
          const principal = index % 3 === 0;
          return <g key={index} className={valor === 0 ? "afinador-centro afinador-brilho" : "afinador-marcador afinador-brilho"}>
            <line x1={x(principal ? 120 : 128)} y1={y(principal ? 120 : 128)} x2={x(138)} y2={y(138)} stroke="currentColor" strokeWidth={valor === 0 ? 3 : principal ? 2 : 1} strokeLinecap="round" />
            {principal && Math.round(valor) % 20 === 0 && <text x={x(103)} y={y(103) + 4} textAnchor="middle" fill="currentColor" fontSize="11">{valor > 0 ? `+${Math.round(valor)}` : Math.round(valor)}</text>}
          </g>;
        })}
        <g transform={`rotate(${angulo} 180 160)`} className="afinador-ponteiro afinador-brilho" style={{ opacity: cents === null ? 0.18 : 1 }}>
          <path d="M 180 37 L 177 156 L 183 156 Z" fill="currentColor" />
          <line x1="180" y1="43" x2="180" y2="155" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="180" cy="160" r="9" fill="currentColor" className="afinador-trilho" />
        <circle cx="180" cy="160" r="4" fill="currentColor" className="afinador-ponteiro afinador-brilho" />
        <text x="40" y="186" textAnchor="middle" fill="currentColor" fontSize="10" className="afinador-muted">MAIS ALTO</text>
        <text x="320" y="186" textAnchor="middle" fill="currentColor" fontSize="10" className="afinador-muted">MAIS BAIXO</text>
      </svg>
      <div className="grid grid-cols-3 gap-2 text-center">
        {([['soltar', 'SOLTAR', '←'], ['afinado', 'AFINADO', '●'], ['apertar', 'APERTAR', '→']] as const).map(([id, texto, seta]) => (
          <div key={id} className="afinador-indicador rounded-xl border px-1 py-3" data-ativo={direcao === id} data-tipo={id}>
            <span aria-hidden="true" className="afinador-led mx-auto mb-2 block size-3 rounded-full" />
            <span className="text-xs sm:text-sm">{seta} {texto}</span>
          </div>
        ))}
      </div>
      <p role="status" className="afinador-mensagem mt-4 text-center text-xl">{mensagem}</p>
      <p className="afinador-muted mt-1 min-h-5 text-center text-xs">{cents !== null && Math.abs(cents) > 50 ? "Ponteiro no limite da escala (±50 cents)." : "Centro verde: diferença de até 3 cents."}</p>
      {cents !== null && Math.abs(cents) > 100 && <p className="afinador-aviso mt-3 rounded-lg border p-3 text-center text-sm">Muito distante do alvo. Confira a nota e a oitava antes de apertar ou soltar a corda.</p>}
      <div className="afinador-muted mt-4 flex items-center gap-3 text-xs">
        <span>Sinal</span>
        <div role="meter" aria-label="Nível da entrada de áudio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(nivel * 100)} className="afinador-sinal h-1.5 flex-1 overflow-hidden rounded-full">
          <div className="h-full rounded-full transition-[width]" style={{ width: `${nivel * 100}%` }} />
        </div>
        <span>Áudio local</span>
      </div>
    </div>
  );
}
