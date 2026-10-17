import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Caixa = { x: number; y: number; largura: number; altura: number };
type Ponto = { x: number; y: number };
type Gesto = { caixa: Caixa; pontos: Ponto[]; modo: "mover" | "tamanho" };
const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));

export function useJanelaMetronomo() {
  const [caixa, setCaixa] = useState<Caixa>({ x: 12, y: 100, largura: 340, altura: 200 });
  const atual = useRef(caixa);
  const pontos = useRef(new Map<number, Ponto>());
  const gesto = useRef<Gesto | null>(null);

  const aplicar = (nova: Caixa) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vertical = nova.altura > nova.largura || vw < 296;
    const largura = limitar(nova.largura, Math.min(vertical ? 190 : 280, vw - 16), vw - 16);
    const altura = limitar(nova.altura, Math.min(vertical ? 260 : 170, vh - 16), vh - 16);
    const proxima = { largura, altura, x: limitar(nova.x, 8, vw - largura - 8), y: limitar(nova.y, 8, vh - altura - 8) };
    atual.current = proxima;
    setCaixa(proxima);
  };

  useEffect(() => {
    aplicar({ ...atual.current, y: window.innerHeight - 280 });
    const ajustar = () => aplicar(atual.current);
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  const reiniciar = (modo: Gesto["modo"] = "mover") => {
    gesto.current = { caixa: { ...atual.current }, pontos: [...pontos.current.values()], modo };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const alvo = e.target as HTMLElement;
    if (alvo.closest("button, input") && pontos.current.size === 0) return;
    e.preventDefault();
    pontos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    reiniciar(alvo.closest("[data-redimensionar]") ? "tamanho" : "mover");
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pontos.current.has(e.pointerId) || !gesto.current) return;
    e.preventDefault();
    pontos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const novos = [...pontos.current.values()];
    const { caixa: base, pontos: iniciais, modo } = gesto.current;
    const a = iniciais[0]!;
    const b = novos[0]!;
    if (novos.length >= 2 && iniciais.length >= 2) {
      const c = iniciais[1]!;
      const d = novos[1]!;
      const distancia = Math.max(30, Math.hypot(c.x - a.x, c.y - a.y));
      const escala = Math.hypot(d.x - b.x, d.y - b.y) / distancia;
      const sx = Math.abs(c.x - a.x) > 40 ? Math.abs(d.x - b.x) / Math.abs(c.x - a.x) : escala;
      const sy = Math.abs(c.y - a.y) > 40 ? Math.abs(d.y - b.y) / Math.abs(c.y - a.y) : escala;
      const largura = base.largura * sx;
      const altura = base.altura * sy;
      aplicar({ largura, altura, x: base.x + (b.x + d.x - a.x - c.x) / 2 - (largura - base.largura) / 2, y: base.y + (b.y + d.y - a.y - c.y) / 2 - (altura - base.altura) / 2 });
    } else if (modo === "tamanho") {
      aplicar({ ...base, largura: base.largura + b.x - a.x, altura: base.altura + b.y - a.y });
    } else {
      aplicar({ ...base, x: base.x + b.x - a.x, y: base.y + b.y - a.y });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pontos.current.delete(e.pointerId)) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (pontos.current.size) reiniciar();
    else gesto.current = null;
  };

  const girar = () => aplicar({ ...atual.current, largura: atual.current.altura, altura: atual.current.largura });
  return { caixa, girar, gestos: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
