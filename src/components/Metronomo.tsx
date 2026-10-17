import { useState } from "react";
import { useMetronomo } from "@/hooks/use-metronomo";
import { useJanelaMetronomo } from "@/hooks/use-janela-metronomo";
import type { Song } from "@/lib/repertorio-store";

export function Metronomo({ musica }: { musica: Song }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        title="Metrônomo"
        aria-label={`Abrir metrônomo · ${musica.titulo}`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 z-[60] flex size-9 min-h-9 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M9 3h6l4 18H5L9 3Z" /><path d="m12 16 5-12M9 17h6M10 6h4" />
        </svg>
      </button>
      {aberto ? <JanelaMetronomo key={`${musica.id}:${musica.bpm}`} musica={musica} fechar={() => setAberto(false)} /> : null}
    </>
  );
}

function JanelaMetronomo({ musica, fechar }: { musica: Song; fechar: () => void }) {
  const inicial = Number.parseFloat(musica.bpm.replace(",", "."));
  const bpmBase = Number.isFinite(inicial) ? Math.round(Math.max(30, Math.min(300, inicial))) : 120;
  const [bpm, setBpm] = useState(bpmBase);
  const [entrada, setEntrada] = useState(String(bpmBase));
  const igualBase = entrada.trim() !== "" && Number(entrada) === bpmBase;
  const { tocando, batida, som, setSom, erro, iniciar, parar } = useMetronomo(bpm);
  const { caixa, girar, gestos } = useJanelaMetronomo();
  const vertical = caixa.altura > caixa.largura;
  const tamanho = Math.max(26, Math.min(76, vertical ? caixa.largura * 0.23 : Math.min(caixa.largura * 0.145, (caixa.altura - 95) * 0.65)));

  const confirmar = () => {
    const n = Number(entrada);
    const valor = Number.isFinite(n) && entrada.trim() ? Math.round(Math.max(30, Math.min(300, n))) : bpm;
    setBpm(valor);
    setEntrada(String(valor));
  };

  return (
    <div
      {...gestos}
      role="dialog"
      aria-label={`Metrônomo · ${musica.titulo}`}
      aria-modal="false"
      data-metronomo
      className="metronomo fixed z-[80] flex flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xl select-none"
      style={{ left: caixa.x, top: caixa.y, width: caixa.largura, height: caixa.altura, touchAction: "none" }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") { e.preventDefault(); fechar(); }
      }}
    >
      <header className="flex min-h-8 shrink-0 cursor-grab items-center gap-1 border-b border-border px-2 active:cursor-grabbing">
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={musica.titulo}>⠿ {musica.titulo}</span>
        <button type="button" className="flex size-8 min-h-8 shrink-0 items-center justify-center rounded hover:bg-muted" onClick={girar} title="Alternar horizontal / vertical" aria-label="Alternar metrônomo horizontal ou vertical">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="8" width="14" height="9" rx="1" /><path d="M4 5a9 9 0 0 1 16 2m0-4v4h-4" /></svg>
        </button>
        <button type="button" className="flex size-8 min-h-8 shrink-0 items-center justify-center rounded hover:bg-muted" onClick={fechar} title="Fechar e parar metrônomo" aria-label="Fechar e parar metrônomo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </header>
      <div className={`flex min-h-0 flex-1 items-center justify-center gap-2 px-2 py-1 ${vertical ? "flex-col" : "flex-row"}`}>
        <label className="flex shrink-0 items-baseline gap-1 text-foreground" style={{ fontSize: Math.max(15, Math.min(28, tamanho * 0.48)), fontWeight: 750 }}>
          <input
            aria-label={`Andamento em BPM${igualBase ? " · padrão da música" : " · alterado para esta execução"}`}
            title={`BPM da base: ${Number.isFinite(inicial) ? bpmBase : "não cadastrado (padrão 120)"}. Toque no número para ajustar sem alterar o cadastro.`}
            data-alterado={!igualBase}
            type="number" inputMode="numeric" min={30} max={300} step={1}
            value={entrada}
            onChange={(e) => {
              setEntrada(e.target.value);
              const n = Number(e.target.value);
              if (n >= 30 && n <= 300) setBpm(Math.round(n));
            }}
            onBlur={confirmar}
            onKeyDown={(e) => { if (e.key === "Enter") { confirmar(); e.currentTarget.blur(); } }}
            className="metronomo-bpm w-[3ch] min-w-0 rounded bg-transparent p-0 text-right outline-none focus:ring-2 focus:ring-ring"
          />
          <span>BPM</span>
        </label>
        <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
          {[0, 1].map((lado) => <span key={lado} className={`metronomo-luz ${tocando && batida === lado ? "metronomo-luz-ativa" : ""}`} style={{ width: tamanho, height: tamanho }} />)}
        </div>
        <button
          type="button"
          className="flex min-h-9 shrink-0 items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          style={{ width: tamanho, height: tamanho }}
          onClick={() => { if (tocando) parar(); else { confirmar(); void iniciar(); } }}
          aria-label={tocando ? "Parar metrônomo" : "Iniciar metrônomo"}
          title={tocando ? "Parar" : "Reproduzir"}
        >
          <svg width="85%" height="85%" viewBox="0 0 50 50" aria-hidden="true">
            {tocando ? <rect className="metronomo-controle" x="5" y="5" width="40" height="40" /> : <path className="metronomo-controle" d="M7 3 46 25 7 47Z" />}
          </svg>
        </button>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-1 px-2 pb-1 text-[10px] text-muted-foreground">
        <span role="status">{tocando ? "Acionado" : "Pausado"}</span>
        <button type="button" className="min-h-7 rounded px-1 text-[11px] hover:bg-muted" aria-pressed={som} onClick={() => setSom((v) => !v)} title="Ativar ou silenciar o clique">Som {som ? "ligado" : "desligado"}</button>
        <span className="w-full text-center text-[9px]">Arraste · pinça para ajustar</span>
      </footer>
      {erro ? <p role="alert" className="px-2 pb-1 text-[10px] text-destructive">{erro}</p> : null}
      <div data-redimensionar title="Arraste para redimensionar" aria-hidden="true" className="absolute right-0 bottom-0 flex size-6 cursor-nwse-resize items-end justify-end pr-1 pb-1 text-muted-foreground">◢</div>
    </div>
  );
}
