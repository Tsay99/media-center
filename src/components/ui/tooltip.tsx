"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

type TooltipRect = { top: number; left: number; width: number };
type TooltipContextValue = { open: boolean; triggerRect: TooltipRect | null };

const TooltipContext = createContext<TooltipContextValue>({ open: false, triggerRect: null });

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<TooltipRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateTriggerRect = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setTriggerRect({ top: rect.top, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    updateTriggerRect();
    const handleViewportChange = () => updateTriggerRect();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  return (
    <TooltipContext.Provider value={{ open, triggerRect }}>
      <div
        ref={triggerRef}
        className={`relative inline-flex ${className}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
        onFocus={() => {
          setOpen(true);
          updateTriggerRect();
        }}
        onMouseEnter={() => {
          setOpen(true);
          updateTriggerRect();
        }}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ asChild = false, children }: { asChild?: boolean; children: ReactNode }) {
  return asChild ? <>{children}</> : <button type="button">{children}</button>;
}

export function TooltipContent({ children }: { children: ReactNode }) {
  const { open, triggerRect } = useContext(TooltipContext);
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const maxWidth = Math.max(0, viewportWidth - 16);
  const tooltipWidth = Math.min(260, maxWidth);
  const triggerCenter = triggerRect ? triggerRect.left + triggerRect.width / 2 : tooltipWidth / 2;
  const left = Math.min(Math.max(8, triggerCenter - tooltipWidth / 2), Math.max(8, viewportWidth - tooltipWidth - 8));
  const bottom = triggerRect && typeof window !== "undefined"
    ? Math.max(8, window.innerHeight - triggerRect.top + 8)
    : 8;

  return (
    <div
      role="tooltip"
      style={{ left, bottom, maxWidth }}
      className={`pointer-events-none fixed z-50 w-max rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-xl transition duration-150 ${open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
    >
      {children}
    </div>
  );
}
