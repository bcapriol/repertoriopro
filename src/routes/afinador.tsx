import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MicIcon, SquareIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { VisorAfinador } from "@/components/VisorAfinador";
import { useAfinador } from "@/hooks/use-afinador";
import { frequenciaDaNota, NOTAS_AFINADOR } from "@/lib/afinador";

export const Route = createFileRoute("/afinador")({
  head: () => ({ meta: [{ title: "Afinador — Repertório Fácil" }] }),
  component: Afinador,
});

const CHAVE = "repertorio-afinador-config-v1";
const campo = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring";

function Afinador() {
  const [referenciaTexto, setReferenciaTexto] = useState("440");
  const [notaAlvo, setNotaAlvo] = useState(11);
  const [oitava, setOitava] = useState(2);
  const [automatico, setAutomatico] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [configPronta, setConfigPronta] = useState(false);
  const audio = useAfinador();
  const valorReferencia = Number(referenciaTexto.replace(",", "."));
  const referencia = referenciaTexto.trim() && Number.isFinite(valorReferencia) && valorReferencia >= 400 && valorReferencia <= 480 ? valorReferencia : null;
  const alvoMidi = (oitava + 1) * 12 + notaAlvo;
  const alvoHz = referencia === null ? null : frequenciaDaNota(alvoMidi, referencia);
  const alvoForaDaFaixa = !automatico && alvoHz !== null && (alvoHz < 25 || alvoHz > 2200);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (salvo && typeof salvo === "object") {
        if (typeof salvo.referencia === "number" && salvo.referencia >= 400 && salvo.referencia <= 480) setReferenciaTexto(String(salvo.referencia));
        if (Number.isInteger(salvo.nota) && salvo.nota >= 0 && salvo.nota <= 11) setNotaAlvo(salvo.nota);
        if (Number.isInteger(salvo.oitava) && salvo.oitava >= 0 && salvo.oitava <= 6) setOitava(salvo.oitava);
        if (typeof salvo.automatico === "boolean") setAutomatico(salvo.automatico);
      }
    } catch { /* Configuração local é opcional. */ }
    setConfigPronta(true);
  }, []);

  useEffect(() => {
    if (!configPronta || referencia === null) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ referencia, nota: notaAlvo, oitava, automatico }));
    } catch { /* O afinador também funciona sem armazenamento. */ }
  }, [configPronta, referencia, notaAlvo, oitava, automatico]);

  return (
    <PageShell title="Afinador" subtitle="Sua nota em destaque. Uma corda de cada vez.">
      <div className="space-y-5">
        <VisorAfinador frequencia={alvoForaDaFaixa ? null : audio.frequencia} referencia={referencia} alvoMidi={alvoMidi} automatico={automatico} ouvindo={audio.estado === "ouvindo"} nivel={audio.nivel} />
        <section aria-label="Captura de áudio" className="space-y-3">
          {audio.estado === "parado" ? (
            <button type="button" onClick={() => void audio.iniciar(entrada)} disabled={referencia === null || alvoForaDaFaixa} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-primary bg-accent px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50">
              <MicIcon className="size-5" aria-hidden="true" /> Iniciar afinador
            </button>
          ) : (
            <button type="button" onClick={audio.parar} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-destructive bg-destructive/10 px-4 py-3 font-bold">
              <SquareIcon className="size-5" aria-hidden="true" /> {audio.estado === "iniciando" ? "Cancelar início" : "Parar afinador"}
            </button>
          )}
          {audio.estado === "iniciando" && <p role="status" className="text-center text-sm text-muted-foreground">Aguardando acesso ao áudio… Permita o microfone quando solicitado.</p>}
          {audio.erro && <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{audio.erro}</p>}
          <label className="block text-sm font-medium" htmlFor="afinador-entrada">Entrada de áudio
            <select id="afinador-entrada" value={entrada} onChange={(e) => setEntrada(e.target.value)} disabled={audio.estado !== "parado"} className={`${campo} disabled:opacity-60`}>
              <option value="">Padrão do aparelho</option>
              {audio.entradas.filter((item) => item.deviceId !== "default" && item.deviceId !== "communications").map((item, index) => <option key={item.deviceId} value={item.deviceId}>{item.label || `Entrada ${index + 1}`}</option>)}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">As entradas disponíveis aparecem após a permissão. Para trocar de entrada, pare o afinador. Cabo requer uma interface de áudio compatível reconhecida pelo aparelho.</p>
        </section>
        <section aria-labelledby="afinador-ajustes" className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 id="afinador-ajustes" className="text-lg font-bold">Afinação</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium" htmlFor="afinador-referencia">Referência de Lá (A4) em Hz
              <input id="afinador-referencia" type="number" inputMode="decimal" min="400" max="480" step="0.1" value={referenciaTexto} onChange={(e) => setReferenciaTexto(e.target.value)} aria-invalid={referencia === null} aria-describedby="afinador-referencia-ajuda" className={campo} />
            </label>
            <label className="block text-sm font-medium" htmlFor="afinador-modo">Modo de afinação
              <select id="afinador-modo" value={automatico ? "automatico" : "alvo"} onChange={(e) => setAutomatico(e.target.value === "automatico")} className={campo}>
                <option value="alvo">Nota alvo — escolher nota e oitava</option>
                <option value="automatico">Cromático — nota mais próxima</option>
              </select>
            </label>
          </div>
          <p id="afinador-referencia-ajuda" className="mt-2 text-xs text-muted-foreground">{referencia === null ? "Informe uma referência entre 400 e 480 Hz." : "440 Hz é a referência do Lá, não a frequência de todas as notas."}</p>
          {!automatico ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium" htmlFor="afinador-nota">Nota desejada
                  <select id="afinador-nota" value={notaAlvo} onChange={(e) => setNotaAlvo(Number(e.target.value))} className={campo}>
                    {NOTAS_AFINADOR.map((nota, index) => <option key={nota.nome} value={index}>{nota.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium" htmlFor="afinador-oitava">Oitava
                  <select id="afinador-oitava" value={oitava} onChange={(e) => setOitava(Number(e.target.value))} className={campo}>
                    {[0, 1, 2, 3, 4, 5, 6].map((valor) => <option key={valor} value={valor}>{valor}{valor === 0 ? " — mais grave" : valor === 6 ? " — mais aguda" : ""}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-4 rounded-lg bg-accent p-3 text-center">
                <p className="text-sm">Alvo: <span className="font-bold">{NOTAS_AFINADOR[notaAlvo].nome}{oitava}{NOTAS_AFINADOR[notaAlvo].alternativa ? ` / ${NOTAS_AFINADOR[notaAlvo].alternativa}${oitava}` : ""}</span></p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{alvoHz === null ? "—" : alvoHz.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Hz</p>
              </div>
              {alvoForaDaFaixa && <p role="alert" className="mt-3 text-sm">Essa nota está fora da faixa de captura (25 a 2.200 Hz). Escolha outra oitava ou use o modo cromático.</p>}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">A oitava define se a nota é grave ou aguda. Exemplos: Si grave do baixo de 5 cordas = B0; corda Si do violão em afinação padrão = B3. Confira o alvo antes de tensionar a corda.</p>
            </>
          ) : <p className="mt-4 rounded-lg bg-accent p-3 text-sm">O alvo acompanha automaticamente a nota mais próxima do som captado. Ideal para afinar várias cordas sem mudar a seleção.</p>}
        </section>
        <details className="rounded-xl border border-border p-4 text-sm">
          <summary className="cursor-pointer font-bold">Como obter uma boa leitura</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Inicie a captura e permita o microfone. Toque uma corda de cada vez e abafe as demais, longe de conversas e caixas de som.</li>
            <li>A nota grande é sempre a nota captada. A# e Bb, por exemplo, são nomes diferentes para a mesma altura.</li>
            <li>Vermelho à direita: apertar. Vermelho à esquerda: soltar. Verde no centro: afinado. Ajuste devagar; não force a corda se a oitava estiver incorreta.</li>
            <li>Sem som estável, o painel aguarda uma nova leitura. Sons muito graves podem precisar de uma interface de áudio para uma captação melhor.</li>
            <li>O áudio é analisado no aparelho, sem gravação, envio ou retorno nos alto-falantes. Ao sair desta tela ou colocar o app em segundo plano, a captura para.</li>
          </ul>
        </details>
      </div>
    </PageShell>
  );
}
