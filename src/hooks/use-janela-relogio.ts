import { useEffect, useRef, useState, type PointerEvent } from "react";

type Caixa = { x: number; y: number; largura: number; altura: number };
type Gesto = { id: number; x: number; y: number; caixa: Caixa; redimensionar: boolean };

export function useJanelaRelogio() {
  const [caixa, setCaixa] = useState<Caixa>({ x: 12, y: 100, largura: 340, altura: 180 });
  const atual = useRef(caixa);
  const gesto = useRef<Gesto | null>(null);

  const aplicar = (nova: Caixa) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const largura = Math.max(Math.min(220, vw - 16), Math.min(nova.largura, vw - 16));
    const altura = Math.max(Math.min(120, vh - 16), Math.min(nova.altura, vh - 16));
    const proxima = {
      largura, altura,
      x: Math.max(8, Math.min(nova.x, vw - largura - 8)),
      y: Math.max(8, Math.min(nova.y, vh - altura - 8)),
    };
    atual.current = proxima;
    setCaixa(proxima);
  };

  useEffect(() => {
    aplicar({ ...atual.current, y: window.innerHeight - 200 });
    const ajustar = () => aplicar(atual.current);
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const alvo = e.target as Element;
    if (alvo.closest("button, input, select")) return;
    const redimensionar = !!alvo.closest("[data-relogio-tamanho]");
    if (!redimensionar && !alvo.closest("[data-relogio-mover]")) return;
    e.preventDefault();
    gesto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, caixa: atual.current, redimensionar };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    aplicar(g.redimensionar
      ? { ...g.caixa, largura: g.caixa.largura + dx, altura: g.caixa.altura + dy }
      : { ...g.caixa, x: g.caixa.x + dx, y: g.caixa.y + dy });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (gesto.current?.id !== e.pointerId) return;
    gesto.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return { caixa, gestos: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
