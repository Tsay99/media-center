"use client";

import { createContext, ReactNode, useContext, useState } from "react";

type TooltipContextValue = { open: boolean };

const TooltipContext = createContext<TooltipContextValue>({ open: false });

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ open }}>
      <div
        className={`relative inline-flex ${className}`}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
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
  const { open } = useContext(TooltipContext);

  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[260px] -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-xl transition duration-150 ${open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
    >
      {children}
    </div>
  );
}
