"use client";

import { LayoutGrid, X } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";

export type CircularCommandItem = {
  id: string;
  icon?: ReactNode;
  label: string;
  tooltip?: string;
  shortcut?: string;
  onSelect?: () => void;
};

type Point = { x: number; y: number };
const POSITION_KEY = "content-plan-fact-product-menu-position-v1";

function readPosition(): Point {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const value = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Point | null;
    return value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : { x: 0, y: 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

export function Component({ items }: { items: CircularCommandItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Point>(readPosition);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origin: Point; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const visibleItems = items.slice(0, 16);
  const radius = Math.min(180, Math.max(118, 56 + visibleItems.length * 10));
  const arc = visibleItems.length > 10 ? 220 : 180;

  useEffect(() => { window.localStorage.setItem(POSITION_KEY, JSON.stringify(position)); }, [position]);

  function stopDrag() {
    if (!dragRef.current) return;
    suppressClickRef.current = dragRef.current.moved;
    dragRef.current = null;
    setDragging(false);
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", stopDrag);
  }

  function moveDrag(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    const minX = -window.innerWidth + 76;
    const minY = -window.innerHeight + 76;
    setPosition({ x: Math.min(0, Math.max(minX, drag.origin.x + dx)), y: Math.min(0, Math.max(minY, drag.origin.y + dy)) });
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: position, moved: false };
    setDragging(true);
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", stopDrag, { once: true });
  }

  function toggleMenu() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setOpen((current) => !current);
  }

  return <div className="fixed bottom-5 right-5 z-40 h-14 w-14 print:hidden" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
    <div className={`pointer-events-none absolute inset-0 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!open}>
      {visibleItems.map((item, index) => {
        const angle = visibleItems.length === 1 ? -90 : -180 + (index / Math.max(1, visibleItems.length - 1)) * arc;
        const radians = (angle * Math.PI) / 180;
        const x = Math.cos(radians) * radius;
        const y = Math.sin(radians) * radius;
        return <button key={item.id} type="button" title={item.tooltip ?? item.label} aria-label={item.tooltip ?? item.label} onClick={() => { item.onSelect?.(); setOpen(false); }} className="pointer-events-auto absolute left-1/2 top-1/2 inline-flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 bg-white text-[10px] font-bold text-blue-700 shadow-lg transition hover:scale-110 hover:border-blue-300 hover:bg-blue-50" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}>{item.icon ?? item.label}</button>;
      })}
    </div>
    <button type="button" title={open ? "Закрыть навигацию" : "Навигация по продуктам · перетащить"} aria-label={open ? "Закрыть навигацию" : "Навигация по продуктам · перетащить"} aria-expanded={open} onPointerDown={startDrag} onClick={toggleMenu} className={`inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-600 text-white shadow-xl shadow-blue-600/25 transition hover:bg-blue-700 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}>{open ? <X size={18} /> : <LayoutGrid size={18} />}</button>
  </div>;
}

export default Component;
