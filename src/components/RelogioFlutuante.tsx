import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useJanelaRelogio } from "@/hooks/use-janela-relogio";

const RelogioContext = createContext<(() => void) | null>(null);
export function useAbrirRelogio() {
  const abrir = useContext(RelogioContext);
  if (!abrir) throw new Error("Relógio indisponível fora do aplicativo");
  return abrir;
}

export function RelogioProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <RelogioContext.Provider value={() => setAberto(true)}>
      {children}
      {aberto && <JanelaRelogio fechar={() => setAberto(false)} />}
    </RelogioContext.Provider>
  );
}

const segmentos: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg",
  "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg",
};
const formas: [string, string][] = [
  ["a", "10,4 38,4 43,9 38,14 10,14 5,9"],
  ["b", "40,16 45,11 50,16 50,42 45,47 40,42"],
  ["c", "40,54 45,49 50,54 50,80 45,85 40,80"],
  ["d", "10,82 38,82 43,87 38,92 10,92 5,87"],
  ["e", "0,54 5,49 10,54 10,80 5,85 0,80"],
  ["f", "0,16 5,11 10,16 10,42 5,47 0,42"],
  ["g", "10,43 38,43 43,48 38,53 10,53 5,48"],
];

function Digitos({ texto }: { texto: string }) {
  let x = 0;
  const caracteres = [...texto].map((caractere, indice) => {
    const posicao = x;
    x += caractere === ":" ? 22 : 58;
    return (
      <g key={indice} transform={`translate(${posicao} 0)`}>
        {caractere === ":" ? <><circle cx="7" cy="32" r="4" /><circle cx="7" cy="65" r="4" /></> : formas.map(([nome, pontos]) => (
          <polygon key={nome} points={pontos} opacity={segmentos[caractere]?.includes(nome) ? 1 : 0.065} />
        ))}
      </g>
    );
  });
  return <svg className="relogio-digitos" viewBox={`-4 0 ${x + 2} 96`} role="img" aria-label={texto}>{caracteres}</svg>;
}

function formatar(segundos: number) {
  const total = Math.max(0, segundos);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((n) => String(n).padStart(2, "0")).join(":");
}

type Contagem = { acumulado: number; inicio: number | null; terminou: boolean };
const zerado: Contagem = { acumulado: 0, inicio: null, terminou: false };

function JanelaRelogio({ fechar }: { fechar: () => void }) {
  const { caixa, gestos } = useJanelaRelogio();
  const [agora, setAgora] = useState<number | null>(null);
  const [vista, setVista] = useState<"relogio" | "cronometro">("relogio");
  const [direcao, setDirecao] = useState<"progressivo" | "regressivo">("progressivo");
  const [duracao, setDuracao] = useState<[number, number, number]>([0, 0, 0]);
  const [contagem, setContagem] = useState<Contagem>(zerado);
  const limite = (duracao[0] * 3600 + duracao[1] * 60 + duracao[2]) * 1000;
  const decorrido = contagem.acumulado + (contagem.inicio !== null && agora !== null ? Math.max(0, agora - contagem.inicio) : 0);
  const rodando = contagem.inicio !== null;

  useEffect(() => {
    const atualizar = () => setAgora(Date.now());
    atualizar();
    const intervalo = window.setInterval(atualizar, 100);
    document.addEventListener("visibilitychange", atualizar);
    return () => { window.clearInterval(intervalo); document.removeEventListener("visibilitychange", atualizar); };
  }, []);

  useEffect(() => {
    if (rodando && limite > 0 && decorrido >= limite) {
      setContagem({ acumulado: limite, inicio: null, terminou: true });
    }
  }, [rodando, decorrido, limite]);

  const alternar = () => {
    const instante = Date.now();
    setAgora(instante);
    setContagem((c) => c.inicio === null
      ? { ...c, inicio: instante }
      : { ...c, acumulado: c.acumulado + Math.max(0, instante - c.inicio), inicio: null });
  };
  const segundos = direcao === "regressivo"
    ? Math.ceil(Math.max(0, limite - decorrido) / 1000)
    : Math.floor(Math.min(decorrido, limite || Infinity) / 1000);
  const hora = agora === null ? "00:00:00" : new Date(agora).toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const bloqueado = rodando || decorrido > 0 || contagem.terminou;

  return (
    <div
      {...gestos}
      role="dialog"
      aria-modal="false"
      aria-label="Relógio e cronômetro"
      className="relogio-janela"
      data-terminou={contagem.terminou}
      style={{ left: caixa.x, top: caixa.y, width: caixa.largura, height: caixa.altura }}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <header data-relogio-mover className="relogio-cabecalho">
        <span>⠿ Relógio / Cronômetro</span>
        <button type="button" onClick={fechar} aria-label="Fechar relógio e parar cronômetro" title="Fechar">✕</button>
      </header>
      <div className="relogio-conteudo">
        <div className="relogio-opcoes" role="group" aria-label="Exibição">
          <button type="button" aria-pressed={vista === "relogio"} onClick={() => setVista("relogio")}>Relógio</button>
          <button type="button" aria-pressed={vista === "cronometro"} onClick={() => setVista("cronometro")}>Cronômetro</button>
        </div>
        <div data-relogio-mover className="relogio-visor">
          <Digitos texto={vista === "relogio" ? hora : formatar(segundos)} />
        </div>
        {vista === "relogio" ? <p className="relogio-legenda">Horário do dispositivo · 24 horas</p> : (
          <>
            <label className="relogio-direcao">
              Contagem
              <select value={direcao} disabled={bloqueado} onChange={(e) => setDirecao(e.target.value as typeof direcao)}>
                <option value="progressivo">Progressiva</option>
                <option value="regressivo">Regressiva</option>
              </select>
            </label>
            <fieldset className="relogio-duracao" disabled={bloqueado}>
              <legend>{direcao === "regressivo" ? "Tempo para contagem" : "Meta opcional · 00:00:00 = livre"}</legend>
              {duracao.map((valor, i) => (
                <label key={i}>
                  <input
                    type="number" inputMode="numeric" min={0} max={i === 0 ? 99 : 59} step={1}
                    aria-label={["Horas", "Minutos", "Segundos"][i]} value={valor}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(i === 0 ? 99 : 59, Math.floor(Number(e.target.value) || 0)));
                      setDuracao((atual) => {
                        const nova: [number, number, number] = [...atual];
                        nova[i] = n;
                        return nova;
                      });
                    }}
                  />
                  <span>{["h", "min", "s"][i]}</span>
                </label>
              ))}
            </fieldset>
            <div className="relogio-opcoes">
              <button type="button" onClick={alternar} disabled={contagem.terminou || (direcao === "regressivo" && limite === 0)}>
                {rodando ? "Pausar" : decorrido > 0 ? "Continuar" : "Iniciar"}
              </button>
              <button type="button" onClick={() => setContagem(zerado)} disabled={contagem.terminou}>Zerar</button>
            </div>
          </>
        )}
        <p role="status" className="relogio-legenda">
          {contagem.terminou ? "Tempo encerrado! Feche a janela para parar o aviso." : rodando ? "Cronômetro em andamento" : vista === "cronometro" ? "Defina o tempo e toque em Iniciar" : ""}
        </p>
      </div>
      <footer className="relogio-ajuda">Arraste o topo para mover · canto para ajustar</footer>
      <div data-relogio-tamanho className="relogio-tamanho" title="Arraste para redimensionar" aria-hidden="true">◢</div>
    </div>
  );
}
